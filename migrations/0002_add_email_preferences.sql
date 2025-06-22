-- Add email preference columns to users table
ALTER TABLE users ADD COLUMN email_blog_updates BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_thought_updates BOOLEAN DEFAULT FALSE;