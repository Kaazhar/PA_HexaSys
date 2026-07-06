package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func RechercheGlobale(c *gin.Context) {
	q := c.Query("q")
	if len(q) < 2 {
		c.JSON(http.StatusOK, gin.H{"listings": []interface{}{}, "workshops": []interface{}{}})
		return
	}
	motif := "%" + q + "%"

	var annonces []models.Listing
	config.DB.Preload("Category").Where("status = ? AND (title LIKE ? OR description LIKE ?)", "active", motif, motif).
		Order("created_at DESC").Limit(5).Find(&annonces)

	var formations []models.Workshop
	config.DB.Preload("Category").Where("status = ? AND date > ? AND (title LIKE ? OR description LIKE ?)", "active", time.Now(), motif, motif).
		Order("date ASC").Limit(5).Find(&formations)

	c.JSON(http.StatusOK, gin.H{
		"listings":  annonces,
		"workshops": formations,
	})
}
