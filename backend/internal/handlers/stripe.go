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

func getStripeKey() string {
	return os.Getenv("STRIPE_SECRET_KEY")
}

func getFrontendURL() string {
	if url := os.Getenv("FRONTEND_URL"); url != "" {
		return url
	}
	return "http://localhost:5173"
}

// CreateWorkshopCheckout - POST /api/stripe/workshop-checkout
func CreateWorkshopCheckout(c *gin.Context) {
	stripe.Key = getStripeKey()
	userID, _ := c.Get("userID")

	var req struct {
		WorkshopID uint `json:"workshop_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var workshop models.Workshop
	if err := config.DB.First(&workshop, req.WorkshopID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Formation introuvable"})
		return
	}

	if workshop.Price == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette formation est gratuite"})
		return
	}
	if workshop.Enrolled >= workshop.MaxSpots {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plus de places disponibles"})
		return
	}

	var existing models.WorkshopBooking
	if config.DB.Where("workshop_id = ? AND user_id = ?", req.WorkshopID, userID).First(&existing).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Vous êtes déjà inscrit à cette formation"})
		return
	}

	frontendURL := getFrontendURL()
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(workshop.Title),
						Description: stripe.String(fmt.Sprintf("Formation le %s — %s", workshop.Date.Format("02/01/2006"), workshop.Location)),
					},
					UnitAmount: stripe.Int64(int64(workshop.Price * 100)),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(frontendURL + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(frontendURL + "/payment/cancel"),
		Metadata: map[string]string{
			"type":        "workshop",
			"workshop_id": strconv.Itoa(int(req.WorkshopID)),
			"user_id":     strconv.Itoa(int(userID.(uint))),
		},
	}

	s, err := session.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur Stripe : " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"checkout_url": s.URL})
}

// CreateListingCheckout - POST /api/stripe/listing-checkout
func CreateListingCheckout(c *gin.Context) {
	stripe.Key = getStripeKey()
	userID, _ := c.Get("userID")

	var req struct {
		ListingID uint `json:"listing_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var listing models.Listing
	if err := config.DB.Preload("User").First(&listing, req.ListingID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Annonce introuvable"})
		return
	}

	if listing.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette annonce n'est plus disponible"})
		return
	}
	if listing.Type != "vente" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cette annonce est un don gratuit"})
		return
	}
	if listing.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Prix invalide"})
		return
	}
	if listing.UserID == userID.(uint) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vous ne pouvez pas acheter votre propre annonce"})
		return
	}

	frontendURL := getFrontendURL()
	desc := fmt.Sprintf("Annonce de %s %s", listing.User.Firstname, listing.User.Lastname)
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(listing.Title),
						Description: stripe.String(desc),
					},
					UnitAmount: stripe.Int64(int64(listing.Price * 100)),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(frontendURL + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(frontendURL + "/payment/cancel"),
		Metadata: map[string]string{
			"type":       "listing",
			"listing_id": strconv.Itoa(int(req.ListingID)),
			"user_id":    strconv.Itoa(int(userID.(uint))),
		},
	}

	s, err := session.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur Stripe : " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"checkout_url": s.URL})
}

