package domain

import (
	"strings"
	"time"
)

type User struct {
	ID           int64
	Email        string
	Login        string
	FirstName    string
	LastName     string
	PasswordHash string
	Roles        []string
	Status       string
	CreatedAt    time.Time
	DeletedAt    *time.Time
}

type GuideProfile struct {
	ID                     int64      `json:"id"`
	UserID                 int64      `json:"user_id"`
	GuideType              string     `json:"guide_type"`
	FirstName              string     `json:"first_name,omitempty"`
	LastName               string     `json:"last_name,omitempty"`
	DisplayName            string     `json:"display_name"`
	About                  string     `json:"about"`
	AvatarURL              string     `json:"avatar_url,omitempty"`
	WebsiteSlug            string     `json:"website_slug,omitempty"`
	RatingAvg              float64    `json:"rating_avg"`
	RatingCount            int         `json:"rating_count"`
	PreferredContactMethod string     `json:"preferred_contact_method,omitempty"`
	Phone                  string     `json:"phone"`
	Email                  string     `json:"email"`
	Telegram               string     `json:"telegram"`
	Whatsapp               string     `json:"whatsapp"`
	Viber                  string     `json:"viber"`
	ResponseHours          string     `json:"response_hours"`
	Status                 string     `json:"status"`
	CountryID              *int64     `json:"country_id,omitempty"`
	LastShownAt            *time.Time `json:"last_shown_at,omitempty"`
	CreatedAt              time.Time  `json:"created_at,omitempty"`
}

type GuideCityBrief struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	CountrySlug string `json:"country_slug"`
	IsPrimary   bool   `json:"is_primary"`
}

type GuideCountryBrief struct {
	ID        int64  `json:"id"`
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	IsPrimary bool   `json:"is_primary"`
}

type GuideAccountProfile struct {
	GuideProfile
	TypeBadge     *string             `json:"type_badge,omitempty"`
	HasLicense    bool                `json:"has_license"`
	CatalogStatus string              `json:"catalog_status"`
	CountrySlug   string              `json:"country_slug,omitempty"`
	CountryName   string              `json:"country_name,omitempty"`
	Countries     []GuideCountryBrief `json:"countries,omitempty"`
	Cities        []GuideCityBrief    `json:"cities,omitempty"`
}

type GuideDocumentModerationItem struct {
	ID          int64  `json:"id"`
	GuideID     int64  `json:"guide_id"`
	GuideName   string `json:"guide_name"`
	GuideStatus string `json:"guide_status"`
	GuideType   string `json:"guide_type"`
	Type        string `json:"type"`
	MimeType    string `json:"mime_type"`
	Size        int64  `json:"size"`
	UploadedAt  string `json:"uploaded_at"`
}

type GuideDocument struct {
	ID         int64  `json:"id"`
	GuideID    int64  `json:"guide_id"`
	Type       string `json:"type"`
	StorageKey string `json:"storage_key,omitempty"`
	MimeType   string `json:"mime_type"`
	Size       int64  `json:"size"`
	Checksum   string `json:"checksum,omitempty"`
}

type SubscriptionPlan struct {
	ID           int64   `json:"id"`
	Code         string  `json:"code"`
	Name         string  `json:"name"`
	Description  string  `json:"description"`
	Price        float64 `json:"price"`
	Currency     string  `json:"currency"`
	DurationDays int     `json:"duration_days"`
	IsActive     bool    `json:"is_active"`
	PlanType     string  `json:"plan_type"`
}

type GuideSubscription struct {
	ID               int64      `json:"id"`
	GuideID          int64      `json:"guide_id"`
	PlanID           int64      `json:"plan_id"`
	Status           string     `json:"status"`
	StartsAt         *time.Time `json:"starts_at,omitempty"`
	ExpiresAt        *time.Time `json:"expires_at,omitempty"`
	PaidAt           *time.Time `json:"paid_at,omitempty"`
	PaymentID        *int64     `json:"payment_id,omitempty"`
	ActivationSource string     `json:"activation_source,omitempty"`
}

type Payment struct {
	ID                int64          `json:"id"`
	PayerID           int64          `json:"payer_id"`
	PayerType         string         `json:"payer_type"`
	Purpose           string         `json:"purpose"`
	Amount            float64        `json:"amount"`
	Currency          string         `json:"currency"`
	Status            string         `json:"status"`
	ProviderPaymentID *string        `json:"provider_payment_id,omitempty"`
	Metadata          map[string]any `json:"metadata,omitempty"`
}

