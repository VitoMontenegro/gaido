-- +goose Up
-- Split ROLE_PROVIDER: marketplace author (servis) vs ROLE_CARRIER (vezu).
-- carrier_profiles.provider_id references providers.id, not users.id.

-- Every user with a carrier profile gets ROLE_CARRIER.
UPDATE users
SET roles = array_append(roles, 'ROLE_CARRIER'), updated_at = NOW()
WHERE id IN (
  SELECT p.user_id
  FROM carrier_profiles cp
  JOIN providers p ON p.id = cp.provider_id
)
  AND NOT ('ROLE_CARRIER' = ANY(roles));

-- Carrier-only users lose ROLE_PROVIDER. Dual-role authors (offerings on servis) keep it.
UPDATE users
SET roles = array_remove(roles, 'ROLE_PROVIDER'), updated_at = NOW()
WHERE id IN (
  SELECT p.user_id
  FROM carrier_profiles cp
  JOIN providers p ON p.id = cp.provider_id
)
  AND 'ROLE_PROVIDER' = ANY(roles)
  AND id NOT IN (
    SELECT p.user_id
    FROM service_offerings o
    JOIN providers p ON p.id = o.provider_id
  );

-- +goose Down
UPDATE users
SET roles = array_remove(roles, 'ROLE_CARRIER'), updated_at = NOW()
WHERE 'ROLE_CARRIER' = ANY(roles);

UPDATE users
SET roles = array_append(roles, 'ROLE_PROVIDER'), updated_at = NOW()
WHERE id IN (
  SELECT p.user_id
  FROM carrier_profiles cp
  JOIN providers p ON p.id = cp.provider_id
)
  AND NOT ('ROLE_PROVIDER' = ANY(roles));
