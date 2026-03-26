package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GlobalSearch(c *gin.Context) {
	q := c.Query("q")
	if len(q) < 2 {
		c.JSON(http.StatusOK, gin.H{"listings": []interface{}{}, "workshops": []interface{}{}})
		return
	}
	like := "%" + q + "%"

	var listings []models.Listing
	config.DB.Preload("Category").Where("status = ? AND (title LIKE ? OR description LIKE ?)", "active", like, like).
		Order("created_at DESC").Limit(5).Find(&listings)

	var workshops []models.Workshop
	config.DB.Preload("Category").Where("status = ? AND date > ? AND (title LIKE ? OR description LIKE ?)", "active", time.Now(), like, like).
		Order("date ASC").Limit(5).Find(&workshops)

	c.JSON(http.StatusOK, gin.H{
		"listings":  listings,
		"workshops": workshops,
	})
}
