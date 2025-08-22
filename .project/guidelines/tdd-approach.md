# Test-Driven Development Approach

## Testing Philosophy
Pragmatic TDD - We prioritize testing for critical business logic, API endpoints, and user-facing features. Not everything needs test-first development, but everything critical needs tests.

## When We Write Tests

### Test-First (TDD)
- Complex business logic (auth, permissions, calculations)
- Critical algorithms (data processing, validation)
- Public API endpoints
- Security-sensitive code

### Test-During
- UI components after design stabilizes
- Integration points between services
- Database queries and migrations
- Email templates and sending logic

### Test-After (Acceptable Cases)
- Exploratory/spike work
- Prototypes for museum experiments
- Infrastructure configuration code
- Simple UI components with no logic

## Test Coverage Standards
- Minimum coverage: 70% overall
- Critical paths: 100% (auth, payments, data operations)
- API endpoints: 90%
- UI components: Focus on behavior, not implementation
- Utilities: 80%

## Testing Stack
- Unit tests: Vitest
- Integration tests: Vitest with API mocking
- E2E tests: Playwright (when needed)
- Database tests: In-memory SQLite for D1

## Test Patterns

### Naming Convention
```typescript
// Pattern: describe what is being tested and expected outcome
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid email', async () => {});
    it('should reject duplicate emails', async () => {});
    it('should hash password before storing', async () => {});
  });
});
```

### Test Structure
```typescript
// Arrange - Act - Assert pattern
it('should validate email format', () => {
  // Arrange
  const invalidEmail = 'not-an-email';
  
  // Act
  const result = validateEmail(invalidEmail);
  
  // Assert
  expect(result).toBe(false);
});
```

### API Testing Pattern
```typescript
describe('POST /api/v1/auth/login', () => {
  it('should return JWT token for valid credentials', async () => {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'valid' })
    });
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.token).toBeDefined();
  });
});
```

### Mocking Strategy
- Mock external services (Resend email, Google OAuth)
- Use real implementations for database queries in tests
- Avoid mocking internal modules unless necessary
- Use test fixtures for consistent test data

## AI Assistant Testing Guidelines

### When generating tests:
1. Start with the unhappy path (error cases)
2. Include edge cases (empty, null, boundaries)
3. Test one behavior per test
4. Use descriptive test names that explain the scenario

### When implementing features:
1. Show me the failing test first
2. Implement minimal code to pass
3. Refactor only after tests pass
4. Keep test coverage visible

### Example workflow:
```bash
# 1. Write failing test
npm test -- --watch auth.test.ts

# 2. Implement feature
# 3. Verify test passes
# 4. Check coverage
npm run test:coverage
```

## Common Testing Pitfalls
- Testing implementation details instead of behavior
- Brittle tests tied to DOM structure
- Slow test suites (mock external calls)
- Flaky/intermittent failures (avoid time dependencies)
- Over-mocking (prefer integration tests when possible)

## Database Testing
```typescript
// Use test database for isolation
beforeEach(async () => {
  await resetTestDatabase();
});

// Test with real queries
it('should store user in database', async () => {
  const user = await createUser({ email: 'test@example.com' });
  const found = await getUserByEmail('test@example.com');
  expect(found.id).toBe(user.id);
});
```

## Quick Commands
```bash
# Run all tests
npm test

# Run specific test file
npm test auth.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# UI mode for debugging
npm run test:ui
```

## Test Data Management
- Use factories for creating test objects
- Reset database state between tests
- Use deterministic test data (no random values)
- Clean up after tests (close connections, clear mocks)

## CI/CD Integration
- Tests must pass before merging PRs
- Coverage reports on PR comments
- Fail builds if coverage drops below threshold
- Run tests in parallel when possible