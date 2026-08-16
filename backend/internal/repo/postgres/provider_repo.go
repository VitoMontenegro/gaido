package postgres

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type ProviderRepo struct{ db *DB }

func NewProviderRepo(db *DB) *ProviderRepo { return &ProviderRepo{db: db} }

type DiscoverParams struct {
	CityID       int64
	RegionID     int64
	Lat          float64
	Lng          float64
	RadiusKm     int
	Query        string
	CategorySlug string
	ServiceSlug  string
	Format       string
	MinRating    float64
	VerifiedOnly bool
	HasAvailability bool
	ZoneFilter   string
	SortNearest  bool
	Limit        int
	Offset       int
	Section      string // jobs, places, help, transport — filter by category slug prefix
}

func (r *ProviderRepo) ListCategories(ctx context.Context) ([]domain.ServiceCategory, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, slug, name, icon, sort_order FROM service_categories
		WHERE is_active=true ORDER BY sort_order, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.ServiceCategory
	for rows.Next() {
		var c domain.ServiceCategory
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.Icon, &c.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *ProviderRepo) ListServicesByCategory(ctx context.Context, categoryID int64) ([]domain.Service, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, category_id, slug, name, sort_order FROM services
		WHERE category_id=$1 AND is_active=true ORDER BY sort_order, name`, categoryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.Service
	for rows.Next() {
		var s domain.Service
		if err := rows.Scan(&s.ID, &s.CategoryID, &s.Slug, &s.Name, &s.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *ProviderRepo) GetCategoryBySlug(ctx context.Context, slug string) (*domain.ServiceCategory, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, slug, name, icon, sort_order FROM service_categories WHERE slug=$1 AND is_active=true`, slug)
	var c domain.ServiceCategory
	err := row.Scan(&c.ID, &c.Slug, &c.Name, &c.Icon, &c.SortOrder)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *ProviderRepo) GetProviderBySlug(ctx context.Context, slug string) (*domain.Provider, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, user_id, display_name, business_name, profession, about, website_slug, avatar_url,
			rating_avg, rating_count, response_hours, status, phone, email, telegram, whatsapp, viber,
			instagram, facebook, website, primary_city_id, languages, created_at, updated_at
		FROM providers WHERE website_slug=$1`, slug)
	return scanProvider(row)
}

func (r *ProviderRepo) GetProviderByUserID(ctx context.Context, userID int64) (*domain.Provider, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, user_id, display_name, business_name, profession, about, website_slug, avatar_url,
			rating_avg, rating_count, response_hours, status, phone, email, telegram, whatsapp, viber,
			instagram, facebook, website, primary_city_id, languages, created_at, updated_at
		FROM providers WHERE user_id=$1`, userID)
	return scanProvider(row)
}

func scanProvider(row pgx.Row) (*domain.Provider, error) {
	var p domain.Provider
	err := row.Scan(&p.ID, &p.UserID, &p.DisplayName, &p.BusinessName, &p.Profession, &p.About,
		&p.WebsiteSlug, &p.AvatarURL, &p.RatingAvg, &p.RatingCount, &p.ResponseHours, &p.Status,
		&p.Phone, &p.Email, &p.Telegram, &p.Whatsapp, &p.Viber, &p.Instagram, &p.Facebook, &p.Website,
		&p.PrimaryCityID, &p.Languages, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &p, err
}

func (r *ProviderRepo) CreateProvider(ctx context.Context, userID int64, slug, displayName string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO providers (user_id, website_slug, display_name, status)
		VALUES ($1, $2, $3, $4) RETURNING id`,
		userID, slug, displayName, domain.ProviderStatusNew).Scan(&id)
	return id, err
}

func (r *ProviderRepo) UpdateProvider(ctx context.Context, p *domain.Provider) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE providers SET display_name=$2, business_name=$3, profession=$4, about=$5, avatar_url=$6,
			response_hours=$7, phone=$8, email=$9, telegram=$10, whatsapp=$11, viber=$12,
			instagram=$13, facebook=$14, website=$15, primary_city_id=$16, languages=$17, updated_at=NOW()
		WHERE id=$1 AND user_id=$18`,
		p.ID, p.DisplayName, p.BusinessName, p.Profession, p.About, p.AvatarURL, p.ResponseHours,
		p.Phone, p.Email, p.Telegram, p.Whatsapp, p.Viber, p.Instagram, p.Facebook, p.Website,
		p.PrimaryCityID, p.Languages, p.UserID)
	return err
}

