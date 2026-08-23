package seed

import (
	"context"
	"fmt"
	"time"

	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

// ensureTransportDemo — тестовые рейсы Vezu. Только cmd/seed -demo (APP_ENV=production блокируется).
// Префикс [DEMO] в company_name — чтобы отличать от реальных данных.
func (s *Seeder) ensureTransportDemo(ctx context.Context) error {
	if s.Providers == nil {
		return nil
	}
	transportRepo := postgres.NewTransportRepo(s.DB)

	city := func(slug string) (int64, error) {
		var id int64
		err := s.DB.Pool.QueryRow(ctx, `SELECT id FROM cities WHERE slug=$1 AND is_active=true LIMIT 1`, slug).Scan(&id)
		return id, err
	}

	ids := map[string]int64{}
	for _, slug := range []string{"warsaw", "lublin", "lviv", "kyiv", "krakow", "berlin", "prague", "wroclaw", "gdansk"} {
		id, err := city(slug)
		if err != nil {
			return fmt.Errorf("city %s: %w", slug, err)
		}
		ids[slug] = id
	}

	demoUsers := []struct {
		login, email, pass, first, last string
	}{
		{"carrier-demo-abc", "carrier-demo-abc@example.com", "carrier12345", "ABC", "Transport"},
		{"carrier-demo-fop", "carrier-demo-fop@example.com", "carrier12345", "Іван", "Петренко"},
		{"carrier-demo-private", "carrier-demo-private@example.com", "carrier12345", "Олександр", "Коваленко"},
		{"carrier-demo-bus", "carrier-demo-bus@example.com", "carrier12345", "Марія", "Шевченко"},
	}
	for _, u := range demoUsers {
		if err := s.ensureUser(ctx, u.login, u.email, u.pass, u.first, u.last, []string{domain.RoleTourist, domain.RoleProvider}); err != nil {
			return err
		}
	}

	carrierRepo := postgres.NewCarrierRepo(s.DB)
	carrierSeeds := []struct {
		login, slug, carrierType, about, contactPerson string
		baseCity                                       string
		experience, trips                              int
		identity, ukrainian, business, documents       string
		withSubscription                               bool
		vehicles                                       []struct{ brand, model, vType string; seats int; year int }
	}{
		{
			login: "carrier-demo-abc", slug: "abc-transport-demo", carrierType: domain.CarrierTypeCompany,
			about: "Міжнародні пасажирські перевезення з 2015 року. Регулярні рейси PL → UA.",
			contactPerson: "Андрій Мельник", baseCity: "warsaw", experience: 10, trips: 2400,
			identity: domain.VerificationVerified, ukrainian: domain.VerificationVerified,
			business: domain.VerificationVerified, documents: domain.VerificationVerified,
			withSubscription: true,
			vehicles: []struct{ brand, model, vType string; seats int; year int }{
				{"Mercedes", "Sprinter", "minivan", 8, 2022},
				{"Mercedes", "Vito", "minivan", 7, 2020},
			},
		},
		{
			login: "carrier-demo-fop", slug: "ivan-petrenko-demo", carrierType: domain.CarrierTypeFOP,
			about: "ФОП, регулярні рейси Чехія — Україна.", contactPerson: "Іван Петренко",
			baseCity: "prague", experience: 6, trips: 890,
			identity: domain.VerificationVerified, ukrainian: domain.VerificationVerified,
			business: domain.VerificationVerified, documents: domain.VerificationPending,
			withSubscription: true,
			vehicles: []struct{ brand, model, vType string; seats int; year int }{
				{"Mercedes", "Sprinter", "minivan", 7, 2019},
			},
		},
		{
			login: "carrier-demo-private", slug: "oleksandr-kovalenko-demo", carrierType: domain.CarrierTypePrivate,
			about: "Приватний перевізник, Берлін — Київ.", contactPerson: "Олександр Коваленко",
			baseCity: "berlin", experience: 4, trips: 320,
			identity: domain.VerificationVerified, ukrainian: domain.VerificationVerified,
			business: domain.VerificationPending, documents: domain.VerificationVerified,
			withSubscription: true,
			vehicles: []struct{ brand, model, vType string; seats int; year int }{
				{"VW", "Caravelle", "minivan", 6, 2021},
				{"Toyota", "RAV4", "car", 4, 2018},
			},
		},
		{
			login: "carrier-demo-bus", slug: "baltic-ua-demo", carrierType: domain.CarrierTypeCompany,
			about: "Автобусні лінії Балтика — Україна.", contactPerson: "Марія Шевченко",
			baseCity: "gdansk", experience: 12, trips: 5100,
			identity: domain.VerificationVerified, ukrainian: domain.VerificationVerified,
			business: domain.VerificationVerified, documents: domain.VerificationVerified,
			withSubscription: true,
			vehicles: []struct{ brand, model, vType string; seats int; year int }{
				{"Setra", "S515 HD", "bus", 49, 2021},
			},
		},
	}
	for _, cs := range carrierSeeds {
		u, err := s.Users.GetByLogin(ctx, cs.login)
		if err != nil || u == nil {
			continue
		}
		p, err := s.ensureTransportProvider(ctx, u.ID, cs.slug, cs.contactPerson)
		if err != nil {
			return err
		}
		var profExists int
		_ = s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM carrier_profiles WHERE provider_id=$1`, p.ID).Scan(&profExists)
		if profExists == 0 {
			baseID := ids[cs.baseCity]
			basePtr := &baseID
			if err := carrierRepo.UpsertProfile(ctx, domain.CarrierProfile{
				ProviderID:      p.ID,
				CarrierType:     cs.carrierType,
				Citizenship:     "UA",
				BaseCityID:      basePtr,
				About:           cs.about,
				ExperienceYears: cs.experience,
				TripsCount:      cs.trips,
				TrustLevel:      domain.CarrierTrustVerified,
				IdentityStatus:  cs.identity,
				UkrainianStatus: cs.ukrainian,
				BusinessStatus:  cs.business,
				DocumentsStatus: cs.documents,
				ContactPerson:   cs.contactPerson,
				Status:          domain.CarrierStatusPublished,
			}); err != nil {
				return err
			}
			for i, v := range cs.vehicles {
				year := v.year
				_, err := carrierRepo.CreateVehicle(ctx, domain.CarrierVehicle{
					ProviderID:         p.ID,
					Brand:              v.brand,
					Model:              v.model,
					Year:               &year,
					VehicleType:        v.vType,
					Seats:              v.seats,
					VerificationStatus: domain.VerificationVerified,
					IsPrimary:          i == 0,
				})
				if err != nil {
					return err
				}
			}
		}
		if cs.withSubscription {
			if err := carrierRepo.EnsureDemoSubscription(ctx, p.ID, "carrier-6m", 6); err != nil {
				return err
			}
		}
	}

	today := time.Now().UTC()
	dep := func(days int, arriveDays int) domain.TransportDeparture {
		d := domain.TransportDeparture{
			DepartOn: today.Add(time.Duration(days) * 24 * time.Hour).Format("2006-01-02"),
		}
		if arriveDays > 0 {
			d.ArriveOn = today.Add(time.Duration(arriveDays) * 24 * time.Hour).Format("2006-01-02")
		}
		return d
	}
	depSeats := func(days, arriveDays, seats int) domain.TransportDeparture {
		d := dep(days, arriveDays)
		d.SeatsLeft = &seats
		return d
	}

	type listingSeed struct {
		login, providerSlug, company, drivers, vehicle string
		kind                                           string
		phone, telegram, whatsapp                      string
		price                                          float64
		currency                                       string
		seats                                          int
		departTime, arriveTime                         string
		stops                                          []string
		parcels                                        bool
		parcelsTerms                                   string
		departures                                     []domain.TransportDeparture
	}

	listings := []listingSeed{
		// Пример 1 — компания (ТЗ §25)
		{
			login: "carrier-demo-abc", providerSlug: "abc-transport-demo",
			company: "[DEMO] ABC Transport", drivers: "Андрій Мельник, Олег Кравчук",
			vehicle: "Mercedes Sprinter 2022", kind: domain.TransportKindRegular,
			phone: "+48111222333", telegram: "@abc_transport_demo", whatsapp: "+48111222333",
			price: 45, currency: "EUR", seats: 8, departTime: "07:00", arriveTime: "19:30",
			stops: []string{"warsaw", "lublin", "lviv", "kyiv"},
			parcels: true, parcelsTerms: "До 25 кг, від 15 EUR. Без небезпечних вантажів.",
			departures: []domain.TransportDeparture{
				depSeats(2, 3, 5), depSeats(5, 6, 8), depSeats(9, 10, 3), depSeats(14, 15, 6),
			},
		},
		// Пример 2 — ФОП (ТЗ §25)
		{
			login: "carrier-demo-fop", providerSlug: "ivan-petrenko-demo",
			company: "", drivers: "Іван Петренко",
			vehicle: "Mercedes Sprinter", kind: domain.TransportKindRegular,
			phone: "+420777888999", telegram: "@ivan_petrenko_cz",
			price: 40, currency: "EUR", seats: 7, departTime: "06:30", arriveTime: "18:00",
			stops: []string{"prague", "lviv", "kyiv"},
			departures: []domain.TransportDeparture{dep(3, 4), dep(7, 8), dep(12, 13), dep(21, 22)},
		},
		// Пример 3 — частный перевозчик (ТЗ §25)
		{
			login: "carrier-demo-private", providerSlug: "oleksandr-kovalenko-demo",
			company: "", drivers: "Олександр Коваленко",
			vehicle: "VW Caravelle + Toyota RAV4", kind: domain.TransportKindRegular,
			phone: "+491511998877", telegram: "@alex_berlin_rides", whatsapp: "+491511998877",
			price: 50, currency: "EUR", seats: 6, departTime: "08:00", arriveTime: "21:00",
			stops: []string{"berlin", "wroclaw", "warsaw", "lviv", "kyiv"},
			departures: []domain.TransportDeparture{dep(4, 5), dep(11, 12), dep(18, 19)},
		},
		// Регулярный: Берлин → Варшава (сегмент для поиска)
		{
			login: "provider4", providerSlug: "taxi-ua-berlin",
			company: "[DEMO] Taxi UA Berlin", drivers: "Віктор Мельник",
			vehicle: "Mercedes Vito", kind: domain.TransportKindRegular,
			phone: "+491511234570", telegram: "@taxi_ua_berlin",
			price: 55, currency: "EUR", seats: 6, departTime: "09:00", arriveTime: "15:00",
			stops: []string{"berlin", "wroclaw", "warsaw"},
			departures: []domain.TransportDeparture{dep(1, 1), dep(8, 8), dep(15, 15)},
		},
		// Краков → Львів (сегмент внутри длинного маршрута)
		{
			login: "carrier-demo-bus", providerSlug: "baltic-ua-demo",
			company: "[DEMO] Baltic UA Lines", drivers: "Марія Шевченко",
			vehicle: "Setra S515 HD", kind: domain.TransportKindRegular,
			phone: "+48555111222", telegram: "@baltic_ua",
			price: 38, currency: "EUR", seats: 49, departTime: "22:00", arriveTime: "08:00",
			stops: []string{"gdansk", "warsaw", "krakow", "lviv", "kyiv"},
			parcels: true, parcelsTerms: "Посилки від 10 EUR, узгодження в Telegram",
			departures: []domain.TransportDeparture{dep(2, 3), dep(6, 7), dep(13, 14), dep(20, 21)},
		},
		// Гданськ → Київ (через Варшаву, Люблін, Львів)
		{
			login: "carrier-demo-bus", providerSlug: "baltic-ua-demo",
			company: "[DEMO] Baltic UA Lines", drivers: "Марія Шевченко",
			vehicle: "Setra S515 HD (нічний)", kind: domain.TransportKindRegular,
			phone: "+48555111222", telegram: "@baltic_ua",
			price: 42, currency: "EUR", seats: 45, departTime: "20:00", arriveTime: "12:00",
			stops: []string{"gdansk", "warsaw", "lublin", "lviv", "kyiv"},
			departures: []domain.TransportDeparture{dep(5, 6), dep(12, 13), dep(19, 20)},
		},
		// Попутка разовая
		{
			login: "carrier-demo-private", providerSlug: "oleksandr-kovalenko-demo",
			company: "", drivers: "Олександр Коваленко",
			vehicle: "Toyota RAV4", kind: domain.TransportKindOccasional,
			phone: "+491511998877", telegram: "@alex_berlin_rides",
			price: 35, currency: "EUR", seats: 3, departTime: "10:00", arriveTime: "16:00",
			stops: []string{"wroclaw", "krakow"},
			departures: []domain.TransportDeparture{dep(6, 6)},
		},
		{
			login: "guide1", providerSlug: "poputka-lviv-kyiv-demo",
			company: "", drivers: "Ірина Сидоренко",
			vehicle: "Toyota RAV4", kind: domain.TransportKindOccasional,
			phone: "+380501112233", telegram: "@iryna_poputka",
			price: 30, currency: "EUR", seats: 3, departTime: "11:00", arriveTime: "17:00",
			stops: []string{"lviv", "kyiv"},
			departures: []domain.TransportDeparture{dep(4, 4), dep(10, 10)},
		},
		// Варшава → Львів (короткий регулярный)
		{
			login: "carrier-demo-fop", providerSlug: "ivan-petrenko-demo",
			company: "[DEMO] Петренко Trans", drivers: "Іван Петренко",
			vehicle: "Ford Transit", kind: domain.TransportKindRegular,
			phone: "+420777888999", telegram: "@ivan_petrenko_cz",
			price: 25, currency: "EUR", seats: 8, departTime: "14:00", arriveTime: "20:00",
			stops: []string{"warsaw", "lublin", "lviv"},
			departures: []domain.TransportDeparture{dep(1, 1), dep(3, 3), dep(7, 7), dep(14, 14)},
		},
	}

	for _, d := range listings {
		u, err := s.Users.GetByLogin(ctx, d.login)
		if err != nil || u == nil {
			continue
		}
		displayName := d.drivers
		if d.company != "" {
			displayName = d.company
		}
		p, err := s.ensureTransportProvider(ctx, u.ID, d.providerSlug, displayName)
		if err != nil {
			return err
		}

		marker := d.company
		if marker == "" {
			marker = d.drivers + "|" + d.vehicle
		}
		var exists int
		_ = s.DB.Pool.QueryRow(ctx, `
			SELECT COUNT(*) FROM transport_listings
			WHERE provider_id=$1 AND company_name=$2 AND driver_names=$3 AND vehicle_brand=$4`,
			p.ID, d.company, d.drivers, d.vehicle).Scan(&exists)
		if exists > 0 {
			continue
		}

		stops := make([]domain.TransportStop, len(d.stops))
		for i, slug := range d.stops {
			stops[i] = domain.TransportStop{CityID: ids[slug], SortOrder: i + 1}
		}

		listing := &domain.TransportListing{
			ProviderID:       p.ID,
			Kind:             d.kind,
			CompanyName:      d.company,
			DriverNames:      d.drivers,
			VehicleBrand:     d.vehicle,
			Phone:            d.phone,
			Telegram:         d.telegram,
			Whatsapp:         d.whatsapp,
			PriceAmount:      d.price,
			PriceCurrency:    d.currency,
			SeatsTotal:       d.seats,
			ParcelsAccepted:  d.parcels,
			ParcelsTerms:     d.parcelsTerms,
			DepartTime:       d.departTime,
			ArriveTimeApprox: d.arriveTime,
			Status:           domain.TransportListingPublished,
			Stops:            stops,
			Departures:       d.departures,
		}
		if _, err := transportRepo.Create(ctx, listing); err != nil {
			return fmt.Errorf("transport demo %s: %w", marker, err)
		}
	}

	return s.ensureTransportDemoBookings(ctx)
}

func (s *Seeder) ensureTransportProvider(ctx context.Context, userID int64, slug, displayName string) (*domain.Provider, error) {
	p, err := s.Providers.GetProviderByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if p != nil {
		return p, nil
	}
	id, err := s.Providers.CreateProvider(ctx, userID, slug, displayName)
	if err != nil {
		return nil, err
	}
	_ = s.Users.AddRole(ctx, userID, domain.RoleProvider)
	p, err = s.Providers.GetProviderByUserID(ctx, userID)
	if err != nil || p == nil {
		return &domain.Provider{ID: id, UserID: userID}, nil
	}
	return p, nil
}
