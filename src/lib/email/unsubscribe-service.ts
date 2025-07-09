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
  
  async processUnsubscribe(token: string, ipAddress?: string, userAgent?: string): Promise<string> {
    // Validate token
    const tokenData = await this.validateUnsubscribeToken(token);
    if (!tokenData) {
      throw new Error('Invalid or expired unsubscribe token');
    }
    
    // Mark token as used
    await this.useUnsubscribeToken(tokenData.id, ipAddress, userAgent);
    
    // Unsubscribe user from all emails
    await this.unsubscribeUserFromAll(tokenData.userId);
    
    // Log the unsubscribe action
    await this.logUnsubscribeAction(tokenData.userId, tokenData.tokenType, ipAddress, userAgent);
    
    return tokenData.userId;
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
    const now = Date.now();
    const id = crypto.randomUUID();
    
    // For now, we'll use a simple approach without extending the database
    // In a production system, you'd want to add an unsubscribe_tokens table
    // For this implementation, we'll store it as a simple key-value in a mock way
    
    // This is a simplified implementation - in reality you'd want a proper database table
    console.log(`Creating unsubscribe token for user ${params.userId}: ${params.token}`);
  }
  
  private async validateUnsubscribeToken(token: string): Promise<UnsubscribeToken | null> {
    // In a real implementation, this would query the database
    // For now, we'll return a mock implementation
    
    // This is a simplified validation - in reality you'd query the database
    console.log(`Validating unsubscribe token: ${token}`);
    
    // Mock return for now - in production this would be a database query
    return {
      id: crypto.randomUUID(),
      userId: 'mock-user-id',
      token,
      tokenType: 'one_click',
      expiresAt: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
      createdAt: new Date()
    };
  }
  
  private async useUnsubscribeToken(tokenId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    // Mark token as used in database
    console.log(`Marking token ${tokenId} as used`);
  }
  
  private async unsubscribeUserFromAll(userId: string): Promise<void> {
    // Update user preferences to disable all email notifications
    await this.authDB.db.prepare(
      'UPDATE users SET email_blog_updates = 0, email_thought_updates = 0, email_announcements = 0, updated_at = ? WHERE id = ?'
    ).bind(Date.now(), userId).run();
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