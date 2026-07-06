package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	stripe "github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/webhook"
	"gorm.io/gorm"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

func cleStripe() string {
	return os.Getenv("STRIPE_SECRET_KEY")
}

func urlFrontend() string {
	if u := os.Getenv("FRONTEND_URL"); u != "" {
		return u
	}
	return "http://localhost:5173"
}

func PaiementFormation(c *gin.Context) {
	stripe.Key = cleStripe()
	idUtilisateur, _ := c.Get("userID")

	var req struct {
		WorkshopID uint `json:"workshop_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var formation models.Workshop
	if err := config.DB.First(&formation, req.WorkshopID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formation introuvable"})
		return
	}

	if formation.Price == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette formation est gratuite"})
		return
	}
	if formation.Enrolled >= formation.MaxSpots {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plus de places disponibles"})
		return
	}

	var existant models.WorkshopBooking
	if config.DB.Where("workshop_id = ? AND user_id = ?", req.WorkshopID, idUtilisateur).First(&existant).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Vous êtes déjà inscrit à cette formation"})
		return
	}

	urlFront := urlFrontend()
	parametres := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(formation.Title),
						Description: stripe.String(fmt.Sprintf("Formation le %s — %s", formation.Date.Format("02/01/2006"), formation.Location)),
					},
					UnitAmount: stripe.Int64(int64(formation.Price * 100)),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(urlFront + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(urlFront + "/payment/cancel"),
		Metadata: map[string]string{
			"type":        "workshop",
			"workshop_id": strconv.Itoa(int(req.WorkshopID)),
			"user_id":     strconv.Itoa(int(idUtilisateur.(uint))),
		},
	}

	sess, err := session.New(parametres)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur Stripe : " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"checkout_url": sess.URL})
}

func PaiementAnnonce(c *gin.Context) {
	stripe.Key = cleStripe()
	idUtilisateur, _ := c.Get("userID")

	var req struct {
		ListingID uint `json:"listing_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var annonce models.Listing
	if err := config.DB.Preload("User").First(&annonce, req.ListingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}

	if annonce.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette annonce n'est plus disponible"})
		return
	}
	if annonce.Type != "vente" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette annonce est un don gratuit"})
		return
	}
	if annonce.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Prix invalide"})
		return
	}
	if annonce.UserID == idUtilisateur.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vous ne pouvez pas acheter votre propre annonce"})
		return
	}

	urlFront := urlFrontend()
	desc := fmt.Sprintf("Annonce de %s %s", annonce.User.Firstname, annonce.User.Lastname)
	parametres := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(annonce.Title),
						Description: stripe.String(desc),
					},
					UnitAmount: stripe.Int64(int64(annonce.Price * 100)),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(urlFront + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(urlFront + "/payment/cancel"),
		Metadata: map[string]string{
			"type":       "listing",
			"listing_id": strconv.Itoa(int(req.ListingID)),
			"user_id":    strconv.Itoa(int(idUtilisateur.(uint))),
		},
	}

	sess, err := session.New(parametres)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur Stripe : " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"checkout_url": sess.URL})
}

