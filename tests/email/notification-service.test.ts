import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailNotificationService } from '../../src/lib/email/notification-service';
import { AuthDB } from '../../src/lib/auth/db';
import type { Env } from '../../src/types/env';
import type { User } from '../../src/lib/auth/types';
import type { BlogPost, Thought } from '../../src/lib/email/template-engine';

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

// Mock AuthDB
const mockAuthDB = {
  getSubscribersForContentType: vi.fn(),
  createEmailNotification: vi.fn(),
  updateNotificationStatus: vi.fn(),
  getUserById: vi.fn(),
  createUnsubscribeToken: vi.fn(),
  logPerformanceMetric: vi.fn(),
  trackEmailEvent: vi.fn(),
  getEmailMetrics: vi.fn()
} as unknown as AuthDB;

// Mock users
const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'test1@example.com',
    username: 'testuser1',
    createdAt: new Date(),
    emailBlogUpdates: true,
    emailThoughtUpdates: true,
    emailAnnouncements: true
  },
  {
    id: 'user-2',
    email: 'test2@example.com',
    username: 'testuser2',
    createdAt: new Date(),
    emailBlogUpdates: true,
    emailThoughtUpdates: false,
    emailAnnouncements: true
  }
];

// Mock blog post
const mockBlogPost: BlogPost = {
  slug: 'test-blog-post',
  title: 'Test Blog Post',
  description: 'This is a test blog post description',
  content: 'This is the content of the test blog post',
  publishDate: new Date('2025-01-01'),
  tags: ['test', 'blog'],
  filePath: '/path/to/blog/post.md'
};

// Mock thought
const mockThought: Thought = {
  slug: 'test-thought',
  title: 'Test Thought',
  content: 'This is a test thought content',
  publishDate: new Date('2025-01-01'),
  tags: ['test', 'thought'],
  filePath: '/path/to/thought.md'
};

// Mock Gmail API
vi.mock('../../src/lib/email/gmail-auth', () => ({
  GmailAuth: class MockGmailAuth {
    sendEmail = vi.fn().mockResolvedValue('mock-message-id');
  }
}));

// Mock template engine
vi.mock('../../src/lib/email/template-engine', () => ({
  EmailTemplateEngine: class MockEmailTemplateEngine {
    renderBlogNotification = vi.fn().mockResolvedValue({
      subject: 'New Blog Post: Test Blog Post',
      html: '<html>Mock HTML</html>',
      text: 'Mock Text'
    });
    
    renderThoughtNotification = vi.fn().mockResolvedValue({
      subject: 'New Thought: Test Thought',
      html: '<html>Mock HTML</html>',
      text: 'Mock Text'
    });
  }
}));

// Mock unsubscribe service
vi.mock('../../src/lib/email/unsubscribe-service', () => ({
  UnsubscribeService: class MockUnsubscribeService {
    generateUnsubscribeUrl = vi.fn().mockResolvedValue('https://test.example.com/unsubscribe?token=mock-token');
  }
}));

// Mock error handler
vi.mock('../../src/lib/email/error-handler', () => ({
  EmailErrorHandler: class MockEmailErrorHandler {
    handleEmailError = vi.fn().mockResolvedValue(new Error('Mock error'));
    static isRetriable = vi.fn().mockReturnValue(false);
    static getRetryDelay = vi.fn().mockReturnValue(300);
  }
}));

// Mock monitor
vi.mock('../../src/lib/monitoring/email-monitor', () => ({
  EmailMonitor: class MockEmailMonitor {
    isCircuitBreakerOpen = vi.fn().mockReturnValue(false);
    logPerformanceMetric = vi.fn().mockResolvedValue(undefined);
    trackEmailEvent = vi.fn().mockResolvedValue(undefined);
    recordSuccess = vi.fn();
    recordFailure = vi.fn();
    getEmailMetrics = vi.fn().mockResolvedValue({
      total_notifications: 100,
      pending_notifications: 10,
      sent_notifications: 80,
      failed_notifications: 10
    });
    getSystemStatus = vi.fn().mockResolvedValue({
      status: 'healthy',
      circuit_breaker_open: false,
      success_rate: 0.9
    });
  }
}));

