package models

import (
	"time"

	"gorm.io/gorm"
)

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
	Email         string     `gorm:"uniqueIndex;not null;size:255" json:"email"`
	PasswordHash  string     `gorm:"not null" json:"-"`
	Firstname     string     `gorm:"not null" json:"firstname"`
	Lastname      string     `gorm:"not null" json:"lastname"`
	Role          UserRole   `gorm:"type:varchar(20);default:'particulier'" json:"role"`
	Phone         string     `json:"phone,omitempty"`
	Address       string     `json:"address,omitempty"`
	IsActive      bool       `gorm:"default:true" json:"is_active"`
	IsVerified    bool       `gorm:"default:false" json:"is_verified"`
	FirstLogin    bool       `gorm:"default:true" json:"first_login"`
	IsBanned      bool       `gorm:"default:false" json:"is_banned"`
	BanReason     string     `json:"ban_reason,omitempty"`
	BanExpiresAt  *time.Time `json:"ban_expires_at,omitempty"`
	Siret                string     `gorm:"size:14" json:"siret,omitempty"`
	SiretVerified        bool       `gorm:"default:false" json:"siret_verified"`
	EmailVerifyToken     string     `gorm:"size:64" json:"-"`
	PasswordResetToken   string     `gorm:"size:64" json:"-"`
	PasswordResetExpiry  *time.Time `json:"-"`
	NewsletterSubscribed bool       `gorm:"default:false" json:"newsletter_subscribed"`
	PhoneVerified        bool       `gorm:"default:false" json:"phone_verified"`
	TwoFAEnabled         bool       `gorm:"default:false" json:"two_fa_enabled"`
}

type PhoneVerification struct {
	Base
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Phone     string    `gorm:"not null;size:20" json:"phone"`
	CodeHash  string    `gorm:"not null" json:"-"`
	Purpose   string    `gorm:"type:varchar(20);not null" json:"purpose"`
	Attempts  int       `gorm:"default:0" json:"attempts"`
	Used      bool      `gorm:"default:false" json:"used"`
	ExpiresAt time.Time `json:"expires_at"`
}

type BanRecord struct {
	Base
	UserID      uint       `json:"user_id"`
	User        User       `json:"user,omitempty"`
	AdminID     uint       `json:"admin_id"`
	Admin       User       `gorm:"foreignKey:AdminID" json:"admin,omitempty"`
	Reason      string     `gorm:"type:text;not null" json:"reason"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	IsPermanent bool       `gorm:"default:false" json:"is_permanent"`
	IsActive    bool       `gorm:"default:true" json:"is_active"`
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
	Type         string   `gorm:"type:varchar(10);not null" json:"type"`
	CategoryID   uint     `json:"category_id"`
	Category     Category `json:"category,omitempty"`
	Condition    string   `gorm:"type:varchar(20)" json:"condition"`
	Price        float64  `json:"price,omitempty"`
	Location     string   `json:"location"`
	Images       string   `gorm:"type:text" json:"images"`
	Status       string   `gorm:"type:varchar(20);default:'pending'" json:"status"`
	UserID       uint     `json:"user_id"`
	User         User     `json:"user,omitempty"`
	RejectReason string   `json:"reject_reason,omitempty"`
}

type Workshop struct {
	Base
	Title        string    `gorm:"not null" json:"title"`
	Description  string    `gorm:"type:text" json:"description"`
	Date         time.Time `json:"date"`
	Duration     int       `json:"duration"`
	Location     string    `json:"location"`
	Price        float64   `json:"price"`
	MaxSpots     int       `gorm:"default:15" json:"max_spots"`
	MinSpots     int       `gorm:"default:10" json:"min_spots"`
	Enrolled     int       `gorm:"default:0" json:"enrolled"`
	Image        string    `json:"image,omitempty"`
	CategoryID   uint      `json:"category_id"`
	Category     Category  `json:"category,omitempty"`
	Status       string    `gorm:"type:varchar(20);default:'draft'" json:"status"`
	CancelReason string    `json:"cancel_reason,omitempty"`
	InstructorID uint      `json:"instructor_id"`
	Instructor   User      `json:"instructor,omitempty"`
	Type         string    `gorm:"type:varchar(20);default:'atelier'" json:"type"`
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
	Name         string  `gorm:"not null" json:"name"`
	Address      string  `json:"address"`
	District     string  `json:"district"`
	Capacity     int     `gorm:"default:25" json:"capacity"`
	CurrentCount int     `gorm:"default:0" json:"current_count"`
	Status       string  `gorm:"type:varchar(20);default:'operational'" json:"status"`
	Latitude     float64 `gorm:"default:0" json:"latitude"`
	Longitude    float64 `gorm:"default:0" json:"longitude"`
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
	Action string `json:"action"`
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

type Conversation struct {
	Base
	ParticipantOneID uint     `json:"participant_one_id"`
	ParticipantOne   User     `gorm:"foreignKey:ParticipantOneID" json:"participant_one,omitempty"`
	ParticipantTwoID uint     `json:"participant_two_id"`
	ParticipantTwo   User     `gorm:"foreignKey:ParticipantTwoID" json:"participant_two,omitempty"`
	ListingID        *uint    `json:"listing_id,omitempty"`
	Listing          *Listing `gorm:"foreignKey:ListingID" json:"listing,omitempty"`
	LastMessageAt    time.Time `json:"last_message_at"`
	LastMessage      string   `gorm:"type:text" json:"last_message,omitempty"`
}

type Message struct {
	Base
	ConversationID uint         `json:"conversation_id"`
	Conversation   Conversation `json:"conversation,omitempty"`
	SenderID       uint         `json:"sender_id"`
	Sender         User         `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Content        string       `gorm:"type:text;not null" json:"content"`
	Read           bool         `gorm:"default:false" json:"read"`
}

type Report struct {
	Base
	ListingID  uint    `json:"listing_id"`
	Listing    Listing `gorm:"foreignKey:ListingID" json:"listing,omitempty"`
	UserID     uint    `json:"user_id"`
	User       User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Reason     string  `gorm:"type:varchar(50);not null" json:"reason"`
	Details    string  `gorm:"type:text" json:"details,omitempty"`
	Status     string  `gorm:"type:varchar(20);default:'pending'" json:"status"`
	AdminNote  string  `gorm:"type:text" json:"admin_note,omitempty"`
	ResolvedBy *uint   `json:"resolved_by,omitempty"`
}

type Review struct {
	Base
	ReviewerID   uint     `json:"reviewer_id"`
	Reviewer     User     `gorm:"foreignKey:ReviewerID" json:"reviewer,omitempty"`
	TargetUserID uint     `json:"target_user_id"`
	ListingID    uint     `json:"listing_id"`
	Listing      *Listing `gorm:"foreignKey:ListingID" json:"listing,omitempty"`
	Rating       int      `gorm:"not null" json:"rating"` // 1-5
	Comment      string   `gorm:"type:text" json:"comment"`
}
