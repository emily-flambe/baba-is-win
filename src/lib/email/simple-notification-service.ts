import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';
import { ResendEmailService } from './resend-service';
import { EmailTemplateEngine, type BlogPost, type Thought } from './template-engine';
import { UnsubscribeService } from './unsubscribe-service';
import type { User } from '../auth/types';

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
    console.log(`📧 [SimpleEmailNotificationService] Starting thought notification for: ${thought.title}`);
    console.log(`📧 [SimpleEmailNotificationService] Thought details:`, JSON.stringify(thought));
    const result = await this.sendNotifications('thought', thought);
    console.log(`📧 [SimpleEmailNotificationService] Thought notification result:`, result);
    return result;
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
    subscribers: User[],
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
        contentUrl: `${this.env.SITE_URL || 'https://emilycogsdill.com'}/${contentType === 'blog' ? 'blog' : 'thoughts'}/${content.slug}`,
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
    
    // Smaller batch size to reduce subrequests per batch
    const batchSize = 3;
    
    for (let i = 0; i < notificationIds.length; i += batchSize) {
      const batch = notificationIds.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(notificationIds.length/batchSize)} (${batch.length} notifications)`);
      
      // Process batch sequentially to avoid overwhelming subrequest limits
      for (const id of batch) {
        const success = await this.sendSingleNotification(id, content);
        if (success) successCount++;
        else failedCount++;
        
        // Small delay between individual requests
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Longer delay between batches
      if (i + batchSize < notificationIds.length) {
        console.log('Waiting between batches to avoid rate limits...');
        await new Promise(resolve => setTimeout(resolve, 2000));
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
      const templateName = `${notification.contentType}_notification`;
      
      // Debug: Log the variables being passed
      const templateVariables = {
        title: notification.contentType === 'thought' && !(content as Thought).title 
          ? 'New Thought' 
          : content.title || 'Untitled',
        description: content.description || (notification.contentType === 'thought' 
          ? (content as Thought).content.substring(0, 150) + '...'
          : ''),
        url: notification.contentUrl,
        unsubscribe_url: unsubscribeUrl,
        publish_date: content.publishDate.toLocaleDateString(),
        tags: content.tags || [],
        site_name: this.env.SITE_NAME || 'Emily Cogsdill',
        site_url: this.env.SITE_URL || 'https://emilycogsdill.com',
        user_name: user.username || 'Subscriber',
        content: notification.contentType === 'thought' ? (content as Thought).content : undefined
      };
      
      console.log(`📧 [SimpleEmailNotificationService] Template variables:`, JSON.stringify(templateVariables, null, 2));
      
      const emailContent = await this.templateEngine.renderTemplate(
        templateName,
        templateVariables
      );
      
      // Add unsubscribe headers
      emailContent.headers = {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };
      
      // Send email
      console.log(`📧 [SimpleEmailNotificationService] Calling Resend API for ${user.email}`);
      console.log(`📧 [SimpleEmailNotificationService] Email subject: ${emailContent.subject}`);
      console.log(`📧 [SimpleEmailNotificationService] HTML preview (first 500 chars):`, emailContent.html.substring(0, 500));
      console.log(`📧 [SimpleEmailNotificationService] Text preview (first 300 chars):`, emailContent.text.substring(0, 300));
      
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SimpleEmailNotificationService] Error processing notification ${notificationId}:`, error);
      await this.authDB.updateNotificationStatus(notificationId, 'failed', errorMessage);
      return false;
    }
  }
  
  // Note: processPendingNotifications method removed as it used non-existent getPendingNotifications
  // Pending notifications are handled by the cron job retry logic instead
}