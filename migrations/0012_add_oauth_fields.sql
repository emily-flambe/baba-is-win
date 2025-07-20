-- Migration 0012: Add OAuth authentication fields
-- This migration adds OAuth support (Google OAuth) to the users table
-- Note: Email management fields are handled in migration 0009

-- Add OAuth fields to users table
ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN provider_email TEXT;
ALTER TABLE users ADD COLUMN profile_picture_url TEXT;

-- Note: display_name already exists in user_profiles table (migration 0001)
-- For OAuth, we'll use the existing user_profiles.display_name field
-- No need to duplicate this field in the users table

-- Create indexes for OAuth lookups
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_provider ON users(provider);
CREATE INDEX idx_users_provider_email ON users(provider_email);

-- Update existing users to set default provider
UPDATE users SET provider = 'email' WHERE provider IS NULL;

-- Note: OAuth email verification will be handled in application logic
-- OAuth providers verify emails, so we can set email_verified = TRUE
-- when processing OAuth authentication in the application layer