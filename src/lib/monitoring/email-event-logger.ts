import { AuthDB } from '../auth/db';
import type { Env } from '../../types/env';

export interface EmailEvent {
  id: string;
  correlationId: string;
  eventType: 'auth' | 'send' | 'template' | 'user_lookup' | 'api_request' | 'performance';
  eventCategory: 'gmail_api' | 'template_render' | 'user_query' | 'auth_token' | 'notification_process';
  eventName: string;
  
  // Context
  userId?: string;
  notificationId?: string;
  contentId?: string;
  contentType?: 'blog' | 'thought';
  
  // Status
  status: 'started' | 'completed' | 'failed' | 'retrying';
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: string;
  stackTrace?: string;
  
  // Performance
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  
  // Data
  requestData?: string;  // JSON string (sanitized)
  responseData?: string; // JSON string (sanitized)
  payloadSize?: number;
  responseSize?: number;
  
  // Gmail specific
  gmailMessageId?: string;
  accessTokenPrefix?: string;
  rateLimitRemaining?: number;
  quotaUsed?: number;
  
  // Meta
  environment?: string;
  workerVersion?: string;
}

export class EmailEventLogger {
  private correlationId: string;
  
  constructor(
    private env: Env,
    private authDB: AuthDB,
    correlationId?: string
  ) {
    this.correlationId = correlationId || this.generateCorrelationId();
  }
  
  private generateCorrelationId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateEventId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // 🦫 Create a new correlated logger for related operations
  createCorrelatedLogger(): EmailEventLogger {
    return new EmailEventLogger(this.env, this.authDB, this.correlationId);
  }
  
  // 🦫 Log the start of an operation
  async logEventStart(
    eventType: EmailEvent['eventType'],
    eventCategory: EmailEvent['eventCategory'],
    eventName: string,
    context: Partial<EmailEvent> = {}
  ): Promise<string> {
    const eventId = this.generateEventId();
    const now = Date.now();
    
    const event: EmailEvent = {
      id: eventId,
      correlationId: this.correlationId,
      eventType,
      eventCategory,
      eventName,
      status: 'started',
      startedAt: now,
      environment: this.env.ENVIRONMENT || 'production',
      ...context
    };
    
    await this.insertEvent(event);
    console.log(`🦫 [EventLogger] Started ${eventType}:${eventName} (${eventId})`);
    
    return eventId;
  }
  
  // 🦫 Log successful completion
  async logEventComplete(
    eventId: string,
    data: {
      responseData?: any;
      gmailMessageId?: string;
      additionalContext?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const now = Date.now();
    const event = await this.getEvent(eventId);
    
    if (event) {
      const durationMs = now - event.startedAt;
      
      await this.updateEvent(eventId, {
        status: 'completed',
        completedAt: now,
        durationMs,
        responseData: data.responseData ? this.sanitizeData(data.responseData) : undefined,
        gmailMessageId: data.gmailMessageId,
        ...data.additionalContext
      });
      
      console.log(`🦫 [EventLogger] Completed ${event.eventType}:${event.eventName} in ${durationMs}ms`);
    }
  }
  
  // 🦫 Log failure with detailed error info
  async logEventFailure(
    eventId: string,
    error: Error,
    errorCode?: string,
    additionalContext: Record<string, any> = {}
  ): Promise<void> {
    const now = Date.now();
    const event = await this.getEvent(eventId);
    
    if (event) {
      const durationMs = now - event.startedAt;
      
      await this.updateEvent(eventId, {
        status: 'failed',
        completedAt: now,
        durationMs,
        errorCode: errorCode || 'UNKNOWN_ERROR',
        errorMessage: error.message,
        errorDetails: JSON.stringify({
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 10), // Limit stack trace
          additionalContext
        }),
        stackTrace: error.stack?.substring(0, 2000), // Limit stack trace size
      });
      
      console.error(`🦫 [EventLogger] Failed ${event.eventType}:${event.eventName} after ${durationMs}ms: ${error.message}`);
    }
  }
  
  // 🦫 Specialized Gmail API logging
  async logGmailApiCall(
    operation: string,
    requestData: any,
    accessTokenPrefix?: string
  ): Promise<string> {
    return await this.logEventStart('api_request', 'gmail_api', operation, {
      requestData: this.sanitizeData(requestData),
      accessTokenPrefix,
      payloadSize: JSON.stringify(requestData).length
    });
  }
  
  async logGmailApiSuccess(
    eventId: string,
    response: any,
    gmailMessageId?: string,
    rateLimitRemaining?: number
  ): Promise<void> {
    await this.logEventComplete(eventId, {
      responseData: this.sanitizeData(response),
      gmailMessageId,
      additionalContext: {
        rateLimitRemaining,
        responseSize: JSON.stringify(response).length
      }
    });
  }
  
  async logGmailApiFailure(
    eventId: string,
    error: Error,
    statusCode?: number,
    responseBody?: string
  ): Promise<void> {
    await this.logEventFailure(eventId, error, `GMAIL_API_${statusCode}`, {
      httpStatus: statusCode,
      responseBody: responseBody?.substring(0, 1000) // Limit response body
    });
  }
  
