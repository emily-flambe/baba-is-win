import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailNotificationService } from '../../../src/lib/email/notification-service';
import { EmailTemplateEngine } from '../../../src/lib/email/template-engine';
import { AuthDB } from '../../../src/lib/auth/db';
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

// Performance metrics tracking
interface PerformanceMetrics {
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
  memoryUsage: number;
  operations: number;
}

class PerformanceTracker {
  private metrics: number[] = [];
  private startTime: number = 0;
  private startMemory: number = 0;

  start(): void {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  end(): void {
    const endTime = performance.now();
    const duration = endTime - this.startTime;
    this.metrics.push(duration);
  }

  getMetrics(): PerformanceMetrics {
    const totalTime = this.metrics.reduce((sum, time) => sum + time, 0);
    const avgTime = totalTime / this.metrics.length;
    const minTime = Math.min(...this.metrics);
    const maxTime = Math.max(...this.metrics);
    const throughput = this.metrics.length / (totalTime / 1000);
    const memoryUsage = process.memoryUsage().heapUsed - this.startMemory;

    return {
      totalTime,
      avgTime,
      minTime,
      maxTime,
      throughput,
      memoryUsage,
      operations: this.metrics.length
    };
  }

  reset(): void {
    this.metrics = [];
    this.startTime = 0;
    this.startMemory = 0;
  }
}

// Mock AuthDB with performance tracking
class MockAuthDB extends AuthDB {
  private users: User[] = [];
  private notifications: any[] = [];
  private performanceTracker = new PerformanceTracker();

  constructor() {
    super({} as any);
  }

  async getUserById(id: string): Promise<User | null> {
    this.performanceTracker.start();
    const user = this.users.find(u => u.id === id) || null;
    this.performanceTracker.end();
    return user;
  }

  async getSubscribersForContentType(contentType: 'blog' | 'thought'): Promise<User[]> {
    this.performanceTracker.start();
    const subscribers = this.users.filter(u => 
      contentType === 'blog' ? u.emailBlogUpdates : u.emailThoughtUpdates
    );
    this.performanceTracker.end();
    return subscribers;
  }

  async createEmailNotification(data: any): Promise<string> {
    this.performanceTracker.start();
    const id = `notification-${Date.now()}-${Math.random()}`;
    this.notifications.push({ id, ...data, status: 'pending', createdAt: new Date() });
    this.performanceTracker.end();
    return id;
  }

  async updateNotificationStatus(id: string, status: string, error?: string, messageId?: string): Promise<void> {
    this.performanceTracker.start();
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.status = status;
      if (error) notification.errorMessage = error;
      if (messageId) notification.emailMessageId = messageId;
      notification.updatedAt = new Date();
    }
    this.performanceTracker.end();
  }

  async createUnsubscribeToken(data: any): Promise<string> {
    this.performanceTracker.start();
    const id = `token-${Date.now()}-${Math.random()}`;
    this.performanceTracker.end();
    return id;
  }

  addUser(user: User): void {
    this.users.push(user);
  }

  addUsers(users: User[]): void {
    this.users.push(...users);
  }

  reset(): void {
    this.users = [];
    this.notifications = [];
    this.performanceTracker.reset();
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceTracker.getMetrics();
  }
}

// Mock Gmail API with performance simulation
const mockGmailAuth = {
  sendEmail: vi.fn().mockImplementation(async () => {
    // Simulate Gmail API latency
    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
    return 'gmail-message-id-' + Math.random();
  })
};

vi.mock('../../../src/lib/email/gmail-auth', () => ({
  GmailAuth: class MockGmailAuth {
    sendEmail = mockGmailAuth.sendEmail;
  }
}));

// Mock other dependencies
vi.mock('../../../src/lib/email/unsubscribe-service', () => ({
  UnsubscribeService: class MockUnsubscribeService {
    generateUnsubscribeUrl = vi.fn().mockResolvedValue('https://test.example.com/unsubscribe?token=mock-token');
  }
}));

vi.mock('../../../src/lib/email/error-handler', () => ({
  EmailErrorHandler: class MockEmailErrorHandler {
    handleEmailError = vi.fn().mockResolvedValue(new Error('Mock error'));
    static isRetriable = vi.fn().mockReturnValue(false);
    static getRetryDelay = vi.fn().mockReturnValue(300);
  }
}));

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

