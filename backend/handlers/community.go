package handlers

import (
	"encoding/json"
	"log"
	"backend/database"
	"backend/models"
	"backend/services"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

// HandleCommunityPosts handles GET and POST requests for /api/community/posts.
func HandleCommunityPosts(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		var posts []models.CommunityPost
		if err := database.DB.Order("created_at DESC").Find(&posts).Error; err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch posts"})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(posts)
		return
	}

	if r.Method == http.MethodPost {
		r.Body = http.MaxBytesReader(w, r.Body, 1048576)
		var req struct {
			UserName       string `json:"user_name"`
			ReviewText     string `json:"review_text"`
			RestaurantID   string `json:"restaurant_id"`
			RestaurantName string `json:"restaurant_name"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
			return
		}
		if strings.TrimSpace(req.UserName) == "" || strings.TrimSpace(req.ReviewText) == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "user_name and review_text are required"})
			return
		}

		post := models.CommunityPost{
			ID:             uuid.NewString(),
			UserID:         "mock_user_123",
			UserName:       req.UserName,
			RestaurantID:   req.RestaurantID,
			RestaurantName: req.RestaurantName,
			ReviewText:     req.ReviewText,
			CreatedAt:      time.Now(),
		}
		if err := database.DB.Create(&post).Error; err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create post"})
			return
		}

		w.WriteHeader(http.StatusCreated)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(post)
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

// HandleCommunityPostComments handles GET and POST requests for /api/community/posts/{id}/comments.
func HandleCommunityPostComments(w http.ResponseWriter, r *http.Request) {
	postID := r.PathValue("id")
	if postID == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Post ID is required"})
		return
	}

	if r.Method == http.MethodGet {
		var comments []models.PostComment
		if err := database.DB.Where("post_id = ?", postID).Order("created_at ASC").Find(&comments).Error; err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch comments"})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(comments)
		return
	}

	if r.Method == http.MethodPost {
		r.Body = http.MaxBytesReader(w, r.Body, 1048576)
		var req struct {
			UserName    string `json:"user_name"`
			CommentText string `json:"comment_text"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
			return
		}
		if strings.TrimSpace(req.UserName) == "" || strings.TrimSpace(req.CommentText) == "" {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "user_name and comment_text are required"})
			return
		}

		// Verify post exists
		var count int64
		database.DB.Model(&models.CommunityPost{}).Where("id = ?", postID).Count(&count)
		if count == 0 {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Post not found"})
			return
		}

		comment := models.PostComment{
			PostID:      postID,
			UserID:      "mock_user_123",
			UserName:    req.UserName,
			CommentText: req.CommentText,
			CreatedAt:   time.Now(),
		}
		if err := database.DB.Create(&comment).Error; err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create comment"})
			return
		}

		w.WriteHeader(http.StatusCreated)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(comment)
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

// HandleCommunityTrends aggregates recent community reviews and asks Gemini
// to produce a short culinary trend summary with 3 trending tags.
func HandleCommunityTrends(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	lang := parseLanguage(r)

	// 1. Fetch the latest 50 community posts
	var posts []models.CommunityPost
	if err := database.DB.Order("created_at DESC").Limit(50).Find(&posts).Error; err != nil {
		log.Printf("Trends: failed to query posts: %v", err)
		w.Header().Set("Content-Type", "application/json")
		summary := "Belum cukup data untuk menganalisis tren kuliner saat ini."
		if lang == "en" {
			summary = "Not enough data to analyze current flavor trends."
		}
		json.NewEncoder(w).Encode(models.TrendsResponse{
			Summary: summary,
			Tags:    []string{},
		})
		return
	}

	// 2. Query Gemini trends helper
	trendsResult, err := services.AnalyzeCommunityTrends(r.Context(), posts, lang)
	if err != nil {
		log.Printf("Trends: Gemini API call failed: %v. Returning fallback.", err)
		w.Header().Set("Content-Type", "application/json")
		summary := "Menghitung tren rasa terbaru... Coba lagi dalam beberapa saat."
		if lang == "en" {
			summary = "Analyzing recent flavor trends... Try again in a few moments."
		}
		json.NewEncoder(w).Encode(models.TrendsResponse{
			Summary: summary,
			Tags:    []string{},
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(trendsResult)
}
