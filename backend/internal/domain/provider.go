package domain

import "time"

type Provider struct {
	ID             int64     `json:"id"`
	UserID         int64     `json:"user_id"`
	DisplayName    string    `json:"display_name"`
	BusinessName   string    `json:"business_name"`
	Profession     string    `json:"profession"`
	About          string    `json:"about"`
	WebsiteSlug    string    `json:"website_slug"`
	AvatarURL      string    `json:"avatar_url,omitempty"`
	RatingAvg      float64   `json:"rating_avg"`
	RatingCount    int       `json:"rating_count"`
	ResponseHours  string    `json:"response_hours"`
	Status         string    `json:"status"`
	Phone          string    `json:"phone,omitempty"`
	Email          string    `json:"email,omitempty"`
	Telegram       string    `json:"telegram,omitempty"`
	Whatsapp       string    `json:"whatsapp,omitempty"`
	Viber          string    `json:"viber,omitempty"`
	Instagram      string    `json:"instagram,omitempty"`
	Facebook       string    `json:"facebook,omitempty"`
	Website        string    `json:"website,omitempty"`
	PrimaryCityID  *int64    `json:"primary_city_id,omitempty"`
	Languages      []string  `json:"languages"`
	CreatedAt      time.Time `json:"created_at,omitempty"`
	UpdatedAt      time.Time `json:"updated_at,omitempty"`
}

type ServiceCategory struct {
	ID        int64  `json:"id"`
	Slug      string `json:"slug"`
	Name      string `json:"name"`
	Icon      string `json:"icon,omitempty"`
	SortOrder int    `json:"sort_order"`
}

type Service struct {
	ID         int64  `json:"id"`
	CategoryID int64  `json:"category_id"`
	Slug       string `json:"slug"`
	Name       string `json:"name"`
	SortOrder  int    `json:"sort_order"`
}

type ServiceOffering struct {
	ID              int64      `json:"id"`
	ProviderID      int64      `json:"provider_id"`
	ServiceID       *int64     `json:"service_id,omitempty"`
	CategoryID      int64      `json:"category_id"`
	Title           string     `json:"title"`
	Slug            string     `json:"slug"`
	Description     string     `json:"description"`
	Formats         []string   `json:"formats"`
	Languages       []string   `json:"languages"`
	Status          string     `json:"status"`
	HasAvailability bool       `json:"has_availability"`
	EventAt         *time.Time `json:"event_at,omitempty"`
	RatingAvg       float64    `json:"rating_avg"`
	RatingCount     int        `json:"rating_count"`
}

type ServicePoint struct {
	ID                int64   `json:"id"`
	ProviderID        int64   `json:"provider_id"`
	Label             string  `json:"label"`
	AddressText       string  `json:"address_text,omitempty"`
	District          string  `json:"district,omitempty"`
	AddressVisibility string  `json:"address_visibility"`
	Latitude          float64 `json:"latitude"`
	Longitude         float64 `json:"longitude"`
	HoursText         string  `json:"hours_text,omitempty"`
	Description       string  `json:"description,omitempty"`
	PhotoURL          string  `json:"photo_url,omitempty"`
	CityID            *int64  `json:"city_id,omitempty"`
	IsActive          bool    `json:"is_active"`
}

type ServiceZone struct {
	ID         int64   `json:"id"`
	ProviderID int64   `json:"provider_id"`
	OfferingID *int64  `json:"offering_id,omitempty"`
	ZoneKind   string  `json:"zone_kind"`
	ZoneType   string  `json:"zone_type"`
	Label      string  `json:"label"`
	CityID     *int64  `json:"city_id,omitempty"`
	RegionID   *int64  `json:"region_id,omitempty"`
	RadiusKm   *int    `json:"radius_km,omitempty"`
	FromCityID *int64  `json:"from_city_id,omitempty"`
	ToCityID   *int64  `json:"to_city_id,omitempty"`
	CenterLat  float64 `json:"center_lat,omitempty"`
	CenterLng  float64 `json:"center_lng,omitempty"`
}

type Job struct {
	ID              int64  `json:"id"`
	ProviderID      *int64 `json:"provider_id,omitempty"`
	Title           string `json:"title"`
	Company         string `json:"company"`
	CityID          *int64 `json:"city_id,omitempty"`
	RegionID        *int64 `json:"region_id,omitempty"`
	Description     string `json:"description"`
	Requirements    string `json:"requirements"`
	ScheduleText    string `json:"schedule_text"`
	SalaryText      string `json:"salary_text"`
	Language        string `json:"language"`
	EmploymentType  string `json:"employment_type"`
	ContactText     string `json:"contact_text,omitempty"`
	ContactURL      string `json:"contact_url,omitempty"`
	Status          string `json:"status"`
}

type LookingRequest struct {
	ID          int64     `json:"id"`
	AuthorID    int64     `json:"author_id"`
	CityID      *int64    `json:"city_id,omitempty"`
	RegionID    *int64    `json:"region_id,omitempty"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Formats     []string  `json:"formats"`
	Languages   []string  `json:"languages"`
	NeededDate  *time.Time `json:"needed_date,omitempty"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type LookingResponse struct {
	ID               int64    `json:"id"`
	RequestID        int64    `json:"request_id"`
	ProviderID       int64    `json:"provider_id"`
	Message          string   `json:"message"`
	OfferingID       *int64   `json:"offering_id,omitempty"`
	AvailabilityNote string   `json:"availability_note"`
	Formats          []string `json:"formats"`
	CreatedAt        time.Time `json:"created_at"`
}

type DiscoverOfferingRow struct {
	Offering         ServiceOffering
	Provider         Provider
	CategoryName     string
	CategorySlug     string
	ServiceName      string
	CityName         string
	PointLabel       string
	PointDistrict    string
	DistanceKm       *float64
	HasVerifiedDocs  bool
	ContactsUnlocked bool
}

type DiscoverMapPoint struct {
	PointID      int64   `json:"point_id"`
	OfferingID   int64   `json:"offering_id"`
	ProviderID   int64   `json:"provider_id"`
	Title        string  `json:"title"`
	Label        string  `json:"label"`
	CityName     string  `json:"city_name"`
	ProviderName string  `json:"provider_name"`
	CategoryName string  `json:"category_name"`
	Lat          float64 `json:"lat"`
	Lng          float64 `json:"lng"`
	Category     string  `json:"category"`
}
