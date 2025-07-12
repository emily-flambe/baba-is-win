# Google OAuth Setup Instructions

## Prerequisites

Before implementing Google OAuth, complete these setup steps to configure your Google Cloud project and gather required credentials.

## Step 1: Google Cloud Console Setup

### 1.1 Create or Select a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select an existing project or create a new one
3. Note your project ID (you'll need this later)

### 1.2 No Additional APIs Required
**For basic OAuth 2.0 authentication (email, profile), you don't need to enable any additional APIs.** The OAuth 2.0 functionality is built into Google Cloud Platform and works with default scopes.

### 1.3 Configure OAuth Consent Screen
1. Navigate to **APIs & Services** → **OAuth consent screen** (you may see "OAuth Overview")
2. If you see "Google Auth platform not configured yet", click **"Get Started"**
3. Fill in **App Information**:
   - **App name**: Your application name (e.g., "Baba Is Win")
   - **User support email**: Your email address
   - Click **"Next"**
4. Configure **Audience**:
   - Select user type for your app (usually External for public apps)
   - Click **"Next"**
5. Add **Contact Information**:
   - **Developer contact email**: Your email address
   - Click **"Next"**
6. **Review and Finish**:
   - Review settings
   - Check "I agree to the Google API Services: User Data Policy"
   - Click **"Continue"**

### 1.4 Create OAuth Credentials
1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Select **Web application** as application type
4. Configure settings:
   - **Name**: "Baba Is Win OAuth Client"
   - **Authorized JavaScript origins**: 
     - `http://localhost:8788` (for development)
     - `https://your-domain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:8788/api/auth/google/callback` (for development)
     - `https://your-domain.com/api/auth/google/callback` (for production)
5. Click **Create**
6. **CRITICAL**: Copy the Client ID and Client Secret immediately and store securely
   - **New in 2025**: Client secrets are only shown once at creation time
   - Download the JSON file if offered

## Step 2: Environment Variables Configuration

### 2.1 Update `.env` File
Add these variables to your `.env` file:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8788/api/auth/google/callback
```

### 2.2 Development vs Production Configuration

**For Development (.env file):**
Use `.env` file for local development with `wrangler dev`

**For Production (Wrangler Secrets):**
**NEVER put secrets in `wrangler.toml`** - use Wrangler secrets instead:

```bash
# Set OAuth credentials as secrets for production
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

### 2.3 Update `wrangler.toml` (Non-Secret Values Only)
Only add non-secret configuration to `wrangler.toml`:

```toml
# Example of what you CAN put in wrangler.toml (non-secrets)
[env.development]
# Non-secret environment variables only

[env.production]  
# Non-secret environment variables only
```

## Step 3: Dependencies Installation

### 3.1 Install Required Packages
Add these dependencies to your project:

```bash
npm install googleapis@^140.0.0 jose@^5.0.0
```

### 3.2 Install Development Dependencies
```bash
npm install --save-dev @types/node@^20.0.0
```

## Step 4: Database Preparation

### 4.1 Review Current Schema
Your current users table will need modifications. The implementation will include:
- `google_id` field for storing Google user ID
- `provider` field to track authentication method
- `provider_email` field for OAuth email (may differ from login email)

### 4.2 Backup Database
Before any schema changes, backup your current database:

```bash
# Export current database
wrangler d1 execute your-database --command "SELECT * FROM users;" > users_backup.sql
```

## Step 5: Testing Environment Setup

### 5.1 Test User Accounts
1. **For Development**: Your own Google account should work for initial testing
2. **Adding Test Users** (if needed):
   - Go back to **APIs & Services** → **OAuth consent screen**
   - Look for **"Test users"** section or **"Audience"** settings
   - Add additional test user email addresses if you need others to test
3. **Important**: Apps in testing mode have limitations on who can sign in
4. **Token Limitation**: In testing mode, refresh tokens expire after 7 days (except for basic email/profile scopes)

### 5.2 Local Development
1. Ensure `wrangler dev` is working correctly
2. Test that your current authentication system works
3. Verify database connectivity

## Step 6: Domain Configuration

### 6.1 Production Domain Setup
1. Ensure your production domain is properly configured in Cloudflare
2. Update OAuth redirect URIs to use your production domain
3. Test that your current app works in production

### 6.2 SSL Certificate
1. Ensure your domain has a valid SSL certificate
2. Google OAuth requires HTTPS for production redirect URIs

## Step 7: Security Considerations

### 7.1 Environment Security
- Never commit OAuth credentials to version control
- Use different credentials for development vs production
- Regularly rotate OAuth secrets

### 7.2 Scope Limitations
- Only request minimum required scopes
- Current recommended scopes: `openid`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`
- Avoid requesting unnecessary permissions

## Step 8: Verification Checklist

Before implementation, verify:
- [ ] Google Cloud project is set up
- [ ] OAuth consent screen is configured
- [ ] OAuth credentials are created and saved securely
- [ ] Environment variables are configured
- [ ] Dependencies are installed
- [ ] Database backup is created
- [ ] Test accounts are prepared
- [ ] Domain and SSL are configured
- [ ] Current authentication system works

## Troubleshooting

### Common Issues
1. **Invalid redirect URI**: Ensure redirect URIs match exactly (including protocol)
2. **Consent screen issues**: Make sure app is published or test users are added
3. **CORS errors**: Verify authorized JavaScript origins
4. **Missing scopes**: Ensure required scopes are added to consent screen

### Support Resources
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console Help](https://cloud.google.com/docs)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)

## Next Steps

Once setup is complete, proceed to the technical implementation using the provided specifications in:
- `technical-spec.md` - Complete implementation guide
- `api-design.md` - Detailed API specifications
- `security-architecture.md` - Security patterns and validation
- `testing-strategy.md` - Comprehensive testing approach

---

**Note**: Keep your OAuth credentials secure and never share them publicly. Update redirect URIs whenever you change domains or ports.