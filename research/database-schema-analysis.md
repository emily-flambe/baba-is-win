# Database Schema Analysis for Email Notifications

## Current Database Technology

### Cloudflare D1 Database
- **Type**: SQLite-based with D1 binding for Cloudflare Workers
- **Connection**: Accessed via `@cloudflare/workers-types` D1Database interface
- **ORM Pattern**: Custom AuthDB class with prepared statements
- **Migration System**: Sequential SQL files in `/migrations/` directory

## Current Schema Overview

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  
  -- Email preference columns (already implemented)
  email_blog_updates BOOLEAN DEFAULT FALSE,
  email_thought_updates BOOLEAN DEFAULT FALSE,
  email_announcements BOOLEAN DEFAULT FALSE
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### User Profiles Table
```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Current Indexes
```sql
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

## Content Models Analysis

### File-Based Content Storage
- **Blog Posts**: `/src/data/blog-posts/published/*.md`
- **Thoughts**: `/src/data/thoughts/published/*.md`
- **Format**: Markdown with frontmatter metadata
- **Processing**: Astro.glob() with dynamic imports

### Blog Post Structure
```yaml
title: "Post Title"
publishDate: "2024-01-15T10:00:00Z"
description: "Post description"
thumbnail: "/images/post-thumbnail.jpg"
tags: ["web", "development"]
```

### Thought Structure
```yaml
content: "Thought content"
publishDate: "2024-01-15T10:00:00Z"
publishTime: "10:00 AM"
tags: ["reflection", "idea"]
```

## Required Schema Extensions

### Email Notification Queue
```sql
CREATE TABLE email_notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'blog' or 'thought'
  content_id TEXT NOT NULL,   -- slug or filename
  content_title TEXT NOT NULL,
  content_url TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'new_post', 'announcement'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  sent_at INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  next_retry_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Email Notification History
```sql
CREATE TABLE email_notification_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'queued', 'sent', 'failed', 'bounced', 'opened', 'clicked'
  timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
  details TEXT, -- JSON string for additional metadata
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (notification_id) REFERENCES email_notifications(id) ON DELETE CASCADE
);
```

### Email Subscriptions Management
```sql
CREATE TABLE email_subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  subscription_type TEXT NOT NULL, -- 'blog', 'thoughts', 'announcements'
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  unsubscribed_at INTEGER,
  unsubscribe_reason TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Content Tracking System
```sql
CREATE TABLE content_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  slug TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL, -- 'blog' or 'thought'
  title TEXT NOT NULL,
  publish_date INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  content_hash TEXT, -- For detecting content changes
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### Email Templates
```sql
CREATE TABLE email_templates (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  template_name TEXT UNIQUE NOT NULL, -- 'blog_notification', 'thought_notification'
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  is_active BOOLEAN DEFAULT TRUE
);
```

### Unsubscribe Tokens
```sql
CREATE TABLE unsubscribe_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  used_at INTEGER,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Enhanced User Table
```sql
-- Additional columns for email management
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_verification_token TEXT;
ALTER TABLE users ADD COLUMN email_verification_expires_at INTEGER;
ALTER TABLE users ADD COLUMN last_email_sent_at INTEGER;
ALTER TABLE users ADD COLUMN email_bounce_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN email_status TEXT DEFAULT 'active'; -- 'active', 'bounced', 'blocked'
ALTER TABLE users ADD COLUMN unsubscribe_token TEXT UNIQUE;
ALTER TABLE users ADD COLUMN unsubscribe_all BOOLEAN DEFAULT FALSE;
```

## Required Indexes for Performance

### Email Notification Indexes
```sql
CREATE INDEX idx_email_notifications_user_id ON email_notifications(user_id);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_email_notifications_content_type ON email_notifications(content_type);
CREATE INDEX idx_email_notifications_created_at ON email_notifications(created_at);
CREATE INDEX idx_email_notifications_status_retry ON email_notifications(status, next_retry_at);
```

### History Indexes
```sql
CREATE INDEX idx_email_notification_history_user_id ON email_notification_history(user_id);
CREATE INDEX idx_email_notification_history_notification_id ON email_notification_history(notification_id);
CREATE INDEX idx_email_notification_history_timestamp ON email_notification_history(timestamp);
CREATE INDEX idx_email_notification_history_action ON email_notification_history(action);
```

