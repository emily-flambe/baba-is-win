# Email Notifications System - Usage Examples

## Overview

This document provides practical examples of how to use the email notifications system, including common use cases, code snippets, and integration patterns.

## Table of Contents

1. [Basic User Management](#basic-user-management)
2. [Email Preferences](#email-preferences)
3. [Sending Notifications](#sending-notifications)
4. [Template Customization](#template-customization)
5. [Admin Operations](#admin-operations)
6. [Integration Examples](#integration-examples)
7. [Automation Scripts](#automation-scripts)
8. [Monitoring and Analytics](#monitoring-and-analytics)

## Basic User Management

### User Registration with Email Preferences

```javascript
// Register new user with email preferences
const response = await fetch('/api/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    username: 'newuser',
    password: 'securepassword123',
    // Email preferences
    emailBlogUpdates: true,
    emailThoughtUpdates: true,
    emailAnnouncements: false
  })
});

const result = await response.json();
console.log('User registered:', result.data.user);
```

### User Login and Token Management

```javascript
// Login user and get JWT token
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword123'
  })
});

const { data: { token, user } } = await loginResponse.json();

// Store token for future requests
localStorage.setItem('authToken', token);

// Use token for authenticated requests
const authenticatedRequest = {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};
```

## Email Preferences

### Get User Preferences

```javascript
// Get current user's email preferences
const getPreferences = async () => {
  const response = await fetch('/api/user/preferences', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
  });
  
  const { data } = await response.json();
  return data;
};

// Usage
const preferences = await getPreferences();
console.log('Email preferences:', preferences);
// {
//   emailBlogUpdates: true,
//   emailThoughtUpdates: true,
//   emailAnnouncements: false,
//   unsubscribeAll: false,
//   emailVerified: true,
//   emailStatus: "active"
// }
```

### Update Email Preferences

```javascript
// Update user's email preferences
const updatePreferences = async (newPreferences) => {
  const response = await fetch('/api/user/preferences', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newPreferences)
  });
  
  return await response.json();
};

// Usage examples
await updatePreferences({
  emailBlogUpdates: false,
  emailThoughtUpdates: true,
  emailAnnouncements: true
});

// Disable all notifications
await updatePreferences({
  emailBlogUpdates: false,
  emailThoughtUpdates: false,
  emailAnnouncements: false
});
```

### Preference Management Component (React)

```jsx
import React, { useState, useEffect } from 'react';

const EmailPreferences = () => {
  const [preferences, setPreferences] = useState({
    emailBlogUpdates: false,
    emailThoughtUpdates: false,
    emailAnnouncements: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const { data } = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (newPreferences) => {
    setSaving(true);
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPreferences)
      });
      
      if (response.ok) {
        setPreferences(newPreferences);
        alert('Preferences updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      alert('Failed to update preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    const newPreferences = { ...preferences, [field]: value };
    setPreferences(newPreferences);
    updatePreferences(newPreferences);
  };

  if (loading) return <div>Loading preferences...</div>;

  return (
    <div className="email-preferences">
      <h3>Email Notification Preferences</h3>
      
      <div className="preference-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.emailBlogUpdates}
            onChange={(e) => handleChange('emailBlogUpdates', e.target.checked)}
            disabled={saving}
          />
          Blog Post Notifications
        </label>
        <p>Get notified when new blog posts are published</p>
      </div>

      <div className="preference-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.emailThoughtUpdates}
            onChange={(e) => handleChange('emailThoughtUpdates', e.target.checked)}
            disabled={saving}
          />
          Thought Updates
        </label>
        <p>Get notified when new thoughts are shared</p>
      </div>

      <div className="preference-item">
        <label>
          <input
            type="checkbox"
            checked={preferences.emailAnnouncements}
            onChange={(e) => handleChange('emailAnnouncements', e.target.checked)}
            disabled={saving}
          />
          Announcements
        </label>
        <p>Get notified about important announcements</p>
      </div>

      {saving && <div className="saving-indicator">Saving...</div>}
    </div>
  );
};

export default EmailPreferences;
```

## Sending Notifications

### Automatic Blog Post Notifications

```javascript
// Trigger notification when new blog post is published
const publishBlogPost = async (blogPost) => {
  // 1. Save blog post to database
  const post = await saveBlogPost(blogPost);
  
  // 2. Create content item for notifications
  const contentItem = {
    slug: post.slug,
    contentType: 'blog',
    title: post.title,
    description: post.description,
    publishDate: new Date(),
    notificationSent: false
  };
  
  await createContentItem(contentItem);
  
  // 3. Trigger notification (usually done via cron job)
  // This can be done immediately or scheduled
  const notificationService = new EmailNotificationService(env, db);
  await notificationService.sendBlogNotification(post);
  
  return post;
};
```

### Manual Notification Sending (Admin)

```javascript
// Send notification manually from admin interface
const sendManualNotification = async (contentId, contentType, force = false) => {
  const response = await fetch('/api/admin/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'send_notification',
      contentId,
      contentType,
      force
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log(`Notification sent: ${result.message}`);
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
};

// Usage
await sendManualNotification('my-blog-post', 'blog');
await sendManualNotification('my-thought', 'thought', true); // Force resend
```

### Batch Notification Processing

```javascript
// Process multiple notifications efficiently
const processBatchNotifications = async (notifications) => {
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(notifications.length / batchSize)}`);
    
    const batchPromises = batch.map(notification => 
      sendNotification(notification).catch(error => ({
        error,
        notification
      }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Rate limiting: wait between batches
    if (i + batchSize < notifications.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
};
```

## Template Customization

### Create Custom Email Template

```javascript
// Define custom email template
const customTemplate = {
  templateName: 'special_announcement',
  templateType: 'announcement',
  subjectTemplate: '🎉 Special Announcement: {{title}}',
  htmlTemplate: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>{{title}}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white; 
          padding: 30px; 
          border-radius: 10px; 
          text-align: center; 
        }
        .content { 
          padding: 30px 0; 
        }
        .cta-button { 
          background: #667eea; 
          color: white; 
          padding: 12px 30px; 
          text-decoration: none; 
          border-radius: 25px; 
          display: inline-block; 
          margin: 20px 0; 
        }
        .footer { 
          border-top: 1px solid #eee; 
          padding-top: 20px; 
          color: #666; 
          font-size: 12px; 
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>{{title}}</h1>
      </div>
      
      <div class="content">
        <p>Hi {{user_name}},</p>
        
        <p>{{description}}</p>
        
        <a href="{{url}}" class="cta-button">Learn More</a>
      </div>
      
      <div class="footer">
        <p>Best regards,<br>The {{site_name}} Team</p>
        <p><a href="{{unsubscribe_url}}">Unsubscribe</a> from these notifications</p>
      </div>
    </body>
    </html>
  `,
  textTemplate: `
    {{title}}
    
    Hi {{user_name}},
    
    {{description}}
    
    Learn more: {{url}}
    
    Best regards,
    The {{site_name}} Team
    
    ---
    To unsubscribe: {{unsubscribe_url}}
  `,
  variables: ['title', 'description', 'url', 'unsubscribe_url', 'site_name', 'user_name']
};

// Save custom template
const saveCustomTemplate = async (template) => {
  const templateEngine = new EmailTemplateEngine(env, db);
  await templateEngine.saveTemplate(template);
};
```

### Template Testing

```javascript
// Test template rendering with sample data
const testTemplate = async (templateName) => {
  const testVariables = {
    title: 'Test Blog Post',
    description: 'This is a test blog post description.',
    url: 'https://example.com/test-post',
    unsubscribe_url: 'https://example.com/unsubscribe?token=test',
    publish_date: new Date().toLocaleDateString(),
    tags: ['test', 'example'],
    site_name: 'Test Site',
    site_url: 'https://example.com',
    user_name: 'Test User'
  };
  
  const templateEngine = new EmailTemplateEngine(env, db);
  const result = await templateEngine.testTemplate(templateName, testVariables);
  
  if (result.success) {
    console.log('Template test successful:');
    console.log('Subject:', result.result.subject);
    console.log('HTML length:', result.result.html.length);
    console.log('Text length:', result.result.text.length);
  } else {
    console.error('Template test failed:', result.error);
  }
  
  return result;
};

// Usage
await testTemplate('blog_notification');
await testTemplate('custom_announcement');
```

## Admin Operations

### Admin Dashboard Data

```javascript
// Get comprehensive admin dashboard data
const getAdminDashboard = async () => {
  const response = await fetch('/api/admin/notifications', {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  const { data } = await response.json();
  return data;
};

// Usage
const dashboardData = await getAdminDashboard();
console.log('Statistics:', dashboardData.stats);
console.log('Subscribers:', dashboardData.subscriberStats);
console.log('Recent notifications:', dashboardData.recentNotifications);
console.log('Unnotified content:', dashboardData.unnotifiedContent);
```

### Bulk Operations

```javascript
// Retry all failed notifications
const retryFailedNotifications = async () => {
  const response = await fetch('/api/admin/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'retry_failed'
    })
  });
  
  const result = await response.json();
  console.log('Retry result:', result.message);
  return result;
};

// Send notifications for all unnotified content
const processUnnotifiedContent = async () => {
  const dashboard = await getAdminDashboard();
  const unnotifiedContent = dashboard.unnotifiedContent;
  
  const results = [];
  for (const content of unnotifiedContent) {
    try {
      const result = await sendManualNotification(content.slug, content.contentType);
      results.push({ content, result, success: true });
    } catch (error) {
      results.push({ content, error: error.message, success: false });
    }
  }
  
  return results;
};
```

### User Management

```javascript
// Get user statistics
const getUserStats = async () => {
  const response = await fetch('/api/admin/users/stats', {
    headers: {
      'Authorization': `Bearer ${adminToken}`
    }
  });
  
  return await response.json();
};

// Find users with specific preferences
const findUsersByPreferences = async (preferences) => {
  const response = await fetch('/api/admin/users/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ preferences })
  });
  
  return await response.json();
};

// Usage
const blogSubscribers = await findUsersByPreferences({
  emailBlogUpdates: true,
  unsubscribeAll: false
});
```

## Integration Examples

### Webhook Integration

```javascript
// Handle incoming webhook events
const handleEmailWebhook = async (event) => {
  const { type, data } = event;
  
  switch (type) {
    case 'email.bounced':
      await handleEmailBounce(data);
      break;
    case 'email.delivered':
      await handleEmailDelivery(data);
      break;
    case 'email.opened':
      await handleEmailOpen(data);
      break;
    case 'email.clicked':
      await handleEmailClick(data);
      break;
    default:
      console.log('Unknown webhook event:', type);
  }
};

const handleEmailBounce = async (data) => {
  const { email, reason } = data;
  
  // Mark user email as bounced
  await updateUserEmailStatus(email, 'bounced');
  
  // Log bounce event
  console.log(`Email bounced: ${email} - ${reason}`);
};
```

### CMS Integration

```javascript
// Integrate with headless CMS
const publishContentWithNotifications = async (cmsContent) => {
  // 1. Process content from CMS
  const processedContent = {
    slug: cmsContent.slug,
    title: cmsContent.title,
    description: cmsContent.description || cmsContent.excerpt,
    content: cmsContent.content,
    publishDate: new Date(cmsContent.publishDate),
    tags: cmsContent.tags || [],
    contentType: cmsContent.type // 'blog' or 'thought'
  };
  
  // 2. Save to local database
  await saveContentItem(processedContent);
  
  // 3. Trigger email notifications
  const notificationService = new EmailNotificationService(env, db);
  
  if (processedContent.contentType === 'blog') {
    await notificationService.sendBlogNotification(processedContent);
  } else if (processedContent.contentType === 'thought') {
    await notificationService.sendThoughtNotification(processedContent);
  }
  
  return processedContent;
};
```

### Social Media Integration

```javascript
// Cross-post to social media when sending email
const sendNotificationWithSocial = async (content) => {
  // 1. Send email notification
  const emailResult = await sendEmailNotification(content);
  
  // 2. Post to social media
  const socialPromises = [
    postToTwitter(content),
    postToLinkedIn(content),
    postToFacebook(content)
  ];
  
  const socialResults = await Promise.allSettled(socialPromises);
  
  return {
    email: emailResult,
    social: socialResults.map((result, index) => ({
      platform: ['twitter', 'linkedin', 'facebook'][index],
      success: result.status === 'fulfilled',
      error: result.reason?.message
    }))
  };
};
```

## Automation Scripts

### Scheduled Content Processing

```javascript
// Cron job to process notifications
const processNotificationsCron = async () => {
  console.log('Starting scheduled notification processing...');
  
  try {
    // 1. Find unprocessed content
    const unprocessedContent = await findUnprocessedContent();
    console.log(`Found ${unprocessedContent.length} unprocessed items`);
    
    // 2. Process each item
    for (const content of unprocessedContent) {
      try {
        await processContentNotification(content);
        await markContentAsProcessed(content.id);
        console.log(`Processed: ${content.title}`);
      } catch (error) {
        console.error(`Failed to process ${content.title}:`, error);
      }
    }
    
    // 3. Retry failed notifications
    await retryFailedNotifications();
    
    // 4. Clean up old data
    await cleanupOldNotifications();
    
    console.log('Scheduled notification processing completed');
  } catch (error) {
    console.error('Scheduled notification processing failed:', error);
  }
};

// Schedule with cron
// In wrangler.toml:
// [triggers]
// crons = ["0 */10 * * *"]  # Every 10 minutes
```

### Data Cleanup Script

```javascript
// Clean up old notification data
const cleanupOldData = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Remove old notification history
  await db.prepare(`
    DELETE FROM email_notification_history 
    WHERE created_at < ?
  `).bind(thirtyDaysAgo.toISOString()).run();
  
  // Remove expired unsubscribe tokens
  await db.prepare(`
    DELETE FROM unsubscribe_tokens 
    WHERE expires_at < ?
  `).bind(new Date().toISOString()).run();
  
  // Archive old email statistics
  await archiveOldStatistics();
  
  console.log('Data cleanup completed');
};
```

### User Migration Script

```javascript
// Migrate users from old system
const migrateUsers = async (oldUsers) => {
  const results = [];
  
  for (const oldUser of oldUsers) {
    try {
      const newUser = {
        email: oldUser.email,
        username: oldUser.username,
        // Set default preferences
        emailBlogUpdates: oldUser.subscribed !== false,
        emailThoughtUpdates: oldUser.subscribed !== false,
        emailAnnouncements: false,
        // Migration metadata
        migratedAt: new Date(),
        oldSystemId: oldUser.id
      };
      
      await createUser(newUser);
      results.push({ user: oldUser, success: true });
    } catch (error) {
      results.push({ user: oldUser, success: false, error: error.message });
    }
  }
  
  return results;
};
```

## Monitoring and Analytics

### Email Performance Analytics

```javascript
// Get email performance metrics
const getEmailAnalytics = async (dateRange) => {
  const response = await fetch('/api/admin/analytics/email', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate: dateRange.start,
      endDate: dateRange.end
    })
  });
  
  const analytics = await response.json();
  return analytics.data;
};

// Usage
const lastMonth = {
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date()
};

const analytics = await getEmailAnalytics(lastMonth);
console.log('Email metrics:', analytics);
```

### Real-time Monitoring

```javascript
// Real-time system monitoring
const monitorSystemHealth = async () => {
  const health = await fetch('/api/health').then(r => r.json());
  
  if (health.status !== 'healthy') {
    console.warn('System health degraded:', health);
    
    // Send alert
    await sendAlert({
      type: 'warning',
      message: 'Email system health degraded',
      details: health
    });
  }
  
  return health;
};

// Monitor queue size
const monitorQueueSize = async () => {
  const dashboard = await getAdminDashboard();
  const queueSize = dashboard.stats.pending;
  
  if (queueSize > 100) {
    console.warn(`Large queue size: ${queueSize}`);
    
    // Trigger additional processing
    await processNotificationsCron();
  }
  
  return queueSize;
};
```

### Custom Metrics

```javascript
// Track custom metrics
const trackCustomMetric = async (metricName, value, tags = {}) => {
  const metric = {
    name: metricName,
    value,
    tags,
    timestamp: new Date().toISOString()
  };
  
  // Send to monitoring service
  await sendMetric(metric);
  
  // Log for debugging
  console.log(`Metric: ${metricName} = ${value}`, tags);
};

// Usage
await trackCustomMetric('email.sent', 1, { type: 'blog', user_id: 'user123' });
await trackCustomMetric('email.bounce_rate', 0.05, { date: '2025-01-01' });
await trackCustomMetric('email.processing_time', 1250, { batch_size: 10 });
```

## Error Handling Patterns

### Retry Logic

```javascript
// Exponential backoff retry
const retryWithBackoff = async (operation, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

// Usage
const result = await retryWithBackoff(async () => {
  return await sendEmail(recipient, subject, content);
});
```

### Graceful Degradation

```javascript
// Graceful degradation for email failures
const sendNotificationWithFallback = async (notification) => {
  try {
    // Try primary email service
    await sendEmail(notification);
    return { success: true, method: 'email' };
  } catch (error) {
    console.warn('Email failed, trying fallback:', error.message);
    
    try {
      // Fallback to queuing for later
      await queueNotification(notification);
      return { success: true, method: 'queued' };
    } catch (queueError) {
      console.error('All notification methods failed:', queueError.message);
      return { success: false, error: queueError.message };
    }
  }
};
```

These examples provide a comprehensive foundation for using the email notifications system effectively. Adapt them to your specific needs and integrate them into your application workflow.

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Examples Repository:** https://github.com/your-repo/email-examples