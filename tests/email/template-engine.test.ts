import { describe, it, expect, beforeEach } from 'vitest';
import { EmailTemplateEngine, type TemplateVariables, type BlogPost, type Thought } from '../../src/lib/email/template-engine';
import type { User } from '../../src/lib/auth/types';
import type { Env } from '../../src/types/env';

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
  DB: {} as any // We won't use DB in these tests
};

// Mock user
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  createdAt: new Date(),
  emailBlogUpdates: true,
  emailThoughtUpdates: true,
  emailAnnouncements: true
};

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

describe('EmailTemplateEngine', () => {
  let templateEngine: EmailTemplateEngine;

  beforeEach(() => {
    templateEngine = new EmailTemplateEngine(mockEnv);
  });

  describe('Template Variable Interpolation', () => {
    it('should interpolate basic variables correctly', async () => {
      const variables: TemplateVariables = {
        title: 'Test Title',
        content: 'Test Content',
        url: 'https://example.com',
        unsubscribe_url: 'https://example.com/unsubscribe',
        publish_date: '2025-01-01',
        tags: ['tag1', 'tag2'],
        site_name: 'Test Site',
        site_url: 'https://example.com',
        user_name: 'testuser'
      };

      const result = await templateEngine.renderTemplate('blog_notification', variables);

      expect(result.subject).toContain('Test Title');
      expect(result.html).toContain('Test Title');
      expect(result.html).toContain('testuser');
      expect(result.html).toContain('https://example.com/unsubscribe');
      expect(result.text).toContain('Test Title');
      expect(result.text).toContain('testuser');
    });

    it('should handle array variables correctly', async () => {
      const variables: TemplateVariables = {
        title: 'Test Title',
        content: 'Test Content',
        url: 'https://example.com',
        unsubscribe_url: 'https://example.com/unsubscribe',
        publish_date: '2025-01-01',
        tags: ['javascript', 'typescript', 'testing'],
        site_name: 'Test Site',
        site_url: 'https://example.com',
        user_name: 'testuser'
      };

      const result = await templateEngine.renderTemplate('blog_notification', variables);

      expect(result.html).toContain('javascript, typescript, testing');
      expect(result.text).toContain('javascript, typescript, testing');
    });

    it('should handle missing variables gracefully', async () => {
      const variables: TemplateVariables = {
        title: 'Test Title',
        url: 'https://example.com',
        unsubscribe_url: 'https://example.com/unsubscribe',
        publish_date: '2025-01-01',
        site_name: 'Test Site',
        site_url: 'https://example.com',
        user_name: 'testuser'
        // Missing content, description, tags
      };

      const result = await templateEngine.renderTemplate('blog_notification', variables);

      // Should not throw error and should preserve template variables for missing values
      expect(result.subject).toContain('Test Title');
      expect(result.html).toContain('{{description}}'); // Should preserve missing variable
      expect(result.text).toContain('{{description}}');
    });
  });

  describe('Blog Notification Rendering', () => {
    it('should render blog notification correctly', async () => {
      const unsubscribeUrl = 'https://example.com/unsubscribe?token=test123';
      
      const result = await templateEngine.renderBlogNotification(mockUser, mockBlogPost, unsubscribeUrl);

      expect(result.subject).toBe('New Blog Post: Test Blog Post');
      expect(result.html).toContain('Test Blog Post');
      expect(result.html).toContain('This is a test blog post description');
      expect(result.html).toContain('testuser');
      expect(result.html).toContain(unsubscribeUrl);
      expect(result.html).toContain('test, blog');
      expect(result.text).toContain('Test Blog Post');
      expect(result.text).toContain('This is a test blog post description');
      expect(result.text).toContain(unsubscribeUrl);
    });

    it('should generate correct URLs for blog posts', async () => {
      const unsubscribeUrl = 'https://example.com/unsubscribe?token=test123';
      
      const result = await templateEngine.renderBlogNotification(mockUser, mockBlogPost, unsubscribeUrl);

      expect(result.html).toContain('https://test.example.com/blog/test-blog-post');
      expect(result.text).toContain('https://test.example.com/blog/test-blog-post');
    });
  });

  describe('Thought Notification Rendering', () => {
    it('should render thought notification correctly', async () => {
      const unsubscribeUrl = 'https://example.com/unsubscribe?token=test123';
      
      const result = await templateEngine.renderThoughtNotification(mockUser, mockThought, unsubscribeUrl);

      expect(result.subject).toBe('New Thought: Test Thought');
      expect(result.html).toContain('Test Thought');
      expect(result.html).toContain('This is a test thought content');
      expect(result.html).toContain('testuser');
      expect(result.html).toContain(unsubscribeUrl);
      expect(result.text).toContain('Test Thought');
      expect(result.text).toContain('This is a test thought content');
    });

    it('should handle thoughts without titles', async () => {
      const thoughtWithoutTitle: Thought = {
        ...mockThought,
        title: undefined
      };
      const unsubscribeUrl = 'https://example.com/unsubscribe?token=test123';
      
      const result = await templateEngine.renderThoughtNotification(mockUser, thoughtWithoutTitle, unsubscribeUrl);

      expect(result.subject).toBe('New Thought: New Thought');
      expect(result.html).toContain('New Thought');
    });

    it('should generate correct URLs for thoughts', async () => {
      const unsubscribeUrl = 'https://example.com/unsubscribe?token=test123';
      
      const result = await templateEngine.renderThoughtNotification(mockUser, mockThought, unsubscribeUrl);

      expect(result.html).toContain('https://test.example.com/thoughts/test-thought');
      expect(result.text).toContain('https://test.example.com/thoughts/test-thought');
    });
  });

  describe('Welcome Email Rendering', () => {
    it('should render welcome email correctly', async () => {
      const unsubscribeUrl = 'https://example.com/unsubscribe?token=test123';
      
      const result = await templateEngine.renderWelcomeEmail(mockUser, unsubscribeUrl);

      expect(result.subject).toBe('Welcome to Test Site!');
      expect(result.html).toContain('Welcome to Test Site!');
      expect(result.html).toContain('testuser');
      expect(result.html).toContain(unsubscribeUrl);
      expect(result.html).toContain('New blog posts');
      expect(result.html).toContain('New thoughts and updates');
      expect(result.text).toContain('Welcome to Test Site!');
      expect(result.text).toContain('testuser');
    });
  });

  describe('Unsubscribe Confirmation Rendering', () => {
    it('should render unsubscribe confirmation correctly', async () => {
      const result = await templateEngine.renderUnsubscribeConfirmation(mockUser);

      expect(result.subject).toBe('Unsubscribed from Test Site');
      expect(result.html).toContain('Successfully Unsubscribed');
      expect(result.html).toContain('testuser');
      expect(result.html).toContain('Test Site');
      expect(result.text).toContain('Successfully Unsubscribed');
      expect(result.text).toContain('testuser');
    });
  });

  describe('Template Testing', () => {
    it('should validate template rendering with test variables', async () => {
      const testVariables: TemplateVariables = {
        title: 'Test Title',
        content: 'Test Content',
        description: 'Test Description',
        url: 'https://example.com/test',
        unsubscribe_url: 'https://example.com/unsubscribe',
        publish_date: '2025-01-01',
        tags: ['test'],
        site_name: 'Test Site',
        site_url: 'https://example.com',
        user_name: 'testuser'
      };

      const result = await templateEngine.testTemplate('blog_notification', testVariables);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.subject).toContain('Test Title');
    });

    it('should handle invalid template names', async () => {
      const testVariables: TemplateVariables = {
        title: 'Test Title',
        content: 'Test Content',
        url: 'https://example.com/test',
        unsubscribe_url: 'https://example.com/unsubscribe',
        publish_date: '2025-01-01',
        site_name: 'Test Site',
        site_url: 'https://example.com',
        user_name: 'testuser'
      };

      const result = await templateEngine.testTemplate('nonexistent_template', testVariables);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Template not found');
    });
  });

  describe('HTML Email Validation', () => {
    it('should generate valid HTML emails', async () => {
      const unsubscribeUrl = 'https://example.com/unsubscribe?token=test123';
      
      const result = await templateEngine.renderBlogNotification(mockUser, mockBlogPost, unsubscribeUrl);

      // Check for essential HTML elements
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html>');
      expect(result.html).toContain('<head>');
      expect(result.html).toContain('<body>');
      expect(result.html).toContain('</html>');
      
      // Check for meta tags
      expect(result.html).toContain('<meta charset="utf-8">');
      expect(result.html).toContain('<meta name="viewport"');
      
      // Check for CSS styles
      expect(result.html).toContain('<style>');
      expect(result.html).toContain('font-family');
      expect(result.html).toContain('max-width');
    });

    it('should include unsubscribe links in all email types', async () => {
      const unsubscribeUrl = 'https://example.com/unsubscribe?token=test123';
      
      const blogResult = await templateEngine.renderBlogNotification(mockUser, mockBlogPost, unsubscribeUrl);
      const thoughtResult = await templateEngine.renderThoughtNotification(mockUser, mockThought, unsubscribeUrl);
      const welcomeResult = await templateEngine.renderWelcomeEmail(mockUser, unsubscribeUrl);

      expect(blogResult.html).toContain(unsubscribeUrl);
      expect(thoughtResult.html).toContain(unsubscribeUrl);
      expect(welcomeResult.html).toContain(unsubscribeUrl);
      
      expect(blogResult.text).toContain(unsubscribeUrl);
      expect(thoughtResult.text).toContain(unsubscribeUrl);
      expect(welcomeResult.text).toContain(unsubscribeUrl);
    });
  });
});