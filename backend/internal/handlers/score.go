package handlers

import (
	"net/http"

	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"

	"github.com/gin-gonic/gin"
)

func MonScore(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var scoreUpcycling models.UpcyclingScore
	if err := config.DB.Where("user_id = ?", idUtilisateur).First(&scoreUpcycling).Error; err != nil {
		scoreUpcycling = models.UpcyclingScore{UserID: idUtilisateur.(uint)}
		config.DB.Create(&scoreUpcycling)
	}

	var entrees []models.ScoreEntry
	config.DB.Where("user_id = ?", idUtilisateur).Order("created_at DESC").Limit(20).Find(&entrees)

	c.JSON(http.StatusOK, gin.H{
		"score":   scoreUpcycling,
		"entries": entrees,
	})
}

func Classement(c *gin.Context) {
	type EntreeClassement struct {
		UserID    uint    `json:"user_id"`
		Firstname string  `json:"firstname"`
		Lastname  string  `json:"lastname"`
		Points    int     `json:"total_points"`
		Level     string  `json:"level"`
		Co2       float64 `json:"co2_saved_kg"`
	}
	var entrees []EntreeClassement
	config.DB.Table("upcycling_scores").
		Select("upcycling_scores.user_id, users.firstname, users.lastname, upcycling_scores.total_points, upcycling_scores.level, upcycling_scores.co2_saved_kg").
		Joins("JOIN users ON users.id = upcycling_scores.user_id").
		Where("users.deleted_at IS NULL AND upcycling_scores.total_points > 0").
		Order("upcycling_scores.total_points DESC").
		Limit(10).
		Scan(&entrees)
	c.JSON(http.StatusOK, entrees)
}

func MesNotifications(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var notifications []models.Notification
	config.DB.Where("user_id = ?", idUtilisateur).Order("created_at DESC").Limit(50).Find(&notifications)
	c.JSON(http.StatusOK, notifications)
}

func MarquerNotificationLue(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")

	var notif models.Notification
	if err := config.DB.Where("id = ? AND user_id = ?", id, idUtilisateur).First(&notif).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification introuvable"})
		return
	}

	config.DB.Model(&notif).Update("read", true)
	c.JSON(http.StatusOK, gin.H{"message": "Notification marquée comme lue"})
}
