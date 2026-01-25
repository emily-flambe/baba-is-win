import { describe, it, expect } from 'vitest';
import {
  truncateContent,
  isPremiumContent,
  shouldShowFullContent,
  processContentForDisplay,
  createContentPreview
} from '../utils/contentProcessing';
import type { User } from '../lib/auth/types';
import type { ContentFrontmatter } from '../types/env';

describe('contentProcessing', () => {
  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    username: 'testuser',
    createdAt: new Date(),
  };

  describe('truncateContent', () => {
    it('should return original content if within word limit', () => {
      const content = 'This is a short test';
      const result = truncateContent(content, 10);
      expect(result).toBe(content);
    });

    it('should truncate content and add ellipsis if over word limit', () => {
      const content = 'This is a much longer piece of content that should be truncated';
      const result = truncateContent(content, 5);
      expect(result).toBe('This is a much longer...');
    });

    it('should handle empty content', () => {
      const result = truncateContent('', 10);
      expect(result).toBe('');
    });

    it('should handle content with exact word limit', () => {
      const content = 'One two three four five';
      const result = truncateContent(content, 5);
      expect(result).toBe(content);
    });
  });

  describe('isPremiumContent', () => {
    it('should return true for premium content', () => {
      const frontmatter: ContentFrontmatter = {
        publishDate: '2025-01-01',
        premium: true
      };
      expect(isPremiumContent(frontmatter)).toBe(true);
    });

    it('should return false for non-premium content', () => {
      const frontmatter: ContentFrontmatter = {
        publishDate: '2025-01-01',
        premium: false
      };
      expect(isPremiumContent(frontmatter)).toBe(false);
    });

    it('should return false when premium property is missing', () => {
      const frontmatter: ContentFrontmatter = {
        publishDate: '2025-01-01'
      };
      expect(isPremiumContent(frontmatter)).toBe(false);
    });
  });

  describe('shouldShowFullContent', () => {
    it('should return true for non-premium content regardless of user', () => {
      expect(shouldShowFullContent(null, false)).toBe(true);
      expect(shouldShowFullContent(mockUser, false)).toBe(true);
    });

    it('should return true for premium content with authenticated user', () => {
      expect(shouldShowFullContent(mockUser, true)).toBe(true);
    });

    it('should return false for premium content with anonymous user', () => {
      expect(shouldShowFullContent(null, true)).toBe(false);
    });
  });

  describe('processContentForDisplay', () => {
    it('should return full content for non-premium posts', () => {
      const content = 'This is a regular blog post with lots of content that should not be truncated';
      const frontmatter: ContentFrontmatter = {
        publishDate: '2025-01-01',
        premium: false
      };

      const result = processContentForDisplay(content, frontmatter, null, 'blog');
      
      expect(result.content).toBe(content);
      expect(result.isPremium).toBe(false);
      expect(result.isTruncated).toBe(false);
      expect(result.requiresAuth).toBe(false);
    });

    it('should return full content for premium posts with authenticated user', () => {
      const content = 'This is a premium blog post that authenticated users should see in full';
      const frontmatter: ContentFrontmatter = {
        publishDate: '2025-01-01',
        premium: true
      };

      const result = processContentForDisplay(content, frontmatter, mockUser, 'blog');
      
      expect(result.content).toBe(content);
      expect(result.isPremium).toBe(true);
      expect(result.isTruncated).toBe(false);
      expect(result.requiresAuth).toBe(false);
    });

    it('should truncate premium blog posts for anonymous users', () => {
      // Blog posts use 250 word limit, so we need >250 words to trigger truncation
      const words = Array(300).fill('word').join(' ');
      const content = `This is a premium blog post. ${words}`;
      const frontmatter: ContentFrontmatter = {
        publishDate: '2025-01-01',
        premium: true
      };

      const result = processContentForDisplay(content, frontmatter, null, 'blog');

      expect(result.content).not.toBe(content);
      expect(result.content).toContain('...');
      expect(result.isPremium).toBe(true);
      expect(result.isTruncated).toBe(true);
      expect(result.requiresAuth).toBe(true);
    });

    it('should truncate premium thoughts to 10 words for anonymous users', () => {
      const content = 'This is a premium thought that has way more than ten words and should be truncated appropriately';
      const frontmatter: ContentFrontmatter = {
        publishDate: '2025-01-01',
        premium: true
      };

      const result = processContentForDisplay(content, frontmatter, null, 'thought');
      
      const words = result.content.replace('...', '').trim().split(/\s+/);
      expect(words.length).toBeLessThanOrEqual(10);
      expect(result.content).toContain('...');
      expect(result.isPremium).toBe(true);
      expect(result.isTruncated).toBe(true);
      expect(result.requiresAuth).toBe(true);
    });
  });

  describe('createContentPreview', () => {
    it('should create a preview with default 20 word limit', () => {
      const content = 'This is a very long piece of content that needs to be previewed for display in listings and other places where space is limited and we need shorter text';
      const result = createContentPreview(content);
      
      const words = result.replace('...', '').trim().split(/\s+/);
      expect(words.length).toBeLessThanOrEqual(20);
      expect(result).toContain('...');
    });

    it('should respect custom word limits', () => {
      const content = 'This is a shorter preview test';
      const result = createContentPreview(content, 3);
      
      expect(result).toBe('This is a...');
    });

    it('should not truncate if content is within limit', () => {
      const content = 'Short content';
      const result = createContentPreview(content, 20);
      
      expect(result).toBe(content);
    });
  });
});