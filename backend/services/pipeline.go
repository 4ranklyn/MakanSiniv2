package services

import (
	"context"
	"fmt"
	"log"
	"backend/models"
	"sort"
)

// RunRecommendationPipeline executes the full 5-step recommendation pipeline and returns the top 10 results.
func RunRecommendationPipeline(ctx context.Context, craving string, lat, lng float64, tasteProfile string, maxDistance float64, priceLevels []int, apiKey string, lang string) ([]models.RecommendationResponse, error) {
	// Step A: Sustenance Vector via Gemini
	log.Println("[Pipeline] Step A: Calling Gemini API for keyword extraction...")
	tagsText, err := ExtractTagsWithGemini(ctx, craving, tasteProfile, lang)
	if err != nil {
		log.Printf("[Pipeline] Gemini tag extraction failed: %v. Falling back to raw craving query.", err)
		tagsText = craving
	}
	log.Printf("[Pipeline] Extracted tags: %q\n", tagsText)

	// Step B: Spatial Search via Places API
	log.Println("[Pipeline] Step B: Querying Google Places API (New)...")
	places, err := SearchPlacesNearby(ctx, apiKey, tagsText, lat, lng, MapPriceLevels(priceLevels))
	if err != nil {
		return nil, fmt.Errorf("failed to fetch nearby places: %w", err)
	}
	log.Printf("[Pipeline] Found %d raw places from Google Places API\n", len(places.Places))

	// Step C: Haversine filtering
	log.Println("[Pipeline] Step C: Haversine filtering...")
	var candidates []models.PlaceCandidate
	maxDist := maxDistance
	if maxDist <= 0 {
		maxDist = 10.0
	}
	for _, p := range places.Places {
		dist := Haversine(lat, lng, p.Location.Latitude, p.Location.Longitude)
		if dist > maxDist {
			continue
		}
		var photoURL string
		if len(p.Photos) > 0 && p.Photos[0].Name != "" {
			photoURL = fmt.Sprintf("https://places.googleapis.com/v1/%s/media?maxHeightPx=800&maxWidthPx=800&key=%s", p.Photos[0].Name, apiKey)
		}
		rec := models.RecommendationResponse{
			ID:        p.ID,
			Name:      p.DisplayName.Text,
			Rating:    p.Rating,
			Distance:  dist,
			Address:   p.FormattedAddress,
			Latitude:  p.Location.Latitude,
			Longitude: p.Location.Longitude,
			MapsURL:   p.GoogleMapsURI,
			ImageURL:  photoURL,
		}
		candidates = append(candidates, models.PlaceCandidate{Item: rec, Dist: dist})
	}
	log.Printf("[Pipeline] Candidates after Haversine filter: %d\n", len(candidates))

	// Step D: Semantic Reranking
	log.Println("[Pipeline] Step D: Semantic Reranking via Gemini...")
	contextScores := RerankPlacesWithGemini(ctx, candidates, craving, tasteProfile, lang)

	// Step E: Composite Scoring & Sorting
	type scoredItem struct {
		Item  models.RecommendationResponse
		Score float64
	}
	var scoredItems []scoredItem
	for _, c := range candidates {
		ctxScore := contextScores[c.Item.ID]
		composite := (c.Item.Rating * 1.0) + (ctxScore * 1.5) - (c.Dist * 0.4)
		scoredItems = append(scoredItems, scoredItem{Item: c.Item, Score: composite})
	}
	sort.Slice(scoredItems, func(i, j int) bool {
		return scoredItems[i].Score > scoredItems[j].Score
	})

	limit := 10
	if len(scoredItems) < limit {
		limit = len(scoredItems)
	}
	results := make([]models.RecommendationResponse, limit)
	for i := 0; i < limit; i++ {
		results[i] = scoredItems[i].Item
	}
	log.Printf("[Pipeline] Returning %d results\n", len(results))
	return results, nil
}
