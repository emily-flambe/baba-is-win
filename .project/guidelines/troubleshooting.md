# Troubleshooting Guide

## Quick Diagnostics

### Check These First
1. [ ] Correct Node version? (20+)
2. [ ] Dependencies installed? (`npm install`)
3. [ ] Environment variables set? (`.dev.vars` file exists)
4. [ ] Correct port/URL? (localhost:4321)
5. [ ] Database migrations applied? (`wrangler d1 migrations apply baba-is-win-db --local`)

## Common Issues

### Build/Installation Problems

#### Issue: npm install fails with permission errors
**Symptoms**: EACCES errors during installation
**Solution**: 
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```
**Root Cause**: Corrupted npm cache or permission issues

#### Issue: TypeScript build errors
**Symptoms**: Type errors when running `npm run build`
**Solution**: 
```bash
# Regenerate TypeScript definitions
npm run check
```
**Prevention**: Run type checking before committing

### Runtime Errors

#### Issue: JWT_SECRET missing error
**Symptoms**: Auth endpoints return 500 error, "JWT_SECRET not configured" in logs
**Solution**: 
1. Create `.dev.vars` file in project root:
```env
JWT_SECRET=dev-secret-key-for-local-testing-only-never-use-in-production
API_KEY_SALT=dev-salt-for-api-keys-local-testing-only
```
2. Restart dev server: `npm run dev`
**Prevention**: Run setup script: `node .project/scripts/setup-dev-env.js`

#### Issue: Database connection failed
**Symptoms**: "D1_ERROR" or "no such table" errors
**Solution**:
```bash
# Apply migrations to local database
wrangler d1 migrations apply baba-is-win-db --local

# Verify database exists
wrangler d1 execute baba-is-win-db --command="SELECT name FROM sqlite_master WHERE type='table'" --local
```
**Root Cause**: Database not initialized or migrations not applied

### Development Environment

#### Issue: Dev server won't start
**Common Causes**:
1. Port already in use
2. Missing environment variables
3. Incorrect Node version

**Solutions**:
1. Kill process on port: 
```bash
# Find and kill process on port 4321
lsof -ti:4321 | xargs kill -9
# Or kill all wrangler processes
pkill -f "wrangler"
```
2. Verify `.dev.vars` exists with required variables
3. Use correct Node version: `nvm use 20`

#### Issue: Hot reload not working
**Symptoms**: Changes not reflected without manual restart
**Solution**:
```bash
# Clear Astro cache
rm -rf .astro
npm run dev
```

### Authentication Issues

#### Issue: Google OAuth not working
**Symptoms**: OAuth redirect fails or returns error
**Check**:
1. Google OAuth credentials in `.dev.vars`:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:4321/api/v1/auth/google/callback
```
2. Redirect URI matches Google Cloud Console configuration
3. Credentials are for correct project

**Solution**: Update credentials and restart server

#### Issue: "Invalid token" errors
**Symptoms**: API calls return 401 Unauthorized
**Solution**: 
1. Clear browser cookies/localStorage
2. Log out and log in again
3. Check JWT_SECRET hasn't changed

### Email Issues

#### Issue: Emails not sending
**Symptoms**: No emails received, no errors in console
**Check**:
1. Resend API key in `.dev.vars`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=hello@yourdomain.com
```
2. From email is verified domain in Resend
3. Not hitting rate limits

**Solution**: Verify Resend configuration and API key validity

### Performance Issues

#### Issue: Slow page loads
**Diagnosis**: 
```bash
# Check bundle size
npm run build
# Look for large chunks in dist/_astro/
```
**Solutions**: 
1. Lazy load components
2. Optimize images
3. Enable Cloudflare caching

#### Issue: High memory usage during build
**Symptoms**: Build crashes with heap error
**Solution**:
```bash
# Increase Node memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Deployment Issues

#### Issue: Deploy fails
**Check**:
1. Build succeeds locally: `npm run build`
2. All secrets configured in Cloudflare:
```bash
wrangler secret list
```
3. Database migrations applied to production:
```bash
wrangler d1 migrations apply baba-is-win-db
```

#### Issue: Production auth not working
**Common Cause**: JWT_SECRET not set in production
**Solution**:
```bash
# Set production secret
wrangler secret put JWT_SECRET
# Enter your production secret when prompted
```

## Debug Commands

```bash
# View Cloudflare logs
wrangler tail

# Check D1 database status
wrangler d1 info baba-is-win-db

# List all tables in database
wrangler d1 execute baba-is-win-db --command="SELECT name FROM sqlite_master WHERE type='table'"

# Test specific API endpoint
curl -X POST http://localhost:4321/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Clear all caches and rebuild
rm -rf .astro node_modules dist
npm install
npm run build
```

## Project-Specific Tools

```bash
# Run health check
node .project/docs/scripts/health-check.js

# Validate environment
node .project/docs/scripts/env-validator.js

# Check for security issues
node .project/docs/scripts/package-manager.js audit
```

## Getting Help

If not resolved:
1. Check recent commits for breaking changes
2. Review Cloudflare Workers documentation
3. Check Astro framework docs
4. Ask team with:
   - Error message
   - Steps to reproduce
   - Output of `node .project/docs/scripts/health-check.js`
   - Node version (`node -v`)
   - Environment (local/production)