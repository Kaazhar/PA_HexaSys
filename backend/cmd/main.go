package main

import (
	"fmt"
	"log"
	"strings"
	"time"

	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/handlers"
	"upcycleconnect/backend/internal/middleware"
	"upcycleconnect/backend/internal/models"
	"upcycleconnect/backend/internal/services"
	"upcycleconnect/backend/locales"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	config.LoadEnv()
	config.ConnectDB()
	services.InitSMS()
	services.InitPush()
	models.PushSender = services.SendPushToUser

	migDB := config.DB.Set("gorm:table_options", "ENGINE=InnoDB ROW_FORMAT=DYNAMIC DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci")
	if err := migDB.AutoMigrate(
		&models.User{},
		&models.BanRecord{},
		&models.Category{},
		&models.Listing{},
		&models.Workshop{},
		&models.WorkshopSession{},
		&models.WorkshopChapter{},
		&models.WorkshopBooking{},
		&models.Container{},
		&models.ContainerRequest{},
		&models.UpcyclingScore{},
		&models.ScoreEntry{},
		&models.SubscriptionPlan{},
		&models.Subscription{},
		&models.Invoice{},
		&models.Notification{},
		&models.Article{},
		&models.Project{},
		&models.ProjectUpdate{},
		&models.ProjectFollower{},
		&models.Conversation{},
		&models.Message{},
		&models.Review{},
		&models.Report{},
		&models.PhoneVerification{},
		&models.PushSubscription{},
		&models.ContainerSlot{},
		&models.ForumTopic{},
		&models.ForumPost{},
		&models.Language{},
		&models.Translation{},
	); err != nil {
		log.Fatal("Migration failed:", err)
	}

	seedData()
	seedSubscriptionPlans()
	seedSlots()
	cleanCorruptedTranslations()
	seedTranslations()

	go func() {
		for {
			time.Sleep(1 * time.Hour)
			deadline := time.Now().Add(48 * time.Hour)
			var workshops []models.Workshop
			config.DB.Where("status = 'active' AND date <= ? AND date > ? AND enrolled < min_spots", deadline, time.Now()).Find(&workshops)
			for _, w := range workshops {
				reason := fmt.Sprintf("Nombre minimum de participants non atteint (%d/%d inscrits)", w.Enrolled, w.MinSpots)
				config.DB.Model(&w).Updates(map[string]interface{}{
					"status":        "cancelled",
					"cancel_reason": reason,
				})
				var bookings []models.WorkshopBooking
				config.DB.Where("workshop_id = ? AND status = ?", w.ID, "confirmed").Find(&bookings)
				msg := fmt.Sprintf("L'événement \"%s\" du %s a été annulé : le nombre minimum de participants (%d) n'a pas été atteint.", w.Title, w.Date.Format("02/01/2006"), w.MinSpots)
				for _, b := range bookings {
					config.DB.Create(&models.Notification{UserID: b.UserID, Message: msg, Type: "warning"})
				}
				config.DB.Create(&models.Notification{UserID: w.InstructorID, Message: msg, Type: "warning"})
			}
		}
	}()

	r := gin.Default()

	r.Static("/uploads", "./uploads")

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost", "http://localhost:80", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000", "https://upcycleconnect.net", "https://www.upcycleconnect.net"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/api")

	auth := api.Group("/auth")
	{
		auth.POST("/register", handlers.Inscrire)
		auth.POST("/login", handlers.Connexion)
		auth.GET("/me", middleware.AuthRequired(), handlers.MonProfil)
		auth.PUT("/profile", middleware.AuthRequired(), handlers.ModifierProfil)
		auth.PUT("/avatar", middleware.AuthRequired(), handlers.ModifierAvatar)
		auth.PUT("/banner", middleware.AuthRequired(), handlers.ModifierBanniere)
		auth.PUT("/password", middleware.AuthRequired(), handlers.ChangerMotDePasse)
		auth.POST("/confirm-email", handlers.ConfirmerEmail)
		auth.POST("/forgot-password", handlers.MotDePasseOublie)
		auth.POST("/reset-password", handlers.ReinitialiserMotDePasse)
		auth.POST("/resend-confirm", handlers.RenvoyerConfirmationEmail)
		auth.POST("/verify-2fa", handlers.Verifier2FA)
		auth.POST("/resend-2fa", handlers.RenvoyerCode2FA)
		auth.POST("/toggle-email-2fa", middleware.AuthRequired(), handlers.BasculerEmail2FA)
		auth.GET("/google-config", handlers.ConfigGoogle)
		auth.POST("/google", handlers.ConnexionGoogle)
	}

	phone := api.Group("/phone")
	phone.Use(middleware.AuthRequired())
	{
		phone.POST("/send-code", handlers.EnvoyerCodeTelephone)
		phone.POST("/verify", handlers.VerifierTelephone)
		phone.POST("/toggle-2fa", handlers.BasculerSMS2FA)
	}

	api.PUT("/newsletter", middleware.AuthRequired(), handlers.BasculerNewsletter)

	api.GET("/push/vapid-public-key", handlers.CleVapidPublique)
	push := api.Group("/push")
	push.Use(middleware.AuthRequired())
	{
		push.POST("/subscribe", handlers.AbonnerPush)
		push.DELETE("/unsubscribe", handlers.DesabonnerPush)
	}

	api.GET("/languages", handlers.ListerLangues)
	api.GET("/translations/:lang", handlers.ObtenirTraduction)

	api.GET("/categories", handlers.ListerCategories)
	api.POST("/categories", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.CreerCategorie)
	api.PUT("/categories/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ModifierCategorie)
	api.DELETE("/categories/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.SupprimerCategorie)

	api.GET("/companies/:siret", handlers.ObtenirEntrepriseSiret)
	api.GET("/search", handlers.RechercheGlobale)
	api.GET("/users/:id", handlers.ProfilPublic)
	api.GET("/projects", handlers.ListerProjets)
	api.GET("/projects/:id", middleware.OptionalAuth(), handlers.ObtenirProjet)
	api.POST("/projects/:id/follow", middleware.AuthRequired(), handlers.SuivreProjet)
	api.DELETE("/projects/:id/follow", middleware.AuthRequired(), handlers.NePlusSuivreProjet)
	api.GET("/stats/public", handlers.StatsPubliques)
	api.GET("/score/leaderboard", handlers.Classement)

	api.GET("/listings/mine", middleware.AuthRequired(), handlers.MesAnnonces)
	api.GET("/listings", handlers.ListerAnnonces)
	api.GET("/listings/:id", handlers.ObtenirAnnonce)
	api.GET("/listings/:id/reviews", handlers.AvisAnnonce)
	api.POST("/listings", middleware.AuthRequired(), middleware.RequireRole(models.RoleParticulier, models.RoleProfessionnel, models.RoleAdmin), handlers.CreerAnnonce)
	api.POST("/listings/:id/reviews", middleware.AuthRequired(), handlers.CreerAvis)
	api.PUT("/listings/:id/validate", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ValiderAnnonce)
	api.PUT("/listings/:id/reject", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.RejeterAnnonce)
	api.PUT("/listings/:id/sponsor", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.SponsoriserAnnonce)
	api.POST("/listings/:id/boost", middleware.AuthRequired(), handlers.BoosterAnnonce)
	api.PUT("/listings/:id/sold", middleware.AuthRequired(), handlers.MarquerVendue)
	api.PUT("/listings/:id", middleware.AuthRequired(), handlers.ModifierAnnonce)
	api.DELETE("/listings/:id", middleware.AuthRequired(), handlers.SupprimerAnnonce)
	api.DELETE("/reviews/:id", middleware.AuthRequired(), handlers.SupprimerAvis)
	api.POST("/upload", middleware.AuthRequired(), handlers.TeleverserFichier)
	api.POST("/listings/:id/report", middleware.AuthRequired(), handlers.SignalerAnnonce)
	api.GET("/users/:id/reviews", handlers.AvisUtilisateur)

	api.GET("/workshops", handlers.ListerFormations)
	api.GET("/workshops/:id", handlers.ObtenirFormation)
	api.POST("/workshops", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.CreerFormation)
	api.PUT("/workshops/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.ModifierFormation)
	api.PUT("/workshops/:id/validate", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ValiderFormation)
	api.PUT("/workshops/:id/cancel", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.AnnulerFormation)
	api.DELETE("/workshops/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.SupprimerFormation)
	api.GET("/workshops/:id/bookings", middleware.AuthRequired(), handlers.InscritsFormation)
	api.POST("/workshops/:id/book", middleware.AuthRequired(), handlers.ReserverFormation)
	api.POST("/workshops/check-enrollment", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.VerifierMinInscrits)

	api.GET("/containers", handlers.ListerConteneurs)
	api.POST("/containers", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.CreerConteneur)
	api.PUT("/containers/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ModifierConteneur)
	api.GET("/containers/slots", handlers.ListerEmplacements)
	api.POST("/containers/:id/slots", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.InitialiserEmplacements)
	api.GET("/containers/requests", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ListerDemandesConteneur)
	api.POST("/containers/requests", middleware.AuthRequired(), handlers.CreerDemandeConteneur)
	api.PUT("/containers/requests/:id/validate", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ValiderDemandeConteneur)
	api.PUT("/containers/requests/:id/reject", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.RejeterDemandeConteneur)
	api.PUT("/containers/requests/:id/confirm-deposit", middleware.AuthRequired(), handlers.ConfirmerDepot)
	api.GET("/containers/requests/mine", middleware.AuthRequired(), handlers.MesDemandes)
	api.GET("/containers/requests/:id/barcode", middleware.AuthRequired(), handlers.GenererCodeBarres)
	api.DELETE("/containers/:id/slots", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ViderEmplacements)
	api.GET("/containers/available-objects", middleware.AuthRequired(), middleware.RequireRole(models.RoleProfessionnel, models.RoleAdmin), handlers.ObjetsDisponibles)

	api.GET("/subscription-plans", handlers.ListerPlansAbonnement)
	api.GET("/subscriptions/my", middleware.AuthRequired(), handlers.MesAbonnements)
	api.POST("/subscriptions/subscribe-free", middleware.AuthRequired(), handlers.SouscrirePlanGratuit)
	api.GET("/subscription", middleware.AuthRequired(), handlers.MesAbonnements)

	api.GET("/invoices/mine", middleware.AuthRequired(), handlers.MesFactures)
	api.GET("/invoices/:id/pdf", middleware.AuthRequired(), handlers.TelechargerFacturePDF)

	api.GET("/articles", handlers.ListerArticles)
	api.GET("/articles/:id", handlers.ObtenirArticle)

	api.GET("/forum/topics", middleware.OptionalAuth(), handlers.ListerSujets)
	api.GET("/forum/topics/:id", middleware.OptionalAuth(), handlers.ObtenirSujet)
	api.POST("/forum/topics", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.CreerSujet)
	api.PUT("/forum/topics/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.ModifierSujet)
	api.DELETE("/forum/topics/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.SupprimerSujet)
	api.PUT("/forum/topics/:id/pin", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.EpinglerSujet)
	api.PUT("/forum/topics/:id/lock", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.VerrouillerSujet)
	api.POST("/forum/topics/:id/posts", middleware.AuthRequired(), handlers.CreerReponse)
	api.DELETE("/forum/posts/:id", middleware.AuthRequired(), handlers.SupprimerReponse)

	api.POST("/stripe/workshop-checkout", middleware.AuthRequired(), handlers.PaiementFormation)
	api.POST("/stripe/listing-checkout", middleware.AuthRequired(), handlers.PaiementAnnonce)
	api.POST("/stripe/subscription-checkout", middleware.AuthRequired(), handlers.PaiementAbonnement)
	api.GET("/stripe/confirm", middleware.AuthRequired(), handlers.ConfirmerSession)
	api.POST("/stripe/webhook", handlers.WebhookStripe)

	api.GET("/conversations", middleware.AuthRequired(), handlers.ListerConversations)
	api.POST("/conversations", middleware.AuthRequired(), handlers.ObtenirOuCreerConversation)
	api.GET("/conversations/:id/messages", middleware.AuthRequired(), handlers.ListerMessages)
	api.POST("/conversations/:id/messages", middleware.AuthRequired(), handlers.EnvoyerMessage)

	api.GET("/user/bookings", middleware.AuthRequired(), handlers.MesReservations)
	api.GET("/score/me", middleware.AuthRequired(), handlers.MonScore)
	api.GET("/notifications", middleware.AuthRequired(), handlers.MesNotifications)
	api.PUT("/notifications/:id/read", middleware.AuthRequired(), handlers.MarquerNotificationLue)

	adminGroup := api.Group("/admin")
	adminGroup.Use(middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin))
	{
		adminGroup.GET("/languages", handlers.ListerLanguesAdmin)
		adminGroup.POST("/languages", handlers.CreerLangue)
		adminGroup.DELETE("/languages/:code", handlers.SupprimerLangue)
		adminGroup.GET("/users", handlers.ListerUtilisateurs)
		adminGroup.POST("/users", handlers.CreerUtilisateur)
		adminGroup.PUT("/users/:id", handlers.ModifierUtilisateur)
		adminGroup.DELETE("/users/:id", handlers.SupprimerUtilisateur)
		adminGroup.PUT("/users/:id/reset-email-2fa", handlers.ReinitialiserEmail2FA)
		adminGroup.POST("/users/:id/ban", handlers.BannirUtilisateur)
		adminGroup.POST("/users/:id/unban", handlers.LeverBan)
		adminGroup.GET("/users/:id/bans", handlers.HistoriqueBans)
		adminGroup.GET("/stats", handlers.StatsAdmin)
		adminGroup.GET("/finance", handlers.StatsFinance)
		adminGroup.GET("/invoices", handlers.ListerFactures)
		adminGroup.GET("/listings", handlers.ListerAnnoncesAdmin)
		adminGroup.GET("/workshops", handlers.ListerFormationsAdmin)
		adminGroup.GET("/reports", handlers.ListerSignalements)
		adminGroup.PUT("/reports/:id/resolve", handlers.TraiterSignalement)
		adminGroup.POST("/newsletter", handlers.EnvoyerNewsletter)
		adminGroup.GET("/subscription-plans", handlers.AdminListerPlans)
		adminGroup.POST("/subscription-plans", handlers.AdminCreerPlan)
		adminGroup.PUT("/subscription-plans/:id", handlers.AdminModifierPlan)
		adminGroup.DELETE("/subscription-plans/:id", handlers.AdminSupprimerPlan)
		adminGroup.GET("/user-subscriptions", handlers.AdminAbonnementsUtilisateurs)
		adminGroup.DELETE("/user-subscriptions/:id", handlers.AdminAnnulerAbonnement)
		adminGroup.GET("/articles", handlers.MesArticles)
		adminGroup.POST("/articles", handlers.CreerArticle)
		adminGroup.PUT("/articles/:id", handlers.ModifierArticle)
		adminGroup.DELETE("/articles/:id", handlers.SupprimerArticle)
		adminGroup.GET("/projects", handlers.ListerProjets)
		adminGroup.POST("/projects", handlers.CreerProjet)
		adminGroup.PUT("/projects/:id", handlers.ModifierProjet)
		adminGroup.DELETE("/projects/:id", handlers.SupprimerProjet)
		adminGroup.DELETE("/listings/:id", handlers.SupprimerAnnonce)
		adminGroup.PUT("/listings/:id/moderate", handlers.ModererAnnonce)
	}

	salarieGroup := api.Group("/salarie")
	salarieGroup.Use(middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin))
	{
		salarieGroup.GET("/workshops", handlers.MesFormations)
		salarieGroup.GET("/articles", handlers.MesArticles)
		salarieGroup.POST("/articles", handlers.CreerArticle)
		salarieGroup.PUT("/articles/:id", handlers.ModifierArticle)
		salarieGroup.DELETE("/articles/:id", handlers.SupprimerArticle)
	}

	proGroup := api.Group("/pro")
	proGroup.Use(middleware.AuthRequired(), middleware.RequireRole(models.RoleProfessionnel, models.RoleAdmin))
	{
		proGroup.POST("/verify-siret", handlers.VerifierSiret)
		proGroup.GET("/siret-status", handlers.StatutSiret)
		proGroup.GET("/company-info", handlers.InfosEntreprise)
		proGroup.GET("/projects", handlers.MesProjets)
		proGroup.POST("/projects", handlers.CreerProjet)
		proGroup.PUT("/projects/:id", handlers.ModifierProjet)
		proGroup.DELETE("/projects/:id", handlers.SupprimerProjet)
		proGroup.POST("/projects/:id/updates", handlers.AjouterMiseAJour)
		proGroup.PUT("/projects/:id/updates/:updateId", handlers.ModifierMiseAJour)
		proGroup.DELETE("/projects/:id/updates/:updateId", handlers.SupprimerMiseAJour)
	}

	api.GET("/particulier/dashboard", middleware.AuthRequired(), middleware.RequireRole(models.RoleParticulier, models.RoleAdmin), handlers.DashboardParticulier)
	api.GET("/pro/dashboard", middleware.AuthRequired(), middleware.RequireRole(models.RoleProfessionnel, models.RoleAdmin), handlers.DashboardPro)
	api.GET("/salarie/dashboard", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.DashboardSalarie)

	port := config.GetEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func seedData() {
	var count int64
	config.DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("Seeding initial data...")

	hashPassword := func(password string) string {
		hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		return string(hash)
	}

	users := []models.User{
		{Email: "hacksimpsons92@gmail.com", PasswordHash: hashPassword("Theo2026!"), Firstname: "Théo", Lastname: "", Role: models.RoleAdmin, IsActive: true, IsVerified: true, FirstLogin: false},
		{Email: "romaintoso250@gmail.com", PasswordHash: hashPassword("Romain2026!"), Firstname: "Romain", Lastname: "", Role: models.RoleAdmin, IsActive: true, IsVerified: true, FirstLogin: false},
		{Email: "particulier@test.fr", PasswordHash: hashPassword("test123"), Firstname: "Marie", Lastname: "Dupont", Role: models.RoleParticulier, IsActive: true, IsVerified: true, FirstLogin: false},
		{Email: "pro@test.fr", PasswordHash: hashPassword("test123"), Firstname: "Pierre", Lastname: "Martin", Role: models.RoleProfessionnel, IsActive: true, IsVerified: true, FirstLogin: false},
		{Email: "salarie@test.fr", PasswordHash: hashPassword("test123"), Firstname: "Sophie", Lastname: "Bernard", Role: models.RoleSalarie, IsActive: true, IsVerified: true, FirstLogin: false},
		{Email: "jean.leroy@test.fr", PasswordHash: hashPassword("test123"), Firstname: "Jean", Lastname: "Leroy", Role: models.RoleParticulier, IsActive: true, IsVerified: true, FirstLogin: false},
		{Email: "clara.morel@test.fr", PasswordHash: hashPassword("test123"), Firstname: "Clara", Lastname: "Morel", Role: models.RoleParticulier, IsActive: true, IsVerified: false, FirstLogin: false},
		{Email: "thomas.petit@test.fr", PasswordHash: hashPassword("test123"), Firstname: "Thomas", Lastname: "Petit", Role: models.RoleProfessionnel, IsActive: true, IsVerified: true, FirstLogin: false},
		{Email: "amelie.garcia@test.fr", PasswordHash: hashPassword("test123"), Firstname: "Amélie", Lastname: "Garcia", Role: models.RoleSalarie, IsActive: true, IsVerified: true, FirstLogin: false},
		{Email: "lucas.simon@test.fr", PasswordHash: hashPassword("test123"), Firstname: "Lucas", Lastname: "Simon", Role: models.RoleParticulier, IsActive: false, IsVerified: false, FirstLogin: true},
		{Email: "emma.fontaine@test.fr", PasswordHash: hashPassword("test123"), Firstname: "Emma", Lastname: "Fontaine", Role: models.RoleParticulier, IsActive: true, IsVerified: true, FirstLogin: false},
	}

	for i := range users {
		config.DB.Create(&users[i])
		config.DB.Create(&models.UpcyclingScore{UserID: users[i].ID, TotalPoints: (i + 1) * 50, Level: "Débutant"})
	}

	categories := []models.Category{
		{Name: "Mobilier", Slug: "mobilier", Description: "Meubles et décoration", Icon: "sofa", Color: "#8B5CF6", IsActive: true},
		{Name: "Électronique", Slug: "electronique", Description: "Appareils électroniques", Icon: "cpu", Color: "#3B82F6", IsActive: true},
		{Name: "Vêtements", Slug: "vetements", Description: "Mode et accessoires", Icon: "shirt", Color: "#EC4899", IsActive: true},
		{Name: "Livres & Médias", Slug: "livres-medias", Description: "Livres, DVD, jeux", Icon: "book", Color: "#F59E0B", IsActive: true},
		{Name: "Bricolage", Slug: "bricolage", Description: "Outils et matériaux", Icon: "wrench", Color: "#10B981", IsActive: true},
	}

	for i := range categories {
		config.DB.Create(&categories[i])
	}

	containers := []models.Container{
		{Name: "Conteneur République", Address: "Place de la République", District: "75011", Capacity: 30, CurrentCount: 12, Status: "operational", Latitude: 48.8674, Longitude: 2.3634},
		{Name: "Conteneur Bastille", Address: "Place de la Bastille", District: "75012", Capacity: 25, CurrentCount: 20, Status: "operational", Latitude: 48.8533, Longitude: 2.3692},
		{Name: "Conteneur Nation", Address: "Place de la Nation", District: "75011", Capacity: 20, CurrentCount: 5, Status: "operational", Latitude: 48.8484, Longitude: 2.3960},
		{Name: "Conteneur Oberkampf", Address: "Rue Oberkampf", District: "75011", Capacity: 15, CurrentCount: 15, Status: "full", Latitude: 48.8643, Longitude: 2.3715},
		{Name: "Conteneur Marais", Address: "Rue de Bretagne", District: "75003", Capacity: 25, CurrentCount: 8, Status: "operational", Latitude: 48.8625, Longitude: 2.3609},
	}

	for i := range containers {
		config.DB.Create(&containers[i])
	}

	listings := []models.Listing{
		{Title: "Table basse en bois massif", Description: "Belle table basse vintage en chêne massif, très bon état", Type: "don", CategoryID: categories[0].ID, Condition: "bon_etat", Location: "Paris 11e", Status: "active", UserID: users[1].ID},
		{Title: "Vélo de ville femme", Description: "Vélo hollandais 3 vitesses, panier avant inclus", Type: "vente", CategoryID: categories[0].ID, Condition: "bon_etat", Price: 85, Location: "Paris 12e", Status: "active", UserID: users[1].ID},
		{Title: "Lot de livres cuisine", Description: "15 livres de recettes en excellent état", Type: "don", CategoryID: categories[3].ID, Condition: "bon_etat", Location: "Paris 11e", Status: "pending", UserID: users[4].ID},
		{Title: "Smartphone Samsung Galaxy S21", Description: "Très bon état, avec chargeur et coque", Type: "vente", CategoryID: categories[1].ID, Condition: "bon_etat", Price: 220, Location: "Paris 3e", Status: "active", UserID: users[2].ID},
		{Title: "Perceuse Bosch professionnelle", Description: "Perceuse-visseuse avec mallette et accessoires", Type: "vente", CategoryID: categories[4].ID, Condition: "bon_etat", Price: 65, Location: "Paris 12e", Status: "active", UserID: users[6].ID},
		{Title: "Manteau hiver laine", Description: "Manteau long en laine, taille 40, couleur camel", Type: "don", CategoryID: categories[2].ID, Condition: "bon_etat", Location: "Paris 5e", Status: "active", UserID: users[5].ID},
		{Title: "Bureau en bois blanc", Description: "Bureau IKEA blanc 120cm, bon état", Type: "vente", CategoryID: categories[0].ID, Condition: "bon_etat", Price: 45, Location: "Paris 11e", Status: "pending", UserID: users[9].ID},
		{Title: "Chaussures de randonnée", Description: "Pointure 42, peu utilisées", Type: "don", CategoryID: categories[2].ID, Condition: "neuf", Location: "Paris 9e", Status: "rejected", RejectReason: "Images manquantes", UserID: users[1].ID},
		{Title: "Télévision 42 pouces", Description: "TV Samsung Full HD, télécommande incluse", Type: "vente", CategoryID: categories[1].ID, Condition: "use", Price: 80, Location: "Paris 14e", Status: "active", UserID: users[4].ID},
		{Title: "Tabouret bar x4", Description: "4 tabourets noirs en métal, hauteur réglable", Type: "vente", CategoryID: categories[0].ID, Condition: "bon_etat", Price: 120, Location: "Paris 11e", Status: "active", UserID: users[2].ID},
	}

	for i := range listings {
		config.DB.Create(&listings[i])
	}

	now := time.Now()
	workshops := []models.Workshop{
		{Title: "Atelier upcycling textile", Description: "Apprenez à transformer vos vieux vêtements en nouvelles créations", Date: now.AddDate(0, 0, 7), Duration: 180, Location: "Atelier Paris 11e", Price: 25, MaxSpots: 12, CategoryID: categories[2].ID, Status: "active", InstructorID: users[3].ID, Type: "atelier"},
		{Title: "Formation réparation électronique", Description: "Réparez vous-même vos appareils électroniques", Date: now.AddDate(0, 0, 14), Duration: 240, Location: "FabLab République", Price: 40, MaxSpots: 8, CategoryID: categories[1].ID, Status: "active", InstructorID: users[7].ID, Type: "formation", Enrolled: 3},
		{Title: "Conférence économie circulaire", Description: "Découvrez les enjeux de l'économie circulaire", Date: now.AddDate(0, 0, 3), Duration: 90, Location: "Centre culturel Bastille", Price: 0, MaxSpots: 50, CategoryID: categories[0].ID, Status: "active", InstructorID: users[3].ID, Type: "conference", Enrolled: 18},
		{Title: "Atelier meubles palettes", Description: "Créez vos propres meubles à partir de palettes", Date: now.AddDate(0, 0, 21), Duration: 360, Location: "Atelier Marais", Price: 35, MaxSpots: 10, CategoryID: categories[0].ID, Status: "pending", InstructorID: users[7].ID, Type: "atelier"},
		{Title: "Couture zéro déchet", Description: "Techniques de couture pour éviter le gaspillage textile", Date: now.AddDate(0, 1, 0), Duration: 120, Location: "Atelier Paris 3e", Price: 20, MaxSpots: 15, CategoryID: categories[2].ID, Status: "active", InstructorID: users[3].ID, Type: "atelier", Enrolled: 7},
	}

	for i := range workshops {
		config.DB.Create(&workshops[i])
	}

	notifs := []models.Notification{
		{UserID: users[1].ID, Message: "Bienvenue sur UpcycleConnect ! Commencez par créer votre première annonce.", Type: "info"},
		{UserID: users[1].ID, Message: "Votre annonce \"Table basse en bois massif\" a été validée !", Type: "success"},
		{UserID: users[4].ID, Message: "Votre annonce \"Lot de livres cuisine\" est en cours de modération.", Type: "info"},
	}

	for i := range notifs {
		config.DB.Create(&notifs[i])
	}

	scoreEntries := []models.ScoreEntry{
		{UserID: users[1].ID, Points: 10, Reason: "Première annonce créée", Action: "listing_created"},
		{UserID: users[1].ID, Points: 15, Reason: "Profil complété", Action: "profile_completed"},
		{UserID: users[4].ID, Points: 10, Reason: "Annonce créée", Action: "listing_created"},
	}

	for i := range scoreEntries {
		config.DB.Create(&scoreEntries[i])
	}

	log.Println("Seed data inserted successfully")
}

func cleanCorruptedTranslations() {
	var translations []models.Translation
	config.DB.Find(&translations)
	for _, t := range translations {
		if t.LangCode == "fr" || t.LangCode == "en" {
			continue
		}
		if strings.Contains(t.Data, "MYMEMORY WARNING") || strings.Contains(t.Data, "YOU USED ALL AVAILABLE") {
			log.Printf("Suppression traduction corrompue: %s", t.LangCode)
			config.DB.Unscoped().Where("lang_code = ?", t.LangCode).Delete(&models.Translation{})
			config.DB.Unscoped().Where("code = ?", t.LangCode).Delete(&models.Language{})
		}
	}
}

func seedTranslations() {
	type seedLang struct {
		code  string
		name  string
		label string
		flag  string
		data  []byte
	}
	seeds := []seedLang{
		{"fr", "Français", "FR", "🇫🇷", locales.FR},
		{"en", "English", "EN", "🇬🇧", locales.EN},
	}
	for _, s := range seeds {
		var lang models.Language
		if err := config.DB.Where("code = ?", s.code).First(&lang).Error; err != nil {
			config.DB.Create(&models.Language{Code: s.code, Name: s.name, Label: s.label, Flag: s.flag, Active: true})
		}
		var trad models.Translation
		if err := config.DB.Where("lang_code = ?", s.code).First(&trad).Error; err != nil {
			config.DB.Create(&models.Translation{LangCode: s.code, Data: string(s.data)})
		} else {
			config.DB.Model(&trad).Update("data", string(s.data))
		}
		log.Printf("Traduction %s synchronisée", s.code)
	}
}

func seedSubscriptionPlans() {
	var count int64
	config.DB.Model(&models.SubscriptionPlan{}).Count(&count)
	if count > 0 {
		return
	}
	plans := []models.SubscriptionPlan{
		{
			Name:             "Découverte",
			Slug:             "decouverte",
			Price:            0,
			MaxListingsBonus: 5,
			Features:         `["Annonces illimitées (10 total)","Vérification SIRET","Accès aux formations","Score upcycling","Messagerie"]`,
			IsActive:         true,
			SortOrder:        0,
			DurationDays:     30,
		},
		{
			Name:             "Pro",
			Slug:             "pro",
			Price:            29,
			MaxListingsBonus: 15,
			Features:         `["Tout Découverte (20 annonces total)","Tableau de bord avancé","Analyse CO₂ et impact","Alertes prioritaires de collecte","Projets upcycling"]`,
			IsActive:         true,
			SortOrder:        1,
			DurationDays:     30,
		},
		{
			Name:             "Entreprise",
			Slug:             "enterprise",
			Price:            99,
			MaxListingsBonus: 100,
			Features:         `["Annonces illimitées (105 total)","Tout Pro","Support prioritaire","Badge entreprise partenaire","Statistiques avancées"]`,
			IsActive:         true,
			SortOrder:        2,
			DurationDays:     30,
		},
	}
	for i := range plans {
		config.DB.Create(&plans[i])
	}
	log.Println("Subscription plans seeded")
}

func seedSlots() {
	var count int64
	config.DB.Model(&models.ContainerSlot{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("Seeding container slots...")

	var containers []models.Container
	config.DB.Find(&containers)

	sizes := []struct {
		size  string
		total int
	}{
		{"S", 6},
		{"M", 4},
		{"L", 2},
	}

	for _, container := range containers {
		for _, s := range sizes {
			for i := 1; i <= s.total; i++ {
				slotCode := fmt.Sprintf("%s-%02d", s.size, i)
				config.DB.Create(&models.ContainerSlot{
					ContainerID: container.ID,
					SlotCode:    slotCode,
					Size:        s.size,
					Status:      "free",
				})
			}
		}
	}

	log.Println("Container slots seeded successfully")
}
