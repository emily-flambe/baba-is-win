# =============================================================================
# BABA IS WIN - Development Environment Variables
# =============================================================================
# This file serves as a template for all environment variables needed for 
# local development. Copy this file to create your local environment setup.
#
# CRITICAL: For Cloudflare Workers, use .dev.vars in project root for wrangler dev
# =============================================================================

# -----------------------------------------------------------------------------
# AUTHENTICATION & SECURITY (REQUIRED)
# -----------------------------------------------------------------------------

# JWT Secret for authentication tokens
# CRITICAL: Required for all auth endpoints to function
# Production: wrangler secret put JWT_SECRET
JWT_SECRET=dev-secret-key-for-local-testing-only-never-use-in-production

# API Key Salt for API key generation and validation
# CRITICAL: Required for API key functionality
# Production: wrangler secret put API_KEY_SALT  
API_KEY_SALT=dev-salt-for-api-keys-local-testing-only

# Cron job security token
# Required for secure cron endpoint access
CRON_SECRET=dev-cron-secret-change-in-production

# -----------------------------------------------------------------------------
# GOOGLE OAUTH CONFIGURATION
# -----------------------------------------------------------------------------

# Google OAuth Client Configuration
# Get these from Google Cloud Console > APIs & Services > Credentials
# Production: wrangler secret put GOOGLE_CLIENT_ID, etc.
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8788/api/auth/google/callback

# -----------------------------------------------------------------------------
# EMAIL SERVICE CONFIGURATION  
# -----------------------------------------------------------------------------

# Resend API Configuration (Primary email service)
# Get API key from https://resend.com/api-keys
# Production: wrangler secret put RESEND_API_KEY
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Gmail OAuth Configuration (Legacy/Backup - Optional)
# Only needed if using Gmail as email service instead of Resend
# GMAIL_CLIENT_ID=your_gmail_oauth_client_id
# GMAIL_CLIENT_SECRET=your_gmail_oauth_client_secret  
# GMAIL_REFRESH_TOKEN=your_gmail_refresh_token
# GMAIL_SENDER_EMAIL=your_gmail_address@gmail.com
# GMAIL_FROM_EMAIL=your_display_name@gmail.com

# -----------------------------------------------------------------------------
# SITE CONFIGURATION
# -----------------------------------------------------------------------------

# Site URLs and branding
SITE_URL=http://localhost:8788
SITE_NAME=Emily's Blog

# Environment identifier
ENVIRONMENT=development

# -----------------------------------------------------------------------------
# DATABASE CONFIGURATION
# -----------------------------------------------------------------------------

# Cloudflare D1 Database
# This is configured via wrangler.json binding, not environment variable
# DB=baba-is-win-db (configured in wrangler.json)

# -----------------------------------------------------------------------------
# CLOUDFLARE WORKERS SETUP INSTRUCTIONS
# -----------------------------------------------------------------------------

# FOR LOCAL DEVELOPMENT:
# 1. Copy this file to project root as .dev.vars (for wrangler dev)
# 2. Update values with your actual credentials
# 3. Run: npm run dev (starts wrangler dev server)

# FOR CLOUDFLARE WORKERS PRODUCTION:
# NEVER put secrets in wrangler.json! Use these commands instead:
#
# wrangler secret put JWT_SECRET
# wrangler secret put API_KEY_SALT
# wrangler secret put CRON_SECRET
# wrangler secret put GOOGLE_CLIENT_ID
# wrangler secret put GOOGLE_CLIENT_SECRET
# wrangler secret put GOOGLE_REDIRECT_URI
# wrangler secret put RESEND_API_KEY
# wrangler secret put RESEND_FROM_EMAIL

# -----------------------------------------------------------------------------
# DEVELOPMENT NOTES
# -----------------------------------------------------------------------------

# Critical Environment Variables:
# - JWT_SECRET: Required for auth to work at all
# - API_KEY_SALT: Required for API key functionality
# - RESEND_API_KEY: Required for email notifications

# Optional Environment Variables:
# - Google OAuth vars: Only needed if using Google login
# - Gmail OAuth vars: Only needed if using Gmail instead of Resend
# - CONTENT_KV: Optional content storage namespace

# Troubleshooting:
# - If you get JWT_SECRET errors: Create .dev.vars file with JWT_SECRET
# - If auth endpoints fail: Restart wrangler dev after adding .dev.vars
# - If emails don't send: Check RESEND_API_KEY is valid

# =============================================================================