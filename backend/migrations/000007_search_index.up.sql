-- GIN indexes for full-text search on pages
CREATE INDEX idx_pages_fts_title   ON pages USING gin(to_tsvector('english', title));
CREATE INDEX idx_pages_fts_content ON pages USING gin(jsonb_to_tsvector('english', content, '["string"]'));
