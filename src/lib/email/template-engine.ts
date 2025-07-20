import type { User } from '../auth/types';
import type { Env } from '../../types/env';
import { AuthDB } from '../auth/db';

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
  [key: string]: any; // Allow additional properties for flexibility
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
  description?: string;
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
  version?: number;
  createdAt: Date;
  updatedAt: Date;
}

export class EmailTemplateEngine {
  constructor(private env: Env, private authDB?: AuthDB) {}
  
  async renderTemplate(
    templateName: string, 
    variables: TemplateVariables
  ): Promise<{ subject: string; html: string; text: string }> {
    const template = await this.getTemplate(templateName);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    // Validate template variables
    this.validateTemplateVariables(template, variables);
    
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
      const stringValue = Array.isArray(value) ? value.join(', ') : String(value);
      
      // Don't sanitize URLs or safe content
      if (key.includes('url') || key === 'site_name' || key === 'user_name') {
        return stringValue;
      }
      
      // Sanitize potentially dangerous content
      return this.sanitizeHtml(stringValue);
    });
  }

  private sanitizeHtml(input: string): string {
    // Basic HTML sanitization - escape dangerous characters
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      // Remove javascript: and data: protocols
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      // Remove script tags and their content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  private validateTemplateVariables(template: EmailTemplate, variables: TemplateVariables): void {
    const missingVariables = template.variables.filter(varName => 
      variables[varName as keyof TemplateVariables] === undefined
    );
    
    if (missingVariables.length > 0) {
      console.warn(`Missing template variables: ${missingVariables.join(', ')}`);
    }
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
  
  async renderWelcomeEmail(
    user: User,
    unsubscribeUrl: string
  ): Promise<{ subject: string; html: string; text: string }> {
    const variables: TemplateVariables = {
      title: 'Welcome!',
      url: this.env.SITE_URL,
      unsubscribe_url: unsubscribeUrl,
      publish_date: new Date().toLocaleDateString(),
      site_name: this.env.SITE_NAME,
      site_url: this.env.SITE_URL,
      user_name: user.username
    };
    
    return this.renderTemplate('welcome_email', variables);
  }
  
  async renderUnsubscribeConfirmation(
    user: User
  ): Promise<{ subject: string; html: string; text: string }> {
    const variables: TemplateVariables = {
      title: 'Unsubscribed',
      url: this.env.SITE_URL,
      unsubscribe_url: '', // Not needed for unsubscribe confirmation
      publish_date: new Date().toLocaleDateString(),
      site_name: this.env.SITE_NAME,
      site_url: this.env.SITE_URL,
      user_name: user.username
    };
    
    return this.renderTemplate('unsubscribe_confirmation', variables);
  }
  
  private async getTemplate(templateName: string): Promise<EmailTemplate | null> {
    // Note: email_templates table was removed in migration 0013
    // Always use default templates
    return this.getDefaultTemplate(templateName);
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
          <html lang="en">
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
          <html lang="en">
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
      },
      welcome_email: {
        id: 'welcome_email',
        templateName: 'welcome_email',
        templateType: 'system',
        subjectTemplate: 'Welcome to {{site_name}}!',
        htmlTemplate: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to {{site_name}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #007bff; color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
              .content { margin-bottom: 30px; }
              .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
              .button { background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
              .unsubscribe { font-size: 11px; color: #999; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Welcome to {{site_name}}!</h1>
              <p>Thank you for subscribing to our notifications</p>
            </div>
            
            <div class="content">
              <p>Hi {{user_name}},</p>
              <p>Welcome to {{site_name}}! We're excited to have you as a subscriber.</p>
              
              <p>You'll receive email notifications for:</p>
              <ul>
                <li>New blog posts</li>
                <li>New thoughts and updates</li>
                <li>Important announcements</li>
              </ul>
              
              <p>You can update your preferences or unsubscribe at any time.</p>
              
              <a href="{{site_url}}/profile" class="button">Manage Preferences</a>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>{{site_name}}</p>
              <p class="unsubscribe">
                <a href="{{unsubscribe_url}}">Unsubscribe</a> from all notifications
              </p>
            </div>
          </body>
          </html>
        `,
        textTemplate: `
Welcome to {{site_name}}!

Hi {{user_name}},

Thank you for subscribing to our notifications. We're excited to have you as a subscriber.

You'll receive email notifications for:
- New blog posts
- New thoughts and updates
- Important announcements

You can update your preferences or unsubscribe at any time by visiting: {{site_url}}/profile

Best regards,
{{site_name}}

---
To unsubscribe from all notifications, visit: {{unsubscribe_url}}
        `,
        variables: ['site_name', 'user_name', 'site_url', 'unsubscribe_url'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      unsubscribe_confirmation: {
        id: 'unsubscribe_confirmation',
        templateName: 'unsubscribe_confirmation',
        templateType: 'system',
        subjectTemplate: 'Unsubscribed from {{site_name}}',
        htmlTemplate: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Unsubscribed from {{site_name}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #6c757d; color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
              .content { margin-bottom: 30px; }
              .footer { border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666; }
              .button { background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Successfully Unsubscribed</h1>
              <p>You have been removed from our mailing list</p>
            </div>
            
            <div class="content">
              <p>Hi {{user_name}},</p>
              <p>We've successfully unsubscribed you from {{site_name}} email notifications.</p>
              
              <p>You will no longer receive:</p>
              <ul>
                <li>Blog post notifications</li>
                <li>Thought updates</li>
                <li>Announcements</li>
              </ul>
              
              <p>We're sorry to see you go, but we understand. If you change your mind, you can always resubscribe by visiting our website.</p>
              
              <a href="{{site_url}}/signup" class="button">Resubscribe</a>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>{{site_name}}</p>
            </div>
          </body>
          </html>
        `,
        textTemplate: `
Successfully Unsubscribed from {{site_name}}

Hi {{user_name}},

We've successfully unsubscribed you from {{site_name}} email notifications.

You will no longer receive:
- Blog post notifications
- Thought updates
- Announcements

We're sorry to see you go, but we understand. If you change your mind, you can always resubscribe by visiting: {{site_url}}/signup

Best regards,
{{site_name}}
        `,
        variables: ['site_name', 'user_name', 'site_url'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };
    
    return templates[templateName as keyof typeof templates] || null;
  }
  
  // Template management methods
  async saveTemplate(template: EmailTemplate): Promise<void> {
    if (!this.authDB) {
      throw new Error('Database not available for template storage');
    }
    
    await this.authDB.createEmailTemplate({
      templateName: template.templateName,
      templateType: template.templateType,
      subjectTemplate: template.subjectTemplate,
      htmlTemplate: template.htmlTemplate,
      textTemplate: template.textTemplate,
      variables: template.variables
    });
  }
  
  async initializeDefaultTemplates(): Promise<void> {
    if (!this.authDB) {
      console.warn('Database not available for template initialization');
      return;
    }
    
    const defaultTemplates = [
      'blog_notification',
      'thought_notification',
      'welcome_email',
      'unsubscribe_confirmation'
    ];
    
    // Note: email_templates table was removed in migration 0013
    // Template initialization no longer needed
  }
  
  // Test method to validate template rendering
  async testTemplate(templateName: string, testVariables: TemplateVariables): Promise<{ success: boolean; error?: string; result?: any }> {
    try {
      const result = await this.renderTemplate(templateName, testVariables);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}