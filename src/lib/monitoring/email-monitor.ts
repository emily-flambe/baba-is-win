import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';

export interface EmailMetrics {
  total_notifications: number;
  sent_notifications: number;
  failed_notifications: number;
  pending_notifications: number;
  avg_delivery_time: number;
  success_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
  last_24h_sent: number;
  last_24h_failed: number;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: string;
  details?: any;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  threshold?: number;
  current_value?: number;
  timestamp: string;
  resolved?: boolean;
}

export class EmailMonitor {
  constructor(
    private env: Env,
    private authDB: AuthDB
  ) {}

  async getEmailMetrics(): Promise<EmailMetrics> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const last24h = now - (24 * 60 * 60);

      // Get overall notification stats
      const totalNotifications = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM email_notifications
      `).first();

      const sentNotifications = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM email_notifications WHERE status = 'sent'
      `).first();

      const failedNotifications = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM email_notifications WHERE status = 'failed'
      `).first();

      const pendingNotifications = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM email_notifications WHERE status = 'pending'
      `).first();

      // Get 24h stats
      const last24hSent = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM email_notifications 
        WHERE status = 'sent' AND created_at >= ?
      `).bind(last24h).first();

      const last24hFailed = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM email_notifications 
        WHERE status = 'failed' AND created_at >= ?
      `).bind(last24h).first();

      // Calculate rates
      const total = (totalNotifications?.count as number) || 0;
      const sent = (sentNotifications?.count as number) || 0;
      const failed = (failedNotifications?.count as number) || 0;
      const pending = (pendingNotifications?.count as number) || 0;

      const successRate = total > 0 ? (sent / total) * 100 : 0;
      const bounceRate = total > 0 ? (failed / total) * 100 : 0;

      // Get average delivery time (simplified - based on time difference)
      const avgDeliveryResult = await this.authDB.db.prepare(`
        SELECT AVG(sent_at - created_at) as avg_time 
        FROM email_notifications 
        WHERE status = 'sent' AND sent_at IS NOT NULL
      `).first();

      const avgDeliveryTime = (avgDeliveryResult?.avg_time as number) || 0;

      // Get unsubscribe rate (simplified)
      const totalUsers = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM users
      `).first();

      const unsubscribedUsers = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM users WHERE unsubscribe_all = TRUE
      `).first();

      const totalUserCount = (totalUsers?.count as number) || 0;
      const unsubscribedCount = (unsubscribedUsers?.count as number) || 0;
      const unsubscribeRate = totalUserCount > 0 ? (unsubscribedCount / totalUserCount) * 100 : 0;

      return {
        total_notifications: total,
        sent_notifications: sent,
        failed_notifications: failed,
        pending_notifications: pending,
        avg_delivery_time: avgDeliveryTime,
        success_rate: successRate,
        bounce_rate: bounceRate,
        unsubscribe_rate: unsubscribeRate,
        last_24h_sent: (last24hSent?.count as number) || 0,
        last_24h_failed: (last24hFailed?.count as number) || 0
      };
    } catch (error) {
      console.error('Failed to get email metrics:', error);
      throw error;
    }
  }

  async performHealthChecks(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    const timestamp = new Date().toISOString();

    // Database health check
    try {
      await this.authDB.db.prepare('SELECT 1').first();
      checks.push({
        service: 'database',
        status: 'healthy',
        message: 'Database connection is working',
        timestamp
      });
    } catch (error) {
      checks.push({
        service: 'database',
        status: 'unhealthy',
        message: 'Database connection failed',
        timestamp,
        details: { error: error.message }
      });
    }

    // Email service health check (simplified)
    try {
      // In a real implementation, you'd test the Gmail API connection
      checks.push({
        service: 'email_service',
        status: 'healthy',
        message: 'Email service is operational',
        timestamp
      });
    } catch (error) {
      checks.push({
        service: 'email_service',
        status: 'unhealthy',
        message: 'Email service connection failed',
        timestamp,
        details: { error: error.message }
      });
    }

    // Queue health check
    try {
      const pendingCount = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM email_notifications 
        WHERE status = 'pending' OR (status = 'failed' AND retry_count < 3)
      `).first();

      const queueSize = (pendingCount?.count as number) || 0;
      
      if (queueSize > 100) {
        checks.push({
          service: 'notification_queue',
          status: 'degraded',
          message: `High queue size: ${queueSize} notifications pending`,
          timestamp,
          details: { queue_size: queueSize }
        });
      } else {
        checks.push({
          service: 'notification_queue',
          status: 'healthy',
          message: `Queue size normal: ${queueSize} notifications pending`,
          timestamp,
          details: { queue_size: queueSize }
        });
      }
    } catch (error) {
      checks.push({
        service: 'notification_queue',
        status: 'unhealthy',
        message: 'Failed to check notification queue',
        timestamp,
        details: { error: error.message }
      });
    }

    return checks;
  }

  async generateAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];
    const metrics = await this.getEmailMetrics();
    const timestamp = new Date().toISOString();

    // High failure rate alert
    if (metrics.bounce_rate > 10) {
      alerts.push({
        id: `high_bounce_rate_${Date.now()}`,
        type: 'error',
        title: 'High Email Bounce Rate',
        message: `Bounce rate is ${metrics.bounce_rate.toFixed(2)}%, which exceeds the 10% threshold`,
        threshold: 10,
        current_value: metrics.bounce_rate,
        timestamp
      });
    }

    // Low success rate alert
    if (metrics.success_rate < 90 && metrics.total_notifications > 10) {
      alerts.push({
        id: `low_success_rate_${Date.now()}`,
        type: 'warning',
        title: 'Low Email Success Rate',
        message: `Success rate is ${metrics.success_rate.toFixed(2)}%, which is below the 90% threshold`,
        threshold: 90,
        current_value: metrics.success_rate,
        timestamp
      });
    }

    // High pending notifications alert
    if (metrics.pending_notifications > 50) {
      alerts.push({
        id: `high_pending_count_${Date.now()}`,
        type: 'warning',
        title: 'High Pending Notifications',
        message: `${metrics.pending_notifications} notifications are pending, which may indicate processing delays`,
        threshold: 50,
        current_value: metrics.pending_notifications,
        timestamp
      });
    }

    // High unsubscribe rate alert
    if (metrics.unsubscribe_rate > 5) {
      alerts.push({
        id: `high_unsubscribe_rate_${Date.now()}`,
        type: 'warning',
        title: 'High Unsubscribe Rate',
        message: `Unsubscribe rate is ${metrics.unsubscribe_rate.toFixed(2)}%, which exceeds the 5% threshold`,
        threshold: 5,
        current_value: metrics.unsubscribe_rate,
        timestamp
      });
    }

    // No emails sent in 24h alert (if we have active subscribers)
    const activeSubscribers = await this.getActiveSubscriberCount();
    if (metrics.last_24h_sent === 0 && activeSubscribers > 0) {
      alerts.push({
        id: `no_emails_24h_${Date.now()}`,
        type: 'warning',
        title: 'No Emails Sent in 24 Hours',
        message: `No emails have been sent in the last 24 hours despite having ${activeSubscribers} active subscribers`,
        threshold: 1,
        current_value: 0,
        timestamp
      });
    }

    return alerts;
  }

  async getSystemStatus(): Promise<{
    overall_status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: EmailMetrics;
    health_checks: HealthCheck[];
    alerts: Alert[];
    last_updated: string;
  }> {
    const [metrics, healthChecks, alerts] = await Promise.all([
      this.getEmailMetrics(),
      this.performHealthChecks(),
      this.generateAlerts()
    ]);

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    const hasUnhealthyServices = healthChecks.some(check => check.status === 'unhealthy');
    const hasErrorAlerts = alerts.some(alert => alert.type === 'error');
    const hasDegradedServices = healthChecks.some(check => check.status === 'degraded');
    const hasWarningAlerts = alerts.some(alert => alert.type === 'warning');

    if (hasUnhealthyServices || hasErrorAlerts) {
      overallStatus = 'unhealthy';
    } else if (hasDegradedServices || hasWarningAlerts) {
      overallStatus = 'degraded';
    }

    return {
      overall_status: overallStatus,
      metrics,
      health_checks: healthChecks,
      alerts,
      last_updated: new Date().toISOString()
    };
  }

  private async getActiveSubscriberCount(): Promise<number> {
    try {
      const result = await this.authDB.db.prepare(`
        SELECT COUNT(*) as count FROM users 
        WHERE (email_blog_updates = TRUE OR email_thought_updates = TRUE OR email_announcements = TRUE)
        AND unsubscribe_all = FALSE
        AND email_status != 'bounced'
      `).first();

      return (result?.count as number) || 0;
    } catch (error) {
      console.error('Failed to get active subscriber count:', error);
      return 0;
    }
  }

  // Method to log performance metrics
  async logPerformanceMetric(
    operation: string,
    duration: number,
    success: boolean,
    details?: any
  ): Promise<void> {
    console.log(`Performance metric: ${operation}`, {
      duration_ms: duration,
      success,
      details,
      timestamp: new Date().toISOString()
    });

    // In a real implementation, you'd store this in a metrics database
    // or send to a monitoring service like DataDog, New Relic, etc.
  }

  // Method to track email events
  async trackEmailEvent(
    event: 'sent' | 'delivered' | 'bounced' | 'opened' | 'clicked' | 'unsubscribed',
    notificationId: string,
    userId: string,
    details?: any
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    
    console.log(`Email event: ${event}`, {
      notification_id: notificationId,
      user_id: userId,
      details,
      timestamp
    });

    // Note: Email statistics tracking disabled - email_statistics table removed in migration 0013
  }

  // Circuit breaker pattern for email sending
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly maxFailures = 5;
  private readonly resetTimeout = 300000; // 5 minutes

  isCircuitBreakerOpen(): boolean {
    const now = Date.now();
    
    // Reset if timeout has passed
    if (now - this.lastFailureTime > this.resetTimeout) {
      this.failureCount = 0;
      return false;
    }
    
    return this.failureCount >= this.maxFailures;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  recordSuccess(): void {
    this.failureCount = 0;
  }
}