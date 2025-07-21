import type { User } from '../lib/auth/types';
import type { ContentFrontmatter, ProcessedContent } from '../types/env';

/**
 * Truncates content to a specified word limit and adds ellipsis
 * @param content - The content to truncate
 * @param wordLimit - Maximum number of words to include
 * @returns Truncated content with ellipsis if truncated
 */
export function truncateContent(content: string, wordLimit: number): string {
  if (!content) return '';
  
  const words = content.trim().split(/\s+/);
  
  if (words.length <= wordLimit) {
    return content;
  }
  
  const truncated = words.slice(0, wordLimit).join(' ');
  return truncated + '...';
}

/**
 * Checks if content is marked as premium in frontmatter
 * @param frontmatter - The frontmatter object from content files
 * @returns True if content is premium, false otherwise
 */
export function isPremiumContent(frontmatter: ContentFrontmatter): boolean {
  return frontmatter?.premium === true;
}

/**
 * Determines if a user should see full content based on authentication and premium status
 * @param user - The authenticated user (null if anonymous)
 * @param isPremium - Whether the content is marked as premium
 * @returns True if user should see full content, false if content should be truncated
 */
export function shouldShowFullContent(user: User | null, isPremium: boolean): boolean {
  // If content is not premium, everyone gets full content
  if (!isPremium) {
    return true;
  }
  
  // If content is premium, only authenticated users get full content
  return user !== null;
}

/**
 * Processes content for display, applying truncation rules based on user auth and content type
 * @param content - The raw content to process
 * @param frontmatter - The frontmatter object containing metadata
 * @param user - The authenticated user (null if anonymous)
 * @param contentType - Type of content ('blog' or 'thought')
 * @returns Object containing processed content and premium status info
 */
export function processContentForDisplay(
  content: string,
  frontmatter: ContentFrontmatter,
  user: User | null,
  contentType: 'blog' | 'thought'
): ProcessedContent {
  const isPremium = isPremiumContent(frontmatter);
  const showFullContent = shouldShowFullContent(user, isPremium);
  
  let processedContent = content;
  let isTruncated = false;
  
  // If user should not see full content, apply truncation
  if (!showFullContent) {
    const wordLimit = contentType === 'blog' ? 50 : 10;
    const originalLength = content.trim().split(/\s+/).length;
    
    processedContent = truncateContent(content, wordLimit);
    isTruncated = originalLength > wordLimit;
  }
  
  return {
    content: processedContent,
    isPremium,
    isTruncated,
    requiresAuth: isPremium && !user
  };
}

/**
 * Creates a content preview for listings (shorter than full truncation)
 * @param content - The content to create preview from
 * @param maxWords - Maximum words for preview (default: 20)
 * @returns Preview string with ellipsis if truncated
 */
export function createContentPreview(content: string, maxWords: number = 20): string {
  return truncateContent(content, maxWords);
}