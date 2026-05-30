package main

import (
	"context"
	"log"
	"backend/config"
	"backend/database"
	"backend/handlers"
	"backend/middleware"
	"backend/services"
	"net/http"
)

func main() {
	log.Println("Starting MakanSini Backend Server...")

	// 1. Load config
	if err := config.LoadConfig(); err != nil {
		log.Fatalf("Fatal: Failed to load config: %v", err)
	}

	// 2. Initialize Database
	_, err := database.InitDB(config.AppConfig.DBPath)
	if err != nil {
		log.Fatalf("Fatal: Failed to initialize SQLite database: %v", err)
	}

	// 3. Initialize Google GenAI Client
	ctx := context.Background()
	err = services.InitGenAIClient(ctx, config.AppConfig.GeminiAPIKey, config.AppConfig.VertexProject, config.AppConfig.VertexRegion)
	if err != nil {
		log.Fatalf("Fatal: Failed to initialize Google GenAI Client: %v", err)
	}

	// 4. Setup Routes
	http.HandleFunc("/api/recommendations", middleware.EnableCORS(handlers.HandleRecommendations))
	http.HandleFunc("/api/history/swipe", middleware.AuthMiddleware(handlers.HandleSwipeHistory))
	http.HandleFunc("/api/rooms/create", middleware.EnableCORS(middleware.AuthMiddleware(handlers.HandleRoomCreate)))
	http.HandleFunc("/api/rooms/join", middleware.EnableCORS(middleware.AuthMiddleware(handlers.HandleRoomJoin)))
	http.HandleFunc("/api/rooms/swipe", middleware.EnableCORS(middleware.AuthMiddleware(handlers.HandleRoomSwipe)))
	http.HandleFunc("/api/community/posts", middleware.EnableCORS(handlers.HandleCommunityPosts))
	http.HandleFunc("/api/community/posts/{id}/comments", middleware.EnableCORS(handlers.HandleCommunityPostComments))
	http.HandleFunc("/api/community/trends", middleware.EnableCORS(handlers.HandleCommunityTrends))

	// 5. Start Server
	log.Printf("Server listening on port %s...\n", config.AppConfig.Port)
	if err := http.ListenAndServe(":"+config.AppConfig.Port, nil); err != nil {
		log.Fatalf("Fatal: Server failed to start: %v", err)
	}
}
