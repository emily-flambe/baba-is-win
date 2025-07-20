import type { D1Database } from '@cloudflare/workers-types';
import type { 
  User, 
  Session, 
  EmailNotification,
  CreateEmailNotificationParams,
  EmailNotificationHistory,
  ContentItem,
  CreateContentItemParams,
  EmailTemplate,
  CreateEmailTemplateParams,
  UnsubscribeToken,
  CreateUnsubscribeTokenParams,
  EmailPreferences,
  EmailStatistics,
  EmailStatisticsUpdate
} from './types';
import { nanoid } from 'nanoid';

export class AuthDB {
  constructor(private db: D1Database) {}

  async createUser(
    email: string,
    username: string,
    passwordHash: string,
    emailBlogUpdates: boolean = false,
    emailThoughtUpdates: boolean = false,
    emailAnnouncements: boolean = false
  ): Promise<User> {
    const id = nanoid();
    const now = Date.now();
    
    await this.db
      .prepare(
        'INSERT INTO users (id, email, username, password_hash, email_blog_updates, email_thought_updates, email_announcements, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, email.toLowerCase(), username.toLowerCase(), passwordHash, emailBlogUpdates, emailThoughtUpdates, emailAnnouncements, now, now)
      .run();

    return {
      id,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      createdAt: new Date(now),
      emailBlogUpdates,
      emailThoughtUpdates,
      emailAnnouncements
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT id, email, username, email_blog_updates, email_thought_updates, email_announcements, created_at FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      email: result.email as string,
      username: result.username as string,
      createdAt: new Date(result.created_at as number),
      emailBlogUpdates: Boolean(result.email_blog_updates),
      emailThoughtUpdates: Boolean(result.email_thought_updates),
      emailAnnouncements: Boolean(result.email_announcements)
    };
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT id, email, username, email_blog_updates, email_thought_updates, email_announcements, created_at FROM users WHERE username = ?')
      .bind(username.toLowerCase())
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      email: result.email as string,
      username: result.username as string,
      createdAt: new Date(result.created_at as number),
      emailBlogUpdates: Boolean(result.email_blog_updates),
      emailThoughtUpdates: Boolean(result.email_thought_updates),
      emailAnnouncements: Boolean(result.email_announcements)
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT id, email, username, email_blog_updates, email_thought_updates, email_announcements, created_at FROM users WHERE id = ?')
      .bind(id)
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      email: result.email as string,
      username: result.username as string,
      createdAt: new Date(result.created_at as number),
      emailBlogUpdates: Boolean(result.email_blog_updates),
      emailThoughtUpdates: Boolean(result.email_thought_updates),
      emailAnnouncements: Boolean(result.email_announcements)
    };
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const result = await this.db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(userId)
      .first();

    return result ? (result.password_hash as string) : null;
  }

  async createSession(userId: string): Promise<Session> {
    const id = nanoid();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    
    await this.db
      .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(id, userId, expiresAt)
      .run();

    return {
      id,
      userId,
      expiresAt: new Date(expiresAt)
    };
  }

  async getSession(id: string): Promise<Session | null> {
    const result = await this.db
      .prepare('SELECT id, user_id, expires_at FROM sessions WHERE id = ? AND expires_at > ?')
      .bind(id, Date.now())
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      userId: result.user_id as string,
      expiresAt: new Date(result.expires_at as number)
    };
  }

  async deleteSession(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM sessions WHERE id = ?')
      .bind(id)
      .run();
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.db
      .prepare('DELETE FROM sessions WHERE expires_at <= ?')
      .bind(Date.now())
      .run();
  }

  // === EMAIL NOTIFICATION METHODS ===
  
  async createEmailNotification(params: CreateEmailNotificationParams): Promise<string> {
    const id = nanoid();
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
    const columnMap: { [key: string]: string } = {
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

  async getNotificationById(notificationId: string): Promise<EmailNotification | null> {
    const result = await this.db.prepare(`
      SELECT * FROM email_notifications WHERE id = ?
    `).bind(notificationId).first();
    
    if (!result) return null;
    
    return {
      id: result.id,
      userId: result.user_id,
      contentType: result.content_type,
      contentId: result.content_id,
      contentTitle: result.content_title,
      contentUrl: result.content_url,
      contentExcerpt: result.content_excerpt,
      notificationType: result.notification_type,
      status: result.status,
      createdAt: new Date(result.created_at * 1000),
      scheduledFor: result.scheduled_for ? new Date(result.scheduled_for * 1000) : undefined,
      sentAt: result.sent_at ? new Date(result.sent_at * 1000) : undefined,
      errorMessage: result.error_message,
      retryCount: result.retry_count,
      emailMessageId: result.email_message_id
    };
  }

  // createNotificationHistory method removed - email_notification_history table deleted in migration 0013

  // === CONTENT TRACKING METHODS ===
  
  async createContentItem(params: CreateContentItemParams): Promise<string> {
    const id = nanoid();
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
      params.contentHash || null,
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

  async updateContentItem(id: string, updates: {
    contentHash?: string;
    notificationSent?: boolean;
    updatedAt?: Date;
  }): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    
    const setParts: string[] = [];
    const bindValues: any[] = [];
    
    if (updates.contentHash !== undefined) {
      setParts.push('content_hash = ?');
      bindValues.push(updates.contentHash);
    }
    
    if (updates.notificationSent !== undefined) {
      setParts.push('notification_sent = ?');
      bindValues.push(updates.notificationSent ? 1 : 0);
    }
    
    if (updates.updatedAt !== undefined) {
      setParts.push('updated_at = ?');
      bindValues.push(Math.floor(updates.updatedAt.getTime() / 1000));
    } else {
      setParts.push('updated_at = ?');
      bindValues.push(now);
    }
    
    if (setParts.length === 0) return;
    
    bindValues.push(id);
    
    await this.db.prepare(`
      UPDATE content_items 
      SET ${setParts.join(', ')}
      WHERE id = ?
    `).bind(...bindValues).run();
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
    const id = nanoid();
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
    const id = nanoid();
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

  // updateEmailStatistics method removed - email_statistics table deleted in migration 0013

  // === HELPER METHODS ===
  
  private mapDbUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      createdAt: new Date(dbUser.created_at),
      emailBlogUpdates: !!dbUser.email_blog_updates,
      emailThoughtUpdates: !!dbUser.email_thought_updates,
      emailAnnouncements: !!dbUser.email_announcements
    };
  }

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
      usedAt: dbToken.used_at ? new Date(dbToken.used_at * 1000) : undefined
    };
  }
}