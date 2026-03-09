package models

import (
	"time"

	"gorm.io/gorm"
)

// Base remplace gorm.Model pour forcer les json tags en minuscule.
// Sans ça, GORM sérialise "ID", "CreatedAt", "UpdatedAt" avec majuscules
// et le frontend qui attend "id", "created_at", "updated_at" reçoit undefined.
type Base struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type UserRole string

const (
	RoleParticulier   UserRole = "particulier"
	RoleProfessionnel UserRole = "professionnel"
	RoleSalarie       UserRole = "salarie"
	RoleAdmin         UserRole = "admin"
)

type User struct {
	Base
	Email        string   `gorm:"uniqueIndex;not null;size:255" json:"email"`
	PasswordHash string   `gorm:"not null" json:"-"`
	Firstname    string   `gorm:"not null" json:"firstname"`
	Lastname     string   `gorm:"not null" json:"lastname"`
	Role         UserRole `gorm:"type:varchar(20);default:'particulier'" json:"role"`
	Phone        string   `json:"phone,omitempty"`
	Address      string   `json:"address,omitempty"`
	IsActive     bool     `gorm:"default:true" json:"is_active"`
	IsVerified   bool     `gorm:"default:false" json:"is_verified"`
	FirstLogin   bool     `gorm:"default:true" json:"first_login"`
}

type Category struct {
	Base
	Name        string `gorm:"not null" json:"name"`
	Slug        string `gorm:"uniqueIndex;not null;size:255" json:"slug"`
	Description string `json:"description,omitempty"`
	Icon        string `json:"icon,omitempty"`
	Color       string `json:"color,omitempty"`
	IsActive    bool   `gorm:"default:true" json:"is_active"`
}

type Listing struct {
	Base
	Title        string   `gorm:"not null" json:"title"`
	Description  string   `gorm:"type:text" json:"description"`
	Type         string   `gorm:"type:varchar(10);not null" json:"type"` // don | vente
	CategoryID   uint     `json:"category_id"`
	Category     Category `json:"category,omitempty"`
	Condition    string   `gorm:"type:varchar(20)" json:"condition"` // neuf | bon_etat | use | pieces
	Price        float64  `json:"price,omitempty"`
	Location     string   `json:"location"`
	Images       string   `gorm:"type:text" json:"images"` // JSON array of URLs
	Status       string   `gorm:"type:varchar(20);default:'pending'" json:"status"` // pending | active | rejected | sold
	UserID       uint     `json:"user_id"`
	User         User     `json:"user,omitempty"`
	RejectReason string   `json:"reject_reason,omitempty"`
}

type Workshop struct {
	Base
	Title        string    `gorm:"not null" json:"title"`
	Description  string    `gorm:"type:text" json:"description"`
	Date         time.Time `json:"date"`
	Duration     int       `json:"duration"` // minutes
	Location     string    `json:"location"`
	Price        float64   `json:"price"`
	MaxSpots     int       `gorm:"default:15" json:"max_spots"`
	Enrolled     int       `gorm:"default:0" json:"enrolled"`
	Image        string    `json:"image,omitempty"`
	CategoryID   uint      `json:"category_id"`
	Category     Category  `json:"category,omitempty"`
	Status       string    `gorm:"type:varchar(20);default:'draft'" json:"status"` // draft | pending | active | cancelled
	InstructorID uint      `json:"instructor_id"`
	Instructor   User      `json:"instructor,omitempty"`
	Type         string    `gorm:"type:varchar(20);default:'atelier'" json:"type"` // atelier | formation | conference
}

type WorkshopBooking struct {
	Base
	WorkshopID uint     `json:"workshop_id"`
	Workshop   Workshop `json:"workshop,omitempty"`
	UserID     uint     `json:"user_id"`
	User       User     `json:"user,omitempty"`
	PaymentID  string   `json:"payment_id,omitempty"`
	Status     string   `gorm:"type:varchar(20);default:'confirmed'" json:"status"`
}

