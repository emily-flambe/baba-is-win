# Database Implementation Plan

## Overview
Detailed plan for implementing database schema changes and data layer modifications to support email notifications system.

## Current Schema Assessment

### Existing Tables
```sql
-- Already implemented and ready
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  email_blog_updates BOOLEAN DEFAULT FALSE,
  email_thought_updates BOOLEAN DEFAULT FALSE,
  email_announcements BOOLEAN DEFAULT FALSE
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Existing Indexes
```sql
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

## New Schema Implementation

### Migration 0004: Email Notifications Table
```sql
-- File: migrations/0004_add_email_notifications.sql
CREATE TABLE email_notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL,        -- 'blog', 'thought', 'announcement'
  content_id TEXT NOT NULL,          -- slug or identifier
  content_title TEXT NOT NULL,       -- display title
  content_url TEXT NOT NULL,         -- full URL to content
  content_excerpt TEXT,              -- brief excerpt for email
  notification_type TEXT NOT NULL,   -- 'new_content', 'announcement'
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'sent', 'failed', 'cancelled'
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  scheduled_for INTEGER,             -- when to send (null = immediate)
  sent_at INTEGER,                   -- when actually sent
  error_message TEXT,                -- error details if failed
  retry_count INTEGER DEFAULT 0,     -- number of retry attempts
  next_retry_at INTEGER,             -- when to retry next
  email_message_id TEXT,             -- Gmail message ID for tracking
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_content_type ON email_notifications(content_type);
CREATE INDEX idx_email_notifications_created_at ON email_notifications(created_at);
CREATE INDEX idx_email_notifications_status_retry ON email_notifications(status, next_retry_at);
CREATE INDEX idx_email_notifications_scheduled_for ON email_notifications(scheduled_for);
```

### Migration 0005: Email Notification History
```sql
-- File: migrations/0005_add_email_history.sql
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
```

### Migration 0006: Content Items Tracking
```sql
-- File: migrations/0006_add_content_tracking.sql
CREATE TABLE content_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL,        -- 'blog', 'thought'
  title TEXT NOT NULL,
  description TEXT,                  -- for blog posts
  content_preview TEXT,              -- first 200 chars of content
  publish_date INTEGER NOT NULL,     -- when published
  file_path TEXT NOT NULL,           -- original file path
  content_hash TEXT,                 -- SHA-256 hash for change detection
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_count INTEGER DEFAULT 0,  -- how many notifications sent
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  tags TEXT                          -- JSON array of tags
);

-- Indexes for content queries
CREATE INDEX idx_content_items_slug ON content_items(slug);
CREATE INDEX idx_content_items_type ON content_items(content_type);
CREATE INDEX idx_content_items_publish_date ON content_items(publish_date);
CREATE INDEX idx_content_items_notification_sent ON content_items(notification_sent);
CREATE INDEX idx_content_items_type_date ON content_items(content_type, publish_date);
CREATE INDEX idx_content_items_updated_at ON content_items(updated_at);
```

### Migration 0007: Email Templates
```sql
-- File: migrations/0007_add_email_templates.sql
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
```

### Migration 0008: Unsubscribe Tokens
```sql
-- File: migrations/0008_add_unsubscribe_tokens.sql
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
```

### Migration 0009: User Email Enhancements
```sql
-- File: migrations/0009_enhance_users_for_email.sql
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
```

### Migration 0010: Email Statistics
```sql
-- File: migrations/0010_add_email_statistics.sql
CREATE TABLE email_statistics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date_key TEXT NOT NULL,             -- YYYY-MM-DD format
  content_type TEXT NOT NULL,         -- 'blog', 'thought', 'announcement'
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(date_key, content_type)
);

-- Indexes for analytics
CREATE INDEX idx_email_statistics_date_key ON email_statistics(date_key);
CREATE INDEX idx_email_statistics_content_type ON email_statistics(content_type);
CREATE INDEX idx_email_statistics_date_type ON email_statistics(date_key, content_type);
```

## Data Layer Implementation

