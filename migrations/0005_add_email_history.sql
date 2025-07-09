-- Migration 0005: Add email notification history table
-- This table tracks the lifecycle of email notifications for analytics and debugging

CREATE TABLE email_notification_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  action TEXT NOT NULL,              -- 'queued', 'sent', 'failed', 'bounced', 'opened', 'clicked'
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  details TEXT,                      -- JSON string with additional data
  ip_address TEXT,                   -- for tracking opens/clicks
  user_agent TEXT,                   -- for tracking opens/clicks
  error_code TEXT,                   -- specific error codes
  retry_attempt INTEGER DEFAULT 0,   -- which retry attempt this was
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_id) REFERENCES email_notifications(id) ON DELETE CASCADE
);

-- Indexes for analytics and debugging
CREATE INDEX idx_email_notification_history_user_id ON email_notification_history(user_id);
CREATE INDEX idx_email_notification_history_notification_id ON email_notification_history(notification_id);
CREATE INDEX idx_email_notification_history_timestamp ON email_notification_history(timestamp);
CREATE INDEX idx_email_notification_history_action ON email_notification_history(action);
CREATE INDEX idx_email_notification_history_action_timestamp ON email_notification_history(action, timestamp);