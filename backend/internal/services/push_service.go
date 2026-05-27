package services

import (
	"encoding/json"
	"log"

	webpush "github.com/SherClockHolmes/webpush-go"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/models"
)

var (
	VapidPrivateKey string
	VapidPublicKey  string
)

type pushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Icon  string `json:"icon"`
	URL   string `json:"url"`
}

func InitPush() {
	VapidPrivateKey = config.GetEnv("VAPID_PRIVATE_KEY", "")
	VapidPublicKey = config.GetEnv("VAPID_PUBLIC_KEY", "")

	if VapidPrivateKey == "" || VapidPublicKey == "" {
		priv, pub, err := webpush.GenerateVAPIDKeys()
		if err != nil {
			log.Println("Push: failed to generate VAPID keys:", err)
			return
		}
		VapidPrivateKey = priv
		VapidPublicKey = pub
		log.Printf("VAPID keys auto-generees. Ajoutez dans .env:\nVAPID_PRIVATE_KEY=%s\nVAPID_PUBLIC_KEY=%s\n", priv, pub)
	}
}

func SendPushToUser(userID uint, title, body string) {
	if VapidPrivateKey == "" || VapidPublicKey == "" {
		return
	}

	var subs []models.PushSubscription
	config.DB.Where("user_id = ?", userID).Find(&subs)
	if len(subs) == 0 {
		return
	}

	vapidEmail := config.GetEnv("VAPID_EMAIL", "mailto:contact@upcycleconnect.net")

	payload, _ := json.Marshal(pushPayload{
		Title: title,
		Body:  body,
		Icon:  "/favicon.png",
		URL:   "/dashboard",
	})

	for _, sub := range subs {
		s := &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}

		resp, err := webpush.SendNotification(payload, s, &webpush.Options{
			VAPIDPublicKey:  VapidPublicKey,
			VAPIDPrivateKey: VapidPrivateKey,
			Subscriber:      vapidEmail,
			TTL:             30,
		})
		if err != nil {
			log.Printf("Push send error user %d: %v", userID, err)
			config.DB.Where("endpoint = ?", sub.Endpoint).Delete(&models.PushSubscription{})
			continue
		}
		resp.Body.Close()
		if resp.StatusCode == 410 {
			config.DB.Where("endpoint = ?", sub.Endpoint).Delete(&models.PushSubscription{})
		}
	}
}
