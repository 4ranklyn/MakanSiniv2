/**
 * Haversine formula — calculates the great-circle distance
 * between two points on the Earth's surface.
 *
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lng1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lng2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Distance thresholds for each filter level.
 */
export const DISTANCE_THRESHOLDS = {
  WALK: 1.5,   // max 1.5 km
  RIDE: 5,     // max 5 km
  GLOBAL: Infinity,
};

/**
 * Default fallback coordinates — UNS Surakarta campus center.
 */
export const DEFAULT_LOCATION = {
  lat: -7.5589,
  lng: 110.8283,
};