func (r *ProviderRepo) ListOfferingsByProvider(ctx context.Context, providerID int64, publicOnly bool) ([]domain.ServiceOffering, error) {
	q := `
		SELECT id, provider_id, service_id, category_id, title, slug, description, formats, languages,
			status, has_availability, event_at, rating_avg, rating_count
		FROM service_offerings WHERE provider_id=$1`
	if publicOnly {
		q += ` AND status='published'`
	}
	q += ` ORDER BY title`
	rows, err := r.db.Pool.Query(ctx, q, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanOfferings(rows)
}

func (r *ProviderRepo) GetOfferingBySlug(ctx context.Context, providerID int64, slug string) (*domain.ServiceOffering, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, provider_id, service_id, category_id, title, slug, description, formats, languages,
			status, has_availability, event_at, rating_avg, rating_count
		FROM service_offerings WHERE provider_id=$1 AND slug=$2`, providerID, slug)
	return scanOffering(row)
}

func scanOffering(row pgx.Row) (*domain.ServiceOffering, error) {
	var o domain.ServiceOffering
	err := row.Scan(&o.ID, &o.ProviderID, &o.ServiceID, &o.CategoryID, &o.Title, &o.Slug, &o.Description,
		&o.Formats, &o.Languages, &o.Status, &o.HasAvailability, &o.EventAt, &o.RatingAvg, &o.RatingCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &o, err
}

func scanOfferings(rows pgx.Rows) ([]domain.ServiceOffering, error) {
	var out []domain.ServiceOffering
	for rows.Next() {
		var o domain.ServiceOffering
		if err := rows.Scan(&o.ID, &o.ProviderID, &o.ServiceID, &o.CategoryID, &o.Title, &o.Slug, &o.Description,
			&o.Formats, &o.Languages, &o.Status, &o.HasAvailability, &o.EventAt, &o.RatingAvg, &o.RatingCount); err != nil {
			return nil, err
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ProviderRepo) ListPointsByProvider(ctx context.Context, providerID int64) ([]domain.ServicePoint, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, provider_id, label, address_text, district, address_visibility, latitude, longitude,
			hours_text, description, photo_url, city_id, is_active
		FROM service_points WHERE provider_id=$1 AND is_active=true ORDER BY label`, providerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.ServicePoint
	for rows.Next() {
		var p domain.ServicePoint
		if err := rows.Scan(&p.ID, &p.ProviderID, &p.Label, &p.AddressText, &p.District, &p.AddressVisibility,
			&p.Latitude, &p.Longitude, &p.HoursText, &p.Description, &p.PhotoURL, &p.CityID, &p.IsActive); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *ProviderRepo) ListZonesByOffering(ctx context.Context, offeringID int64) ([]domain.ServiceZone, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, provider_id, offering_id, zone_kind, zone_type, label, city_id, region_id, radius_km,
			from_city_id, to_city_id, center_lat, center_lng
		FROM service_zones WHERE offering_id=$1 AND is_active=true`, offeringID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanZones(rows)
}

func scanZones(rows pgx.Rows) ([]domain.ServiceZone, error) {
	var out []domain.ServiceZone
	for rows.Next() {
		var z domain.ServiceZone
		if err := rows.Scan(&z.ID, &z.ProviderID, &z.OfferingID, &z.ZoneKind, &z.ZoneType, &z.Label,
			&z.CityID, &z.RegionID, &z.RadiusKm, &z.FromCityID, &z.ToCityID, &z.CenterLat, &z.CenterLng); err != nil {
			return nil, err
		}
		out = append(out, z)
	}
	return out, rows.Err()
}

func (r *ProviderRepo) HasVerifiedDocs(ctx context.Context, providerID int64) (bool, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM provider_documents WHERE provider_id=$1 AND status=$2`,
		providerID, domain.DocStatusVerified).Scan(&n)
	return n > 0, err
}

func (r *ProviderRepo) CountActivePoints(ctx context.Context, providerID int64) (int, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM service_points WHERE provider_id=$1 AND is_active=true`, providerID).Scan(&n)
	return n, err
}

func (r *ProviderRepo) Discover(ctx context.Context, p DiscoverParams) ([]domain.DiscoverOfferingRow, int, error) {
	if p.Limit <= 0 {
		p.Limit = 24
	}
	if p.RadiusKm <= 0 {
		p.RadiusKm = 20
	}

	args := []any{}
	argN := 1
	where := []string{"o.status = 'published'", "pr.status IN ('verified', 'moderation')"}

	var anchorLat, anchorLng float64
	if p.Lat != 0 || p.Lng != 0 {
		anchorLat, anchorLng = p.Lat, p.Lng
	} else if p.CityID > 0 {
		_ = r.db.Pool.QueryRow(ctx, `SELECT latitude, longitude FROM cities WHERE id=$1`, p.CityID).Scan(&anchorLat, &anchorLng)
	}
	hasAnchor := anchorLat != 0 || anchorLng != 0

	distanceExpr := "NULL::float8"
	if hasAnchor {
		radiusArg := argN
		args = append(args, p.RadiusKm*1000)
		argN++

		lngArg := argN
		latArg := argN + 1
		args = append(args, anchorLng, anchorLat)
		argN += 2

		distanceExpr = fmt.Sprintf(`(
			SELECT MIN(ST_Distance(sp.location, ST_SetSRID(ST_MakePoint($%d, $%d), 4326)::geography) / 1000.0)
			FROM offering_points op2 JOIN service_points sp ON sp.id = op2.point_id
			WHERE op2.offering_id = o.id AND sp.is_active AND sp.location IS NOT NULL
		)`, lngArg, latArg)

		searchRadiusKmArg := argN
		args = append(args, p.RadiusKm)
		argN++

		cityArg := argN
		regionArg := argN + 1
		regionCheckArg := argN + 2
		args = append(args, p.CityID, p.RegionID, p.RegionID)
		argN += 3

		geoMatch := fmt.Sprintf(`(
			EXISTS (
				SELECT 1 FROM offering_points op
				JOIN service_points sp ON sp.id = op.point_id
				WHERE op.offering_id = o.id AND sp.is_active AND sp.location IS NOT NULL
				AND ST_DWithin(sp.location, ST_SetSRID(ST_MakePoint($%d, $%d), 4326)::geography, $%d)
			)
			OR EXISTS (
				SELECT 1 FROM service_zones sz
				WHERE sz.offering_id = o.id AND sz.is_active AND (
					(sz.center_lat IS NOT NULL AND ST_DWithin(
						ST_SetSRID(ST_MakePoint(sz.center_lng, sz.center_lat), 4326)::geography,
						ST_SetSRID(ST_MakePoint($%d, $%d), 4326)::geography, COALESCE(sz.radius_km, $%d) * 1000
					))
					OR (sz.city_id = $%d)
					OR (sz.region_id = $%d AND $%d > 0)
				)
			)
			OR 'online' = ANY(o.formats)
		)`, lngArg, latArg, radiusArg, lngArg, latArg, searchRadiusKmArg, cityArg, regionArg, regionCheckArg)
		where = append(where, geoMatch)
	} else if p.RegionID > 0 {
		where = append(where, fmt.Sprintf(`(
			pr.primary_city_id IN (SELECT id FROM cities WHERE region_id = $%d)
			OR EXISTS (SELECT 1 FROM service_zones sz WHERE sz.offering_id = o.id AND sz.region_id = $%d)
		)`, argN, argN))
		args = append(args, p.RegionID)
		argN++
	} else if p.CityID > 0 {
		where = append(where, fmt.Sprintf(`(
			pr.primary_city_id = $%d
			OR EXISTS (SELECT 1 FROM service_points sp JOIN offering_points op ON op.point_id = sp.id
				WHERE op.offering_id = o.id AND sp.city_id = $%d)
		)`, argN, argN))
		args = append(args, p.CityID)
		argN++
	}

	if p.Query != "" {
		where = append(where, fmt.Sprintf(`(
			o.title ILIKE $%d OR o.description ILIKE $%d OR pr.display_name ILIKE $%d
		)`, argN, argN, argN))
		args = append(args, "%"+p.Query+"%")
		argN++
	}
	if p.CategorySlug != "" {
		where = append(where, fmt.Sprintf(`sc.slug = $%d`, argN))
		args = append(args, p.CategorySlug)
		argN++
	}
	if p.ServiceSlug != "" {
		where = append(where, fmt.Sprintf(`sv.slug = $%d`, argN))
		args = append(args, p.ServiceSlug)
		argN++
	}
	if p.Format != "" {
		where = append(where, fmt.Sprintf(`$%d = ANY(o.formats)`, argN))
		args = append(args, p.Format)
		argN++
	}
	if p.MinRating > 0 {
		where = append(where, fmt.Sprintf(`o.rating_avg >= $%d`, argN))
		args = append(args, p.MinRating)
		argN++
	}
	if p.VerifiedOnly {
		where = append(where, `pr.status = 'verified'`)
	}
	if p.HasAvailability {
		where = append(where, `o.has_availability = true`)
	}
	if p.Section != "" {
		sectionSlugs := sectionCategorySlugs(p.Section)
		if len(sectionSlugs) > 0 {
			where = append(where, fmt.Sprintf(`sc.slug = ANY($%d)`, argN))
			args = append(args, sectionSlugs)
			argN++
		}
	}

	whereSQL := strings.Join(where, " AND ")

	countSQL := fmt.Sprintf(`
		SELECT COUNT(DISTINCT o.id) FROM service_offerings o
		JOIN providers pr ON pr.id = o.provider_id
		JOIN service_categories sc ON sc.id = o.category_id
		LEFT JOIN services sv ON sv.id = o.service_id
		WHERE %s`, whereSQL)
	var total int
	if err := r.db.Pool.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listSQL := fmt.Sprintf(`
		SELECT DISTINCT ON (o.id)
			o.id, o.provider_id, o.service_id, o.category_id, o.title, o.slug, o.description, o.formats, o.languages,
			o.status, o.has_availability, o.event_at, o.rating_avg, o.rating_count,
			pr.id, pr.user_id, pr.display_name, pr.business_name, pr.profession, pr.about, pr.website_slug,
			pr.avatar_url, pr.rating_avg, pr.rating_count, pr.response_hours, pr.status,
			COALESCE(pr.phone,''), COALESCE(pr.email,''), COALESCE(pr.telegram,''), COALESCE(pr.whatsapp,''),
			COALESCE(pr.viber,''), COALESCE(pr.instagram,''), COALESCE(pr.facebook,''), COALESCE(pr.website,''),
			pr.primary_city_id, pr.languages, pr.created_at, pr.updated_at,
			sc.name, sc.slug, COALESCE(sv.name,''), COALESCE(sp_city.name, ci.name, ''),
			COALESCE(sp.label,''), COALESCE(sp.district,''),
			%s AS distance_km,
			EXISTS(SELECT 1 FROM provider_documents pd WHERE pd.provider_id = pr.id AND pd.status = 'verified') AS has_verified
		FROM service_offerings o
		JOIN providers pr ON pr.id = o.provider_id
		JOIN service_categories sc ON sc.id = o.category_id
		LEFT JOIN services sv ON sv.id = o.service_id
		LEFT JOIN cities ci ON ci.id = pr.primary_city_id
		LEFT JOIN offering_points op ON op.offering_id = o.id
		LEFT JOIN service_points sp ON sp.id = op.point_id AND sp.is_active
		LEFT JOIN cities sp_city ON sp_city.id = sp.city_id
		WHERE %s
		ORDER BY o.id, distance_km ASC NULLS LAST`, distanceExpr, whereSQL)

	rows, err := r.db.Pool.Query(ctx, listSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []domain.DiscoverOfferingRow
	for rows.Next() {
		var row domain.DiscoverOfferingRow
		var dist *float64
		if err := rows.Scan(
			&row.Offering.ID, &row.Offering.ProviderID, &row.Offering.ServiceID, &row.Offering.CategoryID,
			&row.Offering.Title, &row.Offering.Slug, &row.Offering.Description, &row.Offering.Formats, &row.Offering.Languages,
			&row.Offering.Status, &row.Offering.HasAvailability, &row.Offering.EventAt, &row.Offering.RatingAvg, &row.Offering.RatingCount,
			&row.Provider.ID, &row.Provider.UserID, &row.Provider.DisplayName, &row.Provider.BusinessName, &row.Provider.Profession,
			&row.Provider.About, &row.Provider.WebsiteSlug, &row.Provider.AvatarURL, &row.Provider.RatingAvg, &row.Provider.RatingCount,
			&row.Provider.ResponseHours, &row.Provider.Status,
			&row.Provider.Phone, &row.Provider.Email, &row.Provider.Telegram, &row.Provider.Whatsapp, &row.Provider.Viber,
			&row.Provider.Instagram, &row.Provider.Facebook, &row.Provider.Website,
			&row.Provider.PrimaryCityID, &row.Provider.Languages, &row.Provider.CreatedAt, &row.Provider.UpdatedAt,
			&row.CategoryName, &row.CategorySlug, &row.ServiceName, &row.CityName, &row.PointLabel, &row.PointDistrict,
			&dist, &row.HasVerifiedDocs,
		); err != nil {
			return nil, 0, err
		}
		row.DistanceKm = dist
		out = append(out, row)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	// Re-sort in memory since DISTINCT ON breaks desired order
	if p.SortNearest && hasAnchor {
		// already have distance; sort slice
		sortDiscoverByDistance(out)
	}

	start := p.Offset
	if start > len(out) {
		return []domain.DiscoverOfferingRow{}, total, nil
	}
	end := start + p.Limit
	if end > len(out) {
		end = len(out)
	}
	return out[start:end], total, nil
}

func sortDiscoverByDistance(rows []domain.DiscoverOfferingRow) {
	for i := 0; i < len(rows); i++ {
		for j := i + 1; j < len(rows); j++ {
			di, dj := rows[i].DistanceKm, rows[j].DistanceKm
			if di == nil || (dj != nil && *dj < *di) {
				rows[i], rows[j] = rows[j], rows[i]
			}
		}
	}
}

func sectionCategorySlugs(section string) []string {
	switch section {
	case "transport":
		return []string{"transport-taxi"}
	case "places":
		return []string{"ukrainian-food", "shops", "ukrainian-places"}
	case "help":
		return []string{"help-ukrainians"}
	default:
		return nil
	}
}

func (r *ProviderRepo) DiscoverMapPoints(ctx context.Context, p DiscoverParams) ([]domain.DiscoverMapPoint, error) {
	rows, _, err := r.Discover(ctx, p)
	if err != nil {
		return nil, err
	}
	var points []domain.DiscoverMapPoint
	seen := map[int64]bool{}
	for _, row := range rows {
		pts, err := r.ListPointsForOffering(ctx, row.Offering.ID)
		if err != nil {
			continue
		}
		for _, pt := range pts {
			if seen[pt.ID] {
				continue
			}
			seen[pt.ID] = true
			lat, lng := publicCoords(pt)
			points = append(points, domain.DiscoverMapPoint{
				PointID: pt.ID, OfferingID: row.Offering.ID, ProviderID: row.Provider.ID,
				Title: row.Offering.Title, Label: pt.Label,
				CityName: row.CityName, ProviderName: row.Provider.DisplayName,
				ProviderSlug: row.Provider.WebsiteSlug, CategoryName: row.CategoryName,
				Lat: lat, Lng: lng, Category: row.CategorySlug,
			})
		}
		if len(pts) == 0 {
			zones, err := r.ListZonesByOffering(ctx, row.Offering.ID)
			if err != nil {
				continue
			}
			for _, z := range zones {
				if z.CenterLat == 0 && z.CenterLng == 0 {
					continue
				}
				key := -row.Offering.ID
				if seen[key] {
					continue
				}
				seen[key] = true
				label := z.Label
				if label == "" {
					label = row.Offering.Title
				}
				points = append(points, domain.DiscoverMapPoint{
					OfferingID: row.Offering.ID, ProviderID: row.Provider.ID,
					Title: row.Offering.Title, Label: label,
					CityName: row.CityName, ProviderName: row.Provider.DisplayName,
					ProviderSlug: row.Provider.WebsiteSlug, CategoryName: row.CategoryName,
					Lat: z.CenterLat, Lng: z.CenterLng, Category: row.CategorySlug,
				})
			}
		}
	}
	return points, nil
}

func publicCoords(p domain.ServicePoint) (float64, float64) {
	switch p.AddressVisibility {
	case domain.AddressHidden:
		return p.Latitude, p.Longitude // still show approximate city-level marker
	case domain.AddressApproximate, domain.AddressDistrict:
		// jitter slightly for privacy (~200m)
		return p.Latitude + 0.002, p.Longitude + 0.002
	default:
		return p.Latitude, p.Longitude
	}
}

func (r *ProviderRepo) ListPointsForOffering(ctx context.Context, offeringID int64) ([]domain.ServicePoint, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT sp.id, sp.provider_id, sp.label, sp.address_text, sp.district, sp.address_visibility,
			sp.latitude, sp.longitude, sp.hours_text, sp.description, sp.photo_url, sp.city_id, sp.is_active
		FROM service_points sp
		JOIN offering_points op ON op.point_id = sp.id
		WHERE op.offering_id = $1 AND sp.is_active`, offeringID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.ServicePoint
	for rows.Next() {
		var p domain.ServicePoint
		if err := rows.Scan(&p.ID, &p.ProviderID, &p.Label, &p.AddressText, &p.District, &p.AddressVisibility,
			&p.Latitude, &p.Longitude, &p.HoursText, &p.Description, &p.PhotoURL, &p.CityID, &p.IsActive); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *ProviderRepo) UpsertOffering(ctx context.Context, o *domain.ServiceOffering) (int64, error) {
	if o.ID > 0 {
		_, err := r.db.Pool.Exec(ctx, `
			UPDATE service_offerings SET service_id=$2, category_id=$3, title=$4, slug=$5, description=$6,
				formats=$7, languages=$8, status=$9, has_availability=$10, event_at=$11, updated_at=NOW()
			WHERE id=$1 AND provider_id=$12`,
			o.ID, o.ServiceID, o.CategoryID, o.Title, o.Slug, o.Description, o.Formats, o.Languages,
			o.Status, o.HasAvailability, o.EventAt, o.ProviderID)
		return o.ID, err
	}
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO service_offerings (provider_id, service_id, category_id, title, slug, description, formats, languages, status, has_availability, event_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
		o.ProviderID, o.ServiceID, o.CategoryID, o.Title, o.Slug, o.Description, o.Formats, o.Languages,
		o.Status, o.HasAvailability, o.EventAt).Scan(&id)
	return id, err
}

func (r *ProviderRepo) UpsertPoint(ctx context.Context, p *domain.ServicePoint) (int64, error) {
	if p.ID > 0 {
		_, err := r.db.Pool.Exec(ctx, `
			UPDATE service_points SET label=$2, address_text=$3, district=$4, address_visibility=$5,
				latitude=$6, longitude=$7, hours_text=$8, description=$9, photo_url=$10, city_id=$11, is_active=$12, updated_at=NOW()
			WHERE id=$1 AND provider_id=$13`,
			p.ID, p.Label, p.AddressText, p.District, p.AddressVisibility, p.Latitude, p.Longitude,
			p.HoursText, p.Description, p.PhotoURL, p.CityID, p.IsActive, p.ProviderID)
		return p.ID, err
	}
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO service_points (provider_id, label, address_text, district, address_visibility, latitude, longitude, hours_text, description, photo_url, city_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
		p.ProviderID, p.Label, p.AddressText, p.District, p.AddressVisibility, p.Latitude, p.Longitude,
		p.HoursText, p.Description, p.PhotoURL, p.CityID).Scan(&id)
	return id, err
}

func (r *ProviderRepo) LinkOfferingPoint(ctx context.Context, offeringID, pointID int64) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO offering_points (offering_id, point_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
		offeringID, pointID)
	return err
}

func (r *ProviderRepo) UpsertZone(ctx context.Context, z *domain.ServiceZone) (int64, error) {
	if z.ID > 0 {
		_, err := r.db.Pool.Exec(ctx, `
			UPDATE service_zones SET zone_kind=$2, zone_type=$3, label=$4, city_id=$5, region_id=$6, radius_km=$7,
				from_city_id=$8, to_city_id=$9, center_lat=$10, center_lng=$11, is_active=true
			WHERE id=$1`, z.ID, z.ZoneKind, z.ZoneType, z.Label, z.CityID, z.RegionID, z.RadiusKm,
			z.FromCityID, z.ToCityID, z.CenterLat, z.CenterLng)
		return z.ID, err
	}
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO service_zones (provider_id, offering_id, zone_kind, zone_type, label, city_id, region_id, radius_km, from_city_id, to_city_id, center_lat, center_lng)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
		z.ProviderID, z.OfferingID, z.ZoneKind, z.ZoneType, z.Label, z.CityID, z.RegionID, z.RadiusKm,
		z.FromCityID, z.ToCityID, z.CenterLat, z.CenterLng).Scan(&id)
	return id, err
}

