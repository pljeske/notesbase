-- Partial index for the common case: listing active (non-deleted) pages per user.
-- The existing idx_pages_deleted_at only covers deleted rows; this covers live rows.
CREATE INDEX idx_pages_active ON pages (user_id, position) WHERE deleted_at IS NULL;