### Enhanced AuthDB Class
```typescript
// File: src/lib/auth/db.ts (enhanced)
export class AuthDB {
  constructor(private db: D1Database) {}

  // === EMAIL NOTIFICATION METHODS ===
  
  async createEmailNotification(params: CreateEmailNotificationParams): Promise<string> {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      INSERT INTO email_notifications (
        id, user_id, content_type, content_id, content_title, content_url, 
        content_excerpt, notification_type, scheduled_for
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      params.userId,
      params.contentType,
      params.contentId,
      params.contentTitle,
      params.contentUrl,
      params.contentExcerpt || null,
      params.notificationType,
      params.scheduledFor || null
    ).run();
    
    return id;
  }

  async getSubscribersForContentType(contentType: string): Promise<User[]> {
    const columnMap = {
      'blog': 'email_blog_updates',
      'thought': 'email_thought_updates',
      'announcement': 'email_announcements'
    };
    
    const column = columnMap[contentType];
    if (!column) throw new Error(`Invalid content type: ${contentType}`);
    
    const result = await this.db.prepare(`
      SELECT * FROM users 
      WHERE ${column} = TRUE 
        AND email_status = 'active' 
        AND unsubscribe_all = FALSE
        AND email_verified = TRUE
    `).all();
    
    return result.results.map(row => this.mapDbUserToUser(row));
  }

  async updateNotificationStatus(
    notificationId: string, 
    status: string, 
    errorMessage?: string,
    emailMessageId?: string
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      UPDATE email_notifications 
      SET status = ?, 
          sent_at = ?, 
          error_message = ?, 
          email_message_id = ?,
          retry_count = retry_count + 1
      WHERE id = ?
    `).bind(
      status,
      status === 'sent' ? now : null,
      errorMessage || null,
      emailMessageId || null,
      notificationId
    ).run();
  }

  async createNotificationHistory(params: CreateNotificationHistoryParams): Promise<void> {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      INSERT INTO email_notification_history (
        id, user_id, notification_id, action, timestamp, details, 
        ip_address, user_agent, error_code, retry_attempt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      params.userId,
      params.notificationId,
      params.action,
      now,
      JSON.stringify(params.details || {}),
      params.ipAddress || null,
      params.userAgent || null,
      params.errorCode || null,
      params.retryAttempt || 0
    ).run();
  }

  // === CONTENT TRACKING METHODS ===
  
  async createContentItem(params: CreateContentItemParams): Promise<string> {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      INSERT INTO content_items (
        id, slug, content_type, title, description, content_preview, 
        publish_date, file_path, content_hash, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      params.slug,
      params.contentType,
      params.title,
      params.description || null,
      params.contentPreview || null,
      params.publishDate,
      params.filePath,
      params.contentHash,
      JSON.stringify(params.tags || [])
    ).run();
    
    return id;
  }

  async getContentItemBySlug(slug: string): Promise<ContentItem | null> {
    const result = await this.db.prepare(`
      SELECT * FROM content_items WHERE slug = ?
    `).bind(slug).first();
    
    return result ? this.mapDbContentItemToContentItem(result) : null;
  }

  async getUnnotifiedContent(): Promise<ContentItem[]> {
    const result = await this.db.prepare(`
      SELECT * FROM content_items 
      WHERE notification_sent = FALSE 
      ORDER BY publish_date DESC
    `).all();
    
    return result.results.map(row => this.mapDbContentItemToContentItem(row));
  }

  async markContentNotified(contentId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      UPDATE content_items 
      SET notification_sent = TRUE, 
          notification_count = notification_count + 1,
          updated_at = ?
      WHERE id = ?
    `).bind(now, contentId).run();
  }

  // === EMAIL TEMPLATE METHODS ===
  
  async getEmailTemplate(templateName: string): Promise<EmailTemplate | null> {
    const result = await this.db.prepare(`
      SELECT * FROM email_templates 
      WHERE template_name = ? AND is_active = TRUE
    `).bind(templateName).first();
    
    return result ? this.mapDbEmailTemplateToEmailTemplate(result) : null;
  }

  async createEmailTemplate(params: CreateEmailTemplateParams): Promise<string> {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      INSERT INTO email_templates (
        id, template_name, template_type, subject_template, 
        html_template, text_template, variables, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      params.templateName,
      params.templateType,
      params.subjectTemplate,
      params.htmlTemplate,
      params.textTemplate,
      JSON.stringify(params.variables || []),
      params.createdBy || null
    ).run();
    
    return id;
  }

  // === UNSUBSCRIBE TOKEN METHODS ===
  
  async createUnsubscribeToken(params: CreateUnsubscribeTokenParams): Promise<string> {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      INSERT INTO unsubscribe_tokens (
        id, user_id, token, token_type, expires_at
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      id,
      params.userId,
      params.token,
      params.tokenType,
      params.expiresAt
    ).run();
    
    return id;
  }

  async validateUnsubscribeToken(token: string): Promise<UnsubscribeToken | null> {
    const now = Math.floor(Date.now() / 1000);
    
    const result = await this.db.prepare(`
      SELECT * FROM unsubscribe_tokens 
      WHERE token = ? AND used_at IS NULL AND expires_at > ?
    `).bind(token, now).first();
    
    return result ? this.mapDbUnsubscribeTokenToUnsubscribeToken(result) : null;
  }

  async useUnsubscribeToken(tokenId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      UPDATE unsubscribe_tokens 
      SET used_at = ?, ip_address = ?, user_agent = ?
      WHERE id = ?
    `).bind(now, ipAddress || null, userAgent || null, tokenId).run();
  }

  // === USER PREFERENCE METHODS ===
  
  async updateUserPreferences(userId: string, preferences: EmailPreferences): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      UPDATE users 
      SET email_blog_updates = ?, 
          email_thought_updates = ?, 
          email_announcements = ?,
          email_frequency = ?,
          updated_at = ?
      WHERE id = ?
    `).bind(
      preferences.emailBlogUpdates ? 1 : 0,
      preferences.emailThoughtUpdates ? 1 : 0,
      preferences.emailAnnouncements ? 1 : 0,
      preferences.emailFrequency || 'immediate',
      now,
      userId
    ).run();
  }

  async unsubscribeUserFromAll(userId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      UPDATE users 
      SET unsubscribe_all = TRUE,
          email_blog_updates = FALSE,
          email_thought_updates = FALSE,
          email_announcements = FALSE,
          email_status = 'unsubscribed',
          updated_at = ?
      WHERE id = ?
    `).bind(now, userId).run();
  }

  // === STATISTICS METHODS ===
  
  async updateEmailStatistics(dateKey: string, contentType: string, stats: EmailStatisticsUpdate): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    await this.db.prepare(`
      INSERT INTO email_statistics (
        date_key, content_type, total_sent, total_delivered, 
        total_bounced, total_failed, total_opened, total_clicked, 
        total_unsubscribed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(date_key, content_type) DO UPDATE SET
        total_sent = total_sent + ?,
        total_delivered = total_delivered + ?,
        total_bounced = total_bounced + ?,
        total_failed = total_failed + ?,
        total_opened = total_opened + ?,
        total_clicked = total_clicked + ?,
        total_unsubscribed = total_unsubscribed + ?,
        updated_at = ?
    `).bind(
      dateKey, contentType,
      stats.sent || 0, stats.delivered || 0, stats.bounced || 0,
      stats.failed || 0, stats.opened || 0, stats.clicked || 0,
      stats.unsubscribed || 0, now, now,
      stats.sent || 0, stats.delivered || 0, stats.bounced || 0,
      stats.failed || 0, stats.opened || 0, stats.clicked || 0,
      stats.unsubscribed || 0, now
    ).run();
  }

  // === HELPER METHODS ===
  
  private mapDbContentItemToContentItem(dbItem: any): ContentItem {
    return {
      id: dbItem.id,
      slug: dbItem.slug,
      contentType: dbItem.content_type,
      title: dbItem.title,
      description: dbItem.description,
      contentPreview: dbItem.content_preview,
      publishDate: new Date(dbItem.publish_date * 1000),
      filePath: dbItem.file_path,
      contentHash: dbItem.content_hash,
      notificationSent: !!dbItem.notification_sent,
      notificationCount: dbItem.notification_count,
      createdAt: new Date(dbItem.created_at * 1000),
      updatedAt: new Date(dbItem.updated_at * 1000),
      tags: JSON.parse(dbItem.tags || '[]')
    };
  }

  private mapDbEmailTemplateToEmailTemplate(dbTemplate: any): EmailTemplate {
    return {
      id: dbTemplate.id,
      templateName: dbTemplate.template_name,
      templateType: dbTemplate.template_type,
      subjectTemplate: dbTemplate.subject_template,
      htmlTemplate: dbTemplate.html_template,
      textTemplate: dbTemplate.text_template,
      isActive: !!dbTemplate.is_active,
      version: dbTemplate.version,
      variables: JSON.parse(dbTemplate.variables || '[]'),
      createdAt: new Date(dbTemplate.created_at * 1000),
      updatedAt: new Date(dbTemplate.updated_at * 1000)
    };
  }

  private mapDbUnsubscribeTokenToUnsubscribeToken(dbToken: any): UnsubscribeToken {
    return {
      id: dbToken.id,
      userId: dbToken.user_id,
      token: dbToken.token,
      tokenType: dbToken.token_type,
      createdAt: new Date(dbToken.created_at * 1000),
      expiresAt: new Date(dbToken.expires_at * 1000),
      usedAt: dbToken.used_at ? new Date(dbToken.used_at * 1000) : null
    };
  }
}
```

## Migration Execution Strategy

### Development Environment
```bash
# Execute migrations sequentially
wrangler d1 execute baba-is-win-db --file=migrations/0004_add_email_notifications.sql --local
wrangler d1 execute baba-is-win-db --file=migrations/0005_add_email_history.sql --local
wrangler d1 execute baba-is-win-db --file=migrations/0006_add_content_tracking.sql --local
wrangler d1 execute baba-is-win-db --file=migrations/0007_add_email_templates.sql --local
wrangler d1 execute baba-is-win-db --file=migrations/0008_add_unsubscribe_tokens.sql --local
wrangler d1 execute baba-is-win-db --file=migrations/0009_enhance_users_for_email.sql --local
wrangler d1 execute baba-is-win-db --file=migrations/0010_add_email_statistics.sql --local
```

### Production Environment
```bash
# Execute migrations with backup
wrangler d1 execute baba-is-win-db --file=migrations/0004_add_email_notifications.sql --remote
wrangler d1 execute baba-is-win-db --file=migrations/0005_add_email_history.sql --remote
# ... continue with all migrations
```

### Rollback Strategy
```sql
-- Rollback scripts for each migration
-- File: migrations/rollback_0004.sql
DROP TABLE IF EXISTS email_notifications;

