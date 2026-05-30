package services

import (
	"fmt"
	"log"
	"backend/models"
	"strings"

	"gorm.io/gorm"
)

// BuildTasteProfile queries swipe_history for a given user and returns a formatted
// taste profile string to inject into the Gemini system instruction.
func BuildTasteProfile(db *gorm.DB, userID string) string {
	var likedNames []string
	var dislikedNames []string

	// Query liked restaurants (most recent 30 to keep prompt size reasonable)
	var liked []models.SwipeHistory
	if err := db.Where("user_id = ? AND action = ?", userID, "like").
		Order("timestamp DESC").Limit(30).Find(&liked).Error; err != nil {
		log.Printf("Warning: Failed to query liked history for user %s: %v\n", userID, err)
	} else {
		for _, h := range liked {
			likedNames = append(likedNames, h.RestaurantName)
		}
	}

	// Query disliked restaurants (most recent 30)
	var disliked []models.SwipeHistory
	if err := db.Where("user_id = ? AND action = ?", userID, "dislike").
		Order("timestamp DESC").Limit(30).Find(&disliked).Error; err != nil {
		log.Printf("Warning: Failed to query disliked history for user %s: %v\n", userID, err)
	} else {
		for _, h := range disliked {
			dislikedNames = append(dislikedNames, h.RestaurantName)
		}
	}

	if len(likedNames) == 0 && len(dislikedNames) == 0 {
		return ""
	}

	var sb strings.Builder
	if len(likedNames) > 0 {
		sb.WriteString(fmt.Sprintf("User ini menyukai karakteristik dari tempat-tempat berikut: [%s]", strings.Join(likedNames, ", ")))
	}
	if len(dislikedNames) > 0 {
		if sb.Len() > 0 {
			sb.WriteString(" dan ")
		}
		sb.WriteString(fmt.Sprintf("tidak menyukai tempat-tempat berikut: [%s]", strings.Join(dislikedNames, ", ")))
	}
	sb.WriteString(". Gunakan informasi ini sebagai bobot tambahan untuk memprioritaskan rekomendasi makanan yang sesuai dengan preferensi historis mereka tanpa mengabaikan craving saat ini.")

	log.Printf("Taste profile built: %s\n", sb.String())
	return sb.String()
}
