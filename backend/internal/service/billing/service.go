package billing

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/apperrors"
	"github.com/vitomonte/experts-tourister/internal/domain"
	"github.com/vitomonte/experts-tourister/internal/repo/postgres"
)

type Service struct {
	DB       *postgres.DB
	Guides   *postgres.GuideRepo
	Subs     *postgres.SubscriptionRepo
	Payments *postgres.PaymentRepo
	Featured *postgres.FeaturedPlacementRepo
	Exc      *postgres.ExcursionRepo
	Settings *postgres.SettingsRepo
	Audit    *postgres.AuditRepo
	Notify   func(ctx context.Context, userID int64, ntype string, payload string) error
}

func (s *Service) PaymentsEnabled(ctx context.Context) (bool, error) {
	if s.Settings == nil {
		return true, nil
	}
	return s.Settings.GetBool(ctx, "guide_placement_payments_enabled", true)
}

func (s *Service) BillingStatus(ctx context.Context, userID int64) (*domain.BillingStatusDTO, error) {
	g, err := s.Guides.GetByUserID(ctx, userID)
	if err != nil || g == nil {
		return nil, apperrors.ErrNotFound
	}
	enabled, err := s.PaymentsEnabled(ctx)
	if err != nil {
		return nil, err
	}
	status := &domain.BillingStatusDTO{
		PaymentsEnabled:    enabled,
		FeaturedExcursions: []domain.FeaturedExcursionPlacement{},
	}
	if enabled {
		status.Subscription, _ = s.Subs.GetActive(ctx, g.ID)
		status.FeaturedGuide, _ = s.Featured.GetActiveGuideSlot(ctx, g.ID)
		exc, _ := s.Featured.ListActiveExcursionSlotsByGuide(ctx, g.ID)
		if exc != nil {
			status.FeaturedExcursions = exc
		}
	}
	return status, nil
}

func (s *Service) ActivateGuideSubscription(ctx context.Context, guideID, planID int64, paymentID *int64, source string, actorID *int64) error {
	tx, err := s.DB.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if paymentID != nil {
		var pstatus string
		if err := tx.QueryRow(ctx, `SELECT status FROM payments WHERE id=$1 FOR UPDATE`, *paymentID).Scan(&pstatus); err != nil {
			return err
		}
		if pstatus == domain.PaymentPaid {
			var subStatus string
			err := tx.QueryRow(ctx, `
				SELECT status FROM guide_subscriptions
				WHERE guide_id=$1 AND status=$2 AND expires_at > NOW()
				ORDER BY id DESC LIMIT 1`, guideID, domain.SubscriptionActive).Scan(&subStatus)
			if err == nil && subStatus == domain.SubscriptionActive {
				return tx.Commit(ctx)
			}
		}
		if pstatus != domain.PaymentPaid && source == domain.ActivationPayment {
			_, _ = tx.Exec(ctx, `UPDATE payments SET status=$2, updated_at=NOW() WHERE id=$1`, *paymentID, domain.PaymentPaid)
		}
	}

	var duration int
	if err := tx.QueryRow(ctx, `SELECT duration_days FROM subscription_plans WHERE id=$1`, planID).Scan(&duration); err != nil {
		return err
	}
	now := time.Now().UTC()

	var existingExpires time.Time
	err = tx.QueryRow(ctx, `
		SELECT expires_at FROM guide_subscriptions
		WHERE guide_id=$1 AND status=$2 AND expires_at > NOW()
		ORDER BY id DESC LIMIT 1`, guideID, domain.SubscriptionActive).Scan(&existingExpires)
	base := now
	if err == nil && existingExpires.After(base) {
		base = existingExpires
	}
	expires := base.Add(time.Duration(duration) * 24 * time.Hour)

	_, err = tx.Exec(ctx, `
		INSERT INTO guide_subscriptions (guide_id, plan_id, status, starts_at, expires_at, paid_at, payment_id, activation_source)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
	`, guideID, planID, domain.SubscriptionActive, now, expires, now, paymentID, source)
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, `UPDATE guide_profiles SET status=$2, updated_at=NOW() WHERE id=$1`, guideID, domain.GuideStatusActive)
	if err != nil {
		return err
	}

	if source == domain.ActivationAdminBypass && s.Audit != nil {
		aid := actorID
		_ = s.Audit.Log(ctx, aid, "GUIDE_BYPASS_ACTIVATION", "guide", &guideID, "", fmt.Sprintf(`{"plan_id":%d}`, planID), "", "")
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	g, _ := s.Guides.GetByID(ctx, guideID)
	if g != nil && s.Notify != nil {
		_ = s.Notify(ctx, g.UserID, "SUBSCRIPTION_ACTIVATED", `{}`)
	}
	return nil
}

