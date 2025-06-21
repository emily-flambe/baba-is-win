-- Add announcements email preference column to users table
ALTER TABLE users ADD COLUMN email_announcements BOOLEAN DEFAULT FALSE;