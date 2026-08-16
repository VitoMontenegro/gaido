package seed

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

type demoOfferingSpec struct {
	catSlug, svcSlug, title, slug, description string
	formats                                      []string
	hasAvailability                            bool
	mobileZone                                   bool
	transportZone                                bool
}

type demoProviderSpec struct {
	login, email, pass, firstName, lastName string
	slug, displayName, businessName, profession, about string
	phone, telegram, responseHours                         string
	citySlug                                               string
	pointLabel, district                                   string
	lat, lng                                               float64
	languages                                              []string
	offerings                                              []demoOfferingSpec
}

func (s *Seeder) ensurePlatformDemo(ctx context.Context) error {
	if s.Providers == nil {
		return nil
	}

	providers := []demoProviderSpec{
		{
			login: "provider1", email: "provider1@example.com", pass: "provider12345",
			firstName: "Олена", lastName: "Кравчук",
			slug: "olena-beauty", displayName: "Olena Beauty", businessName: "Olena Beauty Studio",
			profession: "Майстер манікюру", about: "Манікюр та педикюр українською та німецькою.",
			phone: "+491511234567", telegram: "@olena_beauty", responseHours: domain.ResponseUnder1h,
			citySlug: "berlin", pointLabel: "Berlin Mitte", district: "Mitte", lat: 52.5200, lng: 13.4050,
			languages: []string{"uk", "de"},
			offerings: []demoOfferingSpec{
				{"beauty", "manicure", "Манікюр", "manicure", "Класичний та гель-лак манікюр.", []string{domain.FormatOnSite, domain.FormatMobile}, true, true, false},
				{"beauty", "pedicure", "Педикюр", "pedicure", "SPA-педикюр та догляд за стопами.", []string{domain.FormatOnSite}, true, false, false},
			},
		},
		{
			login: "provider2", email: "provider2@example.com", pass: "provider12345",
			firstName: "Андрій", lastName: "Коваленко",
			slug: "dr-koval-berlin", displayName: "Dr. Koval", businessName: "UA Medical Berlin",
			profession: "Сімейний лікар", about: "Консультації українською, німецькою та англійською.",
			phone: "+491511234568", telegram: "@dr_koval", responseHours: domain.ResponseUnder30m,
			citySlug: "berlin", pointLabel: "Charlottenburg", district: "Charlottenburg", lat: 52.5163, lng: 13.3044,
			languages: []string{"uk", "de", "en"},
			offerings: []demoOfferingSpec{
				{"health", "doctor", "Прийом лікаря", "doctor-visit", "Первинна консультація та направлення.", []string{domain.FormatOnSite, domain.FormatOnline}, true, false, false},
				{"health", "psychologist", "Психолог", "psychologist", "Підтримка адаптації за кордоном.", []string{domain.FormatOnline, domain.FormatOnSite}, true, false, false},
			},
		},
		{
			login: "provider3", email: "provider3@example.com", pass: "provider12345",
			firstName: "Марія", lastName: "Шевченко",
			slug: "ua-kitchen-berlin", displayName: "UA Kitchen", businessName: "Українська кухня Berlin",
			profession: "Ресторан", about: "Борщ, вареники та домашня випічка щодня.",
			phone: "+491511234569", telegram: "@ua_kitchen", responseHours: domain.ResponseUnder1h,
			citySlug: "berlin", pointLabel: "Prenzlauer Berg", district: "Prenzlauer Berg", lat: 52.5388, lng: 13.4244,
			languages: []string{"uk", "de"},
			offerings: []demoOfferingSpec{
				{"ukrainian-food", "restaurant", "Ресторан української кухні", "restaurant", "Обіди та вечері, банкети.", []string{domain.FormatOnSite}, false, false, false},
				{"ukrainian-food", "catering", "Кейтеринг", "catering", "Кейтеринг для заходів української громади.", []string{domain.FormatMobile}, false, true, false},
			},
		},
		{
			login: "provider4", email: "provider4@example.com", pass: "provider12345",
			firstName: "Віктор", lastName: "Мельник",
			slug: "taxi-ua-berlin", displayName: "Taxi UA Berlin", businessName: "Taxi UA",
			profession: "Таксі та трансфери", about: "Поїздки містом, аеропорт, міжмісто.",
			phone: "+491511234570", telegram: "@taxi_ua_berlin", responseHours: domain.ResponseUnder30m,
			citySlug: "berlin", pointLabel: "Berlin центр", district: "Mitte", lat: 52.5244, lng: 13.4105,
			languages: []string{"uk", "de", "en"},
			offerings: []demoOfferingSpec{
				{"transport-taxi", "taxi", "Таксі Berlin", "taxi-berlin", "Комфортні поїздки містом та передмістям.", []string{domain.FormatMobile}, false, false, true},
				{"transport-taxi", "transfer", "Трансфер аеропорт", "airport-transfer", "Schönefeld, Tegel, BER — фіксована ціна.", []string{domain.FormatMobile}, false, false, true},
			},
		},
		{
			login: "provider5", email: "provider5@example.com", pass: "provider12345",
			firstName: "Сергій", lastName: "Бондар",
			slug: "it-fix-warsaw", displayName: "IT Fix Pro", businessName: "IT Fix Pro Warszawa",
			profession: "Ремонт техніки", about: "iPhone, Android, ноутбуки — швидко та з гарантією.",
			phone: "+48123456789", telegram: "@itfix_warsaw", responseHours: domain.ResponseUnder1h,
			citySlug: "warsaw", pointLabel: "Śródmieście", district: "Centrum", lat: 52.2297, lng: 21.0122,
			languages: []string{"uk", "pl", "en"},
			offerings: []demoOfferingSpec{
				{"tech", "phone-repair", "Ремонт телефонів", "phone-repair", "Екран, батарея, вода.", []string{domain.FormatOnSite, domain.FormatMobile}, true, true, false},
				{"tech", "laptop-repair", "Ремонт ноутбуків", "laptop-repair", "Чистка, SSD, Windows/Mac.", []string{domain.FormatOnSite}, true, false, false},
			},
		},
		{
			login: "provider6", email: "provider6@example.com", pass: "provider12345",
			firstName: "Наталія", lastName: "Лисенко",
			slug: "clean-home-warsaw", displayName: "Clean Home UA", businessName: "Clean Home",
			profession: "Клінінг", about: "Прибирання квартир та офісів, українською та польською.",
			phone: "+48123456790", telegram: "@clean_home_ua", responseHours: domain.ResponseUnder1h,
			citySlug: "warsaw", pointLabel: "Mokotów", district: "Mokotów", lat: 52.1930, lng: 21.0340,
			languages: []string{"uk", "pl"},
			offerings: []demoOfferingSpec{
				{"home-repair", "cleaning", "Клінінг квартири", "cleaning", "Генеральне та підтримуюче прибирання.", []string{domain.FormatMobile}, true, true, false},
				{"home-repair", "moving", "Допомога з переїздом", "moving-help", "Пакування та перевезення речей.", []string{domain.FormatMobile}, false, true, false},
			},
		},
		{
			login: "provider7", email: "provider7@example.com", pass: "provider12345",
			firstName: "Катерина", lastName: "Мороз",
			slug: "photo-krakow", displayName: "Photo UA Kraków", businessName: "Photo Studio UA",
			profession: "Фотограф", about: "Портрети, сімейні та весільні фотосесії.",
			phone: "+48123456791", telegram: "@photo_ua_krakow", responseHours: domain.ResponseUnder1h,
			citySlug: "krakow", pointLabel: "Stare Miasto", district: "Centrum", lat: 50.0647, lng: 19.9450,
			languages: []string{"uk", "pl", "en"},
			offerings: []demoOfferingSpec{
				{"photo-video", "photographer", "Фотосесія", "photoshoot", "1–2 години, обробка 20 фото.", []string{domain.FormatOnSite, domain.FormatMobile}, true, true, false},
				{"photo-video", "wedding-photo", "Весільна зйомка", "wedding", "Повний день або церемонія.", []string{domain.FormatMobile}, true, true, false},
			},
		},
		{
			login: "provider8", email: "provider8@example.com", pass: "provider12345",
			firstName: "Тетяна", lastName: "Романова",
			slug: "ua-help-prague", displayName: "UA Help Prague", businessName: "Допомога українцям Praha",
			profession: "Гуманітарна допомога", about: "Юридичні консультації, житло, переклад документів.",
			phone: "+420123456789", telegram: "@ua_help_prague", responseHours: domain.ResponseUnder1h,
			citySlug: "prague", pointLabel: "Praha 2", district: "Vinohrady", lat: 50.0755, lng: 14.4378,
			languages: []string{"uk", "cs", "en"},
			offerings: []demoOfferingSpec{
				{"help-ukrainians", "legal-help", "Юридична допомога", "legal-help", "ВНП, договори, переклад.", []string{domain.FormatOnSite, domain.FormatOnline}, true, false, false},
				{"help-ukrainians", "housing-help", "Допомога з житлом", "housing", "Пошук житла та супровід.", []string{domain.FormatOnline}, false, false, false},
			},
		},
		{
			login: "provider9", email: "provider9@example.com", pass: "provider12345",
			firstName: "Ігор", lastName: "Савченко",
			slug: "ua-center-munich", displayName: "UA Center München", businessName: "Український центр",
			profession: "Культурний центр", about: "Заходи, мова, спільнота українців у Мюнхені.",
			phone: "+491511234571", telegram: "@ua_munich", responseHours: domain.ResponseUnder1h,
			citySlug: "munich", pointLabel: "Maxvorstadt", district: "Maxvorstadt", lat: 48.1351, lng: 11.5820,
			languages: []string{"uk", "de"},
			offerings: []demoOfferingSpec{
				{"ukrainian-places", "cultural-center", "Культурний центр", "cultural-center", "Події, лекції, дитячі гуртки.", []string{domain.FormatOnSite}, false, false, false},
				{"education", "courses", "Курси німецької", "german-courses", "Групи для українців A1–B2.", []string{domain.FormatOnSite, domain.FormatOnline}, true, false, false},
			},
		},
		{
			login: "provider10", email: "provider10@example.com", pass: "provider12345",
			firstName: "Павло", lastName: "Гнатюк",
			slug: "auto-vienna", displayName: "Auto UA Wien", businessName: "Auto Service UA",
			profession: "СТО", about: "Діагностика, ремонт, шиномонтаж — українською та німецькою.",
			phone: "+43123456789", telegram: "@auto_ua_vienna", responseHours: domain.ResponseUnder1h,
			citySlug: "vienna", pointLabel: "Favoriten", district: "Favoriten", lat: 48.2082, lng: 16.3738,
			languages: []string{"uk", "de"},
			offerings: []demoOfferingSpec{
				{"auto", "service-station", "СТО", "sto", "ТО, діагностика, ремонт ходової.", []string{domain.FormatOnSite}, true, false, false},
				{"auto", "tow", "Евакуатор", "tow", "Евакуація по Wien та околицях.", []string{domain.FormatMobile}, false, false, true},
			},
		},
	}

	providerIDs := make(map[string]int64, len(providers))
	offeringBySlug := make(map[string]int64)

	for _, spec := range providers {
		pid, offIDs, err := s.seedDemoProvider(ctx, spec)
		if err != nil {
			return fmt.Errorf("provider %s: %w", spec.slug, err)
		}
		providerIDs[spec.slug] = pid
		for slug, id := range offIDs {
			offeringBySlug[slug] = id
		}
	}

	if err := s.seedDemoJobs(ctx, providerIDs); err != nil {
		return err
	}
	if err := s.seedDemoLooking(ctx, providerIDs, offeringBySlug); err != nil {
		return err
	}
	if err := s.seedDemoPlatformReviews(ctx, providerIDs); err != nil {
		return err
	}
	return s.seedDemoSuggestions(ctx, providerIDs)
}

