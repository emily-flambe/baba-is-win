import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';
import { GmailAuth } from './gmail-auth';
import { EmailTemplateEngine, type BlogPost, type Thought } from './template-engine';
import { UnsubscribeService } from './unsubscribe-service';
import { EmailErrorHandler } from './error-handler';
import { EmailMonitor } from '../monitoring/email-monitor';
import { EmailEventLogger } from '../monitoring/email-event-logger';

export interface EmailNotification {
  id: string;
  userId: string;
  contentType: 'blog' | 'thought';
  contentId: string;
  contentTitle: string;
  contentUrl: string;
  contentExcerpt?: string;
  notificationType: 'new_content' | 'announcement';
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  emailMessageId?: string;
  retryCount: number;
  retryAfter?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailNotificationService {
  private gmailAuth: GmailAuth;
  private templateEngine: EmailTemplateEngine;
  private unsubscribeService: UnsubscribeService;
  private errorHandler: EmailErrorHandler;
  private monitor: EmailMonitor;
  private eventLogger: EmailEventLogger;
  
  constructor(
    private env: Env,
    private authDB: AuthDB
  ) {
    this.gmailAuth = new GmailAuth(env);
    this.templateEngine = new EmailTemplateEngine(env, authDB);
    this.unsubscribeService = new UnsubscribeService(env, authDB);
    this.errorHandler = new EmailErrorHandler(authDB);
    this.monitor = new EmailMonitor(env, authDB);
    this.eventLogger = new EmailEventLogger(env, authDB);
  }
  
  async sendBlogNotification(post: BlogPost): Promise<void> {
    console.log(`Processing blog notification for: ${post.title}`);
    
    // Get subscribers for blog updates
    const subscribers = await this.getSubscribersForContentType('blog');
    
    if (subscribers.length === 0) {
      console.log('No blog subscribers found');
      return;
    }
    
    console.log(`Found ${subscribers.length} blog subscribers`);
    
    // Create notifications for each subscriber
    const notifications = await this.createNotificationsForSubscribers(subscribers, post, 'blog');
    
    // Process notifications in batches
    await this.processBatchNotifications(notifications, post);
  }
  
  async sendThoughtNotification(thought: Thought): Promise<void> {
    console.log(`Processing thought notification for: ${thought.title}`);
    
    // Get subscribers for thought updates
    const subscribers = await this.getSubscribersForContentType('thought');
    
    if (subscribers.length === 0) {
      console.log('No thought subscribers found');
      return;
    }
    
    console.log(`Found ${subscribers.length} thought subscribers`);
    
    // Create notifications for each subscriber
    const notifications = await this.createNotificationsForSubscribers(subscribers, thought, 'thought');
    
    // Process notifications in batches
    await this.processBatchNotifications(notifications, thought);
  }
  
  private async getSubscribersForContentType(contentType: 'blog' | 'thought'): Promise<any[]> {
    return await this.authDB.getSubscribersForContentType(contentType);
  }
  
  private async createNotificationsForSubscribers(
    subscribers: any[], 
    content: BlogPost | Thought, 
    contentType: 'blog' | 'thought'
  ): Promise<EmailNotification[]> {
    const notifications: EmailNotification[] = [];
    
    for (const subscriber of subscribers) {
      // Create notification in database
      const notificationId = await this.authDB.createEmailNotification({
        userId: subscriber.id,
        contentType,
        contentId: content.slug,
        contentTitle: content.title || 'New Content',
        contentUrl: `${this.env.SITE_URL}/${contentType === 'blog' ? 'blog' : 'thoughts'}/${content.slug}`,
        contentExcerpt: contentType === 'blog' 
          ? (content as BlogPost).description 
          : content.content.substring(0, 200),
        notificationType: 'new_content'
      });
      
      const notification: EmailNotification = {
        id: notificationId,
        userId: subscriber.id,
        contentType,
        contentId: content.slug,
        contentTitle: content.title || 'New Content',
        contentUrl: `${this.env.SITE_URL}/${contentType === 'blog' ? 'blog' : 'thoughts'}/${content.slug}`,
        contentExcerpt: contentType === 'blog' 
          ? (content as BlogPost).description 
          : content.content.substring(0, 200),
        notificationType: 'new_content',
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      notifications.push(notification);
    }
    
    return notifications;
  }
  
  private async processBatchNotifications(
    notifications: EmailNotification[], 
    content: BlogPost | Thought
  ): Promise<void> {
    const batchSize = 10; // Process 10 notifications at a time
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(notifications.length / batchSize)}`);
      
      await Promise.all(batch.map(notification => 
        this.processNotification(notification, content)
      ));
      
      // Rate limiting: wait 2 seconds between batches
      if (i + batchSize < notifications.length) {
        console.log('Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`Completed processing ${notifications.length} notifications`);
  }
  
  private async processNotification(
    notification: EmailNotification,
    content: BlogPost | Thought
  ): Promise<void> {
    const startTime = Date.now();
    
    console.log(`[Notification Service] Processing notification ${notification.id} for user ${notification.userId}`);
    console.log(`[Notification Service] Content type: ${notification.contentType}, title: ${notification.contentTitle}`);
    console.log(`[Notification Service] Notification details:`, {
      id: notification.id,
      userId: notification.userId,
      contentType: notification.contentType,
      contentId: notification.contentId,
      retryCount: notification.retryCount,
      createdAt: notification.createdAt
    });
    
    try {
      // Check circuit breaker
      console.log(`[Notification Service] Checking circuit breaker status...`);
      if (this.monitor.isCircuitBreakerOpen()) {
        console.error(`[Notification Service] Circuit breaker is open, failing notification ${notification.id}`);
        throw new Error('Email service circuit breaker is open');
      }
      console.log(`[Notification Service] Circuit breaker is closed, proceeding with notification`);
      
      // Get user details
      console.log(`[Notification Service] Fetching user details for userId: ${notification.userId}`);
      const user = await this.authDB.getUserById(notification.userId);
      if (!user) {
        console.error(`[Notification Service] User not found: ${notification.userId}`);
        throw new Error(`User not found: ${notification.userId}`);
      }
      
      console.log(`[Notification Service] User found:`, {
        id: user.id,
        email: user.email,
        emailSubscription: user.emailSubscription,
        subscriptionPreferences: user.subscriptionPreferences
      });
      
      console.log(`[Notification Service] Sending ${notification.contentType} notification to ${user.email}`);
      
      // Generate unsubscribe URL
      console.log(`[Notification Service] Generating unsubscribe URL for user ${user.id}`);
      const unsubscribeUrl = await this.unsubscribeService.generateUnsubscribeUrl(user.id);
      console.log(`[Notification Service] Unsubscribe URL generated: ${unsubscribeUrl}`);
      
      // Render email template
      console.log(`[Notification Service] Rendering ${notification.contentType} email template...`);
      const emailContent = notification.contentType === 'blog' 
        ? await this.templateEngine.renderBlogNotification(user, content as BlogPost, unsubscribeUrl)
        : await this.templateEngine.renderThoughtNotification(user, content as Thought, unsubscribeUrl);
      
      console.log(`[Notification Service] Email template rendered:`, {
        subject: emailContent.subject,
        htmlLength: emailContent.html?.length || 0,
        textLength: emailContent.text?.length || 0
      });
      
      // Send email
      console.log(`[Notification Service] Initiating Gmail API send for notification ${notification.id}`);
      const emailMessageId = await this.gmailAuth.sendEmail(
        user.email,
        emailContent.subject,
        emailContent.html,
        emailContent.text
      );
      
      console.log(`[Notification Service] Gmail API send successful, message ID: ${emailMessageId}`);
      
      // Update notification status in database
      console.log(`[Notification Service] Updating notification ${notification.id} status to 'sent'`);
      await this.authDB.updateNotificationStatus(
        notification.id,
        'sent',
        undefined,
        emailMessageId
      );
      
      notification.status = 'sent';
      notification.emailMessageId = emailMessageId;
      notification.updatedAt = new Date();
      
      // Track success metrics
      const duration = Date.now() - startTime;
      console.log(`[Notification Service] Recording success metrics for notification ${notification.id}, duration: ${duration}ms`);
      await this.monitor.logPerformanceMetric('send_notification', duration, true, {
        notification_id: notification.id,
        content_type: notification.contentType,
        user_id: notification.userId
      });
      
      await this.monitor.trackEmailEvent('sent', notification.id, notification.userId);
      this.monitor.recordSuccess();
      
      console.log(`[Notification Service] Successfully sent notification ${notification.id} to ${user.email}`);
      
    } catch (error) {
      console.error(`[Notification Service] Failed to send notification ${notification.id}:`, error);
      console.error(`[Notification Service] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        notificationId: notification.id,
        userId: notification.userId,
        contentType: notification.contentType,
        retryCount: notification.retryCount
      });
      
