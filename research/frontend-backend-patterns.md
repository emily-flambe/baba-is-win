# Frontend-Backend Communication Patterns Analysis

## Overview
Comprehensive analysis of frontend-backend communication patterns to inform implementation of email notification preference management.

## API Architecture

### Current API Design Patterns

#### File-Based Routing
- **Location**: `/src/pages/api/`
- **Framework**: Astro's file-based routing system
- **Runtime**: Cloudflare Workers with server-side rendering
- **Prerender**: All API routes use `export const prerender = false`

#### API Route Structure
```
/api/auth/
├── signup.ts      # User registration with email preferences
├── login.ts       # User authentication
├── logout.ts      # Session termination
├── me.ts          # Current user info
└── status.ts      # Authentication status
```

#### Response Format Standards
```typescript
// Success response
{
  success: true,
  data: { ... },
  user?: User
}

// Error response
{
  error: "Error message",
  details?: string
}
```

### HTTP Status Code Conventions
- **200**: Success with data
- **201**: Created (user registration)
- **400**: Bad request (validation errors)
- **401**: Unauthorized (authentication required)
- **404**: Not found
- **500**: Internal server error

## Authentication Flow

### JWT-Based Authentication
```typescript
// Middleware authentication check
export const onRequest: MiddlewareHandler = async (context, next) => {
  const { url, cookies, locals } = context;
  const token = cookies.get('authToken')?.value;
  
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      locals.user = {
        id: payload.sub as string,
        email: payload.email as string,
        username: payload.username as string
      };
    } catch (error) {
      cookies.delete('authToken', { path: '/' });
    }
  }
  
  // Route protection logic
  if (isProtectedRoute(url.pathname) && !locals.user) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login' }
    });
  }
  
  return next();
};
```

### Cookie-Based Session Management
```typescript
// Secure cookie configuration
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/'
};

// Set authentication cookie
cookies.set('authToken', token, cookieOptions);
```

### User Context Injection
```typescript
// Available in all routes and components
interface AstroLocals {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}
```

## Frontend Component Architecture

### Technology Stack
- **Framework**: Astro with SSR capabilities
- **Reactive Components**: Svelte for interactivity
- **Styling**: Custom CSS with CSS variables
- **State Management**: No global state library

### Form Handling Patterns

#### Registration Form Example
```typescript
// Frontend form submission
async function handleSubmit(event: Event) {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  
  // Show loading state
  setLoading(true);
  
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // Success - redirect
      window.location.href = '/';
    } else {
      // Show error
      showError(result.error);
    }
  } catch (error) {
    showError('Registration failed. Please try again.');
  } finally {
    setLoading(false);
  }
}
```

#### Form Validation Patterns
```html
<!-- Client-side validation -->
<form id="signup-form">
  <input 
    type="email" 
    name="email" 
    required 
    placeholder="Email address"
  />
  <input 
    type="text" 
    name="username" 
    required 
    minlength="3"
    pattern="[a-zA-Z0-9_-]+"
    title="Username can only contain letters, numbers, underscores, and hyphens"
  />
  <input 
    type="password" 
    name="password" 
    required 
    minlength="8"
    placeholder="Password (minimum 8 characters)"
  />
  
  <!-- Email preferences -->
  <div class="checkbox-group">
    <label>
      <input type="checkbox" name="emailBlogUpdates" />
      <span>Email me about new blog posts</span>
    </label>
    <label>
      <input type="checkbox" name="emailThoughtUpdates" />
      <span>Email me about new thoughts</span>
    </label>
    <label>
      <input type="checkbox" name="emailAnnouncements" />
      <span>Email me about announcements</span>
    </label>
  </div>
  
  <button type="submit">Create Account</button>
</form>
```

### Error Handling and User Feedback

#### Error Display System
```css
/* Error styling */
.error-message {
  background: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  display: none;
}

.error-message.show {
  display: block;
}

.success-message {
  background: #efe;
  color: #393;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
}
```

#### JavaScript Error Handling
```typescript
function showError(message: string) {
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorDiv.classList.remove('show');
    }, 5000);
  }
}

function showSuccess(message: string) {
  const successDiv = document.getElementById('success-message');
  if (successDiv) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
  }
}
```

### Loading States
```typescript
function setLoading(isLoading: boolean) {
  const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
  const loadingSpinner = document.getElementById('loading-spinner');
  
  if (isLoading) {
    submitButton.disabled = true;
    submitButton.textContent = 'Creating Account...';
    loadingSpinner?.classList.add('show');
  } else {
    submitButton.disabled = false;
    submitButton.textContent = 'Create Account';
    loadingSpinner?.classList.remove('show');
  }
}
```

