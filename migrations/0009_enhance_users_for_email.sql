-- Migration 0009: Enhance users table for email functionality
-- This adds email verification, status tracking, and preference management

ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
ALTER TABLE users ADD COLUMN email_verification_expires_at INTEGER;
ALTER TABLE users ADD COLUMN last_email_sent_at INTEGER;
ALTER TABLE users ADD COLUMN email_bounce_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN email_status TEXT DEFAULT 'active';  -- 'active', 'bounced', 'blocked', 'unsubscribed'
ALTER TABLE users ADD COLUMN unsubscribe_all BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_frequency TEXT DEFAULT 'immediate';  -- 'immediate', 'daily', 'weekly'

-- Indexes for email management
CREATE INDEX idx_users_email_status ON users(email_status);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_last_email_sent_at ON users(last_email_sent_at);
CREATE INDEX idx_users_unsubscribe_all ON users(unsubscribe_all);