func PaiementAbonnement(c *gin.Context) {
	stripe.Key = cleStripe()
	idUtilisateur, _ := c.Get("userID")

	var req struct {
		Slug string `json:"slug" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var forfait models.SubscriptionPlan
	if err := config.DB.Where("slug = ? AND is_active = true", req.Slug).First(&forfait).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plan introuvable"})
		return
	}
	if forfait.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ce plan est gratuit, pas besoin de paiement"})
		return
	}

	urlFront := urlFrontend()
	montant := int64(forfait.Price * 100)
	parametres := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(forfait.Name),
						Description: stripe.String(fmt.Sprintf("Abonnement %d jours — +%d annonces", forfait.DurationDays, forfait.MaxListingsBonus)),
					},
					UnitAmount: stripe.Int64(montant),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(urlFront + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(urlFront + "/payment/cancel"),
		Metadata: map[string]string{
			"type":    "subscription",
			"plan":    forfait.Slug,
			"user_id": strconv.Itoa(int(idUtilisateur.(uint))),
		},
	}

	sess, err := session.New(parametres)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur Stripe : " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"checkout_url": sess.URL})
}

func ConfirmerSession(c *gin.Context) {
	stripe.Key = cleStripe()
	idSession := c.Query("session_id")
	if idSession == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id requis"})
		return
	}

	sess, err := session.Get(idSession, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session introuvable"})
		return
	}

	if sess.PaymentStatus != "paid" && sess.Status != "complete" {
		c.JSON(http.StatusOK, gin.H{"status": "pending"})
		return
	}

	typeEvenement := sess.Metadata["type"]
	idUtilisateurStr := sess.Metadata["user_id"]
	idUtilisateur64, _ := strconv.ParseUint(idUtilisateurStr, 10, 64)
	idUtilisateur := uint(idUtilisateur64)

	switch typeEvenement {
	case "workshop":
		idFormationStr := sess.Metadata["workshop_id"]
		idFormation64, _ := strconv.ParseUint(idFormationStr, 10, 64)
		idFormation := uint(idFormation64)

		var formation models.Workshop
		if err := config.DB.First(&formation, idFormation).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "workshop"})
			return
		}

		numFactureFormation := fmt.Sprintf("INV-WS-%d-%d", idFormation, idUtilisateur)

		var existant models.WorkshopBooking
		if config.DB.Where("workshop_id = ? AND user_id = ?", idFormation, idUtilisateur).First(&existant).Error == nil {
			facture := creerOuObtenirFacture(numFactureFormation, idUtilisateur, "workshop", formation.Title, formation.Price)
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "workshop", "title": formation.Title, "invoice_id": facture.ID})
			return
		}

		reservation := models.WorkshopBooking{
			WorkshopID: idFormation,
			UserID:     idUtilisateur,
			Status:     "confirmed",
			PaymentID:  sess.ID,
		}
		config.DB.Create(&reservation)
		config.DB.Model(&formation).UpdateColumn("enrolled", gorm.Expr("enrolled + 1"))
		facture := creerOuObtenirFacture(numFactureFormation, idUtilisateur, "workshop", formation.Title, formation.Price)
		config.DB.Create(&models.Notification{
			UserID:  idUtilisateur,
			Message: fmt.Sprintf("Paiement confirmé ! Votre inscription à \"%s\" est validée.", formation.Title),
			Type:    "success",
		})
		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "workshop", "title": formation.Title, "invoice_id": facture.ID})

	case "listing":
		idAnnonceStr := sess.Metadata["listing_id"]
		idAnnonce64, _ := strconv.ParseUint(idAnnonceStr, 10, 64)
		idAnnonce := uint(idAnnonce64)

		var annonce models.Listing
		if err := config.DB.First(&annonce, idAnnonce).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "listing"})
			return
		}

		numFactureAnnonce := fmt.Sprintf("INV-LST-%d-%d", idAnnonce, idUtilisateur)

		if annonce.Status == "sold" {
			facture := creerOuObtenirFacture(numFactureAnnonce, idUtilisateur, "listing", annonce.Title, annonce.Price)
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "listing", "title": annonce.Title, "invoice_id": facture.ID})
			return
		}

		commission := annonce.Price * (annonce.CommissionRate / 100)
		config.DB.Model(&annonce).Updates(map[string]interface{}{
			"status":            "sold",
			"commission_amount": commission,
		})

		facture := creerOuObtenirFacture(numFactureAnnonce, idUtilisateur, "listing", annonce.Title, annonce.Price)

		config.DB.Create(&models.Notification{
			UserID:  idUtilisateur,
			Message: fmt.Sprintf("Achat confirmé ! Vous avez acheté \"%s\". Contactez le vendeur pour la remise.", annonce.Title),
			Type:    "success",
		})
		config.DB.Create(&models.Notification{
			UserID:  annonce.UserID,
			Message: fmt.Sprintf("Votre annonce \"%s\" a été vendue !", annonce.Title),
			Type:    "success",
		})

		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "listing", "title": annonce.Title, "invoice_id": facture.ID})

	case "subscription":
		codePlan := sess.Metadata["plan"]
		var forfait models.SubscriptionPlan
		if err := config.DB.Where("slug = ?", codePlan).First(&forfait).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "subscription", "plan": codePlan})
			return
		}

		numFactureAbonnement := fmt.Sprintf("INV-SUB-%d-%s-%s", idUtilisateur, codePlan, time.Now().Format("20060102150405"))
		var factureExistante models.Invoice
		if config.DB.Where("number = ?", numFactureAbonnement).First(&factureExistante).Error != nil {
			dateExpiration := time.Now().AddDate(0, 0, forfait.DurationDays)
			config.DB.Create(&models.Subscription{
				UserID:           idUtilisateur,
				Plan:             codePlan,
				Price:            forfait.Price,
				Status:           "active",
				RenewalDate:      dateExpiration,
				ExpiresAt:        &dateExpiration,
				MaxListingsBonus: forfait.MaxListingsBonus,
			})
		}
		facture := creerOuObtenirFacture(numFactureAbonnement, idUtilisateur, "subscription", "Abonnement "+forfait.Name, forfait.Price)
		config.DB.Create(&models.Notification{
			UserID:  idUtilisateur,
			Message: fmt.Sprintf("Abonnement \"%s\" activé ! +%d annonces disponibles pendant %d jours.", forfait.Name, forfait.MaxListingsBonus, forfait.DurationDays),
			Type:    "success",
		})
		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "subscription", "plan": codePlan, "invoice_id": facture.ID})

	case "boost":
		idAnnonceStr := sess.Metadata["listing_id"]
		idAnnonce64, _ := strconv.ParseUint(idAnnonceStr, 10, 64)
		idAnnonce := uint(idAnnonce64)

		var annonce models.Listing
		if err := config.DB.First(&annonce, idAnnonce).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "boost"})
			return
		}

		if annonce.IsSponsored && annonce.SponsoredUntil != nil && annonce.SponsoredUntil.After(time.Now()) {
			facture := creerOuObtenirFacture(fmt.Sprintf("INV-BOOST-%d-%d", idAnnonce, idUtilisateur), idUtilisateur, "boost", "Boost annonce: "+annonce.Title, 5.0)
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "boost", "title": annonce.Title, "invoice_id": facture.ID})
			return
		}

		jusqua := time.Now().Add(24 * time.Hour)
		config.DB.Model(&annonce).Updates(map[string]interface{}{
			"is_sponsored":    true,
			"sponsored_until": jusqua,
		})
		config.DB.Create(&models.Notification{
			UserID:  idUtilisateur,
			Message: fmt.Sprintf("Votre annonce \"%s\" est maintenant boostée pendant 24h !", annonce.Title),
			Type:    "success",
		})
		facture := creerOuObtenirFacture(fmt.Sprintf("INV-BOOST-%d-%d", idAnnonce, idUtilisateur), idUtilisateur, "boost", "Boost annonce: "+annonce.Title, 5.0)
		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "boost", "title": annonce.Title, "invoice_id": facture.ID})

	default:
		c.JSON(http.StatusOK, gin.H{"status": "confirmed"})
	}
}

func creerSessionBoost(idAnnonce, idUtilisateur uint) (string, error) {
	stripe.Key = cleStripe()
	urlFront := urlFrontend()

	var annonce models.Listing
	if err := config.DB.First(&annonce, idAnnonce).Error; err != nil {
		return "", err
	}

	parametres := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String("Boost d'annonce 24h"),
						Description: stripe.String(fmt.Sprintf("Mise en avant de \"%s\" pendant 24 heures", annonce.Title)),
					},
					UnitAmount: stripe.Int64(500),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(urlFront + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(urlFront + "/payment/cancel"),
		Metadata: map[string]string{
			"type":       "boost",
			"listing_id": strconv.Itoa(int(idAnnonce)),
			"user_id":    strconv.Itoa(int(idUtilisateur)),
		},
	}

	sess, err := session.New(parametres)
	if err != nil {
		return "", err
	}
	return sess.URL, nil
}

func WebhookStripe(c *gin.Context) {
	corps, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot read body"})
		return
	}

	secretWebhook := os.Getenv("STRIPE_WEBHOOK_SECRET")
	signature := c.GetHeader("Stripe-Signature")

	var evenement stripe.Event
	if secretWebhook != "" && signature != "" {
		evenement, err = webhook.ConstructEvent(corps, signature, secretWebhook)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Signature invalide"})
			return
		}
	} else {
		if err := json.Unmarshal(corps, &evenement); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot parse event"})
			return
		}
	}

	if evenement.Type == "checkout.session.completed" {
		var sess stripe.CheckoutSession
		if err := json.Unmarshal(evenement.Data.Raw, &sess); err != nil {
			c.JSON(http.StatusOK, gin.H{"received": true})
			return
		}

		typeEvenement := sess.Metadata["type"]
		idUtilisateurStr := sess.Metadata["user_id"]
		idUtilisateur64, _ := strconv.ParseUint(idUtilisateurStr, 10, 64)
		idUtilisateur := uint(idUtilisateur64)

		switch typeEvenement {
		case "workshop":
			idFormationStr := sess.Metadata["workshop_id"]
			idFormation64, _ := strconv.ParseUint(idFormationStr, 10, 64)
			idFormation := uint(idFormation64)

			var formation models.Workshop
			if err := config.DB.First(&formation, idFormation).Error; err != nil {
				break
			}

			var existant models.WorkshopBooking
			if config.DB.Where("workshop_id = ? AND user_id = ?", idFormation, idUtilisateur).First(&existant).Error == nil {
				break
			}

			reservation := models.WorkshopBooking{
				WorkshopID: idFormation,
				UserID:     idUtilisateur,
				Status:     "confirmed",
				PaymentID:  sess.ID,
			}
			config.DB.Create(&reservation)
			config.DB.Model(&formation).UpdateColumn("enrolled", gorm.Expr("enrolled + 1"))
			creerOuObtenirFacture(fmt.Sprintf("INV-WS-%d-%d", idFormation, idUtilisateur), idUtilisateur, "workshop", formation.Title, formation.Price)

			config.DB.Create(&models.Notification{
				UserID:  idUtilisateur,
				Message: fmt.Sprintf("Paiement confirmé ! Votre inscription à \"%s\" est validée.", formation.Title),
				Type:    "success",
			})

		case "listing":
			idAnnonceStr := sess.Metadata["listing_id"]
			idAnnonce64, _ := strconv.ParseUint(idAnnonceStr, 10, 64)
			idAnnonce := uint(idAnnonce64)

			var annonce models.Listing
			if err := config.DB.First(&annonce, idAnnonce).Error; err != nil {
				break
			}
			if annonce.Status == "sold" {
				break
			}
			commission := annonce.Price * (annonce.CommissionRate / 100)
			config.DB.Model(&annonce).Updates(map[string]interface{}{
				"status":            "sold",
				"commission_amount": commission,
			})
			creerOuObtenirFacture(fmt.Sprintf("INV-LST-%d-%d", idAnnonce, idUtilisateur), idUtilisateur, "listing", annonce.Title, annonce.Price)
			config.DB.Create(&models.Notification{
				UserID:  idUtilisateur,
				Message: fmt.Sprintf("Achat confirmé ! Vous avez acheté \"%s\".", annonce.Title),
				Type:    "success",
			})
			config.DB.Create(&models.Notification{
				UserID:  annonce.UserID,
				Message: fmt.Sprintf("Votre annonce \"%s\" a été vendue !", annonce.Title),
				Type:    "success",
			})

		case "subscription":
			codePlan := sess.Metadata["plan"]
			var forfait models.SubscriptionPlan
			if err := config.DB.Where("slug = ?", codePlan).First(&forfait).Error; err != nil {
				break
			}
			numFacture := fmt.Sprintf("INV-SUB-%d-%s-%s", idUtilisateur, codePlan, time.Now().Format("20060102150405"))
			var factureExistante models.Invoice
			if config.DB.Where("number = ?", numFacture).First(&factureExistante).Error != nil {
				dateExpiration := time.Now().AddDate(0, 0, forfait.DurationDays)
				config.DB.Create(&models.Subscription{
					UserID:           idUtilisateur,
					Plan:             codePlan,
					Price:            forfait.Price,
					Status:           "active",
					RenewalDate:      dateExpiration,
					ExpiresAt:        &dateExpiration,
					MaxListingsBonus: forfait.MaxListingsBonus,
				})
				creerOuObtenirFacture(numFacture, idUtilisateur, "subscription", "Abonnement "+forfait.Name, forfait.Price)
				config.DB.Create(&models.Notification{
					UserID:  idUtilisateur,
					Message: fmt.Sprintf("Abonnement \"%s\" activé ! +%d annonces disponibles.", forfait.Name, forfait.MaxListingsBonus),
					Type:    "success",
				})
			}

		case "boost":
			idAnnonceStr := sess.Metadata["listing_id"]
			idAnnonce64, _ := strconv.ParseUint(idAnnonceStr, 10, 64)
			idAnnonce := uint(idAnnonce64)

			var annonce models.Listing
			if err := config.DB.First(&annonce, idAnnonce).Error; err != nil {
				break
			}
			if annonce.IsSponsored && annonce.SponsoredUntil != nil && annonce.SponsoredUntil.After(time.Now()) {
				break
			}
			jusqua := time.Now().Add(24 * time.Hour)
			config.DB.Model(&annonce).Updates(map[string]interface{}{
				"is_sponsored":    true,
				"sponsored_until": jusqua,
			})
			creerOuObtenirFacture(fmt.Sprintf("INV-BOOST-%d-%d", idAnnonce, idUtilisateur), idUtilisateur, "boost", "Boost annonce: "+annonce.Title, 5.0)
			config.DB.Create(&models.Notification{
				UserID:  idUtilisateur,
				Message: fmt.Sprintf("Votre annonce \"%s\" est maintenant boostée pendant 24h !", annonce.Title),
				Type:    "success",
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}
