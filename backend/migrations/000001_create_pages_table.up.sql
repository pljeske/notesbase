CREATE
EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE pages
(
  id         UUID PRIMARY KEY     DEFAULT uuid_generate_v4(),
  parent_id  UUID REFERENCES pages (id) ON DELETE CASCADE,
  title      TEXT        NOT NULL DEFAULT 'Untitled',
  content    JSONB       NOT NULL DEFAULT '{
    "type": "doc",
    "content": [
      {
        "type": "paragraph"
      }
    ]
  }'::jsonb,
  position   INTEGER     NOT NULL DEFAULT 0,
  icon       TEXT                 DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pages_parent_id ON pages (parent_id);
CREATE INDEX idx_pages_parent_position ON pages (parent_id, position);

CREATE
OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at
= NOW();
RETURN NEW;
END;
$$
language 'plpgsql';

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE
  ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
