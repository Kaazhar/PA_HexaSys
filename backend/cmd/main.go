package main

import (
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"upcycleconnect/backend/config"
	"upcycleconnect/backend/internal/handlers"
	"upcycleconnect/backend/internal/middleware"
	"upcycleconnect/backend/internal/models"
)

func main() {
	config.LoadEnv()
	config.ConnectDB()

	// Auto migrate
	if err := config.DB.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Listing{},
		&models.Workshop{},
		&models.WorkshopBooking{},
		&models.Container{},
		&models.ContainerRequest{},
		&models.UpcyclingScore{},
		&models.ScoreEntry{},
		&models.Subscription{},
		&models.Invoice{},
		&models.Notification{},
		&models.Article{},
		&models.Project{},
	); err != nil {
		log.Fatal("Migration failed:", err)
	}

	// Seed initial data
	seedData()

	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/api")

	// Auth routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.GET("/me", middleware.AuthRequired(), handlers.Me)
	}

	// Categories
	api.GET("/categories", handlers.GetCategories)
	api.POST("/categories", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.CreateCategory)
	api.PUT("/categories/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.UpdateCategory)
	api.DELETE("/categories/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.DeleteCategory)

	// Listings (public)
	api.GET("/listings", handlers.GetListings)
	api.GET("/listings/:id", handlers.GetListing)
	api.POST("/listings", middleware.AuthRequired(), middleware.RequireRole(models.RoleParticulier, models.RoleProfessionnel, models.RoleAdmin), handlers.CreateListing)
	api.PUT("/listings/:id/validate", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ValidateListing)
	api.PUT("/listings/:id/reject", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.RejectListing)

	// Workshops
	api.GET("/workshops", handlers.GetWorkshops)
	api.GET("/workshops/:id", handlers.GetWorkshop)
	api.POST("/workshops", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.CreateWorkshop)
	api.PUT("/workshops/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.UpdateWorkshop)
	api.PUT("/workshops/:id/validate", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ValidateWorkshop)
	api.POST("/workshops/:id/book", middleware.AuthRequired(), handlers.BookWorkshop)

	// Containers
	api.GET("/containers", middleware.AuthRequired(), handlers.GetContainers)
	api.POST("/containers", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.CreateContainer)
	api.PUT("/containers/:id", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.UpdateContainer)
	api.GET("/containers/requests", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.GetContainerRequests)
	api.POST("/containers/requests", middleware.AuthRequired(), handlers.CreateContainerRequestHandler)
	api.PUT("/containers/requests/:id/validate", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.ValidateContainerRequest)
	api.PUT("/containers/requests/:id/reject", middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin), handlers.RejectContainerRequest)

	// Score & notifications
	api.GET("/score/me", middleware.AuthRequired(), handlers.GetMyScore)
	api.GET("/notifications", middleware.AuthRequired(), handlers.GetNotifications)
	api.PUT("/notifications/:id/read", middleware.AuthRequired(), handlers.MarkNotificationRead)

	// Admin routes
	adminGroup := api.Group("/admin")
	adminGroup.Use(middleware.AuthRequired(), middleware.RequireRole(models.RoleAdmin))
	{
		adminGroup.GET("/users", handlers.GetUsers)
		adminGroup.POST("/users", handlers.CreateUser)
		adminGroup.PUT("/users/:id", handlers.UpdateUser)
		adminGroup.DELETE("/users/:id", handlers.DeleteUser)
		adminGroup.GET("/stats", handlers.GetAdminStats)
		adminGroup.GET("/finance", handlers.GetFinanceStats)
		adminGroup.GET("/invoices", handlers.GetInvoices)
		adminGroup.GET("/listings", handlers.GetAdminListings)
		adminGroup.GET("/workshops", handlers.GetAdminWorkshops)
	}

	// Role dashboards
	api.GET("/particulier/dashboard", middleware.AuthRequired(), middleware.RequireRole(models.RoleParticulier, models.RoleAdmin), handlers.GetParticularDashboard)
	api.GET("/pro/dashboard", middleware.AuthRequired(), middleware.RequireRole(models.RoleProfessionnel, models.RoleAdmin), handlers.GetProDashboard)
	api.GET("/salarie/dashboard", middleware.AuthRequired(), middleware.RequireRole(models.RoleSalarie, models.RoleAdmin), handlers.GetSalarieDashboard)

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

	// Seed users
	users := []models.User{
		{Email: "admin@upcycleconnect.fr", PasswordHash: hashPassword("admin123"), Firstname: "Admin", Lastname: "System", Role: models.RoleAdmin, IsActive: true, IsVerified: true, FirstLogin: false},
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

	// Categories
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

	// Containers
	containers := []models.Container{
		{Name: "Conteneur République", Address: "Place de la République", District: "75011", Capacity: 30, CurrentCount: 12, Status: "operational"},
		{Name: "Conteneur Bastille", Address: "Place de la Bastille", District: "75012", Capacity: 25, CurrentCount: 20, Status: "operational"},
		{Name: "Conteneur Nation", Address: "Place de la Nation", District: "75011", Capacity: 20, CurrentCount: 5, Status: "operational"},
		{Name: "Conteneur Oberkampf", Address: "Rue Oberkampf", District: "75011", Capacity: 15, CurrentCount: 15, Status: "full"},
		{Name: "Conteneur Marais", Address: "Rue de Bretagne", District: "75003", Capacity: 25, CurrentCount: 8, Status: "operational"},
	}

	for i := range containers {
		config.DB.Create(&containers[i])
	}

	// Listings
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

	// Workshops
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

	// Notifications
	notifs := []models.Notification{
		{UserID: users[1].ID, Message: "Bienvenue sur UpcycleConnect ! Commencez par créer votre première annonce.", Type: "info"},
		{UserID: users[1].ID, Message: "Votre annonce \"Table basse en bois massif\" a été validée !", Type: "success"},
		{UserID: users[4].ID, Message: "Votre annonce \"Lot de livres cuisine\" est en cours de modération.", Type: "info"},
	}

	for i := range notifs {
		config.DB.Create(&notifs[i])
	}

	// Score entries
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
