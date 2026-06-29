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

func CreateSubscriptionCheckout(c *gin.Context) {
	stripe.Key = getStripeKey()
	userID, _ := c.Get("userID")

	var req struct {
		Slug string `json:"slug" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var plan models.SubscriptionPlan
	if err := config.DB.Where("slug = ? AND is_active = true", req.Slug).First(&plan).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Plan introuvable"})
		return
	}
	if plan.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ce plan est gratuit, pas besoin de paiement"})
		return
	}

	frontendURL := getFrontendURL()
	priceAmount := int64(plan.Price * 100)
	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String(plan.Name),
						Description: stripe.String(fmt.Sprintf("Abonnement %d jours — +%d annonces", plan.DurationDays, plan.MaxListingsBonus)),
					},
					UnitAmount: stripe.Int64(priceAmount),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(frontendURL + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(frontendURL + "/payment/cancel"),
		Metadata: map[string]string{
			"type":    "subscription",
			"plan":    plan.Slug,
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

		wsInvoiceNumber := fmt.Sprintf("INV-WS-%d-%d", workshopID, userID)

		var existing models.WorkshopBooking
		if config.DB.Where("workshop_id = ? AND user_id = ?", workshopID, userID).First(&existing).Error == nil {
			inv := ensureInvoice(wsInvoiceNumber, userID, "workshop", workshop.Title, workshop.Price)
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "workshop", "title": workshop.Title, "invoice_id": inv.ID})
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
		inv := ensureInvoice(wsInvoiceNumber, userID, "workshop", workshop.Title, workshop.Price)
		config.DB.Create(&models.Notification{
			UserID:  userID,
			Message: fmt.Sprintf("✅ Paiement confirmé ! Votre inscription à \"%s\" est validée.", workshop.Title),
			Type:    "success",
		})
		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "workshop", "title": workshop.Title, "invoice_id": inv.ID})

	case "listing":
		listingIDStr := s.Metadata["listing_id"]
		listingID64, _ := strconv.ParseUint(listingIDStr, 10, 64)
		listingID := uint(listingID64)

		var listing models.Listing
		if err := config.DB.First(&listing, listingID).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "listing"})
			return
		}

		invoiceNumber := fmt.Sprintf("INV-LST-%d-%d", listingID, userID)

		if listing.Status == "sold" {
			inv := ensureInvoice(invoiceNumber, userID, "listing", listing.Title, listing.Price)
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "listing", "title": listing.Title, "invoice_id": inv.ID})
			return
		}

		commission := listing.Price * (listing.CommissionRate / 100)
		config.DB.Model(&listing).Updates(map[string]interface{}{
			"status":            "sold",
			"commission_amount": commission,
		})

		inv := ensureInvoice(invoiceNumber, userID, "listing", listing.Title, listing.Price)

		config.DB.Create(&models.Notification{
			UserID:  userID,
			Message: fmt.Sprintf("✅ Achat confirmé ! Vous avez acheté \"%s\". Contactez le vendeur pour la remise.", listing.Title),
			Type:    "success",
		})
		config.DB.Create(&models.Notification{
			UserID:  listing.UserID,
			Message: fmt.Sprintf("🎉 Votre annonce \"%s\" a été vendue !", listing.Title),
			Type:    "success",
		})

		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "listing", "title": listing.Title, "invoice_id": inv.ID})

	case "subscription":
		planSlug := s.Metadata["plan"]
		var planData models.SubscriptionPlan
		if err := config.DB.Where("slug = ?", planSlug).First(&planData).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "subscription", "plan": planSlug})
			return
		}

		subInvoiceNumber := fmt.Sprintf("INV-SUB-%d-%s-%s", userID, planSlug, time.Now().Format("20060102150405"))
		var existing models.Invoice
		if config.DB.Where("number = ?", subInvoiceNumber).First(&existing).Error != nil {
			expiresAt := time.Now().AddDate(0, 0, planData.DurationDays)
			config.DB.Create(&models.Subscription{
				UserID:           userID,
				Plan:             planSlug,
				Price:            planData.Price,
				Status:           "active",
				RenewalDate:      expiresAt,
				ExpiresAt:        &expiresAt,
				MaxListingsBonus: planData.MaxListingsBonus,
			})
		}
		inv := ensureInvoice(subInvoiceNumber, userID, "subscription", "Abonnement "+planData.Name, planData.Price)
		config.DB.Create(&models.Notification{
			UserID:  userID,
			Message: fmt.Sprintf("🎉 Abonnement \"%s\" activé ! +%d annonces disponibles pendant %d jours.", planData.Name, planData.MaxListingsBonus, planData.DurationDays),
			Type:    "success",
		})
		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "subscription", "plan": planSlug, "invoice_id": inv.ID})

	case "boost":
		listingIDStr := s.Metadata["listing_id"]
		listingID64, _ := strconv.ParseUint(listingIDStr, 10, 64)
		listingID := uint(listingID64)

		var listing models.Listing
		if err := config.DB.First(&listing, listingID).Error; err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "boost"})
			return
		}

		if listing.IsSponsored && listing.SponsoredUntil != nil && listing.SponsoredUntil.After(time.Now()) {
			inv := ensureInvoice(fmt.Sprintf("INV-BOOST-%d-%d", listingID, userID), userID, "boost", "Boost annonce: "+listing.Title, 5.0)
			c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "boost", "title": listing.Title, "invoice_id": inv.ID})
			return
		}

		until := time.Now().Add(24 * time.Hour)
		config.DB.Model(&listing).Updates(map[string]interface{}{
			"is_sponsored":    true,
			"sponsored_until": until,
		})
		config.DB.Create(&models.Notification{
			UserID:  userID,
			Message: fmt.Sprintf("Votre annonce \"%s\" est maintenant boostée pendant 24h !", listing.Title),
			Type:    "success",
		})
		inv := ensureInvoice(fmt.Sprintf("INV-BOOST-%d-%d", listingID, userID), userID, "boost", "Boost annonce: "+listing.Title, 5.0)
		c.JSON(http.StatusOK, gin.H{"status": "confirmed", "type": "boost", "title": listing.Title, "invoice_id": inv.ID})

	default:
		c.JSON(http.StatusOK, gin.H{"status": "confirmed"})
	}
}

func createBoostCheckoutSession(listingID, userID uint) (string, error) {
	stripe.Key = getStripeKey()
	frontendURL := getFrontendURL()

	var listing models.Listing
	if err := config.DB.First(&listing, listingID).Error; err != nil {
		return "", err
	}

	params := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("eur"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String("Boost d'annonce 24h"),
						Description: stripe.String(fmt.Sprintf("Mise en avant de \"%s\" pendant 24 heures", listing.Title)),
					},
					UnitAmount: stripe.Int64(500),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL: stripe.String(frontendURL + "/payment/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(frontendURL + "/payment/cancel"),
		Metadata: map[string]string{
			"type":       "boost",
			"listing_id": strconv.Itoa(int(listingID)),
			"user_id":    strconv.Itoa(int(userID)),
		},
	}

	s, err := session.New(params)
	if err != nil {
		return "", err
	}
	return s.URL, nil
}

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
			ensureInvoice(fmt.Sprintf("INV-WS-%d-%d", workshopID, userID), userID, "workshop", workshop.Title, workshop.Price)

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
			ensureInvoice(fmt.Sprintf("INV-LST-%d-%d", listingID, userID), userID, "listing", listing.Title, listing.Price)
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
			planSlug := s.Metadata["plan"]
			var planData models.SubscriptionPlan
			if err := config.DB.Where("slug = ?", planSlug).First(&planData).Error; err != nil {
				break
			}
			invNum := fmt.Sprintf("INV-SUB-%d-%s-%s", userID, planSlug, time.Now().Format("20060102150405"))
			var existingInv models.Invoice
			if config.DB.Where("number = ?", invNum).First(&existingInv).Error != nil {
				expiresAt := time.Now().AddDate(0, 0, planData.DurationDays)
				config.DB.Create(&models.Subscription{
					UserID:           userID,
					Plan:             planSlug,
					Price:            planData.Price,
					Status:           "active",
					RenewalDate:      expiresAt,
					ExpiresAt:        &expiresAt,
					MaxListingsBonus: planData.MaxListingsBonus,
				})
				ensureInvoice(invNum, userID, "subscription", "Abonnement "+planData.Name, planData.Price)
				config.DB.Create(&models.Notification{
					UserID:  userID,
					Message: fmt.Sprintf("🎉 Abonnement \"%s\" activé ! +%d annonces disponibles.", planData.Name, planData.MaxListingsBonus),
					Type:    "success",
				})
			}

		case "boost":
			listingIDStr := s.Metadata["listing_id"]
			listingID64, _ := strconv.ParseUint(listingIDStr, 10, 64)
			listingID := uint(listingID64)

			var listing models.Listing
			if err := config.DB.First(&listing, listingID).Error; err != nil {
				break
			}
			if listing.IsSponsored && listing.SponsoredUntil != nil && listing.SponsoredUntil.After(time.Now()) {
				break
			}
			until := time.Now().Add(24 * time.Hour)
			config.DB.Model(&listing).Updates(map[string]interface{}{
				"is_sponsored":    true,
				"sponsored_until": until,
			})
			ensureInvoice(fmt.Sprintf("INV-BOOST-%d-%d", listingID, userID), userID, "boost", "Boost annonce: "+listing.Title, 5.0)
			config.DB.Create(&models.Notification{
				UserID:  userID,
				Message: fmt.Sprintf("Votre annonce \"%s\" est maintenant boostée pendant 24h !", listing.Title),
				Type:    "success",
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}