type JobRepo struct{ db *DB }

func NewJobRepo(db *DB) *JobRepo { return &JobRepo{db: db} }

func (r *JobRepo) ListJobs(ctx context.Context, cityID, regionID int64, limit, offset int) ([]domain.Job, int, error) {
	if limit <= 0 {
		limit = 24
	}
	where := []string{"status = 'published'"}
	args := []any{}
	n := 1
	if cityID > 0 {
		where = append(where, fmt.Sprintf("city_id = $%d", n))
		args = append(args, cityID)
		n++
	} else if regionID > 0 {
		where = append(where, fmt.Sprintf("region_id = $%d", n))
		args = append(args, regionID)
		n++
	}
	whereSQL := strings.Join(where, " AND ")
	var total int
	if err := r.db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM jobs WHERE "+whereSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, offset)
	rows, err := r.db.Pool.Query(ctx, fmt.Sprintf(`
		SELECT id, provider_id, title, company, city_id, region_id, description, requirements, schedule_text,
			salary_text, language, employment_type, contact_text, contact_url, status
		FROM jobs WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`, whereSQL, n, n+1), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	var out []domain.Job
	for rows.Next() {
		var j domain.Job
		if err := rows.Scan(&j.ID, &j.ProviderID, &j.Title, &j.Company, &j.CityID, &j.RegionID, &j.Description,
			&j.Requirements, &j.ScheduleText, &j.SalaryText, &j.Language, &j.EmploymentType, &j.ContactText, &j.ContactURL, &j.Status); err != nil {
			return nil, 0, err
		}
		out = append(out, j)
	}
	return out, total, rows.Err()
}

func (r *JobRepo) CreateJob(ctx context.Context, j *domain.Job) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO jobs (provider_id, title, company, city_id, region_id, description, requirements, schedule_text,
			salary_text, language, employment_type, contact_text, contact_url, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
		j.ProviderID, j.Title, j.Company, j.CityID, j.RegionID, j.Description, j.Requirements, j.ScheduleText,
		j.SalaryText, j.Language, j.EmploymentType, j.ContactText, j.ContactURL, j.Status).Scan(&id)
	return id, err
}