type Container struct {
	Base
	Name         string `gorm:"not null" json:"name"`
	Address      string `json:"address"`
	District     string `json:"district"`
	Capacity     int    `gorm:"default:25" json:"capacity"`
	CurrentCount int    `gorm:"default:0" json:"current_count"`
	Status       string `gorm:"type:varchar(20);default:'operational'" json:"status"`
}

type ContainerRequest struct {
	Base
	UserID            uint      `json:"user_id"`
	User              User      `json:"user,omitempty"`
	ContainerID       uint      `json:"container_id"`
	Container         Container `json:"container,omitempty"`
	ObjectTitle       string    `json:"object_title"`
	ObjectDescription string    `gorm:"type:text" json:"object_description"`
	DesiredDate       time.Time `json:"desired_date"`
	Status            string    `gorm:"type:varchar(20);default:'pending'" json:"status"`
	AccessCode        string    `json:"access_code,omitempty"`
	Barcode           string    `json:"barcode,omitempty"`
	RejectReason      string    `json:"reject_reason,omitempty"`
}

type UpcyclingScore struct {
	Base
	UserID           uint    `gorm:"uniqueIndex" json:"user_id"`
	TotalPoints      int     `gorm:"default:0" json:"total_points"`
	Level            string  `gorm:"type:varchar(30);default:'Débutant'" json:"level"`
	WasteAvoidedKg   float64 `gorm:"default:0" json:"waste_avoided_kg"`
	Co2SavedKg       float64 `gorm:"default:0" json:"co2_saved_kg"`
	WaterSavedLiters float64 `gorm:"default:0" json:"water_saved_liters"`
}

type ScoreEntry struct {
	Base
	UserID uint   `json:"user_id"`
	Points int    `json:"points"`
	Reason string `json:"reason"`
	Action string `json:"action"` // listing_created, workshop_attended, etc.
}

type Subscription struct {
	Base
	UserID      uint      `json:"user_id"`
	User        User      `json:"user,omitempty"`
	Plan        string    `gorm:"type:varchar(20);default:'decouverte'" json:"plan"`
	Price       float64   `json:"price"`
	Status      string    `gorm:"type:varchar(20);default:'active'" json:"status"`
	RenewalDate time.Time `json:"renewal_date"`
	StripeID    string    `json:"stripe_id,omitempty"`
}

type Invoice struct {
	Base
	Number string  `gorm:"uniqueIndex;size:255" json:"number"`
	UserID uint    `json:"user_id"`
	User   User    `json:"user,omitempty"`
	Type   string  `gorm:"type:varchar(20)" json:"type"`
	Amount float64 `json:"amount"`
	Tax    float64 `json:"tax"`
	Total  float64 `json:"total"`
	Status string  `gorm:"type:varchar(20);default:'pending'" json:"status"`
	PDFURL string  `json:"pdf_url,omitempty"`
}

type Notification struct {
	Base
	UserID  uint   `json:"user_id"`
	Message string `json:"message"`
	Type    string `gorm:"type:varchar(20);default:'info'" json:"type"`
	Read    bool   `gorm:"default:false" json:"read"`
}

type Article struct {
	Base
	Title    string `gorm:"not null" json:"title"`
	Content  string `gorm:"type:longtext" json:"content"`
	AuthorID uint   `json:"author_id"`
	Author   User   `json:"author,omitempty"`
	Status   string `gorm:"type:varchar(20);default:'draft'" json:"status"`
	Views    int    `gorm:"default:0" json:"views"`
	Tags     string `json:"tags,omitempty"`
}

type Project struct {
	Base
	Title        string `gorm:"not null" json:"title"`
	Description  string `gorm:"type:text" json:"description"`
	BeforeImages string `gorm:"type:text" json:"before_images"`
	AfterImages  string `gorm:"type:text" json:"after_images"`
	Tags         string `json:"tags,omitempty"`
	UserID       uint   `json:"user_id"`
	User         User   `json:"user,omitempty"`
	Views        int    `gorm:"default:0" json:"views"`
	Likes        int    `gorm:"default:0" json:"likes"`
	IsFeatured   bool   `gorm:"default:false" json:"is_featured"`
}
