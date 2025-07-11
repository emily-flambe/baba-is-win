export interface ValidationResult {
  valid: boolean;
  errors: string[];
  oauthError?: string;
}

export class OAuthRequestValidator {
  static validateInitiationRequest(request: Request): ValidationResult {
    const url = new URL(request.url);
    const returnUrl = url.searchParams.get('returnUrl');
    const linkAccount = url.searchParams.get('linkAccount');

    const errors: string[] = [];

    // Validate return URL
    if (returnUrl) {
      if (!this.isValidReturnUrl(returnUrl)) {
        errors.push('Invalid return URL');
      }
    }

    // Validate link account parameter
    if (linkAccount && !['true', 'false'].includes(linkAccount)) {
      errors.push('Invalid linkAccount parameter');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateCallbackRequest(request: Request): ValidationResult {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    const errors: string[] = [];

    // If there's an error, it's a valid OAuth error response
    if (error) {
      return { valid: true, errors: [], oauthError: error };
    }

    // Validate authorization code
    if (!code) {
      errors.push('Missing authorization code');
    } else if (!this.validateAuthorizationCode(code)) {
      errors.push('Invalid authorization code format');
    }

    // Validate state token
    if (!state) {
      errors.push('Missing state parameter');
    } else if (!this.isValidJWT(state)) {
      errors.push('Invalid state token format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static isValidReturnUrl(url: string): boolean {
    try {
      // Check if it's a relative URL (starts with /)
      if (url.startsWith('/')) {
        return true;
      }
      
      // Parse as absolute URL
      const parsedUrl = new URL(url);
      
      // Only allow HTTPS/HTTP protocols
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        return false;
      }

      // Prevent open redirects - check against allowed domains
      const allowedDomains = [
        'localhost',
        'emilycogsdill.com',
        'www.emilycogsdill.com'
      ];

      // Extract hostname and check if it's in allowed list
      const hostname = parsedUrl.hostname;
      
      // Special handling for localhost with any port
      if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
        return true;
      }
      
      if (!allowedDomains.includes(hostname)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private static validateAuthorizationCode(code: string): boolean {
    // Validate code format and structure
    if (!code || typeof code !== 'string') {
      return false;
    }

    // Check code length (Google auth codes are typically 60+ chars)
    if (code.length < 50) {
      return false;
    }

    // Validate character set (alphanumeric, -, _, =, /)
    const validCodePattern = /^[a-zA-Z0-9\-_=\/]+$/;
    if (!validCodePattern.test(code)) {
      return false;
    }

    return true;
  }

  private static isValidJWT(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    try {
      // Validate header (part 0) and payload (part 1) are valid base64 JSON
      for (let i = 0; i < 2; i++) {
        const part = parts[i];
        // Base64 pattern check (must be at least 4 characters for valid base64)
        if (part.length < 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(part)) {
          return false;
        }
        // Try to decode and parse as JSON
        const decoded = atob(part);
        JSON.parse(decoded);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export class AuthorizationCodeValidator {
  static validateAuthorizationCode(code: string): boolean {
    return OAuthRequestValidator['validateAuthorizationCode'](code);
  }

  static isCodeExpired(receivedAt: number): boolean {
    // Authorization codes should be used within 10 minutes
    return Date.now() - receivedAt > 600000;
  }
}