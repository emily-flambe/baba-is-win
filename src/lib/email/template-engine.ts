import type { User } from '../auth/types';
import type { Env } from '../../types/env';

export interface TemplateVariables {
  title: string;
  content?: string;
  description?: string;
  url: string;
  unsubscribe_url: string;
  publish_date: string;
  tags?: string[];
  site_name: string;
  site_url: string;
  user_name?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  publishDate: Date;
  tags: string[];
  filePath: string;
}

export interface Thought {
  slug: string;
  title?: string;
  content: string;
  publishDate: Date;
  tags: string[];
  filePath: string;
}

export interface EmailTemplate {
  id: string;
  templateName: string;
  templateType: string;
  subjectTemplate: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailTemplateEngine {
  constructor(private env: Env) {}
  
  async renderTemplate(
    templateName: string, 
    variables: TemplateVariables
  ): Promise<{ subject: string; html: string; text: string }> {
    const template = await this.getDefaultTemplate(templateName);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    return {
      subject: this.interpolateTemplate(template.subjectTemplate, variables),
      html: this.interpolateTemplate(template.htmlTemplate, variables),
      text: this.interpolateTemplate(template.textTemplate, variables)
    };
  }
  
  private interpolateTemplate(template: string, variables: TemplateVariables): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key as keyof TemplateVariables];
      if (value === undefined) {
        console.warn(`Template variable not found: ${key}`);
        return match;
      }
      return Array.isArray(value) ? value.join(', ') : String(value);
    });
  }
  
  async renderBlogNotification(
    user: User, 
    post: BlogPost, 
    unsubscribeUrl: string
  ): Promise<{ subject: string; html: string; text: string }> {
    const variables: TemplateVariables = {
      title: post.title,
      description: post.description,
      url: `${this.env.SITE_URL}/blog/${post.slug}`,
      unsubscribe_url: unsubscribeUrl,
      publish_date: post.publishDate.toLocaleDateString(),
      tags: post.tags,
      site_name: this.env.SITE_NAME,
      site_url: this.env.SITE_URL,
      user_name: user.username
    };
    
    return this.renderTemplate('blog_notification', variables);
  }
  
  async renderThoughtNotification(
    user: User, 
    thought: Thought, 
    unsubscribeUrl: string
  ): Promise<{ subject: string; html: string; text: string }> {
    const variables: TemplateVariables = {
      title: thought.title || 'New Thought',
      content: thought.content,
      url: `${this.env.SITE_URL}/thoughts/${thought.slug}`,
      unsubscribe_url: unsubscribeUrl,
      publish_date: thought.publishDate.toLocaleDateString(),
      tags: thought.tags,
      site_name: this.env.SITE_NAME,
      site_url: this.env.SITE_URL,
      user_name: user.username
    };
    
    return this.renderTemplate('thought_notification', variables);
  }
  
  private async getDefaultTemplate(templateName: string): Promise<EmailTemplate | null> {
    // For now, return hardcoded templates. In production, these would be stored in the database
    const templates = {
      blog_notification: {
        id: 'blog_notification',
        templateName: 'blog_notification',
        templateType: 'blog',
        subjectTemplate: 'New Blog Post: {{title}}',
        htmlTemplate: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{{title}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
              .content { margin-bottom: 30px; }
              .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
              .tags { margin-top: 10px; }
              .tag { background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; }
              .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
              .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
              .unsubscribe { font-size: 11px; color: #999; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>{{title}}</h1>
              <div class="meta">Published on {{publish_date}}</div>
            </div>
            
            <div class="content">
              <p>Hi {{user_name}},</p>
              <p>I've published a new blog post that you might find interesting:</p>
              
              <h2>{{title}}</h2>
              <p>{{description}}</p>
              
              <div class="tags">
                <strong>Tags:</strong> {{tags}}
              </div>
              
              <a href="{{url}}" class="button">Read Full Post</a>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>{{site_name}}</p>
              <p class="unsubscribe">
                <a href="{{unsubscribe_url}}">Unsubscribe</a> from these notifications
              </p>
            </div>
          </body>
          </html>
        `,
        textTemplate: `
Hi {{user_name}},

I've published a new blog post: {{title}}

{{description}}

Published on: {{publish_date}}
Tags: {{tags}}

Read the full post: {{url}}

Best regards,
{{site_name}}

---
To unsubscribe from these notifications, visit: {{unsubscribe_url}}
        `,
        variables: ['title', 'description', 'url', 'unsubscribe_url', 'publish_date', 'tags', 'site_name', 'site_url', 'user_name'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      thought_notification: {
        id: 'thought_notification',
        templateName: 'thought_notification',
        templateType: 'thought',
        subjectTemplate: 'New Thought: {{title}}',
        htmlTemplate: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{{title}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
              .content { margin-bottom: 30px; }
              .meta { color: #666; font-size: 14px; margin-bottom: 20px; }
              .tags { margin-top: 10px; }
              .tag { background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; }
              .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
              .button { background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
              .unsubscribe { font-size: 11px; color: #999; }
              .thought-content { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>{{title}}</h1>
              <div class="meta">Published on {{publish_date}}</div>
            </div>
            
            <div class="content">
              <p>Hi {{user_name}},</p>
              <p>I've shared a new thought:</p>
              
              <div class="thought-content">
                {{content}}
              </div>
              
              <div class="tags">
                <strong>Tags:</strong> {{tags}}
              </div>
              
              <a href="{{url}}" class="button">Read Full Thought</a>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>{{site_name}}</p>
              <p class="unsubscribe">
                <a href="{{unsubscribe_url}}">Unsubscribe</a> from these notifications
              </p>
            </div>
          </body>
          </html>
        `,
        textTemplate: `
Hi {{user_name}},

I've shared a new thought: {{title}}

{{content}}

Published on: {{publish_date}}
Tags: {{tags}}

Read the full thought: {{url}}

Best regards,
{{site_name}}

---
To unsubscribe from these notifications, visit: {{unsubscribe_url}}
        `,
        variables: ['title', 'content', 'url', 'unsubscribe_url', 'publish_date', 'tags', 'site_name', 'site_url', 'user_name'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    
    return templates[templateName as keyof typeof templates] || null;
  }
}