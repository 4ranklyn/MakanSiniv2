package handlers

import (
	"encoding/json"
	"log"
	"backend/config"
	"backend/database"
	"backend/models"
	"backend/services"
	"net/http"
	"strings"
)

// HandleRecommendations manages the recommendations flow (Triple-Threat Engine).
func HandleRecommendations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()

	// Limit request body to 1MB to prevent Denial of Service (DoS) memory exhaustion attacks.
	r.Body = http.MaxBytesReader(w, r.Body, 1048576)

	// Parse payload
	var req models.RecommendationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid JSON request payload"})
		return
	}

	if req.Latitude == 0 && req.Longitude == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Coordinates (latitude, longitude) are required"})
		return
	}

	if strings.TrimSpace(req.Craving) == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Craving query text is required"})
		return
	}

	lang := parseLanguage(r)
	log.Printf("Received recommendation request for craving: %q at (%f, %f) [lang: %s]\n", req.Craving, req.Latitude, req.Longitude, lang)

	// --- AI Personalization Loop: Build taste profile from swipe history ---
	tasteProfile := services.BuildTasteProfile(database.DB, "mock_user_123")
	if tasteProfile != "" {
		log.Println("AI Personalization active for user mock_user_123")
	}

	results, err := services.RunRecommendationPipeline(ctx, req.Craving, req.Latitude, req.Longitude, tasteProfile, req.MaxDistance, req.PriceLevels, config.AppConfig.PlacesAPIKey, lang)
	if err != nil {
		log.Printf("Pipeline failed: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch recommendations"})
		return
	}

	log.Printf("Returning %d semantically-reranked recommendations to client\n", len(results))

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(results); err != nil {
		log.Printf("Failed to encode response: %v", err)
	}
}
