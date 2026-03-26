package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetMyArticles(c *gin.Context) {
	userID, _ := c.Get("userID")
	var articles []models.Article
	config.DB.Where("author_id = ?", userID).Order("created_at DESC").Find(&articles)
	c.JSON(http.StatusOK, articles)
}

func GetMyWorkshops(c *gin.Context) {
	userID, _ := c.Get("userID")
	var workshops []models.Workshop
	query := config.DB.Preload("Category").Where("instructor_id = ?", userID).Order("date ASC")
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	query.Find(&workshops)
	c.JSON(http.StatusOK, workshops)
}

type ArticleRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content"`
	Tags    string `json:"tags"`
	Status  string `json:"status"`
}

func CreateArticle(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req ArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := req.Status
	if status == "" {
		status = "draft"
	}

	article := models.Article{
		Title:    req.Title,
		Content:  req.Content,
		Tags:     req.Tags,
		Status:   status,
		AuthorID: userID.(uint),
	}

	if err := config.DB.Create(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de créer l'article"})
		return
	}

	c.JSON(http.StatusCreated, article)
}

func UpdateArticle(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var article models.Article
	if err := config.DB.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && article.AuthorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&article).Updates(req)
	c.JSON(http.StatusOK, article)
}

func DeleteArticle(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var article models.Article
	if err := config.DB.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && article.AuthorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	config.DB.Delete(&article)
	c.JSON(http.StatusOK, gin.H{"message": "Article supprimé"})
}
