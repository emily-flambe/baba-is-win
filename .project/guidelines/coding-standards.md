# Coding Standards

## General Principles
- Clarity over cleverness
- Consistency throughout codebase
- Self-documenting code
- Minimal dependencies

## Language-Specific Standards

### TypeScript/JavaScript
- Style guide: StandardJS with TypeScript extensions
- Formatting: Prettier (default config)
- Naming conventions:
  - Variables: camelCase
  - Functions: camelCase
  - Classes: PascalCase
  - Constants: UPPER_SNAKE_CASE
  - Files: kebab-case for most files, PascalCase for components

### Astro Components
- Use `.astro` for static components
- Use Svelte (`.svelte`) for interactive components
- Props validation with TypeScript interfaces
- Minimal client-side JavaScript

## Code Patterns

### Preferred Patterns
```typescript
// Good: Explicit types and error handling
export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await db.select().from(users).where(eq(users.id, id));
    return user[0] || null;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return null;
  }
}
```

### Anti-Patterns to Avoid
```typescript
// Bad: No types, no error handling
export async function getUser(id) {
  const user = await db.query(`SELECT * FROM users WHERE id = ${id}`);
  return user;
}
```

## API Route Patterns
```typescript
// Good: Consistent API response structure
export async function POST({ request, locals }: APIContext) {
  try {
    const data = await request.json();
    // Validation
    if (!data.email) {
      return json({ success: false, error: 'Email required' }, { status: 400 });
    }
    // Business logic
    const result = await processRequest(data);
    return json({ success: true, data: result });
  } catch (error) {
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
```

## Error Handling
- Always handle errors explicitly
- Log errors with context
- Fail fast with clear messages
- Use typed error responses

## Testing Requirements
- Minimum coverage: 70%
- Test naming: describe what is being tested and expected outcome
- Test structure: Arrange-Act-Assert (AAA)

## Documentation Standards
- Functions: JSDoc/TSDoc for public APIs
- Complex logic: Inline comments explaining "why"
- APIs: Clear endpoint documentation

## Performance Guidelines
- Bundle size: < 500KB initial load
- Lazy load non-critical resources
- Optimize images with Sharp
- Use Cloudflare edge caching

## Security Practices
- Input validation on all endpoints
- Parameterized database queries (no string concatenation)
- Authentication via JWT middleware
- Environment variables for secrets

## Git Conventions
- Commit messages: Conventional commits format
  - `feat:` new feature
  - `fix:` bug fix
  - `docs:` documentation
  - `style:` formatting
  - `refactor:` code restructuring
  - `test:` testing
  - `chore:` maintenance
- Branch naming: `feature/description`, `fix/issue-description`
- PR requirements: Description, tests pass, code review

## File Organization
```
src/
├── components/     # Reusable UI components
├── layouts/        # Page layouts
├── lib/           # Business logic and services
│   ├── auth/      # Authentication logic
│   ├── db/        # Database queries
│   └── email/     # Email service
├── pages/         # Routes and API endpoints
│   └── api/       # API routes
├── styles/        # Global styles
└── utils/         # Helper functions
```

## Cloudflare Workers Specific
- Use `c.env` for environment variables in Workers
- Implement request context properly
- Handle edge cases for D1 database
- Use KV storage for caching when appropriate