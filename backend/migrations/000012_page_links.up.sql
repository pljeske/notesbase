CREATE TABLE page_links
(
  source_page_id UUID NOT NULL REFERENCES pages (id) ON DELETE CASCADE,
  target_page_id UUID NOT NULL REFERENCES pages (id) ON DELETE CASCADE,
  PRIMARY KEY (source_page_id, target_page_id)
);
CREATE INDEX idx_page_links_target ON page_links (target_page_id);
