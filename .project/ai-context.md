# AI Agent Context

## Project Understanding for AI Agents

### Project Type
This is a **personal website and blog** built with modern web technologies. The primary focus is authentic personal expression combined with technical excellence. The site uses a unique Baba Is You-inspired aesthetic.

### Key Context for AI Assistance
- **Owner**: Emily Cogsdill (emily-flambe on GitHub)
- **Primary Use**: Personal blogging and portfolio showcase
- **Development Style**: Heavy AI assistance with human oversight
- **Technical Level**: Advanced, using edge computing and modern frameworks

## Development Philosophy

### AI-First Development
This project embraces AI assistance for:
- Code implementation and optimization
- Architecture decisions and best practices
- Testing strategy and implementation
- Documentation and maintenance
- Feature planning and execution

### Quality Standards
- **Code Quality**: TypeScript, proper error handling, comprehensive testing
- **Security**: JWT authentication, rate limiting, input validation
- **Performance**: Edge computing, optimized assets, fast loading
- **User Experience**: Responsive design, accessibility, clear navigation

## Common AI Tasks

### Content Management
- Blog post creation and formatting
- Thought posting and organization
- Image optimization and processing
- Metadata generation and SEO

### Feature Development
- Authentication system enhancements
- Email notification improvements
- Museum/portfolio updates
- API endpoint creation

### System Maintenance
- Database migration creation
- Performance optimization
- Security updates
- Test coverage improvements

## Technical Context

### Architecture Patterns
- **JAMstack**: JavaScript, APIs, and Markup
- **Edge-first**: Cloudflare Workers global distribution
- **Component-based**: Reusable Astro and Svelte components
- **API-first**: RESTful endpoints with clear contracts

### Data Flow Patterns
1. **Content**: Markdown files → Processing → Astro pages
2. **Authentication**: JWT tokens → Middleware → Protected routes
3. **Email**: Content changes → Notification service → Gmail API
4. **Museum**: GitHub API → Config processing → Gallery display

### Security Considerations
- All user inputs must be validated
- Database queries must use parameterized statements
- Authentication required for sensitive operations
- Rate limiting on all public APIs

## AI Integration Guidelines

### Code Generation
- Follow existing patterns and conventions
- Use TypeScript for type safety
- Include comprehensive error handling
- Add appropriate tests for new features

### Database Operations
- Always use migrations for schema changes
- Follow sequential numbering for migration files
- Test migrations locally before deployment
- Include rollback considerations

### API Development
- Follow versioned routing pattern: `/api/v1/{domain}/{action}`
- Use consistent request/response formats
- Implement proper authentication and authorization
- Include rate limiting and input validation

### Testing Requirements
- Unit tests for business logic
- Integration tests for API endpoints
- Security tests for authentication flows
- Performance tests for critical paths

## Common Gotchas for AI Agents

### Environment Variables
- **Critical**: `.dev.vars` file must exist for development
- JWT_SECRET and API_KEY_SALT are required for authentication
- Missing environment variables will cause authentication failures
- Server restart required after environment changes

### Database Considerations
- Cloudflare D1 has specific limitations and syntax requirements
- Local development uses SQLite compatibility mode
- Migration order matters - never skip sequence numbers
- Always test queries locally before deployment

### Email System
- Gmail API requires specific OAuth setup
- Email templates have both HTML and text versions
- Notification system has complex state management
- Test email functionality thoroughly in development

### Authentication Flow
- JWT tokens have specific expiration and refresh patterns
- OAuth state management requires cryptographic security
- Rate limiting applies to authentication endpoints
- Session cookies have specific security requirements

## AI Agent Best Practices

### Before Making Changes
1. Read relevant documentation in `/docs/` and `.project/`
2. Understand the existing code patterns
3. Check for environment variable requirements
4. Review related test files for examples

### When Implementing Features
1. Start with planning and documentation
2. Create database migrations if needed
3. Implement backend services first
4. Add API endpoints with proper validation
5. Build frontend components
6. Add comprehensive tests
7. Update documentation

### Quality Assurance
1. Run all tests before committing
2. Check TypeScript compilation
3. Verify environment variable requirements
4. Test authentication flows end-to-end
5. Validate email functionality if applicable

### Error Handling
1. Use consistent error response formats
2. Log errors appropriately for debugging
3. Provide helpful error messages to users
4. Implement proper fallback mechanisms
5. Monitor for production issues

## Project-Specific Knowledge

### Baba Is You Theme
- Color scheme: Yellow/black with pixel art aesthetic
- Typography: Monospace fonts with game-inspired elements
- UI Elements: Blocky, game-like interface components
- Navigation: Simple, clear, game-inspired structure

### Content Organization
- Blog posts: Longer-form content with rich media
- Thoughts: Quick takes and micro-blogging
- Museum: Project portfolio with GitHub integration
- About: Personal information and contact

### User Experience Priorities
1. Fast loading and responsive design
2. Clear navigation and content discovery
3. Authentic personal voice and content
4. Technical excellence without complexity
5. Accessible and inclusive design

This context should help AI agents understand the project's purpose, architecture, and development patterns for effective assistance.