package postgres

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type GeoRepo struct{ db *DB }

func NewGeoRepo(db *DB) *GeoRepo { return &GeoRepo{db: db} }

type Country struct {
	ID       int64  `json:"id"`
	Slug     string `json:"slug"`
	Name     string `json:"name"`
	IsActive bool   `json:"is_active"`
}

type CountryWithGuideCount struct {
	ID         int64  `json:"id"`
	Slug       string `json:"slug"`
	Name       string `json:"name"`
	GuideCount int    `json:"guide_count"`
}

type Region struct {
	ID        int64  `json:"id"`
	CountryID int64  `json:"country_id"`
	Slug      string `json:"slug"`
	Name      string `json:"name"`
}

type City struct {
	ID          int64   `json:"id"`
	CountryID   int64   `json:"country_id"`
	RegionID    int64   `json:"region_id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	CountrySlug string  `json:"country_slug,omitempty"`
}

type MapPoint struct {
	ID          int64   `json:"id"`
	Slug        string  `json:"slug"`
	Name        string  `json:"name"`
	CountrySlug string  `json:"country_slug"`
	CountryName string  `json:"country_name"`
	Lat         float64 `json:"lat"`
	Lng         float64 `json:"lng"`
}

func (r *GeoRepo) GetCountryBySlug(ctx context.Context, slug string) (*Country, error) {
	row := r.db.Pool.QueryRow(ctx, `SELECT id, slug, name, is_active FROM countries WHERE slug=$1 AND is_active=true`, slug)
	var c Country
	err := row.Scan(&c.ID, &c.Slug, &c.Name, &c.IsActive)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *GeoRepo) ListCountries(ctx context.Context) ([]Country, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id, slug, name, is_active FROM countries WHERE is_active=true ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Country
	for rows.Next() {
		var c Country
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.IsActive); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *GeoRepo) ListCountriesWithGuideCount(ctx context.Context) ([]CountryWithGuideCount, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT co.id, co.slug, co.name, COUNT(DISTINCT gp.id)::int
		FROM countries co
		JOIN cities c ON c.country_id = co.id AND c.is_active = true
		JOIN guide_cities gc ON gc.city_id = c.id AND gc.is_active = true
		JOIN guide_profiles gp ON gp.id = gc.guide_id AND gp.status = $1
		WHERE co.is_active = true
		GROUP BY co.id, co.slug, co.name
		HAVING COUNT(DISTINCT gp.id) > 0
		ORDER BY COUNT(DISTINCT gp.id) DESC, co.name ASC
	`, domain.GuideStatusActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CountryWithGuideCount
	for rows.Next() {
		var c CountryWithGuideCount
		if err := rows.Scan(&c.ID, &c.Slug, &c.Name, &c.GuideCount); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *GeoRepo) ListCities(ctx context.Context) ([]City, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT id, country_id, region_id, slug, name, COALESCE(latitude,0), COALESCE(longitude,0) FROM cities WHERE is_active=true ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []City
	for rows.Next() {
		var c City
		if err := rows.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *GeoRepo) GetCityBySlug(ctx context.Context, slug string) (*City, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT c.id, c.country_id, c.region_id, c.slug, c.name, COALESCE(c.latitude,0), COALESCE(c.longitude,0), co.slug
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE c.slug=$1 AND c.is_active=true
	`, slug)
	var c City
	err := row.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude, &c.CountrySlug)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *GeoRepo) GetCityByID(ctx context.Context, id int64) (*City, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT c.id, c.country_id, c.region_id, c.slug, c.name, COALESCE(c.latitude,0), COALESCE(c.longitude,0), co.slug
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE c.id=$1 AND c.is_active=true
	`, id)
	var c City
	err := row.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude, &c.CountrySlug)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

func (r *GeoRepo) ListCitiesByCountry(ctx context.Context, countrySlug string) ([]City, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT c.id, c.country_id, c.region_id, c.slug, c.name, COALESCE(c.latitude,0), COALESCE(c.longitude,0), co.slug
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE co.slug=$1 AND c.is_active=true AND co.is_active=true
		ORDER BY c.name
	`, countrySlug)
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

func (r *GeoRepo) ListMapPoints(ctx context.Context) ([]MapPoint, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT DISTINCT c.id, c.slug, c.name, co.slug, co.name, c.latitude, c.longitude
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		JOIN excursions e ON e.city_id = c.id
		JOIN guide_profiles g ON g.id = e.guide_id
		WHERE c.is_active=true
		  AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
		  AND c.latitude <> 0 AND c.longitude <> 0
		  AND e.status = $1
		  AND g.status = $2
		ORDER BY co.name, c.name
	`, domain.ExcursionPublished, domain.GuideStatusActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []MapPoint
	for rows.Next() {
		var p MapPoint
		if err := rows.Scan(&p.ID, &p.Slug, &p.Name, &p.CountrySlug, &p.CountryName, &p.Lat, &p.Lng); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *GeoRepo) CreateCountry(ctx context.Context, slug, name string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `INSERT INTO countries (slug, name) VALUES ($1,$2) RETURNING id`, slug, name).Scan(&id)
	return id, err
}

func (r *GeoRepo) CreateRegion(ctx context.Context, countryID int64, slug, name string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `INSERT INTO regions (country_id, slug, name) VALUES ($1,$2,$3) RETURNING id`, countryID, slug, name).Scan(&id)
	return id, err
}

