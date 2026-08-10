-- Free email/login from soft-deleted accounts for re-registration.
-- +goose Up
UPDATE users
SET
  email = 'deleted_' || id || '@deleted.local',
  login = 'deleted_' || id,
  updated_at = NOW()
WHERE deleted_at IS NOT NULL
  AND email NOT LIKE 'deleted\_%@deleted.local' ESCAPE '\';

-- +goose Down
-- Irreversible: original email/login for deleted users are not restored.
