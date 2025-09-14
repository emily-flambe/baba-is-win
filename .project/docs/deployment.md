# Deployment Guide - CLOUDFLARE WORKERS

## IMPORTANT: This is Cloudflare Workers, NOT Cloudflare Pages!
This project deploys to **Cloudflare Workers** using `wrangler deploy`.
- **NOT** Cloudflare Pages
- **NOT** using `wrangler pages deploy`
- Production URL format: `https://[worker-name].[account-subdomain].workers.dev`

## Production Deployment (Cloudflare Workers)

### Pre-deployment Checklist
- [ ] All tests passing (`npm test`)
- [ ] Type checking successful (`npm run check`)
- [ ] Build completes without errors (`npm run build`)
- [ ] Environment variables configured in Cloudflare
- [ ] Database migrations ready

### Deployment Steps

1. **Prepare the build**:
```bash
npm run build
```

2. **Deploy to Cloudflare Workers** (NOT Pages!):
```bash
npm run deploy  # This runs: astro build && wrangler deploy
```

3. **Apply database migrations** (if needed):
```bash
wrangler d1 migrations apply baba-is-win-db
```

4. **Set production secrets** (first time only):
```bash
wrangler secret put JWT_SECRET
wrangler secret put API_KEY_SALT
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put CRON_SECRET
```

5. **Verify deployment**:
   - Check application loads
   - Test authentication flow
   - Verify API endpoints
   - Check email notifications

### Rollback Procedure

If issues occur after deployment:

1. **Revert to previous version**:
```bash
git revert HEAD
npm run deploy
```

2. **Rollback database** (if migrations were applied):
```bash
# Create a rollback migration
# Deploy the rollback
```

### Monitoring

- **Cloudflare Dashboard**: Monitor traffic, errors, and performance
- **Worker Analytics**: Check execution time and success rates
- **Error Logs**: `wrangler tail` for real-time logs

### Environment-Specific Configurations

#### Production
- Uses Cloudflare secrets (not .dev.vars)
- Caching enabled
- Rate limiting enforced
- Full security headers

#### Staging (if applicable)
- Separate worker deployment
- Test database instance
- Debug logging enabled

### CI/CD Pipeline

Currently manual deployment. For automation, consider:
1. GitHub Actions workflow for Workers deployment
2. Wrangler GitHub Action (NOT Pages integration)
3. Automated testing before deploy
4. Automatic rollback on failure