## Configuration Management

### Environment Variables
```typescript
// Astro configuration
export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    }
  }),
  integrations: [svelte()]
});
```

### Runtime Environment Access
```typescript
// Access environment in API routes
export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  const jwtSecret = env.JWT_SECRET;
  
  // Use environment variables
};
```

## Data Flow Patterns

### Authentication State Management
```typescript
// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/me');
    if (response.ok) {
      const { user } = await response.json();
      return user;
    }
  } catch (error) {
    console.log('Not authenticated');
  }
  return null;
}
```

### Conditional Rendering
```astro
---
const user = Astro.locals.user;
---

<nav>
  {user ? (
    <div class="user-menu">
      <span>Welcome, {user.username}</span>
      <a href="/profile">Profile</a>
      <a href="/api/auth/logout">Logout</a>
    </div>
  ) : (
    <div class="auth-links">
      <a href="/login">Login</a>
      <a href="/signup">Sign Up</a>
    </div>
  )}
</nav>
```

## Build and Deployment Patterns

### Build Process
```bash
# Development
npm run dev      # Astro dev server with wrangler
npm run build    # Build for production
npm run preview  # Preview production build

# Deployment
wrangler deploy  # Deploy to Cloudflare Workers
```

### Asset Management
```typescript
// Static asset handling
import { defineConfig } from 'astro/config';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  vite: {
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: 'src/assets/images',
            dest: 'assets'
          }
        ]
      })
    ]
  }
});
```

## Email Preferences Management Patterns

### Recommended API Endpoints
```typescript
// GET /api/user/preferences - Get current preferences
export const GET: APIRoute = async ({ locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  const user = await authDB.getUserById(locals.user.id);
  const preferences = {
    emailBlogUpdates: user.emailBlogUpdates,
    emailThoughtUpdates: user.emailThoughtUpdates,
    emailAnnouncements: user.emailAnnouncements
  };
  
  return new Response(JSON.stringify({ preferences }), { status: 200 });
};

// PUT /api/user/preferences - Update preferences
export const PUT: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  try {
    const preferences = await request.json();
    await authDB.updateUserPreferences(locals.user.id, preferences);
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update preferences' }), { status: 500 });
  }
};
```

### Frontend Preference Component
```typescript
// Email preferences component
class EmailPreferences {
  private preferences: EmailPreferences;
  
  constructor() {
    this.loadPreferences();
  }
  
  async loadPreferences() {
    try {
      const response = await fetch('/api/user/preferences');
      if (response.ok) {
        const { preferences } = await response.json();
        this.preferences = preferences;
        this.updateUI();
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }
  
  async updatePreferences(newPreferences: EmailPreferences) {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPreferences)
      });
      
      if (response.ok) {
        this.preferences = newPreferences;
        this.showSuccess('Preferences updated successfully');
      } else {
        this.showError('Failed to update preferences');
      }
    } catch (error) {
      this.showError('Network error. Please try again.');
    }
  }
  
  private updateUI() {
    // Update checkbox states
    const blogCheckbox = document.getElementById('emailBlogUpdates') as HTMLInputElement;
    const thoughtCheckbox = document.getElementById('emailThoughtUpdates') as HTMLInputElement;
    const announcementCheckbox = document.getElementById('emailAnnouncements') as HTMLInputElement;
    
    if (blogCheckbox) blogCheckbox.checked = this.preferences.emailBlogUpdates;
    if (thoughtCheckbox) thoughtCheckbox.checked = this.preferences.emailThoughtUpdates;
    if (announcementCheckbox) announcementCheckbox.checked = this.preferences.emailAnnouncements;
  }
  
  private showSuccess(message: string) {
    // Show success notification
  }
  
  private showError(message: string) {
    // Show error notification
  }
}
```

