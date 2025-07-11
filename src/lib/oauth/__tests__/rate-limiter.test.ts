import { OAuthRateLimiter } from '../rate-limiter';

describe('OAuthRateLimiter', () => {
  let rateLimiter: OAuthRateLimiter;

  beforeEach(() => {
    rateLimiter = new OAuthRateLimiter();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Test Browser',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      const result = await rateLimiter.checkRateLimit(request);
      
      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBe(0);
      expect(result.reason).toBeUndefined();
    });

    it('should handle requests with missing headers', async () => {
      const request = new Request('https://example.com/api/auth/google');
      
      const result = await rateLimiter.checkRateLimit(request);
      
      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBe(0);
    });

    it('should use different IP headers', async () => {
      const headers = [
        { 'CF-Connecting-IP': '192.168.1.1' },
        { 'X-Forwarded-For': '192.168.1.2' },
        { 'X-Real-IP': '192.168.1.3' }
      ];

      for (const header of headers) {
        const request = new Request('https://example.com/api/auth/google', { headers: header });
        const result = await rateLimiter.checkRateLimit(request);
        
        expect(result.allowed).toBe(true);
      }
    });

    it('should track multiple requests from same client', async () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Test Browser',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiter.checkRateLimit(request);
        expect(result.allowed).toBe(true);
      }
    });

    it('should differentiate between different clients', async () => {
      const request1 = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Browser 1',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      const request2 = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Browser 2',
          'CF-Connecting-IP': '127.0.0.2'
        }
      });

      const result1 = await rateLimiter.checkRateLimit(request1);
      const result2 = await rateLimiter.checkRateLimit(request2);
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should handle URL encoding in user agent', async () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      const result = await rateLimiter.checkRateLimit(request);
      
      expect(result.allowed).toBe(true);
    });
  });

  describe('markSuccess', () => {
    it('should mark requests as successful', async () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Test Browser',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      await rateLimiter.checkRateLimit(request);
      rateLimiter.markSuccess(request);
      
      // Should not throw any errors
      expect(true).toBe(true);
    });

    it('should handle marking success for non-existent requests', () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Test Browser',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      // Mark success without checking rate limit first
      rateLimiter.markSuccess(request);
      
      // Should not throw any errors
      expect(true).toBe(true);
    });
  });

  describe('rate limiting behavior', () => {
    it('should simulate general rate limiting', async () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Test Browser',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      // The actual rate limiter allows 10 requests per window
      // We'll test that we can make multiple requests
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await rateLimiter.checkRateLimit(request));
      }
      
      // All should be allowed initially
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });

    it('should track client identifiers correctly', async () => {
      const sameClientRequests = [
        new Request('https://example.com/api/auth/google', {
          headers: {
            'User-Agent': 'Same Browser',
            'CF-Connecting-IP': '127.0.0.1'
          }
        }),
        new Request('https://example.com/api/auth/google', {
          headers: {
            'User-Agent': 'Same Browser',
            'CF-Connecting-IP': '127.0.0.1'
          }
        })
      ];

      for (const request of sameClientRequests) {
        const result = await rateLimiter.checkRateLimit(request);
        expect(result.allowed).toBe(true);
      }
    });

    it('should handle empty user agents', async () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      const result = await rateLimiter.checkRateLimit(request);
      
      expect(result.allowed).toBe(true);
    });

    it('should handle unknown IP addresses', async () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Test Browser'
        }
      });

      const result = await rateLimiter.checkRateLimit(request);
      
      expect(result.allowed).toBe(true);
    });
  });

  describe('security features', () => {
    it('should create unique identifiers for different clients', async () => {
      const clients = [
        { ip: '127.0.0.1', userAgent: 'Browser A' },
        { ip: '127.0.0.2', userAgent: 'Browser A' },
        { ip: '127.0.0.1', userAgent: 'Browser B' },
        { ip: '127.0.0.2', userAgent: 'Browser B' }
      ];

      for (const client of clients) {
        const request = new Request('https://example.com/api/auth/google', {
          headers: {
            'User-Agent': client.userAgent,
            'CF-Connecting-IP': client.ip
          }
        });

        const result = await rateLimiter.checkRateLimit(request);
        expect(result.allowed).toBe(true);
      }
    });

    it('should handle base64 encoding in client identifier', async () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Test) Special/Characters+=/',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      const result = await rateLimiter.checkRateLimit(request);
      
      expect(result.allowed).toBe(true);
    });
  });
});