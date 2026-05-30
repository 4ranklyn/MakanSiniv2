package config

import (
	"encoding/json"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config holds the application configuration.
type Config struct {
	Port          string
	PlacesAPIKey  string
	VertexProject string
	VertexRegion  string
	DBPath        string
	GeminiAPIKey  string
}

// ServiceAccount is used to parse the GCP project_id from the service account credentials file.
type ServiceAccount struct {
	ProjectID string `json:"project_id"`
}

// AppConfig holds the global configuration state.
var AppConfig Config

// LoadConfig loads configuration from environment variables and .env file.
func LoadConfig() error {
	if err := godotenv.Load(); err != nil {
		log.Println("Note: .env file not found, reading from environment variables")
	}

	AppConfig.Port = os.Getenv("PORT")
	if AppConfig.Port == "" {
		AppConfig.Port = "8080"
	}

	AppConfig.PlacesAPIKey = os.Getenv("PLACES_API_KEY")
	if AppConfig.PlacesAPIKey == "" {
		return fmt.Errorf("PLACES_API_KEY environment variable is required")
	}

	AppConfig.DBPath = os.Getenv("DB_PATH")
	if AppConfig.DBPath == "" {
		AppConfig.DBPath = "makansini.db"
	}

	projectID := os.Getenv("VERTEX_PROJECT_ID")
	credsPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS")

	if projectID == "" && credsPath != "" {
		id, err := GetProjectIDFromCredentials(credsPath)
		if err == nil {
			projectID = id
			log.Printf("Successfully auto-detected GCP Project ID from service account JSON: %s\n", projectID)
		} else {
			log.Printf("Warning: Failed to read project_id from service account file: %v. Will rely on ambient ADC project identification.", err)
		}
	}

	AppConfig.VertexProject = projectID
	AppConfig.VertexRegion = os.Getenv("VERTEX_LOCATION")
	if AppConfig.VertexRegion == "" {
		AppConfig.VertexRegion = "us-central1"
	}

	AppConfig.GeminiAPIKey = os.Getenv("GEMINI_API_KEY")
	if AppConfig.GeminiAPIKey == "" {
		AppConfig.GeminiAPIKey = AppConfig.PlacesAPIKey
	}

	return nil
}

// GetProjectIDFromCredentials parses a service account JSON file to extract the project ID.
func GetProjectIDFromCredentials(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	var sa ServiceAccount
	if err := json.Unmarshal(data, &sa); err != nil {
		return "", err
	}
	if sa.ProjectID == "" {
		return "", fmt.Errorf("project_id not found in service account json")
	}
	return sa.ProjectID, nil
}