func (s *Seeder) seedDemoProvider(ctx context.Context, spec demoProviderSpec) (int64, map[string]int64, error) {
	offeringIDs := map[string]int64{}

	if err := s.ensureUser(ctx, spec.login, spec.email, spec.pass, spec.firstName, spec.lastName,
		[]string{domain.RoleTourist, domain.RoleProvider}); err != nil {
		return 0, nil, err
	}
	u, err := s.Users.GetByLogin(ctx, spec.login)
	if err != nil || u == nil {
		return 0, nil, fmt.Errorf("user %s not found", spec.login)
	}

	city, err := s.Geo.GetCityBySlug(ctx, spec.citySlug)
	if err != nil || city == nil {
		return 0, nil, fmt.Errorf("city %s not found", spec.citySlug)
	}
	cityID := city.ID

	var pid int64
	existing, _ := s.Providers.GetProviderByUserID(ctx, u.ID)
	if existing != nil {
		pid = existing.ID
	} else {
		bySlug, _ := s.Providers.GetProviderBySlug(ctx, spec.slug)
		if bySlug != nil {
			pid = bySlug.ID
		} else {
			pid, err = s.Providers.CreateProvider(ctx, u.ID, spec.slug, spec.displayName)
			if err != nil {
				return 0, nil, err
			}
		}
	}

	p := &domain.Provider{
		ID: pid, UserID: u.ID, DisplayName: spec.displayName, BusinessName: spec.businessName,
		Profession: spec.profession, About: spec.about, WebsiteSlug: spec.slug,
		ResponseHours: spec.responseHours, Phone: spec.phone, Telegram: spec.telegram,
		PrimaryCityID: &cityID, Languages: spec.languages,
	}
	if err := s.Providers.UpdateProvider(ctx, p); err != nil {
		return 0, nil, err
	}
	_, _ = s.DB.Pool.Exec(ctx, `UPDATE providers SET status=$2, rating_avg=4.6, rating_count=12 WHERE id=$1`,
		pid, domain.ProviderStatusVerified)

	ptID, err := s.ensureProviderPoint(ctx, pid, spec.pointLabel, spec.district, spec.lat, spec.lng, cityID)
	if err != nil {
		return 0, nil, err
	}

	for _, off := range spec.offerings {
		catID, svcID, err := s.lookupService(ctx, off.catSlug, off.svcSlug)
		if err != nil {
			return 0, nil, err
		}
		svcPtr := &svcID
		o := &domain.ServiceOffering{
			ProviderID: pid, ServiceID: svcPtr, CategoryID: catID,
			Title: off.title, Slug: off.slug, Description: off.description,
			Formats: off.formats, Languages: spec.languages,
			Status: domain.OfferingStatusPublished, HasAvailability: off.hasAvailability,
		}
		offID, err := s.ensureOffering(ctx, pid, o)
		if err != nil {
			return 0, nil, err
		}
		offeringIDs[off.slug] = offID
		_ = s.Providers.LinkOfferingPoint(ctx, offID, ptID)

		if off.mobileZone {
			offeringID := offID
			zone := &domain.ServiceZone{
				ProviderID: pid, OfferingID: &offeringID, ZoneKind: domain.ZoneKindServiceArea,
				ZoneType: domain.ZoneTypeCity, Label: "Виїзд — " + city.Name, CityID: &cityID,
				RadiusKm: intPtr(15), CenterLat: spec.lat, CenterLng: spec.lng,
			}
			_, _ = s.Providers.UpsertZone(ctx, zone)
		}
		if off.transportZone {
			offeringID := offID
			zone := &domain.ServiceZone{
				ProviderID: pid, OfferingID: &offeringID, ZoneKind: domain.ZoneKindTransport,
				ZoneType: domain.ZoneTypeCitySuburbs, Label: city.Name + " + околиці", CityID: &cityID,
				CenterLat: spec.lat, CenterLng: spec.lng, RadiusKm: intPtr(25),
			}
			_, _ = s.Providers.UpsertZone(ctx, zone)
		}
	}

	return pid, offeringIDs, nil
}

