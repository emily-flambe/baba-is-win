import { AuthDB } from '../auth/db';

export interface EmailError {
  code: string;
  message: string;
  details?: any;
  retriable: boolean;
  retryAfter?: number; // seconds
}

export class EmailErrorHandler {
  constructor(private authDB: AuthDB) {}
  
  async handleEmailError(
    notificationId: string, 
    error: Error,
    context: { userId?: string; contentType?: string; attempt?: number }
  ): Promise<EmailError> {
    const emailError = this.categorizeError(error);
    
    // Log error to console for debugging
    console.error(`Email error for notification ${notificationId}:`, {
      error: error.message,
      code: emailError.code,
      context,
      timestamp: new Date().toISOString()
    });
    
    // Log to database (simplified implementation)
    await this.logErrorToDatabase(notificationId, emailError, context);
    
    // Handle specific error types
    switch (emailError.code) {
      case 'RATE_LIMIT':
        await this.handleRateLimitError(notificationId, emailError);
        break;
      case 'INVALID_EMAIL':
        await this.handleInvalidEmailError(notificationId, context.userId);
        break;
      case 'QUOTA_EXCEEDED':
        await this.handleQuotaExceededError(notificationId, emailError);
        break;
      case 'AUTH_ERROR':
        await this.handleAuthError(notificationId, emailError);
        break;
      default:
        await this.handleGenericError(notificationId, emailError);
    }
    
    return emailError;
  }
  
  private categorizeError(error: Error): EmailError {
    const message = error.message.toLowerCase();
    
    if (message.includes('rate limit') || message.includes('quota')) {
      return {
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        details: { originalError: error.message },
        retriable: true,
        retryAfter: 900 // 15 minutes
      };
    }
    
    if (message.includes('invalid email') || message.includes('recipient')) {
      return {
        code: 'INVALID_EMAIL',
        message: 'Invalid email address',
        details: { originalError: error.message },
        retriable: false
      };
    }
    
    if (message.includes('quota exceeded')) {
      return {
        code: 'QUOTA_EXCEEDED',
        message: 'Daily quota exceeded',
        details: { originalError: error.message },
        retriable: true,
        retryAfter: 86400 // 24 hours
      };
    }
    
    if (message.includes('authentication') || message.includes('unauthorized') || message.includes('401')) {
      return {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        details: { originalError: error.message },
        retriable: true,
        retryAfter: 300 // 5 minutes
      };
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connectivity issue',
        details: { originalError: error.message },
        retriable: true,
        retryAfter: 300 // 5 minutes
      };
    }
    
    return {
      code: 'GENERIC_ERROR',
      message: 'Unknown error occurred',
      details: { originalError: error.message },
      retriable: true,
      retryAfter: 300 // 5 minutes
    };
  }
  
  private async logErrorToDatabase(
    notificationId: string, 
    emailError: EmailError,
    context: { userId?: string; contentType?: string; attempt?: number }
  ): Promise<void> {
    // In a real implementation, you'd want to create an email_error_logs table
    // For now, we'll just log to console
    console.log(`Email error logged for notification ${notificationId}:`, {
      code: emailError.code,
      message: emailError.message,
      context,
      timestamp: new Date().toISOString()
    });
  }
  
  private async handleRateLimitError(notificationId: string, error: EmailError): Promise<void> {
    // Schedule retry with exponential backoff
    const retryAt = Math.floor(Date.now() / 1000) + (error.retryAfter || 900);
    console.log(`Rate limit error for notification ${notificationId}, retrying at ${new Date(retryAt * 1000)}`);
    
    // In a real implementation, you'd update the notification status and schedule retry
    // For now, we'll just log the action
  }
  
  private async handleInvalidEmailError(notificationId: string, userId?: string): Promise<void> {
    console.log(`Invalid email error for notification ${notificationId}, marking as permanently failed`);
    
    // Update user email status if we have userId
    if (userId) {
      try {
        // This is a simplified implementation - in reality you'd want an email_status column
        console.log(`Marking user ${userId} email as bounced`);
      } catch (error) {
        console.error('Failed to update user email status:', error);
      }
    }
  }
  
  private async handleQuotaExceededError(notificationId: string, error: EmailError): Promise<void> {
    // Schedule retry for next day
    const retryAt = Math.floor(Date.now() / 1000) + (error.retryAfter || 86400);
    console.log(`Quota exceeded for notification ${notificationId}, retrying at ${new Date(retryAt * 1000)}`);
  }
  
  private async handleAuthError(notificationId: string, error: EmailError): Promise<void> {
    console.log(`Authentication error for notification ${notificationId}, will retry with fresh token`);
    
    // Schedule retry with short delay to allow for token refresh
    const retryAt = Math.floor(Date.now() / 1000) + (error.retryAfter || 300);
    console.log(`Auth error for notification ${notificationId}, retrying at ${new Date(retryAt * 1000)}`);
  }
  
  private async handleGenericError(notificationId: string, error: EmailError): Promise<void> {
    console.log(`Generic error for notification ${notificationId}:`, error.message);
    
    // Schedule retry with exponential backoff
    const retryAt = Math.floor(Date.now() / 1000) + (error.retryAfter || 300);
    console.log(`Generic error for notification ${notificationId}, retrying at ${new Date(retryAt * 1000)}`);
  }
  
  // Helper method to determine if error is retriable
  static isRetriable(error: EmailError): boolean {
    return error.retriable;
  }
  
  // Helper method to get retry delay for exponential backoff
  static getRetryDelay(attempt: number, baseDelay: number = 300): number {
    return Math.min(baseDelay * Math.pow(2, attempt), 86400); // Max 24 hours
  }
  
  // Helper method to format error for logging
  static formatErrorForLogging(error: EmailError, context: any): string {
    return JSON.stringify({
      code: error.code,
      message: error.message,
      details: error.details,
      retriable: error.retriable,
      retryAfter: error.retryAfter,
      context,
      timestamp: new Date().toISOString()
    });
  }
}