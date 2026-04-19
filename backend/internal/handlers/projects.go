package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetProjects(c *gin.Context) {
	var projects []models.Project
	query := config.DB.Preload("User")
	if search := c.Query("search"); search != "" {
		query = query.Where("title LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	query.Order("created_at DESC").Find(&projects)
	c.JSON(http.StatusOK, projects)
}

func GetMyProjects(c *gin.Context) {
	userID, _ := c.Get("userID")
	var projects []models.Project
	config.DB.Where("user_id = ?", userID).Order("created_at DESC").Find(&projects)
	c.JSON(http.StatusOK, projects)
}

func CreateProject(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req struct {
		Title        string `json:"title" binding:"required"`
		Description  string `json:"description"`
		BeforeImages string `json:"before_images"`
		AfterImages  string `json:"after_images"`
		Tags         string `json:"tags"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project := models.Project{
		Title:        req.Title,
		Description:  req.Description,
		BeforeImages: req.BeforeImages,
		AfterImages:  req.AfterImages,
		Tags:         req.Tags,
		UserID:       userID.(uint),
	}
	if err := config.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur création"})
		return
	}
	c.JSON(http.StatusCreated, project)
}

func UpdateProject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var project models.Project
	if err := config.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && project.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Model(&project).Updates(req)
	c.JSON(http.StatusOK, project)
}

func DeleteProject(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var project models.Project
	if err := config.DB.First(&project, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Projet introuvable"})
		return
	}
	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && project.UserID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}
	config.DB.Delete(&project)
	c.JSON(http.StatusOK, gin.H{"message": "Projet supprimé"})
}
