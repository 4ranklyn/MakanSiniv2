/**
 * API Configuration — Dynamic Base URL for Web & Native (Capacitor) environments.
 *
 * When running inside a Capacitor Android WebView, `localhost` refers to the
 * device itself (which has no server). Android emulators map `10.0.2.2` to the
 * host machine's loopback. For physical USB-tethered devices, replace with
 * your laptop's LAN IP (e.g., 192.168.1.50).
 *
 * Priority:
 *   1. VITE_API_URL env variable (set in .env for dev overrides)
 *   2. Auto-detect Capacitor native → 10.0.2.2
 *   3. Fallback to localhost for standard browser dev
 */

const isNative =
  typeof window !== 'undefined' &&
  (window.Capacitor !== undefined || navigator.userAgent.includes('Android'));

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isNative ? 'http://10.0.2.2:8080' : 'http://localhost:8080');
