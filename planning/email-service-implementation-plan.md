# Email Service Implementation Plan

## Overview
Detailed implementation plan for the email service layer, including Gmail OAuth2 integration, template system, and notification processing based on the anonymous-comment-box reference implementation.

## Gmail OAuth2 Service Implementation

### OAuth2 Configuration Setup

#### Google Cloud Console Setup
```bash
# 1. Create Google Cloud Project
# 2. Enable Gmail API
# 3. Create OAuth2 credentials (Web application)
# 4. Configure authorized redirect URIs:
#    - https://developers.google.com/oauthplayground (for token generation)
#    - https://your-domain.com/auth/callback (for production)

# Required OAuth2 Scopes:
# - https://www.googleapis.com/auth/gmail.send
```

#### Environment Variables
```typescript
// File: src/types/env.ts
export interface Env {
  // Gmail OAuth2 Configuration
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  GMAIL_SENDER_EMAIL: string;
  
  // System Configuration
  SITE_URL: string;
  SITE_NAME: string;
  
  // Database and other existing vars
  DB: D1Database;
  JWT_SECRET: string;
}
```

### Gmail Authentication Service

#### Token Management Class
```typescript
// File: src/lib/email/gmail-auth.ts
interface TokenCache {
  access_token: string;
  expires_at: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class GmailAuth {
  private tokenCache: TokenCache | null = null;
  
  constructor(private env: Env) {}
  
  async getValidAccessToken(): Promise<string> {
    // Check cached token with 1-minute buffer
    if (this.tokenCache && this.tokenCache.expires_at > Date.now() + 60000) {
      return this.tokenCache.access_token;
    }
    
    // Refresh token if needed
    const accessToken = await this.refreshAccessToken();
    
    // Cache with 55-minute expiration (tokens expire in 1 hour)
    this.tokenCache = {
      access_token: accessToken,
      expires_at: Date.now() + 3300000 // 55 minutes
    };
    
    return accessToken;
  }
  
  private async refreshAccessToken(): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.env.GMAIL_CLIENT_ID,
        client_secret: this.env.GMAIL_CLIENT_SECRET,
        refresh_token: this.env.GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth token refresh failed: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json() as TokenResponse;
    return tokenData.access_token;
  }
  
  async sendEmail(to: string, subject: string, htmlContent: string, textContent: string): Promise<string> {
    const accessToken = await this.getValidAccessToken();
    
    // Create RFC 2822 compliant email
    const emailContent = [
      `To: ${to}`,
      `From: ${this.env.SITE_NAME} <${this.env.GMAIL_SENDER_EMAIL}>`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="boundary123"`,
      ``,
      `--boundary123`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      textContent,
      ``,
      `--boundary123`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      htmlContent,
      ``,
      `--boundary123--`
    ].join('\r\n');
    
    // Base64 encode for Gmail API (URL-safe)
    const encoder = new TextEncoder();
    const bytes = encoder.encode(emailContent);
    const encodedMessage = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });
    
    // Handle 401 errors with automatic retry
    if (response.status === 401) {
      console.log('Access token expired, clearing cache and retrying...');
      this.tokenCache = null;
      return this.sendEmail(to, subject, htmlContent, textContent);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    return result.id; // Gmail message ID
  }
}
```

## Email Template System

### Template Engine Implementation
```typescript
// File: src/lib/email/template-engine.ts
export interface TemplateVariables {
  title: string;
  content?: string;
  description?: string;
  url: string;
  unsubscribe_url: string;
  publish_date: string;
  tags?: string[];
  site_name: string;
  site_url: string;
  user_name?: string;
}

export class EmailTemplateEngine {
  constructor(private authDB: AuthDB) {}
  
  async renderTemplate(
    templateName: string, 
    variables: TemplateVariables
  ): Promise<{ subject: string; html: string; text: string }> {
    const template = await this.authDB.getEmailTemplate(templateName);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    return {
      subject: this.interpolateTemplate(template.subjectTemplate, variables),
      html: this.interpolateTemplate(template.htmlTemplate, variables),
      text: this.interpolateTemplate(template.textTemplate, variables)
    };
  }
  
