package models

import (
	"time"
)

// User model matches requested users table
type User struct {
	ID         string    `gorm:"primaryKey" json:"id"` // Google UID
	Email      string    `gorm:"uniqueIndex;not null" json:"email"`
	Name       string    `json:"name"`
	PictureURL string    `json:"pictureUrl"`
	CreatedAt  time.Time `json:"createdAt"`
}

// SwipeHistory model matches requested swipe_history table
type SwipeHistory struct {
	ID             uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID         string    `gorm:"not null;index" json:"userId"`
	RestaurantID   string    `gorm:"not null" json:"restaurantId"`
	RestaurantName string    `gorm:"not null" json:"restaurantName"`
	Action         string    `gorm:"not null" json:"action"` // "like" or "dislike"
	Timestamp      time.Time `gorm:"autoCreateTime" json:"timestamp"`
	User           User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

// VibeRoom represents a shared multiplayer room where friends coordinate food choices.
type VibeRoom struct {
	ID             string    `gorm:"primaryKey" json:"id"` // 6-char room code
	CreatorID      string    `gorm:"not null" json:"creatorId"`
	CravingContext string    `gorm:"not null" json:"cravingContext"`
	Latitude       float64   `json:"latitude"`
	Longitude      float64   `json:"longitude"`
	IsActive       bool      `gorm:"default:true" json:"isActive"`
	Restaurants    string    `gorm:"type:text" json:"-"` // JSON-serialized []RecommendationResponse
	CreatedAt      time.Time `json:"createdAt"`
}

// RoomMember tracks users who have joined a vibe room.
type RoomMember struct {
	ID       uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	RoomID   string    `gorm:"not null;index" json:"roomId"`
	UserID   string    `gorm:"not null" json:"userId"`
	JoinedAt time.Time `gorm:"autoCreateTime" json:"joinedAt"`
}

// RoomSwipe tracks swipe actions within a vibe room.
type RoomSwipe struct {
	ID           uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	RoomID       string `gorm:"not null;index" json:"roomId"`
	UserID       string `gorm:"not null" json:"userId"`
	RestaurantID string `gorm:"not null" json:"restaurantId"`
	Action       string `gorm:"not null" json:"action"` // "like" or "dislike"
}

type CommunityPost struct {
	ID             string    `gorm:"primaryKey" json:"id"`
	UserID         string    `gorm:"not null" json:"userId"`
	UserName       string    `gorm:"not null" json:"userName"` // Local handle
	RestaurantID   string    `json:"restaurantId"`
	RestaurantName string    `json:"restaurantName"`
	ReviewText     string    `gorm:"type:text;not null" json:"reviewText"`
	CreatedAt      time.Time `json:"createdAt"`
}

type PostComment struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	PostID      string    `gorm:"not null;index" json:"postId"`
	UserID      string    `gorm:"not null" json:"userId"`
	UserName    string    `gorm:"not null" json:"userName"` // Local handle
	CommentText string    `gorm:"type:text;not null" json:"commentText"`
	CreatedAt   time.Time `json:"createdAt"`
}

// RecommendationRequest is the incoming payload for /api/recommendations.
type RecommendationRequest struct {
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Craving     string  `json:"craving"`
	MaxDistance float64 `json:"max_distance"`
	PriceLevels []int   `json:"price_levels"`
}

// RecommendationResponse is the clean output format for each recommended restaurant.
type RecommendationResponse struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Rating    float64 `json:"rating"`
	Distance  float64 `json:"distance"` // in kilometers
	Address   string  `json:"address"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	MapsURL   string  `json:"mapsUrl"`
	ImageURL  string  `json:"imageUrl"`
}

// PlaceCandidate represents a restaurant candidate after Haversine filtering, before reranking.
type PlaceCandidate struct {
	Item RecommendationResponse
	Dist float64
}

// Google Places API (New) structs
type LatLng struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

type Circle struct {
	Center LatLng  `json:"center"`
	Radius float64 `json:"radius"`
}

type LocationBias struct {
	Circle Circle `json:"circle"`
}

type PlacesSearchRequest struct {
	TextQuery      string       `json:"textQuery"`
	LocationBias   LocationBias `json:"locationBias"`
	MaxResultCount int          `json:"maxResultCount,omitempty"`
	IncludedType   string       `json:"includedType,omitempty"`
	PriceLevels    []string     `json:"priceLevels,omitempty"`
}

type PlacesResponse struct {
	Places []struct {
		ID          string `json:"id"`
		DisplayName struct {
			Text         string `json:"text"`
			LanguageCode string `json:"languageCode"`
		} `json:"displayName"`
		Rating           float64 `json:"rating"`
		FormattedAddress string  `json:"formattedAddress"`
		Location         LatLng  `json:"location"`
		GoogleMapsURI    string  `json:"googleMapsUri"`
		Photos           []struct {
			Name string `json:"name"`
		} `json:"photos"`
	} `json:"places"`
}

// TrendsResponse is the JSON shape returned by the /api/community/trends endpoint.
type TrendsResponse struct {
	Summary string   `json:"summary"`
	Tags    []string `json:"tags"`
}

// RerankResult represents a single item in Gemini's reranking JSON response.
type RerankResult struct {
	ID           string  `json:"id"`
	ContextScore float64 `json:"context_score"`
}
