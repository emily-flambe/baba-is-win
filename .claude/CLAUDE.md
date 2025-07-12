# Claude Code Project Configuration

## Project Identity & Configuration
@include project-config.yml#ProjectIdentity
@include project-config.yml#ProjectStructure
@include project-config.yml#DevelopmentCommands

## Workflow Patterns
@include workflow-patterns.yml#WorktreeManagement
@include workflow-patterns.yml#PullRequestGuidelines
@include workflow-patterns.yml#ContentManagement

## Critical OAuth Configuration Guidelines

### OAuth Secret Management - NEVER BREAK THESE RULES
**CRITICAL**: OAuth failures are often due to missing or misconfigured secrets in Cloudflare Workers.

#### Required Secrets Checklist
Before any OAuth work, ALWAYS verify these secrets exist in `wrangler secret list`:
```bash
✅ GOOGLE_CLIENT_ID         # From Google Cloud Console
✅ GOOGLE_CLIENT_SECRET     # From Google Cloud Console  
✅ GOOGLE_REDIRECT_URI      # MUST match Google Console exactly
✅ JWT_SECRET              # For OAuth state token signing
```

#### Common OAuth Failure Patterns
1. **"oauth configuration error"** → Missing GOOGLE_REDIRECT_URI secret
2. **"HMAC key length (0)"** → Missing or empty JWT_SECRET
3. **"invalid client"** → GOOGLE_CLIENT_ID/SECRET mismatch
4. **"redirect_uri_mismatch"** → Google Console ≠ GOOGLE_REDIRECT_URI secret

#### OAuth Secret Commands
```bash
# Check secrets exist
wrangler secret list

# Production secrets (REQUIRED)
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET  
wrangler secret put GOOGLE_REDIRECT_URI
wrangler secret put JWT_SECRET

# Verify deployment before secret changes
wrangler deploy
```

#### GOOGLE_REDIRECT_URI Critical Notes
- **Production**: `https://emilycogsdill.com/api/auth/google/callback`
- **MUST match Google Cloud Console → APIs & Services → Credentials**
- **Both places must be identical or OAuth will fail**

#### OAuth Troubleshooting Workflow
1. Check `wrangler secret list` - verify all 4 secrets exist
2. Verify Google Cloud Console redirect URI matches exactly
3. Check Worker is deployed: `wrangler deploy` 
4. Test OAuth flow in production environment
5. Monitor logs for specific error patterns above

## Debugging Lessons Learned
@include debugging-lessons.yml#AstroFrameworkIssues
@include debugging-lessons.yml#AuthenticationComplexity  
@include debugging-lessons.yml#DatabaseMigrationIssues
@include debugging-lessons.yml#ContentManagementLessons

## Development Philosophy

This is a personal website and portfolio project built with modern web technologies. The focus is on clean content presentation, reliable authentication, and maintainable code.

### Key Principles
- **Worktree Workflow**: Always create git worktrees in the `worktrees/` folder to keep the repository organized
- **Content First**: Blog posts and thoughts are the primary content, with clean presentation being essential
- **Authentication Security**: OAuth integration must be secure and reliable
- **Asset Management**: Proper organization and optimization of images and static assets

### Technology Choices
- **Astro**: Static site generation with dynamic capabilities
- **TypeScript**: Type safety for all code
- **Cloudflare**: Pages for hosting, D1 for database, Workers for serverless functions
- **Content Management**: File-based content with frontmatter metadata

### Deployment Strategy
- **Development**: Local development with `npm run dev`
- **Testing**: Comprehensive test suite with Vitest/Jest
- **Production**: Cloudflare Pages with automatic deployments
- **Database**: Cloudflare D1 with migration scripts

### Content Guidelines
- Blog posts in `src/data/blog-posts/published/`
- Thoughts in `src/data/thoughts/published/`
- Assets organized in `public/assets/` with proper subdirectories
- Content interface available for easy content creation

### Workflow Standards
- Use worktrees for all feature development
- Share PR URLs immediately after creation
- Test builds locally before deployment
- Maintain clean asset organization