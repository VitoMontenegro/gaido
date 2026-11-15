package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

type ProfileSlugAliasRepo struct{ db *DB }

func NewProfileSlugAliasRepo(db *DB) *ProfileSlugAliasRepo { return &ProfileSlugAliasRepo{db: db} }

func (r *ProfileSlugAliasRepo) Taken(ctx context.Context, space, slug string, exceptProfileID int64) (bool, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM profile_slug_aliases
		WHERE space=$1 AND slug=$2 AND profile_id<>$3
	`, space, slug, exceptProfileID).Scan(&n)
	return n > 0, err
}

func (r *ProfileSlugAliasRepo) CurrentSlug(ctx context.Context, space string, profileID int64) (string, error) {
	var slug string
	err := r.db.Pool.QueryRow(ctx, `
		SELECT slug FROM profile_slug_aliases
		WHERE space=$1 AND profile_id=$2 AND is_current
		ORDER BY id DESC LIMIT 1
	`, space, profileID).Scan(&slug)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return slug, err
}

func (r *ProfileSlugAliasRepo) Lookup(ctx context.Context, space, slug string) (profileID int64, currentSlug string, isCurrent bool, err error) {
	err = r.db.Pool.QueryRow(ctx, `
		SELECT a.profile_id, a.is_current,
			COALESCE((SELECT c.slug FROM profile_slug_aliases c WHERE c.space=a.space AND c.profile_id=a.profile_id AND c.is_current LIMIT 1), '')
		FROM profile_slug_aliases a
		WHERE a.space=$1 AND a.slug=$2
	`, space, slug).Scan(&profileID, &isCurrent, &currentSlug)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, "", false, nil
	}
	return profileID, currentSlug, isCurrent, err
}

func (r *ProfileSlugAliasRepo) Reserve(ctx context.Context, space, slug string, profileID int64, makeCurrent bool) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if makeCurrent {
		if _, err := tx.Exec(ctx, `
			UPDATE profile_slug_aliases SET is_current=FALSE WHERE space=$1 AND profile_id=$2
		`, space, profileID); err != nil {
			return err
		}
	}
	tag, err := tx.Exec(ctx, `
		INSERT INTO profile_slug_aliases (space, slug, profile_id, is_current)
		VALUES ($1,$2,$3,$4)
		ON CONFLICT (space, slug) DO UPDATE SET
			is_current = profile_slug_aliases.is_current OR EXCLUDED.is_current
		WHERE profile_slug_aliases.profile_id = EXCLUDED.profile_id
	`, space, slug, profileID, makeCurrent)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("slug reserved")
	}
	return tx.Commit(ctx)
}
