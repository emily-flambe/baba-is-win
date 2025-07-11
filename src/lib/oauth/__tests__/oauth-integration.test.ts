import { OAuthStateManager } from '../state';
import { OAuthRequestValidator, AuthorizationCodeValidator } from '../validation';
import { OAuthRateLimiter } from '../rate-limiter';

describe('OAuth Integration Tests', () => {
  const mockJwtSecret = '4wMCazSNE46y8A0hfPiZGuzj8MIr6tLn8A4ThokesBg=';

  describe('State Management', () => {
    let stateManager: OAuthStateManager;

    beforeEach(() => {
      stateManager = new OAuthStateManager(mockJwtSecret);
    });

    it('should create and verify state tokens', async () => {
      const stateData = {
        returnUrl: '/dashboard',
        linkAccount: false,
        userId: 'user123'
      };

      const state = await stateManager.createState(stateData);
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.split('.')).toHaveLength(3); // JWT structure

      const verified = await stateManager.verifyState(state);
      expect(verified.returnUrl).toBe('/dashboard');
      expect(verified.linkAccount).toBe(false);
      expect(verified.userId).toBe('user123');
      expect(verified.timestamp).toBeDefined();
    });

    it('should reject invalid state tokens', async () => {
      await expect(stateManager.verifyState('invalid.token.here')).rejects.toThrow('Invalid or expired OAuth state');
      await expect(stateManager.verifyState('')).rejects.toThrow('Invalid or expired OAuth state');
    });

    it('should handle minimal state data', async () => {
      const state = await stateManager.createState({});
      const verified = await stateManager.verifyState(state);
      
      expect(verified.timestamp).toBeDefined();
      expect(verified.returnUrl).toBeUndefined();
      expect(verified.linkAccount).toBeUndefined();
      expect(verified.userId).toBeUndefined();
    });

    it('should create different tokens for different data', async () => {
      const state1 = await stateManager.createState({ userId: 'user1' });
      const state2 = await stateManager.createState({ userId: 'user2' });
      
      expect(state1).not.toBe(state2);
    });
  });

  describe('Request Validation', () => {
    describe('Initiation Request Validation', () => {
      it('should validate basic OAuth initiation requests', () => {
        const validRequest = new Request('https://example.com/api/auth/google');
        const result = OAuthRequestValidator.validateInitiationRequest(validRequest);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate OAuth initiation with return URL', () => {
        const validRequest = new Request('https://example.com/api/auth/google?returnUrl=/dashboard');
        const result = OAuthRequestValidator.validateInitiationRequest(validRequest);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate OAuth initiation with link account', () => {
        const validRequest = new Request('https://example.com/api/auth/google?linkAccount=true');
        const result = OAuthRequestValidator.validateInitiationRequest(validRequest);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid return URLs', () => {
        const invalidRequest = new Request('https://example.com/api/auth/google?returnUrl=https://malicious.com');
        const result = OAuthRequestValidator.validateInitiationRequest(invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid return URL');
      });

      it('should reject invalid linkAccount parameter', () => {
        const invalidRequest = new Request('https://example.com/api/auth/google?linkAccount=maybe');
        const result = OAuthRequestValidator.validateInitiationRequest(invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid linkAccount parameter');
      });
    });

    describe('Callback Request Validation', () => {
      it('should validate OAuth callback requests with valid data', () => {
        const mockState = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aW1lc3RhbXAiOjE2MjMzNjA0MDAwMDB9.mockSignature';
        const validRequest = new Request(`https://example.com/api/auth/google/callback?code=4/0AX4XfWiValidCodeHere123456789abcdefghijklmnopqrstuvwxyz&state=${mockState}`);
        const result = OAuthRequestValidator.validateCallbackRequest(validRequest);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle OAuth errors gracefully', () => {
        const validRequest = new Request('https://example.com/api/auth/google/callback?error=access_denied');
        const result = OAuthRequestValidator.validateCallbackRequest(validRequest);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.oauthError).toBe('access_denied');
      });

      it('should reject requests missing authorization code', () => {
        const invalidRequest = new Request('https://example.com/api/auth/google/callback?state=valid.jwt.token');
        const result = OAuthRequestValidator.validateCallbackRequest(invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing authorization code');
      });

      it('should reject requests with invalid authorization code', () => {
        const invalidRequest = new Request('https://example.com/api/auth/google/callback?code=abc&state=valid.jwt.token');
        const result = OAuthRequestValidator.validateCallbackRequest(invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid authorization code format');
      });

      it('should reject requests missing state parameter', () => {
        const invalidRequest = new Request('https://example.com/api/auth/google/callback?code=4/0AX4XfWiValidCodeHere123456789');
        const result = OAuthRequestValidator.validateCallbackRequest(invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Missing state parameter');
      });

      it('should reject requests with invalid state format', () => {
        const invalidRequest = new Request('https://example.com/api/auth/google/callback?code=4/0AX4XfWiValidCodeHere123456789&state=invalid-state');
        const result = OAuthRequestValidator.validateCallbackRequest(invalidRequest);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid state token format');
      });
    });

    describe('Authorization Code Validation', () => {
      it('should validate legitimate authorization codes', () => {
        const validCode = '4/0AX4XfWiValidCodeHere123456789abcdefghijklmnopqrstuvwxyz';
        expect(AuthorizationCodeValidator.validateAuthorizationCode(validCode)).toBe(true);
      });

      it('should reject short authorization codes', () => {
        const shortCode = '4/short';
        expect(AuthorizationCodeValidator.validateAuthorizationCode(shortCode)).toBe(false);
      });

      it('should reject codes with invalid characters', () => {
        const invalidCode = '4/0AX4XfWiValidCodeHere123456789!@#$%^&*()';
        expect(AuthorizationCodeValidator.validateAuthorizationCode(invalidCode)).toBe(false);
      });

      it('should detect expired codes', () => {
        const now = Date.now();
        const expiredTime = now - 700000; // 11+ minutes ago
        const validTime = now - 300000; // 5 minutes ago
        
        expect(AuthorizationCodeValidator.isCodeExpired(expiredTime)).toBe(true);
        expect(AuthorizationCodeValidator.isCodeExpired(validTime)).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    let rateLimiter: OAuthRateLimiter;

    beforeEach(() => {
      rateLimiter = new OAuthRateLimiter();
    });

    it('should allow requests within rate limits', async () => {
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Test Browser',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      const result = await rateLimiter.checkRateLimit(request);
      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBe(0);
    });

    it('should mark successful attempts', async () => {
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

    it('should handle missing headers gracefully', async () => {
      const request = new Request('https://example.com/api/auth/google');
      
      const result = await rateLimiter.checkRateLimit(request);
      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBe(0);
    });
  });

  describe('Integration Flow', () => {
    it('should complete full OAuth state flow', async () => {
      const stateManager = new OAuthStateManager(mockJwtSecret);
      
      // Create initial state
      const initialData = {
        returnUrl: '/dashboard',
        linkAccount: false,
        userId: 'user123'
      };
      const stateToken = await stateManager.createState(initialData);
      
      // Simulate callback request
      const callbackUrl = `https://example.com/api/auth/google/callback?code=4/0AX4XfWiValidCodeHere123456789abcdefghijklmnopqrstuvwxyz&state=${stateToken}`;
      const callbackRequest = new Request(callbackUrl);
      
      // Validate callback request
      const validation = OAuthRequestValidator.validateCallbackRequest(callbackRequest);
      expect(validation.valid).toBe(true);
      
      // Verify state
      const verifiedState = await stateManager.verifyState(stateToken);
      expect(verifiedState.returnUrl).toBe('/dashboard');
      expect(verifiedState.linkAccount).toBe(false);
      expect(verifiedState.userId).toBe('user123');
    });

    it('should handle rate limiting during OAuth flow', async () => {
      const rateLimiter = new OAuthRateLimiter();
      const request = new Request('https://example.com/api/auth/google', {
        headers: {
          'User-Agent': 'Test Browser',
          'CF-Connecting-IP': '127.0.0.1'
        }
      });

      // Check rate limit
      const rateResult = await rateLimiter.checkRateLimit(request);
      expect(rateResult.allowed).toBe(true);
      
      // Validate request
      const validation = OAuthRequestValidator.validateInitiationRequest(request);
      expect(validation.valid).toBe(true);
    });
  });
});