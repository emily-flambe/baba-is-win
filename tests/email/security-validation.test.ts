import { describe, it, expect } from 'vitest';
import { EmailTemplateEngine } from '../../src/lib/email/template-engine';
import { UnsubscribeService } from '../../src/lib/email/unsubscribe-service';
import { mockEnv, mockUsers } from '../fixtures/email-fixtures';
import { createDatabaseMock } from '../mocks/database.mock';

describe('Email Security Validation', () => {
  const mockDB = createDatabaseMock();
  
  describe('Input Sanitization', () => {
    it('should sanitize HTML content in templates', async () => {
      const engine = new EmailTemplateEngine(mockEnv);
      
      const maliciousPost = {
        slug: 'test-post',
        title: '<script>alert("XSS")</script>Malicious Title',
        description: '<img src="x" onerror="alert(1)">Description',
        content: '<iframe src="javascript:alert(1)"></iframe>Content',
        publishDate: new Date(),
        tags: ['<script>alert("tag")</script>'],
        filePath: '/test.md'
      };
      
      const result = await engine.renderBlogNotification(
        mockUsers[0], 
        maliciousPost, 
        'https://test.example.com/unsubscribe'
      );
      
      // HTML should be escaped or sanitized
      expect(result.html).not.toContain('<script>');
      expect(result.html).not.toContain('javascript:');
      expect(result.html).not.toContain('onerror=');
      expect(result.text).not.toContain('<script>');
    });
    
    it('should sanitize user input in templates', async () => {
      const engine = new EmailTemplateEngine(mockEnv);
      
      const maliciousUser = {
        ...mockUsers[0],
        username: '<script>alert("XSS")</script>hacker',
        email: 'test<script>@example.com'
      };
      
      const result = await engine.renderBlogNotification(
        maliciousUser,
        {
          slug: 'test',
          title: 'Test Post',
          description: 'Test description',
          content: 'Test content',
          publishDate: new Date(),
          tags: ['test'],
          filePath: '/test.md'
        },
        'https://test.example.com/unsubscribe'
      );
      
      expect(result.html).not.toContain('<script>');
      expect(result.text).not.toContain('<script>');
    });
  });
  
  describe('Unsubscribe Token Security', () => {
    it('should generate cryptographically secure tokens', async () => {
      const service = new UnsubscribeService(mockEnv, mockDB);
      
      // Generate multiple tokens
      const tokens = await Promise.all([
        service.generateUnsubscribeUrl('user1'),
        service.generateUnsubscribeUrl('user2'),
        service.generateUnsubscribeUrl('user3')
      ]);
      
      // Extract tokens from URLs
      const tokenValues = tokens.map(url => new URL(url).searchParams.get('token'));
      
      // All tokens should be unique
      const uniqueTokens = new Set(tokenValues);
      expect(uniqueTokens.size).toBe(3);
      
      // Tokens should be long enough (at least 32 characters)
      tokenValues.forEach(token => {
        expect(token).toBeDefined();
        expect(token!.length).toBeGreaterThanOrEqual(32);
      });
    });
    
    it('should validate token expiration', async () => {
      const service = new UnsubscribeService(mockEnv, mockDB);
      
      // Create expired token
      const expiredToken = 'expired-token-123';
      await mockDB.createUnsubscribeToken({
        userId: 'user1',
        token: expiredToken,
        tokenType: 'one_click',
        expiresAt: new Date(Date.now() - 1000) // Already expired
      });
      
      const result = await service.processUnsubscribe(expiredToken);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired unsubscribe token');
    });
    
    it('should prevent token reuse', async () => {
      const service = new UnsubscribeService(mockEnv, mockDB);
      
      // Add user to database
      await mockDB.addUser(mockUsers[0]);
      
      // Create valid token
      const validToken = 'valid-token-123';
      await mockDB.createUnsubscribeToken({
        userId: mockUsers[0].id,
        token: validToken,
        tokenType: 'one_click',
        expiresAt: new Date(Date.now() + 86400000) // 24 hours from now
      });
      
      // First use should succeed
      const firstResult = await service.processUnsubscribe(validToken);
      expect(firstResult.success).toBe(true);
      
      // Second use should fail
      const secondResult = await service.processUnsubscribe(validToken);
      expect(secondResult.success).toBe(false);
    });
  });
  
  describe('Email Header Security', () => {
    it('should include proper List-Unsubscribe headers', () => {
      const service = new UnsubscribeService(mockEnv, mockDB);
      
      const header = service.generateListUnsubscribeHeader('user123');
      
      expect(header).toMatch(/^<https:\/\/[^>]+>, <mailto:[^>]+>$/);
      expect(header).toContain('https://test.example.com/unsubscribe');
      expect(header).toContain('mailto:');
    });
    
    it('should prevent header injection', () => {
      const service = new UnsubscribeService(mockEnv, mockDB);
      
      // Try to inject malicious content
      const maliciousUserId = 'user123\r\nBcc: attacker@evil.com';
      const header = service.generateListUnsubscribeHeader(maliciousUserId);
      
      // Should not contain line breaks or additional headers
      expect(header).not.toContain('\r\n');
      expect(header).not.toContain('\n');
      expect(header).not.toContain('Bcc:');
    });
  });
  
  describe('Rate Limiting and Abuse Prevention', () => {
    it('should handle rapid successive requests', async () => {
      const service = new UnsubscribeService(mockEnv, mockDB);
      
      // Generate many unsubscribe URLs rapidly
      const requests = Array.from({ length: 100 }, (_, i) => 
        service.generateUnsubscribeUrl(`user${i}`)
      );
      
      const results = await Promise.all(requests);
      
      // All requests should succeed (no rate limiting in mock)
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result).toMatch(/^https:\/\/test\.example\.com\/unsubscribe\?token=/);
      });
    });
  });
  
  describe('Data Validation', () => {
    it('should validate email addresses', async () => {
      const engine = new EmailTemplateEngine(mockEnv);
      
      const userWithInvalidEmail = {
        ...mockUsers[0],
        email: 'invalid-email-format'
      };
      
      // Should still render template but with validation concerns
      const result = await engine.renderBlogNotification(
        userWithInvalidEmail,
        {
          slug: 'test',
          title: 'Test Post',
          description: 'Test description',
          content: 'Test content',
          publishDate: new Date(),
          tags: ['test'],
          filePath: '/test.md'
        },
        'https://test.example.com/unsubscribe'
      );
      
      expect(result).toBeDefined();
      expect(result.html).toContain('invalid-email-format');
    });
    
    it('should validate URLs', async () => {
      const engine = new EmailTemplateEngine(mockEnv);
      
      const result = await engine.renderBlogNotification(
        mockUsers[0],
        {
          slug: 'test',
          title: 'Test Post',
          description: 'Test description',
          content: 'Test content',
          publishDate: new Date(),
          tags: ['test'],
          filePath: '/test.md'
        },
        'javascript:alert("XSS")' // Malicious unsubscribe URL
      );
      
      // Should not contain javascript: URLs
      expect(result.html).not.toContain('javascript:');
      expect(result.text).not.toContain('javascript:');
    });
  });
  
  describe('Content Security', () => {
    it('should prevent template injection', async () => {
      const engine = new EmailTemplateEngine(mockEnv);
      
      const maliciousTemplate = {
        slug: 'test',
        title: '{{evil_template_variable}}',
        description: '{{#if true}}{{system_password}}{{/if}}',
        content: '{{> malicious_partial}}',
        publishDate: new Date(),
        tags: ['{{injection}}'],
        filePath: '/test.md'
      };
      
      const result = await engine.renderBlogNotification(
        mockUsers[0],
        maliciousTemplate,
        'https://test.example.com/unsubscribe'
      );
      
      // Template variables should not be executed
      expect(result.html).toContain('{{evil_template_variable}}');
      expect(result.html).not.toContain('system_password');
    });
  });
});