      // Additional error context logging
      if (error.message?.includes('Gmail API')) {
        console.error(`[Notification Service] Gmail API specific error detected for notification ${notification.id}`);
      }
      if (error.message?.includes('token')) {
        console.error(`[Notification Service] Token-related error detected for notification ${notification.id}`);
      }
      if (error.message?.includes('quota') || error.message?.includes('rate')) {
        console.error(`[Notification Service] Rate limit/quota error detected for notification ${notification.id}`);
      }
      
      // Track failure metrics
      const duration = Date.now() - startTime;
      console.log(`[Notification Service] Recording failure metrics for notification ${notification.id}, duration: ${duration}ms`);
      await this.monitor.logPerformanceMetric('send_notification', duration, false, {
        notification_id: notification.id,
        content_type: notification.contentType,
        user_id: notification.userId,
        error: error.message,
        error_name: error.name,
        error_stack: error.stack
      });
      
      this.monitor.recordFailure();
      
      // Handle error using error handler
      console.log(`[Notification Service] Passing error to error handler for notification ${notification.id}`);
      const emailError = await this.errorHandler.handleEmailError(
        notification.id,
        error as Error,
        {
          userId: notification.userId,
          contentType: notification.contentType,
          attempt: notification.retryCount + 1
        }
      );
      
