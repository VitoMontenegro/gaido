-- +goose Up
ALTER TABLE articles
    ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'journal';

UPDATE articles a
SET kind = 'news'
FROM news_items n
WHERE n.article_id = a.id AND n.status = 'published';

CREATE INDEX IF NOT EXISTS idx_articles_kind_status ON articles (kind, status);

-- +goose Down
DROP INDEX IF EXISTS idx_articles_kind_status;
ALTER TABLE articles DROP COLUMN IF EXISTS kind;
