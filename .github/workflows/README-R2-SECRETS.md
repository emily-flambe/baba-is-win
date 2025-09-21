# GitHub Actions Secrets for R2 Upload Workflow

## Required Secrets

You need to add the following secrets to your GitHub repository for the R2 upload workflow to function:

### 1. `R2_ENDPOINT`
**Description**: The R2 storage endpoint URL
**Format**: `https://<account-id>.r2.cloudflarestorage.com`
**Where to find**: Cloudflare Dashboard → R2 → Overview → Bucket Details → S3 API endpoint

### 2. `R2_ACCESS_KEY_ID`
**Description**: The Access Key ID for R2 API access
**Format**: String (e.g., `a1b2c3d4e5f6g7h8i9j0`)
**Where to find**: Cloudflare Dashboard → R2 → Manage R2 API tokens → Create API token

### 3. `R2_SECRET_ACCESS_KEY`
**Description**: The Secret Access Key for R2 API access
**Format**: String (longer secret key)
**Where to find**: Cloudflare Dashboard → R2 → Manage R2 API tokens → Create API token (shown only once!)

### 4. `R2_BUCKET_NAME`
**Description**: The name of your R2 bucket
**Format**: String (e.g., `personal-site-docs`)
**Where to find**: The name you gave your R2 bucket when creating it

## How to Add Secrets to GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name shown above
5. Paste the corresponding value from your Cloudflare account

## Getting R2 Credentials from Cloudflare

### Step 1: Create an R2 API Token
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** → **Overview**
3. Click **Manage R2 API tokens**
4. Click **Create API token**
5. Configure the token:
   - **Token name**: `github-actions-upload` (or any descriptive name)
   - **Permissions**: Select **Object Read & Write** (minimum required)
   - **Specify bucket**: Choose your bucket (e.g., `personal-site-docs`)
   - **TTL**: Leave as default or set expiration if desired
6. Click **Create API Token**
7. **IMPORTANT**: Copy the Access Key ID and Secret Access Key immediately (won't be shown again!)

### Step 2: Get the R2 Endpoint
1. In Cloudflare Dashboard → **R2** → **Overview**
2. Click on your bucket name
3. Find **Bucket Details** section
4. Copy the **S3 API** endpoint URL (format: `https://<account-id>.r2.cloudflarestorage.com`)

### Step 3: Note Your Bucket Name
Simply use the name of your R2 bucket as shown in the Cloudflare Dashboard

## Security Best Practices

- Never commit these values to your repository
- Use GitHub Secrets for all sensitive values
- Rotate API tokens periodically
- Use the minimum required permissions (Object Read & Write)
- Consider using separate tokens for different environments

## Testing the Workflow

After adding all secrets:
1. Make a small change to any content file (e.g., add a comment to a blog post)
2. Push to main branch
3. Check **Actions** tab in GitHub to see the workflow run
4. Verify in Cloudflare Dashboard that files were uploaded to R2

## Manual Trigger

The workflow can also be triggered manually:
1. Go to **Actions** tab
2. Select **Upload Content to R2** workflow
3. Click **Run workflow**
4. Optionally select "Clear bucket before upload" for a fresh upload
5. Click **Run workflow**

## Troubleshooting

If the workflow fails:
- Check that all 4 secrets are set correctly
- Verify the R2 API token has Object Read & Write permissions
- Ensure the bucket name matches exactly
- Check the workflow logs for specific error messages