-- File: migrations/rollback_0005.sql
DROP TABLE IF EXISTS email_notification_history;

-- File: migrations/rollback_0006.sql
DROP TABLE IF EXISTS content_items;

-- File: migrations/rollback_0007.sql
DROP TABLE IF EXISTS email_templates;

-- File: migrations/rollback_0008.sql
DROP TABLE IF EXISTS unsubscribe_tokens;

-- File: migrations/rollback_0009.sql
ALTER TABLE users DROP COLUMN email_verified;
ALTER TABLE users DROP COLUMN email_verification_token;
ALTER TABLE users DROP COLUMN email_verification_expires_at;
ALTER TABLE users DROP COLUMN last_email_sent_at;
ALTER TABLE users DROP COLUMN email_bounce_count;
ALTER TABLE users DROP COLUMN email_status;
ALTER TABLE users DROP COLUMN unsubscribe_all;
ALTER TABLE users DROP COLUMN email_frequency;

-- File: migrations/rollback_0010.sql
DROP TABLE IF EXISTS email_statistics;
```

## Data Population Scripts

### Initial Email Templates
```sql
-- File: scripts/populate_email_templates.sql
INSERT INTO email_templates (template_name, template_type, subject_template, html_template, text_template, variables) VALUES
('blog_notification', 'notification', 'New Blog Post: {{title}}', 
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #333;">{{title}}</h1><p style="color: #666;">{{description}}</p><p><a href="{{url}}" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Read More</a></p><hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;"><p style="color: #999; font-size: 12px;">You received this email because you subscribed to blog updates. <a href="{{unsubscribe_url}}">Unsubscribe</a></p></body></html>',
'New Blog Post: {{title}}\n\n{{description}}\n\nRead More: {{url}}\n\nUnsubscribe: {{unsubscribe_url}}',
'["title", "description", "url", "unsubscribe_url", "publish_date"]');

