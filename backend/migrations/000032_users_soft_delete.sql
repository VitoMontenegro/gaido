-- +goose Up
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL;

UPDATE articles a
SET author_id = sub.admin_id, updated_at = NOW()
FROM (
    SELECT id AS admin_id
    FROM users
    WHERE deleted_at IS NULL AND 'ROLE_ADMIN' = ANY(roles)
    ORDER BY id
    LIMIT 1
) sub
WHERE a.author_id IS NULL AND sub.admin_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_users_active;
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
