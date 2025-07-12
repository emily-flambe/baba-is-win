import { describe, it, expect } from 'vitest';
import { EmailTemplateEngine } from '../../src/lib/email/template-engine';
import { mockEnv, mockUsers, mockBlogPosts } from '../fixtures/email-fixtures';

describe('Basic Email Functionality', () => {
  it('should create EmailTemplateEngine instance', () => {
    const engine = new EmailTemplateEngine(mockEnv);
    expect(engine).toBeDefined();
  });

  it('should render basic template variables', async () => {
    const engine = new EmailTemplateEngine(mockEnv);
    const user = mockUsers[0];
    const blogPost = mockBlogPosts[0];
    const unsubscribeUrl = 'https://test.example.com/unsubscribe';

    const result = await engine.renderBlogNotification(user, blogPost, unsubscribeUrl);

    expect(result).toBeDefined();
    expect(result.subject).toContain(blogPost.title);
    expect(result.html).toContain(blogPost.title);
    expect(result.html).toContain(user.username);
    expect(result.text).toContain(blogPost.title);
  });

  it('should handle missing template gracefully', async () => {
    const engine = new EmailTemplateEngine(mockEnv);
    
    try {
      await engine.renderTemplate('nonexistent_template', {
        title: 'Test',
        content: 'Test content',
        url: 'https://test.com',
        unsubscribe_url: 'https://test.com/unsubscribe',
        publish_date: '2025-01-01',
        site_name: 'Test Site',
        site_url: 'https://test.com',
        user_name: 'testuser'
      });
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('Template not found');
    }
  });
});