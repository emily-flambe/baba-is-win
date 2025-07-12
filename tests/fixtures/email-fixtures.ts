import type { User } from '../../src/lib/auth/types';
import type { BlogPost, Thought } from '../../src/lib/email/template-engine';
import type { Env } from '../../src/types/env';

export const mockEnv: Env = {
  SITE_URL: 'https://test.example.com',
  SITE_NAME: 'Test Site',
  JWT_SECRET: 'test-secret-key-for-testing',
  GMAIL_CLIENT_ID: 'test-gmail-client-id',
  GMAIL_CLIENT_SECRET: 'test-gmail-client-secret',
  GMAIL_REFRESH_TOKEN: 'test-gmail-refresh-token',
  GMAIL_FROM_EMAIL: 'test@example.com',
  CRON_SECRET: 'test-cron-secret',
  DB: {} as any
};

export const mockUsers: User[] = [
  {
    id: 'user-001',
    email: 'alice@example.com',
    username: 'alice',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    emailBlogUpdates: true,
    emailThoughtUpdates: true,
    emailAnnouncements: true
  },
  {
    id: 'user-002',
    email: 'bob@example.com',
    username: 'bob',
    createdAt: new Date('2024-01-02T00:00:00Z'),
    emailBlogUpdates: true,
    emailThoughtUpdates: false,
    emailAnnouncements: true
  },
  {
    id: 'user-003',
    email: 'charlie@example.com',
    username: 'charlie',
    createdAt: new Date('2024-01-03T00:00:00Z'),
    emailBlogUpdates: false,
    emailThoughtUpdates: true,
    emailAnnouncements: false
  },
  {
    id: 'user-004',
    email: 'diana@example.com',
    username: 'diana',
    createdAt: new Date('2024-01-04T00:00:00Z'),
    emailBlogUpdates: false,
    emailThoughtUpdates: false,
    emailAnnouncements: false
  }
];

export const mockBlogPosts: BlogPost[] = [
  {
    slug: 'test-blog-post-1',
    title: 'First Test Blog Post',
    description: 'This is the first test blog post for email notifications',
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    publishDate: new Date('2025-01-01T10:00:00Z'),
    tags: ['testing', 'blog', 'first'],
    filePath: '/test/blog/first-post.md'
  },
  {
    slug: 'test-blog-post-2',
    title: 'Second Test Blog Post',
    description: 'This is the second test blog post with different content',
    content: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    publishDate: new Date('2025-01-02T14:30:00Z'),
    tags: ['testing', 'blog', 'second'],
    filePath: '/test/blog/second-post.md'
  },
  {
    slug: 'comprehensive-guide',
    title: 'A Comprehensive Guide to Email Notifications',
    description: 'Everything you need to know about implementing email notifications in your application',
    content: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    publishDate: new Date('2025-01-03T09:15:00Z'),
    tags: ['guide', 'email', 'notifications', 'tutorial'],
    filePath: '/test/blog/comprehensive-guide.md'
  }
];

export const mockThoughts: Thought[] = [
  {
    slug: 'test-thought-1',
    title: 'First Test Thought',
    content: 'This is my first thought about the email notification system. It should work well for our users.',
    publishDate: new Date('2025-01-01T16:00:00Z'),
    tags: ['testing', 'thoughts', 'first'],
    filePath: '/test/thoughts/first-thought.md'
  },
  {
    slug: 'test-thought-2',
    title: 'Second Test Thought',
    content: 'Another thought about user engagement and how email notifications can improve the user experience.',
    publishDate: new Date('2025-01-02T11:45:00Z'),
    tags: ['testing', 'thoughts', 'engagement'],
    filePath: '/test/thoughts/second-thought.md'
  },
  {
    slug: 'reflection-on-email-design',
    title: 'Reflection on Email Design',
    content: 'Thinking about how to design effective email templates that are both beautiful and functional. The key is to balance aesthetics with usability.',
    publishDate: new Date('2025-01-03T08:30:00Z'),
    tags: ['design', 'email', 'templates', 'ux'],
    filePath: '/test/thoughts/email-design-reflection.md'
  },
  {
    slug: 'thought-without-title',
    title: undefined,
    content: 'This is a thought without a title. The system should handle this gracefully and provide a default title.',
    publishDate: new Date('2025-01-04T13:20:00Z'),
    tags: ['edge-case', 'testing'],
    filePath: '/test/thoughts/untitled-thought.md'
  }
];

