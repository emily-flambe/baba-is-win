# .project/ Directory

This directory contains utility scripts and configurations to help with development and maintenance of the Baba Is Win project.

## Utilities Overview

The `.project/` directory contains utility scripts for project management:

### Environment Configuration

- **`.env.example`** - Master environment variables template with comprehensive documentation
  - Includes all necessary variables for local development
  - Critical Cloudflare Workers environment variables (JWT_SECRET, API_KEY_SALT)
  - Google OAuth, Resend email service, and other integrations
  - Production deployment instructions

### Utility Scripts

All scripts are located in `.project/scripts/` and can be run with Node.js:

#### `health-check.js` - Project Health Monitor
```bash
node .project/scripts/health-check.js [options]
```

Performs comprehensive health checks on the project:
- Node.js and npm version compatibility
- Package dependencies and security audits
- Environment configuration validation
- Cloudflare Workers setup verification
- Build and test system checks
- Git repository health

**Options:**
- `--quick` - Skip slow operations (builds, tests)
- `--fix` - Attempt automatic fixes where possible
- `--verbose` - Detailed output

#### `setup-dev-env.js` - Development Environment Setup
```bash
node .project/scripts/setup-dev-env.js [options]
```

Automates local development environment setup:
- Creates `.dev.vars` file from template (critical for Cloudflare Workers)
- Validates Node.js and dependency installation
- Checks Wrangler configuration
- Verifies database setup
- Provides step-by-step setup guidance

**Options:**
- `--force` - Overwrite existing files
- `--dry-run` - Show what would be done without making changes
- `--verbose` - Detailed output

#### `env-validator.js` - Environment Variables Validator
```bash
node .project/scripts/env-validator.js [options]
```

Validates environment configurations:
- Checks required variables are present
- Validates variable value patterns
- Ensures production safety (no dev values in production)
- Verifies Cloudflare Workers requirements
- Checks consistency across environment files

**Options:**
- `--fix` - Attempt to fix common issues automatically
- `--strict` - Fail on warnings (useful for CI/CD)
- `--verbose` - Detailed validation output

#### `update-context.js` - Context Synchronization
```bash
node .project/scripts/update-context.js [options]
```

Keeps context files synchronized with project state:
- Scans project structure and generates reports
- Checks environment file status
- Provides project overview and recommendations
- Helps maintain documentation accuracy

**Options:**
- `--dry-run` - Show what would be updated without making changes
- `--verbose` - Detailed scanning output

#### `package-manager.js` - Package Management
```bash
node .project/scripts/package-manager.js [command] [options]
```

Manages dependencies, security updates, and package maintenance:
- Security audit and vulnerability scanning
- Package updates with safety checks
- Clean reinstallation of dependencies
- Outdated package detection
- Package statistics and information

**Commands:**
- `info` - Show package information and statistics (default)
- `audit` - Run security audit and show vulnerabilities
- `outdated` - Show outdated packages
- `update` - Update packages with safety checks
- `clean` - Clean and reinstall node_modules

**Options:**
- `--fix` - Attempt to fix issues automatically
- `--force` - Force operations (use with caution)
- `--verbose` - Detailed output

## Quick Start

### For New Development Setup

1. **Setup development environment:**
   ```bash
   node .project/scripts/setup-dev-env.js
   ```

2. **Validate configuration:**
   ```bash
   node .project/scripts/env-validator.js --verbose
   ```

3. **Run health check:**
   ```bash
   node .project/scripts/health-check.js
   ```

### For Ongoing Maintenance

- **Regular health checks:**
  ```bash
  node .project/scripts/health-check.js --quick
  ```

- **Security and package maintenance:**
  ```bash
  node .project/scripts/package-manager.js audit
  node .project/scripts/package-manager.js outdated
  ```

- **Before deployment:**
  ```bash
  node .project/scripts/env-validator.js --strict
  node .project/scripts/health-check.js
  node .project/scripts/package-manager.js audit
  ```

- **Update context documentation:**
  ```bash
  node .project/scripts/update-context.js
  ```

## Critical Environment Variables

The following environment variables are **required** for the project to function:

### Required for All Functionality
- `JWT_SECRET` - Authentication token secret (32+ characters)
- `CRON_SECRET` - Secure cron endpoint access

### Required for Google OAuth
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret  
- `GOOGLE_REDIRECT_URI` - OAuth callback URL

### Required for Email Functionality
- `RESEND_API_KEY` - Resend email service API key
- `RESEND_FROM_EMAIL` - Email sender address

### Cloudflare Workers Specific

For **local development**, create `.dev.vars` in project root:
```bash
# Copy from template
cp .project/.env.example .dev.vars
# Edit with your actual values
```

For **production deployment**, use Wrangler secrets:
```bash
wrangler secret put JWT_SECRET
wrangler secret put API_KEY_SALT
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put RESEND_API_KEY
# ... etc
```

## Troubleshooting

### Common Issues

**JWT_SECRET errors when testing auth endpoints:**
- Ensure `.dev.vars` file exists in project root
- Verify `JWT_SECRET` is set in `.dev.vars`
- Restart `wrangler dev` after creating `.dev.vars`

**OAuth login not working:**
- Check Google OAuth credentials in `.dev.vars`
- Verify redirect URI matches Google Cloud Console configuration
- Ensure `GOOGLE_REDIRECT_URI` points to correct local/production URL

**Email notifications not sending:**
- Verify `RESEND_API_KEY` is valid and active
- Check `RESEND_FROM_EMAIL` is a verified sending domain

**Build or deployment failures:**
- Run `node .project/scripts/health-check.js` for comprehensive diagnosis
- Check that all dependencies are installed with `npm install`
- Verify Wrangler configuration in `wrangler.json`

### Getting Help

1. **Run health check for diagnosis:**
   ```bash
   node .project/scripts/health-check.js --verbose
   ```

2. **Validate environment configuration:**
   ```bash
   node .project/scripts/env-validator.js --verbose
   ```

3. **Check project context:**
   ```bash
   node .project/scripts/update-context.js --verbose
   ```

## Security Notes

- **Never commit secrets** to version control
- Use `.dev.vars` for local development only
- Use `wrangler secret put` for production secrets
- The `.project/.env.example` serves as documentation, not actual configuration
- Regularly audit dependencies with `npm audit`

---

*Project Utilities v1.0.0 - Helping you build with confidence!*