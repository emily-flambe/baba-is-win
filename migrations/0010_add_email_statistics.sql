-- Migration 0010: Add email statistics table
-- This table tracks email delivery statistics for analytics

CREATE TABLE email_statistics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date_key TEXT NOT NULL,             -- YYYY-MM-DD format
  content_type TEXT NOT NULL,         -- 'blog', 'thought', 'announcement'
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(date_key, content_type)
);

-- Indexes for analytics
CREATE INDEX idx_email_statistics_date_key ON email_statistics(date_key);
CREATE INDEX idx_email_statistics_content_type ON email_statistics(content_type);
CREATE INDEX idx_email_statistics_date_type ON email_statistics(date_key, content_type);