INSERT INTO email_templates (template_name, template_type, subject_template, html_template, text_template, variables) VALUES
('thought_notification', 'notification', 'New Thought: {{title}}',
'<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h1 style="color: #333;">{{title}}</h1><div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;"><p style="color: #333; font-style: italic;">{{content}}</p></div><p><a href="{{url}}" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Thought</a></p><hr style="margin: 40px 0; border: none; border-top: 1px solid #eee;"><p style="color: #999; font-size: 12px;">You received this email because you subscribed to thought updates. <a href="{{unsubscribe_url}}">Unsubscribe</a></p></body></html>',
'New Thought: {{title}}\n\n{{content}}\n\nView Thought: {{url}}\n\nUnsubscribe: {{unsubscribe_url}}',
'["title", "content", "url", "unsubscribe_url", "publish_date", "tags"]');
```

## Performance Optimization

### Query Optimization
```sql
-- Optimized query for getting subscribers
EXPLAIN QUERY PLAN 
SELECT u.id, u.email, u.username 
FROM users u 
WHERE u.email_blog_updates = TRUE 
  AND u.email_status = 'active' 
  AND u.unsubscribe_all = FALSE 
  AND u.email_verified = TRUE;

-- Optimized query for notification history
EXPLAIN QUERY PLAN 
SELECT * FROM email_notification_history 
WHERE user_id = ? 
  AND timestamp > ? 
