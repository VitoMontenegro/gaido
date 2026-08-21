package domain

import "time"

type AdminAnalytics struct {
	ActiveGuides        int
	PublishedExcursions int
	PublishedReviews    int
	TotalUsers          int
	TotalGuides         int
	PendingExcursions   int
	DraftExcursions     int
	PendingReviews      int
	TotalFavorites      int
	PaymentsTotal       int
	PaymentsPaid        int
	PaymentsPending     int
	ActiveSubscriptions int
	FeaturedGuides      int
	FeaturedExcursions  int
	CitiesCount         int
	CountriesCount      int
	RevenueTotal        float64
	RevenueMonth        float64
	RecentPayments      []AdminPaymentRow
}

type AdminPaymentRow struct {
	ID        int64
	Amount    float64
	Currency  string
	Purpose   string
	Status    string
	CreatedAt time.Time
	PayerName string
}

type GuideDashboardStats struct {
	PublishedExcursions int
	DraftExcursions     int
	PendingExcursions   int
	UpcomingSlots       int
}

type FavoriteRef struct {
	TargetType string
	TargetID   int64
}

type FavoriteEnriched struct {
	TargetType    string
	TargetID      int64
	Title         string
	Slug          string
	CoverImageURL string
	CityName      string
	PriceFrom     float64
	Currency      string
	Description   string
	RatingAvg     float64
	RatingCount   int
	AvatarURL     string
}

func ValidFavoriteType(t string) bool {
	switch t {
	case FavoriteExcursion, FavoriteGuide, FavoriteProvider:
		return true
	default:
		return false
	}
}

type AuditLogEntry struct {
	ID         int64
	ActorID    *int64
	Action     string
	EntityType string
	EntityID   *int64
	CreatedAt  time.Time
}
