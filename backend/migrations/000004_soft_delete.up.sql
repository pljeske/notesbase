ALTER TABLE pages ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX idx_pages_deleted_at ON pages (user_id, deleted_at) WHERE deleted_at IS NOT NULL;
