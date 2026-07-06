package handlers

import (
	"bytes"
	"fmt"
	"image/png"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/code128"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func ListerConteneurs(c *gin.Context) {
	var conteneurs []models.Container
	config.DB.Order("name ASC").Find(&conteneurs)

	for i := range conteneurs {
		var nbOccupes int64
		config.DB.Model(&models.ContainerSlot{}).
			Where("container_id = ? AND status IN ('reserved','occupied')", conteneurs[i].ID).
			Count(&nbOccupes)
		conteneurs[i].CurrentCount = int(nbOccupes)

		var totalEmplacements int64
		config.DB.Model(&models.ContainerSlot{}).
			Where("container_id = ?", conteneurs[i].ID).
			Count(&totalEmplacements)

		statutCalcule := "operational"
		if totalEmplacements > 0 && nbOccupes >= totalEmplacements {
			statutCalcule = "full"
		}
		if conteneurs[i].Status != statutCalcule {
			config.DB.Model(&conteneurs[i]).Update("status", statutCalcule)
			conteneurs[i].Status = statutCalcule
		}
	}

	c.JSON(http.StatusOK, conteneurs)
}

type RequeteConteneur struct {
	Name      string  `json:"name" binding:"required"`
	Address   string  `json:"address"`
	District  string  `json:"district"`
	Capacity  int     `json:"capacity"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

func CreerConteneur(c *gin.Context) {
	var req RequeteConteneur
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	capacite := req.Capacity
	if capacite == 0 {
		capacite = 25
	}

	conteneur := models.Container{
		Name:      req.Name,
		Address:   req.Address,
		District:  req.District,
		Capacity:  capacite,
		Status:    "operational",
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
	}

	if err := config.DB.Create(&conteneur).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création du conteneur"})
		return
	}

	c.JSON(http.StatusCreated, conteneur)
}

func ModifierConteneur(c *gin.Context) {
	id := c.Param("id")
	var conteneur models.Container
	if err := config.DB.First(&conteneur, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Conteneur introuvable"})
		return
	}

	var modifications map[string]interface{}
	if err := c.ShouldBindJSON(&modifications); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&conteneur).Updates(modifications)
	config.DB.First(&conteneur, id)
	c.JSON(http.StatusOK, conteneur)
}

func ListerEmplacements(c *gin.Context) {
	idConteneur := c.Query("container_id")
	if idConteneur == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "container_id requis"})
		return
	}
	var emplacements []models.ContainerSlot
	config.DB.Where("container_id = ?", idConteneur).Order("size ASC, slot_code ASC").Find(&emplacements)
	c.JSON(http.StatusOK, emplacements)
}

func InitialiserEmplacements(c *gin.Context) {
	id := c.Param("id")
	idConteneur, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identifiant conteneur invalide"})
		return
	}

	var req map[string]int
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, taille := range []string{"S", "M", "L"} {
		nb := req[taille]
		if nb <= 0 {
			continue
		}
		var existants int64
		config.DB.Model(&models.ContainerSlot{}).
			Where("container_id = ? AND size = ?", idConteneur, taille).
			Count(&existants)
		for i := 1; i <= nb; i++ {
			codeEmplacement := fmt.Sprintf("%s-%02d", taille, int(existants)+i)
			config.DB.Create(&models.ContainerSlot{
				ContainerID: uint(idConteneur),
				SlotCode:    codeEmplacement,
				Size:        taille,
				Status:      "free",
			})
		}
	}

	var emplacements []models.ContainerSlot
	config.DB.Where("container_id = ?", idConteneur).Order("size ASC, slot_code ASC").Find(&emplacements)
	c.JSON(http.StatusCreated, emplacements)
}

func ListerDemandesConteneur(c *gin.Context) {
	var demandes []models.ContainerRequest
	q := config.DB.Preload("User").Preload("Container")

	if statut := c.Query("status"); statut != "" {
		q = q.Where("status = ?", statut)
	}

	q.Order("created_at DESC").Find(&demandes)
	c.JSON(http.StatusOK, demandes)
}

type CorpsDemandeConteneur struct {
	ContainerID       uint   `json:"container_id" binding:"required"`
	ObjectTitle       string `json:"object_title" binding:"required"`
	ObjectDescription string `json:"object_description"`
	DesiredDate       string `json:"desired_date" binding:"required"`
	SizeCategory      string `json:"size_category" binding:"required"`
	SlotID            uint   `json:"slot_id"`
}

func CreerDemandeConteneur(c *gin.Context) {
	var req CorpsDemandeConteneur
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	idUtilisateur, _ := c.Get("userID")

	dateDepot, err := time.Parse("2006-01-02", req.DesiredDate)
	if err != nil {
		dateDepot = time.Now().Add(7 * 24 * time.Hour)
	}

	demande := models.ContainerRequest{
		UserID:            idUtilisateur.(uint),
		ContainerID:       req.ContainerID,
		ObjectTitle:       req.ObjectTitle,
		ObjectDescription: req.ObjectDescription,
		DesiredDate:       dateDepot,
		SizeCategory:      req.SizeCategory,
		Status:            "pending",
	}

	if req.SlotID > 0 {
		errTx := config.DB.Transaction(func(tx *gorm.DB) error {
			var emplacement models.ContainerSlot
			if err := tx.Where("id = ? AND container_id = ? AND size = ? AND status = 'free'",
				req.SlotID, req.ContainerID, req.SizeCategory).First(&emplacement).Error; err != nil {
				return fmt.Errorf("emplacement indisponible")
			}
			demande.SlotID = &emplacement.ID
			demande.SlotCode = emplacement.SlotCode
			if err := tx.Create(&demande).Error; err != nil {
				return err
			}
			return tx.Model(&emplacement).Updates(map[string]interface{}{
				"status":     "reserved",
				"request_id": demande.ID,
			}).Error
		})
		if errTx != nil {
			c.JSON(http.StatusConflict, gin.H{"error": errTx.Error()})
			return
		}
	} else {
		if err := config.DB.Create(&demande).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur lors de la création de la demande"})
			return
		}
	}

	config.DB.Preload("User").Preload("Container").First(&demande, demande.ID)
	c.JSON(http.StatusCreated, demande)
}

func ValiderDemandeConteneur(c *gin.Context) {
	id := c.Param("id")
	var demande models.ContainerRequest
	if err := config.DB.Preload("Container").First(&demande, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Demande introuvable"})
		return
	}

	codeAcces := fmt.Sprintf("%06d", rand.Intn(1000000))
	codeBarres := fmt.Sprintf("UC%010d", rand.Intn(10000000000))

	config.DB.Model(&demande).Updates(map[string]interface{}{
		"status":      "approved",
		"access_code": codeAcces,
		"barcode":     codeBarres,
	})

	notif := models.Notification{
		UserID:  demande.UserID,
		Message: fmt.Sprintf("Votre demande de dépôt a été approuvée ! Code d'accès : %s — Case : %s", codeAcces, demande.SlotCode),
		Type:    "success",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Demande approuvée", "access_code": codeAcces, "barcode": codeBarres})
}

func ConfirmerDepot(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")

	var demande models.ContainerRequest
	if err := config.DB.First(&demande, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Demande introuvable"})
		return
	}

	if demande.UserID != idUtilisateur.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès interdit"})
		return
	}

	if demande.Status != "approved" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "La demande doit être approuvée avant de confirmer le dépôt"})
		return
	}

	config.DB.Model(&demande).Update("status", "deposited")

	if demande.SlotID != nil {
		config.DB.Model(&models.ContainerSlot{}).Where("id = ?", *demande.SlotID).
			Update("status", "occupied")
	}

	config.DB.Create(&models.Notification{
		UserID:  demande.UserID,
		Message: fmt.Sprintf("Dépôt confirmé pour \"%s\" — case %s.", demande.ObjectTitle, demande.SlotCode),
		Type:    "success",
	})

	var prosPremium []models.User
	config.DB.Joins("JOIN subscriptions ON subscriptions.user_id = users.id").
		Where("users.role = ? AND subscriptions.status = ?", models.RoleProfessionnel, "active").
		Find(&prosPremium)
	msgPro := fmt.Sprintf("Nouvel objet disponible à récupérer : \"%s\" — conteneur %s", demande.ObjectTitle, demande.SlotCode)
	for _, pro := range prosPremium {
		config.DB.Create(&models.Notification{
			UserID:  pro.ID,
			Message: msgPro,
			Type:    "info",
		})
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dépôt confirmé"})
}

func GenererCodeBarres(c *gin.Context) {
	id := c.Param("id")
	idUtilisateur, _ := c.Get("userID")
	role, _ := c.Get("userRole")

	var demande models.ContainerRequest
	if err := config.DB.First(&demande, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Demande introuvable"})
		return
	}

	if demande.UserID != idUtilisateur.(uint) && role != models.RoleAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Accès interdit"})
		return
	}

	if demande.Barcode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Aucun code-barres : la demande n'est pas encore approuvée"})
		return
	}

	encoded, err := code128.Encode(demande.Barcode)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de générer le code-barres"})
		return
	}

	scaled, err := barcode.Scale(encoded, 600, 150)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de générer le code-barres"})
		return
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, scaled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Impossible de générer le code-barres"})
		return
	}

	c.Data(http.StatusOK, "image/png", buf.Bytes())
}

func MesDemandes(c *gin.Context) {
	idUtilisateur, _ := c.Get("userID")
	var demandes []models.ContainerRequest
	config.DB.Preload("Container").Where("user_id = ?", idUtilisateur).
		Order("created_at DESC").Find(&demandes)
	c.JSON(http.StatusOK, demandes)
}

func ViderEmplacements(c *gin.Context) {
	id := c.Param("id")
	idConteneur, err := strconv.ParseUint(id, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identifiant conteneur invalide"})
		return
	}

	config.DB.Model(&models.ContainerSlot{}).
		Where("container_id = ?", idConteneur).
		Updates(map[string]interface{}{"status": "free", "request_id": nil})

	config.DB.Model(&models.Container{}).Where("id = ?", idConteneur).
		Updates(map[string]interface{}{"current_count": 0, "status": "operational"})

	c.JSON(http.StatusOK, gin.H{"message": "Stock vidé"})
}

func RejeterDemandeConteneur(c *gin.Context) {
	id := c.Param("id")
	var demande models.ContainerRequest
	if err := config.DB.First(&demande, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Demande introuvable"})
		return
	}

	var req RequeteRejet
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&demande).Updates(map[string]interface{}{
		"status":        "rejected",
		"reject_reason": req.Reason,
	})

	if demande.SlotID != nil {
		config.DB.Model(&models.ContainerSlot{}).Where("id = ?", *demande.SlotID).
			Updates(map[string]interface{}{"status": "free", "request_id": nil})
	}

	notif := models.Notification{
		UserID:  demande.UserID,
		Message: "Votre demande de dépôt a été refusée : " + req.Reason,
		Type:    "error",
	}
	config.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Demande rejetée"})
}

func ObjetsDisponibles(c *gin.Context) {
	type ObjetDispo struct {
		SlotID        uint    `json:"slot_id"`
		SlotCode      string  `json:"slot_code"`
		Size          string  `json:"size"`
		ContainerID   uint    `json:"container_id"`
		ContainerName string  `json:"container_name"`
		Address       string  `json:"address"`
		District      string  `json:"district"`
		Latitude      float64 `json:"latitude"`
		Longitude     float64 `json:"longitude"`
		RequestID     uint    `json:"request_id"`
		ObjectTitle   string  `json:"object_title"`
		ObjectDesc    string  `json:"object_description"`
	}

	var emplacements []models.ContainerSlot
	config.DB.Where("status = 'occupied'").Find(&emplacements)

	objets := []ObjetDispo{}
	for _, e := range emplacements {
		if e.RequestID == nil {
			continue
		}
		var demande models.ContainerRequest
		if err := config.DB.Preload("Container").First(&demande, *e.RequestID).Error; err != nil {
			continue
		}
		objets = append(objets, ObjetDispo{
			SlotID:        e.ID,
			SlotCode:      e.SlotCode,
			Size:          e.Size,
			ContainerID:   demande.ContainerID,
			ContainerName: demande.Container.Name,
			Address:       demande.Container.Address,
			District:      demande.Container.District,
			Latitude:      demande.Container.Latitude,
			Longitude:     demande.Container.Longitude,
			RequestID:     demande.ID,
			ObjectTitle:   demande.ObjectTitle,
			ObjectDesc:    demande.ObjectDescription,
		})
	}
	c.JSON(http.StatusOK, objets)
}
