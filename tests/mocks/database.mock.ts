import { vi } from 'vitest';
import type { User, UnsubscribeToken } from '../../src/lib/auth/types';

export interface MockEmailNotification {
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

export interface MockEmailHistory {
  id: string;
  userId: string;
  notificationId: string;
  action: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export class MockDatabase {
  private users: Map<string, User> = new Map();
  private notifications: Map<string, MockEmailNotification> = new Map();
  private tokens: Map<string, UnsubscribeToken> = new Map();
  private history: MockEmailHistory[] = [];
  private idCounter = 1;
  private queryDelay = 0;
  
  setQueryDelay(ms: number) {
    this.queryDelay = ms;
  }
  
  private async simulateDelay() {
    if (this.queryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.queryDelay));
    }
  }
  
  private generateId(): string {
    return `mock-id-${this.idCounter++}`;
  }
  
  async addUser(user: User): Promise<void> {
    await this.simulateDelay();
    this.users.set(user.id, { ...user });
  }
  
  async getUserById(id: string): Promise<User | null> {
    await this.simulateDelay();
    return this.users.get(id) || null;
  }
  
  async getSubscribersForContentType(contentType: 'blog' | 'thought'): Promise<User[]> {
    await this.simulateDelay();
    return Array.from(this.users.values()).filter(user => 
      contentType === 'blog' ? user.emailBlogUpdates : user.emailThoughtUpdates
    );
  }
  
  async updateUserPreferences(userId: string, preferences: Partial<User>): Promise<void> {
    await this.simulateDelay();
    const user = this.users.get(userId);
    if (user) {
      Object.assign(user, preferences);
    }
  }
  
  async unsubscribeUserFromAll(userId: string): Promise<void> {
    await this.simulateDelay();
    const user = this.users.get(userId);
    if (user) {
      user.emailBlogUpdates = false;
      user.emailThoughtUpdates = false;
      user.emailAnnouncements = false;
    }
  }
  
  async createEmailNotification(data: Omit<MockEmailNotification, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.simulateDelay();
    const id = this.generateId();
    const notification: MockEmailNotification = {
      id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.notifications.set(id, notification);
    return id;
  }
  
  async getNotificationById(id: string): Promise<MockEmailNotification | null> {
    await this.simulateDelay();
    return this.notifications.get(id) || null;
  }
  
  async updateNotificationStatus(
    id: string,
    status: 'pending' | 'sent' | 'failed',
    errorMessage?: string,
    emailMessageId?: string
  ): Promise<void> {
    await this.simulateDelay();
    const notification = this.notifications.get(id);
    if (notification) {
      notification.status = status;
      notification.updatedAt = new Date();
      if (errorMessage) notification.errorMessage = errorMessage;
      if (emailMessageId) notification.emailMessageId = emailMessageId;
    }
  }
  
  async getPendingNotifications(): Promise<MockEmailNotification[]> {
    await this.simulateDelay();
    return Array.from(this.notifications.values()).filter(n => n.status === 'pending');
  }
  
  async getFailedNotifications(): Promise<MockEmailNotification[]> {
    await this.simulateDelay();
    return Array.from(this.notifications.values()).filter(n => n.status === 'failed');
  }
  
  async createUnsubscribeToken(data: Omit<UnsubscribeToken, 'id' | 'createdAt'>): Promise<string> {
    await this.simulateDelay();
    const id = this.generateId();
    const token: UnsubscribeToken = {
      id,
      ...data,
      createdAt: new Date()
    };
    this.tokens.set(data.token, token);
    return id;
  }
  
  async validateUnsubscribeToken(token: string): Promise<UnsubscribeToken | null> {
    await this.simulateDelay();
    const tokenRecord = this.tokens.get(token);
    if (!tokenRecord) return null;
    
    // Check if token is expired
    const now = new Date();
    if (tokenRecord.expiresAt && now > tokenRecord.expiresAt) {
      return null;
    }
    
    return tokenRecord;
  }
  
  async useUnsubscribeToken(token: string): Promise<void> {
    await this.simulateDelay();
    // In a real implementation, this would mark the token as used
    // For testing, we'll just ensure it exists
    const tokenRecord = this.tokens.get(token);
    if (tokenRecord) {
      tokenRecord.expiresAt = new Date(); // Mark as expired
    }
  }
  
  async createNotificationHistory(data: Omit<MockEmailHistory, 'id' | 'createdAt'>): Promise<void> {
    await this.simulateDelay();
    const history: MockEmailHistory = {
      id: this.generateId(),
      ...data,
      createdAt: new Date()
    };
    this.history.push(history);
  }
  
  async getNotificationHistory(userId?: string): Promise<MockEmailHistory[]> {
    await this.simulateDelay();
    if (userId) {
      return this.history.filter(h => h.userId === userId);
    }
    return [...this.history];
  }
  
  async getEmailMetrics(): Promise<{
    total_notifications: number;
    pending_notifications: number;
    sent_notifications: number;
    failed_notifications: number;
    total_subscribers: number;
    blog_subscribers: number;
    thought_subscribers: number;
  }> {
    await this.simulateDelay();
    const notifications = Array.from(this.notifications.values());
    const users = Array.from(this.users.values());
    
    return {
      total_notifications: notifications.length,
      pending_notifications: notifications.filter(n => n.status === 'pending').length,
      sent_notifications: notifications.filter(n => n.status === 'sent').length,
      failed_notifications: notifications.filter(n => n.status === 'failed').length,
      total_subscribers: users.length,
      blog_subscribers: users.filter(u => u.emailBlogUpdates).length,
      thought_subscribers: users.filter(u => u.emailThoughtUpdates).length
    };
  }
  
  async logPerformanceMetric(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ): Promise<void> {
    await this.simulateDelay();
    // In testing, we just log to console
    console.log(`Performance metric: ${operation} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILURE'}`, metadata);
  }
  
  async trackEmailEvent(
    eventType: string,
    notificationId: string,
    userId: string,
    metadata?: any
  ): Promise<void> {
    await this.simulateDelay();
    console.log(`Email event: ${eventType} - ${notificationId} - ${userId}`, metadata);
  }
  
  // Test utilities
  reset(): void {
    this.users.clear();
    this.notifications.clear();
    this.tokens.clear();
    this.history = [];
    this.idCounter = 1;
  }
  
  addUsers(users: User[]): void {
    users.forEach(user => this.users.set(user.id, { ...user }));
  }
  
  getUsers(): User[] {
    return Array.from(this.users.values());
  }
  
  getNotifications(): MockEmailNotification[] {
    return Array.from(this.notifications.values());
  }
  
  getTokens(): UnsubscribeToken[] {
    return Array.from(this.tokens.values());
  }
  
  getHistory(): MockEmailHistory[] {
    return [...this.history];
  }
  
  // Simulate database errors
  simulateError(operation: string, error: Error): void {
    const originalMethod = (this as any)[operation];
    if (originalMethod) {
      (this as any)[operation] = vi.fn().mockRejectedValue(error);
    }
  }
  
  restoreMethod(operation: string): void {
    // In a real implementation, this would restore the original method
    // For testing, we'll just reset the mock
    if ((this as any)[operation]) {
      (this as any)[operation] = vi.fn();
    }
  }
}

export const createDatabaseMock = () => {
  return new MockDatabase();
};