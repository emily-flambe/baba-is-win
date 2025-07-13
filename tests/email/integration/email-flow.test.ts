import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthDB } from '../../../src/lib/auth/db';
import { EmailNotificationService } from '../../../src/lib/email/notification-service';
import { EmailTemplateEngine } from '../../../src/lib/email/template-engine';
import { UnsubscribeService } from '../../../src/lib/email/unsubscribe-service';
import { ContentProcessor } from '../../../src/lib/email/content-processor';
import type { Env } from '../../../src/types/env';
import type { User } from '../../../src/lib/auth/types';
import type { BlogPost, Thought } from '../../../src/lib/email/template-engine';

// Mock environment
const mockEnv: Env = {
  SITE_URL: 'https://test.example.com',
  SITE_NAME: 'Test Site',
  JWT_SECRET: 'test-secret',
  GMAIL_CLIENT_ID: 'test-client-id',
  GMAIL_CLIENT_SECRET: 'test-client-secret',
  GMAIL_REFRESH_TOKEN: 'test-refresh-token',
  GMAIL_FROM_EMAIL: 'test@example.com',
  CRON_SECRET: 'test-cron-secret',
  DB: {} as any
};

// Mock database operations
const mockDB = {
  prepare: vi.fn(),
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
  exec: vi.fn()
};

// Mock AuthDB with in-memory storage
class MockAuthDB extends AuthDB {
  private users: User[] = [];
  private notifications: any[] = [];
  private tokens: any[] = [];
  private emailHistory: any[] = [];
  private unsubscribeTokens: any[] = [];

  constructor() {
    super(mockDB as any);
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null;
  }

  async getSubscribersForContentType(contentType: 'blog' | 'thought'): Promise<User[]> {
    return this.users.filter(u => 
      contentType === 'blog' ? u.emailBlogUpdates : u.emailThoughtUpdates
    );
  }

  async createEmailNotification(data: any): Promise<string> {
    const id = `notification-${Date.now()}-${Math.random()}`;
    this.notifications.push({ id, ...data, status: 'pending', createdAt: new Date() });
    return id;
  }

  async updateNotificationStatus(id: string, status: string, error?: string, messageId?: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.status = status;
      if (error) notification.errorMessage = error;
      if (messageId) notification.emailMessageId = messageId;
      notification.updatedAt = new Date();
    }
  }

  async createUnsubscribeToken(data: any): Promise<string> {
    const id = `token-${Date.now()}-${Math.random()}`;
    this.unsubscribeTokens.push({ id, ...data, createdAt: new Date() });
    return id;
  }

  async validateUnsubscribeToken(token: string): Promise<any> {
    return this.unsubscribeTokens.find(t => t.token === token) || null;
  }

  async unsubscribeUserFromAll(userId: string): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.emailBlogUpdates = false;
      user.emailThoughtUpdates = false;
      user.emailAnnouncements = false;
    }
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<void> {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      Object.assign(user, preferences);
    }
  }

  async createNotificationHistory(data: any): Promise<void> {
    this.emailHistory.push({ ...data, createdAt: new Date() });
  }

  // Helper methods for testing
  addUser(user: User): void {
    this.users.push(user);
  }

  getNotifications(): any[] {
    return this.notifications;
  }

  getEmailHistory(): any[] {
    return this.emailHistory;
  }

  getUnsubscribeTokens(): any[] {
    return this.unsubscribeTokens;
  }

  reset(): void {
    this.users = [];
    this.notifications = [];
    this.tokens = [];
    this.emailHistory = [];
    this.unsubscribeTokens = [];
  }
}

// Mock Gmail API
const mockGmailResponse = {
  sendEmail: vi.fn().mockResolvedValue('gmail-message-id-123')
};

vi.mock('../../../src/lib/email/gmail-auth', () => ({
  GmailAuth: class MockGmailAuth {
    sendEmail = mockGmailResponse.sendEmail;
  }
}));

