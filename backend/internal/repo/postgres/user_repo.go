package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/vitomonte/experts-tourister/internal/domain"
)

type UserRepo struct{ db *DB }

func NewUserRepo(db *DB) *UserRepo { return &UserRepo{db: db} }

const userSelectCols = `id, email, login, first_name, last_name, password_hash, roles, status, created_at, deleted_at`

func (r *UserRepo) Create(ctx context.Context, email, login, firstName, lastName, hash string, roles []string) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		INSERT INTO users (email, login, first_name, last_name, password_hash, roles)
		VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
	`, email, login, firstName, lastName, hash, roles).Scan(&id)
	return id, err
}

func (r *UserRepo) GetByLogin(ctx context.Context, login string) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+userSelectCols+` FROM users WHERE login=$1 AND deleted_at IS NULL
	`, login)
	return scanUser(row)
}

func (r *UserRepo) GetByLoginOrEmail(ctx context.Context, ident string) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+userSelectCols+` FROM users
		WHERE deleted_at IS NULL AND (lower(login)=lower($1) OR lower(email)=lower($1))
		LIMIT 1
	`, ident)
	return scanUser(row)
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+userSelectCols+` FROM users WHERE email=$1 AND deleted_at IS NULL
	`, email)
	return scanUser(row)
}

func (r *UserRepo) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+userSelectCols+` FROM users WHERE id=$1 AND deleted_at IS NULL
	`, id)
	return scanUser(row)
}

func (r *UserRepo) GetByIDAny(ctx context.Context, id int64) (*domain.User, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT `+userSelectCols+` FROM users WHERE id=$1
	`, id)
	return scanUser(row)
}

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	err := row.Scan(
		&u.ID, &u.Email, &u.Login, &u.FirstName, &u.LastName, &u.PasswordHash,
		&u.Roles, &u.Status, &u.CreatedAt, &u.DeletedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &u, err
}

func (r *UserRepo) UpdateProfile(ctx context.Context, id int64, firstName, lastName string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE users SET first_name=$2, last_name=$3, updated_at=NOW()
		WHERE id=$1 AND deleted_at IS NULL
	`, id, firstName, lastName)
	return err
}

func (r *UserRepo) AddRole(ctx context.Context, userID int64, role string) error {
	_, err := r.db.Pool.Exec(ctx, `
		UPDATE users SET roles = array_append(roles, $2), updated_at=NOW()
		WHERE id=$1 AND NOT ($2 = ANY(roles)) AND deleted_at IS NULL`, userID, role)
	return err
}

func (r *UserRepo) List(ctx context.Context, limit, offset int) ([]domain.User, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT `+userSelectCols+`
		FROM users
		WHERE deleted_at IS NULL
		ORDER BY id LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []domain.User
	for rows.Next() {
		var u domain.User
		if err := rows.Scan(
			&u.ID, &u.Email, &u.Login, &u.FirstName, &u.LastName, &u.PasswordHash,
			&u.Roles, &u.Status, &u.CreatedAt, &u.DeletedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (r *UserRepo) SaveRefreshToken(ctx context.Context, userID int64, hash string, exp time.Time) error {
	_, err := r.db.Pool.Exec(ctx, `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)`, userID, hash, exp)
	return err
}

func (r *UserRepo) GetRefreshToken(ctx context.Context, hash string) (userID int64, exp time.Time, err error) {
	err = r.db.Pool.QueryRow(ctx, `
		SELECT rt.user_id, rt.expires_at
		FROM refresh_tokens rt
		JOIN users u ON u.id = rt.user_id
		WHERE rt.token_hash=$1 AND u.deleted_at IS NULL
	`, hash).Scan(&userID, &exp)
	return
}

func (r *UserRepo) DeleteRefreshToken(ctx context.Context, hash string) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE token_hash=$1`, hash)
	return err
}

func (r *UserRepo) DeleteRefreshTokensForUser(ctx context.Context, userID int64) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM refresh_tokens WHERE user_id=$1`, userID)
	return err
}

func (r *UserRepo) CountAdmins(ctx context.Context) (int, error) {
	var n int
	err := r.db.Pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM users
		WHERE deleted_at IS NULL AND status = 'ACTIVE' AND 'ROLE_ADMIN' = ANY(roles)
	`).Scan(&n)
	return n, err
}

func (r *UserRepo) FirstAdminID(ctx context.Context) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id FROM users
		WHERE deleted_at IS NULL AND 'ROLE_ADMIN' = ANY(roles)
		ORDER BY id
		LIMIT 1
	`).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return id, err
}

func (r *UserRepo) ListAdminIDs(ctx context.Context) ([]int64, error) {
	rows, err := r.db.Pool.Query(ctx, `
		SELECT id FROM users
		WHERE deleted_at IS NULL AND status = 'ACTIVE' AND 'ROLE_ADMIN' = ANY(roles)
		ORDER BY id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *UserRepo) FirstAdminIDExcluding(ctx context.Context, excludeID int64) (int64, error) {
	var id int64
	err := r.db.Pool.QueryRow(ctx, `
		SELECT id FROM users
		WHERE deleted_at IS NULL AND id <> $1 AND 'ROLE_ADMIN' = ANY(roles)
		ORDER BY id
		LIMIT 1
	`, excludeID).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return id, err
}

func (r *UserRepo) SoftDelete(ctx context.Context, id int64) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err = tx.Exec(ctx, `DELETE FROM refresh_tokens WHERE user_id = $1`, id); err != nil {
		return err
	}

	tag, err := tx.Exec(ctx, `
		UPDATE users
		SET
			email = 'deleted_' || id || '@deleted.local',
			login = 'deleted_' || id,
			status = 'DELETED',
			deleted_at = NOW(),
			updated_at = NOW()
		WHERE id = $1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	// Hide guide from public catalog and contact paywall.
	if _, err = tx.Exec(ctx, `
		UPDATE guide_profiles
		SET status = 'BLOCKED', updated_at = NOW()
		WHERE user_id = $1 AND status <> 'BLOCKED'
	`, id); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