export const mockTemplateVariables = {
  blog: {
    title: 'Test Blog Post',
    description: 'Test blog post description',
    content: 'Test blog post content',
    url: 'https://test.example.com/blog/test-post',
    unsubscribe_url: 'https://test.example.com/unsubscribe?token=test-token',
    publish_date: '2025-01-01',
    tags: ['test', 'blog'],
    site_name: 'Test Site',
    site_url: 'https://test.example.com',
    user_name: 'testuser'
  },
  thought: {
    title: 'Test Thought',
    content: 'Test thought content',
    url: 'https://test.example.com/thoughts/test-thought',
    unsubscribe_url: 'https://test.example.com/unsubscribe?token=test-token',
    publish_date: '2025-01-01',
    tags: ['test', 'thought'],
    site_name: 'Test Site',
    site_url: 'https://test.example.com',
    user_name: 'testuser'
  },
  welcome: {
    site_name: 'Test Site',
    site_url: 'https://test.example.com',
    user_name: 'testuser',
    unsubscribe_url: 'https://test.example.com/unsubscribe?token=test-token'
  }
};

export const mockUnsubscribeTokens = [
  {
    id: 'token-001',
    userId: 'user-001',
    token: 'secure-token-abc123',
    tokenType: 'one_click' as const,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    expiresAt: new Date('2026-01-01T00:00:00Z')
  },
  {
    id: 'token-002',
    userId: 'user-002',
    token: 'secure-token-def456',
    tokenType: 'list_unsubscribe' as const,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    expiresAt: new Date('2026-01-01T00:00:00Z')
  },
  {
    id: 'token-003',
    userId: 'user-003',
    token: 'expired-token-ghi789',
    tokenType: 'one_click' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    expiresAt: new Date('2024-01-02T00:00:00Z') // Expired
  }
];

export const mockEmailNotifications = [
  {
    id: 'notification-001',
    userId: 'user-001',
    contentType: 'blog' as const,
    contentId: 'test-blog-post-1',
    contentTitle: 'First Test Blog Post',
    contentUrl: 'https://test.example.com/blog/test-blog-post-1',
    contentExcerpt: 'This is the first test blog post for email notifications',
    notificationType: 'new_content' as const,
    status: 'sent' as const,
    emailMessageId: 'gmail-message-001',
    retryCount: 0,
    createdAt: new Date('2025-01-01T10:05:00Z'),
    updatedAt: new Date('2025-01-01T10:05:30Z')
  },
  {
    id: 'notification-002',
    userId: 'user-002',
    contentType: 'blog' as const,
    contentId: 'test-blog-post-1',
    contentTitle: 'First Test Blog Post',
    contentUrl: 'https://test.example.com/blog/test-blog-post-1',
    contentExcerpt: 'This is the first test blog post for email notifications',
    notificationType: 'new_content' as const,
    status: 'failed' as const,
    errorMessage: 'Gmail API rate limit exceeded',
    retryCount: 2,
    retryAfter: Math.floor(Date.now() / 1000) + 600,
    createdAt: new Date('2025-01-01T10:05:00Z'),
    updatedAt: new Date('2025-01-01T10:10:00Z')
  },
  {
    id: 'notification-003',
    userId: 'user-003',
    contentType: 'thought' as const,
    contentId: 'test-thought-1',
    contentTitle: 'First Test Thought',
    contentUrl: 'https://test.example.com/thoughts/test-thought-1',
    contentExcerpt: 'This is my first thought about the email notification system.',
    notificationType: 'new_content' as const,
    status: 'pending' as const,
    retryCount: 0,
    createdAt: new Date('2025-01-01T16:01:00Z'),
    updatedAt: new Date('2025-01-01T16:01:00Z')
  }
];

