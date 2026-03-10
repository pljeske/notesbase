CREATE TABLE tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);
CREATE INDEX idx_tags_user_id ON tags(user_id);

CREATE TABLE page_tags (
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (page_id, tag_id)
);
CREATE INDEX idx_page_tags_tag_id ON page_tags(tag_id);
CREATE INDEX idx_page_tags_page_id ON page_tags(page_id);
