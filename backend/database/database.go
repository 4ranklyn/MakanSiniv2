package database

import (
	"log"
	"backend/models"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// DB is the global database instance
var DB *gorm.DB

// InitDB initializes the SQLite database with foreign keys and runs automigrations
func InitDB(dbPath string) (*gorm.DB, error) {
	log.Printf("Connecting to SQLite database at: %s\n", dbPath)
	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath+"?_pragma=foreign_keys(1)"), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	log.Println("Running AutoMigrations...")
	if err = DB.AutoMigrate(
		&models.User{},
		&models.SwipeHistory{},
		&models.VibeRoom{},
		&models.RoomMember{},
		&models.RoomSwipe{},
		&models.CommunityPost{},
		&models.PostComment{},
	); err != nil {
		return nil, err
	}

	log.Println("Database initialization complete.")

	// Create mock user for sign-in bypass
	var mockUser models.User
	if err := DB.First(&mockUser, "id = ?", "mock_user_123").Error; err == gorm.ErrRecordNotFound {
		mockUser = models.User{
			ID:         "mock_user_123",
			Email:      "guest@makansini.com",
			Name:       "Guest",
			PictureURL: "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
			CreatedAt:  time.Now(),
		}
		if err := DB.Create(&mockUser).Error; err != nil {
			log.Printf("Warning: Failed to create mock user: %v\n", err)
		}
	}

	return DB, nil
}
