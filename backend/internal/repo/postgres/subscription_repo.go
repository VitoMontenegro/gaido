package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type SubscriptionRepo struct{ db *DB }

func NewSubscriptionRepo(db *DB) *SubscriptionRepo { return &SubscriptionRepo{db: db} }

func (r *SubscriptionRepo) GetActive(ctx context.Context, guideID int64) (*domain.GuideSubscription, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, guide_id, plan_id, status, starts_at, expires_at, paid_at, payment_id, activation_source
		FROM guide_subscriptions
		WHERE guide_id=$1 AND status=$2 AND expires_at > NOW()
		ORDER BY id DESC LIMIT 1
	`, guideID, domain.SubscriptionActive)
	var s domain.GuideSubscription
	err := row.Scan(&s.ID, &s.GuideID, &s.PlanID, &s.Status, &s.StartsAt, &s.ExpiresAt, &s.PaidAt, &s.PaymentID, &s.ActivationSource)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &s, err
}

func (r *SubscriptionRepo) ListPlans(ctx context.Context) ([]domain.SubscriptionPlan, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, code, name, description, price, currency, duration_days, is_active, plan_type
		FROM subscription_plans WHERE is_active=true ORDER BY sort_order, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.SubscriptionPlan
	for rows.Next() {
		var p domain.SubscriptionPlan
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Price, &p.Currency, &p.DurationDays, &p.IsActive, &p.PlanType); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *SubscriptionRepo) ListPlansByType(ctx context.Context, planType string) ([]domain.SubscriptionPlan, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id, code, name, description, price, currency, duration_days, is_active, plan_type
		FROM subscription_plans WHERE is_active=true AND plan_type=$1 ORDER BY sort_order, id`, planType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.SubscriptionPlan
	for rows.Next() {
		var p domain.SubscriptionPlan
		if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Price, &p.Currency, &p.DurationDays, &p.IsActive, &p.PlanType); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *SubscriptionRepo) GetPlan(ctx context.Context, id int64) (*domain.SubscriptionPlan, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, code, name, description, price, currency, duration_days, is_active, plan_type
		FROM subscription_plans WHERE id=$1`, id)
	var p domain.SubscriptionPlan
	err := row.Scan(&p.ID, &p.Code, &p.Name, &p.Description, &p.Price, &p.Currency, &p.DurationDays, &p.IsActive, &p.PlanType)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &p, err
}

func (r *SubscriptionRepo) UpsertActive(ctx context.Context, guideID, planID int64, starts, expires, paid time.Time, paymentID *int64, source string) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO guide_subscriptions (guide_id, plan_id, status, starts_at, expires_at, paid_at, payment_id, activation_source)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	`, guideID, planID, domain.SubscriptionActive, starts, expires, paid, paymentID, source)
	return err
}