// Mock performance monitoring
vi.mock('../../../src/lib/monitoring/email-monitor', () => ({
  EmailMonitor: class MockEmailMonitor {
    isCircuitBreakerOpen = vi.fn().mockReturnValue(false);
    logPerformanceMetric = vi.fn().mockResolvedValue(undefined);
    trackEmailEvent = vi.fn().mockResolvedValue(undefined);
    recordSuccess = vi.fn();
    recordFailure = vi.fn();
    getEmailMetrics = vi.fn().mockResolvedValue({
      total_notifications: 0,
      pending_notifications: 0,
      sent_notifications: 0,
      failed_notifications: 0
    });
    getSystemStatus = vi.fn().mockResolvedValue({
      status: 'healthy',
      circuit_breaker_open: false,
      success_rate: 1.0
    });
  }
}));

// Mock error handler
vi.mock('../../../src/lib/email/error-handler', () => ({
  EmailErrorHandler: class MockEmailErrorHandler {
    handleEmailError = vi.fn().mockResolvedValue(new Error('Test error'));
    static isRetriable = vi.fn().mockReturnValue(false);
    static getRetryDelay = vi.fn().mockReturnValue(300);
  }
}));

// Test data
const testUsers: User[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    username: 'alice',
    createdAt: new Date('2024-01-01'),
    emailBlogUpdates: true,
    emailThoughtUpdates: true,
    emailAnnouncements: true
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    username: 'bob',
    createdAt: new Date('2024-01-02'),
    emailBlogUpdates: true,
    emailThoughtUpdates: false,
    emailAnnouncements: true
  },
  {
    id: 'user-3',
    email: 'charlie@example.com',
    username: 'charlie',
    createdAt: new Date('2024-01-03'),
    emailBlogUpdates: false,
    emailThoughtUpdates: true,
    emailAnnouncements: false
  }
];

const testBlogPost: BlogPost = {
  slug: 'integration-test-blog',
  title: 'Integration Test Blog Post',
  description: 'This is a comprehensive integration test for the email notification system',
  content: 'Full content of the integration test blog post...',
  publishDate: new Date('2025-01-01'),
  tags: ['integration', 'testing', 'email'],
  filePath: '/test/blog/integration.md'
};

const testThought: Thought = {
  slug: 'integration-test-thought',
  title: 'Integration Test Thought',
  content: 'This is a comprehensive integration test thought for the email notification system',
  publishDate: new Date('2025-01-01'),
  tags: ['integration', 'testing'],
  filePath: '/test/thoughts/integration.md'
};