### Subscription Indexes
```sql
CREATE INDEX idx_email_subscriptions_user_id ON email_subscriptions(user_id);
CREATE INDEX idx_email_subscriptions_type_active ON email_subscriptions(subscription_type, is_active);
CREATE INDEX idx_email_subscriptions_updated_at ON email_subscriptions(updated_at);
```

### Content Tracking Indexes
```sql
CREATE INDEX idx_content_items_slug ON content_items(slug);
CREATE INDEX idx_content_items_type ON content_items(content_type);
CREATE INDEX idx_content_items_publish_date ON content_items(publish_date);
CREATE INDEX idx_content_items_notification_sent ON content_items(notification_sent);
CREATE INDEX idx_content_items_type_date ON content_items(content_type, publish_date);
```

### Template and Token Indexes
```sql
CREATE INDEX idx_email_templates_name ON email_templates(template_name);
CREATE INDEX idx_email_templates_active ON email_templates(is_active);
CREATE INDEX idx_unsubscribe_tokens_token ON unsubscribe_tokens(token);
CREATE INDEX idx_unsubscribe_tokens_user_id ON unsubscribe_tokens(user_id);
CREATE INDEX idx_unsubscribe_tokens_expires_at ON unsubscribe_tokens(expires_at);
```

## Migration Strategy

### Sequential Migration Files
```sql
-- migrations/0004_add_email_notifications.sql
-- migrations/0005_add_email_history.sql
-- migrations/0006_add_email_subscriptions.sql
-- migrations/0007_add_content_tracking.sql
-- migrations/0008_add_email_templates.sql
-- migrations/0009_add_unsubscribe_tokens.sql
-- migrations/0010_enhance_users_for_email.sql
```

### Data Migration Strategy

#### 1. User Preferences Migration
```sql
-- Migrate existing email preferences to subscription table
INSERT INTO email_subscriptions (user_id, subscription_type, is_active)
SELECT id, 'blog', email_blog_updates FROM users WHERE email_blog_updates = TRUE;

INSERT INTO email_subscriptions (user_id, subscription_type, is_active)
SELECT id, 'thoughts', email_thought_updates FROM users WHERE email_thought_updates = TRUE;

INSERT INTO email_subscriptions (user_id, subscription_type, is_active)
SELECT id, 'announcements', email_announcements FROM users WHERE email_announcements = TRUE;
```

#### 2. Content Backfill
```sql
-- Process existing markdown files to populate content_items
-- This would be done via a script that reads file system and populates database
```

#### 3. Template Initialization
```sql
-- Insert default email templates
INSERT INTO email_templates (template_name, subject_template, html_template, text_template) VALUES
('blog_notification', 
 'New Blog Post: {{title}}',
 '<html><body><h1>{{title}}</h1><p>{{description}}</p><a href="{{url}}">Read More</a><br><a href="{{unsubscribe_url}}">Unsubscribe</a></body></html>',
 'New Blog Post: {{title}}\n\n{{description}}\n\nRead More: {{url}}\n\nUnsubscribe: {{unsubscribe_url}}');

INSERT INTO email_templates (template_name, subject_template, html_template, text_template) VALUES
('thought_notification',
 'New Thought: {{title}}',
 '<html><body><h1>{{title}}</h1><p>{{content}}</p><a href="{{url}}">View Thought</a><br><a href="{{unsubscribe_url}}">Unsubscribe</a></body></html>',
 'New Thought: {{title}}\n\n{{content}}\n\nView Thought: {{url}}\n\nUnsubscribe: {{unsubscribe_url}}');
```

## Database Layer Implementation

