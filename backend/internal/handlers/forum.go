package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

// canSeeProjectTopic indique si l'utilisateur courant peut voir/écrire dans un topic lié à un projet.
// Accès = suiveur du projet, OU créateur du projet, OU admin.
func canSeeProjectTopic(c *gin.Context, topic *models.ForumTopic) bool {
	if topic.ProjectID == nil {
		return true
	}
	userID, ok := c.Get("userID")
	if !ok {
		return false
	}
	if role, ok := c.Get("userRole"); ok && role.(models.UserRole) == models.RoleAdmin {
		return true
	}
	var project models.Project
	if err := config.DB.First(&project, *topic.ProjectID).Error; err == nil && project.UserID == userID.(uint) {
		return true
	}
	var count int64
	config.DB.Model(&models.ProjectFollower{}).Where("project_id = ? AND user_id = ?", *topic.ProjectID, userID).Count(&count)
	return count > 0
}

func GetForumTopics(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var topics []models.ForumTopic
	var total int64

	// Visibilité des topics de projet : seulement ceux suivis par l'utilisateur (+ ses propres projets).
	q := config.DB.Model(&models.ForumTopic{})
	if userID, ok := c.Get("userID"); ok {
		if role, isRole := c.Get("userRole"); !isRole || role.(models.UserRole) != models.RoleAdmin {
			q = q.Where(
				"project_id IS NULL OR project_id IN (?) OR project_id IN (?)",
				config.DB.Model(&models.ProjectFollower{}).Select("project_id").Where("user_id = ?", userID),
				config.DB.Model(&models.Project{}).Select("id").Where("user_id = ?", userID),
			)
		}
	} else {
		q = q.Where("project_id IS NULL")
	}

	q.Count(&total)
	q.Preload("Author").
		Order("is_pinned DESC, created_at DESC").
		Offset(offset).Limit(limit).
		Find(&topics)

	c.JSON(http.StatusOK, gin.H{"topics": topics, "total": total, "page": page, "limit": limit})
}

func GetForumTopic(c *gin.Context) {
	id := c.Param("id")

	var topic models.ForumTopic
	if err := config.DB.Preload("Author").First(&topic, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}

	if !canSeeProjectTopic(c, &topic) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Abonnez-vous au projet pour accéder à cet espace"})
		return
	}

	config.DB.Model(&topic).UpdateColumn("views", gorm.Expr("views + 1"))

	var posts []models.ForumPost
	config.DB.Preload("Author").Where("topic_id = ?", id).Order("created_at ASC").Find(&posts)

	c.JSON(http.StatusOK, gin.H{"topic": topic, "posts": posts})
}

func CreateForumTopic(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req struct {
		Title   string `json:"title" binding:"required"`
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	topic := models.ForumTopic{
		Title:    req.Title,
		Content:  req.Content,
		AuthorID: userID.(uint),
	}

	if err := config.DB.Create(&topic).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création"})
		return
	}

	config.DB.Preload("Author").First(&topic, topic.ID)
	c.JSON(http.StatusCreated, topic)
}

func UpdateForumTopic(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var topic models.ForumTopic
	if err := config.DB.First(&topic, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && topic.AuthorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	var req struct {
		Title   string `json:"title"`
		Content string `json:"content"`
	}
	c.ShouldBindJSON(&req)

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Content != "" {
		updates["content"] = req.Content
	}

	config.DB.Model(&topic).Updates(updates)
	config.DB.Preload("Author").First(&topic, id)
	c.JSON(http.StatusOK, topic)
}

func DeleteForumTopic(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var topic models.ForumTopic
	if err := config.DB.First(&topic, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && role != models.RoleSalarie && topic.AuthorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	config.DB.Where("topic_id = ?", id).Delete(&models.ForumPost{})
	config.DB.Delete(&topic)
	c.JSON(http.StatusOK, gin.H{"message": "Sujet supprimé"})
}

func PinForumTopic(c *gin.Context) {
	id := c.Param("id")
	var topic models.ForumTopic
	if err := config.DB.First(&topic, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}
	config.DB.Model(&topic).Update("is_pinned", !topic.IsPinned)
	c.JSON(http.StatusOK, gin.H{"is_pinned": !topic.IsPinned})
}

func LockForumTopic(c *gin.Context) {
	id := c.Param("id")
	var topic models.ForumTopic
	if err := config.DB.First(&topic, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}
	config.DB.Model(&topic).Update("is_locked", !topic.IsLocked)
	c.JSON(http.StatusOK, gin.H{"is_locked": !topic.IsLocked})
}

func CreateForumPost(c *gin.Context) {
	topicID := c.Param("id")
	userID, _ := c.Get("userID")

	var topic models.ForumTopic
	if err := config.DB.First(&topic, topicID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sujet introuvable"})
		return
	}

	if topic.IsLocked {
		c.JSON(http.StatusForbidden, gin.H{"error": "Ce sujet est verrouillé"})
		return
	}

	if !canSeeProjectTopic(c, &topic) {
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

	tid, _ := strconv.ParseUint(topicID, 10, 64)
	post := models.ForumPost{
		TopicID:  uint(tid),
		AuthorID: userID.(uint),
		Content:  req.Content,
	}

	if err := config.DB.Create(&post).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la réponse"})
		return
	}

	config.DB.Model(&topic).UpdateColumn("replies_count", topic.RepliesCount+1)
	config.DB.Preload("Author").First(&post, post.ID)
	c.JSON(http.StatusCreated, post)
}

func DeleteForumPost(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("userID")
	userRole, _ := c.Get("userRole")

	var post models.ForumPost
	if err := config.DB.First(&post, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Réponse introuvable"})
		return
	}

	role := userRole.(models.UserRole)
	if role != models.RoleAdmin && role != models.RoleSalarie && post.AuthorID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Permission refusée"})
		return
	}

	config.DB.Delete(&post)
	config.DB.Model(&models.ForumTopic{}).Where("id = ?", post.TopicID).
		UpdateColumn("replies_count", gorm.Expr("replies_count - 1"))

	c.JSON(http.StatusOK, gin.H{"message": "Réponse supprimée"})
}
