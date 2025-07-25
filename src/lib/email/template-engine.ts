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
    console.log(`[TemplateEngine] Rendering template: ${templateName}`);
    console.log('[TemplateEngine] Variables:', JSON.stringify(variables, null, 2));
    
    const template = await this.getTemplate(templateName);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    
    // Validate template variables
    this.validateTemplateVariables(template, variables);
    
    const result = {
      subject: this.interpolateTemplate(template.subjectTemplate, variables, false),
      html: this.interpolateTemplate(template.htmlTemplate, variables, true),
      text: this.interpolateTemplate(template.textTemplate, variables, false)
    };
    
    console.log('[TemplateEngine] Rendered subject:', result.subject);
    console.log('[TemplateEngine] HTML preview (first 300 chars):', result.html.substring(0, 300));
    
    return result;
  }
  
  private interpolateTemplate(template: string, variables: TemplateVariables, shouldSanitize: boolean = true): string {
    console.log('[TemplateEngine] Starting interpolation');
    console.log('[TemplateEngine] Template length:', template.length);
    console.log('[TemplateEngine] Variables keys:', Object.keys(variables));
    console.log('[TemplateEngine] First 200 chars of template:', template.substring(0, 200));
    
    const result = template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key as keyof TemplateVariables];
      console.log(`[TemplateEngine] Processing ${match}: key="${key}", value="${value}", type=${typeof value}`);
      
      if (value === undefined) {
        console.warn(`Template variable not found: ${key}`);
        return match;
      }
      const stringValue = Array.isArray(value) ? value.join(', ') : String(value);
      
      // Skip sanitization if disabled (for subjects and plain text)
      if (!shouldSanitize) {
        return stringValue;
      }
      
      // Don't sanitize URLs or safe content
      if (key.includes('url') || key === 'site_name' || key === 'user_name') {
        return stringValue;
      }
      
      // Sanitize potentially dangerous content
      return this.sanitizeHtml(stringValue);
    });
    
    console.log('[TemplateEngine] Result first 200 chars:', result.substring(0, 200));
    return result;
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
    console.log(`[TemplateEngine] Getting default template: ${templateName}`);
    
    // For now, return hardcoded templates. In production, these would be stored in the database
    const templates = {
      blog_notification: {
        id: 'blog_notification',
        templateName: 'blog_notification',
        templateType: 'blog',
        subjectTemplate: 'Hey {{user_name}}, I wrote about {{title}}',
        htmlTemplate: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{{title}}</title>
          </head>
          <body style="font-family: Georgia, serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="margin-bottom: 30px;">
              <p>Hey {{user_name}},</p>
              
              <p>I just published a new blog post and thought you might enjoy it.</p>
              
              <p style="margin: 20px 0;"><strong>{{title}}</strong></p>
              
              <p style="margin: 15px 0;">{{description}}</p>
              
              <p>If you're interested, you can read the full post here:<br>
              <a href="{{url}}" style="color: #0066cc;">{{url}}</a></p>
              
              <p>Thanks for being a reader,<br>
              Emily</p>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>You're receiving this because you subscribed to updates from {{site_name}}. If you'd prefer not to get these emails, you can <a href="{{unsubscribe_url}}" style="color: #666;">unsubscribe here</a>.</p>
            </div>
          </body>
          </html>
        `,
        textTemplate: `
Hey {{user_name}},

I just published a new blog post and thought you might enjoy it.

{{title}}

{{description}}

If you're interested, you can read the full post here:
{{url}}

Thanks for being a reader,
Emily

---
You're receiving this because you subscribed to updates from {{site_name}}. If you'd prefer not to get these emails, you can unsubscribe here: {{unsubscribe_url}}
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
        subjectTemplate: 'Quick thought from Emily',
        htmlTemplate: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{{title}}</title>
          </head>
          <body style="font-family: Georgia, serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="margin-bottom: 30px;">
              <p>Hi {{user_name}},</p>
              
              <p>Just sharing a quick thought with you:</p>
              
              <blockquote style="margin: 20px 0; padding-left: 20px; border-left: 3px solid #ddd; font-style: italic; color: #555;">
                {{content}}
              </blockquote>
              
              <p>You can see the full context on my site if you'd like:<br>
              <a href="{{url}}" style="color: #0066cc;">{{url}}</a></p>
              
              <p>Hope you're having a good day,<br>
              Emily</p>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>You're getting this because you subscribed to my thoughts. If you'd rather not receive these, you can <a href="{{unsubscribe_url}}" style="color: #666;">unsubscribe here</a>.</p>
            </div>
          </body>
          </html>
        `,
        textTemplate: `
Hi {{user_name}},

Just sharing a quick thought with you:

"{{content}}"

You can see the full context on my site if you'd like:
{{url}}

Hope you're having a good day,
Emily

---
You're getting this because you subscribed to my thoughts. If you'd rather not receive these, you can unsubscribe here: {{unsubscribe_url}}
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
        subjectTemplate: 'Thanks for subscribing, {{user_name}}',
        htmlTemplate: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome</title>
          </head>
          <body style="font-family: Georgia, serif; line-height: 1.7; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="margin-bottom: 30px;">
              <p>Hi {{user_name}},</p>
              
              <p>Thanks for subscribing to my blog updates! I really appreciate your interest.</p>
              
              <p>I'll send you a note when I publish new blog posts or share quick thoughts. I try to keep the emails minimal and only send them when I have something worth sharing.</p>
              
              <p>If you ever want to change your preferences or unsubscribe, just click the link at the bottom of any email I send.</p>
              
              <p>Looking forward to sharing my writing with you!</p>
              
              <p>Best,<br>
              Emily</p>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
              <p>If you change your mind, you can <a href="{{unsubscribe_url}}" style="color: #666;">unsubscribe anytime</a>.</p>
            </div>
          </body>
          </html>
        `,
        textTemplate: `
Hi {{user_name}},

Thanks for subscribing to my blog updates! I really appreciate your interest.

I'll send you a note when I publish new blog posts or share quick thoughts. I try to keep the emails minimal and only send them when I have something worth sharing.

If you ever want to change your preferences or unsubscribe, just click the link at the bottom of any email I send.

Looking forward to sharing my writing with you!

Best,
Emily

---
If you change your mind, you can unsubscribe anytime: {{unsubscribe_url}}
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
    
    const template = templates[templateName as keyof typeof templates] || null;
    if (template) {
      console.log(`[TemplateEngine] Found template ${templateName}`);
      console.log(`[TemplateEngine] Subject template: ${template.subjectTemplate}`);
      console.log(`[TemplateEngine] HTML template first 100 chars: ${template.htmlTemplate.substring(0, 100)}`);
    } else {
      console.log(`[TemplateEngine] Template ${templateName} not found`);
    }
    
    return template;
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