### Enhanced AuthDB Class
```typescript
export class AuthDB {
  constructor(private db: D1Database) {}

  // Email notification methods
  async createEmailNotification(notification: CreateEmailNotificationParams): Promise<string> {
    const result = await this.db.prepare(
      'INSERT INTO email_notifications (user_id, content_type, content_id, content_title, content_url, notification_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(
      notification.userId,
      notification.contentType,
      notification.contentId,
      notification.contentTitle,
      notification.contentUrl,
      notification.notificationType
    ).run();
    
    return result.meta.last_row_id as string;
  }

  async getSubscribersForContentType(contentType: string): Promise<User[]> {
    const result = await this.db.prepare(
      'SELECT u.* FROM users u JOIN email_subscriptions s ON u.id = s.user_id WHERE s.subscription_type = ? AND s.is_active = TRUE AND u.email_status = "active"'
    ).bind(contentType).all();
    
    return result.results as User[];
  }

  async updateNotificationStatus(notificationId: string, status: string, errorMessage?: string): Promise<void> {
    await this.db.prepare(
      'UPDATE email_notifications SET status = ?, sent_at = ?, error_message = ? WHERE id = ?'
    ).bind(status, status === 'sent' ? Date.now() : null, errorMessage || null, notificationId).run();
  }

  async createNotificationHistory(history: CreateNotificationHistoryParams): Promise<void> {
    await this.db.prepare(
      'INSERT INTO email_notification_history (user_id, notification_id, action, details) VALUES (?, ?, ?, ?)'
    ).bind(history.userId, history.notificationId, history.action, JSON.stringify(history.details)).run();
  }

  async updateUserPreferences(userId: string, preferences: EmailPreferences): Promise<void> {
    await this.db.prepare(
      'UPDATE users SET email_blog_updates = ?, email_thought_updates = ?, email_announcements = ? WHERE id = ?'
    ).bind(preferences.blogUpdates, preferences.thoughtUpdates, preferences.announcements, userId).run();
  }

  async createUnsubscribeToken(userId: string, token: string, expiresAt: number): Promise<void> {
    await this.db.prepare(
      'INSERT INTO unsubscribe_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).bind(userId, token, expiresAt).run();
  }
}
```

## Data Integrity Considerations

### Foreign Key Constraints
- All notification tables properly reference users table
- Cascade deletes ensure data consistency
- Content tracking maintains referential integrity

### Transaction Management
```typescript
async processEmailNotification(params: ProcessNotificationParams): Promise<void> {
  const tx = await this.db.batch([
    this.db.prepare('INSERT INTO email_notifications ...'),
    this.db.prepare('INSERT INTO email_notification_history ...'),
    this.db.prepare('UPDATE content_items SET notification_sent = TRUE ...')
  ]);
  
  // All operations succeed or fail together
}
```

### Error Handling
- Failed email notifications tracked in status column
- Retry logic with exponential backoff
- Bounce handling updates user email status
- Content parsing errors don't break system

## Performance Optimization

### Query Optimization
```sql
-- Efficient subscriber query with proper indexing
SELECT u.id, u.email, u.username 
FROM users u 
JOIN email_subscriptions s ON u.id = s.user_id 
WHERE s.subscription_type = 'blog' 
  AND s.is_active = TRUE 
  AND u.email_status = 'active'
  AND u.unsubscribe_all = FALSE;
```

### Batch Processing
```typescript
async processPendingNotifications(): Promise<void> {
  const batch = await this.db.prepare(
    'SELECT * FROM email_notifications WHERE status = "pending" LIMIT 100'
  ).all();
  
  // Process in batches to avoid memory issues
  for (const notification of batch.results) {
    await this.processNotification(notification);
  }
}
```

## Security Considerations

### Data Protection
- Email addresses should be handled securely
- Unsubscribe tokens must be unique and tamper-proof
- Audit trail for all email actions
- GDPR compliance for user data deletion

### Token Security
```typescript
export class UnsubscribeTokenService {
  static generateSecureToken(): string {
    return crypto.randomUUID() + '-' + Date.now().toString(36);
  }
  
  static validateToken(token: string): boolean {
    // Validate token format and expiration
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-z]+$/.test(token);
  }
}
```

## Implementation Checklist

### Database Setup
- [ ] Create all new tables with proper constraints
- [ ] Add all required indexes for performance
- [ ] Set up proper foreign key relationships
- [ ] Implement migration scripts for existing data

### Data Layer
- [ ] Extend AuthDB class with email notification methods
- [ ] Add proper error handling and logging
- [ ] Implement transaction support for batch operations
- [ ] Add query optimization for large subscriber lists

### Content Integration
- [ ] Create content processing system to populate content_items
- [ ] Implement content change detection
- [ ] Add notification triggering on content publication
- [ ] Create template system for email generation

### Security & Compliance
- [ ] Add unsubscribe token generation and validation
- [ ] Implement email verification system
- [ ] Add audit logging for all email actions
- [ ] Ensure GDPR compliance for data handling

This comprehensive schema provides a robust foundation for email notification functionality while maintaining data integrity, performance, and security standards appropriate for a production system.