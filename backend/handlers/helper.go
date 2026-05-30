package handlers

import (
	"net/http"
	"strings"
)

// parseLanguage extracts the preferred language ("en" or "id") from the request.
// It checks the query parameter "lang" first, then falls back to the "Accept-Language" header.
// Default fallback is "id".
func parseLanguage(r *http.Request) string {
	// 1. Check query parameter "lang"
	lang := r.URL.Query().Get("lang")
	if lang != "" {
		lang = strings.ToLower(strings.TrimSpace(lang))
		if lang == "en" || strings.HasPrefix(lang, "en-") {
			return "en"
		}
		if lang == "id" || strings.HasPrefix(lang, "id-") {
			return "id"
		}
	}

	// 2. Check Accept-Language header
	acceptLang := r.Header.Get("Accept-Language")
	if acceptLang != "" {
		// Split by comma
		parts := strings.Split(acceptLang, ",")
		for _, part := range parts {
			part = strings.TrimSpace(strings.ToLower(part))
			// Extract just the locale part (e.g. "en-us;q=0.9" -> "en-us")
			subparts := strings.Split(part, ";")
			locale := subparts[0]
			if locale == "en" || strings.HasPrefix(locale, "en-") {
				return "en"
			}
			if locale == "id" || strings.HasPrefix(locale, "id-") {
				return "id"
			}
		}
	}

	return "id" // Fallback language
}
