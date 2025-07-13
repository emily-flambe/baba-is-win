# Testing Implementation for Email Notifications System

## Overview
This document provides comprehensive testing strategies for the email notifications system implemented in this Astro blog platform. The system includes database operations, email services, API endpoints, and frontend components that require thorough testing to ensure reliability and security.

## Testing Architecture

### Testing Framework: Vitest
The recommended testing framework for this TypeScript/Astro application is Vitest, which provides:
- Native TypeScript support
- Fast execution with Vite
- Jest-compatible API
- Built-in mocking capabilities
- Coverage reporting

### Test Environment Setup
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        }
      }
    }
  }
});
```

## Database Testing Strategy

### AuthDB Class Testing
```typescript
// tests/lib/auth/db.test.ts
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { AuthDB } from '../../../src/lib/auth/db';
import Database from 'better-sqlite3';

describe('AuthDB Email Notification Methods', () => {
  let db: Database.Database;
  let authDB: AuthDB;

  beforeEach(async () => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    
    // Run all migrations
    await runTestMigrations(db);
    
    authDB = new AuthDB(db as any);
  });

  afterEach(() => {
    db.close();
  });

  describe('createEmailNotification', () => {
    test('should create notification with valid params', async () => {
      const userId = 'test-user-id';
      const params = {
        userId,
        contentType: 'blog',
        contentId: 'test-post',
        contentTitle: 'Test Post',
        contentUrl: 'https://example.com/test-post',
        notificationType: 'new_content'
      };

      const notificationId = await authDB.createEmailNotification(params);
      
      expect(notificationId).toBeDefined();
      expect(typeof notificationId).toBe('string');
      
      // Verify notification was created
      const notification = await authDB.getNotificationById(notificationId);
      expect(notification).toMatchObject({
        userId,
        contentType: 'blog',
        status: 'pending'
      });
    });
  });

  describe('getSubscribersForContentType', () => {
    test('should return only active subscribers', async () => {
      // Setup test users
      await createTestUser(authDB, {
        email: 'active@test.com',
        emailBlogUpdates: true,
        emailStatus: 'active'
      });
      
      await createTestUser(authDB, {
        email: 'unsubscribed@test.com',
        emailBlogUpdates: true,
        emailStatus: 'unsubscribed'
      });

      const subscribers = await authDB.getSubscribersForContentType('blog');
      
      expect(subscribers).toHaveLength(1);
      expect(subscribers[0].email).toBe('active@test.com');
    });
  });
});
```

### Migration Testing
```typescript
// tests/migrations/migration.test.ts
import { describe, test, expect } from 'vitest';
import Database from 'better-sqlite3';
import { runMigration, rollbackMigration } from '../helpers/migrationHelpers';

describe('Email Notification Migrations', () => {
  test('should create email_notifications table', async () => {
    const db = new Database(':memory:');
    
    await runMigration(db, '0004_add_email_notifications.sql');
    
    // Verify table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables.some(t => t.name === 'email_notifications')).toBe(true);
    
    // Verify table structure
    const columns = db.prepare("PRAGMA table_info(email_notifications)").all();
    const columnNames = columns.map(c => c.name);
    
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('status');
    
    db.close();
  });

  test('should rollback migration successfully', async () => {
    const db = new Database(':memory:');
    
    await runMigration(db, '0004_add_email_notifications.sql');
    await rollbackMigration(db, 'rollback_0004.sql');
    
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables.some(t => t.name === 'email_notifications')).toBe(false);
    
    db.close();
  });
});
```

## Email Service Testing

### Gmail Auth Testing with Mocks
```typescript
// tests/lib/email/gmail-auth.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { GmailAuth } from '../../../src/lib/email/gmail-auth';

// Mock fetch globally
global.fetch = vi.fn();

