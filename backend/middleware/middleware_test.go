package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestEnableCORS(t *testing.T) {
	dummyHandler := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}

	handler := EnableCORS(http.HandlerFunc(dummyHandler))

	// 1. Test POST request
	req := httptest.NewRequest("POST", "/api/recommendations", nil)
	w := httptest.NewRecorder()
	handler(w, req)

	resp := w.Result()
	if resp.Header.Get("Access-Control-Allow-Origin") != "*" {
		t.Errorf("Expected Access-Control-Allow-Origin to be '*', got %q", resp.Header.Get("Access-Control-Allow-Origin"))
	}
	if resp.Header.Get("Access-Control-Allow-Methods") != "GET, POST, OPTIONS" {
		t.Errorf("Expected Access-Control-Allow-Methods to be 'GET, POST, OPTIONS', got %q", resp.Header.Get("Access-Control-Allow-Methods"))
	}
	if resp.Header.Get("Access-Control-Allow-Headers") != "Content-Type, Authorization" {
		t.Errorf("Expected Access-Control-Allow-Headers to be 'Content-Type, Authorization', got %q", resp.Header.Get("Access-Control-Allow-Headers"))
	}

	// 2. Test OPTIONS request (preflight)
	reqOptions := httptest.NewRequest("OPTIONS", "/api/recommendations", nil)
	wOptions := httptest.NewRecorder()
	handler(wOptions, reqOptions)

	respOptions := wOptions.Result()
	if respOptions.StatusCode != http.StatusNoContent {
		t.Errorf("Expected OPTIONS status to be %d (No Content), got %d", http.StatusNoContent, respOptions.StatusCode)
	}
}
