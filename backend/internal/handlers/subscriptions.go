package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

var planPrices = map[string]float64{
	"decouverte": 0,
	"pro":        29,
	"enterprise": 99,
}

func GetMySubscription(c *gin.Context) {
	userID, _ := c.Get("userID")
	var sub models.Subscription
	if err := config.DB.Where("user_id = ?", userID).First(&sub).Error; err != nil {
		c.JSON(http.StatusOK, nil)
		return
	}
	c.JSON(http.StatusOK, sub)
}

func UpgradeSubscription(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		Plan string `json:"plan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	price, ok := planPrices[req.Plan]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plan invalide"})
		return
	}

	var sub models.Subscription
	err := config.DB.Where("user_id = ?", userID).First(&sub).Error
	if err != nil {
		sub = models.Subscription{
			UserID:      userID.(uint),
			Plan:        req.Plan,
			Price:       price,
			Status:      "active",
			RenewalDate: time.Now().AddDate(0, 1, 0),
		}
		config.DB.Create(&sub)
	} else {
		config.DB.Model(&sub).Updates(map[string]interface{}{
			"plan":         req.Plan,
			"price":        price,
			"status":       "active",
			"renewal_date": time.Now().AddDate(0, 1, 0),
		})
	}

	config.DB.Where("user_id = ?", userID).First(&sub)
	c.JSON(http.StatusOK, sub)
}