func (s *Service) ActivateFeaturedPlacement(ctx context.Context, guideID, planID int64, excursionID *int64, paymentID *int64) error {
	plan, err := s.Subs.GetPlan(ctx, planID)
	if err != nil || plan == nil {
		return apperrors.ErrNotFound
	}
	if paymentID != nil {
		if err := s.Payments.MarkPaid(ctx, *paymentID); err != nil {
			return err
		}
	}
	slotType := domain.FeaturedSlotGuide
	if plan.PlanType == domain.PlanTypeFeaturedExcursion {
		slotType = domain.FeaturedSlotExcursion
		if excursionID == nil {
			return apperrors.ErrValidation
		}
		exc, err := s.Exc.GetByID(ctx, *excursionID)
		if err != nil || exc == nil || exc.GuideID != guideID || exc.Status != domain.ExcursionPublished {
			return apperrors.ErrValidation
		}
	}
	return s.Featured.Upsert(ctx, guideID, excursionID, slotType, planID, plan.DurationDays, paymentID)
}

func (s *Service) ConfirmPayment(ctx context.Context, paymentID int64, planIDFallback int64) error {
	p, err := s.Payments.GetByID(ctx, paymentID)
	if err != nil || p == nil {
		return apperrors.ErrNotFound
	}
	planID := planIDFallback
	if v, ok := p.Metadata["plan_id"]; ok {
		switch n := v.(type) {
		case float64:
			planID = int64(n)
		case int64:
			planID = n
		}
	}
	if planID == 0 {
		return apperrors.ErrValidation
	}
	plan, err := s.Subs.GetPlan(ctx, planID)
	if err != nil || plan == nil {
		return apperrors.ErrNotFound
	}

	g, err := s.Guides.GetByUserID(ctx, p.PayerID)
	if err != nil || g == nil {
		return apperrors.ErrNotFound
	}

	if p.Status != domain.PaymentPaid {
		if err := s.Payments.MarkPaid(ctx, paymentID); err != nil {
			return err
		}
	}
	pid := paymentID

	switch plan.PlanType {
	case domain.PlanTypeGuidePlacement:
		return s.ActivateGuideSubscription(ctx, g.ID, planID, &pid, domain.ActivationPayment, nil)
	case domain.PlanTypeFeaturedGuide:
		return s.ActivateFeaturedPlacement(ctx, g.ID, planID, nil, &pid)
	case domain.PlanTypeFeaturedExcursion:
		var excursionID *int64
		if v, ok := p.Metadata["excursion_id"]; ok {
			switch n := v.(type) {
			case float64:
				id := int64(n)
				excursionID = &id
			case int64:
				excursionID = &n
			}
		}
		if excursionID == nil {
			return apperrors.ErrValidation
		}
		return s.ActivateFeaturedPlacement(ctx, g.ID, planID, excursionID, &pid)
	default:
		return apperrors.ErrValidation
	}
}

func (s *Service) Checkout(ctx context.Context, userID, planID int64, excursionID *int64) (int64, error) {
	enabled, err := s.PaymentsEnabled(ctx)
	if err != nil {
		return 0, err
	}
	if !enabled {
		return 0, apperrors.New("PAYMENTS_DISABLED", "Payments are disabled by admin", 400)
	}

	plan, err := s.Subs.GetPlan(ctx, planID)
	if err != nil || plan == nil {
		return 0, apperrors.ErrNotFound
	}
	g, err := s.Guides.GetByUserID(ctx, userID)
	if err != nil || g == nil {
		return 0, apperrors.ErrNotFound
	}

	metadata := map[string]any{"plan_id": planID}
	purpose := domain.PaymentPurposeGuidePlacement

	switch plan.PlanType {
	case domain.PlanTypeGuidePlacement:
		if g.Status == domain.GuideStatusDraft {
			_ = s.Guides.SetStatus(ctx, g.ID, domain.GuideStatusWaitingPayment)
		}
	case domain.PlanTypeFeaturedGuide:
		purpose = domain.PaymentPurposeFeaturedGuide
	case domain.PlanTypeFeaturedExcursion:
		purpose = domain.PaymentPurposeFeaturedExcursion
		if excursionID == nil {
			return 0, apperrors.New("EXCURSION_REQUIRED", "excursion_id is required", 400)
		}
		exc, err := s.Exc.GetByID(ctx, *excursionID)
		if err != nil || exc == nil || exc.GuideID != g.ID {
			return 0, apperrors.ErrNotFound
		}
		if exc.Status != domain.ExcursionPublished {
			return 0, apperrors.New("EXCURSION_NOT_PUBLISHED", "Excursion must be published", 400)
		}
		metadata["excursion_id"] = *excursionID
	default:
		return 0, apperrors.ErrValidation
	}

	return s.Payments.Create(ctx, userID, purpose, plan.Price, plan.Currency, metadata)
}

func (s *Service) AdminBypass(ctx context.Context, guideID, planID int64, actorID int64) error {
	enabled, _ := s.PaymentsEnabled(ctx)
	if enabled {
		return apperrors.New("PAYMENTS_REQUIRED", "Payments are enabled; use checkout", 400)
	}
	return s.ActivateGuideSubscription(ctx, guideID, planID, nil, domain.ActivationAdminBypass, &actorID)
}

var _ = pgx.ErrNoRows
