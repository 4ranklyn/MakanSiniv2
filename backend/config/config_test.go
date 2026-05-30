package config

import (
	"encoding/json"
	"os"
	"testing"
)

func TestGetProjectIDFromCredentials(t *testing.T) {
	// Create a temp credentials JSON file
	tmpFile, err := os.CreateTemp("", "sa-credentials-*.json")
	if err != nil {
		t.Fatalf("Failed to create temp credentials file: %v", err)
	}
	defer os.Remove(tmpFile.Name())

	saData := ServiceAccount{
		ProjectID: "test-gcp-project-12345",
	}
	jsonData, err := json.Marshal(saData)
	if err != nil {
		t.Fatalf("Failed to marshal ServiceAccount JSON: %v", err)
	}

	if _, err := tmpFile.Write(jsonData); err != nil {
		t.Fatalf("Failed to write to temp credentials file: %v", err)
	}
	tmpFile.Close()

	// Parse and verify
	projectID, err := GetProjectIDFromCredentials(tmpFile.Name())
	if err != nil {
		t.Fatalf("GetProjectIDFromCredentials failed: %v", err)
	}

	if projectID != "test-gcp-project-12345" {
		t.Errorf("Expected projectID %q, got %q", "test-gcp-project-12345", projectID)
	}
}

func TestGetProjectIDFromCredentials_Invalid(t *testing.T) {
	_, err := GetProjectIDFromCredentials("nonexistent_file.json")
	if err == nil {
		t.Error("Expected error when reading nonexistent file, got nil")
	}

	// Create an empty temp file (invalid JSON)
	tmpFile, err := os.CreateTemp("", "invalid-*.json")
	if err != nil {
		t.Fatalf("Failed to create temp file: %v", err)
	}
	defer os.Remove(tmpFile.Name())
	tmpFile.Close()

	_, err = GetProjectIDFromCredentials(tmpFile.Name())
	if err == nil {
		t.Error("Expected error when parsing invalid JSON file, got nil")
	}
}
