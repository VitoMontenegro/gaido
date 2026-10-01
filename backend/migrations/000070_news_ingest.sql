-- +goose Up
CREATE TABLE news_feeds (
    id BIGSERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE news_items (
    id BIGSERIAL PRIMARY KEY,
    feed_id BIGINT NOT NULL REFERENCES news_feeds(id) ON DELETE CASCADE,
    source_guid TEXT NOT NULL,
    source_url TEXT NOT NULL DEFAULT '',
    source_title TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL,
    skip_reason TEXT NOT NULL DEFAULT '',
    article_id BIGINT REFERENCES articles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (feed_id, source_guid)
);

CREATE INDEX idx_news_items_guid ON news_items(source_guid);
CREATE INDEX idx_news_items_url ON news_items(source_url) WHERE source_url <> '';

INSERT INTO news_feeds (url, title) VALUES
    ('https://feeds.bbci.co.uk/ukrainian/rss.xml', 'BBC News Україна');

-- +goose Down
DROP TABLE IF EXISTS news_items;
DROP TABLE IF EXISTS news_feeds;
