CREATE TABLE files
(
  id           UUID PRIMARY KEY     DEFAULT uuid_generate_v4(),
  page_id      UUID REFERENCES pages (id) ON DELETE CASCADE,
  filename     TEXT        NOT NULL,
  content_type TEXT        NOT NULL,
  size         BIGINT      NOT NULL,
  s3_key       TEXT        NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_files_page_id ON files (page_id);
CREATE INDEX idx_files_s3_key ON files (s3_key);
