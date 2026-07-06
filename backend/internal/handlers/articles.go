package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func parserDateExpiration(s string) (*time.Time, error) {
	if s == "" {
		return nil, nil
	}
	if t, err := time.Parse("2006-01-02T15:04:05Z07:00", s); err == nil {
		return &t, nil
	}
	if t, err := time.Parse("2006-01-02T15:04", s); err == nil {
		return &t, nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func ListerArticles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limit", "12"))
	decalage := (page - 1) * limite
	tag := c.Query("tag")

	var articles []models.Article
	var total int64

	q := config.DB.Model(&models.Article{}).Where("status = ?", "published").
		Where("expires_at IS NULL OR expires_at > ?", time.Now())
	if tag != "" {
		q = q.Where("tags LIKE ?", "%"+tag+"%")
	}
	q.Count(&total)
	q.Preload("Author").Order("created_at DESC").Offset(decalage).Limit(limite).Find(&articles)

	c.JSON(http.StatusOK, gin.H{"articles": articles, "total": total, "page": page, "limit": limite})
}

func ObtenirArticle(c *gin.Context) {
	id := c.Param("id")
	var article models.Article
	if err := config.DB.Preload("Author").Where("status = ?", "published").
		Where("expires_at IS NULL OR expires_at > ?", time.Now()).First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article introuvable"})
		return
	}
	config.DB.Model(&article).UpdateColumn("views", gorm.Expr("views + 1"))
	c.JSON(http.StatusOK, article)
}

func MesArticles(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")
	var articles []models.Article
	q := config.DB.Preload("Author")
	if userRole.(models.UserRole) != models.RoleAdmin {
		q = q.Where("author_id = ?", idUtilisateur)
	}
	q.Order("created_at DESC").Find(&articles)
	c.JSON(http.StatusOK, articles)
}

func MesFormations(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var formations []models.Workshop
	q := config.DB.Preload("Category").Where("instructor_id = ?", idUtilisateur).Order("date ASC")
	if statut := c.Query("status"); statut != "" {
		q = q.Where("status = ?", statut)
	}
	q.Find(&formations)
	c.JSON(http.StatusOK, formations)
}

type RequeteArticle struct {
	Title     string `json:"title" binding:"required"`
	Content   string `json:"content"`
	Tags      string `json:"tags"`
	Status    string `json:"status"`
	ExpiresAt string `json:"expires_at"`
}

func CreerArticle(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var req RequeteArticle
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	statut := req.Status
	if statut == "" {
		statut = "draft"
	}

	dateExpiration, err := parserDateExpiration(req.ExpiresAt)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date de péremption invalide"})
		return
	}

	article := models.Article{
		Title:     req.Title,
		Content:   req.Content,
		Tags:      req.Tags,
		Status:    statut,
		AuthorID:  idUtilisateur.(uint),
		ExpiresAt: dateExpiration,
	}

	if err := config.DB.Create(&article).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de créer l'article"})
		return
	}

	c.JSON(http.StatusCreated, article)
}

func ModifierArticle(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var article models.Article
	if err := config.DB.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && article.AuthorID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var modifications map[string]interface{}
	if err := c.ShouldBindJSON(&modifications); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if raw, ok := modifications["expires_at"]; ok {
		s, _ := raw.(string)
		dateExpiration, err := parserDateExpiration(s)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Date de péremption invalide"})
			return
		}
		modifications["expires_at"] = dateExpiration
	}

	config.DB.Model(&article).Updates(modifications)
	c.JSON(http.StatusOK, article)
}

func SupprimerArticle(c *gin.Context) {
	id, _ := strconv.Atoi(c.Param("id"))
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var article models.Article
	if err := config.DB.First(&article, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Article introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && article.AuthorID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	config.DB.Delete(&article)
	c.JSON(http.StatusOK, gin.H{"message": "Article supprimé"})
}
