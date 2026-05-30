package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"backend/config"
	"backend/database"
	"backend/middleware"
	"backend/models"
	"backend/services"
	"net/http"
	"strings"
	"time"
)

// generateRoomCode creates a unique 6-character alphanumeric room code.
func generateRoomCode() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Avoid ambiguous chars (I, O, 0, 1)
	for attempts := 0; attempts < 10; attempts++ {
		code := make([]byte, 6)
		for i := range code {
			code[i] = charset[rand.Intn(len(charset))]
		}
		roomCode := string(code)

		// Ensure uniqueness
		var count int64
		database.DB.Model(&models.VibeRoom{}).Where("id = ?", roomCode).Count(&count)
		if count == 0 {
			return roomCode
		}
	}
	// Fallback: use timestamp-based code
	return fmt.Sprintf("R%05d", time.Now().UnixNano()%100000)
}

// HandleRoomCreate creates a new Vibe Room, runs the recommendation pipeline, and stores results.
func HandleRoomCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	r.Body = http.MaxBytesReader(w, r.Body, 1048576)

	userID, ok := r.Context().Value(middleware.UserIDContextKey).(string)
	if !ok || userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var req struct {
		Latitude    float64 `json:"latitude"`
		Longitude   float64 `json:"longitude"`
		Craving     string  `json:"craving"`
		MaxDistance float64 `json:"max_distance"`
		PriceLevels []int   `json:"price_levels"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.Latitude == 0 && req.Longitude == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Coordinates are required"})
		return
	}
	if strings.TrimSpace(req.Craving) == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Craving text is required"})
		return
	}

	lang := parseLanguage(r)
	log.Printf("Creating Vibe Room for user %s with craving: %q [lang: %s]\n", userID, req.Craving, lang)

	// Build taste profile for personalization
	tasteProfile := services.BuildTasteProfile(database.DB, userID)

	// Run the full recommendation pipeline
	results, err := services.RunRecommendationPipeline(ctx, req.Craving, req.Latitude, req.Longitude, tasteProfile, req.MaxDistance, req.PriceLevels, config.AppConfig.PlacesAPIKey, lang)
	if err != nil {
		log.Printf("Room pipeline failed: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate recommendations for room"})
		return
	}

	// Serialize results as JSON for storage
	restaurantsJSON, err := json.Marshal(results)
	if err != nil {
		log.Printf("Failed to marshal room restaurants: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
		return
	}

	// Generate room code and create room
	roomCode := generateRoomCode()
	room := models.VibeRoom{
		ID:             roomCode,
		CreatorID:      userID,
		CravingContext: req.Craving,
		Latitude:       req.Latitude,
		Longitude:      req.Longitude,
		IsActive:       true,
		Restaurants:    string(restaurantsJSON),
		CreatedAt:      time.Now(),
	}

	if err := database.DB.Create(&room).Error; err != nil {
		log.Printf("Failed to create vibe room: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create room"})
		return
	}

	// Add creator as first member
	member := models.RoomMember{
		RoomID: roomCode,
		UserID: userID,
	}
	database.DB.Create(&member)

	log.Printf("Vibe Room %s created by user %s with %d restaurants\n", roomCode, userID, len(results))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"room_id":     roomCode,
		"restaurants": results,
	})
}

// HandleRoomJoin adds a user to an existing Vibe Room and returns the stored restaurant list.
func HandleRoomJoin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1048576)

	userID, ok := r.Context().Value(middleware.UserIDContextKey).(string)
	if !ok || userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var req struct {
		RoomID string `json:"room_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	roomCode := strings.TrimSpace(strings.ToUpper(req.RoomID))
	if roomCode == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "room_id is required"})
		return
	}

	// Find the room
	var room models.VibeRoom
	if err := database.DB.First(&room, "id = ? AND is_active = ?", roomCode, true).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Room not found or no longer active"})
		return
	}

	// Check if user is already a member (prevent duplicates)
	var existingMember models.RoomMember
	if err := database.DB.Where("room_id = ? AND user_id = ?", roomCode, userID).First(&existingMember).Error; err != nil {
		// Not a member yet, add them
		member := models.RoomMember{
			RoomID: roomCode,
			UserID: userID,
		}
		if err := database.DB.Create(&member).Error; err != nil {
			log.Printf("Failed to add member to room %s: %v\n", roomCode, err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to join room"})
			return
		}
	}

	// Deserialize stored restaurants
	var restaurants []models.RecommendationResponse
	if err := json.Unmarshal([]byte(room.Restaurants), &restaurants); err != nil {
		log.Printf("Failed to unmarshal room restaurants: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to load room data"})
		return
	}

	log.Printf("User %s joined Vibe Room %s (%d restaurants)\n", userID, roomCode, len(restaurants))

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"room_id":     roomCode,
		"restaurants": restaurants,
	})
}

