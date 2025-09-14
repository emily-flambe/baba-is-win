import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/pages/api/chat.js';

describe('Chat API', () => {
  let mockRequest;
  let mockLocals;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Setup default mock locals with environment
    mockLocals = {
      runtime: {
        env: {
          AUTORAG_API_TOKEN: 'test-token',
          CF_ACCOUNT_ID: 'test-account-id',
          AUTORAG_INSTANCE: 'test-instance',
          KV: null // Will be mocked per test as needed
        }
      }
    };
  });

  describe('Input Validation', () => {
    it('should return 400 for missing query field', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({ notQuery: 'test' }),
        headers: new Map()
      };

      const response = await POST({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request');
      expect(data.message).toContain('query');
    });

    it('should return 400 for empty query', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: '   ' }),
        headers: new Map()
      };

      const response = await POST({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query');
      expect(data.message).toBe('Query cannot be empty');
    });

    it('should return 400 for query exceeding 500 characters', async () => {
      const longQuery = 'a'.repeat(501);
      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: longQuery }),
        headers: new Map()
      };

      const response = await POST({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query too long');
      expect(data.message).toContain('500 characters');
    });
  });

  describe('Environment Configuration', () => {
    it('should return 503 when AUTORAG_API_TOKEN is missing', async () => {
      mockLocals.runtime.env.AUTORAG_API_TOKEN = undefined;

      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: 'test query' }),
        headers: new Map()
      };

      const response = await POST({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Service unavailable');
      expect(data.message).toContain('not properly configured');
    });

    it('should return 503 when CF_ACCOUNT_ID is missing', async () => {
      mockLocals.runtime.env.CF_ACCOUNT_ID = undefined;

      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: 'test query' }),
        headers: new Map()
      };

      const response = await POST({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error).toBe('Service unavailable');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit of 10 requests per minute', async () => {
      const mockKV = {
        get: vi.fn().mockResolvedValue(JSON.stringify({
          minute: Math.floor(Date.now() / 60000),
          count: 10
        })),
        put: vi.fn()
      };

      mockLocals.runtime.env.KV = mockKV;

      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: 'test query' }),
        headers: new Map([['CF-Connecting-IP', '192.168.1.1']])
      };

      const response = await POST({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.retry_after).toBe(60);
    });

    it('should track requests per IP address', async () => {
      const mockKV = {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn()
      };

      mockLocals.runtime.env.KV = mockKV;

      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: 'test query' }),
        headers: new Map([['CF-Connecting-IP', '192.168.1.1']])
      };

      // Mock fetch to simulate AutoRAG API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          result: {
            response: 'Test response',
            data: []
          }
        })
      });

      await POST({ request: mockRequest, locals: mockLocals });

      expect(mockKV.put).toHaveBeenCalledWith(
        'chat_rate:192.168.1.1',
        expect.stringContaining('"count":1'),
        { expirationTtl: 120 }
      );
    });
  });

  describe('Successful Request', () => {
    it('should process valid chat request and return formatted response', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: 'What is Emily working on?' }),
        headers: new Map([['CF-Connecting-IP', '192.168.1.1']])
      };

      // Mock fetch for AutoRAG API
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          result: {
            response: 'Emily is working on various projects including her personal website.',
            data: [
              {
                title: 'About Emily',
                url: '/about',
                snippet: 'Emily is a developer...'
              }
            ]
          }
        })
      });

      const response = await POST({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('answer');
      expect(data).toHaveProperty('sources');
      expect(data).toHaveProperty('suggestions');
      expect(data).toHaveProperty('confidence');
      // Confidence is a string like 'high', 'medium', or 'low'
      expect(['high', 'medium', 'low']).toContain(data.confidence);
    });

    it('should handle AutoRAG API errors gracefully', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: 'test query' }),
        headers: new Map()
      };

      // Mock fetch to simulate AutoRAG API error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500
      });

      const response = await POST({ request: mockRequest, locals: mockLocals });
      const data = await response.json();

      // When AutoRAG fails, the API returns 200 with error flag and fallback response
      expect(response.status).toBe(200);
      expect(data.error).toBe(true);
      expect(data.answer).toContain('trouble accessing my knowledge base');
      expect(data.confidence).toBe('low');
    });
  });

  describe('Request Headers', () => {
    it('should use CF-Connecting-IP for rate limiting when available', async () => {
      const mockKV = {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn()
      };

      mockLocals.runtime.env.KV = mockKV;

      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: 'test' }),
        headers: new Map([
          ['CF-Connecting-IP', '10.0.0.1'],
          ['X-Forwarded-For', '192.168.1.1']
        ])
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          result: { response: 'Test', data: [] }
        })
      });

      await POST({ request: mockRequest, locals: mockLocals });

      expect(mockKV.put).toHaveBeenCalledWith(
        'chat_rate:10.0.0.1',
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should fallback to X-Forwarded-For when CF-Connecting-IP is not available', async () => {
      const mockKV = {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn()
      };

      mockLocals.runtime.env.KV = mockKV;

      mockRequest = {
        json: vi.fn().mockResolvedValue({ query: 'test' }),
        headers: new Map([['X-Forwarded-For', '192.168.1.1']])
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          result: { response: 'Test', data: [] }
        })
      });

      await POST({ request: mockRequest, locals: mockLocals });

      expect(mockKV.put).toHaveBeenCalledWith(
        'chat_rate:192.168.1.1',
        expect.any(String),
        expect.any(Object)
      );
    });
  });
});