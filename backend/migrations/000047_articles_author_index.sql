-- +goose Up
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);

-- +goose Down
DROP INDEX IF EXISTS idx_articles_author_id;
