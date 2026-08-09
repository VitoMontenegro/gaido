package postgres

import (
	"context"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

type AdminRepo struct{ db *DB }

func NewAdminRepo(db *DB) *AdminRepo { return &AdminRepo{db: db} }

func (r *AdminRepo) countInt(ctx context.Context, sql string, args ...any) (int, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, sql, args...).Scan(&n)
	return n, err
}

func (r *AdminRepo) countFloat(ctx context.Context, sql string, args ...any) (float64, error) {
	var n float64
	err := r.db.Pool.QueryRow(ctx, sql, args...).Scan(&n)
	return n, err
}

func (r *AdminRepo) DashboardStats(ctx context.Context) (domain.AdminAnalytics, error) {
	var stats domain.AdminAnalytics
	var err error

	if stats.ActiveGuides, err = r.countInt(ctx, `SELECT COUNT(*) FROM guide_profiles WHERE status='ACTIVE'`); err != nil {
		return stats, err
	}
	if stats.PublishedExcursions, err = r.countInt(ctx, `SELECT COUNT(*) FROM excursions WHERE status='PUBLISHED'`); err != nil {
		return stats, err
	}
	if stats.PublishedReviews, err = r.countInt(ctx, `SELECT COUNT(*) FROM guide_reviews WHERE status='PUBLISHED'`); err != nil {
		return stats, err
	}
	if stats.TotalUsers, err = r.countInt(ctx, `SELECT COUNT(*) FROM users`); err != nil {
		return stats, err
	}
	if stats.TotalGuides, err = r.countInt(ctx, `SELECT COUNT(*) FROM guide_profiles`); err != nil {
		return stats, err
	}
	if stats.PendingExcursions, err = r.countInt(ctx, `SELECT COUNT(*) FROM excursions WHERE status='PENDING_MODERATION'`); err != nil {
		return stats, err
	}
	if stats.DraftExcursions, err = r.countInt(ctx, `SELECT COUNT(*) FROM excursions WHERE status='DRAFT'`); err != nil {
		return stats, err
	}
	if stats.PendingReviews, err = r.countInt(ctx, `SELECT COUNT(*) FROM guide_reviews WHERE status='PENDING'`); err != nil {
		return stats, err
	}
	if stats.TotalFavorites, err = r.countInt(ctx, `SELECT COUNT(*) FROM favorites`); err != nil {
		return stats, err
	}
	if stats.PaymentsTotal, err = r.countInt(ctx, `SELECT COUNT(*) FROM payments`); err != nil {
		return stats, err
	}
	if stats.PaymentsPaid, err = r.countInt(ctx, `SELECT COUNT(*) FROM payments WHERE status='PAID'`); err != nil {
		return stats, err
	}
	if stats.PaymentsPending, err = r.countInt(ctx, `SELECT COUNT(*) FROM payments WHERE status IN ('PENDING','CREATED')`); err != nil {
		return stats, err
	}
	if stats.ActiveSubscriptions, err = r.countInt(ctx, `SELECT COUNT(*) FROM guide_subscriptions WHERE status='ACTIVE' AND expires_at > NOW()`); err != nil {
		return stats, err
	}
	if stats.FeaturedGuides, err = r.countInt(ctx, `SELECT COUNT(*) FROM featured_placements WHERE slot_type='FEATURED_GUIDE' AND status='ACTIVE' AND expires_at > NOW()`); err != nil {
		return stats, err
	}
	if stats.FeaturedExcursions, err = r.countInt(ctx, `SELECT COUNT(*) FROM featured_placements WHERE slot_type='FEATURED_EXCURSION' AND status='ACTIVE' AND expires_at > NOW()`); err != nil {
		return stats, err
	}
	if stats.CitiesCount, err = r.countInt(ctx, `SELECT COUNT(*) FROM cities`); err != nil {
		return stats, err
	}
	if stats.CountriesCount, err = r.countInt(ctx, `SELECT COUNT(*) FROM countries`); err != nil {
		return stats, err
	}
	if stats.RevenueTotal, err = r.countFloat(ctx, `SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='PAID'`); err != nil {
		return stats, err
	}
	if stats.RevenueMonth, err = r.countFloat(ctx, `SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='PAID' AND created_at >= date_trunc('month', NOW())`); err != nil {
		return stats, err
	}

	rows, err := r.db.Pool.Query(ctx, `
		SELECT p.id, p.amount, p.currency, p.purpose, p.status, p.created_at,
		       COALESCE(gp.display_name, u.login, '') AS payer_name
		FROM payments p
		JOIN users u ON u.id = p.payer_id
		LEFT JOIN guide_profiles gp ON gp.user_id = p.payer_id
		ORDER BY p.id DESC LIMIT 15`)
	if err != nil {
		return stats, err
	}
	defer rows.Close()
	for rows.Next() {
		var row domain.AdminPaymentRow
		if err := rows.Scan(&row.ID, &row.Amount, &row.Currency, &row.Purpose, &row.Status, &row.CreatedAt, &row.PayerName); err != nil {
			return stats, err
		}
		stats.RecentPayments = append(stats.RecentPayments, row)
	}
	if err := rows.Err(); err != nil {
		return stats, err
	}
	if stats.RecentPayments == nil {
		stats.RecentPayments = []domain.AdminPaymentRow{}
	}
	return stats, nil
}

func (r *AdminRepo) GuideDashboardStats(ctx context.Context, guideID int64) (domain.GuideDashboardStats, error) {
	var stats domain.GuideDashboardStats
	var err error
	if stats.PublishedExcursions, err = r.countInt(ctx, `SELECT COUNT(*) FROM excursions WHERE guide_id=$1 AND status='PUBLISHED'`, guideID); err != nil {
		return stats, err
	}
	if stats.DraftExcursions, err = r.countInt(ctx, `SELECT COUNT(*) FROM excursions WHERE guide_id=$1 AND status='DRAFT'`, guideID); err != nil {
		return stats, err
	}
	if stats.PendingExcursions, err = r.countInt(ctx, `SELECT COUNT(*) FROM excursions WHERE guide_id=$1 AND status='PENDING_MODERATION'`, guideID); err != nil {
		return stats, err
	}
	if stats.UpcomingSlots, err = r.countInt(ctx, `SELECT COUNT(*) FROM guide_availability_slots WHERE guide_id=$1 AND ends_at > NOW()`, guideID); err != nil {
		return stats, err
	}
	return stats, nil
}
