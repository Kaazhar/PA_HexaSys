package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func GetConversations(c *gin.Context) {
	userID, _ := c.Get("userID")
	var convs []models.Conversation
	config.DB.Preload("ParticipantOne").Preload("ParticipantTwo").Preload("Listing").
		Where("participant_one_id = ? OR participant_two_id = ?", userID, userID).
		Order("last_message_at DESC").Find(&convs)
	c.JSON(http.StatusOK, convs)
}

func GetOrCreateConversation(c *gin.Context) {
	userID, _ := c.Get("userID")
	var req struct {
		OtherUserID uint  `json:"other_user_id" binding:"required"`
		ListingID   *uint `json:"listing_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.OtherUserID == userID.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vous ne pouvez pas vous envoyer un message"})
		return
	}

	uid := userID.(uint)
	var conv models.Conversation
	query := config.DB.Where(
		"(participant_one_id = ? AND participant_two_id = ?) OR (participant_one_id = ? AND participant_two_id = ?)",
		uid, req.OtherUserID, req.OtherUserID, uid,
	)
	if req.ListingID != nil {
		query = query.Where("listing_id = ?", *req.ListingID)
	}

	if err := query.First(&conv).Error; err != nil {
		conv = models.Conversation{
			ParticipantOneID: uid,
			ParticipantTwoID: req.OtherUserID,
			ListingID:        req.ListingID,
			LastMessageAt:    time.Now(),
		}
		config.DB.Create(&conv)
	}

	config.DB.Preload("ParticipantOne").Preload("ParticipantTwo").Preload("Listing").First(&conv, conv.ID)
	c.JSON(http.StatusOK, conv)
}

func GetMessages(c *gin.Context) {
	userID, _ := c.Get("userID")
	convID, _ := strconv.Atoi(c.Param("id"))

	var conv models.Conversation
	if err := config.DB.First(&conv, convID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation introuvable"})
		return
	}
	uid := userID.(uint)
	if conv.ParticipantOneID != uid && conv.ParticipantTwoID != uid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès refusé"})
		return
	}

	// Mark received messages as read
	config.DB.Model(&models.Message{}).
		Where("conversation_id = ? AND sender_id != ? AND read = false", convID, uid).
		Update("read", true)

	var messages []models.Message
	config.DB.Preload("Sender").Where("conversation_id = ?", convID).
		Order("created_at ASC").Limit(100).Find(&messages)
	c.JSON(http.StatusOK, messages)
}

func SendMessage(c *gin.Context) {
	userID, _ := c.Get("userID")
	convID, _ := strconv.Atoi(c.Param("id"))

	var conv models.Conversation
	if err := config.DB.First(&conv, convID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conversation introuvable"})
		return
	}
	uid := userID.(uint)
	if conv.ParticipantOneID != uid && conv.ParticipantTwoID != uid {
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

	msg := models.Message{
		ConversationID: uint(convID),
		SenderID:       uid,
		Content:        req.Content,
	}
	config.DB.Create(&msg)
	config.DB.Model(&conv).Updates(map[string]interface{}{
		"last_message_at": time.Now(),
		"last_message":    req.Content,
	})

	// Notify the recipient
	recipientID := conv.ParticipantOneID
	if conv.ParticipantOneID == uid {
		recipientID = conv.ParticipantTwoID
	}
	var sender models.User
	config.DB.First(&sender, uid)
	preview := req.Content
	if len(preview) > 50 {
		preview = preview[:50] + "..."
	}
	notif := models.Notification{
		UserID:  recipientID,
		Message: "Nouveau message de " + sender.Firstname + " " + sender.Lastname + " : " + preview,
		Type:    "info",
	}
	config.DB.Create(&notif)

	// Envoi email de notification en arrière-plan
	var recipient models.User
	if err := config.DB.First(&recipient, recipientID).Error; err == nil {
		senderName := sender.Firstname + " " + sender.Lastname
		appURL := config.GetEnv("APP_URL", "https://upcycleconnect.net")
		go config.SendEmail(
			recipient.Email,
			"Nouveau message de "+senderName,
			emailNewMessageTemplate(recipient.Firstname, senderName, preview, appURL),
		)
	}

	config.DB.Preload("Sender").First(&msg, msg.ID)
	c.JSON(http.StatusCreated, msg)
}
