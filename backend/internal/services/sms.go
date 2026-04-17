package services

import (
	"fmt"
	"os"

	openapi "github.com/twilio/twilio-go/rest/api/v2010"
	twilio "github.com/twilio/twilio-go"
)

var clientTwilio *twilio.RestClient
var numeroExpediteur string

func InitSMS() {
	sid := os.Getenv("TWILIO_ACCOUNT_SID")
	token := os.Getenv("TWILIO_AUTH_TOKEN")
	numeroExpediteur = os.Getenv("TWILIO_PHONE_NUMBER")

	if sid == "" || token == "" {
		fmt.Println("[SMS] Variables Twilio absentes — les SMS seront simulés dans les logs")
		return
	}

	clientTwilio = twilio.NewRestClientWithParams(twilio.ClientParams{
		Username: sid,
		Password: token,
	})

	fmt.Println("[SMS] Client Twilio initialisé avec succès")
}

func EnvoyerSMS(destinataire, contenu string) error {
	if clientTwilio == nil {
		fmt.Printf("[SMS DEV] Destinataire: %s | Message: %s\n", destinataire, contenu)
		return nil
	}

	params := &openapi.CreateMessageParams{}
	params.SetTo(destinataire)
	params.SetFrom(numeroExpediteur)
	params.SetBody(contenu)

	_, err := clientTwilio.Api.CreateMessage(params)
	if err != nil {
		return fmt.Errorf("erreur envoi SMS : %w", err)
	}

	return nil
}
