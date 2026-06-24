package handlers

import (
	"net/http"

	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func GetMyScore(c *gin.Context) {
	userID, _ := c.Get("userID")

	var score models.UpcyclingScore
	if err := config.DB.Where("user_id = ?", userID).First(&score).Error; err != nil {
		score = models.UpcyclingScore{UserID: userID.(uint)}
		config.DB.Create(&score)
	}

	var entries []models.ScoreEntry
	config.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(20).Find(&entries)

	c.JSON(http.StatusOK, gin.H{
		"score":   score,
		"entries": entries,
	})
}

func GetLeaderboard(c *gin.Context) {
	type LeaderEntry struct {
		UserID    uint    `json:"user_id"`
		Firstname string  `json:"firstname"`
		Lastname  string  `json:"lastname"`
		Points    int     `json:"total_points"`
		Level     string  `json:"level"`
		Co2       float64 `json:"co2_saved_kg"`
	}
	var entries []LeaderEntry
	config.DB.Table("upcycling_scores").
		Select("upcycling_scores.user_id, users.firstname, users.lastname, upcycling_scores.total_points, upcycling_scores.level, upcycling_scores.co2_saved_kg").
		Joins("JOIN users ON users.id = upcycling_scores.user_id").
		Where("users.deleted_at IS NULL AND upcycling_scores.total_points > 0").
		Order("upcycling_scores.total_points DESC").
		Limit(10).
		Scan(&entries)
	c.JSON(http.StatusOK, entries)
}

func GetUserScore(c *gin.Context) {
	id := c.Param("id")
	var score models.UpcyclingScore
	if err := config.DB.Where("user_id = ?", id).First(&score).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Score not found"})
		return
	}
	c.JSON(http.StatusOK, score)
}

func GetNotifications(c *gin.Context) {
	userID, _ := c.Get("userID")
	var notifications []models.Notification
	config.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&notifications)
	c.JSON(http.StatusOK, notifications)
}

func MarkNotificationRead(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")

	var notif models.Notification
	if err := config.DB.Where("id = ? AND user_id = ?", id, userID).First(&notif).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	config.DB.Model(&notif).Update("read", true)
	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}