type FeaturedPlacement struct {
	ID          int64      `json:"id"`
	GuideID     int64      `json:"guide_id"`
	ExcursionID *int64     `json:"excursion_id,omitempty"`
	SlotType    string     `json:"slot_type"`
	PlanID      *int64     `json:"plan_id,omitempty"`
	Status      string     `json:"status"`
	StartsAt    time.Time  `json:"starts_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
	PaidAt      *time.Time `json:"paid_at,omitempty"`
	PaymentID   *int64     `json:"payment_id,omitempty"`
}

type FeaturedExcursionPlacement struct {
	FeaturedPlacement
	ExcursionTitle string `json:"excursion_title,omitempty"`
	ExcursionSlug  string `json:"excursion_slug,omitempty"`
}

type BillingStatusDTO struct {
	PaymentsEnabled    bool                          `json:"payments_enabled"`
	Subscription       *GuideSubscription            `json:"subscription,omitempty"`
	FeaturedGuide      *FeaturedPlacement            `json:"featured_guide,omitempty"`
	FeaturedExcursions []FeaturedExcursionPlacement  `json:"featured_excursions"`
}

type ExcursionVideoContent struct {
	URL            string `json:"url,omitempty"`
	PreviewDesktop string `json:"preview_desktop,omitempty"`
	PreviewMobile  string `json:"preview_mobile,omitempty"`
}

type ExcursionComfortItem struct {
	Title string `json:"title"`
	Text  string `json:"text"`
}

type ExcursionStructuredContent struct {
	Gallery            []string                `json:"gallery,omitempty"`
	GalleryMobileCover string                  `json:"gallery_mobile_cover,omitempty"`
	RouteStops         []string                `json:"route_stops,omitempty"`
	RouteDisclaimer    string                  `json:"route_disclaimer,omitempty"`
	PhotoLocations     []string                `json:"photo_locations,omitempty"`
	Video              *ExcursionVideoContent  `json:"video,omitempty"`
	ComfortItems       []ExcursionComfortItem  `json:"comfort_items,omitempty"`
}

type Excursion struct {
	ID                    int64   `json:"id"`
	GuideID               int64   `json:"guide_id"`
	CityID                int64   `json:"city_id"`
	CategoryID            *int64  `json:"category_id,omitempty"`
	Title                 string  `json:"title"`
	Slug                  string  `json:"slug"`
	Description           string  `json:"description"`
	Type                  string  `json:"type"`
	MaxGuests             int     `json:"max_guests"`
	PriceFrom             float64 `json:"price_from"`
	Currency              string  `json:"currency"`
	Status                string  `json:"status"`
	DurationMinutes       int     `json:"duration_minutes"`
	TransportMode         string  `json:"transport_mode"`
	ChildrenAllowed       bool    `json:"children_allowed"`
	Language              string  `json:"language"`
	OrganizationalDetails string   `json:"organizational_details"`
	MeetingPoint          string   `json:"meeting_point"`
	CoverImageURL         string   `json:"cover_image_url"`
	BodyHTML              string   `json:"body_html"`
	MapEmbedURL           string   `json:"map_embed_url"`
	IncludedItems         []string                   `json:"included_items"`
	ExcludedItems         []string                   `json:"excluded_items"`
	StructuredContent     ExcursionStructuredContent `json:"structured_content"`
}

type ExcursionView struct {
	Excursion
	CityName         string      `json:"city_name,omitempty"`
	CitySlug         string      `json:"city_slug,omitempty"`
	CountryName      string      `json:"country_name,omitempty"`
	CountrySlug      string      `json:"country_slug,omitempty"`
	GuideName        string      `json:"guide_name,omitempty"`
	GuideSlug        string      `json:"guide_slug,omitempty"`
	GuideAvatarURL   string      `json:"guide_avatar_url,omitempty"`
	GuideAbout       string      `json:"guide_about,omitempty"`
	GuideContacts    ContactsDTO `json:"guide_contacts,omitempty"`
	GuideRatingAvg   float64     `json:"guide_rating_avg,omitempty"`
	GuideRatingCount int         `json:"guide_rating_count,omitempty"`
	RatingAvg        float64     `json:"rating_avg,omitempty"`
	RatingCount      int         `json:"rating_count,omitempty"`
}

type Review struct {
	ID             int64           `json:"id"`
	GuideID        int64           `json:"guide_id"`
	AuthorID       int64           `json:"author_id"`
	AuthorName     string          `json:"author_name,omitempty"`
	ExcursionID    int64           `json:"excursion_id"`
	ExcursionTitle string          `json:"excursion_title,omitempty"`
	Rating         int             `json:"rating"`
	Text           string          `json:"text"`
	Status         string          `json:"status"`
	CreatedAt      string          `json:"created_at,omitempty"`
	Photos         []string        `json:"photos,omitempty"`
	Dispute        *ReviewDispute  `json:"dispute,omitempty"`
	Comments       []ReviewComment `json:"comments,omitempty"`
}

type ReviewDispute struct {
	ID        int64  `json:"id"`
	Text      string `json:"text"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at,omitempty"`
}

type ReviewPhotoItem struct {
	PublicKey string `json:"public_key"`
	ReviewID  int64  `json:"review_id"`
}

type ReviewComment struct {
	ID         int64  `json:"id"`
	ReviewID   int64  `json:"review_id"`
	AuthorID   int64  `json:"author_id"`
	AuthorName string `json:"author_name,omitempty"`
	IsGuide    bool   `json:"is_guide"`
	Text       string `json:"text"`
}

type ContactsDTO struct {
	Visible                bool   `json:"visible"`
	Phone                  string `json:"phone,omitempty"`
	Email                  string `json:"email,omitempty"`
	Telegram               string `json:"telegram,omitempty"`
	Whatsapp               string `json:"whatsapp,omitempty"`
	Viber                  string `json:"viber,omitempty"`
	ResponseHours          string `json:"response_hours,omitempty"`
	PreferredContactMethod string `json:"preferred_contact_method,omitempty"`
}

type PublicGuideDTO struct {
	ID          int64       `json:"id"`
	Slug        string      `json:"slug"`
	DisplayName string      `json:"display_name"`
	GuideType   string      `json:"guide_type"`
	TypeBadge   *string     `json:"type_badge,omitempty"`
	About       string      `json:"about"`
	AvatarURL   string      `json:"avatar_url,omitempty"`
	RatingAvg   float64     `json:"rating_avg"`
	RatingCount int         `json:"rating_count"`
	Status      string      `json:"status"`
	Contacts    ContactsDTO `json:"contacts"`
	IsPromoted  bool        `json:"is_promoted,omitempty"`
}

func UserDisplayName(firstName, lastName, login string) string {
	name := strings.TrimSpace(firstName + " " + lastName)
	if name != "" {
		return name
	}
	return login
}
