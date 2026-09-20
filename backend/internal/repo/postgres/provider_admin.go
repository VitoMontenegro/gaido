package postgres

import (
	"context"
	"time"
)

const marketplaceProviderFilter = `
	AND (
		NOT EXISTS (SELECT 1 FROM carrier_profiles cp WHERE cp.provider_id = pr.id)
		OR EXISTS (SELECT 1 FROM service_offerings so WHERE so.provider_id = pr.id)
	)`

func (r *ProviderRepo) ListProvidersAdmin(ctx context.Context, status string) ([]map[string]any, error) {
	q := `
		SELECT pr.id, pr.user_id, pr.display_name, pr.business_name, pr.profession, pr.website_slug,
			pr.status, pr.rating_avg, pr.rating_count, pr.created_at, pr.updated_at,
			u.login, u.email, u.roles
		FROM providers pr
		JOIN users u ON u.id = pr.user_id
		WHERE TRUE` + marketplaceProviderFilter
	args := []any{}
	if status != "" {
		q += ` AND pr.status = $1`
		args = append(args, status)
	}
	q += ` ORDER BY pr.created_at DESC`
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var id, userID int64
		var displayName, businessName, profession, websiteSlug, statusStr string
		var ratingAvg float64
		var ratingCount int
		var createdAt, updatedAt time.Time
		var login, email string
		var roles []string
		if err := rows.Scan(&id, &userID, &displayName, &businessName, &profession, &websiteSlug,
			&statusStr, &ratingAvg, &ratingCount, &createdAt, &updatedAt, &login, &email, &roles); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id": id, "user_id": userID, "display_name": displayName, "business_name": businessName,
			"profession": profession, "website_slug": websiteSlug, "status": statusStr,
			"rating_avg": ratingAvg, "rating_count": ratingCount, "created_at": createdAt, "updated_at": updatedAt,
			"login": login, "email": email, "roles": roles,
		})
	}
	if out == nil {
		out = []map[string]any{}
	}
	return out, rows.Err()
}

func (r *ProviderRepo) UpdateProviderStatus(ctx context.Context, providerID int64, status string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE providers SET status=$1, updated_at=NOW() WHERE id=$2`, status, providerID)
	return err
}

func (r *ProviderRepo) ListOfferingsAdmin(ctx context.Context, status string) ([]map[string]any, error) {
	q := `
		SELECT o.id, o.provider_id, o.category_id, o.service_id, o.title, o.slug, o.description,
			o.status, o.has_availability, o.event_at, o.rating_avg, o.rating_count, o.created_at, o.updated_at,
			pr.display_name, pr.website_slug,
			COALESCE(sc.name, ''), COALESCE(sv.name, '')
		FROM service_offerings o
		JOIN providers pr ON pr.id = o.provider_id
		LEFT JOIN service_categories sc ON sc.id = o.category_id
		LEFT JOIN services sv ON sv.id = o.service_id
		WHERE TRUE`
	args := []any{}
	if status != "" {
		q += ` AND o.status = $1`
		args = append(args, status)
	}
	q += ` ORDER BY o.created_at DESC`
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var id, providerID, categoryID int64
		var serviceID *int64
		var title, slug, description, statusStr string
		var hasAvailability bool
		var eventAt *time.Time
		var ratingAvg float64
		var ratingCount int
		var createdAt, updatedAt time.Time
		var providerName, providerSlug, categoryName, serviceName string
		if err := rows.Scan(&id, &providerID, &categoryID, &serviceID, &title, &slug, &description,
			&statusStr, &hasAvailability, &eventAt, &ratingAvg, &ratingCount, &createdAt, &updatedAt,
			&providerName, &providerSlug, &categoryName, &serviceName); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id": id, "provider_id": providerID, "category_id": categoryID, "service_id": serviceID,
			"title": title, "slug": slug, "description": description, "status": statusStr,
			"has_availability": hasAvailability, "event_at": eventAt, "rating_avg": ratingAvg,
			"rating_count": ratingCount, "created_at": createdAt, "updated_at": updatedAt,
			"provider_name": providerName, "provider_slug": providerSlug,
			"category_name": categoryName, "service_name": serviceName,
		})
	}
	if out == nil {
		out = []map[string]any{}
	}
	return out, rows.Err()
}

func (r *ProviderRepo) UpdateOfferingStatus(ctx context.Context, offeringID int64, status string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE service_offerings SET status=$1, updated_at=NOW() WHERE id=$2`, status, offeringID)
	return err
}

func (r *ProviderRepo) ListComplaintsAdmin(ctx context.Context, status string) ([]map[string]any, error) {
	q := `
		SELECT c.id, c.reporter_id, c.target_type, c.target_id, c.reason, c.status, c.created_at,
			u.login, u.email
		FROM complaints c
		JOIN users u ON u.id = c.reporter_id
		WHERE TRUE`
	args := []any{}
	if status != "" {
		q += ` AND c.status = $1`
		args = append(args, status)
	}
	q += ` ORDER BY c.created_at DESC`
	rows, err := r.db.Pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []map[string]any
	for rows.Next() {
		var id, reporterID, targetID int64
		var targetType, reason, statusStr string
		var createdAt time.Time
		var reporterLogin, reporterEmail string
		if err := rows.Scan(&id, &reporterID, &targetType, &targetID, &reason, &statusStr, &createdAt,
			&reporterLogin, &reporterEmail); err != nil {
			return nil, err
		}
		out = append(out, map[string]any{
			"id": id, "reporter_id": reporterID, "target_type": targetType, "target_id": targetID,
			"reason": reason, "status": statusStr, "created_at": createdAt,
			"reporter_login": reporterLogin, "reporter_email": reporterEmail,
		})
	}
	if out == nil {
		out = []map[string]any{}
	}
	return out, rows.Err()
}

func (r *ProviderRepo) UpdateComplaintStatus(ctx context.Context, complaintID int64, status string) error {
	_, err := r.db.Pool.Exec(ctx, `UPDATE complaints SET status=$1 WHERE id=$2`, status, complaintID)
	return err
}
