# GitHub Actions CI/CD Setup

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### CLOUDFLARE_API_TOKEN
- Go to Cloudflare Dashboard → My Profile → API Tokens
- Create token with permissions:
  - `Cloudflare Workers:Edit`
  - `Account:Read`
  - `Zone:Read`
- Add as repository secret

### CRON_SECRET
- Use the same value as your existing `CRON_SECRET` environment variable
- This authenticates the content sync trigger

### SITE_URL
- Your deployed site URL (e.g., `https://personal.emily-cogsdill.workers.dev`)
- Used to trigger immediate email notifications after deployment

## Workflow Trigger

The workflow automatically runs when:
- Push to `main` branch
- Changes to files in:
  - `src/data/blog-posts/published/**`
  - `src/data/thoughts/published/**`

## Process Flow

1. Build validation (`npm run check`)
2. Deploy to Cloudflare Workers
3. Wait 30 seconds for deployment propagation
4. Trigger immediate email notifications via API
5. Complete deployment with email notifications sent