      console.log(`[Notification Service] Error handler returned:`, {
        code: emailError.code,
        message: emailError.message,
        retriable: emailError.retriable,
        retryAfter: emailError.retryAfter
      });
      
      // Update notification status in database
      console.log(`[Notification Service] Updating notification ${notification.id} status to 'failed'`);
      await this.authDB.updateNotificationStatus(
        notification.id,
        'failed',
        emailError.message
      );
      
      notification.status = 'failed';
      notification.errorMessage = emailError.message;
      notification.retryCount += 1;
      notification.updatedAt = new Date();
      
      // Set retry time if error is retriable
      if (EmailErrorHandler.isRetriable(emailError)) {
        const retryDelay = EmailErrorHandler.getRetryDelay(notification.retryCount);
        notification.retryAfter = Math.floor(Date.now() / 1000) + retryDelay;
        console.log(`[Notification Service] Notification ${notification.id} will be retried at ${new Date(notification.retryAfter * 1000)} (delay: ${retryDelay}s)`);
      } else {
        console.log(`[Notification Service] Notification ${notification.id} marked as permanently failed - not retriable`);
      }
    }
  }
  
  // Helper method to process failed notifications for retry
  async processFailedNotifications(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    console.log(`Processing failed notifications ready for retry at ${new Date()}`);
    
    // In a real implementation, you'd query the database for failed notifications
    // that are ready for retry (where retryAfter <= now)
    // For now, we'll just log that this would happen
    console.log('Would query database for failed notifications ready for retry');
  }
  
  // Helper method to get notification statistics
  async getNotificationStats(): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    retryable: number;
  }> {
    const metrics = await this.monitor.getEmailMetrics();
    
    return {
      total: metrics.total_notifications,
      pending: metrics.pending_notifications,
      sent: metrics.sent_notifications,
      failed: metrics.failed_notifications,
      retryable: 0 // Calculate this based on failed notifications with retry_count < 3
    };
  }
  
  // Method to get system monitoring data
  async getSystemStatus() {
    return await this.monitor.getSystemStatus();
  }
}