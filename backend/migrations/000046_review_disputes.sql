-- +goose Up
CREATE TABLE review_disputes (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES guide_reviews(id) ON DELETE CASCADE,
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(review_id)
);

CREATE INDEX idx_review_disputes_status ON review_disputes(status);

-- +goose Down
DROP TABLE IF EXISTS review_disputes;