  private interpolateTemplate(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key as keyof TemplateVariables];
      if (value === undefined) {
        console.warn(`Template variable not found: ${key}`);
        return match;
      }
      return Array.isArray(value) ? value.join(', ') : String(value);
    });
  }
  
  async renderBlogNotification(
    user: User, 
    post: BlogPost, 
    unsubscribeUrl: string
  ): Promise<{ subject: string; html: string; text: string }> {
    const variables: TemplateVariables = {
      title: post.title,
      description: post.description,
      url: `https://your-site.com/blog/${post.slug}`,
      unsubscribe_url: unsubscribeUrl,
      publish_date: post.publishDate.toLocaleDateString(),
      tags: post.tags,
      site_name: 'Your Site Name',
      site_url: 'https://your-site.com',
      user_name: user.username
    };
    
    return this.renderTemplate('blog_notification', variables);
  }
  
  async renderThoughtNotification(
    user: User, 
    thought: Thought, 
    unsubscribeUrl: string
  ): Promise<{ subject: string; html: string; text: string }> {
    const variables: TemplateVariables = {
      title: thought.title || 'New Thought',
      content: thought.content,
      url: `https://your-site.com/thoughts/${thought.slug}`,
      unsubscribe_url: unsubscribeUrl,
      publish_date: thought.publishDate.toLocaleDateString(),
      tags: thought.tags,
      site_name: 'Your Site Name',
      site_url: 'https://your-site.com',
      user_name: user.username
    };
    
    return this.renderTemplate('thought_notification', variables);
  }
}
```

### Email Template Storage
```typescript
// File: src/lib/email/template-storage.ts
export interface EmailTemplate {
  id: string;
  templateName: string;
  templateType: string;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailTemplateStorage {
  constructor(private authDB: AuthDB) {}
  
  async getTemplate(templateName: string): Promise<EmailTemplate | null> {
    return this.authDB.getEmailTemplate(templateName);
  }
  
  async createTemplate(template: CreateEmailTemplateParams): Promise<string> {
    return this.authDB.createEmailTemplate(template);
  }
  
  async updateTemplate(
    templateName: string, 
    updates: Partial<EmailTemplate>
  ): Promise<void> {
    // Implementation for updating templates
    // This would involve versioning and validation
  }
}
```

## Notification Processing Service

### Main Notification Service
```typescript
// File: src/lib/email/notification-service.ts
export class EmailNotificationService {
  private gmailAuth: GmailAuth;
  private templateEngine: EmailTemplateEngine;
  private unsubscribeService: UnsubscribeService;
  
  constructor(
    private env: Env,
    private authDB: AuthDB
  ) {
    this.gmailAuth = new GmailAuth(env);
    this.templateEngine = new EmailTemplateEngine(authDB);
    this.unsubscribeService = new UnsubscribeService(env, authDB);
  }
  
  async sendBlogNotification(post: BlogPost): Promise<void> {
    console.log(`Processing blog notification for: ${post.title}`);
    
    // Get subscribers
    const subscribers = await this.authDB.getSubscribersForContentType('blog');
    
    if (subscribers.length === 0) {
      console.log('No blog subscribers found');
      return;
    }
    
    // Create notifications in database
    const notificationIds = await Promise.all(
      subscribers.map(user => this.authDB.createEmailNotification({
        userId: user.id,
        contentType: 'blog',
        contentId: post.slug,
        contentTitle: post.title,
        contentUrl: `${this.env.SITE_URL}/blog/${post.slug}`,
        contentExcerpt: post.description,
        notificationType: 'new_content'
      }))
    );
    
    // Process notifications in batches
    await this.processBatchNotifications(notificationIds, 'blog', post);
  }
  