type LookingRepo struct{ db *DB }

func NewLookingRepo(db *DB) *LookingRepo { return &LookingRepo{db: db} }

func (r *LookingRepo) CreateRequest(ctx context.Context, req *domain.LookingRequest) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO looking_requests (author_id, city_id, region_id, title, description, formats, languages, needed_date, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open') RETURNING id`,
		req.AuthorID, req.CityID, req.RegionID, req.Title, req.Description, req.Formats, req.Languages, req.NeededDate).Scan(&id)
	return id, err
}

func (r *LookingRepo) ListRequests(ctx context.Context, cityID int64, limit int) ([]domain.LookingRequest, error) {
	if limit <= 0 {
		limit = 50
	}
	q := `SELECT id, author_id, city_id, region_id, title, description, formats, languages, needed_date, status, created_at
		FROM looking_requests WHERE status='open'`
	args := []any{limit}
	if cityID > 0 {
		q += ` AND city_id=$2`
		args = []any{limit, cityID}
	}
	q += ` ORDER BY created_at DESC LIMIT $1`
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.LookingRequest
	for rows.Next() {
		var lr domain.LookingRequest
		if err := rows.Scan(&lr.ID, &lr.AuthorID, &lr.CityID, &lr.RegionID, &lr.Title, &lr.Description,
			&lr.Formats, &lr.Languages, &lr.NeededDate, &lr.Status, &lr.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, lr)
	}
	return out, rows.Err()
}

