-- +goose Up
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

UPDATE users SET email = lower(btrim(email)) WHERE email IS DISTINCT FROM lower(btrim(email));

-- +goose StatementBegin
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM users WHERE deleted_at IS NULL
        GROUP BY lower(btrim(email)) HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'duplicate live emails after lower(btrim(email)); resolve before applying 000082';
    END IF;
END $$;
-- +goose StatementEnd

DROP INDEX IF EXISTS idx_users_email_active;
CREATE UNIQUE INDEX idx_users_email_active ON users (lower(btrim(email))) WHERE deleted_at IS NULL;

CREATE TABLE user_identities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    issuer VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    UNIQUE (provider, issuer, subject)
);

CREATE INDEX idx_user_identities_user ON user_identities (user_id);

CREATE TABLE user_consents (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_key VARCHAR(64) NOT NULL,
    version VARCHAR(64) NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_consents_user ON user_consents (user_id);

CREATE TABLE profile_slug_aliases (
    id BIGSERIAL PRIMARY KEY,
    space VARCHAR(20) NOT NULL,
    slug VARCHAR(150) NOT NULL,
    profile_id BIGINT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (space, slug)
);

CREATE INDEX idx_profile_slug_aliases_profile ON profile_slug_aliases (space, profile_id);

INSERT INTO profile_slug_aliases (space, slug, profile_id, is_current)
SELECT 'guide', website_slug, id, TRUE
FROM guide_profiles
WHERE btrim(website_slug) <> ''
ON CONFLICT (space, slug) DO NOTHING;

INSERT INTO profile_slug_aliases (space, slug, profile_id, is_current)
SELECT 'provider', website_slug, id, TRUE
FROM providers
WHERE btrim(website_slug) <> ''
ON CONFLICT (space, slug) DO NOTHING;

INSERT INTO profile_slug_aliases (space, slug, profile_id, is_current)
SELECT 'carrier', website_slug, provider_id, TRUE
FROM carrier_profiles
WHERE btrim(website_slug) <> ''
ON CONFLICT (space, slug) DO NOTHING;

-- +goose Down
DROP TABLE IF EXISTS profile_slug_aliases;
DROP TABLE IF EXISTS user_consents;
DROP TABLE IF EXISTS user_identities;
DROP INDEX IF EXISTS idx_users_email_active;
CREATE UNIQUE INDEX idx_users_email_active ON users (email) WHERE deleted_at IS NULL;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
