-- Migration 0004: Add email notifications table
-- This table manages email notifications for content updates and announcements

CREATE TABLE email_notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL,        -- 'blog', 'thought', 'announcement'
  content_id TEXT NOT NULL,          -- slug or identifier
  content_title TEXT NOT NULL,       -- display title
  content_url TEXT NOT NULL,         -- full URL to content
  content_excerpt TEXT,              -- brief excerpt for email
  notification_type TEXT NOT NULL,   -- 'new_content', 'announcement'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'failed', 'cancelled'
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  scheduled_for INTEGER,             -- when to send (null = immediate)
  sent_at INTEGER,                   -- when actually sent
  error_message TEXT,                -- error details if failed
  retry_count INTEGER DEFAULT 0,     -- number of retry attempts
  next_retry_at INTEGER,             -- when to retry next
  email_message_id TEXT,             -- Gmail message ID for tracking
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_content_type ON email_notifications(content_type);
CREATE INDEX idx_email_notifications_created_at ON email_notifications(created_at);
CREATE INDEX idx_email_notifications_status_retry ON email_notifications(status, next_retry_at);
CREATE INDEX idx_email_notifications_scheduled_for ON email_notifications(scheduled_for);