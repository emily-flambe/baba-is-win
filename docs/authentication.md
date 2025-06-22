# Authentication & User Management

This document explains how user authentication and management works in the Baba Is Win blog application.

## Overview

The application uses a custom JWT-based authentication system built for Cloudflare Workers with D1 database storage. It provides secure user registration, login, session management, and protected routes.

## Architecture

### Components

- **Database**: Cloudflare D1 SQLite database
- **Auth Library**: Custom implementation using Web Crypto API
- **Session Management**: JWT tokens stored in HTTP-only cookies
- **Middleware**: Route protection and user context injection
- **UI Components**: Login/signup pages and kebab menu

### Security Features

- **Password Hashing**: PBKDF2 with 100,000 iterations using Web Crypto API
- **Session Tokens**: JWT with 7-day expiration
- **Secure Cookies**: HTTP-only, Secure, SameSite=Strict
- **CSRF Protection**: SameSite cookies prevent cross-site attacks
- **Input Validation**: Server-side validation for all user inputs

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_blog_updates BOOLEAN DEFAULT FALSE,
  email_thought_updates BOOLEAN DEFAULT FALSE,
  email_announcements BOOLEAN DEFAULT FALSE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### User Profiles Table
```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## API Endpoints

### POST /api/auth/signup
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "emailBlogUpdates": false,
  "emailThoughtUpdates": false,
  "emailAnnouncements": false
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username"
  },
  "token": "jwt_token"
}
```

**Validation:**
- Email must be valid format and unique
- Username must be unique and contain only letters, numbers, underscore, hyphen
- Password must be at least 8 characters

### POST /api/auth/login
Authenticate an existing user.

**Request Body:**
```json
{
  "emailOrUsername": "user@example.com",
  "password": "password123"
}
```

**Response:** Same as signup

### POST /api/auth/logout
Log out the current user by clearing the auth cookie.

**Response:** 200 OK with cleared cookie