// CreateSubscriptionCheckout - POST /api/stripe/subscription-checkout
func CreateSubscriptionCheckout(c *gin.Context) {
	stripe.Key = getStripeKey()
	userID, _ := c.Get("userID")

	var req struct {
		Plan string `json:"plan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	stripePrices := map[string]int64{
		"pro":        2900,
		"enterprise": 9900,
	}
	planLabels := map[string]string{
		"pro":        "Abonnement Pro — 29€/mois",
		"enterprise": "Abonnement Entreprise — 99€/mois",
	}

	priceAmount, ok := stripePrices[req.Plan]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plan invalide ou gratuit"})
		return
	}

	frontendURL := getFrontendURL()
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(planLabels[req.Plan]),
					},
					UnitAmount: stripe.Int64(priceAmount),
					Recurring: &stripe.CheckoutSessionLineItemPriceDataRecurringParams{
						Interval: stripe.String("month"),
					},
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		SuccessURL: stripe.String(frontendURL + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(frontendURL + "/payment/cancel"),
		Metadata: map[string]string{
			"type":    "subscription",
			"plan":    req.Plan,
			"user_id": strconv.Itoa(int(userID.(uint))),
		},
	}

	s, err := session.New(params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erreur Stripe : " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"checkout_url": s.URL})
}

// ConfirmSession - GET /api/stripe/confirm?session_id=xxx
// Appelé par la page /payment/success pour confirmer sans webhook
func ConfirmSession(c *gin.Context) {
	stripe.Key = getStripeKey()
	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "session_id requis"})
		return
	}

	s, err := session.Get(sessionID, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session introuvable"})
		return
	}

	if s.PaymentStatus != "paid" && s.Status != "complete" {
		c.JSON(http.StatusOK, gin.H{"status": "pending"})
		return
	}

	eventType := s.Metadata["type"]
	userIDStr := s.Metadata["user_id"]
	userID64, _ := strconv.ParseUint(userIDStr, 10, 64)
	userID := uint(userID64)

	switch eventType {
	case "workshop":
		workshopIDStr := s.Metadata["workshop_id"]
		workshopID64, _ := strconv.ParseUint(workshopIDStr, 10, 64)
		workshopID := uint(workshopID64)

		var workshop models.Workshop
		if err := config.DB.First(&workshop, workshopID).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "workshop"})
			return
		}

		var existing models.WorkshopBooking
		if config.DB.Where("workshop_id = ? AND user_id = ?", workshopID, userID).First(&existing).Error == nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "workshop", "title": workshop.Title})
			return
		}

		booking := models.WorkshopBooking{
			WorkshopID: workshopID,
			UserID:     userID,
			Status:     "confirmed",
			PaymentID:  s.ID,
		}
		config.DB.Create(&booking)
		config.DB.Model(&workshop).UpdateColumn("enrolled", gorm.Expr("enrolled + 1"))
		config.DB.Create(&models.Notification{
			UserID:  userID,
			Message: fmt.Sprintf("✅ Paiement confirmé ! Votre inscription à \"%s\" est validée.", workshop.Title),
			Type:    "success",
		})
		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "workshop", "title": workshop.Title})

	case "listing":
		listingIDStr := s.Metadata["listing_id"]
		listingID64, _ := strconv.ParseUint(listingIDStr, 10, 64)
		listingID := uint(listingID64)

		var listing models.Listing
		if err := config.DB.First(&listing, listingID).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "listing"})
			return
		}

		// Idempotence : si déjà vendu, retourner OK
		if listing.Status == "sold" {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "listing", "title": listing.Title})
			return
		}

		commission := listing.Price * (listing.CommissionRate / 100)
		config.DB.Model(&listing).Updates(map[string]interface{}{
			"status":            "sold",
			"commission_amount": commission,
		})

		// Facture pour l'acheteur
		tax := listing.Price * 0.20
		invoiceNumber := fmt.Sprintf("INV-LST-%d-%d", listingID, userID)
		config.DB.Create(&models.Invoice{
			Number: invoiceNumber,
			UserID: userID,
			Type:   "listing",
			Amount: listing.Price,
			Tax:    tax,
			Total:  listing.Price + tax,
			Status: "paid",
		})

		// Notification acheteur
		config.DB.Create(&models.Notification{
			UserID:  userID,
			Message: fmt.Sprintf("✅ Achat confirmé ! Vous avez acheté \"%s\". Contactez le vendeur pour la remise.", listing.Title),
			Type:    "success",
		})
		// Notification vendeur
		config.DB.Create(&models.Notification{
			UserID:  listing.UserID,
			Message: fmt.Sprintf("🎉 Votre annonce \"%s\" a été vendue !", listing.Title),
			Type:    "success",
		})

		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "listing", "title": listing.Title})

	case "subscription":
		plan := s.Metadata["plan"]
		price := planPrices[plan]

		var sub models.Subscription
		err := config.DB.Where("user_id = ?", userID).First(&sub).Error
		if err != nil {
			sub = models.Subscription{
				UserID:      userID,
				Plan:        plan,
				Price:       price,
				Status:      "active",
				RenewalDate: time.Now().AddDate(0, 1, 0),
			}
			config.DB.Create(&sub)
		} else {
			config.DB.Model(&sub).Updates(map[string]interface{}{
				"plan":         plan,
				"price":        price,
				"status":       "active",
				"renewal_date": time.Now().AddDate(0, 1, 0),
			})
		}
		config.DB.Create(&models.Notification{
			UserID:  userID,
			Message: fmt.Sprintf("🎉 Abonnement %s activé ! Merci pour votre confiance.", plan),
			Type:    "success",
		})
		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "subscription", "plan": plan})

	default:
		c.JSON(http.StatusOK, gin.H{"status": "confirmed"})
	}
}

// StripeWebhook - POST /api/stripe/webhook
func StripeWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot read body"})
		return
	}

	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	sig := c.GetHeader("Stripe-Signature")

	var event stripe.Event
	if webhookSecret != "" && sig != "" {
		event, err = webhook.ConstructEvent(body, sig, webhookSecret)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Signature invalide"})
			return
		}
	} else {
		// Mode dev sans vérification de signature
		if err := json.Unmarshal(body, &event); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot parse event"})
			return
		}
	}

	if event.Type == "checkout.session.completed" {
		var s stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &s); err != nil {
			c.JSON(http.StatusOK, gin.H{"received": true})
			return
		}

		eventType := s.Metadata["type"]
		userIDStr := s.Metadata["user_id"]
		userID64, _ := strconv.ParseUint(userIDStr, 10, 64)
		userID := uint(userID64)

		switch eventType {
		case "workshop":
			workshopIDStr := s.Metadata["workshop_id"]
			workshopID64, _ := strconv.ParseUint(workshopIDStr, 10, 64)
			workshopID := uint(workshopID64)

			var workshop models.Workshop
			if err := config.DB.First(&workshop, workshopID).Error; err != nil {
				break
			}

			// Idempotence : évite double inscription
			var existing models.WorkshopBooking
			if config.DB.Where("workshop_id = ? AND user_id = ?", workshopID, userID).First(&existing).Error == nil {
				break
			}

			booking := models.WorkshopBooking{
				WorkshopID: workshopID,
				UserID:     userID,
				Status:     "confirmed",
				PaymentID:  s.ID,
			}
			config.DB.Create(&booking)
			config.DB.Model(&workshop).UpdateColumn("enrolled", gorm.Expr("enrolled + 1"))

			config.DB.Create(&models.Notification{
				UserID:  userID,
				Message: fmt.Sprintf("✅ Paiement confirmé ! Votre inscription à \"%s\" est validée.", workshop.Title),
				Type:    "success",
			})

		case "listing":
			listingIDStr := s.Metadata["listing_id"]
			listingID64, _ := strconv.ParseUint(listingIDStr, 10, 64)
			listingID := uint(listingID64)

			var listing models.Listing
			if err := config.DB.First(&listing, listingID).Error; err != nil {
				break
			}
			if listing.Status == "sold" {
				break
			}
			commission := listing.Price * (listing.CommissionRate / 100)
			config.DB.Model(&listing).Updates(map[string]interface{}{
				"status":            "sold",
				"commission_amount": commission,
			})
			tax := listing.Price * 0.20
			invoiceNumber := fmt.Sprintf("INV-LST-%d-%d", listingID, userID)
			config.DB.Create(&models.Invoice{
				Number: invoiceNumber,
				UserID: userID,
				Type:   "listing",
				Amount: listing.Price,
				Tax:    tax,
				Total:  listing.Price + tax,
				Status: "paid",
			})
			config.DB.Create(&models.Notification{
				UserID:  userID,
				Message: fmt.Sprintf("✅ Achat confirmé ! Vous avez acheté \"%s\".", listing.Title),
				Type:    "success",
			})
			config.DB.Create(&models.Notification{
				UserID:  listing.UserID,
				Message: fmt.Sprintf("🎉 Votre annonce \"%s\" a été vendue !", listing.Title),
				Type:    "success",
			})

		case "subscription":
			plan := s.Metadata["plan"]
			price := planPrices[plan]

			var sub models.Subscription
			err := config.DB.Where("user_id = ?", userID).First(&sub).Error
			if err != nil {
				sub = models.Subscription{
					UserID:      userID,
					Plan:        plan,
					Price:       price,
					Status:      "active",
					RenewalDate: time.Now().AddDate(0, 1, 0),
				}
				config.DB.Create(&sub)
			} else {
				config.DB.Model(&sub).Updates(map[string]interface{}{
					"plan":         plan,
					"price":        price,
					"status":       "active",
					"renewal_date": time.Now().AddDate(0, 1, 0),
				})
			}

			config.DB.Create(&models.Notification{
				UserID:  userID,
				Message: fmt.Sprintf("🎉 Abonnement %s activé ! Merci pour votre confiance.", plan),
				Type:    "success",
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}
