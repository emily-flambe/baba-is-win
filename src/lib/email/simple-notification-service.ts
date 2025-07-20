import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';
import { ResendEmailService } from './resend-service';
import { EmailTemplateEngine, type BlogPost, type Thought } from './template-engine';
import { UnsubscribeService } from './unsubscribe-service';

/**
 * Simplified email notification service
 * Just the essentials: send emails to subscribers
 */
export class SimpleEmailNotificationService {
  private emailService: ResendEmailService;
  private templateEngine: EmailTemplateEngine;
  private unsubscribeService: UnsubscribeService;
  
  constructor(
    private env: Env,
    private authDB: AuthDB
  ) {
    this.emailService = new ResendEmailService(env);
    this.templateEngine = new EmailTemplateEngine(env, authDB);
    this.unsubscribeService = new UnsubscribeService(env, authDB);
  }
  
  async sendBlogNotification(post: BlogPost): Promise<{ success: boolean; successCount: number; failedCount: number }> {
    console.log(`📧 [SimpleEmailNotificationService] Starting blog notification for: ${post.title}`);
    console.log(`📧 [SimpleEmailNotificationService] Blog post details:`, JSON.stringify(post));
    const result = await this.sendNotifications('blog', post);
    console.log(`📧 [SimpleEmailNotificationService] Blog notification result:`, result);
    return result;
  }
  
  async sendThoughtNotification(thought: Thought): Promise<{ success: boolean; successCount: number; failedCount: number }> {
    console.log(`📧 Sending thought notification: ${thought.title}`);
    return await this.sendNotifications('thought', thought);
  }
  
  private async sendNotifications(
    contentType: 'blog' | 'thought',
    content: BlogPost | Thought
  ): Promise<{ success: boolean; successCount: number; failedCount: number }> {
    // Get subscribers
    const subscribers = await this.authDB.getSubscribersForContentType(contentType);
    console.log(`Found ${subscribers.length} ${contentType} subscribers`);
    
    if (subscribers.length === 0) {
      return { success: true, successCount: 0, failedCount: 0 };
    }
    
    // Create notifications in database
    const notificationIds = await this.createNotifications(subscribers, contentType, content);
    
    // Process notifications and track results
    const results = await this.processNotifications(notificationIds, content);
    return results;
  }
  
  private async createNotifications(
    subscribers: any[],
    contentType: 'blog' | 'thought',
    content: BlogPost | Thought
  ): Promise<string[]> {
    const notificationIds: string[] = [];
    
    for (const subscriber of subscribers) {
      const id = await this.authDB.createEmailNotification({
        userId: subscriber.id,
        contentType,
        contentId: content.slug,
        contentTitle: content.title,
        contentUrl: `${this.env.SITE_URL}/${contentType === 'blog' ? 'blog' : 'thoughts'}/${content.slug}`,
        contentExcerpt: content.description,
        notificationType: 'new_content'
      });
      notificationIds.push(id);
    }
    
    return notificationIds;
  }
  
  private async processNotifications(
    notificationIds: string[],
    content: BlogPost | Thought
  ): Promise<{ success: boolean; successCount: number; failedCount: number }> {
    let successCount = 0;
    let failedCount = 0;
    
    // Process in batches of 10
    const batchSize = 10;
    
    for (let i = 0; i < notificationIds.length; i += batchSize) {
      const batch = notificationIds.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(notificationIds.length/batchSize)}`);
      
      // Process batch in parallel and collect results
      const results = await Promise.all(
        batch.map(id => this.sendSingleNotification(id, content))
      );
      
      // Count successes and failures
      results.forEach(success => {
        if (success) successCount++;
        else failedCount++;
      });
      
      // Small delay between batches to avoid rate limits
      if (i + batchSize < notificationIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return {
      success: failedCount === 0,
      successCount,
      failedCount
    };
  }
  
  private async sendSingleNotification(
    notificationId: string,
    content: BlogPost | Thought
  ): Promise<boolean> {
    try {
      // Get notification details
      const notification = await this.authDB.getNotificationById(notificationId);
      if (!notification || notification.status !== 'pending') return false;
      
      // Get user
      const user = await this.authDB.getUserById(notification.userId);
      if (!user || !user.email) {
        await this.authDB.updateNotificationStatus(notificationId, 'failed', 'User not found or no email');
        return false;
      }
      
      // Generate unsubscribe URL
      const unsubscribeUrl = await this.unsubscribeService.generateUnsubscribeUrl(user.id, user.email);
      
      // Render email
      const emailContent = await this.templateEngine.renderTemplate(
        notification.contentType,
        {
          recipientName: user.username || 'Subscriber',
          recipientEmail: user.email,
          contentTitle: content.title,
          contentUrl: notification.contentUrl,
          contentExcerpt: content.description,
          contentType: notification.contentType,
          publishDate: content.publishDate,
          authorName: 'Emily',
          unsubscribeUrl
        }
      );
      
      // Add unsubscribe headers
      emailContent.headers = {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };
      
      // Send email
      console.log(`📧 [SimpleEmailNotificationService] Calling Resend API for ${user.email}`);
      console.log(`📧 [SimpleEmailNotificationService] Email subject: ${emailContent.subject}`);
      
      const result = await this.emailService.sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        headers: emailContent.headers
      });
      
      console.log(`📧 [SimpleEmailNotificationService] Resend API response:`, result);
      
      // Update status
      if (result.success) {
        await this.authDB.updateNotificationStatus(notificationId, 'sent', null, result.messageId);
        console.log(`✅ Sent to ${user.email}`);
        return true;
      } else {
        await this.authDB.updateNotificationStatus(notificationId, 'failed', result.error);
        console.log(`❌ Failed to send to ${user.email}: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error(`Error processing notification ${notificationId}:`, error);
      await this.authDB.updateNotificationStatus(notificationId, 'failed', error.message);
      return false;
    }
  }
  
  /**
   * Process any pending notifications (called by cron job)
   */
  async processPendingNotifications(): Promise<void> {
    const pending = await this.authDB.getPendingNotifications(100);
    console.log(`Found ${pending.length} pending notifications`);
    
    if (pending.length === 0) return;
    
    // Group by content to avoid re-fetching
    const grouped = new Map<string, any[]>();
    for (const notification of pending) {
      const key = `${notification.contentType}:${notification.contentId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(notification);
    }
    
    // Process each group
    for (const [key, notifications] of grouped) {
      const [contentType, contentId] = key.split(':');
      
      // For simplicity, just retry sending without re-fetching content
      const notificationIds = notifications.map(n => n.id);
      
      // Create minimal content object
      const content = {
        slug: contentId,
        title: notifications[0].contentTitle,
        description: notifications[0].contentExcerpt || '',
        publishDate: new Date()
      } as BlogPost | Thought;
      
      await this.processNotifications(notificationIds, content);
    }
  }
}