describe('GmailAuth', () => {
  let gmailAuth: GmailAuth;
  const mockEnv = {
    GMAIL_CLIENT_ID: 'test-client-id',
    GMAIL_CLIENT_SECRET: 'test-secret',
    GMAIL_REFRESH_TOKEN: 'test-refresh-token',
    GMAIL_SENDER_EMAIL: 'test@example.com',
    SITE_NAME: 'Test Site'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    gmailAuth = new GmailAuth(mockEnv);
  });

  describe('getValidAccessToken', () => {
    test('should return cached token if valid', async () => {
      // Setup successful token refresh
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test-access-token',
          expires_in: 3600
        })
      });

      const token1 = await gmailAuth.getValidAccessToken();
      const token2 = await gmailAuth.getValidAccessToken();

      expect(token1).toBe(token2);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test('should refresh token if expired', async () => {
      // First call - get initial token
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'token-1',
          expires_in: 3600
        })
      });

      await gmailAuth.getValidAccessToken();

      // Mock time passing to expire token
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 4000000);

      // Second call - should refresh
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'token-2',
          expires_in: 3600
        })
      });

      const newToken = await gmailAuth.getValidAccessToken();
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendEmail', () => {
    test('should send email successfully', async () => {
      // Mock token refresh
      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'test-token' })
        })
        // Mock email send
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'email-message-id' })
        });

      const messageId = await gmailAuth.sendEmail(
        'test@example.com',
        'Test Subject',
        '<h1>Test HTML</h1>',
        'Test Text'
      );

      expect(messageId).toBe('email-message-id');
      expect(fetch).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
  });
});
```

### Email Notification Service Testing
```typescript
// tests/lib/email/notification-service.test.ts
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { EmailNotificationService } from '../../../src/lib/email/notification-service';

describe('EmailNotificationService', () => {
  let service: EmailNotificationService;
  let mockAuthDB: any;
  let mockEnv: any;

  beforeEach(() => {
    mockAuthDB = {
      getSubscribersForContentType: vi.fn(),
      getUserById: vi.fn(),
      createEmailNotification: vi.fn(),
      updateNotificationStatus: vi.fn()
    };

    mockEnv = {
      SITE_URL: 'https://test.com',
      GMAIL_SENDER_EMAIL: 'test@example.com'
    };

    service = new EmailNotificationService(mockEnv, mockAuthDB);
  });

  test('should process blog notification for subscribers', async () => {
    const mockPost = {
      slug: 'test-post',
      title: 'Test Post',
      description: 'Test description'
    };

    const mockSubscribers = [
      { id: 'user1', email: 'user1@test.com' },
      { id: 'user2', email: 'user2@test.com' }
    ];

    mockAuthDB.getSubscribersForContentType.mockResolvedValue(mockSubscribers);
    mockAuthDB.getUserById.mockImplementation((id) => 
      Promise.resolve(mockSubscribers.find(u => u.id === id))
    );

    // Mock Gmail auth and template engine
    vi.spyOn(service['gmailAuth'], 'sendEmail').mockResolvedValue('message-id');
    vi.spyOn(service['templateEngine'], 'renderBlogNotification').mockResolvedValue({
      subject: 'New Post: Test Post',
      html: '<h1>Test</h1>',
      text: 'Test'
    });

    await service.sendBlogNotification(mockPost);

    expect(mockAuthDB.getSubscribersForContentType).toHaveBeenCalledWith('blog');
    expect(service['gmailAuth'].sendEmail).toHaveBeenCalledTimes(2);
  });
});
```

## API Endpoint Testing

### User Preferences API Testing
```typescript
// tests/api/user/preferences.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { GET, PUT } from '../../../src/pages/api/user/preferences';

