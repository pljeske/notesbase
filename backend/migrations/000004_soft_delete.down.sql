DROP INDEX IF EXISTS idx_pages_deleted_at;
ALTER TABLE pages DROP COLUMN IF EXISTS deleted_at;