### Profile Page Integration
```astro
---
// Profile page with email preferences
const user = Astro.locals.user;
if (!user) {
  return Astro.redirect('/login');
}
---

<div class="profile-container">
  <h1>Profile Settings</h1>
  
  <section class="email-preferences">
    <h2>Email Notifications</h2>
    <form id="preferences-form">
      <div class="checkbox-group">
        <label>
          <input type="checkbox" id="emailBlogUpdates" name="emailBlogUpdates" />
          <span>Email me about new blog posts</span>
        </label>
        <label>
          <input type="checkbox" id="emailThoughtUpdates" name="emailThoughtUpdates" />
          <span>Email me about new thoughts</span>
        </label>
        <label>
          <input type="checkbox" id="emailAnnouncements" name="emailAnnouncements" />
          <span>Email me about announcements</span>
        </label>
      </div>
      
      <button type="submit">Save Preferences</button>
    </form>
  </section>
</div>

<script>
  // Initialize preference management
  const preferencesManager = new EmailPreferences();
  
  // Handle form submission
  document.getElementById('preferences-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const preferences = {
      emailBlogUpdates: formData.get('emailBlogUpdates') === 'on',
      emailThoughtUpdates: formData.get('emailThoughtUpdates') === 'on',
      emailAnnouncements: formData.get('emailAnnouncements') === 'on'
    };
    
    await preferencesManager.updatePreferences(preferences);
  });
</script>
```

## Unsubscribe System Patterns

### Unsubscribe Endpoint
```typescript
// POST /api/user/unsubscribe
export const POST: APIRoute = async ({ request }) => {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return new Response(JSON.stringify({ error: 'Token required' }), { status: 400 });
    }
    
    // Validate and process unsubscribe token
    const userId = await UnsubscribeTokenService.validateAndUnsubscribe(token);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully unsubscribed from all emails' 
    }), { status: 200 });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Invalid or expired unsubscribe token' 
    }), { status: 400 });
  }
};
```

### Unsubscribe Page
```astro
---
const { token } = Astro.url.searchParams;
---

<div class="unsubscribe-container">
  <h1>Unsubscribe from Email Notifications</h1>
  
  {token ? (
    <div>
      <p>Are you sure you want to unsubscribe from all email notifications?</p>
      <button id="unsubscribe-btn" data-token={token}>Yes, Unsubscribe</button>
      <button id="cancel-btn">Cancel</button>
    </div>
  ) : (
    <p>Invalid unsubscribe link. Please check your email for the correct link.</p>
  )}
</div>

<script>
  document.getElementById('unsubscribe-btn')?.addEventListener('click', async (e) => {
    const token = e.target.dataset.token;
    
    try {
      const response = await fetch('/api/user/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      if (response.ok) {
        document.querySelector('.unsubscribe-container').innerHTML = 
          '<h1>Successfully Unsubscribed</h1><p>You will no longer receive email notifications.</p>';
      } else {
        throw new Error('Unsubscribe failed');
      }
    } catch (error) {
      alert('Failed to unsubscribe. Please try again.');
    }
  });
</script>
```

## Performance Optimization Patterns

### Optimistic Updates
```typescript
async function updatePreferencesOptimistically(newPreferences: EmailPreferences) {
  // Update UI immediately
  this.updateUI(newPreferences);
  
  try {
    // Send to server
    const response = await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPreferences)
    });
    
    if (!response.ok) {
      // Rollback on failure
      this.updateUI(this.previousPreferences);
      throw new Error('Update failed');
    }
  } catch (error) {
    this.showError('Failed to update preferences');
  }
}
```

### Debounced Updates
```typescript
class DebouncedPreferences {
  private debounceTimer: number | null = null;
  
  updatePreferences(preferences: EmailPreferences) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      this.sendPreferencesToServer(preferences);
    }, 500);
  }
}
```

## Security Patterns

### CSRF Protection
```typescript
// Using SameSite cookies for CSRF protection
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const
};
```

### Input Validation
```typescript
function validatePreferences(preferences: any): EmailPreferences {
  return {
    emailBlogUpdates: Boolean(preferences.emailBlogUpdates),
    emailThoughtUpdates: Boolean(preferences.emailThoughtUpdates),
    emailAnnouncements: Boolean(preferences.emailAnnouncements)
  };
}
```

## Implementation Recommendations

### 1. API Design
- Follow existing response format patterns
- Use consistent error handling
- Implement proper HTTP status codes
- Add request validation

### 2. Frontend Components
- Create reusable preference components
- Implement optimistic updates
- Add loading states and error handling
- Use consistent styling patterns

### 3. Integration Points
- Extend existing middleware for route protection
- Add preference management to profile page
- Create dedicated unsubscribe flow
- Implement preference change tracking

### 4. Performance Considerations
- Implement debounced updates for rapid changes
- Use optimistic updates for better UX
- Add proper loading states
- Cache frequently accessed data

This analysis provides a comprehensive foundation for implementing email notification preference management within the existing architectural patterns, ensuring consistency and maintainability while following established security and performance best practices.