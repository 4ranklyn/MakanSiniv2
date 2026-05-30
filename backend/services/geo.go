package services

import "math"

// Haversine calculates the great-circle distance between two points in kilometers.
func Haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0 // Earth's radius in kilometers

	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0

	rLat1 := lat1 * math.Pi / 180.0
	rLat2 := lat2 * math.Pi / 180.0

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Sin(dLon/2)*math.Sin(dLon/2)*math.Cos(rLat1)*math.Cos(rLat2)
	c := 2 * math.Asin(math.Sqrt(a))

	return R * c
}