ORDER BY timestamp DESC 
LIMIT 50;
```

### Database Maintenance
```sql
-- Cleanup old notification history (older than 90 days)
DELETE FROM email_notification_history 
WHERE timestamp < (unixepoch() - 7776000);

-- Cleanup expired unsubscribe tokens
DELETE FROM unsubscribe_tokens 
WHERE expires_at < unixepoch();

-- Cleanup old email statistics (older than 1 year)
DELETE FROM email_statistics 
WHERE created_at < (unixepoch() - 31536000);
```

## Testing Strategy

### Unit Tests
```typescript
// Test database operations
describe('AuthDB Email Operations', () => {
  test('createEmailNotification creates notification', async () => {
    const notificationId = await authDB.createEmailNotification({
      userId: 'user123',
      contentType: 'blog',
      contentId: 'test-post',
      contentTitle: 'Test Post',
      contentUrl: 'https://example.com/test-post',
      notificationType: 'new_content'
    });
    
    expect(notificationId).toBeDefined();
  });
  
  test('getSubscribersForContentType returns active subscribers', async () => {
    const subscribers = await authDB.getSubscribersForContentType('blog');
    expect(subscribers).toBeInstanceOf(Array);
    expect(subscribers.every(user => user.emailBlogUpdates)).toBe(true);
  });
});
```

### Integration Tests
```typescript
// Test complete notification flow
describe('Email Notification Flow', () => {
  test('end-to-end notification creation and processing', async () => {
    // Create content item
    const contentId = await authDB.createContentItem({
      slug: 'test-post',
      contentType: 'blog',
      title: 'Test Post',
      publishDate: Math.floor(Date.now() / 1000),
      filePath: '/test/path',
      contentHash: 'abcd1234'
    });
    
    // Get subscribers
    const subscribers = await authDB.getSubscribersForContentType('blog');
    
    // Create notifications
    const notificationIds = await Promise.all(
      subscribers.map(user => authDB.createEmailNotification({
        userId: user.id,
        contentType: 'blog',
        contentId: 'test-post',
        contentTitle: 'Test Post',
        contentUrl: 'https://example.com/test-post',
        notificationType: 'new_content'
      }))
    );
    
    expect(notificationIds.length).toBe(subscribers.length);
  });
});
```

## Monitoring and Maintenance

### Database Health Checks
```sql
-- Check table sizes
SELECT 
  name,
  (SELECT COUNT(*) FROM pragma_table_info(name)) as columns,
  (SELECT COUNT(*) FROM " + name + ") as rows
FROM sqlite_master 
WHERE type = 'table' 
  AND name LIKE 'email_%';

-- Check notification status distribution
SELECT status, COUNT(*) as count
FROM email_notifications
GROUP BY status;

-- Check email statistics summary
SELECT 
  content_type,
  SUM(total_sent) as total_sent,
  SUM(total_delivered) as total_delivered,
  SUM(total_bounced) as total_bounced,
  SUM(total_failed) as total_failed
FROM email_statistics
GROUP BY content_type;
```

### Performance Monitoring
```typescript
// Database query performance monitoring
export class DatabaseMonitor {
  async checkQueryPerformance() {
    const startTime = Date.now();
    
    // Test critical queries
    await authDB.getSubscribersForContentType('blog');
    const subscriberQueryTime = Date.now() - startTime;
    
    // Log if query takes too long
    if (subscriberQueryTime > 100) {
      console.warn(`Slow subscriber query: ${subscriberQueryTime}ms`);
    }
  }
}
```

This comprehensive database implementation plan provides a robust foundation for the email notifications system with proper indexing, data integrity, and performance optimization.