  async sendThoughtNotification(thought: Thought): Promise<void> {
    console.log(`Processing thought notification for: ${thought.title}`);
    
    // Get subscribers
    const subscribers = await this.authDB.getSubscribersForContentType('thought');
    
    if (subscribers.length === 0) {
      console.log('No thought subscribers found');
      return;
    }
    
    // Create notifications in database
    const notificationIds = await Promise.all(
      subscribers.map(user => this.authDB.createEmailNotification({
        userId: user.id,
        contentType: 'thought',
        contentId: thought.slug,
        contentTitle: thought.title || 'New Thought',
        contentUrl: `${this.env.SITE_URL}/thoughts/${thought.slug}`,
        contentExcerpt: thought.content.substring(0, 200),
        notificationType: 'new_content'
      }))
    );
    
    // Process notifications in batches
    await this.processBatchNotifications(notificationIds, 'thought', thought);
  }
  
  private async processBatchNotifications(
    notificationIds: string[], 
    contentType: 'blog' | 'thought', 
    content: BlogPost | Thought
  ): Promise<void> {
    const batchSize = 10; // Process 10 notifications at a time
    
    for (let i = 0; i < notificationIds.length; i += batchSize) {
      const batch = notificationIds.slice(i, i + batchSize);
      
      await Promise.all(batch.map(notificationId => 
        this.processNotification(notificationId, contentType, content)
      ));
      
      // Rate limiting: wait 1 second between batches
      if (i + batchSize < notificationIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  private async processNotification(
    notificationId: string, 
    contentType: 'blog' | 'thought', 
    content: BlogPost | Thought
  ): Promise<void> {
    try {
      // Get notification details
      const notification = await this.authDB.getNotificationById(notificationId);
      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`);
      }
      
      // Get user details
      const user = await this.authDB.getUserById(notification.userId);
      if (!user) {
        throw new Error(`User not found: ${notification.userId}`);
      }
      
      // Generate unsubscribe URL
      const unsubscribeUrl = await this.unsubscribeService.generateUnsubscribeUrl(user.id);
      
      // Render email template
      const emailContent = contentType === 'blog' 
        ? await this.templateEngine.renderBlogNotification(user, content as BlogPost, unsubscribeUrl)
        : await this.templateEngine.renderThoughtNotification(user, content as Thought, unsubscribeUrl);
      
      // Send email
      const emailMessageId = await this.gmailAuth.sendEmail(
        user.email,
        emailContent.subject,
        emailContent.html,
        emailContent.text
      );
      
      // Update notification status
      await this.authDB.updateNotificationStatus(notificationId, 'sent', undefined, emailMessageId);
      
      // Log success
      await this.authDB.createNotificationHistory({
        userId: user.id,
        notificationId,
        action: 'sent',
        details: { 
          emailMessageId,
          subject: emailContent.subject,
          contentType,
          contentId: content.slug
        }
      });
      
      console.log(`Email sent successfully to ${user.email} for ${contentType}: ${content.title}`);
      
    } catch (error) {
      console.error(`Failed to send notification ${notificationId}:`, error);
      
      // Update notification status
      await this.authDB.updateNotificationStatus(
        notificationId, 
        'failed', 
        error.message
      );
      
      // Log failure
      await this.authDB.createNotificationHistory({
        userId: notification?.userId || 'unknown',
        notificationId,
        action: 'failed',
        details: { error: error.message }
      });
    }
  }
}
```

## Unsubscribe Service

### Unsubscribe Token Management
```typescript
// File: src/lib/email/unsubscribe-service.ts
export class UnsubscribeService {
  constructor(
    private env: Env,
    private authDB: AuthDB
  ) {}
  
  async generateUnsubscribeUrl(userId: string): Promise<string> {
    // Generate secure token
    const token = this.generateSecureToken();
    const expiresAt = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
    
    // Store token in database
    await this.authDB.createUnsubscribeToken({
      userId,
      token,
      tokenType: 'one_click',
      expiresAt
    });
    
    return `${this.env.SITE_URL}/unsubscribe?token=${token}`;
  }
  
  async processUnsubscribe(token: string, ipAddress?: string, userAgent?: string): Promise<string> {
    // Validate token
    const tokenData = await this.authDB.validateUnsubscribeToken(token);
    if (!tokenData) {
      throw new Error('Invalid or expired unsubscribe token');
    }
    
    // Mark token as used
    await this.authDB.useUnsubscribeToken(tokenData.id, ipAddress, userAgent);
    
    // Unsubscribe user from all emails
    await this.authDB.unsubscribeUserFromAll(tokenData.userId);
    
    // Log the unsubscribe action
    await this.authDB.createNotificationHistory({
      userId: tokenData.userId,
      notificationId: 'unsubscribe',
      action: 'unsubscribed',
      details: { 
        tokenType: tokenData.tokenType,
        ipAddress,
        userAgent
      },
      ipAddress,
      userAgent
    });
    
    return tokenData.userId;
  }
  
  private generateSecureToken(): string {
    // Generate cryptographically secure token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
```

## Content Processing Service

### Content Change Detection
```typescript
// File: src/lib/email/content-processor.ts
export class ContentProcessor {
  constructor(
    private authDB: AuthDB,
    private notificationService: EmailNotificationService
  ) {}
  
  async processNewContent(): Promise<void> {
    // Get all unnotified content
    const unnotifiedContent = await this.authDB.getUnnotifiedContent();
    
    for (const contentItem of unnotifiedContent) {
      try {
        if (contentItem.contentType === 'blog') {
          const blogPost = await this.loadBlogPost(contentItem.slug);
          await this.notificationService.sendBlogNotification(blogPost);
        } else if (contentItem.contentType === 'thought') {
          const thought = await this.loadThought(contentItem.slug);
          await this.notificationService.sendThoughtNotification(thought);
        }
        
        // Mark as notified
        await this.authDB.markContentNotified(contentItem.id);
        
      } catch (error) {
        console.error(`Failed to process content ${contentItem.slug}:`, error);
      }
    }
  }
  
  async syncContentFromFiles(): Promise<void> {
    // Sync blog posts
    const blogPosts = await this.loadAllBlogPosts();
    for (const post of blogPosts) {
      await this.syncContentItem(post, 'blog');
    }
    
    // Sync thoughts
    const thoughts = await this.loadAllThoughts();
    for (const thought of thoughts) {
      await this.syncContentItem(thought, 'thought');
    }
  }
  
  private async syncContentItem(
    content: BlogPost | Thought, 
    contentType: 'blog' | 'thought'
  ): Promise<void> {
    const contentHash = await this.generateContentHash(content);
    const existingItem = await this.authDB.getContentItemBySlug(content.slug);
    
    if (!existingItem) {
      // Create new content item
      await this.authDB.createContentItem({
        slug: content.slug,
        contentType,
        title: content.title,
        description: contentType === 'blog' ? (content as BlogPost).description : undefined,
        contentPreview: content.content?.substring(0, 200),
        publishDate: Math.floor(content.publishDate.getTime() / 1000),
        filePath: content.filePath,
        contentHash,
        tags: content.tags
      });
    } else if (existingItem.contentHash !== contentHash) {
      // Content has changed - update and mark for re-notification
      await this.authDB.updateContentItem(existingItem.id, {
        contentHash,
        notificationSent: false,
        updatedAt: Math.floor(Date.now() / 1000)
      });
    }
  }
  
  private async generateContentHash(content: BlogPost | Thought): Promise<string> {
    const contentString = JSON.stringify({
      title: content.title,
      content: content.content,
      publishDate: content.publishDate.toISOString(),
      tags: content.tags
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  private async loadBlogPost(slug: string): Promise<BlogPost> {
    // Load blog post from file system
    // Implementation depends on your file structure
    const filePath = `src/data/blog-posts/published/${slug}.md`;
    // ... file loading logic
    return {} as BlogPost; // Placeholder
  }
  
  private async loadThought(slug: string): Promise<Thought> {
    // Load thought from file system
    // Implementation depends on your file structure
    const filePath = `src/data/thoughts/published/${slug}.md`;
    // ... file loading logic
    return {} as Thought; // Placeholder
  }
  
  private async loadAllBlogPosts(): Promise<BlogPost[]> {
    // Load all blog posts from file system
    // Implementation depends on your file structure
    return []; // Placeholder
  }
  
  private async loadAllThoughts(): Promise<Thought[]> {
    // Load all thoughts from file system
    // Implementation depends on your file structure
    return []; // Placeholder
  }
}
```

## Background Processing

### Scheduled Processing
```typescript
// File: src/lib/email/scheduled-processor.ts
export class ScheduledProcessor {
  constructor(
    private env: Env,
    private authDB: AuthDB
  ) {}
  
  async processScheduledNotifications(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    // Get notifications scheduled for now or earlier
    const scheduledNotifications = await this.authDB.getScheduledNotifications(now);
    
    for (const notification of scheduledNotifications) {
      try {
        await this.processNotification(notification);
      } catch (error) {
        console.error(`Failed to process scheduled notification ${notification.id}:`, error);
      }
    }
  }
  
  async processFailedNotifications(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    // Get failed notifications ready for retry
    const failedNotifications = await this.authDB.getFailedNotificationsForRetry(now);
    
    for (const notification of failedNotifications) {
      try {
        await this.processNotification(notification);
      } catch (error) {
        console.error(`Failed to retry notification ${notification.id}:`, error);
        
        // Exponential backoff for next retry
        const nextRetryAt = now + (Math.pow(2, notification.retryCount) * 60);
        await this.authDB.scheduleNotificationRetry(notification.id, nextRetryAt);
      }
    }
  }
  
  private async processNotification(notification: EmailNotification): Promise<void> {
    // Process individual notification
    // Implementation similar to EmailNotificationService.processNotification
  }
}
```

### Cron Job Integration
```typescript
// File: src/pages/api/cron/process-notifications.ts
import { EmailNotificationService } from '../../../lib/email/notification-service';
import { ContentProcessor } from '../../../lib/email/content-processor';
import { ScheduledProcessor } from '../../../lib/email/scheduled-processor';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const env = locals.runtime.env;
    const authDB = new AuthDB(env.DB);
    
    // Initialize services
    const notificationService = new EmailNotificationService(env, authDB);
    const contentProcessor = new ContentProcessor(authDB, notificationService);
    const scheduledProcessor = new ScheduledProcessor(env, authDB);
    
    // Process new content
    await contentProcessor.processNewContent();
    
    // Process scheduled notifications
    await scheduledProcessor.processScheduledNotifications();
    
    // Process failed notifications for retry
    await scheduledProcessor.processFailedNotifications();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Notification processing completed' 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Cron job failed:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Notification processing failed',
      details: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

## Error Handling and Monitoring

### Error Handling Strategy
```typescript
// File: src/lib/email/error-handler.ts
export class EmailErrorHandler {
  constructor(private authDB: AuthDB) {}
  
  async handleEmailError(
    notificationId: string, 
    error: Error,
    context: { userId?: string; contentType?: string; attempt?: number }
  ): Promise<void> {
    const errorCode = this.categorizeError(error);
    
    // Log error
    await this.authDB.createNotificationHistory({
      userId: context.userId || 'unknown',
      notificationId,
      action: 'failed',
      details: {
        error: error.message,
        errorCode,
        context,
        timestamp: new Date().toISOString()
      },
      errorCode,
      retryAttempt: context.attempt || 0
    });
    
    // Handle specific error types
    switch (errorCode) {
      case 'RATE_LIMIT':
        await this.handleRateLimitError(notificationId);
        break;
      case 'INVALID_EMAIL':
        await this.handleInvalidEmailError(notificationId, context.userId);
        break;
      case 'QUOTA_EXCEEDED':
        await this.handleQuotaExceededError(notificationId);
        break;
      default:
        await this.handleGenericError(notificationId, error);
    }
  }
  
  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('rate limit') || message.includes('quota')) {
      return 'RATE_LIMIT';
    }
    if (message.includes('invalid email') || message.includes('recipient')) {
      return 'INVALID_EMAIL';
    }
    if (message.includes('quota exceeded')) {
      return 'QUOTA_EXCEEDED';
    }
    if (message.includes('authentication')) {
      return 'AUTH_ERROR';
    }
    
    return 'GENERIC_ERROR';
  }
  
  private async handleRateLimitError(notificationId: string): Promise<void> {
    // Schedule retry with exponential backoff
    const retryAt = Math.floor(Date.now() / 1000) + (60 * 15); // 15 minutes
    await this.authDB.scheduleNotificationRetry(notificationId, retryAt);
  }
  
  private async handleInvalidEmailError(notificationId: string, userId?: string): Promise<void> {
    // Mark notification as permanently failed
    await this.authDB.updateNotificationStatus(notificationId, 'failed', 'Invalid email address');
    
    // Update user email status
    if (userId) {
      await this.authDB.updateUserEmailStatus(userId, 'bounced');
    }
  }
  
  private async handleQuotaExceededError(notificationId: string): Promise<void> {
    // Schedule retry for next day
    const retryAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours
    await this.authDB.scheduleNotificationRetry(notificationId, retryAt);
  }
  
  private async handleGenericError(notificationId: string, error: Error): Promise<void> {
    // Schedule retry with exponential backoff
    const retryAt = Math.floor(Date.now() / 1000) + (60 * 5); // 5 minutes
    await this.authDB.scheduleNotificationRetry(notificationId, retryAt);
  }
}
```

## Testing Strategy

### Unit Tests
```typescript
// File: src/tests/email/gmail-auth.test.ts
import { describe, test, expect, vi } from 'vitest';
import { GmailAuth } from '../../lib/email/gmail-auth';

describe('GmailAuth', () => {
  test('should cache access token', async () => {
    const mockEnv = {
      GMAIL_CLIENT_ID: 'test-client-id',
      GMAIL_CLIENT_SECRET: 'test-secret',
      GMAIL_REFRESH_TOKEN: 'test-refresh-token'
    };
    
    const gmailAuth = new GmailAuth(mockEnv);
    
    // Mock token refresh
    vi.spyOn(gmailAuth, 'refreshAccessToken').mockResolvedValue('test-access-token');
    
    const token1 = await gmailAuth.getValidAccessToken();
    const token2 = await gmailAuth.getValidAccessToken();
    
    expect(token1).toBe('test-access-token');
    expect(token2).toBe('test-access-token');
    expect(gmailAuth.refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests
```typescript
// File: src/tests/email/notification-service.test.ts
import { describe, test, expect } from 'vitest';
import { EmailNotificationService } from '../../lib/email/notification-service';

describe('EmailNotificationService', () => {
  test('should send blog notification to all subscribers', async () => {
    const mockPost = {
      slug: 'test-post',
      title: 'Test Post',
      description: 'Test description',
      publishDate: new Date(),
      tags: ['test']
    };
    
    const service = new EmailNotificationService(mockEnv, mockAuthDB);
    
    await service.sendBlogNotification(mockPost);
    
    // Verify notifications were created
    expect(mockAuthDB.createEmailNotification).toHaveBeenCalled();
  });
});
```

## Deployment Configuration

### Environment Setup
```bash
# Development
cp .env.example .env.local

# Production secrets
wrangler secret put GMAIL_CLIENT_ID
wrangler secret put GMAIL_CLIENT_SECRET
wrangler secret put GMAIL_REFRESH_TOKEN
wrangler secret put GMAIL_SENDER_EMAIL
```

### Cloudflare Workers Configuration
```toml
# wrangler.toml additions
[env.production]
vars = { 
  SITE_URL = "https://your-domain.com",
  SITE_NAME = "Your Site Name"
}

# Cron triggers for background processing
[[env.production.triggers]]
crons = ["*/5 * * * *"] # Every 5 minutes
```

This comprehensive email service implementation plan provides a robust foundation for sending email notifications with proper error handling, retry logic, and monitoring capabilities.