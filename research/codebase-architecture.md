# Codebase Architecture Analysis

## Technology Stack Overview

### Frontend
- **Framework**: Astro 5.1.3 (Static Site Generator with SSR)
- **UI Components**: Svelte components for interactivity
- **Styling**: Custom CSS with CSS variables for theming
- **Build Tool**: Astro with TypeScript support
- **Deployment**: Cloudflare Workers/Pages

### Backend
- **Runtime**: Cloudflare Workers (serverless)
- **Database**: Cloudflare D1 (SQLite-based)
- **Authentication**: JWT tokens with HTTP-only cookies
- **Password Security**: PBKDF2 hashing with Web Crypto API
- **Session Management**: Database-backed with automatic cleanup

### Infrastructure
- **Hosting**: Cloudflare Workers
- **Database**: Cloudflare D1 with local/remote development support
- **Asset Management**: Cloudflare Workers static assets
- **Configuration**: Wrangler configuration with environment variables

## Current Data Models

### User Model
```typescript
interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  emailBlogUpdates?: boolean;        // Blog post notifications
  emailThoughtUpdates?: boolean;     // Thought notifications  
  emailAnnouncements?: boolean;      // Announcement notifications
}
```

### Database Schema
- **users**: Core user data with email preferences already implemented
- **sessions**: JWT session management with expiration
- **user_profiles**: Extended user information (display name, bio, avatar)

### Content Models
- **Blog Posts**: Markdown files with frontmatter (`src/data/blog-posts/published/`)
- **Thoughts**: Markdown files with frontmatter (`src/data/thoughts/published/`)
- **Tags**: Extracted from content frontmatter for categorization

## Authentication & Authorization

### JWT-Based Authentication
- **Token Generation**: Uses `jose` library for JWT creation/verification
- **Session Management**: Database-backed sessions with 7-day expiration
- **Cookie Security**: HTTP-only, Secure, SameSite=Strict
- **Password Security**: PBKDF2 with 100,000 iterations

### Route Protection
- **Middleware**: `/src/middleware.ts` handles authentication for protected routes
- **Protected Routes**: `/admin/*`, `/profile`, `/api/auth/me`
- **Public Routes**: `/login`, `/signup`, static assets
- **Optional Auth**: Other routes attempt authentication but don't require it

## API Design Patterns

### Current API Structure
```
/api/auth/
├── signup.ts      # User registration with email preferences
├── login.ts       # User authentication
├── logout.ts      # Session termination
├── me.ts          # Current user info
└── status.ts      # Authentication status
```

### Response Patterns
- **Consistent JSON responses** with error handling
- **HTTP status codes** following REST conventions
- **Cookie-based authentication** with secure settings
- **Input validation** on all endpoints

## Content Management System

### File-Based Content
- **Blog Posts**: Markdown files with comprehensive frontmatter
- **Thoughts**: Lighter markdown files with minimal frontmatter
- **Static Generation**: Content processed at build time
- **Live Preview**: Content interface for local editing

### Content Structure
```
src/data/
├── blog-posts/
│   ├── published/     # Live blog posts
│   └── draft/         # Draft posts
├── thoughts/
│   ├── published/     # Live thoughts
│   ├── draft/         # Draft thoughts
│   └── spicy-takes/   # Categorized thoughts
└── museum-config.json # Project portfolio data
```

## Frontend State Management

### Minimal State Approach
- **No global state management** (Redux, Zustand, etc.)
- **Component-level state** using Svelte stores where needed
- **Authentication state** managed via HTTP-only cookies
- **Theme state** persisted in localStorage

### Form Handling
- **Vanilla JavaScript** for form submissions
- **Fetch API** for API communication
- **Client-side validation** with server-side validation
- **Error handling** with user-friendly messages

## Configuration Management

### Environment Variables
- **JWT_SECRET**: Token signing secret
- **Database Configuration**: D1 database binding
- **Deployment Settings**: Wrangler configuration

### Development vs Production
- **Local Development**: Uses `wrangler dev` with D1 local database
- **Production**: Cloudflare Workers with remote D1 database
- **Configuration Files**: `wrangler.json` for both environments

## Build System & Deployment