describe('Email Flow Integration Tests', () => {
  let mockAuthDB: MockAuthDB;
  let notificationService: EmailNotificationService;
  let templateEngine: EmailTemplateEngine;
  let unsubscribeService: UnsubscribeService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthDB = new MockAuthDB();
    notificationService = new EmailNotificationService(mockEnv, mockAuthDB);
    templateEngine = new EmailTemplateEngine(mockEnv);
    unsubscribeService = new UnsubscribeService(mockEnv, mockAuthDB);
    
    // Add test users
    testUsers.forEach(user => mockAuthDB.addUser(user));
  });

  describe('Complete Blog Notification Flow', () => {
    it('should process complete blog notification flow successfully', async () => {
      // Execute the complete flow
      await notificationService.sendBlogNotification(testBlogPost);

      // Verify notifications were created
      const notifications = mockAuthDB.getNotifications();
      expect(notifications).toHaveLength(2); // Only users with blog updates enabled
      
      // Verify notification details
      const blogNotifications = notifications.filter(n => n.contentType === 'blog');
      expect(blogNotifications).toHaveLength(2);
      
      blogNotifications.forEach(notification => {
        expect(notification.contentTitle).toBe('Integration Test Blog Post');
        expect(notification.contentUrl).toBe('https://test.example.com/blog/integration-test-blog');
        expect(notification.status).toBe('sent');
        expect(notification.emailMessageId).toBe('gmail-message-id-123');
      });

      // Verify Gmail API was called correctly
      expect(mockGmailResponse.sendEmail).toHaveBeenCalledTimes(2);
      expect(mockGmailResponse.sendEmail).toHaveBeenCalledWith(
        'alice@example.com',
        'New Blog Post: Integration Test Blog Post',
        expect.stringContaining('Integration Test Blog Post'),
        expect.stringContaining('Integration Test Blog Post')
      );
    });

    it('should handle blog notifications with unsubscribe flow', async () => {
      await notificationService.sendBlogNotification(testBlogPost);

      // Get unsubscribe tokens
      const tokens = mockAuthDB.getUnsubscribeTokens();
      expect(tokens.length).toBeGreaterThan(0);

      // Test unsubscribe flow
      const token = tokens[0];
      const result = await unsubscribeService.processUnsubscribe(token.token, '192.168.1.1', 'Test Browser');

      expect(result.success).toBe(true);
      expect(result.userId).toBe(token.userId);

      // Verify user was unsubscribed
      const user = await mockAuthDB.getUserById(token.userId);
      expect(user?.emailBlogUpdates).toBe(false);
      expect(user?.emailThoughtUpdates).toBe(false);
      expect(user?.emailAnnouncements).toBe(false);

      // Verify history was recorded
      const history = mockAuthDB.getEmailHistory();
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('unsubscribe_all');
    });
  });

  describe('Complete Thought Notification Flow', () => {
    it('should process complete thought notification flow successfully', async () => {
      await notificationService.sendThoughtNotification(testThought);

      // Verify notifications were created
      const notifications = mockAuthDB.getNotifications();
      expect(notifications).toHaveLength(2); // alice and charlie have thought updates enabled
      
      // Verify notification details
      const thoughtNotifications = notifications.filter(n => n.contentType === 'thought');
      expect(thoughtNotifications).toHaveLength(2);
      
      thoughtNotifications.forEach(notification => {
        expect(notification.contentTitle).toBe('Integration Test Thought');
        expect(notification.contentUrl).toBe('https://test.example.com/thoughts/integration-test-thought');
        expect(notification.status).toBe('sent');
        expect(notification.emailMessageId).toBe('gmail-message-id-123');
      });

      expect(mockGmailResponse.sendEmail).toHaveBeenCalledTimes(2);
    });

    it('should handle partial unsubscribe flow', async () => {
      await notificationService.sendThoughtNotification(testThought);

      // Get unsubscribe tokens
      const tokens = mockAuthDB.getUnsubscribeTokens();
      const token = tokens[0];

      // Test partial unsubscribe
      const newPreferences = {
        emailBlogUpdates: true,
        emailThoughtUpdates: false,
        emailAnnouncements: true,
        emailFrequency: 'weekly'
      };

      const result = await unsubscribeService.processPartialUnsubscribe(
        token.token,
        newPreferences,
        '192.168.1.1',
        'Test Browser'
      );

      expect(result.success).toBe(true);

      // Verify preferences were updated
      const user = await mockAuthDB.getUserById(token.userId);
      expect(user?.emailBlogUpdates).toBe(true);
      expect(user?.emailThoughtUpdates).toBe(false);
      expect(user?.emailAnnouncements).toBe(true);

      // Verify history was recorded
      const history = mockAuthDB.getEmailHistory();
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('update_preferences');
    });
  });

  describe('Template Rendering Integration', () => {
    it('should render blog notification templates correctly', async () => {
      const user = testUsers[0];
      const unsubscribeUrl = await unsubscribeService.generateUnsubscribeUrl(user.id);
      
      const result = await templateEngine.renderBlogNotification(user, testBlogPost, unsubscribeUrl);

      expect(result.subject).toBe('New Blog Post: Integration Test Blog Post');
      expect(result.html).toContain('Integration Test Blog Post');
      expect(result.html).toContain('alice');
      expect(result.html).toContain('integration, testing, email');
      expect(result.html).toContain('https://test.example.com/blog/integration-test-blog');
      expect(result.html).toContain(unsubscribeUrl);
      
      expect(result.text).toContain('Integration Test Blog Post');
      expect(result.text).toContain('alice');
      expect(result.text).toContain(unsubscribeUrl);
    });

    it('should render thought notification templates correctly', async () => {
      const user = testUsers[0];
      const unsubscribeUrl = await unsubscribeService.generateUnsubscribeUrl(user.id);
      
      const result = await templateEngine.renderThoughtNotification(user, testThought, unsubscribeUrl);

      expect(result.subject).toBe('New Thought: Integration Test Thought');
      expect(result.html).toContain('Integration Test Thought');
      expect(result.html).toContain('alice');
      expect(result.html).toContain('https://test.example.com/thoughts/integration-test-thought');
      expect(result.html).toContain(unsubscribeUrl);
      
      expect(result.text).toContain('Integration Test Thought');
      expect(result.text).toContain('alice');
      expect(result.text).toContain(unsubscribeUrl);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle Gmail API failures gracefully', async () => {
      // Mock Gmail API to fail
      mockGmailResponse.sendEmail.mockRejectedValue(new Error('Gmail API Error'));

      await notificationService.sendBlogNotification(testBlogPost);

      // Verify notifications were marked as failed
      const notifications = mockAuthDB.getNotifications();
      notifications.forEach(notification => {
        expect(notification.status).toBe('failed');
        expect(notification.errorMessage).toBe('Test error');
      });
    });

    it('should handle invalid unsubscribe tokens', async () => {
      const result = await unsubscribeService.processUnsubscribe('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired unsubscribe token');
    });

    it('should handle missing user gracefully', async () => {
      // Remove a user after creating notifications
      mockAuthDB.users = mockAuthDB.users.filter(u => u.id !== 'user-1');

      await notificationService.sendBlogNotification(testBlogPost);

      // Should handle missing user gracefully
      const notifications = mockAuthDB.getNotifications();
      const failedNotifications = notifications.filter(n => n.status === 'failed');
      expect(failedNotifications.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large subscriber lists efficiently', async () => {
      // Add many users
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i + 100}`,
        email: `user${i + 100}@example.com`,
        username: `user${i + 100}`,
        createdAt: new Date(),
        emailBlogUpdates: true,
        emailThoughtUpdates: true,
        emailAnnouncements: true
      }));

      manyUsers.forEach(user => mockAuthDB.addUser(user));

      const startTime = Date.now();
      await notificationService.sendBlogNotification(testBlogPost);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds

      // Should have processed all notifications
      const notifications = mockAuthDB.getNotifications();
      expect(notifications.length).toBe(102); // 100 new + 2 original blog subscribers
    });

    it('should respect rate limiting', async () => {
      const users = Array.from({ length: 25 }, (_, i) => ({
        id: `user-rate-${i}`,
        email: `rate${i}@example.com`,
        username: `rate${i}`,
        createdAt: new Date(),
        emailBlogUpdates: true,
        emailThoughtUpdates: true,
        emailAnnouncements: true
      }));

      users.forEach(user => mockAuthDB.addUser(user));

      const timeoutSpy = vi.spyOn(global, 'setTimeout');
      
      await notificationService.sendBlogNotification(testBlogPost);

      // Should have called setTimeout for rate limiting
      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency throughout the flow', async () => {
      await notificationService.sendBlogNotification(testBlogPost);

      // Verify all data is consistent
      const notifications = mockAuthDB.getNotifications();
      const tokens = mockAuthDB.getUnsubscribeTokens();
      
      // Each notification should have corresponding unsubscribe token
      expect(tokens.length).toBe(notifications.length);
      
      // All notifications should be for the same content
      notifications.forEach(notification => {
        expect(notification.contentId).toBe(testBlogPost.slug);
        expect(notification.contentType).toBe('blog');
        expect(notification.notificationType).toBe('new_content');
      });
    });

    it('should handle concurrent operations safely', async () => {
      // Simulate concurrent blog and thought notifications
      const promises = [
        notificationService.sendBlogNotification(testBlogPost),
        notificationService.sendThoughtNotification(testThought)
      ];

      await Promise.all(promises);

      const notifications = mockAuthDB.getNotifications();
      const blogNotifications = notifications.filter(n => n.contentType === 'blog');
      const thoughtNotifications = notifications.filter(n => n.contentType === 'thought');

      expect(blogNotifications.length).toBe(2);
      expect(thoughtNotifications.length).toBe(2);
      
      // All notifications should be processed successfully
      notifications.forEach(notification => {
        expect(notification.status).toBe('sent');
        expect(notification.emailMessageId).toBe('gmail-message-id-123');
      });
    });
  });
});