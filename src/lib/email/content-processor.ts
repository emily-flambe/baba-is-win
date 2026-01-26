import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';
import { SimpleEmailNotificationService } from './simple-notification-service';
import { type BlogPost, type Thought } from './template-engine';
import type { ContentItem } from '../auth/types';
import { getBlogPostBySlug, getThoughtBySlug } from '../db/content';

export class ContentProcessor {
  constructor(
    private env: Env,
    private authDB: AuthDB,
    private notificationService: SimpleEmailNotificationService
  ) {}

  async processNewContent(): Promise<void> {
    console.log('Processing new content for notifications...');

    try {
      // Get all content items that need notification
      const unnotifiedContent = await this.getUnnotifiedContent();

      console.log(`Found ${unnotifiedContent.length} items needing notification`);

      // Process content items with rate limiting to avoid subrequest exhaustion
      const maxContentPerRun = 5;
      const contentToProcess = unnotifiedContent.slice(0, maxContentPerRun);

      if (unnotifiedContent.length > maxContentPerRun) {
        console.log(`⚠️ Rate limiting: Processing ${maxContentPerRun} of ${unnotifiedContent.length} content items`);
      }

      for (const contentItem of contentToProcess) {
        try {
          console.log(`[ContentProcessor] Processing: ${contentItem.slug} (${contentItem.contentType})`);

          if (contentItem.contentType === 'blog') {
            const blogPost = await this.loadBlogPost(contentItem.slug);

            if (blogPost) {
              const results = await this.notificationService.sendBlogNotification(blogPost);

              if (results.success && results.failedCount === 0) {
                console.log(`✅ All ${results.successCount} blog notifications sent for ${contentItem.slug}`);
                await this.markContentNotified(contentItem.id);
              } else {
                console.error(`❌ Some notifications failed for ${contentItem.slug}: ${results.failedCount} failed`);
              }
            }
          } else if (contentItem.contentType === 'thought') {
            const thought = await this.loadThought(contentItem.slug);
            if (thought) {
              const results = await this.notificationService.sendThoughtNotification(thought);

              if (results.success && results.failedCount === 0) {
                console.log(`✅ All ${results.successCount} thought notifications sent for ${contentItem.slug}`);
                await this.markContentNotified(contentItem.id);
              } else {
                console.error(`❌ Some notifications failed for ${contentItem.slug}: ${results.failedCount} failed`);
              }
            }
          }

          // Add delay between content items
          if (contentToProcess.indexOf(contentItem) < contentToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
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

  private async loadBlogPost(slug: string): Promise<BlogPost | null> {
    try {
      const post = await getBlogPostBySlug(this.env.DB, slug);
      if (!post) return null;

      return {
        slug: post.slug,
        title: post.title,
        description: post.description || '',
        content: post.content,
        publishDate: post.publishDate ? new Date(post.publishDate) : new Date(),
        tags: post.tags || [],
        filePath: ''
      };
    } catch (error) {
      console.error(`Failed to load blog post ${slug}:`, error);
      return null;
    }
  }

  private async loadThought(slug: string): Promise<Thought | null> {
    try {
      const thought = await getThoughtBySlug(this.env.DB, slug);
      if (!thought) return null;

      const description = thought.content.replace(/[#*_`]/g, '').trim().substring(0, 150) + '...';

      return {
        slug: thought.slug,
        title: thought.title || undefined,
        description,
        content: thought.content,
        publishDate: thought.publishDate ? new Date(thought.publishDate) : new Date(),
        tags: thought.tags || [],
        filePath: ''
      };
    } catch (error) {
      console.error(`Failed to load thought ${slug}:`, error);
      return null;
    }
  }

  private async getUnnotifiedContent(): Promise<ContentItem[]> {
    return await this.authDB.getUnnotifiedContent();
  }

  private async markContentNotified(contentId: string): Promise<void> {
    await this.authDB.markContentNotified(contentId);
  }

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
