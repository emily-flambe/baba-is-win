-- Add admin role to users table
ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin);