// HandleRoomSwipe records a swipe action in a Vibe Room and checks for group match.
func HandleRoomSwipe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1048576)

	userID, ok := r.Context().Value(middleware.UserIDContextKey).(string)
	if !ok || userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var req struct {
		RoomID       string `json:"room_id"`
		RestaurantID string `json:"restaurant_id"`
		Action       string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	roomCode := strings.TrimSpace(strings.ToUpper(req.RoomID))
	action := strings.ToLower(req.Action)
	if roomCode == "" || req.RestaurantID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "room_id and restaurant_id are required"})
		return
	}
	if action != "like" && action != "dislike" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "action must be 'like' or 'dislike'"})
		return
	}

	// Verify room exists
	var room models.VibeRoom
	if err := database.DB.First(&room, "id = ? AND is_active = ?", roomCode, true).Error; err != nil {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Room not found or no longer active"})
		return
	}

	// Record the swipe (upsert: update if already swiped this restaurant)
	var existingSwipe models.RoomSwipe
	if err := database.DB.Where("room_id = ? AND user_id = ? AND restaurant_id = ?", roomCode, userID, req.RestaurantID).First(&existingSwipe).Error; err == nil {
		// Update existing swipe
		existingSwipe.Action = action
		database.DB.Save(&existingSwipe)
	} else {
		// Create new swipe
		swipe := models.RoomSwipe{
			RoomID:       roomCode,
			UserID:       userID,
			RestaurantID: req.RestaurantID,
			Action:       action,
		}
		if err := database.DB.Create(&swipe).Error; err != nil {
			log.Printf("Failed to record room swipe: %v\n", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save swipe"})
			return
		}
	}

	// Match detection: check if ALL members have liked this restaurant
	matchDetected := false
	var matchedRestaurant *models.RecommendationResponse

	if action == "like" {
		// Count total members in the room
		var totalMembers int64
		database.DB.Model(&models.RoomMember{}).Where("room_id = ?", roomCode).Count(&totalMembers)

		// Count how many members liked this specific restaurant
		var likeCount int64
		database.DB.Model(&models.RoomSwipe{}).Where("room_id = ? AND restaurant_id = ? AND action = ?",
			roomCode, req.RestaurantID, "like").Count(&likeCount)

		if totalMembers > 0 && likeCount >= totalMembers {
			matchDetected = true
			log.Printf("🎉 MATCH in room %s! All %d members liked restaurant %s\n",
				roomCode, totalMembers, req.RestaurantID)

			// Find the matched restaurant from stored data
			var restaurants []models.RecommendationResponse
			if err := json.Unmarshal([]byte(room.Restaurants), &restaurants); err == nil {
				for _, rest := range restaurants {
					if rest.ID == req.RestaurantID {
						matchedRestaurant = &rest
						break
					}
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	response := map[string]interface{}{
		"match": matchDetected,
	}
	if matchedRestaurant != nil {
		response["restaurant"] = matchedRestaurant
	}
	json.NewEncoder(w).Encode(response)
}
