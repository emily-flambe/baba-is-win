-- Simplify email system by removing unnecessary tables
-- Keep only essential tables: email_notifications, unsubscribe_tokens, and user preferences

-- Drop unnecessary tables
DROP TABLE IF EXISTS email_debug_sessions;
DROP TABLE IF EXISTS email_event_aggregates;
DROP TABLE IF EXISTS email_events;
DROP TABLE IF EXISTS email_notification_history;
DROP TABLE IF EXISTS email_statistics;
DROP TABLE IF EXISTS email_templates;

-- Clean up any orphaned data in email_notifications
DELETE FROM email_notifications WHERE status = 'sent' AND created_at < unixepoch() - (30 * 24 * 60 * 60); -- Remove sent emails older than 30 days