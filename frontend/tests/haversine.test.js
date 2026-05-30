import { haversineDistance, DISTANCE_THRESHOLDS, DEFAULT_LOCATION } from '../src/utils/haversine.js';

console.log('--- Starting Frontend Haversine Tests ---');

// Test 1: Verify distance between UNS Surakarta campus center and itself is 0
const zeroDist = haversineDistance(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng, DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lng);
console.log(`Test 1 (Self Distance): ${zeroDist === 0 ? 'PASS' : 'FAIL'} (dist = ${zeroDist} km)`);
if (zeroDist !== 0) {
  process.exit(1);
}

// Test 2: Distance between Paris and London
// Paris: (48.8566, 2.3522), London: (51.5074, -0.1278) -> approx 344 km
const parisLonDist = haversineDistance(48.8566, 2.3522, 51.5074, -0.1278);
const withinMargin = Math.abs(parisLonDist - 344) < 2;
console.log(`Test 2 (Paris-London Distance): ${withinMargin ? 'PASS' : 'FAIL'} (dist = ${parisLonDist} km, expected ~344 km)`);
if (!withinMargin) {
  process.exit(1);
}

// Test 3: Check thresholds configurations
const walkOk = DISTANCE_THRESHOLDS.WALK === 1.5;
const rideOk = DISTANCE_THRESHOLDS.RIDE === 5;
const globalOk = DISTANCE_THRESHOLDS.GLOBAL === Infinity;
console.log(`Test 3 (Thresholds Configuration): ${walkOk && rideOk && globalOk ? 'PASS' : 'FAIL'}`);
if (!walkOk || !rideOk || !globalOk) {
  process.exit(1);
}

console.log('--- All Frontend Utility Tests Passed! ---');
