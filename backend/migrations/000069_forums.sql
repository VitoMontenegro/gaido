-- +goose Up
CREATE TABLE forums (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    audience VARCHAR(20) NOT NULL CHECK (audience IN ('public', 'guides')),
    topic_count INTEGER NOT NULL DEFAULT 0,
    post_count INTEGER NOT NULL DEFAULT 0,
    last_post_id BIGINT,
    last_post_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE forum_topics (
    id BIGSERIAL PRIMARY KEY,
    forum_id BIGINT NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    post_count INTEGER NOT NULL DEFAULT 0,
    last_post_id BIGINT,
    last_post_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_topics_forum_last ON forum_topics (forum_id, last_post_at DESC NULLS LAST, id DESC);

CREATE TABLE forum_posts (
    id BIGSERIAL PRIMARY KEY,
    topic_id BIGINT NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_forum_posts_topic_id ON forum_posts (topic_id, id);

INSERT INTO forums (slug, title, description, audience) VALUES
(
    'podorozhi',
    'Подорожі',
    'Поради, маршрути та враження мандрівників українською.',
    'public'
),
(
    'gidam',
    'Для гідів',
    'Закритий форум для гідів: робота з туристами, бронювання та обмін досвідом.',
    'guides'
);

-- +goose Down
DROP TABLE IF EXISTS forum_posts;
DROP TABLE IF EXISTS forum_topics;
DROP TABLE IF EXISTS forums;
