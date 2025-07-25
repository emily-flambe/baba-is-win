export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  reason?: string;
}

interface AttemptRecord {
  timestamp: number;
  success: boolean;
  ip: string;
  userAgent: string;
}

export class OAuthRateLimiter {
  private attempts: Map<string, AttemptRecord[]> = new Map();
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly isDevelopment: boolean;
  
  constructor(private env?: any) {
    this.isDevelopment = typeof process !== 'undefined' && 
      (process.env.NODE_ENV === 'development' || 
       process.env.ENVIRONMENT === 'preview' ||
       env?.ENVIRONMENT === 'preview');
  }
  
  async checkRateLimit(request: Request): Promise<RateLimitResult> {
    // Allow bypassing rate limits in development or if explicitly disabled
    if (this.isDevelopment) {
      return { allowed: true, retryAfter: 0 };
    }

    const clientId = this.getClientIdentifier(request);
    const now = Date.now();

    // Get recent attempts
    const attempts = this.attempts.get(clientId) || [];
    const recentAttempts = attempts.filter(
      attempt => now - attempt.timestamp < this.windowMs
    );

    // Check various rate limits
    const checks = [
      this.checkGeneralRateLimit(recentAttempts),
      this.checkFailureRateLimit(recentAttempts),
      this.checkBurstLimit(recentAttempts),
      this.checkSuspiciousActivity(recentAttempts)
    ];

    // If any check fails, return rate limited
    for (const check of checks) {
      if (!check.allowed) {
        return check;
      }
    }

    // Record this attempt
    const record: AttemptRecord = {
      timestamp: now,
      success: false, // Will be updated later
      ip: this.getClientIP(request),
      userAgent: request.headers.get('User-Agent') || ''
    };

    recentAttempts.push(record);
    this.attempts.set(clientId, recentAttempts);

    return { allowed: true, retryAfter: 0 };
  }

  markSuccess(request: Request): void {
    const clientId = this.getClientIdentifier(request);
    const attempts = this.attempts.get(clientId) || [];
    if (attempts.length > 0) {
      attempts[attempts.length - 1].success = true;
    }
  }

  private checkGeneralRateLimit(attempts: AttemptRecord[]): RateLimitResult {
    // More lenient limits for normal usage
    const limit = this.isDevelopment ? 100 : 30; // 100 for dev, 30 for prod
    if (attempts.length >= limit) {
      return {
        allowed: false,
        retryAfter: this.windowMs / 1000,
        reason: 'General rate limit exceeded'
      };
    }
    return { allowed: true, retryAfter: 0 };
  }

  private checkFailureRateLimit(attempts: AttemptRecord[]): RateLimitResult {
    const failures = attempts.filter(a => !a.success);
    // More lenient limits for normal usage
    const limit = this.isDevelopment ? 50 : 15; // 50 for dev, 15 for prod
    
    if (failures.length >= limit) {
      return {
        allowed: false,
        retryAfter: this.windowMs / 1000,
        reason: 'Too many failed attempts'
      };
    }
    return { allowed: true, retryAfter: 0 };
  }

  private checkBurstLimit(attempts: AttemptRecord[]): RateLimitResult {
    // Check for burst activity - more lenient for normal usage
    const burstWindow = 60000; // 1 minute
    const now = Date.now();
    const burstAttempts = attempts.filter(
      a => now - a.timestamp < burstWindow
    );

    // More lenient limits for normal usage
    const limit = this.isDevelopment ? 50 : 15; // 50 for dev, 15 for prod
    
    if (burstAttempts.length >= limit) {
      return {
        allowed: false,
        retryAfter: 60,
        reason: 'Burst limit exceeded'
      };
    }
    return { allowed: true, retryAfter: 0 };
  }

  private checkSuspiciousActivity(attempts: AttemptRecord[]): RateLimitResult {
    // Skip suspicious activity checks in development/preview
    if (this.isDevelopment) {
      return { allowed: true, retryAfter: 0 };
    }

    // Check for suspicious patterns
    const uniqueIPs = new Set(attempts.map(a => a.ip));
    const uniqueUserAgents = new Set(attempts.map(a => a.userAgent));

    // Too many different IPs (possible botnet)
    if (uniqueIPs.size > 3 && attempts.length > 5) {
      return {
        allowed: false,
        retryAfter: 300, // 5 minutes
        reason: 'Suspicious activity detected'
      };
    }

    // Too many different user agents (possible automation)
    if (uniqueUserAgents.size > 3 && attempts.length > 5) {
      return {
        allowed: false,
        retryAfter: 300,
        reason: 'Automated behavior detected'
      };
    }

    return { allowed: true, retryAfter: 0 };
  }

  private getClientIdentifier(request: Request): string {
    // Use IP + simplified User Agent as client identifier
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('User-Agent') || '';
    
    // Simplify user agent to avoid btoa issues with long strings
    const simpleUA = userAgent.split(' ')[0] || 'unknown';
    
    // In development, use a more lenient identifier
    if (this.isDevelopment) {
      return `dev:${ip}:${simpleUA}`;
    }
    
    return `${ip}:${simpleUA}`;
  }

  private getClientIP(request: Request): string {
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For') || 
           request.headers.get('X-Real-IP') || 
           'unknown';
  }
}