package domain

import "time"

type TransportListing struct {
	ID               int64      `json:"id"`
	ProviderID       int64      `json:"provider_id"`
	Kind             string     `json:"kind"`
	CompanyName      string     `json:"company_name"`
	DriverNames      string     `json:"driver_names"`
	VehicleBrand     string     `json:"vehicle_brand"`
	VehiclePhotoURL  string     `json:"vehicle_photo_url,omitempty"`
	Phone            string     `json:"phone,omitempty"`
	Email            string     `json:"email,omitempty"`
	Telegram         string     `json:"telegram,omitempty"`
	Whatsapp         string     `json:"whatsapp,omitempty"`
	Viber            string     `json:"viber,omitempty"`
	PriceAmount      float64    `json:"price_amount"`
	PriceCurrency    string     `json:"price_currency"`
	SeatsTotal       int        `json:"seats_total"`
	ParcelsAccepted  bool       `json:"parcels_accepted"`
	ParcelsTerms     string     `json:"parcels_terms,omitempty"`
	DepartTime       string     `json:"depart_time"`
	ArriveTimeApprox string     `json:"arrive_time_approx,omitempty"`
	Status           string     `json:"status"`
	CreatedAt        time.Time  `json:"created_at,omitempty"`
	UpdatedAt        time.Time  `json:"updated_at,omitempty"`
	Stops            []TransportStop      `json:"stops,omitempty"`
	Departures       []TransportDeparture `json:"departures,omitempty"`
	ProviderName     string     `json:"provider_name,omitempty"`
	ProviderSlug     string     `json:"provider_slug,omitempty"`
	ContactsUnlocked bool       `json:"contacts_unlocked,omitempty"`
	CarrierType      string     `json:"carrier_type,omitempty"`
	VerifiedUkrainian bool      `json:"verified_ukrainian,omitempty"`
	SubscriptionActive bool     `json:"subscription_active,omitempty"`
	Description        string     `json:"description,omitempty"`
	BookingsCount      int        `json:"bookings_count,omitempty"`
	SeatsAvailable     *int       `json:"seats_available,omitempty"`
}

type TransportStop struct {
	ID         int64  `json:"id,omitempty"`
	ListingID  int64  `json:"listing_id,omitempty"`
	CityID     int64  `json:"city_id"`
	CityName   string `json:"city_name,omitempty"`
	CitySlug   string `json:"city_slug,omitempty"`
	CountryName string `json:"country_name,omitempty"`
	SortOrder  int    `json:"sort_order"`
}

type TransportDeparture struct {
	ID        int64  `json:"id,omitempty"`
	ListingID int64  `json:"listing_id,omitempty"`
	DepartOn  string `json:"depart_on"`
	ArriveOn  string `json:"arrive_on,omitempty"`
	SeatsLeft *int   `json:"seats_left,omitempty"`
}