func (r *GeoRepo) CreateCity(ctx context.Context, countryID, regionID int64, slug, name string, lat, lng float64) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `INSERT INTO cities (country_id, region_id, slug, name, latitude, longitude) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, countryID, regionID, slug, name, lat, lng).Scan(&id)
	return id, err
}

func (r *GeoRepo) EnsureCountry(ctx context.Context, slug, name string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO countries (slug, name) VALUES ($1, $2)
		ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
		RETURNING id
	`, slug, name).Scan(&id)
	return id, err
}

func (r *GeoRepo) EnsureRegion(ctx context.Context, countryID int64, slug, name string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO regions (country_id, slug, name) VALUES ($1, $2, $3)
		ON CONFLICT (country_id, slug) DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
		RETURNING id
	`, countryID, slug, name).Scan(&id)
	return id, err
}

func (r *GeoRepo) EnsureCity(ctx context.Context, countryID, regionID int64, slug, name string, lat, lng float64) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO cities (country_id, region_id, slug, name, latitude, longitude)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (region_id, slug) DO UPDATE SET
			name = EXCLUDED.name,
			latitude = CASE WHEN EXCLUDED.latitude <> 0 THEN EXCLUDED.latitude ELSE cities.latitude END,
			longitude = CASE WHEN EXCLUDED.longitude <> 0 THEN EXCLUDED.longitude ELSE cities.longitude END,
			updated_at = NOW()
		RETURNING id
	`, countryID, regionID, slug, name, lat, lng).Scan(&id)
	return id, err
}

func (r *GeoRepo) FindCityInCountry(ctx context.Context, countryID int64, name, slug string) (*City, error) {
	name = strings.TrimSpace(name)
	row := r.db.Pool.QueryRow(ctx, `
		SELECT c.id, c.country_id, c.region_id, c.slug, c.name, COALESCE(c.latitude,0), COALESCE(c.longitude,0), co.slug
		FROM cities c
		JOIN countries co ON co.id = c.country_id
		WHERE c.country_id = $1 AND c.is_active = true
		  AND (
		    lower(trim(c.name)) = lower(trim($2))
		    OR lower(c.slug) = lower($3)
		  )
		ORDER BY c.id
		LIMIT 1
	`, countryID, name, slug)
	var c City
	err := row.Scan(&c.ID, &c.CountryID, &c.RegionID, &c.Slug, &c.Name, &c.Latitude, &c.Longitude, &c.CountrySlug)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &c, err
}

// ResolveOrCreateCity повертає існуюче місто за назвою/slug у країні або створює нове.
func (r *GeoRepo) ResolveOrCreateCity(ctx context.Context, countryID, regionID int64, slug, name string, lat, lng float64) (id int64, created bool, err error) {
	if existing, err := r.FindCityInCountry(ctx, countryID, name, slug); err != nil {
		return 0, false, err
	} else if existing != nil {
		return existing.ID, false, nil
	}
	id, err = r.EnsureCity(ctx, countryID, regionID, slug, name, lat, lng)
	return id, true, err
}