func (r *LookingRepo) CreateResponse(ctx context.Context, resp *domain.LookingResponse) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO looking_responses (request_id, provider_id, message, offering_id, availability_note, formats)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
		resp.RequestID, resp.ProviderID, resp.Message, resp.OfferingID, resp.AvailabilityNote, resp.Formats).Scan(&id)
	return id, err
}

func (r *ProviderRepo) CreatePlatformReview(ctx context.Context, authorID int64, targetType string, targetID int64, rating int, body string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO platform_reviews (author_id, target_type, target_id, rating, body, status)
		VALUES ($1,$2,$3,$4,$5,'published') ON CONFLICT (author_id, target_type, target_id) DO NOTHING`,
		authorID, targetType, targetID, rating, body)
	return err
}

func (r *ProviderRepo) ReplyToReview(ctx context.Context, reviewID, providerUserID int64, reply string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE platform_reviews pr SET provider_reply=$3, provider_reply_at=NOW()
		FROM providers p
		WHERE pr.id=$1 AND pr.target_type IN ('offering','provider')
		AND ((pr.target_type='provider' AND pr.target_id=p.id) OR (pr.target_type='offering' AND EXISTS(
			SELECT 1 FROM service_offerings o WHERE o.id=pr.target_id AND o.provider_id=p.id)))
		AND p.user_id=$2`, reviewID, providerUserID, reply)
	return err
}

