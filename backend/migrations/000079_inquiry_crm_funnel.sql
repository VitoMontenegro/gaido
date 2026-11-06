-- +goose Up
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_chk;
UPDATE inquiries SET status = 'done' WHERE status = 'closed';
ALTER TABLE inquiries
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE inquiries
    ADD CONSTRAINT inquiries_status_chk CHECK (status IN (
        'new', 'discussing', 'pending', 'booked', 'done', 'cancelled'
    ));
CREATE INDEX IF NOT EXISTS idx_inquiries_scheduled
    ON inquiries (guide_id, scheduled_at)
    WHERE scheduled_at IS NOT NULL AND status IN ('pending', 'booked');

-- +goose Down
DROP INDEX IF EXISTS idx_inquiries_scheduled;
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_chk;
UPDATE inquiries SET status = 'closed' WHERE status IN ('done', 'pending', 'booked');
ALTER TABLE inquiries
    DROP COLUMN IF EXISTS scheduled_at,
    DROP COLUMN IF EXISTS scheduled_end_at,
    DROP COLUMN IF EXISTS cancel_reason,
    DROP COLUMN IF EXISTS cancelled_by;
ALTER TABLE inquiries
    ADD CONSTRAINT inquiries_status_chk CHECK (status IN ('new', 'discussing', 'closed', 'cancelled'));
