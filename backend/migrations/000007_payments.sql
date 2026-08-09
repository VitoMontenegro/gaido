-- +goose Up
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    payer_id BIGINT NOT NULL REFERENCES users(id),
    payer_type VARCHAR(20) NOT NULL DEFAULT 'GUIDE',
    purpose VARCHAR(30) NOT NULL DEFAULT 'GUIDE_PLACEMENT',
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    status VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    provider_payment_id VARCHAR(255) UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_payer ON payments(payer_id);

-- +goose Down
DROP TABLE IF EXISTS payments;
