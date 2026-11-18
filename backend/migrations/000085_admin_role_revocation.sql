-- +goose Up
-- Ролі, зняті адміністратором: самостійне збереження профілю не повертає їх.
ALTER TABLE users ADD COLUMN IF NOT EXISTS revoked_roles TEXT[] NOT NULL DEFAULT '{}';

-- Статус профілю до зняття ролі адміністратором (NULL — профіль не прихований через зняття ролі).
ALTER TABLE guide_profiles ADD COLUMN IF NOT EXISTS status_before_role_removal VARCHAR(30) NULL;
ALTER TABLE carrier_profiles ADD COLUMN IF NOT EXISTS status_before_role_removal VARCHAR(30) NULL;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS status_before_role_removal VARCHAR(30) NULL;

-- +goose Down
ALTER TABLE providers DROP COLUMN IF EXISTS status_before_role_removal;
ALTER TABLE carrier_profiles DROP COLUMN IF EXISTS status_before_role_removal;
ALTER TABLE guide_profiles DROP COLUMN IF EXISTS status_before_role_removal;
ALTER TABLE users DROP COLUMN IF EXISTS revoked_roles;