  // 🦫 Specialized notification logging
  async logNotificationStart(
    notificationId: string,
    userId: string,
    contentId: string,
    contentType: 'blog' | 'thought'
  ): Promise<string> {
    return await this.logEventStart('send', 'notification_process', 'send_notification', {
      notificationId,
      userId,
      contentId,
      contentType
    });
  }
  
  // 🦫 Template rendering logging
  async logTemplateRender(
    templateType: string,
    userId: string,
    contentId: string
  ): Promise<string> {
    return await this.logEventStart('template', 'template_render', `render_${templateType}`, {
      userId,
      contentId
    });
  }
  
  // 🦫 Authentication logging
  async logAuthOperation(operation: string, tokenPrefix?: string): Promise<string> {
    return await this.logEventStart('auth', 'auth_token', operation, {
      accessTokenPrefix: tokenPrefix
    });
  }
  
  // 🦫 Database operations
  private async insertEvent(event: EmailEvent): Promise<void> {
    try {
      await this.authDB.db.prepare(`
        INSERT INTO email_events (
          id, correlation_id, event_type, event_category, event_name,
          user_id, notification_id, content_id, content_type,
          status, error_code, error_message, error_details, stack_trace,
          started_at, completed_at, duration_ms,
          request_data, response_data, payload_size, response_size,
          gmail_message_id, access_token_prefix, rate_limit_remaining, quota_used,
          environment, worker_version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        event.id, event.correlationId, event.eventType, event.eventCategory, event.eventName,
        event.userId, event.notificationId, event.contentId, event.contentType,
        event.status, event.errorCode, event.errorMessage, event.errorDetails, event.stackTrace,
        event.startedAt, event.completedAt, event.durationMs,
        event.requestData, event.responseData, event.payloadSize, event.responseSize,
        event.gmailMessageId, event.accessTokenPrefix, event.rateLimitRemaining, event.quotaUsed,
        event.environment, event.workerVersion
      ).run();
    } catch (error) {
      console.error('🦫 [EventLogger] Failed to insert event:', error);
    }
  }
  
  private async updateEvent(eventId: string, updates: Partial<EmailEvent>): Promise<void> {
    try {
      const updateFields = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          updateFields.push(`${this.camelToSnake(key)} = ?`);
          values.push(value);
        }
      }
      
      if (updateFields.length > 0) {
        values.push(eventId);
        await this.authDB.db.prepare(`
          UPDATE email_events SET ${updateFields.join(', ')}, updated_at = strftime('%s', 'now')
          WHERE id = ?
        `).bind(...values).run();
      }
    } catch (error) {
      console.error('🦫 [EventLogger] Failed to update event:', error);
    }
  }
  
  private async getEvent(eventId: string): Promise<EmailEvent | null> {
    try {
      const result = await this.authDB.db.prepare(`
        SELECT * FROM email_events WHERE id = ?
      `).bind(eventId).first();
      
      return result ? this.dbRowToEvent(result) : null;
    } catch (error) {
      console.error('🦫 [EventLogger] Failed to get event:', error);
      return null;
    }
  }
  
  // 🦫 Query methods for debugging
  async getEventsByCorrelation(correlationId: string): Promise<EmailEvent[]> {
    try {
      const results = await this.authDB.db.prepare(`
        SELECT * FROM email_events WHERE correlation_id = ? ORDER BY started_at ASC
      `).bind(correlationId).all();
      
      return results.results?.map(row => this.dbRowToEvent(row)) || [];
    } catch (error) {
      console.error('🦫 [EventLogger] Failed to get events by correlation:', error);
      return [];
    }
  }
  
  async getRecentFailures(limit: number = 50): Promise<EmailEvent[]> {
    try {
      const results = await this.authDB.db.prepare(`
        SELECT * FROM email_events WHERE status = 'failed' 
        ORDER BY started_at DESC LIMIT ?
      `).bind(limit).all();
      
      return results.results?.map(row => this.dbRowToEvent(row)) || [];
    } catch (error) {
      console.error('🦫 [EventLogger] Failed to get recent failures:', error);
      return [];
    }
  }
  
  // 🦫 Utility methods
  private sanitizeData(data: any): string {
    if (!data) return '';
    
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return JSON.stringify(sanitized);
  }
  
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  
  private dbRowToEvent(row: any): EmailEvent {
    return {
      id: row.id,
      correlationId: row.correlation_id,
      eventType: row.event_type,
      eventCategory: row.event_category,
      eventName: row.event_name,
      userId: row.user_id,
      notificationId: row.notification_id,
      contentId: row.content_id,
      contentType: row.content_type,
      status: row.status,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      errorDetails: row.error_details,
      stackTrace: row.stack_trace,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      requestData: row.request_data,
      responseData: row.response_data,
      payloadSize: row.payload_size,
      responseSize: row.response_size,
      gmailMessageId: row.gmail_message_id,
      accessTokenPrefix: row.access_token_prefix,
      rateLimitRemaining: row.rate_limit_remaining,
      quotaUsed: row.quota_used,
      environment: row.environment,
      workerVersion: row.worker_version
    };
  }
  
  // 🦫 Get current correlation ID for external use
  getCorrelationId(): string {
    return this.correlationId;
  }
}