export const mockEmailHistory = [
  {
    id: 'history-001',
    userId: 'user-001',
    notificationId: 'notification-001',
    action: 'email_sent',
    details: {
      messageId: 'gmail-message-001',
      subject: 'New Blog Post: First Test Blog Post',
      recipient: 'alice@example.com'
    },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    createdAt: new Date('2025-01-01T10:05:30Z')
  },
  {
    id: 'history-002',
    userId: 'user-002',
    notificationId: 'unsubscribe-001',
    action: 'unsubscribe_all',
    details: {
      userId: 'user-002',
      tokenType: 'one_click',
      action: 'unsubscribe_all'
    },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Mac OS X)',
    createdAt: new Date('2025-01-01T12:00:00Z')
  }
];

export const mockPerformanceMetrics = [
  {
    operation: 'send_notification',
    duration: 145,
    success: true,
    metadata: {
      notification_id: 'notification-001',
      content_type: 'blog',
      user_id: 'user-001'
    },
    timestamp: new Date('2025-01-01T10:05:00Z')
  },
  {
    operation: 'render_template',
    duration: 25,
    success: true,
    metadata: {
      template_type: 'blog_notification',
      user_id: 'user-001'
    },
    timestamp: new Date('2025-01-01T10:04:58Z')
  },
  {
    operation: 'send_notification',
    duration: 5000,
    success: false,
    metadata: {
      notification_id: 'notification-002',
      content_type: 'blog',
      user_id: 'user-002',
      error: 'Gmail API rate limit exceeded'
    },
    timestamp: new Date('2025-01-01T10:05:00Z')
  }
];

export const mockSystemStatus = {
  status: 'healthy',
  circuit_breaker_open: false,
  success_rate: 0.85,
  total_notifications: 1000,
  successful_notifications: 850,
  failed_notifications: 150,
  retry_queue_size: 25,
  average_response_time: 125,
  last_updated: new Date('2025-01-01T10:00:00Z')
};

// Helper functions for creating test data
export const createUser = (overrides: Partial<User> = {}): User => ({
  id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  email: `test-${Date.now()}@example.com`,
  username: `testuser-${Date.now()}`,
  createdAt: new Date(),
  emailBlogUpdates: true,
  emailThoughtUpdates: true,
  emailAnnouncements: true,
  ...overrides
});

export const createBlogPost = (overrides: Partial<BlogPost> = {}): BlogPost => ({
  slug: `test-blog-${Date.now()}`,
  title: `Test Blog Post ${Date.now()}`,
  description: 'Test blog post description',
  content: 'Test blog post content',
  publishDate: new Date(),
  tags: ['test', 'blog'],
  filePath: '/test/blog/test-post.md',
  ...overrides
});

export const createThought = (overrides: Partial<Thought> = {}): Thought => ({
  slug: `test-thought-${Date.now()}`,
  title: `Test Thought ${Date.now()}`,
  content: 'Test thought content',
  publishDate: new Date(),
  tags: ['test', 'thought'],
  filePath: '/test/thoughts/test-thought.md',
  ...overrides
});

export const createUsers = (count: number, overrides: Partial<User> = {}): User[] => {
  return Array.from({ length: count }, (_, i) => createUser({
    id: `user-${i + 1}`,
    email: `user${i + 1}@example.com`,
    username: `user${i + 1}`,
    ...overrides
  }));
};

export const createBlogSubscribers = (count: number): User[] => {
  return createUsers(count, {
    emailBlogUpdates: true,
    emailThoughtUpdates: false,
    emailAnnouncements: false
  });
};

export const createThoughtSubscribers = (count: number): User[] => {
  return createUsers(count, {
    emailBlogUpdates: false,
    emailThoughtUpdates: true,
    emailAnnouncements: false
  });
};

export const createMixedSubscribers = (count: number): User[] => {
  return Array.from({ length: count }, (_, i) => createUser({
    id: `user-${i + 1}`,
    email: `user${i + 1}@example.com`,
    username: `user${i + 1}`,
    emailBlogUpdates: Math.random() > 0.3,
    emailThoughtUpdates: Math.random() > 0.4,
    emailAnnouncements: Math.random() > 0.5
  }));
};