describe('/api/user/preferences', () => {
  let mockRequest: Request;
  let mockLocals: any;

  beforeEach(() => {
    mockLocals = {
      runtime: {
        env: {
          DB: mockDatabase,
          JWT_SECRET: 'test-secret'
        }
      }
    };
  });

  describe('GET preferences', () => {
    test('should return user preferences when authenticated', async () => {
      mockRequest = new Request('http://localhost/api/user/preferences', {
        headers: {
          cookie: 'auth-token=valid-jwt-token'
        }
      });

      const response = await GET({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.preferences).toMatchObject({
        emailBlogUpdates: expect.any(Boolean),
        emailThoughtUpdates: expect.any(Boolean),
        emailAnnouncements: expect.any(Boolean)
      });
    });

    test('should return 401 when not authenticated', async () => {
      mockRequest = new Request('http://localhost/api/user/preferences');

      const response = await GET({ request: mockRequest, locals: mockLocals });

      expect(response.status).toBe(401);
    });
  });

  describe('PUT preferences', () => {
    test('should update preferences with valid data', async () => {
      const preferences = {
        emailBlogUpdates: true,
        emailThoughtUpdates: false,
        emailAnnouncements: true,
        emailFrequency: 'daily'
      };

      mockRequest = new Request('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'auth-token=valid-jwt-token'
        },
        body: JSON.stringify({ preferences })
      });

      const response = await PUT({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Preferences updated successfully');
    });

    test('should validate email frequency', async () => {
      const preferences = {
        emailBlogUpdates: true,
        emailFrequency: 'invalid-frequency'
      };

      mockRequest = new Request('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          cookie: 'auth-token=valid-jwt-token'
        },
        body: JSON.stringify({ preferences })
      });

      const response = await PUT({ request: mockRequest, locals: mockLocals });

      expect(response.status).toBe(400);
    });
  });
});
```

## Frontend Component Testing

### EmailPreferences Component Testing
```typescript
// tests/components/EmailPreferences.test.ts
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/dom';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('EmailPreferences Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  test('should render with initial preferences', () => {
    const html = `
      <div class="email-preferences-container">
        <form id="email-preferences-form">
          <input type="checkbox" id="emailBlogUpdates" checked />
          <input type="checkbox" id="emailThoughtUpdates" />
          <button type="submit" id="preferences-submit">Save</button>
        </form>
        <div id="preferences-error"></div>
        <div id="preferences-success"></div>
      </div>
    `;
    
    document.body.innerHTML = html;

    const blogUpdates = document.querySelector('#emailBlogUpdates') as HTMLInputElement;
    const thoughtUpdates = document.querySelector('#emailThoughtUpdates') as HTMLInputElement;

    expect(blogUpdates.checked).toBe(true);
    expect(thoughtUpdates.checked).toBe(false);
  });

  test('should submit form with correct data', async () => {
    // Mock successful API response
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    });

    const html = `
      <div class="email-preferences-container">
        <form id="email-preferences-form">
          <input type="checkbox" id="emailBlogUpdates" name="emailBlogUpdates" />
          <input type="checkbox" id="emailThoughtUpdates" name="emailThoughtUpdates" checked />
          <button type="submit" id="preferences-submit">Save</button>
        </form>
        <div id="preferences-error"></div>
        <div id="preferences-success"></div>
      </div>
      <script>
        // Include the component's script here
      </script>
    `;

    document.body.innerHTML = html;

    // Simulate form submission
    const form = document.querySelector('#email-preferences-form') as HTMLFormElement;
    const submitEvent = new Event('submit');
    form.dispatchEvent(submitEvent);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailBlogUpdates: false,
          emailThoughtUpdates: true,
          emailAnnouncements: false
        })
      });
    });
  });

  test('should display error message on API failure', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('API Error'));

    const html = `
      <div class="email-preferences-container">
        <form id="email-preferences-form">
          <button type="submit" id="preferences-submit">Save</button>
        </form>
        <div id="preferences-error"></div>
        <div id="preferences-success"></div>
      </div>
    `;

    document.body.innerHTML = html;

    const form = document.querySelector('#email-preferences-form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));

    await waitFor(() => {
      const errorDiv = document.querySelector('#preferences-error') as HTMLDivElement;
      expect(errorDiv.textContent).toContain('Failed to save preferences');
      expect(errorDiv.classList.contains('show')).toBe(true);
    });
  });
});
```

## Integration Testing

### End-to-End Email Flow Testing
```typescript
// tests/integration/email-flow.test.ts
import { describe, test, expect } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment } from '../helpers/testSetup';

describe('Email Notification Flow Integration', () => {
  test('complete blog notification flow', async () => {
    const { authDB, emailService } = await setupTestEnvironment();

    // 1. Create test user with blog subscription
    const user = await authDB.createUser(
      'test@example.com',
      'testuser',
      'hashedpassword',
      true, // emailBlogUpdates
      false,
      false
    );

    // 2. Create blog post content
    const blogPost = {
      slug: 'test-post',
      title: 'Test Blog Post',
      description: 'Test description',
      content: 'Test content'
    };

    // 3. Trigger blog notification
    await emailService.sendBlogNotification(blogPost);

    // 4. Verify notification was created
    const notifications = await authDB.getNotificationsForUser(user.id);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].contentType).toBe('blog');
    expect(notifications[0].status).toBe('sent');

    // 5. Verify email was sent (through mocked Gmail API)
    expect(mockGmailSend).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining('Test Blog Post'),
      expect.any(String),
      expect.any(String)
    );

    await cleanupTestEnvironment();
  });

  test('unsubscribe flow integration', async () => {
    const { authDB, unsubscribeService } = await setupTestEnvironment();

    // 1. Create test user
    const user = await authDB.createUser(
      'test@example.com',
      'testuser',
      'hashedpassword',
      true,
      true,
      true
    );

    // 2. Generate unsubscribe token
    const unsubscribeUrl = await unsubscribeService.generateUnsubscribeUrl(user.id);
    const token = new URL(unsubscribeUrl).searchParams.get('token');

    // 3. Process unsubscribe
    await unsubscribeService.processUnsubscribe(token!, '127.0.0.1', 'test-agent');

    // 4. Verify user is unsubscribed
    const updatedUser = await authDB.getUserById(user.id);
    expect(updatedUser?.emailBlogUpdates).toBe(false);
    expect(updatedUser?.emailThoughtUpdates).toBe(false);
    expect(updatedUser?.emailAnnouncements).toBe(false);

    await cleanupTestEnvironment();
  });
});
```

## Performance Testing

### Database Performance Testing
```typescript
// tests/performance/database.bench.ts
import { bench, describe } from 'vitest';
import { AuthDB } from '../../src/lib/auth/db';
import { setupLargeTestDataset } from '../helpers/performanceHelpers';

