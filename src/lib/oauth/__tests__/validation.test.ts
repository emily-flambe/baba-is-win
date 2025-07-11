import { OAuthRequestValidator, AuthorizationCodeValidator } from '../validation';

describe('OAuthRequestValidator', () => {
  describe('validateInitiationRequest', () => {
    it('should validate basic requests', () => {
      const request = new Request('https://example.com/api/auth/google');
      const result = OAuthRequestValidator.validateInitiationRequest(request);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate requests with valid return URL', () => {
      const request = new Request('https://example.com/api/auth/google?returnUrl=/dashboard');
      const result = OAuthRequestValidator.validateInitiationRequest(request);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate requests with valid linkAccount parameter', () => {
      const validValues = ['true', 'false'];
      
      validValues.forEach(value => {
        const request = new Request(`https://example.com/api/auth/google?linkAccount=${value}`);
        const result = OAuthRequestValidator.validateInitiationRequest(request);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject requests with invalid return URLs', () => {
      const invalidUrls = [
        'https://malicious.com/steal-tokens',
        'http://evil.com',
        'javascript:alert(1)',
        'ftp://badprotocol.com'
      ];
      
      invalidUrls.forEach(url => {
        const request = new Request(`https://example.com/api/auth/google?returnUrl=${encodeURIComponent(url)}`);
        const result = OAuthRequestValidator.validateInitiationRequest(request);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid return URL');
      });
    });

    it('should reject requests with invalid linkAccount values', () => {
      const invalidValues = ['yes', 'no', '1', '0', 'maybe', 'undefined'];
      
      invalidValues.forEach(value => {
        const request = new Request(`https://example.com/api/auth/google?linkAccount=${value}`);
        const result = OAuthRequestValidator.validateInitiationRequest(request);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid linkAccount parameter');
      });
    });

    it('should accept relative return URLs', () => {
      const request = new Request('https://example.com/api/auth/google?returnUrl=%2Fdashboard');
      const result = OAuthRequestValidator.validateInitiationRequest(request);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple validation errors', () => {
      const request = new Request('https://example.com/api/auth/google?returnUrl=https://malicious.com&linkAccount=maybe');
      const result = OAuthRequestValidator.validateInitiationRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid return URL');
      expect(result.errors).toContain('Invalid linkAccount parameter');
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('validateCallbackRequest', () => {
    it('should validate requests with valid code and state', () => {
      const mockState = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aW1lc3RhbXAiOjE2MjMzNjA0MDAwMDB9.mockSignature';
      const validCode = '4/0AX4XfWiValidCodeHere123456789abcdefghijklmnopqrstuvwxyz';
      
      const request = new Request(`https://example.com/api/auth/google/callback?code=${validCode}&state=${mockState}`);
      const result = OAuthRequestValidator.validateCallbackRequest(request);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle OAuth error responses', () => {
      const errorCodes = ['access_denied', 'invalid_request', 'unauthorized_client'];
      
      errorCodes.forEach(error => {
        const request = new Request(`https://example.com/api/auth/google/callback?error=${error}`);
        const result = OAuthRequestValidator.validateCallbackRequest(request);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.oauthError).toBe(error);
      });
    });

    it('should reject requests missing authorization code', () => {
      const mockState = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aW1lc3RhbXAiOjE2MjMzNjA0MDAwMDB9.mockSignature';
      const request = new Request(`https://example.com/api/auth/google/callback?state=${mockState}`);
      const result = OAuthRequestValidator.validateCallbackRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing authorization code');
    });

    it('should reject requests with invalid authorization codes', () => {
      const mockState = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aW1lc3RhbXAiOjE2MjMzNjA0MDAwMDB9.mockSignature';
      const invalidCodes = ['short', 'abc', 'invalid!@#$%^&*()'];
      
      invalidCodes.forEach(code => {
        const request = new Request(`https://example.com/api/auth/google/callback?code=${code}&state=${mockState}`);
        const result = OAuthRequestValidator.validateCallbackRequest(request);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid authorization code format');
      });
    });

    it('should reject requests missing state parameter', () => {
      const validCode = '4/0AX4XfWiValidCodeHere123456789abcdefghijklmnopqrstuvwxyz';
      const request = new Request(`https://example.com/api/auth/google/callback?code=${validCode}`);
      const result = OAuthRequestValidator.validateCallbackRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing state parameter');
    });

    it('should reject requests with invalid state tokens', () => {
      const validCode = '4/0AX4XfWiValidCodeHere123456789abcdefghijklmnopqrstuvwxyz';
      const invalidStates = ['not-a-jwt', 'invalid.state', 'only.two.parts'];
      
      invalidStates.forEach(state => {
        const request = new Request(`https://example.com/api/auth/google/callback?code=${validCode}&state=${state}`);
        const result = OAuthRequestValidator.validateCallbackRequest(request);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Invalid state token format');
      });
    });

    it('should handle multiple validation errors', () => {
      const request = new Request('https://example.com/api/auth/google/callback?code=short&state=invalid');
      const result = OAuthRequestValidator.validateCallbackRequest(request);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid authorization code format');
      expect(result.errors).toContain('Invalid state token format');
      expect(result.errors).toHaveLength(2);
    });
  });
});

describe('AuthorizationCodeValidator', () => {
  describe('validateAuthorizationCode', () => {
    it('should validate legitimate Google authorization codes', () => {
      const validCodes = [
        '4/0AX4XfWiValidCodeHere123456789abcdefghijklmnopqrstuvwxyz',
        '4/0AX4XfWi-Valid_Code=Here123456789abcdefghijklmnopqrstuvwxyz',
        '4/P7q7W91a-oMsCeLvIaQm6bTrgtp7gURAhZFgmD3-oFhcOgJy4p6ZfOl8TcTZlgPdHPjAcL7-dY4AQpYD1X3q6zB'
      ];
      
      validCodes.forEach(code => {
        expect(AuthorizationCodeValidator.validateAuthorizationCode(code)).toBe(true);
      });
    });

    it('should reject short authorization codes', () => {
      const shortCodes = ['4/short', '4/abc', '4/123456789012345678901234567890123456789'];
      
      shortCodes.forEach(code => {
        expect(AuthorizationCodeValidator.validateAuthorizationCode(code)).toBe(false);
      });
    });

    it('should reject codes with invalid characters', () => {
      const invalidCodes = [
        '4/0AX4XfWiValidCodeHere123456789!@#$%^&*()abcdefghijklmnopqrstuvwxyz',
        '4/0AX4XfWiValidCodeHere123456789<script>alert(1)</script>',
        '4/0AX4XfWiValidCodeHere123456789 space not allowed',
        '4/0AX4XfWiValidCodeHere123456789"quotes"notallowed'
      ];
      
      invalidCodes.forEach(code => {
        expect(AuthorizationCodeValidator.validateAuthorizationCode(code)).toBe(false);
      });
    });

    it('should reject null, undefined, or empty codes', () => {
      expect(AuthorizationCodeValidator.validateAuthorizationCode('')).toBe(false);
      expect(AuthorizationCodeValidator.validateAuthorizationCode(null as any)).toBe(false);
      expect(AuthorizationCodeValidator.validateAuthorizationCode(undefined as any)).toBe(false);
    });

    it('should reject non-string codes', () => {
      expect(AuthorizationCodeValidator.validateAuthorizationCode(123 as any)).toBe(false);
      expect(AuthorizationCodeValidator.validateAuthorizationCode({} as any)).toBe(false);
      expect(AuthorizationCodeValidator.validateAuthorizationCode([] as any)).toBe(false);
    });
  });

  describe('isCodeExpired', () => {
    it('should detect expired codes', () => {
      const now = Date.now();
      const expiredTime = now - 700000; // 11+ minutes ago
      
      expect(AuthorizationCodeValidator.isCodeExpired(expiredTime)).toBe(true);
    });

    it('should detect valid codes', () => {
      const now = Date.now();
      const validTime = now - 300000; // 5 minutes ago
      
      expect(AuthorizationCodeValidator.isCodeExpired(validTime)).toBe(false);
    });

    it('should handle edge cases', () => {
      const now = Date.now();
      const exactlyTenMinutes = now - 600000; // Exactly 10 minutes ago
      const almostExpired = now - 599999; // Just under 10 minutes
      const justExpired = now - 600001; // Just over 10 minutes
      
      expect(AuthorizationCodeValidator.isCodeExpired(exactlyTenMinutes)).toBe(false);
      expect(AuthorizationCodeValidator.isCodeExpired(almostExpired)).toBe(false);
      expect(AuthorizationCodeValidator.isCodeExpired(justExpired)).toBe(true);
    });

    it('should handle future timestamps', () => {
      const now = Date.now();
      const futureTime = now + 300000; // 5 minutes in the future
      
      expect(AuthorizationCodeValidator.isCodeExpired(futureTime)).toBe(false);
    });
  });
});