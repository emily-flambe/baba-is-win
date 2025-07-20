import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';
import { ResendEmailService } from './resend-service';
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

export class EmailNotificationServiceEnhanced {
  private emailService: ResendEmailService;
  private templateEngine: EmailTemplateEngine;
  private unsubscribeService: UnsubscribeService;
  private errorHandler: EmailErrorHandler;
  private monitor: EmailMonitor;
  private eventLogger: EmailEventLogger;
  
  constructor(
    private env: Env,
    private authDB: AuthDB
  ) {
    this.eventLogger = new EmailEventLogger(env, authDB);
    this.emailService = new ResendEmailService(env);
    this.templateEngine = new EmailTemplateEngine(env, authDB);
    this.unsubscribeService = new UnsubscribeService(env, authDB);
    this.errorHandler = new EmailErrorHandler(authDB);
    this.monitor = new EmailMonitor(env, authDB);
  }
  
  async sendBlogNotification(post: BlogPost): Promise<void> {
    const correlationId = this.eventLogger.newCorrelationId();
    
    try {
      await this.eventLogger.logAttempt('send', 'blog_notification_batch', {
        contentType: 'blog',
        operationDetails: {
          postSlug: post.slug,
          postTitle: post.title
        }
      });
      
      console.log(`Processing blog notification for: ${post.title}`);
      
      // Get subscribers for blog updates with event logging
      const subscribers = await this.getSubscribersForContentTypeWithLogging('blog');
      
      if (subscribers.length === 0) {
        await this.eventLogger.logSuccess('send', 'blog_notification_batch', {
          operationDetails: {
            subscriberCount: 0,
            result: 'no_subscribers'
          }
        });
        console.log('No blog subscribers found');
        return;
      }
      
      console.log(`Found ${subscribers.length} blog subscribers`);
      
      // Create notifications for each subscriber
      const notifications = await this.createNotificationsForSubscribersWithLogging(subscribers, post, 'blog');
      
      // Process notifications in batches
      await this.processBatchNotificationsWithLogging(notifications, post);
      
      await this.eventLogger.logSuccess('send', 'blog_notification_batch', {
        operationDetails: {
          subscriberCount: subscribers.length,
          notificationCount: notifications.length
        }
      });
      
    } catch (error) {
      await this.eventLogger.logFailure('send', 'blog_notification_batch', error as Error, 'internal', {
        contentType: 'blog',
        operationDetails: {
          postSlug: post.slug,
          postTitle: post.title
        }
      });
      throw error;
    }
  }
  
  async sendThoughtNotification(thought: Thought): Promise<void> {
    const correlationId = this.eventLogger.newCorrelationId();
    
    try {
      await this.eventLogger.logAttempt('send', 'thought_notification_batch', {
        contentType: 'thought',
        operationDetails: {
          thoughtSlug: thought.slug,
          thoughtTitle: thought.title
        }
      });
      
      console.log(`Processing thought notification for: ${thought.title}`);
      
      // Get subscribers for thought updates with event logging
      const subscribers = await this.getSubscribersForContentTypeWithLogging('thought');
      
      if (subscribers.length === 0) {
        await this.eventLogger.logSuccess('send', 'thought_notification_batch', {
          operationDetails: {
            subscriberCount: 0,
            result: 'no_subscribers'
          }
        });
        console.log('No thought subscribers found');
        return;
      }
      
      console.log(`Found ${subscribers.length} thought subscribers`);
      
      // Create notifications for each subscriber
      const notifications = await this.createNotificationsForSubscribersWithLogging(subscribers, thought, 'thought');
      
      // Process notifications in batches
      await this.processBatchNotificationsWithLogging(notifications, thought);
      
      await this.eventLogger.logSuccess('send', 'thought_notification_batch', {
        operationDetails: {
          subscriberCount: subscribers.length,
          notificationCount: notifications.length
        }
      });
      
    } catch (error) {
      await this.eventLogger.logFailure('send', 'thought_notification_batch', error as Error, 'internal', {
        contentType: 'thought',
        operationDetails: {
          thoughtSlug: thought.slug,
          thoughtTitle: thought.title
        }
      });
      throw error;
    }
  }
  
