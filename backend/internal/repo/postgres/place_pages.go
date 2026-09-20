package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type PlacePageRepo struct{ db *DB }

func NewPlacePageRepo(db *DB) *PlacePageRepo { return &PlacePageRepo{db: db} }

func marshalPlaceFAQ(items []domain.PlaceFAQ) []byte {
	if items == nil {
		items = []domain.PlaceFAQ{}
	}
	b, err := json.Marshal(items)
	if err != nil {
		return []byte("[]")
	}
	return b
}

func unmarshalPlaceFAQ(raw []byte) []domain.PlaceFAQ {
	if len(raw) == 0 {
		return []domain.PlaceFAQ{}
	}
	var out []domain.PlaceFAQ
	if err := json.Unmarshal(raw, &out); err != nil || out == nil {
		return []domain.PlaceFAQ{}
	}
	return out
}

func scanPlacePage(row pgx.Row) (*domain.PlacePage, error) {
	var p domain.PlacePage
	var faqRaw []byte
	err := row.Scan(
		&p.PlaceType, &p.PlaceID, &p.Slug, &p.Name, &p.CountryName, &p.CountrySlug,
		&p.Excerpt, &p.IntroHTML, &p.SEOTitle, &p.SEODescription, &p.SEOImageURL, &faqRaw,
	)
	if err != nil {
		return nil, err
	}
	p.FAQ = unmarshalPlaceFAQ(faqRaw)
	p.PublicPath = domain.PlacePublicPath(p.PlaceType, p.Slug)
	return &p, nil
}

func (r *PlacePageRepo) GetByPlace(ctx context.Context, placeType string, placeID int64) (*domain.PlacePage, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT pp.place_type, pp.place_id,
			COALESCE(co.slug, c.slug, ''),
			COALESCE(co.name, c.name, ''),
			COALESCE(coc.name, ''),
			COALESCE(coc.slug, ''),
			pp.excerpt, pp.intro_html, pp.seo_title, pp.seo_description, pp.seo_image_url, pp.faq
		FROM place_pages pp
		LEFT JOIN countries co ON pp.place_type = 'country' AND co.id = pp.place_id
		LEFT JOIN cities c ON pp.place_type = 'city' AND c.id = pp.place_id
		LEFT JOIN countries coc ON c.country_id = coc.id
		WHERE pp.place_type = $1 AND pp.place_id = $2
	`, placeType, placeID)
	p, err := scanPlacePage(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return p, err
}

func (r *PlacePageRepo) GetBySlug(ctx context.Context, placeType, slug string) (*domain.PlacePage, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, nil
	}
	var row pgx.Row
	if placeType == domain.PlaceTypeCountry {
		row = r.db.Pool.QueryRow(ctx, `
			SELECT $1::text, co.id, co.slug, co.name, ''::text, ''::text,
				COALESCE(pp.excerpt, ''), COALESCE(pp.intro_html, ''), COALESCE(pp.seo_title, ''),
				COALESCE(pp.seo_description, ''), COALESCE(pp.seo_image_url, ''),
				COALESCE(pp.faq, '[]'::jsonb)
			FROM countries co
			LEFT JOIN place_pages pp ON pp.place_type = $1 AND pp.place_id = co.id
			WHERE co.slug = $2 AND co.is_active = true
		`, placeType, slug)
	} else {
		row = r.db.Pool.QueryRow(ctx, `
			SELECT $1::text, c.id, c.slug, c.name, COALESCE(co.name, ''), COALESCE(co.slug, ''),
				COALESCE(pp.excerpt, ''), COALESCE(pp.intro_html, ''), COALESCE(pp.seo_title, ''),
				COALESCE(pp.seo_description, ''), COALESCE(pp.seo_image_url, ''),
				COALESCE(pp.faq, '[]'::jsonb)
			FROM cities c
			JOIN countries co ON co.id = c.country_id
			LEFT JOIN place_pages pp ON pp.place_type = $1 AND pp.place_id = c.id
			WHERE c.slug = $2 AND c.is_active = true AND co.is_active = true
		`, placeType, slug)
	}
	p, err := scanPlacePage(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return p, err
}

func (r *PlacePageRepo) ListAdmin(ctx context.Context) ([]domain.PlacePageListItem, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT place_type, place_id, slug, name, country_name, public_path, has_content
		FROM (
			SELECT 'country'::text AS place_type, co.id AS place_id, co.slug, co.name,
				''::text AS country_name, '/countries/' || co.slug AS public_path,
				(pp.id IS NOT NULL AND (
					pp.excerpt <> '' OR pp.intro_html <> '' OR pp.seo_title <> '' OR pp.seo_description <> ''
					OR pp.seo_image_url <> '' OR pp.faq <> '[]'::jsonb
				)) AS has_content
			FROM countries co
			LEFT JOIN place_pages pp ON pp.place_type = 'country' AND pp.place_id = co.id
			WHERE co.is_active = true

			UNION ALL

			SELECT 'city', c.id, c.slug, c.name, co.name, '/city/' || c.slug,
				(pp.id IS NOT NULL AND (
					pp.excerpt <> '' OR pp.intro_html <> '' OR pp.seo_title <> '' OR pp.seo_description <> ''
					OR pp.seo_image_url <> '' OR pp.faq <> '[]'::jsonb
				))
			FROM cities c
			JOIN countries co ON co.id = c.country_id AND co.is_active = true
			LEFT JOIN place_pages pp ON pp.place_type = 'city' AND pp.place_id = c.id
			WHERE c.is_active = true
			  AND (
			    pp.id IS NOT NULL
			    OR EXISTS (
			      SELECT 1 FROM excursions e
			      JOIN guide_profiles g ON g.id = e.guide_id
			      WHERE e.city_id = c.id AND e.status = $1 AND g.status = $2
			    )
			  )
		) pages
		ORDER BY CASE place_type WHEN 'country' THEN 0 ELSE 1 END, name
	`, domain.ExcursionPublished, domain.GuideStatusActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.PlacePageListItem, 0)
	for rows.Next() {
		var item domain.PlacePageListItem
		if err := rows.Scan(&item.PlaceType, &item.PlaceID, &item.Slug, &item.Name, &item.CountryName, &item.PublicPath, &item.HasContent); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *PlacePageRepo) Upsert(ctx context.Context, placeType string, placeID int64, excerpt, intro, seoTitle, seoDesc, seoImage string, faq []domain.PlaceFAQ) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO place_pages (place_type, place_id, excerpt, intro_html, seo_title, seo_description, seo_image_url, faq, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
		ON CONFLICT (place_type, place_id) DO UPDATE SET
			excerpt = EXCLUDED.excerpt,
			intro_html = EXCLUDED.intro_html,
			seo_title = EXCLUDED.seo_title,
			seo_description = EXCLUDED.seo_description,
			seo_image_url = EXCLUDED.seo_image_url,
			faq = EXCLUDED.faq,
			updated_at = NOW()
	`, placeType, placeID, excerpt, intro, seoTitle, seoDesc, seoImage, marshalPlaceFAQ(faq))
	return err
}

func (r *PlacePageRepo) Delete(ctx context.Context, placeType string, placeID int64) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM place_pages WHERE place_type = $1 AND place_id = $2`, placeType, placeID)
	return err
}