// Test data generators
function generateUser(id: number): User {
  return {
    id: `user-${id}`,
    email: `user${id}@example.com`,
    username: `user${id}`,
    createdAt: new Date(),
    emailBlogUpdates: Math.random() > 0.2, // 80% subscribe to blog
    emailThoughtUpdates: Math.random() > 0.3, // 70% subscribe to thoughts
    emailAnnouncements: Math.random() > 0.4 // 60% subscribe to announcements
  };
}

function generateUsers(count: number): User[] {
  return Array.from({ length: count }, (_, i) => generateUser(i));
}

const testBlogPost: BlogPost = {
  slug: 'performance-test-blog',
  title: 'Performance Test Blog Post',
  description: 'This is a performance test blog post',
  content: 'Content for performance testing...',
  publishDate: new Date('2025-01-01'),
  tags: ['performance', 'testing'],
  filePath: '/test/blog/performance.md'
};

const testThought: Thought = {
  slug: 'performance-test-thought',
  title: 'Performance Test Thought',
  content: 'This is a performance test thought',
  publishDate: new Date('2025-01-01'),
  tags: ['performance', 'testing'],
  filePath: '/test/thoughts/performance.md'
};

describe('Email Performance Tests', () => {
  let mockAuthDB: MockAuthDB;
  let notificationService: EmailNotificationService;
  let templateEngine: EmailTemplateEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthDB = new MockAuthDB();
    notificationService = new EmailNotificationService(mockEnv, mockAuthDB);
    templateEngine = new EmailTemplateEngine(mockEnv);
  });

  describe('Notification Processing Performance', () => {
    it('should process 100 notifications within 10 seconds', async () => {
      const users = generateUsers(100);
      mockAuthDB.addUsers(users);

      const startTime = performance.now();
      await notificationService.sendBlogNotification(testBlogPost);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(10000); // 10 seconds

      console.log(`Processed 100 notifications in ${duration.toFixed(2)}ms`);
      console.log(`Average time per notification: ${(duration / 100).toFixed(2)}ms`);
    });

    it('should process 500 notifications within 30 seconds', async () => {
      const users = generateUsers(500);
      mockAuthDB.addUsers(users);

      const startTime = performance.now();
      await notificationService.sendBlogNotification(testBlogPost);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(30000); // 30 seconds

      console.log(`Processed 500 notifications in ${duration.toFixed(2)}ms`);
      console.log(`Average time per notification: ${(duration / 500).toFixed(2)}ms`);
    });

    it('should maintain consistent performance across batch sizes', async () => {
      const batchSizes = [10, 50, 100, 200];
      const results: { size: number; avgTime: number }[] = [];

      for (const size of batchSizes) {
        mockAuthDB.reset();
        const users = generateUsers(size);
        mockAuthDB.addUsers(users);

        const startTime = performance.now();
        await notificationService.sendBlogNotification(testBlogPost);
        const endTime = performance.now();

        const avgTime = (endTime - startTime) / size;
        results.push({ size, avgTime });

        console.log(`Batch size ${size}: ${avgTime.toFixed(2)}ms per notification`);
      }

      // Performance should not degrade significantly with larger batch sizes
      const firstAvg = results[0].avgTime;
      const lastAvg = results[results.length - 1].avgTime;
      expect(lastAvg / firstAvg).toBeLessThan(2); // Should not be more than 2x slower
    });
  });

  describe('Template Rendering Performance', () => {
    it('should render blog templates efficiently', async () => {
      const user = generateUser(1);
      const iterations = 1000;

      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        await templateEngine.renderBlogNotification(user, testBlogPost, 'https://test.example.com/unsubscribe');
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(5); // Should render in less than 5ms on average
      console.log(`Rendered ${iterations} blog templates in ${duration.toFixed(2)}ms`);
      console.log(`Average render time: ${avgTime.toFixed(2)}ms`);
    });

    it('should render thought templates efficiently', async () => {
      const user = generateUser(1);
      const iterations = 1000;

      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        await templateEngine.renderThoughtNotification(user, testThought, 'https://test.example.com/unsubscribe');
      }
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgTime = duration / iterations;

      expect(avgTime).toBeLessThan(5); // Should render in less than 5ms on average
      console.log(`Rendered ${iterations} thought templates in ${duration.toFixed(2)}ms`);
      console.log(`Average render time: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not exceed memory limits with large user lists', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process notifications for 1000 users
      const users = generateUsers(1000);
      mockAuthDB.addUsers(users);

      await notificationService.sendBlogNotification(testBlogPost);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not use more than 100MB additional memory
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should clean up memory after processing', async () => {
      const users = generateUsers(500);
      mockAuthDB.addUsers(users);

      const initialMemory = process.memoryUsage().heapUsed;
      
      await notificationService.sendBlogNotification(testBlogPost);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not increase significantly after processing
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      console.log(`Memory increase after processing: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Concurrent Processing Performance', () => {
    it('should handle concurrent notifications efficiently', async () => {
      const users = generateUsers(100);
      mockAuthDB.addUsers(users);

      const startTime = performance.now();
      
      // Process blog and thought notifications concurrently
      await Promise.all([
        notificationService.sendBlogNotification(testBlogPost),
        notificationService.sendThoughtNotification(testThought)
      ]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete concurrent processing within reasonable time
      expect(duration).toBeLessThan(15000); // 15 seconds
      console.log(`Concurrent processing completed in ${duration.toFixed(2)}ms`);
    });

    it('should scale with multiple concurrent operations', async () => {
      const users = generateUsers(50);
      mockAuthDB.addUsers(users);

      const concurrentOperations = 5;
      const operations = Array.from({ length: concurrentOperations }, (_, i) => 
        notificationService.sendBlogNotification({
          ...testBlogPost,
          slug: `test-blog-${i}`,
          title: `Test Blog ${i}`
        })
      );

      const startTime = performance.now();
      await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgTimePerOperation = duration / concurrentOperations;

      console.log(`${concurrentOperations} concurrent operations completed in ${duration.toFixed(2)}ms`);
      console.log(`Average time per operation: ${avgTimePerOperation.toFixed(2)}ms`);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should respect rate limits without significant performance degradation', async () => {
      const users = generateUsers(150); // Will trigger rate limiting
      mockAuthDB.addUsers(users);

      const startTime = performance.now();
      await notificationService.sendBlogNotification(testBlogPost);
      const endTime = performance.now();

      const duration = endTime - startTime;
      
      // Should include rate limiting delays but still complete within reasonable time
      expect(duration).toBeGreaterThan(4000); // At least 4 seconds for rate limiting
      expect(duration).toBeLessThan(20000); // But not more than 20 seconds
      
      console.log(`Rate-limited processing completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Database Performance', () => {
    it('should perform database operations efficiently', async () => {
      const users = generateUsers(1000);
      mockAuthDB.addUsers(users);

      await notificationService.sendBlogNotification(testBlogPost);

      const dbMetrics = mockAuthDB.getPerformanceMetrics();
      
      expect(dbMetrics.avgTime).toBeLessThan(10); // Average DB operation under 10ms
      console.log(`Database performance metrics:`, dbMetrics);
    });
  });

  describe('System Resource Performance', () => {
    it('should monitor system resource usage', async () => {
      const users = generateUsers(200);
      mockAuthDB.addUsers(users);

      const initialUsage = process.cpuUsage();
      const startTime = process.hrtime();

      await notificationService.sendBlogNotification(testBlogPost);

      const finalUsage = process.cpuUsage(initialUsage);
      const endTime = process.hrtime(startTime);

      const cpuUsage = (finalUsage.user + finalUsage.system) / 1000000; // Convert to ms
      const wallTime = endTime[0] * 1000 + endTime[1] / 1000000; // Convert to ms

      console.log(`CPU usage: ${cpuUsage.toFixed(2)}ms`);
      console.log(`Wall time: ${wallTime.toFixed(2)}ms`);
      console.log(`CPU efficiency: ${((cpuUsage / wallTime) * 100).toFixed(2)}%`);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain baseline performance standards', async () => {
      const users = generateUsers(100);
      mockAuthDB.addUsers(users);

      const startTime = performance.now();
      await notificationService.sendBlogNotification(testBlogPost);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgTimePerNotification = duration / 100;

      // Performance baselines (adjust based on environment)
      expect(avgTimePerNotification).toBeLessThan(100); // 100ms per notification
      expect(duration).toBeLessThan(10000); // 10 seconds total
      
      console.log(`Performance baseline test: ${avgTimePerNotification.toFixed(2)}ms per notification`);
    });
  });
});