  private async getSubscribersForContentTypeWithLogging(contentType: 'blog' | 'thought'): Promise<any[]> {
    const operationName = `get_${contentType}_subscribers`;
    this.eventLogger.startOperation(operationName);
    
    try {
      await this.eventLogger.logAttempt('user_lookup', operationName, {
        contentType,
        operationDetails: { lookupType: 'subscribers_by_content_type' }
      });
      
      const subscribers = await this.authDB.getSubscribersForContentType(contentType);
      
      await this.eventLogger.logUserLookup('subscribers', true, undefined, undefined, subscribers.length);
      
      await this.eventLogger.logSuccess('user_lookup', operationName, {
        operationDetails: {
          subscriberCount: subscribers.length,
          contentType
        }
      });
      
      return subscribers;
      
    } catch (error) {
      await this.eventLogger.logUserLookup('subscribers', false, undefined, undefined, undefined, error as Error);
      await this.eventLogger.logFailure('user_lookup', operationName, error as Error, 'internal');
      throw error;
    }
  }
  
  private async createNotificationsForSubscribersWithLogging(
    subscribers: any[], 
    content: BlogPost | Thought, 
    contentType: 'blog' | 'thought'
  ): Promise<EmailNotification[]> {
    const operationName = 'create_notifications';
    this.eventLogger.startOperation(operationName);
    
    try {
      await this.eventLogger.logAttempt('send', operationName, {
        contentType,
        operationDetails: {
          subscriberCount: subscribers.length,
          contentSlug: content.slug,
          contentTitle: content.title
        }
      });
      
      const notifications: EmailNotification[] = [];
      
      for (const subscriber of subscribers) {
        try {
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
          
          await this.eventLogger.logSuccess('send', 'create_single_notification', {
            userId: subscriber.id,
            notificationId,
            contentType,
            operationDetails: {
              subscriberEmail: subscriber.email,
              contentSlug: content.slug
            }
          });
          
        } catch (error) {
          await this.eventLogger.logFailure('send', 'create_single_notification', error as Error, 'internal', {
            userId: subscriber.id,
            contentType,
            operationDetails: {
              subscriberEmail: subscriber.email,
              contentSlug: content.slug
            }
          });
          // Continue with other notifications even if one fails
          console.error(`Failed to create notification for user ${subscriber.id}:`, error);
        }
      }
      
      await this.eventLogger.logSuccess('send', operationName, {
        operationDetails: {
          totalSubscribers: subscribers.length,
          successfulNotifications: notifications.length,
          failedNotifications: subscribers.length - notifications.length
        }
      });
      
      return notifications;
      
    } catch (error) {
      await this.eventLogger.logFailure('send', operationName, error as Error, 'internal');
      throw error;
    }
  }
  
