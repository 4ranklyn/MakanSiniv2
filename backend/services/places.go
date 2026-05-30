package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"backend/models"
	"net/http"
	"time"
)

var httpClient = &http.Client{Timeout: 10 * time.Second}

// MapPriceLevels translates integer price levels to Google Places API (New) enum string representations.
func MapPriceLevels(levels []int) []string {
	if len(levels) == 0 {
		return nil
	}
	var mapped []string
	for _, lvl := range levels {
		switch lvl {
		case 1:
			mapped = append(mapped, "PRICE_LEVEL_INEXPENSIVE")
		case 2:
			mapped = append(mapped, "PRICE_LEVEL_MODERATE")
		case 3:
			mapped = append(mapped, "PRICE_LEVEL_EXPENSIVE")
		case 4:
			mapped = append(mapped, "PRICE_LEVEL_VERY_EXPENSIVE")
		}
	}
	return mapped
}

// SearchPlacesNearby queries Google Places API (New) Text Search with coordinates and keyword.
func SearchPlacesNearby(ctx context.Context, apiKey string, query string, lat, lon float64, priceLevels []string) (models.PlacesResponse, error) {
	var result models.PlacesResponse

	reqPayload := models.PlacesSearchRequest{
		TextQuery: query,
		LocationBias: models.LocationBias{
			Circle: models.Circle{
				Center: models.LatLng{
					Latitude:  lat,
					Longitude: lon,
				},
				Radius: 5000.0, // Maximum radius 5000 meters
			},
		},
		MaxResultCount: 20,
		IncludedType:   "restaurant",
		PriceLevels:    priceLevels,
	}

	bodyBytes, err := json.Marshal(reqPayload)
	if err != nil {
		return result, err
	}

	fmt.Println("Payload JSON sent to Google Places API:")
	fmt.Println(string(bodyBytes))

	httpReq, err := http.NewRequestWithContext(ctx, "POST", "https://places.googleapis.com/v1/places:searchText", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return result, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-Goog-Api-Key", apiKey)
	// Field mask is critical for Google Places API (New) and controls pricing tier + returned fields
	httpReq.Header.Set("X-Goog-FieldMask", "places.id,places.displayName,places.rating,places.formattedAddress,places.location,places.googleMapsUri,places.photos")

	resp, err := httpClient.Do(httpReq)
	if err != nil {
		return result, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		fmt.Printf("Google Places API response status code: %d\n", resp.StatusCode)
		fmt.Printf("Google Places API response error body: %s\n", string(respBody))
		return result, fmt.Errorf("google places API returned status %s: %s", resp.Status, string(respBody))
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return result, err
	}

	return result, nil
}
