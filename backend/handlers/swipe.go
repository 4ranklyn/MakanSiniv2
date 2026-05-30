package handlers

import (
	"encoding/json"
	"log"
	"backend/database"
	"backend/middleware"
	"backend/models"
	"net/http"
	"strings"
)

// HandleSwipeHistory logs a swipe action for the authenticated user.
func HandleSwipeHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		json.NewEncoder(w).Encode(map[string]string{"error": "Method not allowed"})
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1048576) // Limit payload to 1MB

	var req struct {
		RestaurantID   string `json:"restaurant_id"`
		RestaurantName string `json:"restaurant_name"`
		Action         string `json:"action"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	if strings.TrimSpace(req.RestaurantID) == "" || strings.TrimSpace(req.RestaurantName) == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "restaurant_id and restaurant_name are required"})
		return
	}

	action := strings.ToLower(req.Action)
	if action != "like" && action != "dislike" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "action must be 'like' or 'dislike'"})
		return
	}

	// Retrieve user ID from request context
	userID, ok := r.Context().Value(middleware.UserIDContextKey).(string)
	if !ok || userID == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	history := models.SwipeHistory{
		UserID:         userID,
		RestaurantID:   req.RestaurantID,
		RestaurantName: req.RestaurantName,
		Action:         action,
	}

	if err := database.DB.Create(&history).Error; err != nil {
		log.Printf("Failed to record swipe history: %v\n", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save swipe history"})
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"status": "success", "id": history.ID})
}
