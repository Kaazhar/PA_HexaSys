package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetListingReviews(c *gin.Context) {
	id := c.Param("id")
	var reviews []models.Review
	config.DB.Preload("Reviewer").Where("listing_id = ?", id).Order("created_at DESC").Find(&reviews)
	c.JSON(http.StatusOK, reviews)
}

func GetUserReviews(c *gin.Context) {
	id := c.Param("id")
	var reviews []models.Review
	config.DB.Preload("Reviewer").Preload("Listing").Where("target_user_id = ?", id).Order("created_at DESC").Find(&reviews)

	var avg float64
	var count int64
	config.DB.Model(&models.Review{}).Where("target_user_id = ?", id).Count(&count)
	if count > 0 {
		config.DB.Model(&models.Review{}).Where("target_user_id = ?", id).
			Select("AVG(rating)").Scan(&avg)
	}

	c.JSON(http.StatusOK, gin.H{
		"reviews": reviews,
		"average": avg,
		"count":   count,
	})
}

func CreateReview(c *gin.Context) {
	listingID, _ := strconv.Atoi(c.Param("id"))
	reviewerID, _ := c.Get("userID")

	var listing models.Listing
	if err := config.DB.First(&listing, listingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}
	if listing.UserID == reviewerID.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vous ne pouvez pas noter votre propre annonce"})
		return
	}

	var existing models.Review
	if err := config.DB.Where("listing_id = ? AND reviewer_id = ?", listingID, reviewerID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Vous avez déjà noté cette annonce"})
		return
	}

	var req struct {
		Rating  int    `json:"rating" binding:"required,min=1,max=5"`
		Comment string `json:"comment"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	review := models.Review{
		ReviewerID:   reviewerID.(uint),
		TargetUserID: listing.UserID,
		ListingID:    uint(listingID),
		Rating:       req.Rating,
		Comment:      req.Comment,
	}
	config.DB.Create(&review)
	config.DB.Preload("Reviewer").First(&review, review.ID)
	c.JSON(http.StatusCreated, review)
}

func DeleteReview(c *gin.Context) {
	id := c.Param("id")
	reviewerID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var review models.Review
	if err := config.DB.First(&review, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Avis introuvable"})
		return
	}
	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && review.ReviewerID != reviewerID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}
	config.DB.Delete(&review)
	c.JSON(http.StatusOK, gin.H{"message": "Avis supprimé"})
}
