import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';

export interface UnsubscribeToken {
  id: string;
  userId: string;
  token: string;
  tokenType: 'one_click' | 'list_unsubscribe' | 'manual';
  expiresAt: number;
  usedAt?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class UnsubscribeService {
  constructor(
    private env: Env,
    private authDB: AuthDB
  ) {}
  
  async generateUnsubscribeUrl(userId: string): Promise<string> {
    // Generate secure token
    const token = this.generateSecureToken();
    const expiresAt = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
    
    // Store token in database (we'll implement this in the AuthDB extension)
    await this.createUnsubscribeToken({
      userId,
      token,
      tokenType: 'one_click',
      expiresAt
    });
    
    return `https://www.emilycogsdill.com/unsubscribe?token=${token}`;
  }
  
  async processUnsubscribe(token: string, ipAddress?: string, userAgent?: string): Promise<{ success: boolean; error?: string; userId?: string }> {
    try {
      // Validate token
      const tokenData = await this.authDB.validateUnsubscribeToken(token);
      if (!tokenData) {
        return { success: false, error: 'Invalid or expired unsubscribe token' };
      }
      
      // Mark token as used to prevent reuse
      await this.authDB.useUnsubscribeToken(tokenData.id, ipAddress, userAgent);
      
      // Unsubscribe user from all emails
      await this.authDB.unsubscribeUserFromAll(tokenData.userId);
      
      // Log the unsubscribe action
      await this.logUnsubscribeAction(tokenData.userId, tokenData.tokenType, ipAddress, userAgent, 'unsubscribe_all');
      
      return { success: true, userId: tokenData.userId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  async processPartialUnsubscribe(
    token: string, 
    preferences: {
      emailBlogUpdates: boolean;
      emailThoughtUpdates: boolean;
      emailAnnouncements: boolean;
      emailFrequency: string;
    },
    ipAddress?: string, 
    userAgent?: string
  ): Promise<{ success: boolean; error?: string; userId?: string }> {
    try {
      // Validate token
      const tokenData = await this.authDB.validateUnsubscribeToken(token);
      if (!tokenData) {
        return { success: false, error: 'Invalid or expired unsubscribe token' };
      }
      
      // Mark token as used to prevent reuse
      await this.authDB.useUnsubscribeToken(tokenData.id, ipAddress, userAgent);
      
      // Update user preferences
      await this.authDB.updateUserPreferences(tokenData.userId, preferences);
      
      // Log the preference update action
      await this.logUnsubscribeAction(tokenData.userId, tokenData.tokenType, ipAddress, userAgent, 'update_preferences', preferences);
      
      return { success: true, userId: tokenData.userId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  private generateSecureToken(): string {
    // Generate cryptographically secure token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  private async createUnsubscribeToken(params: {
    userId: string;
    token: string;
    tokenType: 'one_click' | 'list_unsubscribe' | 'manual';
    expiresAt: number;
  }): Promise<void> {
    await this.authDB.createUnsubscribeToken({
      userId: params.userId,
      token: params.token,
      tokenType: params.tokenType,
      expiresAt: params.expiresAt
    });
  }
  
  private async validateUnsubscribeToken(token: string): Promise<UnsubscribeToken | null> {
    return await this.authDB.validateUnsubscribeToken(token);
  }
  
  private async useUnsubscribeToken(tokenId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.authDB.useUnsubscribeToken(tokenId, ipAddress, userAgent);
  }
  
  private async unsubscribeUserFromAll(userId: string): Promise<void> {
    await this.authDB.unsubscribeUserFromAll(userId);
  }
  
  private async logUnsubscribeAction(
    userId: string, 
    tokenType: string, 
    ipAddress?: string, 
    userAgent?: string,
    action: string = 'unsubscribe',
    details?: any
  ): Promise<void> {
    // Log the unsubscribe action for auditing
    const logData = {
      userId,
      tokenType,
      action,
      ipAddress,
      userAgent,
      details,
      timestamp: new Date().toISOString()
    };
    
    console.log(`User ${userId} performed ${action} via ${tokenType}`, logData);
    
    // Note: Database audit trail disabled - email_notification_history table removed in migration 0013
  }
  
  // Helper method to generate List-Unsubscribe header
  generateListUnsubscribeHeader(userId: string): string {
    const token = this.generateSecureToken();
    const unsubscribeUrl = `https://www.emilycogsdill.com/unsubscribe?token=${token}`;
    
    // Store token for List-Unsubscribe (simplified implementation)
    this.createUnsubscribeToken({
      userId,
      token,
      tokenType: 'list_unsubscribe',
      expiresAt: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
    });
    
    return `<${unsubscribeUrl}>, <mailto:unsubscribe@www.emilycogsdill.com?subject=unsubscribe>`;
  }
}