describe('EmailNotificationService', () => {
  let notificationService: EmailNotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationService = new EmailNotificationService(mockEnv, mockAuthDB);
  });

  describe('Blog Notification Processing', () => {
    it('should process blog notifications successfully', async () => {
      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue(mockUsers);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockResolvedValue(mockUsers[0]);
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      await notificationService.sendBlogNotification(mockBlogPost);

      expect(mockAuthDB.getSubscribersForContentType).toHaveBeenCalledWith('blog');
      expect(mockAuthDB.createEmailNotification).toHaveBeenCalledTimes(2);
      expect(mockAuthDB.updateNotificationStatus).toHaveBeenCalledTimes(2);
    });

    it('should handle no blog subscribers gracefully', async () => {
      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue([]);

      await notificationService.sendBlogNotification(mockBlogPost);

      expect(mockAuthDB.getSubscribersForContentType).toHaveBeenCalledWith('blog');
      expect(mockAuthDB.createEmailNotification).not.toHaveBeenCalled();
    });

    it('should process notifications in batches', async () => {
      // Create 25 mock users to test batching
      const manyUsers = Array.from({ length: 25 }, (_, i) => ({
        id: `user-${i}`,
        email: `test${i}@example.com`,
        username: `testuser${i}`,
        createdAt: new Date(),
        emailBlogUpdates: true,
        emailThoughtUpdates: true,
        emailAnnouncements: true
      }));

      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue(manyUsers);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockImplementation((id) => 
        Promise.resolve(manyUsers.find(u => u.id === id))
      );
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      const processSpy = vi.spyOn(console, 'log');

      await notificationService.sendBlogNotification(mockBlogPost);

      // Should log batch processing
      expect(processSpy).toHaveBeenCalledWith('Processing batch 1/3');
      expect(processSpy).toHaveBeenCalledWith('Processing batch 2/3');
      expect(processSpy).toHaveBeenCalledWith('Processing batch 3/3');
      expect(processSpy).toHaveBeenCalledWith('Completed processing 25 notifications');
    });
  });

  describe('Thought Notification Processing', () => {
    it('should process thought notifications successfully', async () => {
      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue(mockUsers);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockResolvedValue(mockUsers[0]);
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      await notificationService.sendThoughtNotification(mockThought);

      expect(mockAuthDB.getSubscribersForContentType).toHaveBeenCalledWith('thought');
      expect(mockAuthDB.createEmailNotification).toHaveBeenCalledTimes(2);
      expect(mockAuthDB.updateNotificationStatus).toHaveBeenCalledTimes(2);
    });

    it('should handle no thought subscribers gracefully', async () => {
      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue([]);

      await notificationService.sendThoughtNotification(mockThought);

      expect(mockAuthDB.getSubscribersForContentType).toHaveBeenCalledWith('thought');
      expect(mockAuthDB.createEmailNotification).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle user not found errors', async () => {
      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue([mockUsers[0]]);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockResolvedValue(null);
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      await notificationService.sendBlogNotification(mockBlogPost);

      expect(mockAuthDB.updateNotificationStatus).toHaveBeenCalledWith(
        'notification-123',
        'failed',
        'Mock error'
      );
    });

    it('should handle circuit breaker open state', async () => {
      // Mock circuit breaker open
      const mockMonitor = (notificationService as any).monitor;
      mockMonitor.isCircuitBreakerOpen = vi.fn().mockReturnValue(true);

      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue([mockUsers[0]]);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockResolvedValue(mockUsers[0]);
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      await notificationService.sendBlogNotification(mockBlogPost);

      expect(mockAuthDB.updateNotificationStatus).toHaveBeenCalledWith(
        'notification-123',
        'failed',
        'Mock error'
      );
    });

    it('should handle email sending failures', async () => {
      const mockGmailAuth = (notificationService as any).gmailAuth;
      mockGmailAuth.sendEmail = vi.fn().mockRejectedValue(new Error('Gmail API error'));

      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue([mockUsers[0]]);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockResolvedValue(mockUsers[0]);
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      await notificationService.sendBlogNotification(mockBlogPost);

      expect(mockAuthDB.updateNotificationStatus).toHaveBeenCalledWith(
        'notification-123',
        'failed',
        'Mock error'
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track successful email metrics', async () => {
      const mockMonitor = (notificationService as any).monitor;
      
      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue([mockUsers[0]]);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockResolvedValue(mockUsers[0]);
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      await notificationService.sendBlogNotification(mockBlogPost);

      expect(mockMonitor.logPerformanceMetric).toHaveBeenCalledWith(
        'send_notification',
        expect.any(Number),
        true,
        expect.objectContaining({
          notification_id: 'notification-123',
          content_type: 'blog',
          user_id: 'user-1'
        })
      );
      expect(mockMonitor.trackEmailEvent).toHaveBeenCalledWith('sent', 'notification-123', 'user-1');
      expect(mockMonitor.recordSuccess).toHaveBeenCalled();
    });

    it('should track failed email metrics', async () => {
      const mockMonitor = (notificationService as any).monitor;
      const mockGmailAuth = (notificationService as any).gmailAuth;
      mockGmailAuth.sendEmail = vi.fn().mockRejectedValue(new Error('Gmail API error'));

      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue([mockUsers[0]]);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockResolvedValue(mockUsers[0]);
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      await notificationService.sendBlogNotification(mockBlogPost);

      expect(mockMonitor.logPerformanceMetric).toHaveBeenCalledWith(
        'send_notification',
        expect.any(Number),
        false,
        expect.objectContaining({
          notification_id: 'notification-123',
          content_type: 'blog',
          user_id: 'user-1',
          error: 'Gmail API error'
        })
      );
      expect(mockMonitor.recordFailure).toHaveBeenCalled();
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should return notification statistics', async () => {
      const stats = await notificationService.getNotificationStats();

      expect(stats).toEqual({
        total: 100,
        pending: 10,
        sent: 80,
        failed: 10,
        retryable: 0
      });
    });

    it('should return system status', async () => {
      const status = await notificationService.getSystemStatus();

      expect(status).toEqual({
        status: 'healthy',
        circuit_breaker_open: false,
        success_rate: 0.9
      });
    });
  });

  describe('Batch Processing', () => {
    it('should respect batch size limits', async () => {
      const users = Array.from({ length: 35 }, (_, i) => ({
        id: `user-${i}`,
        email: `test${i}@example.com`,
        username: `testuser${i}`,
        createdAt: new Date(),
        emailBlogUpdates: true,
        emailThoughtUpdates: true,
        emailAnnouncements: true
      }));

      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue(users);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockImplementation((id) => 
        Promise.resolve(users.find(u => u.id === id))
      );
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      const timeoutSpy = vi.spyOn(global, 'setTimeout');

      await notificationService.sendBlogNotification(mockBlogPost);

      // Should have called setTimeout for rate limiting between batches
      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });
  });

  describe('Content URL Generation', () => {
    it('should generate correct blog post URLs', async () => {
      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue([mockUsers[0]]);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockResolvedValue(mockUsers[0]);
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      await notificationService.sendBlogNotification(mockBlogPost);

      expect(mockAuthDB.createEmailNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          contentUrl: 'https://test.example.com/blog/test-blog-post'
        })
      );
    });

    it('should generate correct thought URLs', async () => {
      (mockAuthDB.getSubscribersForContentType as any).mockResolvedValue([mockUsers[0]]);
      (mockAuthDB.createEmailNotification as any).mockResolvedValue('notification-123');
      (mockAuthDB.getUserById as any).mockResolvedValue(mockUsers[0]);
      (mockAuthDB.updateNotificationStatus as any).mockResolvedValue(undefined);

      await notificationService.sendThoughtNotification(mockThought);

      expect(mockAuthDB.createEmailNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          contentUrl: 'https://test.example.com/thoughts/test-thought'
        })
      );
    });
  });
});