  private async processBatchNotificationsWithLogging(
    notifications: EmailNotification[], 
    content: BlogPost | Thought
  ): Promise<void> {
    const operationName = 'process_notification_batches';
    this.eventLogger.startOperation(operationName);
    
    try {
      await this.eventLogger.logAttempt('send', operationName, {
        operationDetails: {
          totalNotifications: notifications.length,
          contentSlug: content.slug
        }
      });
      
      const batchSize = 10; // Process 10 notifications at a time
      let successCount = 0;
      let failureCount = 0;
      
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(notifications.length / batchSize);
        
        await this.eventLogger.logAttempt('send', 'process_notification_batch', {
          operationDetails: {
            batchNumber,
            totalBatches,
            batchSize: batch.length
          }
        });
        
        console.log(`Processing batch ${batchNumber}/${totalBatches}`);
        
        const batchResults = await Promise.allSettled(
          batch.map(notification => this.processNotificationWithLogging(notification, content))
        );
        
        let batchSuccesses = 0;
        let batchFailures = 0;
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            batchSuccesses++;
            successCount++;
          } else {
            batchFailures++;
            failureCount++;
            console.error(`Batch notification ${batch[index].id} failed:`, result.reason);
          }
        });
        
        await this.eventLogger.logSuccess('send', 'process_notification_batch', {
          operationDetails: {
            batchNumber,
            batchSuccesses,
            batchFailures,
            batchSize: batch.length
          }
        });
        
        // Rate limiting: wait 2 seconds between batches
        if (i + batchSize < notifications.length) {
          console.log('Waiting 2 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      await this.eventLogger.logSuccess('send', operationName, {
        operationDetails: {
          totalNotifications: notifications.length,
          successCount,
          failureCount,
          successRate: (successCount / notifications.length) * 100
        }
      });
      
      console.log(`Completed processing ${notifications.length} notifications: ${successCount} successful, ${failureCount} failed`);
      
    } catch (error) {
      await this.eventLogger.logFailure('send', operationName, error as Error, 'internal');
      throw error;
    }
  }
  
  private async processNotificationWithLogging(
    notification: EmailNotification,
    content: BlogPost | Thought
  ): Promise<void> {
    const operationName = 'process_single_notification';
    const notificationCorrelationId = `${this.eventLogger.getCorrelationId()}_${notification.id}`;
    const notificationLogger = new EmailEventLogger(this.env, this.authDB, notificationCorrelationId);
    
    notificationLogger.startOperation(operationName);
    const startTime = Date.now();
    
    try {
      await notificationLogger.logAttempt('send', operationName, {
        userId: notification.userId,
        notificationId: notification.id,
        recipientEmail: notification.userId, // Will be resolved later
        contentType: notification.contentType,
        operationDetails: {
          contentSlug: content.slug,
          contentTitle: content.title
        }
      });
      
      console.log(`Processing notification ${notification.id} for user ${notification.userId}`);
      
      // Check circuit breaker
      if (this.monitor.isCircuitBreakerOpen()) {
        const error = new Error('Email service circuit breaker is open');
        await notificationLogger.logFailure('send', operationName, error, 'internal', {
          notificationId: notification.id,
          userId: notification.userId
        });
        throw error;
      }
      
      // Get user details with logging
      const user = await this.getUserWithLogging(notification.userId, notificationLogger);
      if (!user) {
        const error = new Error(`User not found: ${notification.userId}`);
        await notificationLogger.logFailure('user_lookup', 'get_user_by_id', error, 'internal', {
          userId: notification.userId
        });
        throw error;
      }
      
      console.log(`Sending ${notification.contentType} notification to ${user.email}`);
      
      // Generate unsubscribe URL with logging
      const unsubscribeUrl = await this.generateUnsubscribeUrlWithLogging(user.id, notificationLogger);
      
      // Render email template with logging
      const emailContent = await this.renderTemplateWithLogging(
        notification.contentType, user, content, unsubscribeUrl, notificationLogger
      );
      
      // Send email with Resend
      const sendResult = await this.emailService.sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        headers: emailContent.headers
      });
      
      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Failed to send email');
      }
      
      const emailMessageId = sendResult.messageId;
      
      // Update notification status in database
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
      await this.monitor.logPerformanceMetric('send_notification', duration, true, {
        notification_id: notification.id,
        content_type: notification.contentType,
        user_id: notification.userId
      });
      
      await this.monitor.trackEmailEvent('sent', notification.id, notification.userId);
      this.monitor.recordSuccess();
      
      await notificationLogger.logSuccess('send', operationName, {
        userId: notification.userId,
        notificationId: notification.id,
        recipientEmail: user.email,
        emailSubject: emailContent.subject,
        gmailMessageId: emailMessageId,
        operationDetails: {
          emailMessageId,
          duration
        }
      });
      
      console.log(`Successfully sent notification ${notification.id} to ${user.email}`);
      
    } catch (error) {
      console.error(`Failed to send notification ${notification.id}:`, error);
      
      // Track failure metrics
      const duration = Date.now() - startTime;
      await this.monitor.logPerformanceMetric('send_notification', duration, false, {
        notification_id: notification.id,
        content_type: notification.contentType,
        user_id: notification.userId,
        error: (error as Error).message
      });
      
      this.monitor.recordFailure();
      
      // Handle error using error handler
      const emailError = await this.errorHandler.handleEmailError(
        notification.id,
        error as Error,
        {
          userId: notification.userId,
          contentType: notification.contentType,
          attempt: notification.retryCount + 1
        }
      );
      
      // Update notification status in database
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
        console.log(`Notification ${notification.id} will be retried at ${new Date(notification.retryAfter * 1000)}`);
      } else {
        console.log(`Notification ${notification.id} marked as permanently failed`);
      }
      
      await notificationLogger.logFailure('send', operationName, error as Error, 'internal', {
        userId: notification.userId,
        notificationId: notification.id,
        operationDetails: {
          retryCount: notification.retryCount,
          retryAfter: notification.retryAfter,
          isRetriable: EmailErrorHandler.isRetriable(emailError)
        }
      });
      
      throw error;
    }
  }
  
  private async getUserWithLogging(userId: string, logger: EmailEventLogger): Promise<any> {
    logger.startOperation('get_user_by_id');
    
    try {
      await logger.logAttempt('user_lookup', 'get_user_by_id', { userId });
      
      const user = await this.authDB.getUserById(userId);
      
      await logger.logUserLookup('by_id', !!user, userId, user?.email);
      
      return user;
    } catch (error) {
      await logger.logUserLookup('by_id', false, userId, undefined, undefined, error as Error);
      throw error;
    }
  }
  
  private async generateUnsubscribeUrlWithLogging(userId: string, logger: EmailEventLogger): Promise<string> {
    logger.startOperation('generate_unsubscribe_url');
    
    try {
      await logger.logAttempt('template', 'generate_unsubscribe_url', { userId });
      
      const unsubscribeUrl = await this.unsubscribeService.generateUnsubscribeUrl(userId);
      
      await logger.logSuccess('template', 'generate_unsubscribe_url', {
        userId,
        operationDetails: { hasUrl: !!unsubscribeUrl }
      });
      
      return unsubscribeUrl;
    } catch (error) {
      await logger.logFailure('template', 'generate_unsubscribe_url', error as Error, 'internal', { userId });
      throw error;
    }
  }
  
  private async renderTemplateWithLogging(
    contentType: 'blog' | 'thought',
    user: any,
    content: BlogPost | Thought,
    unsubscribeUrl: string,
    logger: EmailEventLogger
  ): Promise<{ subject: string; html: string; text: string }> {
    const templateName = `${contentType}_notification`;
    logger.startOperation(`render_${templateName}`);
    
    try {
      await logger.logAttempt('template', `render_${templateName}`, {
        templateName,
        contentType,
        userId: user.id,
        operationDetails: {
          contentSlug: content.slug,
          hasUnsubscribeUrl: !!unsubscribeUrl
        }
      });
      
      const emailContent = contentType === 'blog' 
        ? await this.templateEngine.renderBlogNotification(user, content as BlogPost, unsubscribeUrl)
        : await this.templateEngine.renderThoughtNotification(user, content as Thought, unsubscribeUrl);
      
      await logger.logTemplateRender(templateName, true, contentType, user.id, undefined, {
        subjectLength: emailContent.subject.length,
        htmlLength: emailContent.html.length,
        textLength: emailContent.text.length
      });
      
      return emailContent;
    } catch (error) {
      await logger.logTemplateRender(templateName, false, contentType, user.id, error as Error);
      throw error;
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
  
  /**
   * Get the main event logger for this service
   */
  getEventLogger(): EmailEventLogger {
    return this.eventLogger;
  }
}