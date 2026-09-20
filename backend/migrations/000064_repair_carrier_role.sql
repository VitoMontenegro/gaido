-- +goose Up
-- Repair 000063: that version was applied with a bad join (users.id = carrier_profiles.provider_id),
-- so ROLE_CARRIER was never granted. Also cover listing authors without a carrier_profiles row.

UPDATE users
SET roles = array_append(roles, 'ROLE_CARRIER'), updated_at = NOW()
WHERE id IN (
  SELECT p.user_id
  FROM carrier_profiles cp
  JOIN providers p ON p.id = cp.provider_id
)
  AND NOT ('ROLE_CARRIER' = ANY(roles));

UPDATE users
SET roles = array_append(roles, 'ROLE_CARRIER'), updated_at = NOW()
WHERE id IN (
  SELECT p.user_id
  FROM transport_listings tl
  JOIN providers p ON p.id = tl.provider_id
)
  AND NOT ('ROLE_CARRIER' = ANY(roles));

UPDATE users
SET roles = array_remove(roles, 'ROLE_PROVIDER'), updated_at = NOW()
WHERE 'ROLE_CARRIER' = ANY(roles)
  AND 'ROLE_PROVIDER' = ANY(roles)
  AND id NOT IN (
    SELECT p.user_id
    FROM service_offerings o
    JOIN providers p ON p.id = o.provider_id
  );

-- +goose Down
UPDATE users
SET roles = array_remove(roles, 'ROLE_CARRIER'), updated_at = NOW()
WHERE 'ROLE_CARRIER' = ANY(roles)
  AND id NOT IN (
    SELECT p.user_id
    FROM carrier_profiles cp
    JOIN providers p ON p.id = cp.provider_id
  );

UPDATE users
SET roles = array_append(roles, 'ROLE_PROVIDER'), updated_at = NOW()
WHERE 'ROLE_CARRIER' = ANY(roles)
  AND NOT ('ROLE_PROVIDER' = ANY(roles));