func (s *Seeder) lookupService(ctx context.Context, catSlug, svcSlug string) (catID, svcID int64, err error) {
	err = s.DB.Pool.QueryRow(ctx, `SELECT id FROM service_categories WHERE slug=$1`, catSlug).Scan(&catID)
	if err != nil {
		return 0, 0, fmt.Errorf("category %s: %w", catSlug, err)
	}
	err = s.DB.Pool.QueryRow(ctx, `SELECT id FROM services WHERE slug=$1 AND category_id=$2`, svcSlug, catID).Scan(&svcID)
	if err != nil {
		return 0, 0, fmt.Errorf("service %s/%s: %w", catSlug, svcSlug, err)
	}
	return catID, svcID, nil
}

func (s *Seeder) ensureProviderPoint(ctx context.Context, providerID int64, label, district string, lat, lng float64, cityID int64) (int64, error) {
	var ptID int64
	err := s.DB.Pool.QueryRow(ctx, `
		SELECT id FROM service_points WHERE provider_id=$1 AND label=$2 LIMIT 1`, providerID, label).Scan(&ptID)
	if err == nil {
		return ptID, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	pt := &domain.ServicePoint{
		ProviderID: providerID, Label: label, District: district,
		AddressVisibility: domain.AddressDistrict, Latitude: lat, Longitude: lng,
		CityID: &cityID, HoursText: "Пн–Сб 09:00–18:00", IsActive: true,
	}
	return s.Providers.UpsertPoint(ctx, pt)
}

func (s *Seeder) ensureOffering(ctx context.Context, providerID int64, o *domain.ServiceOffering) (int64, error) {
	var offID int64
	err := s.DB.Pool.QueryRow(ctx, `SELECT id FROM service_offerings WHERE provider_id=$1 AND slug=$2`, providerID, o.Slug).Scan(&offID)
	if err == nil {
		o.ID = offID
		o.ProviderID = providerID
		return s.Providers.UpsertOffering(ctx, o)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, err
	}
	return s.Providers.UpsertOffering(ctx, o)
}

func (s *Seeder) seedDemoJobs(ctx context.Context, providers map[string]int64) error {
	jobs := postgres.NewJobRepo(s.DB)

	type jobSpec struct {
		providerSlug, title, company, citySlug, description, requirements, schedule, salary, employment, contact string
	}
	specs := []jobSpec{
		{"ua-center-munich", "Адміністратор українського центру", "UA Berlin Hub", "berlin",
			"Шукаємо адміністратора з знанням української та німецької.", "B1 Deutsch, комунікабельність", "Пн–Пт", "2800 EUR", "full-time", "hr@uaberlin.example"},
		{"", "Барista в українському кафе", "UA Kitchen Warszawa", "warsaw",
			"Досвід не обовʼязковий, навчимо.", "Українська або польська", "Гнучкий графік", "4500 PLN", "part-time", "jobs@uakitchen.pl"},
		{"", "Водій таксі (B категорія)", "Taxi UA Berlin", "berlin",
			"Повна зайнятість, авто надаємо.", "B категорія, B1 Deutsch", "Зміни", "3200 EUR", "full-time", "+491511234570"},
		{"it-fix-warsaw", "Junior IT-спеціаліст", "IT Fix Pro", "warsaw",
			"Ремонт телефонів та ноутбуків.", "Базові навички пайки", "Пн–Сб", "5000 PLN", "full-time", "sergiy@itfix.pl"},
		{"ua-help-prague", "Волонтер-координатор", "UA Help Prague", "prague",
			"Координація гуманітарної допомоги.", "Українська, чеська бажано", "3 дні на тиждень", "Добровільно", "volunteer", "help@uaprague.cz"},
		{"", "Перукар-колорист", "Salon UA", "krakow",
			"Салон для українців у Кракові.", "Досвід від 1 року", "Вт–Нд", "5500 PLN", "full-time", "salon@ua-krakow.pl"},
		{"auto-vienna", "Автомеханік", "Auto UA Wien", "vienna",
			"СТО для української громади.", "Досвід 2+ роки", "Пн–Пт", "от 3200 EUR", "full-time", "jobs@autoua.at"},
	}

	for _, spec := range specs {
		var count int
		_ = s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM jobs WHERE title=$1`, spec.title).Scan(&count)
		if count > 0 {
			continue
		}
		city, _ := s.Geo.GetCityBySlug(ctx, spec.citySlug)
		var cityID *int64
		if city != nil {
			cityID = &city.ID
		}
		var providerID *int64
		if spec.providerSlug != "" {
			if id, ok := providers[spec.providerSlug]; ok {
				providerID = &id
			}
		}
		_, err := jobs.CreateJob(ctx, &domain.Job{
			ProviderID: providerID, Title: spec.title, Company: spec.company, CityID: cityID,
			Description: spec.description, Requirements: spec.requirements, ScheduleText: spec.schedule,
			SalaryText: spec.salary, Language: "uk", EmploymentType: spec.employment,
			ContactText: spec.contact, Status: "published",
		})
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Seeder) seedDemoLooking(ctx context.Context, providers map[string]int64, offerings map[string]int64) error {
	lr := postgres.NewLookingRepo(s.DB)

	type lookingSpec struct {
		touristLogin, citySlug, title, description string
		formats                                    []string
		responses                                  []struct {
			providerSlug, offeringSlug, message string
		}
	}

	specs := []lookingSpec{
		{
			touristLogin: "tourist1", citySlug: "berlin",
			title: "Потрібен манікюр на дому", description: "Шукаю майстра на суботу, Mitte або Prenzlauer Berg.",
			formats: []string{domain.FormatMobile},
			responses: []struct {
				providerSlug, offeringSlug, message string
			}{
				{"olena-beauty", "manicure", "Можу приїхати в суботу о 11:00, гель-лак +600 грн."},
			},
		},
		{
			touristLogin: "tourist2", citySlug: "warsaw",
			title: "Ремонт iPhone 13", description: "Розбите скло, потрібна заміна сьогодні-завтра.",
			formats: []string{domain.FormatOnSite},
			responses: []struct {
				providerSlug, offeringSlug, message string
			}{
				{"it-fix-warsaw", "phone-repair", "Маємо скло в наявності, завітайте до 19:00."},
			},
		},
		{
			touristLogin: "tourist1", citySlug: "prague",
			title: "Допомога з договором оренди", description: "Потрібна консультація українською щодо договору.",
			formats: []string{domain.FormatOnline, domain.FormatOnSite},
			responses: []struct {
				providerSlug, offeringSlug, message string
			}{
				{"ua-help-prague", "legal-help", "Можемо зустрітись завтра о 15:00 або онлайн."},
			},
		},
		{
			touristLogin: "tourist2", citySlug: "berlin",
			title: "Трансфер в аеропорт BER", description: "4 людини + 3 валізи, ранок у пʼятницю.",
			formats: []string{domain.FormatMobile},
			responses: []struct {
				providerSlug, offeringSlug, message string
			}{
				{"taxi-ua-berlin", "airport-transfer", "Мінівен, 65 EUR, заберемо о 06:30."},
			},
		},
		{
			touristLogin: "tourist1", citySlug: "krakow",
			title: "Сімейна фотосесія", description: "2 дорослих + дитина, старе місто.",
			formats: []string{domain.FormatOnSite},
		},
	}

	for _, spec := range specs {
		var count int
		_ = s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM looking_requests WHERE title=$1`, spec.title).Scan(&count)
		if count > 0 {
			continue
		}
		tourist, err := s.Users.GetByLogin(ctx, spec.touristLogin)
		if err != nil || tourist == nil {
			continue
		}
		city, _ := s.Geo.GetCityBySlug(ctx, spec.citySlug)
		var cityID *int64
		if city != nil {
			cityID = &city.ID
		}
		reqID, err := lr.CreateRequest(ctx, &domain.LookingRequest{
			AuthorID: tourist.ID, CityID: cityID, Title: spec.title, Description: spec.description,
			Formats: spec.formats, Languages: []string{"uk"}, Status: "open",
		})
		if err != nil {
			return err
		}
		for _, resp := range spec.responses {
			pid, ok := providers[resp.providerSlug]
			if !ok {
				continue
			}
			var offID *int64
			if id, ok := offerings[resp.offeringSlug]; ok {
				offID = &id
			}
			_, _ = lr.CreateResponse(ctx, &domain.LookingResponse{
				RequestID: reqID, ProviderID: pid, Message: resp.message, OfferingID: offID,
				AvailabilityNote: "Відповідь протягом доби", Formats: spec.formats,
			})
		}
	}
	return nil
}

