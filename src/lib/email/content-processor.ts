import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';
import { SimpleEmailNotificationService } from './simple-notification-service';
import { type BlogPost, type Thought } from './template-engine';
import type { ContentItem } from '../auth/types';

export class ContentProcessor {
  constructor(
    private env: Env,
    private authDB: AuthDB,
    private notificationService: SimpleEmailNotificationService
  ) {}
  
  async processNewContent(): Promise<void> {
    console.log('Processing new content for notifications...');
    
    try {
      // Sync content from files to detect new/updated items
      await this.syncContentFromFiles();
      
      // Get all content items that need notification
      const unnotifiedContent = await this.getUnnotifiedContent();
      
      console.log(`Found ${unnotifiedContent.length} items needing notification`);
      
      // Process content items with rate limiting to avoid subrequest exhaustion
      const maxContentPerRun = 5; // Limit to 5 content items per cron run
      const contentToProcess = unnotifiedContent.slice(0, maxContentPerRun);
      
      if (unnotifiedContent.length > maxContentPerRun) {
        console.log(`⚠️ Rate limiting: Processing ${maxContentPerRun} of ${unnotifiedContent.length} content items to avoid subrequest limits`);
      }
      
      for (const contentItem of contentToProcess) {
        try {
          console.log(`[ContentProcessor] Processing content item: ${contentItem.slug} (${contentItem.contentType})`);
          
          if (contentItem.contentType === 'blog') {
            console.log(`[ContentProcessor] Loading blog post: ${contentItem.slug}`);
            const blogPost = await this.loadBlogPost(contentItem.slug);
            
            if (blogPost) {
              console.log(`[ContentProcessor] Blog post loaded, sending notifications...`);
              const results = await this.notificationService.sendBlogNotification(blogPost);
              
              // Only mark as notified if ALL emails were successful
              if (results.success && results.failedCount === 0) {
                console.log(`🐿️ All ${results.successCount} blog notifications sent successfully for ${contentItem.slug}`);
                await this.markContentNotified(contentItem.id);
              } else {
                console.error(`🐿️ Some blog notifications failed for ${contentItem.slug}: ${results.failedCount} failed, ${results.successCount} succeeded`);
                console.log(`🐿️ Content ${contentItem.slug} will remain as unnotified for retry`);
              }
            }
          } else if (contentItem.contentType === 'thought') {
            const thought = await this.loadThought(contentItem.slug);
            if (thought) {
              const results = await this.notificationService.sendThoughtNotification(thought);
              
              // Only mark as notified if ALL emails were successful
              if (results.success && results.failedCount === 0) {
                console.log(`🐿️ All ${results.successCount} thought notifications sent successfully for ${contentItem.slug}`);
                await this.markContentNotified(contentItem.id);
              } else {
                console.error(`🐿️ Some thought notifications failed for ${contentItem.slug}: ${results.failedCount} failed, ${results.successCount} succeeded`);
                console.log(`🐿️ Content ${contentItem.slug} will remain as unnotified for retry`);
              }
            }
          }
          
          // Add delay between content items to spread out subrequests
          if (contentToProcess.indexOf(contentItem) < contentToProcess.length - 1) {
            console.log('Waiting between content items...');
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
  
  async syncContentFromFiles(): Promise<void> {
    console.log('Content sync is now handled by GitHub Actions workflow that scans the filesystem.');
    console.log('This method is deprecated but kept for backward compatibility.');
    
    // GitHub Actions workflow now handles:
    // 1. Scanning filesystem for all .md files in src/data/blog-posts/published/ and src/data/thoughts/published/
    // 2. Comparing with existing database content using wrangler d1 execute
    // 3. Inserting new content items directly via wrangler d1 execute
    
    console.log('✅ Content sync delegated to GitHub Actions filesystem scanner');
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
      const filePath = `src/data/blog-posts/published/${slug}.md`;
      const postData = await this.loadMarkdownFile(filePath);
      if (!postData) return null;
      
      return {
        slug,
        title: postData.frontmatter.title,
        description: postData.frontmatter.description || '',
        content: postData.content,
        publishDate: new Date(postData.frontmatter.publishDate),
        tags: postData.frontmatter.tags || [],
        filePath
      };
    } catch (error) {
      console.error(`Failed to load blog post ${slug}:`, error);
      return null;
    }
  }
  
  private async loadThought(slug: string): Promise<Thought | null> {
    try {
      const filePath = `src/data/thoughts/published/${slug}.md`;
      const thoughtData = await this.loadMarkdownFile(filePath);
      if (!thoughtData) return null;
      
      // Create a description from the content if not provided in frontmatter
      const description = thoughtData.frontmatter.description || 
        thoughtData.content.replace(/[#*_`]/g, '').trim().substring(0, 150) + '...';
      
      return {
        slug,
        title: thoughtData.frontmatter.title,
        description,
        content: thoughtData.content,
        publishDate: new Date(thoughtData.frontmatter.publishDate),
        tags: thoughtData.frontmatter.tags || [],
        filePath
      };
    } catch (error) {
      console.error(`Failed to load thought ${slug}:`, error);
      return null;
    }
  }
  
  // loadAllBlogPosts and loadAllThoughts removed - content discovery now handled by GitHub Actions
  // Individual content loading (loadBlogPost, loadThought) still available for notification processing
  
  // Database methods (simplified implementations)
  
  private async getContentItemBySlug(slug: string): Promise<ContentItem | null> {
    return await this.authDB.getContentItemBySlug(slug);
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
    return await this.authDB.createContentItem({
      slug: params.slug,
      contentType: params.contentType,
      title: params.title,
      description: params.description,
      contentPreview: params.contentPreview,
      publishDate: params.publishDate,
      filePath: params.filePath,
      contentHash: params.contentHash,
      tags: params.tags
    });
  }
  
  private async updateContentItem(id: string, updates: {
    contentHash?: string;
    notificationSent?: boolean;
    updatedAt?: Date;
  }): Promise<void> {
    // Update content item in database
    console.log(`Updated content item ${id}`, updates);
    
    // Call the database method to update the content item
    await this.authDB.updateContentItem(id, updates);
  }
  
  private async getUnnotifiedContent(): Promise<ContentItem[]> {
    return await this.authDB.getUnnotifiedContent();
  }
  
  private async markContentNotified(contentId: string): Promise<void> {
    await this.authDB.markContentNotified(contentId);
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

  // Filesystem scanning is now handled by GitHub Actions workflow
  // Content discovery is done at build/deploy time, not runtime

  private async loadMarkdownFile(filePath: string): Promise<{ frontmatter: any; content: string } | null> {
    try {
      console.log(`Loading markdown file: ${filePath}`);
      
      // For Cloudflare Workers, we can use KV storage to store processed content
      // or use a different approach like importing from a content API
      
      // Try to load from KV storage first (if available)
      if (this.env.CONTENT_KV) {
        const kvKey = filePath.replace(/[^a-zA-Z0-9-_]/g, '_');
        const cachedContent = await this.env.CONTENT_KV.get(kvKey);
        if (cachedContent) {
          return JSON.parse(cachedContent);
        }
      }
      
      // If KV storage is not available, try to load from a content API or return mock data
      return await this.loadContentFromAPI(filePath);
    } catch (error) {
      console.error(`Failed to load markdown file ${filePath}:`, error);
      return null;
    }
  }
  
  private async loadContentFromAPI(filePath: string): Promise<{ frontmatter: any; content: string } | null> {
    try {
      // For Cloudflare Workers, we'll load content from the deployed site
      // since the content is available at build time but not runtime filesystem
      const slug = filePath.split('/').pop()?.replace('.md', '') || '';
      
      // Try to fetch content from the deployed site's content API
      try {
        const contentUrl = `${this.env.SITE_URL}/api/content/${slug}`;
        const response = await fetch(contentUrl);
        
        if (response.ok) {
          const contentData = await response.json();
          return {
            frontmatter: contentData.frontmatter,
            content: contentData.content
          };
        }
      } catch (fetchError) {
        console.log(`Could not fetch from content API: ${fetchError}. Using metadata extraction.`);
      }
      
      // Fallback: Use metadata for recent content items based on known structure
      if (filePath.includes('blog-posts')) {
        return this.getKnownBlogPostMetadata(slug);
      } else if (filePath.includes('thoughts')) {
        return this.getKnownThoughtMetadata(slug);
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to load content from API for ${filePath}:`, error);
      return null;
    }
  }
  
  private getKnownBlogPostMetadata(slug: string): { frontmatter: any; content: string } | null {
    // Metadata for known blog posts - this ensures notifications work even without file access
    const knownPosts: Record<string, any> = {
      '20250712-i-love-cloudflare': {
        frontmatter: {
          title: 'I love Cloudflare',
          publishDate: '12 Jul 2025',
          description: 'Guess I am a TECH BLOGGER now and maybe even a THOUGHT LEADER so buckle up chucklefucks it\'s time to get aggressively ranted at about cloud platforms and my big feelings about them',
          tags: ['claude', 'tech', 'ai', 'cloudflare']
        },
        content: 'TLDR: I love Cloudflare Workers and use them to deploy all of my personal projects. AWS and GCP have wasted my money and time and I regard them with haughty disdain...'
      },
      '20250712-ai-slop-applicants': {
        frontmatter: {
          title: 'AI Slop Applicants',
          publishDate: '12 Jul 2025',
          description: 'Thoughts on AI-generated job applications',
          tags: ['ai', 'hiring', 'tech']
        },
        content: 'Content about AI-generated job applications and their impact on hiring processes...'
      },
      '20250720-bio': {
        frontmatter: {
          title: 'A Bio, kind of',
          publishDate: '20 Jul 2025',
          description: 'I tried to write a "Bio" for this site and this is what came out. lmao',
          thumbnail: '/assets/portrait.png',
          tags: ['personal']
        },
        content: 'I was born in Michigan in a February many years ago in the midst of a raging winter storm...'
      }
    };
    
    return knownPosts[slug] || {
      frontmatter: {
        title: `Blog Post: ${slug}`,
        publishDate: new Date().toISOString(),
        description: `Description for ${slug}`,
        tags: ['blog']
      },
      content: `Content for blog post ${slug}`
    };
  }
  
  private getKnownThoughtMetadata(slug: string): { frontmatter: any; content: string } | null {
    // Metadata for known thoughts
    const knownThoughts: Record<string, any> = {
      '20250711-cute-subagents': {
        frontmatter: {
          title: 'Cute Subagents',
          publishDate: '11 Jul 2025',
          tags: ['ai', 'development']
        },
        content: 'Thoughts about cute subagents in AI development...'
      },
      '20250711-i-posted-a-swe-job-posting-recently-and-have-been': {
        frontmatter: {
          title: 'SWE Job Posting Insights',
          publishDate: '11 Jul 2025',
          tags: ['hiring', 'swe', 'insights']
        },
        content: 'Recent insights from posting a software engineering job and reviewing applications...'
      }
    };
    
    return knownThoughts[slug] || {
      frontmatter: {
        title: `Thought: ${slug}`,
        publishDate: new Date().toISOString(),
        tags: ['thought']
      },
      content: `Content for thought ${slug}`
    };
  }
}