-- +goose Up
CREATE TABLE inquiries (
    id BIGSERIAL PRIMARY KEY,
    tourist_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    excursion_id BIGINT REFERENCES excursions(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'new',
    preferred_date DATE,
    date_from DATE,
    date_to DATE,
    party_size INT NOT NULL DEFAULT 1,
    language VARCHAR(80) NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    help_requested BOOLEAN NOT NULL DEFAULT FALSE,
    first_guide_reply_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inquiries_status_chk CHECK (status IN ('new', 'discussing', 'closed', 'cancelled')),
    CONSTRAINT inquiries_party_chk CHECK (party_size >= 1 AND party_size <= 100)
);

CREATE INDEX idx_inquiries_guide_status ON inquiries(guide_id, status, created_at DESC);
CREATE INDEX idx_inquiries_tourist ON inquiries(tourist_user_id, created_at DESC);
CREATE INDEX idx_inquiries_help ON inquiries(help_requested) WHERE help_requested AND status IN ('new', 'discussing');
CREATE INDEX idx_inquiries_preferred_date ON inquiries(guide_id, preferred_date) WHERE preferred_date IS NOT NULL;

CREATE TABLE inquiry_messages (
    id BIGSERIAL PRIMARY KEY,
    inquiry_id BIGINT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    author_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    author_role VARCHAR(20) NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'text',
    body TEXT NOT NULL DEFAULT '',
    media_key VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT inquiry_messages_role_chk CHECK (author_role IN ('tourist', 'guide', 'admin', 'system')),
    CONSTRAINT inquiry_messages_kind_chk CHECK (kind IN ('text', 'system', 'attachment', 'internal_note'))
);

CREATE INDEX idx_inquiry_messages_thread ON inquiry_messages(inquiry_id, id);

CREATE TABLE inquiry_reads (
    inquiry_id BIGINT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (inquiry_id, user_id)
);

CREATE TABLE inquiry_admin_log (
    id BIGSERIAL PRIMARY KEY,
    inquiry_id BIGINT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    admin_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inquiry_admin_log_inquiry ON inquiry_admin_log(inquiry_id, created_at DESC);

CREATE TABLE guide_funnel_events (
    id BIGSERIAL PRIMARY KEY,
    guide_id BIGINT NOT NULL REFERENCES guide_profiles(id) ON DELETE CASCADE,
    excursion_id BIGINT REFERENCES excursions(id) ON DELETE SET NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    session_key VARCHAR(64) NOT NULL DEFAULT '',
    event_type VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_funnel_guide_created ON guide_funnel_events(guide_id, event_type, created_at DESC);
CREATE INDEX idx_funnel_unique_view ON guide_funnel_events (
    guide_id,
    event_type,
    (COALESCE(excursion_id, 0)),
    (COALESCE(user_id, 0)),
    session_key,
    ((timezone('UTC', created_at))::date)
);

-- +goose Down
DROP TABLE IF EXISTS guide_funnel_events;
DROP TABLE IF EXISTS inquiry_admin_log;
DROP TABLE IF EXISTS inquiry_reads;
DROP TABLE IF EXISTS inquiry_messages;
DROP TABLE IF EXISTS inquiries;
