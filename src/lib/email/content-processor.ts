import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';
import { EmailNotificationService } from './notification-service';
import { type BlogPost, type Thought } from './template-engine';
import { getPostData } from '../../utils/getPostData';

export interface ContentItem {
  id: string;
  slug: string;
  contentType: 'blog' | 'thought';
  title: string;
  description?: string;
  contentPreview: string;
  publishDate: number; // Unix timestamp
  filePath: string;
  contentHash: string;
  tags: string[];
  notificationSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class ContentProcessor {
  constructor(
    private env: Env,
    private authDB: AuthDB,
    private notificationService: EmailNotificationService
  ) {}
  
  async processNewContent(): Promise<void> {
    console.log('Processing new content for notifications...');
    
    try {
      // Sync content from files to detect new/updated items
      await this.syncContentFromFiles();
      
      // Get all content items that need notification
      const unnotifiedContent = await this.getUnnotifiedContent();
      
      console.log(`Found ${unnotifiedContent.length} items needing notification`);
      
      for (const contentItem of unnotifiedContent) {
        try {
          if (contentItem.contentType === 'blog') {
            const blogPost = await this.loadBlogPost(contentItem.slug);
            if (blogPost) {
              await this.notificationService.sendBlogNotification(blogPost);
              await this.markContentNotified(contentItem.id);
            }
          } else if (contentItem.contentType === 'thought') {
            const thought = await this.loadThought(contentItem.slug);
            if (thought) {
              await this.notificationService.sendThoughtNotification(thought);
              await this.markContentNotified(contentItem.id);
            }
          }
        } catch (error) {
          console.error(`Failed to process content ${contentItem.slug}:`, error);
        }
      }
      
      console.log('Content processing completed');
      
    } catch (error) {
      console.error('Error during content processing:', error);
    }
  }
  
  async syncContentFromFiles(): Promise<void> {
    console.log('Syncing content from files...');
    
    try {
      // Sync blog posts
      const blogPosts = await this.loadAllBlogPosts();
      for (const post of blogPosts) {
        await this.syncContentItem(post, 'blog');
      }
      
      // Sync thoughts
      const thoughts = await this.loadAllThoughts();
      for (const thought of thoughts) {
        await this.syncContentItem(thought, 'thought');
      }
      
      console.log('Content sync completed');
      
    } catch (error) {
      console.error('Error during content sync:', error);
    }
  }
  
  private async syncContentItem(
    content: BlogPost | Thought, 
    contentType: 'blog' | 'thought'
  ): Promise<void> {
    const contentHash = await this.generateContentHash(content);
    const existingItem = await this.getContentItemBySlug(content.slug);
    
    if (!existingItem) {
      // Create new content item
      console.log(`Creating new content item: ${content.slug}`);
      
      await this.createContentItem({
        slug: content.slug,
        contentType,
        title: content.title || 'Untitled',
        description: contentType === 'blog' ? (content as BlogPost).description : undefined,
        contentPreview: content.content?.substring(0, 200) || '',
        publishDate: Math.floor(content.publishDate.getTime() / 1000),
        filePath: content.filePath,
        contentHash,
        tags: content.tags || []
      });
    } else if (existingItem.contentHash !== contentHash) {
      // Content has changed - update and mark for re-notification
      console.log(`Content changed for: ${content.slug}`);
      
      await this.updateContentItem(existingItem.id, {
        contentHash,
        notificationSent: false,
        updatedAt: new Date()
      });
    }
  }
  
  private async generateContentHash(content: BlogPost | Thought): Promise<string> {
    const contentString = JSON.stringify({
      title: content.title,
      content: content.content,
      publishDate: content.publishDate.toISOString(),
      tags: content.tags
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  private async loadBlogPost(slug: string): Promise<BlogPost | null> {
    try {
      const postData = getPostData(`src/data/blog-posts/published/${slug}.md`);
      if (!postData) return null;
      
      return {
        slug,
        title: postData.title,
        description: postData.description || '',
        content: postData.content,
        publishDate: new Date(postData.publishDate),
        tags: postData.tags || [],
        filePath: `src/data/blog-posts/published/${slug}.md`
      };
    } catch (error) {
      console.error(`Failed to load blog post ${slug}:`, error);
      return null;
    }
  }
  
  private async loadThought(slug: string): Promise<Thought | null> {
    try {
      const thoughtData = getPostData(`src/data/thoughts/published/${slug}.md`);
      if (!thoughtData) return null;
      
      return {
        slug,
        title: thoughtData.title,
        content: thoughtData.content,
        publishDate: new Date(thoughtData.publishDate),
        tags: thoughtData.tags || [],
        filePath: `src/data/thoughts/published/${slug}.md`
      };
    } catch (error) {
      console.error(`Failed to load thought ${slug}:`, error);
      return null;
    }
  }
  
  private async loadAllBlogPosts(): Promise<BlogPost[]> {
    try {
      // This is a simplified implementation - in reality you'd scan the filesystem
      // or use a more sophisticated content loading system
      const blogPosts: BlogPost[] = [];
      
      // Mock implementation - in reality you'd read from filesystem
      const blogPostSlugs = [
        '20250301-hello-world',
        '20250302-fountain-is-defeat',
        '20250315-vail',
        '20250427-baba-make-keke',
        '20250504-cringe-ai-image-dump',
        '20250509-lucien-and-caleb',
        '20250622-cursed-first-dates',
        '20250627-based-and-claude-pilled',
        '20250705-useful-valued'
      ];
      
      for (const slug of blogPostSlugs) {
        const post = await this.loadBlogPost(slug);
        if (post) {
          blogPosts.push(post);
        }
      }
      
      return blogPosts;
    } catch (error) {
      console.error('Failed to load blog posts:', error);
      return [];
    }
  }
  
  private async loadAllThoughts(): Promise<Thought[]> {
    try {
      // This is a simplified implementation - in reality you'd scan the filesystem
      const thoughts: Thought[] = [];
      
      // Mock implementation - in reality you'd read from filesystem
      const thoughtSlugs = [
        '20250117-ai-musings',
        '20250118-test',
        '20250121-image-test',
        '20250425-deodorant',
        '20250505-ai-smut',
        '20250621-summer',
        '20250622-first-dates',
        '20250623-esquie-launch',
        '20250625-legacy-romance',
        '20250627-new-claude-guide',
        '20250627-toenails',
        '20250629-claude-maxed-out',
        '20250704-claude-reviewing-itself',
        '20250705-many-claudes'
      ];
      
      for (const slug of thoughtSlugs) {
        const thought = await this.loadThought(slug);
        if (thought) {
          thoughts.push(thought);
        }
      }
      
      return thoughts;
    } catch (error) {
      console.error('Failed to load thoughts:', error);
      return [];
    }
  }
  
  // Database methods (simplified implementations)
  
  private async getContentItemBySlug(slug: string): Promise<ContentItem | null> {
    // In a real implementation, you'd query a content_items table
    // For now, return null to indicate no existing item
    return null;
  }
  
  private async createContentItem(params: {
    slug: string;
    contentType: 'blog' | 'thought';
    title: string;
    description?: string;
    contentPreview: string;
    publishDate: number;
    filePath: string;
    contentHash: string;
    tags: string[];
  }): Promise<string> {
    // In a real implementation, you'd insert into a content_items table
    const id = crypto.randomUUID();
    console.log(`Created content item ${id} for ${params.slug}`);
    return id;
  }
  
  private async updateContentItem(id: string, updates: {
    contentHash?: string;
    notificationSent?: boolean;
    updatedAt?: Date;
  }): Promise<void> {
    // In a real implementation, you'd update the content_items table
    console.log(`Updated content item ${id}`, updates);
  }
  
  private async getUnnotifiedContent(): Promise<ContentItem[]> {
    // In a real implementation, you'd query for content where notificationSent = false
    // For now, return empty array
    return [];
  }
  
  private async markContentNotified(contentId: string): Promise<void> {
    // In a real implementation, you'd update notificationSent = true
    console.log(`Marked content ${contentId} as notified`);
  }
  
  // Helper method to manually trigger notification for specific content
  async triggerNotificationForContent(slug: string, contentType: 'blog' | 'thought'): Promise<void> {
    console.log(`Manually triggering notification for ${contentType}: ${slug}`);
    
    try {
      if (contentType === 'blog') {
        const blogPost = await this.loadBlogPost(slug);
        if (blogPost) {
          await this.notificationService.sendBlogNotification(blogPost);
        }
      } else if (contentType === 'thought') {
        const thought = await this.loadThought(slug);
        if (thought) {
          await this.notificationService.sendThoughtNotification(thought);
        }
      }
    } catch (error) {
      console.error(`Failed to trigger notification for ${slug}:`, error);
      throw error;
    }
  }
}