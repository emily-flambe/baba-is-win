# Authentication Setup Guide

## Overview
User authentication has been implemented using JWT tokens and Cloudflare D1 database.

## Setup Steps

### 1. Create Cloudflare D1 Database
```bash
# Create a new D1 database
wrangler d1 create baba-is-win-db

# Copy the database_id from the output
```

### 2. Update Configuration
Update `wrangler.json` with your database ID:
```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "baba-is-win-db",
    "database_id": "YOUR_DATABASE_ID_HERE"
  }
]
```

### 3. Generate JWT Secret
```bash
# Generate a secure random secret
openssl rand -base64 32
```

Add the secret to `wrangler.json`:
```json
"vars": {
  "JWT_SECRET": "YOUR_GENERATED_SECRET_HERE"
}
```

### 4. Run Database Migrations
```bash
# Apply the schema to your D1 database
wrangler d1 execute baba-is-win-db --local --file=./migrations/0001_create_auth_tables.sql

# For production
wrangler d1 execute baba-is-win-db --file=./migrations/0001_create_auth_tables.sql
```

### 5. Test Locally
```bash
npm run dev
```

## Features Implemented

- ✅ User registration with email and username
- ✅ Secure password hashing with Argon2
- ✅ JWT-based authentication
- ✅ Protected routes middleware
- ✅ Login/Signup pages
- ✅ User profile page
- ✅ Logout functionality
- ✅ Auth state in header

## API Endpoints

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login to account
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

## Protected Routes

- `/admin/*` - Admin pages
- `/profile` - User profile

## Next Steps

To associate thoughts with users:
1. Add `user_id` column to thoughts storage
2. Update thought creation to include authenticated user
3. Display author information on thoughts

## Security Notes

- Passwords are hashed using Argon2
- JWTs expire after 7 days
- Cookies are HttpOnly, Secure, and SameSite
- Protected routes require valid authentication