package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func peutVoirSujetProjet(c *gin.Context, sujet *models.ForumTopic) bool {
	if sujet.ProjectID == nil {
		return true
	}
	idUtilisateur, ok := c.Get("userID")
	if !ok {
		return false
	}
	if role, ok := c.Get("userRole"); ok && role.(models.UserRole) == models.RoleAdmin {
		return true
	}
	var projet models.Project
	if err := config.DB.First(&projet, *sujet.ProjectID).Error; err == nil && projet.UserID == idUtilisateur.(uint) {
		return true
	}
	var nb int64
	config.DB.Model(&models.ProjectFollower{}).Where("project_id = ? AND user_id = ?", *sujet.ProjectID, idUtilisateur).Count(&nb)
	return nb > 0
}

func ListerSujets(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limite, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	decalage := (page - 1) * limite

	var sujets []models.ForumTopic
	var total int64

	q := config.DB.Model(&models.ForumTopic{})
	if idUtilisateur, ok := c.Get("userID"); ok {
		if role, isRole := c.Get("userRole"); !isRole || role.(models.UserRole) != models.RoleAdmin {
			q = q.Where(
				"project_id IS NULL OR project_id IN (?) OR project_id IN (?)",
				config.DB.Model(&models.ProjectFollower{}).Select("project_id").Where("user_id = ?", idUtilisateur),
				config.DB.Model(&models.Project{}).Select("id").Where("user_id = ?", idUtilisateur),
			)
		}
	} else {
		q = q.Where("project_id IS NULL")
	}

	q.Count(&total)
	q.Preload("Author").
		Order("is_pinned DESC, created_at DESC").
		Offset(decalage).Limit(limite).
		Find(&sujets)

	c.JSON(http.StatusOK, gin.H{"topics": sujets, "total": total, "page": page, "limit": limite})
}

func ObtenirSujet(c *gin.Context) {
	id := c.Param("id")

	var sujet models.ForumTopic
	if err := config.DB.Preload("Author").First(&sujet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}

	if !peutVoirSujetProjet(c, &sujet) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Abonnez-vous au projet pour accéder à cet espace"})
		return
	}

	config.DB.Model(&sujet).UpdateColumn("views", gorm.Expr("views + 1"))

	var reponses []models.ForumPost
	config.DB.Preload("Author").Where("topic_id = ?", id).Order("created_at ASC").Find(&reponses)

	c.JSON(http.StatusOK, gin.H{"topic": sujet, "posts": reponses})
}

func CreerSujet(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")

	var req struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sujet := models.ForumTopic{
		Title:    req.Title,
		Content:  req.Content,
		AuthorID: idUtilisateur.(uint),
	}

	if err := config.DB.Create(&sujet).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création"})
		return
	}

	config.DB.Preload("Author").First(&sujet, sujet.ID)
	c.JSON(http.StatusCreated, sujet)
}

func ModifierSujet(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var sujet models.ForumTopic
	if err := config.DB.First(&sujet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && sujet.AuthorID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var req struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	}
	c.ShouldBindJSON(&req)

	modifications := map[string]interface{}{}
	if req.Title != "" {
		modifications["title"] = req.Title
	}
	if req.Content != "" {
		modifications["content"] = req.Content
	}

	config.DB.Model(&sujet).Updates(modifications)
	config.DB.Preload("Author").First(&sujet, id)
	c.JSON(http.StatusOK, sujet)
}

func SupprimerSujet(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var sujet models.ForumTopic
	if err := config.DB.First(&sujet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && role != models.RoleSalarie && sujet.AuthorID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	config.DB.Where("topic_id = ?", id).Delete(&models.ForumPost{})
	config.DB.Delete(&sujet)
	c.JSON(http.StatusOK, gin.H{"message": "Sujet supprimé"})
}

func EpinglerSujet(c *gin.Context) {
	id := c.Param("id")
	var sujet models.ForumTopic
	if err := config.DB.First(&sujet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}
	config.DB.Model(&sujet).Update("is_pinned", !sujet.IsPinned)
	c.JSON(http.StatusOK, gin.H{"is_pinned": !sujet.IsPinned})
}

func VerrouillerSujet(c *gin.Context) {
	id := c.Param("id")
	var sujet models.ForumTopic
	if err := config.DB.First(&sujet, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}
	config.DB.Model(&sujet).Update("is_locked", !sujet.IsLocked)
	c.JSON(http.StatusOK, gin.H{"is_locked": !sujet.IsLocked})
}

func CreerReponse(c *gin.Context) {
	idSujet := c.Param("id")
	idUtilisateur, _ := c.Get("userID")

	var sujet models.ForumTopic
	if err := config.DB.First(&sujet, idSujet).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}

	if sujet.IsLocked {
		c.JSON(http.StatusForbidden, gin.H{"error": "Ce sujet est verrouillé"})
		return
	}

	if !peutVoirSujetProjet(c, &sujet) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Abonnez-vous au projet pour participer à cet espace"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tid, _ := strconv.ParseUint(idSujet, 10, 64)
	reponse := models.ForumPost{
		TopicID:  uint(tid),
		AuthorID: idUtilisateur.(uint),
		Content:  req.Content,
	}

	if err := config.DB.Create(&reponse).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la réponse"})
		return
	}

	config.DB.Model(&sujet).UpdateColumn("replies_count", sujet.RepliesCount+1)
	config.DB.Preload("Author").First(&reponse, reponse.ID)
	c.JSON(http.StatusCreated, reponse)
}

func SupprimerReponse(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var reponse models.ForumPost
	if err := config.DB.First(&reponse, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Réponse introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && role != models.RoleSalarie && reponse.AuthorID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	config.DB.Delete(&reponse)
	config.DB.Model(&models.ForumTopic{}).Where("id = ?", reponse.TopicID).
		UpdateColumn("replies_count", gorm.Expr("replies_count - 1"))

	c.JSON(http.StatusOK, gin.H{"message": "Réponse supprimée"})
}
