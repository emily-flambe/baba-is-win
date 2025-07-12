-- Migration 0007: Add email templates table
-- This table manages email templates for different notification types

CREATE TABLE email_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  template_name TEXT UNIQUE NOT NULL,    -- 'blog_notification', 'thought_notification', etc.
  template_type TEXT NOT NULL,           -- 'notification', 'system', 'announcement'
  subject_template TEXT NOT NULL,        -- Subject line with placeholders
  html_template TEXT NOT NULL,           -- HTML email content
  text_template TEXT NOT NULL,           -- Plain text fallback
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  created_by TEXT,                       -- user who created template
  variables TEXT                         -- JSON array of available variables
);

-- Indexes for template management
CREATE INDEX idx_email_templates_name ON email_templates(template_name);
CREATE INDEX idx_email_templates_type ON email_templates(template_type);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);
CREATE INDEX idx_email_templates_updated_at ON email_templates(updated_at);

-- Insert default email templates
INSERT INTO email_templates (template_name, template_type, subject_template, html_template, text_template, variables) VALUES
('blog_notification', 'notification', 'New Blog Post: {{title}}', 
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #333;">{{title}}</h1><p style="color: #666;">{{description}}</p><p><a href="{{url}}" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Read More</a></p><hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;"><p style="color: #999; font-size: 12px;">You received this email because you subscribed to blog updates. <a href="{{unsubscribe_url}}">Unsubscribe</a></p></body></html>',
'New Blog Post: {{title}}

{{description}}

Read More: {{url}}

Unsubscribe: {{unsubscribe_url}}',
'["title", "description", "url", "unsubscribe_url", "publish_date"]');

INSERT INTO email_templates (template_name, template_type, subject_template, html_template, text_template, variables) VALUES
('thought_notification', 'notification', 'New Thought: {{title}}',
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #333;">{{title}}</h1><div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;"><p style="color: #333; font-style: italic;">{{content}}</p></div><p><a href="{{url}}" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Thought</a></p><hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;"><p style="color: #999; font-size: 12px;">You received this email because you subscribed to thought updates. <a href="{{unsubscribe_url}}">Unsubscribe</a></p></body></html>',
'New Thought: {{title}}

{{content}}

View Thought: {{url}}

Unsubscribe: {{unsubscribe_url}}',
'["title", "content", "url", "unsubscribe_url", "publish_date", "tags"]');