describe('Database Performance Benchmarks', () => {
  bench('getSubscribersForContentType with 10k users', async () => {
    const { authDB } = await setupLargeTestDataset(10000);
    await authDB.getSubscribersForContentType('blog');
  });

  bench('createEmailNotification batch processing', async () => {
    const { authDB, users } = await setupLargeTestDataset(1000);
    
    const notifications = users.map(user => ({
      userId: user.id,
      contentType: 'blog',
      contentId: 'test-post',
      contentTitle: 'Test Post',
      contentUrl: 'https://example.com/test-post',
      notificationType: 'new_content'
    }));

    await Promise.all(
      notifications.map(params => authDB.createEmailNotification(params))
    );
  });
});
```

## Test Configuration and Setup

### Test Database Setup
```typescript
// tests/helpers/testSetup.ts
import Database from 'better-sqlite3';
import { AuthDB } from '../../src/lib/auth/db';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function setupTestEnvironment() {
  const db = new Database(':memory:');
  
  // Run all migrations
  const migrationFiles = [
    '0001_create_auth_tables.sql',
    '0002_add_email_preferences.sql',
    // ... all migration files
  ];

  for (const file of migrationFiles) {
    const sql = readFileSync(join(__dirname, '../../migrations', file), 'utf8');
    db.exec(sql);
  }

  const authDB = new AuthDB(db as any);
  
  return {
    db,
    authDB,
    cleanup: () => db.close()
  };
}

export async function createTestUser(authDB: AuthDB, overrides = {}) {
  const defaults = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedpassword',
    emailBlogUpdates: false,
    emailThoughtUpdates: false,
    emailAnnouncements: false
  };

  const userData = { ...defaults, ...overrides };
  
  return authDB.createUser(
    userData.email,
    userData.username,
    userData.password,
    userData.emailBlogUpdates,
    userData.emailThoughtUpdates,
    userData.emailAnnouncements
  );
}
```

### Mock Implementations
```typescript
// tests/mocks/gmailMock.ts
import { vi } from 'vitest';

export const mockGmailAuth = {
  getValidAccessToken: vi.fn(() => Promise.resolve('mock-access-token')),
  sendEmail: vi.fn(() => Promise.resolve('mock-message-id'))
};

// tests/mocks/databaseMock.ts
export const mockDatabase = {
  prepare: vi.fn(() => ({
    bind: vi.fn(() => ({
      run: vi.fn(),
      all: vi.fn(() => ({ results: [] })),
      first: vi.fn()
    }))
  }))
};
```

## CI/CD Integration

### GitHub Actions Test Configuration
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run performance benchmarks
        run: npm run test:performance
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

### Package.json Test Scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:performance": "vitest bench",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

## Quality Assurance Standards

### Coverage Requirements
- **Overall Coverage**: 85% minimum
- **Database Layer**: 90% minimum (critical business logic)
- **Email Service**: 85% minimum
- **API Endpoints**: 90% minimum (security-critical)
- **Frontend Components**: 75% minimum

### Performance Benchmarks
- **Database Queries**: <50ms average response time
- **Email API Calls**: <200ms average response time
- **Frontend Rendering**: <100ms time to interactive
- **Batch Processing**: >100 emails per minute

### Testing Best Practices
1. **Test Isolation**: Each test should be independent
2. **Data Management**: Use factories for test data creation
3. **Mock Strategy**: Mock external services, test real business logic
4. **Error Testing**: Test both success and failure paths
5. **Performance Testing**: Include performance regression tests
6. **Security Testing**: Test authentication, authorization, and input validation

This comprehensive testing strategy ensures the email notifications system is reliable, performant, and secure while providing maintainable test coverage for future development.