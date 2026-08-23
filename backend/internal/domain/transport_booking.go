package domain

import "time"

type TransportBooking struct {
	ID              int64     `json:"id"`
	ListingID       int64     `json:"listing_id"`
	DepartureID     *int64    `json:"departure_id,omitempty"`
	UserID          int64     `json:"user_id,omitempty"`
	ProviderID      int64     `json:"provider_id,omitempty"`
	Seats           int       `json:"seats"`
	PassengerName   string    `json:"passenger_name"`
	PassengerPhone  string    `json:"passenger_phone"`
	PassengerEmail  string    `json:"passenger_email,omitempty"`
	Comment         string    `json:"comment,omitempty"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at,omitempty"`
	UpdatedAt       time.Time `json:"updated_at,omitempty"`
	DepartOn        string    `json:"depart_on,omitempty"`
	ListingTitle    string    `json:"listing_title,omitempty"`
	RouteLabel      string    `json:"route_label,omitempty"`
	PriceAmount     float64   `json:"price_amount,omitempty"`
	PriceCurrency   string    `json:"price_currency,omitempty"`
	ProviderName    string    `json:"provider_name,omitempty"`
	ProviderSlug    string    `json:"provider_slug,omitempty"`
}
