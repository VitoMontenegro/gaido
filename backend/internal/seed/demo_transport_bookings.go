package seed

import (
	"context"

	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

// ensureTransportDemoBookings — тестові заявки [DEMO]. Тільки cmd/seed -demo.
func (s *Seeder) ensureTransportDemoBookings(ctx context.Context) error {
	bookingRepo := postgres.NewTransportBookingRepo(s.DB)
	tourist, err := s.Users.GetByLogin(ctx, "tourist1")
	if err != nil || tourist == nil {
		return nil
	}
	tourist2, _ := s.Users.GetByLogin(ctx, "tourist2")

	var listingID, providerID, depID int64
	err = s.DB.Pool.QueryRow(ctx, `
		SELECT l.id, l.provider_id, d.id
		FROM transport_listings l
		JOIN transport_listing_departures d ON d.listing_id = l.id
		WHERE l.company_name LIKE '[DEMO]%' AND l.status='published'
		ORDER BY l.id LIMIT 1`).Scan(&listingID, &providerID, &depID)
	if err != nil || listingID == 0 {
		return nil
	}

	var exists int
	_ = s.DB.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM transport_bookings
		WHERE listing_id=$1 AND user_id=$2 AND passenger_name LIKE '[DEMO]%'`,
		listingID, tourist.ID).Scan(&exists)
	if exists > 0 {
		return nil
	}

	depPtr := &depID
	bookings := []struct {
		userID                            int64
		name, phone, email, comment, status string
		seats                             int
	}{
		{tourist.ID, "[DEMO] Олена К.", "+380501234567", "tourist1@example.com", "2 місця біля вікна", domain.TransportBookingConfirmed, 2},
	}
	if tourist2 != nil {
		bookings = append(bookings, struct {
			userID                            int64
			name, phone, email, comment, status string
			seats                             int
		}{tourist2.ID, "[DEMO] Дмитро І.", "+380509876543", "tourist2@example.com", "", domain.TransportBookingPending, 1})
	}

	for _, b := range bookings {
		_, err := bookingRepo.Create(ctx, domain.TransportBooking{
			ListingID:      listingID,
			DepartureID:    depPtr,
			UserID:         b.userID,
			ProviderID:     providerID,
			Seats:          b.seats,
			PassengerName:  b.name,
			PassengerPhone: b.phone,
			PassengerEmail: b.email,
			Comment:        b.comment,
			Status:         b.status,
		})
		if err != nil {
			return err
		}
	}
	return nil
}