func (s *Seeder) seedDemoPlatformReviews(ctx context.Context, providers map[string]int64) error {
	type reviewSpec struct {
		touristLogin, providerSlug string
		rating                     int
		body                       string
	}
	reviews := []reviewSpec{
		{"tourist1", "olena-beauty", 5, "Чудовий манікюр, дуже акуратно!"},
		{"tourist2", "olena-beauty", 5, "Рекомендую, приїхала додому вчасно."},
		{"tourist1", "dr-koval-berlin", 5, "Уважний лікар, все пояснив українською."},
		{"tourist2", "it-fix-warsaw", 4, "Швидко замінили екран, трохи дорого."},
		{"tourist1", "ua-kitchen-berlin", 5, "Справжній борщ, як вдома!"},
		{"tourist2", "taxi-ua-berlin", 5, "Пунктуально, комфортне авто."},
		{"tourist1", "photo-krakow", 5, "Гарні фото, приємна атмосфера."},
		{"tourist2", "ua-help-prague", 5, "Допомогли з договором оренди."},
	}
	for _, rv := range reviews {
		tourist, _ := s.Users.GetByLogin(ctx, rv.touristLogin)
		pid, ok := providers[rv.providerSlug]
		if tourist == nil || !ok {
			continue
		}
		_ = s.Providers.CreatePlatformReview(ctx, tourist.ID, "provider", pid, rv.rating, rv.body)
	}
	return nil
}

