package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetPublicArticles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	offset := (page - 1) * limit
	tag := c.Query("tag")

	var articles []models.Article
	var total int64

	q := config.DB.Model(&models.Article{}).Where("status = ?", "published")
	if tag != "" {
		q = q.Where("tags LIKE ?", "%"+tag+"%")
	}
	q.Count(&total)
	q.Preload("Author").Order("created_at DESC").Offset(offset).Limit(limit).Find(&articles)

	c.JSON(http.StatusOK, gin.H{"articles": articles, "total": total, "page": page, "limit": limit})
}

func GetPublicArticle(c *gin.Context) {
	id := c.Param("id")
	var article models.Article
	if err := config.DB.Preload("Author").Where("status = ?", "published").First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article introuvable"})
		return
	}
	config.DB.Model(&article).UpdateColumn("views", gorm.Expr("views + 1"))
	c.JSON(http.StatusOK, article)
}

func GetMyArticles(c *gin.Context) {
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")
	var articles []models.Article
	q := config.DB.Preload("Author")
	if userRole.(models.UserRole) != models.RoleAdmin {
		q = q.Where("author_id = ?", userID)
	}
	q.Order("created_at DESC").Find(&articles)
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