### Build Process
- **Astro Build**: Static site generation with server routes
- **TypeScript Compilation**: Type checking and compilation
- **Asset Optimization**: Sharp for image processing
- **Cloudflare Adapter**: Workers-compatible output

### Deployment Pipeline
```bash
npm run build     # Build static site
wrangler deploy   # Deploy to Cloudflare Workers
```

### Development Tools
- **Makefile**: Extensive user management and development commands
- **Database Migrations**: Automated schema updates
- **Content Interface**: Local content creation tool

## Testing Patterns

### Current Testing Approach
- **No formal testing framework** implemented
- **Manual testing** via development commands
- **User management commands** for testing auth flow
- **Database inspection** tools via Makefile

## Email Integration Considerations

### Database Foundation
- **Email preferences already implemented** in user model
- **Three notification types**: blog updates, thought updates, announcements
- **User subscription status** tracked per notification type

### Implementation Approaches for Email Service

#### 1. Cloudflare Workers Email API
- **Cloudflare Email Workers** for sending emails
- **Simple email templates** for notifications
- **Queue-based processing** for bulk notifications

#### 2. External Email Service Integration
- **SendGrid/Mailgun/Resend** integration
- **API key management** via environment variables
- **Template management** for different notification types

#### 3. Webhook-Based Notifications
- **GitHub Actions trigger** on content deployment
- **Webhook endpoints** for content publication
- **Batch processing** for subscriber notifications

## Required Components for Email Notifications

### Email Service Layer
```typescript
// src/lib/email/service.ts
interface EmailService {
  sendBlogNotification(users: User[], post: BlogPost): Promise<void>;
  sendThoughtNotification(users: User[], thought: Thought): Promise<void>;
  sendAnnouncement(users: User[], announcement: Announcement): Promise<void>;
}
```

### Notification Queue System
```typescript
// src/lib/notifications/queue.ts
interface NotificationQueue {
  queueBlogNotification(postId: string): Promise<void>;
  queueThoughtNotification(thoughtId: string): Promise<void>;
  processQueue(): Promise<void>;
}
```

### Template System
```typescript
// src/lib/email/templates.ts
interface EmailTemplate {
  generateBlogNotification(post: BlogPost): EmailContent;
  generateThoughtNotification(thought: Thought): EmailContent;
  generateAnnouncement(announcement: Announcement): EmailContent;
}
```

### Subscriber Management
```typescript
// src/lib/email/subscribers.ts
interface SubscriberService {
  getBlogSubscribers(): Promise<User[]>;
  getThoughtSubscribers(): Promise<User[]>;
  getAnnouncementSubscribers(): Promise<User[]>;
  updatePreferences(userId: string, preferences: EmailPreferences): Promise<void>;
}
```

## Security Considerations

### Email Security
- **SPF/DKIM configuration** for sender reputation
- **Unsubscribe token security** to prevent abuse
- **Rate limiting** for email sending

### Data Protection
- **Email address encryption** in database
- **GDPR compliance** for EU users
- **Data retention policies** for notifications

## Performance Considerations

### Scalability
- **Batch processing** for large subscriber lists
- **Cloudflare Workers limits** (CPU time, memory)
- **Database query optimization** for subscriber lists

### Reliability
- **Email delivery monitoring** and retry logic
- **Queue processing** resilience
- **Fallback mechanisms** for service failures

## Integration Points

### Content Publication Hooks
- **Build process integration** to trigger notifications
- **API endpoints** for manual notification triggers
- **Admin interface** for managing notifications

### User Preference Management
- **Profile page enhancement** to manage email preferences
- **API endpoints** for preference updates
- **Unsubscribe functionality** with secure tokens

### Notification History
- **Database table** for sent notifications
- **Admin dashboard** for notification status
- **Analytics** for email engagement

## Next Steps for Implementation

1. **Email Service Integration**: Choose and implement email provider
2. **Database Extensions**: Add notification tracking tables
3. **Content Processing**: Implement content change detection
4. **Template System**: Create email templates for different notification types
5. **Queue System**: Implement background email processing
6. **API Extensions**: Add preference management endpoints
7. **Frontend Components**: Build preference management UI
8. **Security Implementation**: Add unsubscribe token system