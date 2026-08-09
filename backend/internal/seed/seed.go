package seed

import (
	"context"
	"fmt"
	"time"

	"github.com/vitomonte/experts-tourister/internal/auth/password"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

type Seeder struct {
	DB     *postgres.DB
	Users  *postgres.UserRepo
	Geo    *postgres.GeoRepo
	Guides *postgres.GuideRepo
}

func (s *Seeder) Run(ctx context.Context) error {
	core := []struct {
		login, email, pass, firstName, lastName string
		roles                                   []string
	}{
		{"tourist1", "tourist1@example.com", "tourist12345", "Олена", "Коваленко", []string{domain.RoleTourist}},
		{"tourist2", "tourist2@example.com", "tourist12345", "Дмитро", "Іваненко", []string{domain.RoleTourist}},
		{"guide1", "guide1@example.com", "guide12345", "Іван", "Петров", []string{domain.RoleTourist, domain.RoleGuide}},
		{"guide2", "guide2@example.com", "guide12345", "Анна", "Смирнова", []string{domain.RoleTourist, domain.RoleGuide}},
		{"guide3", "guide3@example.com", "guide12345", "Михайло", "Орлов", []string{domain.RoleTourist, domain.RoleGuide}},
		{"guide4", "guide4@example.com", "guide12345", "Олена", "Козлова", []string{domain.RoleTourist, domain.RoleGuide}},
		{"guide5", "guide5@example.com", "guide12345", "Олег", "Новиков", []string{domain.RoleTourist, domain.RoleGuide}},
		{"moderator", "mod@example.com", "moderator123", "Марія", "Модератор", []string{domain.RoleModerator}},
		{"admin", "admin@example.com", "admin12345", "Адмін", "Системний", []string{domain.RoleAdmin}},
	}
	for _, a := range core {
		if err := s.ensureUser(ctx, a.login, a.email, a.pass, a.firstName, a.lastName, a.roles); err != nil {
			return fmt.Errorf("user %s: %w", a.login, err)
		}
	}

	moscowID, spbID, err := s.ensureGeo(ctx)
	if err != nil {
		return err
	}
	planID, err := s.ensurePlan(ctx)
	if err != nil {
		return err
	}
	if err := s.ensureCategories(ctx); err != nil {
		return err
	}

	demos := []demoGuide{
		{
			login: "guide1", slug: "ivan-gid", displayName: "Іван Петров", guideType: domain.GuideTypeGuide,
			about: "Історик і гід по Москві. Люблю Кремль і Патріарші ставки.",
			phone: "+79001110001", telegram: "@ivan_gid", email: "guide1@example.com", active: true, hasLicense: true,
			cities: []cityBind{{moscowID, true}},
			excursions: []demoExcursion{
				demoEx("moscow-red-square", "Червона площа та Кремль", "Класична оглядова прогулянка центром: історія Кремля, собори, оглядові майданчики та приховані дворики.", "INDIVIDUAL", 4, 4500, domain.ExcursionPublished),
				func() demoExcursion {
					e := demoEx("moscow-metro", "Московське метро", "Архітектура станцій і історії: від станції до станції з розповідями про сталінський ампір і сучасні лінії.", "GROUP", 12, 2800, domain.ExcursionPublished)
					e.transportMode = "TRANSPORT"
					e.durationMinutes = 150
					return e
				}(),
				demoEx("moscow-evening", "Вечірня Москва", "Вогні центру й набережні: найкращі ракурси для фото, вечірні види та атмосферні локації.", "INDIVIDUAL", 6, 5200, domain.ExcursionPublished),
			},
		},
		{
			login: "guide2", slug: "anna-spb", displayName: "Анна Смирнова", guideType: domain.GuideTypeEntertainer,
			about: "Конферансьє та оповідачка по Санкт-Петербургу. Театральні маршрути.",
			phone: "+79002220002", telegram: "@anna_spb", email: "guide2@example.com", active: true, hasLicense: true,
			cities: []cityBind{{spbID, true}},
			excursions: []demoExcursion{
				demoEx("spb-canals", "Канали та мости", "Пішохідна прогулянка центром і набережними: розвідні мости, двори-колодці та легенди міста.", "GROUP", 15, 3200, domain.ExcursionPublished),
				func() demoExcursion {
					e := demoEx("spb-hermitage", "Ермітаж express", "Головні зали за 3 години: від Рафаеля до імператорських інтерʼєрів з акцентом на must-see.", "INDIVIDUAL", 3, 7500, domain.ExcursionPublished)
					e.meetingPoint = "Головний вхід Ермітажу, біля Олександрівської колони."
					return e
				}(),
				demoEx("spb-white-nights", "Білі ночі", "Маршрут для пізнього вечора: набережні, розведення мостів і романтичні види.", "INDIVIDUAL", 5, 4800, domain.ExcursionPublished),
			},
		},
		{
			login: "guide3", slug: "mikhail-companion", displayName: "Михайло Орлов", guideType: domain.GuideTypeCompanion,
			about: "Компаньйон для подорожей: допоможу з маршрутом, кафе та локальними місцями.",
			phone: "+79003330003", telegram: "@mikhail_travel", email: "guide3@example.com", active: true, hasLicense: false,
			cities: []cityBind{{moscowID, true}, {spbID, false}},
			excursions: []demoExcursion{
				demoEx("moscow-gastro", "Гастро-тур по Москві", "Ринки, кавʼярні та локальна кухня: дегустації й історії місць.", "INDIVIDUAL", 2, 6000, domain.ExcursionPublished),
				demoEx("spb-courtyards", "Двори та парадні", "Незвичайний Петербург: парадні, сходи та двори-колодці.", "GROUP", 8, 2500, domain.ExcursionPublished),
			},
		},
		{
			login: "guide4", slug: "elena-art", displayName: "Олена Козлова", guideType: domain.GuideTypeGuide,
			about: "Гід з сучасного мистецтва та архітектури. Без ліцензії в демо — перевірка бейджа.",
			phone: "+79004440004", telegram: "@elena_art", email: "guide4@example.com", active: true, hasLicense: false,
			cities: []cityBind{{moscowID, true}},
			excursions: []demoExcursion{
				demoEx("moscow-art-walk", "Арт-кластери", "Винзавод, ARTPLAY та околиці: сучасне мистецтво й індустріальна архітектура.", "INDIVIDUAL", 4, 4000, domain.ExcursionPublished),
				demoEx("moscow-stalin-arch", "Сталінська висотка", "Архітектура епохи: висотки, символіка та міський контекст.", "GROUP", 10, 2200, domain.ExcursionPublished),
			},
		},
		{
			login: "guide5", slug: "oleg-draft", displayName: "Олег Новиков", guideType: domain.GuideTypeGuide,
			about: "Новий гід — профіль без активної підписки (paywall контактів).",
			phone: "+79005550005", telegram: "@oleg_draft", email: "guide5@example.com", active: false, hasLicense: true,
			cities: []cityBind{{moscowID, true}},
			excursions: []demoExcursion{
				demoEx("oleg-draft-tour", "Чернетка екскурсії", "Не опубліковано", "INDIVIDUAL", 4, 3000, domain.ExcursionDraft),
			},
		},
	}

	for _, d := range demos {
		if err := s.ensureDemoGuide(ctx, d, planID); err != nil {
			return fmt.Errorf("guide %s: %w", d.login, err)
		}
	}

	return s.ensureReviews(ctx)
}

type cityBind struct {
	id      int64
	primary bool
}

type demoExcursion struct {
	slug, title, description, excType string
	maxGuests                         int
	price                             float64
	status                            string
	durationMinutes                   int
	transportMode                     string
	childrenAllowed                   bool
	language                          string
	orgDetails, meetingPoint          string
}

func demoEx(slug, title, desc, excType string, maxGuests int, price float64, status string) demoExcursion {
	return demoExcursion{
		slug: slug, title: title, description: desc, excType: excType,
		maxGuests: maxGuests, price: price, status: status,
		durationMinutes: 180, transportMode: "WALKING", childrenAllowed: true, language: "uk",
		orgDetails: `<h3>Що взяти з собою</h3>
<ul><li>зручне взуття</li><li>за бажанням — фотоапарат</li></ul>
<h3>Скасування</h3>
<p>Умови скасування та перенесення узгоджуйте з гідом до підтвердження бронювання.</p>`,
		meetingPoint: "Точне місце зустрічі повідомимо після підтвердження.",
	}
}

type demoGuide struct {
	login, slug, displayName, guideType, about string
	phone, telegram, email                      string
	active, hasLicense                        bool
	cities                                      []cityBind
	excursions                                  []demoExcursion
}

func (s *Seeder) ensureUser(ctx context.Context, login, email, pass, firstName, lastName string, roles []string) error {
	existing, err := s.Users.GetByLogin(ctx, login)
	if err != nil {
		return err
	}
	if existing == nil {
		hash, err := password.Hash(pass)
		if err != nil {
			return err
		}
		if _, err = s.Users.Create(ctx, email, login, hash, roles); err != nil {
			return err
		}
	}
	_, err = s.DB.Pool.Exec(ctx, `UPDATE users SET first_name=$2, last_name=$3 WHERE login=$1`, login, firstName, lastName)
	return err
}

func (s *Seeder) ensureGeo(ctx context.Context) (moscowID, spbID int64, err error) {
	for _, country := range geoCatalog {
		countryID, e := s.Geo.EnsureCountry(ctx, country.slug, country.name)
		if e != nil {
			return 0, 0, e
		}
		for _, region := range country.regions {
			regionID, e := s.Geo.EnsureRegion(ctx, countryID, region.slug, region.name)
			if e != nil {
				return 0, 0, e
			}
			for _, city := range region.cities {
				cityID, e := s.Geo.EnsureCity(ctx, countryID, regionID, city.slug, city.name, city.lat, city.lng)
				if e != nil {
					return 0, 0, e
				}
				switch city.slug {
				case "moscow":
					moscowID = cityID
				case "spb":
					spbID = cityID
				}
			}
		}
	}
	if e := s.ensureWorldGeo(ctx); e != nil {
		return 0, 0, e
	}
	if e := s.ensureExtraCities(ctx); e != nil {
		return 0, 0, e
	}
	if e := s.syncCountryNamesUK(ctx); e != nil {
		return 0, 0, e
	}
	if moscowID == 0 {
		if err = s.DB.Pool.QueryRow(ctx, `SELECT id FROM cities WHERE slug='moscow'`).Scan(&moscowID); err != nil {
			return 0, 0, err
		}
	}
	if spbID == 0 {
		if err = s.DB.Pool.QueryRow(ctx, `SELECT id FROM cities WHERE slug='spb'`).Scan(&spbID); err != nil {
			return 0, 0, err
		}
	}
	return moscowID, spbID, nil
}

func (s *Seeder) ensurePlan(ctx context.Context) (int64, error) {
	var planID int64
	err := s.DB.Pool.QueryRow(ctx, `SELECT id FROM subscription_plans WHERE code='basic' LIMIT 1`).Scan(&planID)
	if err == nil {
		_, _ = s.DB.Pool.Exec(ctx, `
			UPDATE subscription_plans
			SET name=$1, description=$2, price=$3, currency=$4, plan_type=$5
			WHERE id=$6
		`, "Базове розміщення", "Розміщення профілю гіда — помісячно", 990.00, "UAH", domain.PlanTypeGuidePlacement, planID)
		return planID, nil
	}
	err = s.DB.Pool.QueryRow(ctx, `
		INSERT INTO subscription_plans (code, name, description, price, currency, duration_days, sort_order, plan_type)
		VALUES ('basic', 'Базове розміщення', 'Розміщення профілю гіда — помісячно', 990.00, 'UAH', 30, 1, $1)
		RETURNING id
	`, domain.PlanTypeGuidePlacement).Scan(&planID)
	return planID, err
}

func (s *Seeder) ensureCategories(ctx context.Context) error {
	cats := [][2]string{
		{"walking", "Пішохідні прогулянки"},
		{"art", "Мистецтво"},
		{"food", "Гастрономія"},
	}
	for _, c := range cats {
		_, err := s.DB.Pool.Exec(ctx, `
			INSERT INTO excursion_categories (slug, name) VALUES ($1,$2)
			ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
		`, c[0], c[1])
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Seeder) ensureDemoGuide(ctx context.Context, d demoGuide, planID int64) error {
	u, err := s.Users.GetByLogin(ctx, d.login)
	if err != nil || u == nil {
		return fmt.Errorf("user not found")
	}

	g, err := s.Guides.GetByUserID(ctx, u.ID)
	if err != nil {
		return err
	}
	if g == nil {
		id, e := s.Guides.CreateProfile(ctx, u.ID, d.guideType, d.displayName, d.slug)
		if e != nil {
			return e
		}
		g, err = s.Guides.GetByID(ctx, id)
		if err != nil || g == nil {
			return fmt.Errorf("profile create failed")
		}
	}

	status := domain.GuideStatusWaitingPayment
	if d.active {
		status = domain.GuideStatusActive
	}
	_, err = s.DB.Pool.Exec(ctx, `
		UPDATE guide_profiles SET
			guide_type=$2, display_name=$3, about=$4, website_slug=$5,
			phone=$6, telegram=$7, email=$8, preferred_contact_method='telegram',
			status=$9, rating_avg=COALESCE(rating_avg,0), updated_at=NOW()
		WHERE id=$1
	`, g.ID, d.guideType, d.displayName, d.about, d.slug, d.phone, d.telegram, d.email, status)
	if err != nil {
		return err
	}

	for _, c := range d.cities {
		_ = s.Guides.AddCity(ctx, g.ID, c.id, c.primary)
	}

	if d.hasLicense {
		docType := domain.DocTypeGuideLicense
		if d.guideType == domain.GuideTypeEntertainer {
			docType = domain.DocTypeEntertainerLicense
		}
		var docCount int
		_ = s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM guide_documents WHERE guide_id=$1 AND type=$2`, g.ID, docType).Scan(&docCount)
		if docCount == 0 {
			_ = s.Guides.AddDocument(ctx, g.ID, docType, "seed/"+d.slug+"/license.pdf", "application/pdf", 1024, "seed")
		}
	}

	if d.active {
		now := time.Now().UTC()
		expires := now.Add(30 * 24 * time.Hour)
		var subCount int
		_ = s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM guide_subscriptions WHERE guide_id=$1 AND status=$2`, g.ID, domain.SubscriptionActive).Scan(&subCount)
		if subCount == 0 {
			_, err = s.DB.Pool.Exec(ctx, `
				INSERT INTO guide_subscriptions (guide_id, plan_id, status, starts_at, expires_at, paid_at, activation_source)
				VALUES ($1,$2,$3,$4,$5,$4,$6)
			`, g.ID, planID, domain.SubscriptionActive, now, expires, domain.ActivationAdminBypass)
			if err != nil {
				return err
			}
		}
	}

	var catID int64
	_ = s.DB.Pool.QueryRow(ctx, `SELECT id FROM excursion_categories WHERE slug='walking' LIMIT 1`).Scan(&catID)

	for _, ex := range d.excursions {
		var exists int
		_ = s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM excursions WHERE guide_id=$1 AND slug=$2`, g.ID, ex.slug).Scan(&exists)
		bodyHTML := `<p>` + ex.description + `</p>`
		if ex.slug == "moscow-red-square" {
			bodyHTML = `<h2>Що вас очікує</h2>
<p>` + ex.description + `</p>
<h3>У вартість входить</h3>
<ul><li>послуги гіда</li><li>маршрут центром</li></ul>
<h3>Не входить</h3>
<ul><li>вхідні квитки за бажанням</li><li>харчування</li></ul>
<h3>Що взяти з собою</h3>
<ul><li>зручне взуття</li><li>фотоапарат</li></ul>`
		}
		if exists > 0 {
			// Do not overwrite body/booking text once a guide has edited them.
			_, err = s.DB.Pool.Exec(ctx, `
				UPDATE excursions SET title=$3, description=$4, meeting_point=$6, language=$7,
					organizational_details = CASE WHEN COALESCE(organizational_details, '') = '' THEN $5 ELSE organizational_details END,
					body_html = CASE WHEN COALESCE(body_html, '') = '' THEN $8 ELSE body_html END
				WHERE guide_id=$1 AND slug=$2
			`, g.ID, ex.slug, ex.title, ex.description, ex.orgDetails, ex.meetingPoint, ex.language, bodyHTML)
			if err != nil {
				return err
			}
			continue
		}
		cityID := pickCityID(d.cities, ex.slug)
		_, err = s.DB.Pool.Exec(ctx, `
			INSERT INTO excursions (guide_id, city_id, category_id, title, slug, description, type, max_guests, price_from, currency, status,
				duration_minutes, transport_mode, children_allowed, language, organizational_details, meeting_point)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'EUR',$10,$11,$12,$13,$14,$15,$16)
		`, g.ID, cityID, nullableCat(catID), ex.title, ex.slug, ex.description, ex.excType, ex.maxGuests, ex.price, ex.status,
			ex.durationMinutes, ex.transportMode, ex.childrenAllowed, ex.language, ex.orgDetails, ex.meetingPoint)
		if err != nil {
			return err
		}
	}

	return nil
}

func pickCityID(cities []cityBind, slug string) int64 {
	if len(cities) == 0 {
		return 0
	}
	if len(cities) > 1 && (len(slug) >= 4 && slug[:4] == "spb-") {
		return cities[1].id
	}
	return cities[0].id
}

func nullableCat(id int64) *int64 {
	if id == 0 {
		return nil
	}
	return &id
}

func (s *Seeder) ensureReviews(ctx context.Context) error {
	type reviewSeed struct {
		touristLogin, guideSlug, excursionSlug string
		rating                                 int
		text                                   string
	}
	reviews := []reviewSeed{
		{"tourist1", "ivan-gid", "moscow-red-square", 5, "Чудова екскурсія центром, усе чітко й цікаво!"},
		{"tourist1", "anna-spb", "spb-canals", 5, "Анна — справжня оповідачка, Петербург ожив."},
		{"tourist2", "ivan-gid", "moscow-metro", 4, "Гарний маршрут, трохи швидко, але сподобалось."},
		{"tourist2", "mikhail-companion", "moscow-gastro", 5, "Допоміг спланувати день, дуже зручно."},
		{"tourist2", "elena-art", "moscow-art-walk", 4, "Цікаво про сучасне мистецтво."},
	}

	reviewsRepo := postgres.NewReviewRepo(s.DB)
	for _, rv := range reviews {
		tourist, err := s.Users.GetByLogin(ctx, rv.touristLogin)
		if err != nil || tourist == nil {
			continue
		}
		g, err := s.Guides.GetBySlug(ctx, rv.guideSlug)
		if err != nil || g == nil {
			continue
		}
		var excursionID int64
		if err := s.DB.Pool.QueryRow(ctx, `SELECT id FROM excursions WHERE guide_id=$1 AND slug=$2`, g.ID, rv.excursionSlug).Scan(&excursionID); err != nil {
			continue
		}
		var count int
		_ = s.DB.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM guide_reviews WHERE author_id=$1 AND excursion_id=$2`, tourist.ID, excursionID).Scan(&count)
		if count > 0 {
			_, _ = s.DB.Pool.Exec(ctx, `UPDATE guide_reviews SET text=$3, rating=$4, guide_id=$5 WHERE author_id=$1 AND excursion_id=$2`,
				tourist.ID, excursionID, rv.text, rv.rating, g.ID)
			continue
		}
		id, err := reviewsRepo.Create(ctx, g.ID, tourist.ID, excursionID, rv.rating, rv.text)
		if err != nil {
			return err
		}
		_ = reviewsRepo.SetStatus(ctx, id, domain.ReviewPublished)
		_ = reviewsRepo.RecalcRating(ctx, g.ID)
	}
	return nil
}
