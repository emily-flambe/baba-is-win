import { vi, beforeEach } from 'vitest';

// Mock environment variables for testing
process.env.SITE_URL = 'https://test.example.com';
process.env.SITE_NAME = 'Test Site';
process.env.JWT_SECRET = 'test-secret';
process.env.GMAIL_CLIENT_ID = 'test-client-id';
process.env.GMAIL_CLIENT_SECRET = 'test-client-secret';
process.env.GMAIL_REFRESH_TOKEN = 'test-refresh-token';
process.env.GMAIL_FROM_EMAIL = 'test@example.com';
process.env.CRON_SECRET = 'test-cron-secret';

// Mock crypto API for Node.js environment
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid'),
  getRandomValues: vi.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    digest: vi.fn(async (algorithm, data) => {
      // Mock hash function
      return new ArrayBuffer(32);
    })
  }
});

// Mock console methods for cleaner test output
vi.stubGlobal('console', {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
});

// Mock setTimeout and clearTimeout for testing
vi.stubGlobal('setTimeout', vi.fn((fn, delay) => {
  if (typeof fn === 'function') {
    // Execute immediately for test speed
    setImmediate(fn);
  }
  return 1;
}));

vi.stubGlobal('clearTimeout', vi.fn());

// Mock Date.now for consistent timestamps in tests
const mockDate = new Date('2025-01-01T00:00:00.000Z');
vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime());

// Clean up after each test
beforeEach(() => {
  vi.clearAllMocks();
});