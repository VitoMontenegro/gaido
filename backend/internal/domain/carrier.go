package domain

import "time"

type CarrierProfile struct {
	ProviderID       int64     `json:"provider_id"`
	CarrierType      string    `json:"carrier_type"`
	Citizenship      string    `json:"citizenship"`
	BaseCityID       *int64    `json:"base_city_id,omitempty"`
	BaseCityName     string    `json:"base_city_name,omitempty"`
	BaseCitySlug     string    `json:"base_city_slug,omitempty"`
	About            string    `json:"about,omitempty"`
	ExperienceYears  int       `json:"experience_years"`
	TripsCount       int       `json:"trips_count"`
	TrustLevel       string    `json:"trust_level"`
	IdentityStatus   string    `json:"identity_status"`
	UkrainianStatus  string    `json:"ukrainian_status"`
	BusinessStatus   string    `json:"business_status"`
	DocumentsStatus  string    `json:"documents_status"`
	HoursText        string    `json:"hours_text,omitempty"`
	ContactPerson    string    `json:"contact_person,omitempty"`
	Status           string    `json:"status"`
	CreatedAt        time.Time `json:"created_at,omitempty"`
	UpdatedAt        time.Time `json:"updated_at,omitempty"`
	// joined provider fields
	DisplayName      string  `json:"display_name,omitempty"`
	BusinessName     string  `json:"business_name,omitempty"`
	WebsiteSlug      string  `json:"website_slug,omitempty"`
	AvatarURL        string  `json:"avatar_url,omitempty"`
	RatingAvg        float64 `json:"rating_avg,omitempty"`
	RatingCount      int     `json:"rating_count,omitempty"`
	Phone            string  `json:"phone,omitempty"`
	Email            string  `json:"email,omitempty"`
	Telegram         string  `json:"telegram,omitempty"`
	Whatsapp         string  `json:"whatsapp,omitempty"`
	Viber            string  `json:"viber,omitempty"`
	ContactsUnlocked bool    `json:"contacts_unlocked,omitempty"`
	SubscriptionActive bool  `json:"subscription_active,omitempty"`
	Vehicles         []CarrierVehicle   `json:"vehicles,omitempty"`
	Rides            []TransportListing `json:"rides,omitempty"`
	Reviews          []PlatformReview   `json:"reviews,omitempty"`
}

type CarrierVehicle struct {
	ID                 int64    `json:"id"`
	ProviderID         int64    `json:"provider_id,omitempty"`
	Brand              string   `json:"brand"`
	Model              string   `json:"model"`
	Year               *int     `json:"year,omitempty"`
	VehicleType        string   `json:"vehicle_type"`
	Seats              int      `json:"seats"`
	PhotoURL           string   `json:"photo_url,omitempty"`
	Description        string   `json:"description,omitempty"`
	VerificationStatus string   `json:"verification_status"`
	IsPrimary          bool     `json:"is_primary"`
	Photos             []CarrierVehiclePhoto `json:"photos,omitempty"`
}

type CarrierVehiclePhoto struct {
	ID         int64  `json:"id"`
	VehicleID  int64  `json:"vehicle_id,omitempty"`
	StorageKey string `json:"storage_key"`
	SortOrder  int    `json:"sort_order"`
	IsPrimary  bool   `json:"is_primary"`
}

type PlatformReview struct {
	ID        int64     `json:"id"`
	AuthorID  int64     `json:"author_id,omitempty"`
	Rating    int       `json:"rating"`
	Body      string    `json:"body"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at,omitempty"`
	AuthorName string   `json:"author_name,omitempty"`
}
