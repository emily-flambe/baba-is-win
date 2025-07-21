# Development Guide

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm (comes with Node.js)
- Cloudflare account with access to Worker 'personal' and D1 database 'baba-is-win-db'
- Git for version control

### Initial Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see Environment section)
4. Initialize database: `wrangler d1 migrations apply baba-is-win-db --local`
5. Start development server: `npm run dev`

## Environment Configuration

### Critical: .dev.vars File
**The development server will not function without proper environment variables.**

Create `.dev.vars` file in project root for the 'personal' worker with:
```env
JWT_SECRET=dev-secret-key-for-local-testing-only-never-use-in-production
API_KEY_SALT=dev-salt-for-api-keys-local-testing-only
```

### Development Workflow
1. Kill existing processes: `pkill -f "wrangler"`
2. Verify `.dev.vars` exists and contains required variables
3. Restart server: `npm run dev`
4. Wait for full initialization before testing

## Development Commands

### Core Commands
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run preview       # Preview production build
npm run deploy        # Deploy to Cloudflare
npm run check         # Build check and type validation
```

### Testing Commands
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:ui       # Open test UI
npm run test:types    # Type checking only
```

### Database Commands (for 'baba-is-win-db')
```bash
wrangler d1 migrations list baba-is-win-db
wrangler d1 migrations apply baba-is-win-db --local
wrangler d1 execute baba-is-win-db --command="SELECT * FROM users" --local
```

### Museum Commands
```bash
npm run museum:screenshots       # Update all screenshots
npm run museum:screenshots:force # Force update all screenshots
npm run museum:screenshot        # Capture single screenshot
```

## Project Structure Best Practices

### File Organization
- **Pages**: Use Astro files for static pages, add `.ts` for API endpoints
- **Components**: Prefer Astro components, use Svelte for interactivity
- **Libraries**: Keep business logic in `/src/lib`
- **Utilities**: Helper functions in `/src/utils`
- **Types**: TypeScript definitions in relevant feature folders

### Naming Conventions
- **Files**: kebab-case for most files (`email-service.ts`)
- **Components**: PascalCase for components (`EmailPreferences.astro`)
- **API Routes**: Descriptive names matching their function
- **Database**: snake_case for tables and columns

### Code Organization Patterns
- **Feature-based**: Group related functionality together
- **Layer separation**: Keep data, business logic, and presentation separate
- **Dependency injection**: Use TypeScript interfaces for testability
- **Error handling**: Consistent error patterns across the application

## Development Workflow

### Adding New Features
1. **Plan**: Create documentation in `/docs/planning/`
2. **Database**: Add migrations to 'baba-is-win-db' if schema changes needed
3. **Backend**: Implement services in `/src/lib/`
4. **API**: Create endpoints in `/src/pages/api/`
5. **Frontend**: Build components and pages
6. **Tests**: Add comprehensive test coverage
7. **Documentation**: Update relevant docs

### Database Changes
1. Create new migration file in `/migrations/`
2. Use sequential numbering: `0014_feature_name.sql`
3. Test locally: `wrangler d1 migrations apply baba-is-win-db --local`
4. Deploy to production: `wrangler d1 migrations apply baba-is-win-db`

### Email System Development
1. Templates in `/src/lib/email/templates/`
2. Services in `/src/lib/email/`
3. Test endpoints in `/src/pages/api/admin/test-*.ts`
4. Always test email functionality thoroughly

### Authentication Development
1. Core logic in `/src/lib/auth/`
2. Middleware in `/src/middleware.ts`
3. API endpoints in `/src/pages/api/auth/`
4. Frontend components in `/src/components/auth/`

## API Development Standards

### Route Structure
All API endpoints follow: `/api/v1/{domain}/{action}`

**Approved domains:**
- `/api/v1/auth/*` - Authentication & authorization
- `/api/v1/user/*` - User-specific operations
- `/api/v1/admin/*` - Administrative functions
- `/api/v1/files/*` - File operations

### Request/Response Patterns
```typescript
// Success response
{
  success: true,
  data: any,
  message?: string
}

// Error response
{
  success: false,
  error: string,
  details?: any
}
```

### Authentication
- Use JWT tokens in Authorization header
- Validate tokens in middleware
- Rate limiting on sensitive endpoints
- CSRF protection where applicable

## Testing Guidelines

### Test Categories
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete user flow testing
- **Security Tests**: Authentication and authorization testing

### Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should handle expected behavior', async () => {
    // Test implementation
  });

  afterEach(() => {
    // Cleanup
  });
});
```

### Testing Best Practices
- Mock external services
- Use test fixtures for consistent data
- Test both success and error paths
- Validate security scenarios

## Performance Optimization

### Core Web Vitals Focus
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Optimization Techniques
- Image optimization with Sharp
- Font preloading
- CSS critical path optimization
- JavaScript code splitting
- Cloudflare edge caching

### Database Optimization
- Use indexed queries
- Implement connection pooling
- Monitor query performance
- Regular database maintenance

## Security Best Practices

### Authentication Security
- Strong password requirements
- JWT token expiration
- Rate limiting on auth endpoints
- Secure session management

### Data Protection
- Input validation on all endpoints
- SQL injection prevention
- XSS protection
- CSRF token validation

### Environment Security
- Never commit secrets to version control
- Use environment-specific configurations
- Regular secret rotation
- Monitor for security issues

## Deployment Process

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Type checking successful
- [ ] Build completes without errors
- [ ] Environment variables configured
- [ ] Database migrations applied

### Deployment Steps
1. Run full test suite: `npm test`
2. Build application: `npm run build`
3. Deploy to Cloudflare: `npm run deploy`
4. Verify deployment health
5. Monitor for errors

### Post-deployment Verification
- Check application functionality
- Verify database connectivity
- Test email notifications
- Monitor performance metrics

## Troubleshooting

### Common Issues

**JWT_SECRET Missing**
- Ensure `.dev.vars` file exists
- Check variable names match exactly
- Restart development server

**Database Connection Issues**
- Verify 'baba-is-win-db' D1 database configuration
- Check migration status for 'baba-is-win-db'
- Validate local database setup for 'baba-is-win-db'

**Email Functionality**
- Confirm Gmail API credentials
- Check email service configuration
- Review notification settings

**Build Failures**
- Clear node_modules and reinstall
- Check for TypeScript errors
- Verify all imports are correct

### Debug Tools
- Browser developer tools
- Cloudflare Worker 'personal' logs
- Local debugging with VS Code
- Network request inspection

### Getting Help
- Check existing documentation
- Review test files for examples
- Consult Cloudflare Workers documentation
- Review Astro framework documentation