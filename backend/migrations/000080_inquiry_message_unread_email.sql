-- +goose Up
ALTER TABLE inquiry_messages
    ADD COLUMN unread_email_sent_at TIMESTAMPTZ;

UPDATE inquiry_messages
SET unread_email_sent_at = created_at
WHERE unread_email_sent_at IS NULL;

CREATE INDEX idx_inquiry_messages_unread_email
    ON inquiry_messages (created_at)
    WHERE unread_email_sent_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_inquiry_messages_unread_email;
ALTER TABLE inquiry_messages DROP COLUMN IF EXISTS unread_email_sent_at;
