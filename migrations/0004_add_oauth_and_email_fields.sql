-- Migration 0004: Add OAuth authentication and email management fields
-- This migration combines OAuth support with email functionality
-- Compatible with both feature-google-oauth and feature-email-signup branches

-- Add OAuth fields to users table
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN provider_email TEXT;
ALTER TABLE users ADD COLUMN profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Add email management fields to users table
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
ALTER TABLE users ADD COLUMN email_verification_expires_at INTEGER;
ALTER TABLE users ADD COLUMN last_email_sent_at INTEGER;
ALTER TABLE users ADD COLUMN email_bounce_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN email_status TEXT DEFAULT 'active';  -- 'active', 'bounced', 'blocked', 'unsubscribed'
ALTER TABLE users ADD COLUMN unsubscribe_all BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_frequency TEXT DEFAULT 'immediate';  -- 'immediate', 'daily', 'weekly'

-- Create indexes for OAuth lookups
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_provider ON users(provider);
CREATE INDEX idx_users_provider_email ON users(provider_email);

-- Create indexes for email management
CREATE INDEX idx_users_email_status ON users(email_status);
CREATE INDEX idx_users_email_verified ON users(email_verified);
CREATE INDEX idx_users_last_email_sent_at ON users(last_email_sent_at);
CREATE INDEX idx_users_unsubscribe_all ON users(unsubscribe_all);

-- Update existing users to set default provider
UPDATE users SET provider = 'email' WHERE provider IS NULL;

-- For OAuth users, set email as verified by default (since OAuth providers verify email)
-- This will be handled in the application logic, not in the migration