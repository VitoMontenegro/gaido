-- +goose Up
CREATE TABLE review_photos (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES guide_reviews(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_photos_review ON review_photos(review_id);

-- +goose Down
DROP TABLE IF EXISTS review_photos;
