# Gmail API Setup Instructions

## ✅ Current Status
- **Deployed**: https://personal.emily-cogsdill.workers.dev
- **JWT_SECRET**: Already configured ✅
- **Database**: Connected ✅
- **Missing**: Gmail API secrets

## 🔧 Required Gmail Secrets

You need to set these 4 secrets in Cloudflare Workers:

```bash
wrangler secret put GMAIL_CLIENT_ID
wrangler secret put GMAIL_CLIENT_SECRET
wrangler secret put GMAIL_REFRESH_TOKEN
wrangler secret put GMAIL_SENDER_EMAIL
```

## 📋 Step-by-Step Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable Gmail API:
   - Navigate to **APIs & Services** → **Library**
   - Search "Gmail API" and click **Enable**

### 2. Create OAuth2 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
3. Application type: **Web application**
4. Add this Authorized redirect URI:
   ```
   https://developers.google.com/oauthplayground
   ```
5. Click **Create**
6. **Save the Client ID and Client Secret** - you'll need these

### 3. Generate Refresh Token

1. Go to [OAuth2 Playground](https://developers.google.com/oauthplayground)
2. Click the settings gear ⚙️ → Check "Use your own OAuth credentials"
3. Enter your **Client ID** and **Client Secret**
4. In left panel, expand **Gmail API v1**
5. Select: `https://www.googleapis.com/auth/gmail.send`
6. Click **Authorize APIs**
7. Sign in with your Gmail account and click **Allow**
8. Click **Exchange authorization code for tokens**
9. **Copy the Refresh token** - you'll need this

### 4. Set Cloudflare Secrets

Run these commands and paste the values when prompted:

```bash
# Set Gmail OAuth2 Client ID
wrangler secret put GMAIL_CLIENT_ID
# Paste: your_client_id_from_step_2

# Set Gmail OAuth2 Client Secret  
wrangler secret put GMAIL_CLIENT_SECRET
# Paste: your_client_secret_from_step_2

# Set Gmail Refresh Token
wrangler secret put GMAIL_REFRESH_TOKEN
# Paste: your_refresh_token_from_step_3

# Set Gmail Sender Email
wrangler secret put GMAIL_SENDER_EMAIL
# Paste: your_email@gmail.com
```

### 5. Test the Setup

After setting all secrets, test the email functionality:

1. Visit: https://personal.emily-cogsdill.workers.dev/signup
2. Create a test account with email notifications enabled
3. Check if the system can send emails

## 🔍 Verify Current Secrets

To see what secrets are currently set:

```bash
wrangler secret list
```

## ✅ Expected Output

After setup, you should see these secrets:
- `JWT_SECRET` ✅ (already set)
- `GMAIL_CLIENT_ID` 
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_SENDER_EMAIL`

## 🚨 Important Notes

1. **Use your personal Gmail account** - the one you want emails sent from
2. **Keep credentials secure** - never commit them to code
3. **The refresh token doesn't expire** - you only need to generate it once
4. **OAuth2 Playground is safe** - it's Google's official tool for developers

## 🐛 Troubleshooting

**Error: `redirect_uri_mismatch`**
- Make sure you added exactly: `https://developers.google.com/oauthplayground`
- Wait 5-10 minutes after adding the redirect URI

**Error: `invalid_grant`**
- Your refresh token may be expired/invalid
- Generate a new refresh token using OAuth2 Playground

**Error: `insufficient authentication scopes`**
- Make sure you selected `https://www.googleapis.com/auth/gmail.send` scope
- Generate new refresh token with correct scope

## 📱 Next Steps

Once Gmail is configured:
1. Test email notifications by creating content
2. Verify unsubscribe links work
3. Monitor email delivery in Gmail's sent folder
4. Check Cloudflare Workers logs for any errors

Your email notifications system will be fully operational after completing these steps!