func (s *Seeder) seedDemoSuggestions(ctx context.Context, providers map[string]int64) error {
	pid, ok := providers["olena-beauty"]
	if !ok {
		return nil
	}
	var count int
	_ = s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM service_suggestions WHERE provider_id=$1`, pid).Scan(&count)
	if count > 0 {
		return nil
	}
	var beautyCatID int64
	_ = s.DB.Pool.QueryRow(ctx, `SELECT id FROM service_categories WHERE slug='beauty'`).Scan(&beautyCatID)
	_, _ = s.Providers.CreateSuggestion(ctx, pid, "Ламінування брів", "Пропоную додати послугу ламінування брів", &beautyCatID, "")
	return nil
}

func (s *Seeder) ensureEuropeanGuidesDemo(ctx context.Context, planID int64) error {
	cities := map[string]int64{}
	for _, slug := range []string{"berlin", "prague", "warsaw", "krakow", "munich"} {
		c, err := s.Geo.GetCityBySlug(ctx, slug)
		if err != nil || c == nil {
			continue
		}
		cities[slug] = c.ID
	}
	if len(cities) == 0 {
		return nil
	}

	demos := []demoGuide{
		{
			login: "guide6", slug: "taras-berlin", displayName: "Тарас Бондаренко", guideType: domain.GuideTypeGuide,
			about: "Гід по Берліну українською. Історія, стіна, музеї та сучасне мистецтво.",
			phone: "+491511111006", telegram: "@taras_berlin", email: "guide6@example.com", active: true, hasLicense: true,
			cities: cityBinds(cities, "berlin"),
			excursions: []demoExcursion{
				demoEx("berlin-wall", "Берлінська стіна та центр", "Історія поділу та обʼєднання, Checkpoint Charlie, Brandenburg.", "GROUP", 12, 35, domain.ExcursionPublished),
				demoEx("berlin-museums", "Острів музеїв", "Pergamon, Neues Museum — оглядовий маршрут.", "INDIVIDUAL", 4, 120, domain.ExcursionPublished),
			},
		},
		{
			login: "guide7", slug: "yulia-prague", displayName: "Юлія Чех", guideType: domain.GuideTypeGuide,
			about: "Прага для українців: Старе місто, замок, локальна кухня.",
			phone: "+420111111007", telegram: "@yulia_prague", email: "guide7@example.com", active: true, hasLicense: true,
			cities: cityBinds(cities, "prague"),
			excursions: []demoExcursion{
				demoEx("prague-old-town", "Старе місто", "Астрономічний годинник, Карлів міст, Jewish Quarter.", "GROUP", 15, 25, domain.ExcursionPublished),
				demoEx("prague-castle", "Празький град", "Собор, Золота вуличка, вид на місто.", "INDIVIDUAL", 5, 90, domain.ExcursionPublished),
			},
		},
		{
			login: "guide8", slug: "oleh-warsaw", displayName: "Олег Левченко", guideType: domain.GuideTypeGuide,
			about: "Варшава: від Старого міста до сучасних кварталів.",
			phone: "+48111111008", telegram: "@oleh_warsaw", email: "guide8@example.com", active: true, hasLicense: true,
			cities: cityBinds(cities, "warsaw"),
			excursions: []demoExcursion{
				demoEx("warsaw-old-town", "Старе місто Варшави", "Відновлене Старе місто, королівський маршрут.", "GROUP", 10, 30, domain.ExcursionPublished),
			},
		},
		{
			login: "guide9", slug: "nadia-krakow", displayName: "Надія Кравець", guideType: domain.GuideTypeEntertainer,
			about: "Краків: легенди, двори та казкові історії.",
			phone: "+48111111009", telegram: "@nadia_krakow", email: "guide9@example.com", active: true, hasLicense: true,
			cities: cityBinds(cities, "krakow"),
			excursions: []demoExcursion{
				demoEx("krakow-main-square", "Головна площа", "Sukiennice, Mariacki, легенди Кракова.", "GROUP", 12, 28, domain.ExcursionPublished),
				demoEx("krakow-kazimierz", "Казимierz", "Єврейський квартал, synagogues, Schindler.", "INDIVIDUAL", 4, 75, domain.ExcursionPublished),
			},
		},
	}

	for _, d := range demos {
		first, last := stringsFromLogin(d.login)
		if err := s.ensureUser(ctx, d.login, d.email, "guide12345", first, last,
			[]string{domain.RoleTourist, domain.RoleGuide}); err != nil {
			return err
		}
		if err := s.ensureDemoGuide(ctx, d, planID); err != nil {
			return fmt.Errorf("guide %s: %w", d.login, err)
		}
	}
	return nil
}

func cityBinds(cities map[string]int64, slug string) []cityBind {
	id, ok := cities[slug]
	if !ok {
		return nil
	}
	return []cityBind{{id, true}}
}

func stringsFromLogin(login string) (string, string) {
	switch login {
	case "guide6":
		return "Тарас", "Бондаренко"
	case "guide7":
		return "Юлія", "Чех"
	case "guide8":
		return "Олег", "Левченко"
	case "guide9":
		return "Надія", "Кравець"
	default:
		return "Demo", "Guide"
	}
}

func (s *Seeder) ensureFeaturedDemo(ctx context.Context) error {
	fp := postgres.NewFeaturedPlacementRepo(s.DB)

	var planGuideID, planExcID int64
	_ = s.DB.Pool.QueryRow(ctx, `SELECT id FROM subscription_plans WHERE code='featured_guide_month' LIMIT 1`).Scan(&planGuideID)
	_ = s.DB.Pool.QueryRow(ctx, `SELECT id FROM subscription_plans WHERE code='featured_excursion_month' LIMIT 1`).Scan(&planExcID)
	if planGuideID == 0 || planExcID == 0 {
		return nil
	}

	guideSlugs := []string{"ivan-gid", "anna-spb", "taras-berlin", "yulia-prague"}
	for _, slug := range guideSlugs {
		g, err := s.Guides.GetBySlug(ctx, slug)
		if err != nil || g == nil {
			continue
		}
		_ = fp.Upsert(ctx, g.ID, nil, domain.FeaturedSlotGuide, planGuideID, 30, nil)
	}

	excSlugs := []struct{ guideSlug, excSlug string }{
		{"ivan-gid", "moscow-red-square"},
		{"anna-spb", "spb-canals"},
		{"taras-berlin", "berlin-wall"},
		{"yulia-prague", "prague-old-town"},
		{"nadia-krakow", "krakow-main-square"},
	}
	for _, pair := range excSlugs {
		g, err := s.Guides.GetBySlug(ctx, pair.guideSlug)
		if err != nil || g == nil {
			continue
		}
		var excID int64
		if err := s.DB.Pool.QueryRow(ctx, `SELECT id FROM excursions WHERE guide_id=$1 AND slug=$2`, g.ID, pair.excSlug).Scan(&excID); err != nil {
			continue
		}
		_ = fp.Upsert(ctx, g.ID, &excID, domain.FeaturedSlotExcursion, planExcID, 30, nil)
	}
	return nil
}

func (s *Seeder) ensureExtraArticlesDemo(ctx context.Context) error {
	articles := postgres.NewArticleRepo(s.DB)

	type artSpec struct {
		slug, title, excerpt, body, cover, guideLogin string
		daysAgo                                       int
	}
	specs := []artSpec{
		{
			slug: "berlin-dlya-ukraintsiv", title: "Берлін для українців: перші кроки",
			excerpt: "Де шукати спільноту, медицину та послуги українською в Берліні.",
			body: `<p>Берлін — один з найбільших центрів української діаспори в Європі. Короткий гід для новоприбулих.</p>
<h2>Спільнота</h2><p>Шукайте українські центри, Telegram-канали та заходи в районах Mitte та Charlottenburg.</p>
<h2>Послуги</h2><p>На платформі Gaido знайдете лікарів, майстрів краси та транспорт українською.</p>`,
			cover: "/images/home/journal.jpg", guideLogin: "guide6", daysAgo: 3,
		},
		{
			slug: "praga-3-dni", title: "Прага за 3 дні: маршрут від гіда",
			excerpt: "Оптимальний маршрут: Старе місто, град, Vyšehrad та локальна кухня.",
			body: `<p>Три дні в Празі — достатньо для першого знайомства з містом.</p>
<h2>День 1</h2><p>Старе місто, Astronomical Clock, Charles Bridge.</p>
<h2>День 2</h2><p>Prague Castle, Malá Strana.</p>
<h2>День 3</h2><p>Vyšehrad, Náplavka, вечеря в українському ресторані.</p>`,
			cover: "/images/home/journal.jpg", guideLogin: "guide7", daysAgo: 5,
		},
		{
			slug: "yak-pidgotuvaty-ecskursiyu", title: "Як підготуватися до екскурсії",
			excerpt: "Зручне взуття, погода, вода та що уточнити у гіда заздалегідь.",
			body: `<p>Кілька порад, щоб екскурсія пройшла комфортно.</p>
<ul><li>Уточніть тривалість і точку зустрічі</li><li>Перевірте прогноз погоди</li><li>Візьміть воду та зручне взуття</li></ul>`,
			cover: "/images/home/journal.jpg", guideLogin: "guide1", daysAgo: 7,
		},
	}

	for _, spec := range specs {
		var count int
		_ = s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM articles WHERE slug=$1`, spec.slug).Scan(&count)
		if count > 0 {
			continue
		}
		var authorID *int64
		if u, _ := s.Users.GetByLogin(ctx, spec.guideLogin); u != nil {
			authorID = &u.ID
		}
		pub := time.Now().UTC().Add(-time.Duration(spec.daysAgo) * 24 * time.Hour)
		_, err := articles.Create(ctx, postgres.ArticleInput{
			Slug: spec.slug, Title: spec.title, Excerpt: spec.excerpt, BodyHTML: spec.body,
			CoverImageURL: spec.cover, Status: "PUBLISHED", AuthorID: authorID, PublishedAt: &pub,
		})
		if err != nil {
			return err
		}
	}
	return nil
}
