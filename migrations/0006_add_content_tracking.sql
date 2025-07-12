-- Migration 0006: Add content items tracking table
-- This table tracks published content for notification management

CREATE TABLE content_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL,        -- 'blog', 'thought'
  title TEXT NOT NULL,
  description TEXT,                  -- for blog posts
  content_preview TEXT,              -- first 200 chars of content
  publish_date INTEGER NOT NULL,     -- when published
  file_path TEXT NOT NULL,           -- original file path
  content_hash TEXT,                 -- SHA-256 hash for change detection
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_count INTEGER DEFAULT 0,  -- how many notifications sent
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  tags TEXT                          -- JSON array of tags
);

-- Indexes for content queries
CREATE INDEX idx_content_items_slug ON content_items(slug);
CREATE INDEX idx_content_items_type ON content_items(content_type);
CREATE INDEX idx_content_items_publish_date ON content_items(publish_date);
CREATE INDEX idx_content_items_notification_sent ON content_items(notification_sent);
CREATE INDEX idx_content_items_type_date ON content_items(content_type, publish_date);
CREATE INDEX idx_content_items_updated_at ON content_items(updated_at);