### GET /api/auth/me
Get current authenticated user information.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username"
  }
}
```

## Authentication Flow

### Registration
1. User submits signup form with email, username, password
2. Server validates input (uniqueness, format, length)
3. Password is hashed using PBKDF2 with random salt
4. User record is created in database
5. JWT token is generated and set as HTTP-only cookie
6. User is redirected to home page

### Login
1. User submits login form with email/username and password
2. Server looks up user by email or username
3. Password is verified against stored hash
4. JWT token is generated and set as HTTP-only cookie
5. User is redirected to intended page or home

### Session Management
1. JWT tokens contain user ID, email, username, and expiration
2. Tokens are signed with secret key and expire after 7 days
3. Middleware validates tokens on protected routes
4. Invalid/expired tokens redirect to login page

## Middleware System

The authentication middleware (`src/middleware.ts`) handles:

### Route Protection
- **Protected Routes**: `/admin/*`, `/profile`
- **Public Routes**: `/login`, `/signup`, static assets
- **Optional Auth**: All other routes (user context available but not required)

### User Context Injection
```typescript
// Available in all Astro components
const user = Astro.locals.user;
// Type: { id: string; email: string; username: string; createdAt: Date } | undefined
```

### Redirect Logic
- Unauthenticated users accessing protected routes → `/login?redirect=originalUrl`
- Successful login → Redirect to intended page or home

## User Interface

### Kebab Menu
Located in the header next to social icons:
- **Unauthenticated**: Shows "Login" and "Sign Up" links
- **Authenticated**: Shows username, "Profile" link, and "Logout" button

### Pages
- **Login Page** (`/login`): Email/username and password form
- **Signup Page** (`/signup`): Email, username, and password form with casual tone
- **Profile Page** (`/profile`): User information and account actions

### Navigation
- Profile link appears in main navigation when authenticated
- Auth state is automatically reflected across all components

## Development Setup

### 1. Database Setup
```bash
# Create D1 database
wrangler d1 create baba-is-win-db

# Run migrations
wrangler d1 execute baba-is-win-db --local --file=./migrations/0001_create_auth_tables.sql
```

### 2. Environment Configuration
Update `wrangler.json`:
```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "baba-is-win-db",
      "database_id": "db4b6f95-ed48-4723-8c77-ee3a028d117e"
    }
  ],
  "vars": {
    "JWT_SECRET": "4wMCazSNE46y8A0hfPiZGuzj8MIr6tLn8A4ThokesBg="
  }
}
```

### 3. Local Development
```bash
# Full development with D1 database (recommended)
npm run dev

# UI-only development without database
npm run dev:astro
```

The development server runs on http://localhost:8787 when using `npm run dev`.

## Security Considerations

### Password Security
- PBKDF2 with 100,000 iterations and SHA-256
- Random 16-byte salt per password
- Constant-time comparison for verification

### Session Security
- JWT tokens signed with HS256
- HTTP-only cookies prevent XSS access
- Secure flag requires HTTPS in production
- SameSite=Strict prevents CSRF attacks

### Input Validation
- Email format validation
- Username pattern enforcement
- Password length requirements
- SQL injection prevention through parameterized queries

### Rate Limiting
Consider implementing rate limiting for:
- Login attempts per IP
- Registration attempts per IP
- Password reset requests

## User Management

### Simple Commands (Recommended)

The easiest way to manage users is with the simplified make commands that hide all the SQL complexity:

#### Quick Overview
```bash
make help                          # Show all user management commands
make stats                         # Quick statistics overview
make users                         # List all users (formatted)
make count                         # Count total users
make recent                        # Show recent registrations
make active                        # Show active sessions
```

#### Find & Inspect Users
```bash
make find Q=search_term            # Search by email or username
make find Q=test                   # Find users with "test" in email/username
make find Q=@gmail.com             # Find Gmail users
make info EMAIL=user@example.com   # Get detailed user information
```

#### Manage Users
```bash
make test-user                     # Create test user (test@example.com/testuser/testpass123)
make logout EMAIL=user@example.com # Force logout user (clear sessions)
make delete EMAIL=user@example.com # Delete user (requires typing "DELETE" to confirm)
```

#### Maintenance
```bash
make cleanup                       # Remove expired sessions
```

### Advanced Commands (Direct SQL)

For advanced operations, you can still use the direct wrangler commands:

#### List All Users
```bash
# List all users with basic info
npx wrangler d1 execute baba-is-win-db --local --command="SELECT id, email, username, created_at FROM users ORDER BY created_at DESC;"

# Count total users
npx wrangler d1 execute baba-is-win-db --local --command="SELECT COUNT(*) as total_users FROM users;"
```

#### View User Details
```bash
# Get user by email
npx wrangler d1 execute baba-is-win-db --local --command="SELECT * FROM users WHERE email = 'user@example.com';"

# Get user by username
npx wrangler d1 execute baba-is-win-db --local --command="SELECT * FROM users WHERE username = 'username';"

# Get user by ID
npx wrangler d1 execute baba-is-win-db --local --command="SELECT * FROM users WHERE id = 'user_id';"
```

#### Delete Users
```bash
# Delete user by email (CASCADE will remove sessions and profile)
npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM users WHERE email = 'user@example.com';"

# Delete user by username
npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM users WHERE username = 'username';"
```

#### Session Management
```bash
# View active sessions
npx wrangler d1 execute baba-is-win-db --local --command="SELECT s.id, s.user_id, u.username, s.expires_at, s.created_at FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.expires_at > unixepoch() ORDER BY s.created_at DESC;"

# Clear expired sessions
npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM sessions WHERE expires_at <= unixepoch();"

# Force logout user (clear all their sessions)
npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');"
```

#### Database Maintenance
```bash
# View table sizes
npx wrangler d1 execute baba-is-win-db --local --command="SELECT 
  'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL  
SELECT 'user_profiles', COUNT(*) FROM user_profiles;"

# Clean up old data
npx wrangler d1 execute baba-is-win-db --local --command="DELETE FROM sessions WHERE expires_at <= unixepoch() - (7 * 24 * 60 * 60);"
```

### Production Database Commands

For production database operations, add `--remote` flag:

```bash
# Production user list
npx wrangler d1 execute baba-is-win-db --remote --command="SELECT id, email, username, created_at FROM users ORDER BY created_at DESC LIMIT 10;"

# Production session cleanup
npx wrangler d1 execute baba-is-win-db --remote --command="DELETE FROM sessions WHERE expires_at <= unixepoch();"
```

### Creating Test Users

For development/testing, you can create users via the API:

```bash
# Create test user via curl
curl -X POST http://localhost:8787/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "emailBlogUpdates": false,
    "emailThoughtUpdates": false,
    "emailAnnouncements": false
  }'
```

### User Analytics Queries

```bash
# User registration by date
npx wrangler d1 execute baba-is-win-db --local --command="
SELECT 
  DATE(created_at, 'unixepoch') as registration_date,
  COUNT(*) as new_users
FROM users 
GROUP BY DATE(created_at, 'unixepoch') 
ORDER BY registration_date DESC 
LIMIT 30;"

# Active sessions count
npx wrangler d1 execute baba-is-win-db --local --command="
SELECT COUNT(*) as active_sessions 
FROM sessions 
WHERE expires_at > unixepoch();"

# Users with email preferences
npx wrangler d1 execute baba-is-win-db --local --command="
SELECT 
  SUM(CASE WHEN email_blog_updates = 1 THEN 1 ELSE 0 END) as blog_subscribers,
  SUM(CASE WHEN email_thought_updates = 1 THEN 1 ELSE 0 END) as thought_subscribers,
  SUM(CASE WHEN email_announcements = 1 THEN 1 ELSE 0 END) as announcement_subscribers,
  COUNT(*) as total_users
FROM users;"
```

## Future Enhancements

### Planned Features
- Email verification for new accounts
- Password reset functionality
- Account deletion
- User profile editing
- Two-factor authentication

### User-Generated Content Integration
- Associate thoughts/posts with user accounts
- User-specific content management
- Author attribution on public content

### Administrative Features
- User management dashboard
- Account moderation tools
- Usage analytics

## Troubleshooting

### Common Issues

**Login not working:**
- Check JWT_SECRET is set correctly
- Verify database connection
- Check browser cookies are enabled

**Database errors:**
- Ensure migrations are applied
- Verify D1 database ID in wrangler.json
- Check local database file permissions

**Middleware issues:**
- Verify middleware.ts is in src/ directory
- Check Astro.locals.user typing in env.d.ts
- Ensure protected routes are correctly configured

### Debug Mode
Add logging to middleware and API endpoints:
```typescript
console.log('Auth check:', { user: context.locals.user, path: context.url.pathname });
```

## Contributing

When modifying authentication:
1. Update this documentation
2. Add/update tests for new functionality
3. Consider security implications
4. Update TypeScript types as needed
5. Test with both authenticated and unauthenticated users