package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type FavoriteRepo struct{ db *DB }

func NewFavoriteRepo(db *DB) *FavoriteRepo { return &FavoriteRepo{db: db} }

func (r *FavoriteRepo) Toggle(ctx context.Context, userID int64, targetType string, targetID int64) (bool, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `SELECT id FROM favorites WHERE user_id=$1 AND target_type=$2 AND target_id=$3`, userID, targetType, targetID).Scan(&id)
	if err == nil {
		_, err = r.db.Pool.Exec(ctx, `DELETE FROM favorites WHERE id=$1`, id)
		return false, err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return false, err
	}
	_, err = r.db.Pool.Exec(ctx, `INSERT INTO favorites (user_id, target_type, target_id) VALUES ($1,$2,$3)`, userID, targetType, targetID)
	return true, err
}

func (r *FavoriteRepo) List(ctx context.Context, userID int64) ([]struct {
	TargetType string
	TargetID   int64
}, error) {
	rows, err := r.db.Pool.Query(ctx, `SELECT target_type, target_id FROM favorites WHERE user_id=$1 ORDER BY id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []struct {
		TargetType string
		TargetID   int64
	}
	for rows.Next() {
		var item struct {
			TargetType string
			TargetID   int64
		}
		if err := rows.Scan(&item.TargetType, &item.TargetID); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *FavoriteRepo) ListEnriched(ctx context.Context, userID int64) ([]domain.FavoriteEnriched, error) {
	items, err := r.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]domain.FavoriteEnriched, 0, len(items))
	for _, f := range items {
		item := domain.FavoriteEnriched{TargetType: f.TargetType, TargetID: f.TargetID}
		switch f.TargetType {
		case domain.FavoriteExcursion:
			err := r.db.Pool.QueryRow(ctx, `
				SELECT e.title, e.slug, COALESCE(e.cover_image_url,''), COALESCE(c.name,''), e.price_from, e.currency,
					COALESCE(e.description, ''),
					COALESCE((SELECT AVG(r.rating)::float8 FROM guide_reviews r WHERE r.excursion_id=e.id AND r.status=$2), 0),
					COALESCE((SELECT COUNT(*)::int FROM guide_reviews r WHERE r.excursion_id=e.id AND r.status=$2), 0)
				FROM excursions e LEFT JOIN cities c ON c.id = e.city_id WHERE e.id=$1`, f.TargetID, domain.ReviewPublished).
				Scan(&item.Title, &item.Slug, &item.CoverImageURL, &item.CityName, &item.PriceFrom, &item.Currency,
					&item.Description, &item.RatingAvg, &item.RatingCount)
			if err != nil {
				continue
			}
		case domain.FavoriteGuide:
			err := r.db.Pool.QueryRow(ctx, `
				SELECT display_name, website_slug, COALESCE(avatar_url,'') FROM guide_profiles WHERE id=$1`, f.TargetID).
				Scan(&item.Title, &item.Slug, &item.AvatarURL)
			if err != nil {
				continue
			}
		}
		out = append(out, item)
	}
	return out, nil
}
