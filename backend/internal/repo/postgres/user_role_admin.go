package postgres

import (
	"context"
	"fmt"

	"github.com/vitomonte/experts-tourister/internal/domain"
)

// roleProfileHide описує, який профіль ховати при знятті ролі адміністратором
// і в який статус його переводити.
type roleProfileHide struct {
	table      string
	where      string // умова за $1 = user_id
	hideStatus string
}

var roleProfiles = map[string]roleProfileHide{
	domain.RoleGuide: {
		table:      "guide_profiles",
		where:      "user_id = $1",
		hideStatus: domain.GuideStatusSuspended,
	},
	domain.RoleCarrier: {
		table:      "carrier_profiles",
		where:      "provider_id IN (SELECT id FROM providers WHERE user_id = $1)",
		hideStatus: domain.CarrierStatusSuspended,
	},
	domain.RoleProvider: {
		table:      "providers",
		where:      "user_id = $1",
		hideStatus: domain.ProviderStatusBlocked,
	},
}

// IsAdminManagedRole — ролі, які адміністратор може видавати й знімати вручну.
func IsAdminManagedRole(role string) bool {
	_, ok := roleProfiles[role]
	return ok
}

// SetRoleByAdmin видає або знімає професійну роль.
// Зняття: роль прибирається, потрапляє в revoked_roles (самостійне збереження профілю її не поверне),
// публічний профіль ховається з запам'ятовуванням попереднього статусу.
// Видача: роль додається, revoked_roles очищується, профіль повертається в попередній статус,
// якщо за цей час статус ніхто не змінював.
func (r *UserRepo) SetRoleByAdmin(ctx context.Context, userID int64, role string, enabled bool) error {
	prof, ok := roleProfiles[role]
	if !ok {
		return fmt.Errorf("role %q is not admin-managed", role)
	}
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if enabled {
		if _, err := tx.Exec(ctx, `
			UPDATE users
			SET roles = CASE WHEN $2 = ANY(roles) THEN roles ELSE array_append(roles, $2) END,
			    revoked_roles = array_remove(revoked_roles, $2),
			    updated_at = NOW()
			WHERE id = $1 AND deleted_at IS NULL`, userID, role); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, fmt.Sprintf(`
			UPDATE %s
			SET status = CASE WHEN status = $2 THEN status_before_role_removal ELSE status END,
			    status_before_role_removal = NULL,
			    updated_at = NOW()
			WHERE %s AND status_before_role_removal IS NOT NULL`, prof.table, prof.where), userID, prof.hideStatus); err != nil {
			return err
		}
	} else {
		if _, err := tx.Exec(ctx, `
			UPDATE users
			SET roles = array_remove(roles, $2),
			    revoked_roles = CASE WHEN $2 = ANY(revoked_roles) THEN revoked_roles ELSE array_append(revoked_roles, $2) END,
			    updated_at = NOW()
			WHERE id = $1 AND deleted_at IS NULL`, userID, role); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, fmt.Sprintf(`
			UPDATE %s
			SET status_before_role_removal = COALESCE(status_before_role_removal, status),
			    status = $2,
			    updated_at = NOW()
			WHERE %s`, prof.table, prof.where), userID, prof.hideStatus); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// IsRoleRevoked — чи зняв адміністратор цю роль у користувача.
func (r *UserRepo) IsRoleRevoked(ctx context.Context, userID int64, role string) (bool, error) {
	var revoked bool
	err := r.db.Pool.QueryRow(ctx, `
		SELECT $2 = ANY(revoked_roles) FROM users WHERE id = $1`, userID, role).Scan(&revoked)
	if err != nil {
		return false, err
	}
	return revoked, nil
}
