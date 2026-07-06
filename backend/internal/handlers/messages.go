package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func ListerConversations(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var conversations []models.Conversation
	config.DB.Preload("ParticipantOne").Preload("ParticipantTwo").Preload("Listing").
		Where("participant_one_id = ? OR participant_two_id = ?", idUtilisateur, idUtilisateur).
		Order("last_message_at DESC").Find(&conversations)
	c.JSON(http.StatusOK, conversations)
}

func ObtenirOuCreerConversation(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var req struct {
		OtherUserID uint  `json:"other_user_id" binding:"required"`
		ListingID   *uint `json:"listing_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.OtherUserID == idUtilisateur.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vous ne pouvez pas vous envoyer un message"})
		return
	}

	uid := idUtilisateur.(uint)
	var conversation models.Conversation
	q := config.DB.Where(
		"(participant_one_id = ? AND participant_two_id = ?) OR (participant_one_id = ? AND participant_two_id = ?)",
		uid, req.OtherUserID, req.OtherUserID, uid,
	)
	if req.ListingID != nil {
		q = q.Where("listing_id = ?", *req.ListingID)
	}

	if err := q.First(&conversation).Error; err != nil {
		conversation = models.Conversation{
			ParticipantOneID: uid,
			ParticipantTwoID: req.OtherUserID,
			ListingID:        req.ListingID,
			LastMessageAt:    time.Now(),
		}
		config.DB.Create(&conversation)
	}

	config.DB.Preload("ParticipantOne").Preload("ParticipantTwo").Preload("Listing").First(&conversation, conversation.ID)
	c.JSON(http.StatusOK, conversation)
}

func ListerMessages(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	idConversation, _ := strconv.Atoi(c.Param("id"))

	var conversation models.Conversation
	if err := config.DB.First(&conversation, idConversation).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation introuvable"})
		return
	}
	uid := idUtilisateur.(uint)
	if conversation.ParticipantOneID != uid && conversation.ParticipantTwoID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès refusé"})
		return
	}

	config.DB.Model(&models.Message{}).
		Where("conversation_id = ? AND sender_id != ? AND read = false", idConversation, uid).
		Update("read", true)

	var messages []models.Message
	config.DB.Preload("Sender").Where("conversation_id = ?", idConversation).
		Order("created_at ASC").Limit(100).Find(&messages)
	c.JSON(http.StatusOK, messages)
}

func EnvoyerMessage(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	idConversation, _ := strconv.Atoi(c.Param("id"))

	var conversation models.Conversation
	if err := config.DB.First(&conversation, idConversation).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation introuvable"})
		return
	}
	uid := idUtilisateur.(uint)
	if conversation.ParticipantOneID != uid && conversation.ParticipantTwoID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès refusé"})
		return
	}

	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	message := models.Message{
		ConversationID: uint(idConversation),
		SenderID:       uid,
		Content:        req.Content,
	}
	config.DB.Create(&message)
	config.DB.Model(&conversation).Updates(map[string]interface{}{
		"last_message_at": time.Now(),
		"last_message":    req.Content,
	})

	idDestinataire := conversation.ParticipantOneID
	if conversation.ParticipantOneID == uid {
		idDestinataire = conversation.ParticipantTwoID
	}
	var expediteur models.User
	config.DB.First(&expediteur, uid)
	apercu := req.Content
	if len(apercu) > 50 {
		apercu = apercu[:50] + "..."
	}
	config.DB.Create(&models.Notification{
		UserID:  idDestinataire,
		Message: "Nouveau message de " + expediteur.Firstname + " " + expediteur.Lastname + " : " + apercu,
		Type:    "info",
	})

	var destinataire models.User
	if err := config.DB.First(&destinataire, idDestinataire).Error; err == nil {
		nomExpediteur := expediteur.Firstname + " " + expediteur.Lastname
		appURL := config.GetEnv("APP_URL", "https://upcycleconnect.net")
		go config.SendEmail(
			destinataire.Email,
			"Nouveau message de "+nomExpediteur,
			emailNewMessageTemplate(destinataire.Firstname, nomExpediteur, apercu, appURL),
		)
	}

	config.DB.Preload("Sender").First(&message, message.ID)
	c.JSON(http.StatusCreated, message)
}
