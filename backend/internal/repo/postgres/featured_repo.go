package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type FeaturedPlacementRepo struct{ db *DB }

func NewFeaturedPlacementRepo(db *DB) *FeaturedPlacementRepo { return &FeaturedPlacementRepo{db: db} }

func scanFeaturedPlacement(row pgx.Row) (*domain.FeaturedPlacement, error) {
	var fp domain.FeaturedPlacement
	var excursionID *int64
	var planID *int64
	var paidAt *time.Time
	var paymentID *int64
	err := row.Scan(&fp.ID, &fp.GuideID, &excursionID, &fp.SlotType, &planID, &fp.Status, &fp.StartsAt, &fp.ExpiresAt, &paidAt, &paymentID)
	if err != nil {
		return nil, err
	}
	fp.ExcursionID = excursionID
	fp.PlanID = planID
	fp.PaidAt = paidAt
	fp.PaymentID = paymentID
	return &fp, nil
}

func (r *FeaturedPlacementRepo) Upsert(ctx context.Context, guideID int64, excursionID *int64, slotType string, planID int64, durationDays int, paymentID *int64) error {
	now := time.Now().UTC()
	expires := now.Add(time.Duration(durationDays) * 24 * time.Hour)

	var existingID int64
	var existingExpires time.Time
	q := `
		SELECT id, expires_at FROM featured_placements
		WHERE guide_id=$1 AND slot_type=$2 AND status=$3 AND expires_at > NOW()`
	args := []any{guideID, slotType, domain.FeaturedPlacementActive}
	if excursionID != nil {
		q += ` AND excursion_id=$4`
		args = append(args, *excursionID)
	} else {
		q += ` AND excursion_id IS NULL`
	}
	q += ` ORDER BY id DESC LIMIT 1`
	err := r.db.Pool.QueryRow(ctx, q, args...).Scan(&existingID, &existingExpires)
	if err == nil {
		base := existingExpires
		if base.Before(now) {
			base = now
		}
		expires = base.Add(time.Duration(durationDays) * 24 * time.Hour)
		_, err = r.db.Pool.Exec(ctx, `
			UPDATE featured_placements
			SET plan_id=$2, expires_at=$3, paid_at=$4, payment_id=$5, updated_at=NOW()
			WHERE id=$1
		`, existingID, planID, expires, now, paymentID)
		return err
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	_, err = r.db.Pool.Exec(ctx, `
		INSERT INTO featured_placements (guide_id, excursion_id, slot_type, plan_id, status, starts_at, expires_at, paid_at, payment_id)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
	`, guideID, excursionID, slotType, planID, domain.FeaturedPlacementActive, now, expires, now, paymentID)
	return err
}

func (r *FeaturedPlacementRepo) ListActiveBySlotType(ctx context.Context, slotType string, limit int) ([]domain.FeaturedPlacement, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, guide_id, excursion_id, slot_type, plan_id, status, starts_at, expires_at, paid_at, payment_id
		FROM featured_placements
		WHERE slot_type=$1 AND status=$2 AND expires_at > NOW()
		ORDER BY expires_at DESC
	`, slotType, domain.FeaturedPlacementActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.FeaturedPlacement, 0, limit)
	seen := map[string]bool{}
	for rows.Next() {
		fp, err := scanFeaturedPlacement(rows)
		if err != nil {
			return nil, err
		}
		key := fmt.Sprintf("g%d", fp.GuideID)
		if fp.ExcursionID != nil {
			key = fmt.Sprintf("e%d", *fp.ExcursionID)
		}
		if seen[key] {
			continue
		}
		seen[key] = true
		out = append(out, *fp)
		if len(out) >= limit {
			break
		}
	}
	return out, rows.Err()
}

func (r *FeaturedPlacementRepo) GetActiveGuideSlot(ctx context.Context, guideID int64) (*domain.FeaturedPlacement, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, guide_id, excursion_id, slot_type, plan_id, status, starts_at, expires_at, paid_at, payment_id
		FROM featured_placements
		WHERE guide_id=$1 AND slot_type=$2 AND excursion_id IS NULL AND status=$3 AND expires_at > NOW()
		ORDER BY expires_at DESC LIMIT 1
	`, guideID, domain.FeaturedSlotGuide, domain.FeaturedPlacementActive)
	fp, err := scanFeaturedPlacement(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return fp, err
}

func (r *FeaturedPlacementRepo) ListActiveExcursionSlotsByGuide(ctx context.Context, guideID int64) ([]domain.FeaturedExcursionPlacement, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT fp.id, fp.guide_id, fp.excursion_id, fp.slot_type, fp.plan_id, fp.status, fp.starts_at, fp.expires_at, fp.paid_at, fp.payment_id,
			e.title, e.slug
		FROM featured_placements fp
		JOIN excursions e ON e.id = fp.excursion_id
		WHERE fp.guide_id=$1 AND fp.slot_type=$2 AND fp.status=$3 AND fp.expires_at > NOW()
		ORDER BY fp.expires_at DESC
	`, guideID, domain.FeaturedSlotExcursion, domain.FeaturedPlacementActive)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.FeaturedExcursionPlacement
	for rows.Next() {
		var item domain.FeaturedExcursionPlacement
		var excursionID *int64
		var planID *int64
		var paidAt *time.Time
		var paymentID *int64
		if err := rows.Scan(
			&item.ID, &item.GuideID, &excursionID, &item.SlotType, &planID, &item.Status,
			&item.StartsAt, &item.ExpiresAt, &paidAt, &paymentID,
			&item.ExcursionTitle, &item.ExcursionSlug,
		); err != nil {
			return nil, err
		}
		item.ExcursionID = excursionID
		item.PlanID = planID
		item.PaidAt = paidAt
		item.PaymentID = paymentID
		out = append(out, item)
	}
	return out, rows.Err()
}
