package services

import (
	"math"
	"testing"
)

func TestHaversine(t *testing.T) {
	// Point 1: UNS Surakarta campus center (-7.5589, 110.8283)
	// Point 2: A point ~1.0 km away (approx: -7.5589, 110.8373)
	lat1, lon1 := -7.5589, 110.8283
	lat2, lon2 := -7.5589, 110.8373

	dist := Haversine(lat1, lon1, lat2, lon2)

	// Approximate distance is ~0.99 km
	expectedMin := 0.95
	expectedMax := 1.05

	if dist < expectedMin || dist > expectedMax {
		t.Errorf("Haversine(%f, %f, %f, %f) = %f; expected distance between %f and %f km",
			lat1, lon1, lat2, lon2, dist, expectedMin, expectedMax)
	}

	// Same point should return 0 distance
	zeroDist := Haversine(lat1, lon1, lat1, lon1)
	if zeroDist != 0.0 {
		t.Errorf("Haversine distance to same point = %f; expected 0.0", zeroDist)
	}
}

func TestHaversineMathAccuracy(t *testing.T) {
	// Distance between Paris (48.8566, 2.3522) and London (51.5074, -0.1278)
	// should be approximately 344 km
	lat1, lon1 := 48.8566, 2.3522
	lat2, lon2 := 51.5074, -0.1278

	dist := Haversine(lat1, lon1, lat2, lon2)
	expectedDist := 344.0
	margin := 2.0 // within 2 km accuracy

	if math.Abs(dist-expectedDist) > margin {
		t.Errorf("Haversine Paris-London = %f km; expected approximately %f km (margin +/- %f km)", dist, expectedDist, margin)
	}
}
