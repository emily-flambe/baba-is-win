-- Migration 0008: Add unsubscribe tokens table
-- This table manages secure unsubscribe tokens for email preferences

CREATE TABLE unsubscribe_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  token_type TEXT NOT NULL,           -- 'one_click', 'preference_change', 'complete'
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  used_at INTEGER,                    -- when token was used
  expires_at INTEGER NOT NULL,        -- token expiration
  ip_address TEXT,                    -- IP that used token
  user_agent TEXT,                    -- User agent that used token
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for token validation
CREATE INDEX idx_unsubscribe_tokens_token ON unsubscribe_tokens(token);
CREATE INDEX idx_unsubscribe_tokens_user_id ON unsubscribe_tokens(user_id);
CREATE INDEX idx_unsubscribe_tokens_expires_at ON unsubscribe_tokens(expires_at);
CREATE INDEX idx_unsubscribe_tokens_used_at ON unsubscribe_tokens(used_at);