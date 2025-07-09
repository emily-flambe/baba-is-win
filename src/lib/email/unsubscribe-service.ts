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
    
    return `${this.env.SITE_URL}/unsubscribe?token=${token}`;
  }
  
  async processUnsubscribe(token: string, ipAddress?: string, userAgent?: string): Promise<{ success: boolean; error?: string; userId?: string }> {
    try {
      // Validate token
      const tokenData = await this.authDB.validateUnsubscribeToken(token);
      if (!tokenData) {
        return { success: false, error: 'Invalid or expired unsubscribe token' };
      }
      
      // Mark token as used
      await this.authDB.useUnsubscribeToken(tokenData.id, ipAddress, userAgent);
      
      // Unsubscribe user from all emails
      await this.authDB.unsubscribeUserFromAll(tokenData.userId);
      
      // Log the unsubscribe action
      await this.logUnsubscribeAction(tokenData.userId, tokenData.tokenType, ipAddress, userAgent);
      
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
    userAgent?: string
  ): Promise<void> {
    // Log the unsubscribe action for auditing
    console.log(`User ${userId} unsubscribed via ${tokenType}`, {
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }
  
  // Helper method to generate List-Unsubscribe header
  generateListUnsubscribeHeader(userId: string): string {
    const token = this.generateSecureToken();
    const unsubscribeUrl = `${this.env.SITE_URL}/unsubscribe?token=${token}`;
    
    // Store token for List-Unsubscribe (simplified implementation)
    this.createUnsubscribeToken({
      userId,
      token,
      tokenType: 'list_unsubscribe',
      expiresAt: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60)
    });
    
    return `<${unsubscribeUrl}>, <mailto:unsubscribe@${this.env.SITE_URL.replace('https://', '')}?subject=unsubscribe>`;
  }
}