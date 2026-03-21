-- Enforce NOT NULL on user_id for pages and files.
-- These columns were added in migration 000003 without the constraint.
ALTER TABLE pages
  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE files
  ALTER COLUMN user_id SET NOT NULL;