func (r *ProviderRepo) CreateSuggestion(ctx context.Context, providerID int64, title, description string, categoryID *int64, suggestedCategory string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO service_suggestions (provider_id, title, description, category_id, suggested_category, status)
		VALUES ($1,$2,$3,$4,$5,'pending') RETURNING id`,
		providerID, title, description, categoryID, suggestedCategory).Scan(&id)
	return id, err
}

func (r *ProviderRepo) ListRegionsByCountry(ctx context.Context, countryID int64) ([]Region, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, country_id, slug, name FROM regions WHERE country_id=$1 ORDER BY name`, countryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Region
	for rows.Next() {
		var reg Region
		if err := rows.Scan(&reg.ID, &reg.CountryID, &reg.Slug, &reg.Name); err != nil {
			return nil, err
		}
		out = append(out, reg)
	}
	return out, rows.Err()
}

func (r *ProviderRepo) NearbyCities(ctx context.Context, cityID int64, radiusKm int) ([]City, error) {
	if radiusKm <= 0 {
		radiusKm = 20
	}
	rows, err := r.db.Pool.Query(ctx, `
		SELECT c2.id, c2.country_id, c2.region_id, c2.slug, c2.name, c2.latitude, c2.longitude, co.slug
		FROM cities c1
		JOIN cities c2 ON c2.id != c1.id AND c2.is_active AND c2.latitude != 0
		JOIN countries co ON co.id = c2.country_id
		WHERE c1.id = $1
		AND ST_DWithin(
			ST_SetSRID(ST_MakePoint(c2.longitude, c2.latitude), 4326)::geography,
			ST_SetSRID(ST_MakePoint(c1.longitude, c1.latitude), 4326)::geography,
			$2 * 1000
		)
		ORDER BY ST_Distance(
			ST_SetSRID(ST_MakePoint(c2.longitude, c2.latitude), 4326)::geography,
			ST_SetSRID(ST_MakePoint(c1.longitude, c1.latitude), 4326)::geography
		)
		LIMIT 30`, cityID, radiusKm)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []City
	for rows.Next() {
		var c City
		if err := rows.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude, &c.CountrySlug); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *ProviderRepo) ReverseGeocodeCity(ctx context.Context, lat, lng float64) (*City, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT c.id, c.country_id, c.region_id, c.slug, c.name, c.latitude, c.longitude, co.slug
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE c.is_active AND c.latitude != 0
		ORDER BY ST_Distance(
			ST_SetSRID(ST_MakePoint(c.longitude, c.latitude), 4326)::geography,
			ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
		) LIMIT 1`, lat, lng)
	var c City
	err := row.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude, &c.CountrySlug)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *ProviderRepo) HasActiveSubscription(ctx context.Context, providerID int64) (bool, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM provider_subscriptions
		WHERE provider_id=$1 AND status='ACTIVE' AND expires_at > NOW()`, providerID).Scan(&n)
	return n > 0, err
}
