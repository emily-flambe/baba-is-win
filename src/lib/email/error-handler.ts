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
    console.log(`[Error Handler] Processing error for notification ${notificationId}`);
    console.log(`[Error Handler] Original error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      context
    });
    
    const emailError = this.categorizeError(error);
    
    // Enhanced error logging
    console.error(`[Error Handler] Email error categorized for notification ${notificationId}:`, {
      originalError: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      categorizedError: {
        code: emailError.code,
        message: emailError.message,
        retriable: emailError.retriable,
        retryAfter: emailError.retryAfter,
        details: emailError.details
      },
      context,
      timestamp: new Date().toISOString()
    });
    
    // Log to database (simplified implementation)
    await this.logErrorToDatabase(notificationId, emailError, context);
    
    // Handle specific error types
    console.log(`[Error Handler] Handling error type: ${emailError.code}`);
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
    
    console.log(`[Error Handler] Error handling complete for notification ${notificationId}`);
    return emailError;
  }
  
  private categorizeError(error: Error): EmailError {
    const message = error.message.toLowerCase();
    const originalMessage = error.message;
    const errorName = error.name;
    const errorStack = error.stack;
    
    console.log(`[Error Handler] Categorizing error:`, {
      originalMessage,
      lowercaseMessage: message,
      errorName,
      stackPreview: errorStack?.substring(0, 500)
    });
    
    // Enhanced error parsing with detailed logging
    const errorDetails = {
      originalError: originalMessage,
      errorName,
      stack: errorStack,
      timestamp: new Date().toISOString()
    };
    
    // Gmail API specific errors
    if (message.includes('gmail api error') && message.includes('400')) {
      console.log(`[Error Handler] Detected Gmail API 400 error`);
      return {
        code: 'GMAIL_BAD_REQUEST',
        message: 'Gmail API bad request - invalid email format or content',
        details: errorDetails,
        retriable: false
      };
    }
    
    if (message.includes('gmail api error') && message.includes('403')) {
      console.log(`[Error Handler] Detected Gmail API 403 error`);
      return {
        code: 'GMAIL_FORBIDDEN',
        message: 'Gmail API forbidden - quota exceeded or insufficient permissions',
        details: errorDetails,
        retriable: true,
        retryAfter: 3600 // 1 hour
      };
    }
    
    if (message.includes('gmail api error') && message.includes('429')) {
      console.log(`[Error Handler] Detected Gmail API 429 rate limit error`);
      return {
        code: 'RATE_LIMIT',
        message: 'Gmail API rate limit exceeded',
        details: errorDetails,
        retriable: true,
        retryAfter: 900 // 15 minutes
      };
    }
    
    if (message.includes('gmail api error') && message.includes('500')) {
      console.log(`[Error Handler] Detected Gmail API 500 server error`);
      return {
        code: 'GMAIL_SERVER_ERROR',
        message: 'Gmail API internal server error',
        details: errorDetails,
        retriable: true,
        retryAfter: 300 // 5 minutes
      };
    }
    
    // OAuth token refresh errors
    if (message.includes('oauth token refresh failed') && message.includes('400')) {
      console.log(`[Error Handler] Detected OAuth token refresh 400 error`);
      return {
        code: 'OAUTH_BAD_REQUEST',
        message: 'OAuth token refresh failed - invalid credentials',
        details: errorDetails,
        retriable: false
      };
    }
    
    if (message.includes('oauth token refresh failed') && message.includes('401')) {
      console.log(`[Error Handler] Detected OAuth token refresh 401 error`);
      return {
        code: 'OAUTH_UNAUTHORIZED',
        message: 'OAuth token refresh failed - refresh token expired',
        details: errorDetails,
        retriable: false
      };
    }
    
    // Generic pattern matching with enhanced detection
    if (message.includes('rate limit') || message.includes('too many requests')) {
      console.log(`[Error Handler] Detected generic rate limit error`);
      return {
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded',
        details: errorDetails,
        retriable: true,
        retryAfter: 900 // 15 minutes
      };
    }
    
    if (message.includes('invalid email') || message.includes('recipient') || message.includes('invalid_to')) {
      console.log(`[Error Handler] Detected invalid email error`);
      return {
        code: 'INVALID_EMAIL',
        message: 'Invalid email address',
        details: errorDetails,
        retriable: false
      };
    }
    
    if (message.includes('quota exceeded') || message.includes('daily limit')) {
      console.log(`[Error Handler] Detected quota exceeded error`);
      return {
        code: 'QUOTA_EXCEEDED',
        message: 'Daily quota exceeded',
        details: errorDetails,
        retriable: true,
        retryAfter: 86400 // 24 hours
      };
    }
    
    if (message.includes('authentication') || message.includes('unauthorized') || message.includes('401') || message.includes('invalid_grant')) {
      console.log(`[Error Handler] Detected authentication error`);
      return {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
        details: errorDetails,
        retriable: true,
        retryAfter: 300 // 5 minutes
      };
    }
    
    if (message.includes('network') || message.includes('timeout') || message.includes('connection') || message.includes('fetch')) {
      console.log(`[Error Handler] Detected network error`);
      return {
        code: 'NETWORK_ERROR',
        message: 'Network connectivity issue',
        details: errorDetails,
        retriable: true,
        retryAfter: 300 // 5 minutes
      };
    }
    
    if (message.includes('circuit breaker')) {
      console.log(`[Error Handler] Detected circuit breaker error`);
      return {
        code: 'CIRCUIT_BREAKER',
        message: 'Email service circuit breaker is open',
        details: errorDetails,
        retriable: true,
        retryAfter: 600 // 10 minutes
      };
    }
    
    console.log(`[Error Handler] No specific pattern matched, categorizing as generic error`);
    return {
      code: 'GENERIC_ERROR',
      message: `Unhandled error: ${originalMessage}`,
      details: errorDetails,
      retriable: true,
      retryAfter: 300 // 5 minutes
    };
  }
  
  private async logErrorToDatabase(
    notificationId: string, 
    emailError: EmailError,
    context: { userId?: string; contentType?: string; attempt?: number }
  ): Promise<void> {
    // Enhanced error logging for database (currently console-based)
    const errorLogEntry = {
      notificationId,
      errorCode: emailError.code,
      errorMessage: emailError.message,
      isRetriable: emailError.retriable,
      retryAfter: emailError.retryAfter,
      errorDetails: emailError.details,
      context: {
        userId: context.userId,
        contentType: context.contentType,
        attempt: context.attempt
      },
      timestamp: new Date().toISOString(),
      severity: this.getErrorSeverity(emailError)
    };
    
    console.log(`[Error Handler] Error logged for notification ${notificationId}:`, errorLogEntry);
    
    // Log additional debugging information
    if (emailError.details?.originalError) {
      console.log(`[Error Handler] Original error details:`, emailError.details.originalError);
    }
    
    if (emailError.details?.stack) {
      console.log(`[Error Handler] Error stack trace:`, emailError.details.stack);
    }
    
    // Future: Insert into email_error_logs table
    // await this.authDB.insertEmailErrorLog(errorLogEntry);
  }
  
  private getErrorSeverity(emailError: EmailError): 'low' | 'medium' | 'high' | 'critical' {
    switch (emailError.code) {
      case 'INVALID_EMAIL':
      case 'CIRCUIT_BREAKER':
        return 'low';
      case 'RATE_LIMIT':
      case 'NETWORK_ERROR':
        return 'medium';
      case 'AUTH_ERROR':
      case 'OAUTH_UNAUTHORIZED':
      case 'QUOTA_EXCEEDED':
        return 'high';
      case 'OAUTH_BAD_REQUEST':
      case 'GMAIL_FORBIDDEN':
        return 'critical';
      default:
        return 'medium';
    }
  }
  
  private async handleRateLimitError(notificationId: string, error: EmailError): Promise<void> {
    // Schedule retry with exponential backoff
    const retryAt = Math.floor(Date.now() / 1000) + (error.retryAfter || 900);
    console.log(`[Error Handler] Rate limit error for notification ${notificationId}`);
    console.log(`[Error Handler] Retry scheduled for: ${new Date(retryAt * 1000)}`);
    console.log(`[Error Handler] Retry delay: ${error.retryAfter || 900} seconds`);
    console.log(`[Error Handler] Rate limit error details:`, error.details);
    
    // In a real implementation, you'd update the notification status and schedule retry
    // For now, we'll just log the action with enhanced details
    console.log(`[Error Handler] Would update notification ${notificationId} with retry_after: ${retryAt}`);
  }
  
  private async handleInvalidEmailError(notificationId: string, userId?: string): Promise<void> {
    console.log(`[Error Handler] Invalid email error for notification ${notificationId}, marking as permanently failed`);
    
    // Update user email status if we have userId
    if (userId) {
      try {
        console.log(`[Error Handler] Marking user ${userId} email as bounced/invalid`);
        console.log(`[Error Handler] Would add email validation failure flag to user record`);
        console.log(`[Error Handler] Would potentially disable email notifications for this user`);
        // This is a simplified implementation - in reality you'd want an email_status column
        // await this.authDB.markEmailAsInvalid(userId);
      } catch (error) {
        console.error(`[Error Handler] Failed to update user ${userId} email status:`, {
          error: error.message,
          stack: error.stack,
          userId,
          notificationId
        });
      }
    } else {
      console.warn(`[Error Handler] No userId provided for invalid email error on notification ${notificationId}`);
    }
  }
  
  private async handleQuotaExceededError(notificationId: string, error: EmailError): Promise<void> {
    // Schedule retry for next day
    const retryAt = Math.floor(Date.now() / 1000) + (error.retryAfter || 86400);
    console.log(`[Error Handler] Quota exceeded for notification ${notificationId}`);
    console.log(`[Error Handler] Daily quota limit reached, retrying at: ${new Date(retryAt * 1000)}`);
    console.log(`[Error Handler] Quota error details:`, error.details);
    console.log(`[Error Handler] This affects all email sending until quota resets`);
    console.log(`[Error Handler] Would trigger quota monitoring alert`);
    
    // In production, you'd want to:
    // 1. Pause all email sending
    // 2. Alert administrators
    // 3. Update system status
    console.log(`[Error Handler] Would pause email service and alert administrators`);
  }
  
  private async handleAuthError(notificationId: string, error: EmailError): Promise<void> {
    console.log(`[Error Handler] Authentication error for notification ${notificationId}`);
    console.log(`[Error Handler] Auth error details:`, error.details);
    console.log(`[Error Handler] Will retry with fresh token after clearing token cache`);
    
    // Schedule retry with short delay to allow for token refresh
    const retryAt = Math.floor(Date.now() / 1000) + (error.retryAfter || 300);
    console.log(`[Error Handler] Auth error retry scheduled for: ${new Date(retryAt * 1000)}`);
    console.log(`[Error Handler] Retry delay: ${error.retryAfter || 300} seconds`);
    
    // In production, you might want to:
    // 1. Clear token cache immediately
    // 2. Verify OAuth credentials are still valid
    // 3. Alert if refresh token is expired
    console.log(`[Error Handler] Would clear Gmail auth token cache`);
    console.log(`[Error Handler] Would verify OAuth2 credentials validity`);
  }
  
  private async handleGenericError(notificationId: string, error: EmailError): Promise<void> {
    console.log(`[Error Handler] Generic error for notification ${notificationId}:`, error.message);
    console.log(`[Error Handler] Generic error details:`, {
      code: error.code,
      message: error.message,
      retriable: error.retriable,
      details: error.details
    });
    
    // Schedule retry with exponential backoff
    const retryAt = Math.floor(Date.now() / 1000) + (error.retryAfter || 300);
    console.log(`[Error Handler] Generic error retry scheduled for: ${new Date(retryAt * 1000)}`);
    console.log(`[Error Handler] Retry delay: ${error.retryAfter || 300} seconds`);
    
    // Log additional context for debugging
    if (error.details?.stack) {
      console.log(`[Error Handler] Full stack trace for generic error:`, error.details.stack);
    }
    
    console.log(`[Error Handler] Would increment generic error counter for monitoring`);
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