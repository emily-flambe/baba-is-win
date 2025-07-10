export class OAuthSecurityMonitor {
  static async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details: any,
    request?: Request
  ): Promise<void> {
    const event = {
      timestamp: new Date().toISOString(),
      eventType,
      severity,
      details,
      clientIP: request ? this.getClientIP(request) : null,
      userAgent: request ? request.headers.get('User-Agent') : null,
      requestId: crypto.randomUUID()
    };

    // Log to console (will be picked up by monitoring)
    console.log('OAUTH_SECURITY_EVENT', JSON.stringify(event));

    // Send to monitoring service if configured
    if (process.env.MONITORING_ENDPOINT) {
      await this.sendToMonitoring(event);
    }
  }

  static async monitorOAuthAttempt(
    userId: string | null,
    success: boolean,
    error?: string,
    request?: Request
  ): Promise<void> {
    const severity = success ? 'low' : 'medium';
    
    await this.logSecurityEvent('oauth_attempt', severity, {
      userId,
      success,
      error,
      timestamp: Date.now()
    }, request);

    // Check for suspicious patterns
    if (!success) {
      await this.checkSuspiciousActivity(request);
    }
  }

  static async logAccountLinking(
    userId: string,
    provider: string,
    success: boolean,
    request?: Request
  ): Promise<void> {
    await this.logSecurityEvent('account_linking', 'medium', {
      userId,
      provider,
      success,
      timestamp: Date.now()
    }, request);
  }

  static async logUserCreation(
    userId: string,
    provider: string,
    request?: Request
  ): Promise<void> {
    await this.logSecurityEvent('user_creation', 'low', {
      userId,
      provider,
      timestamp: Date.now()
    }, request);
  }

  private static async checkSuspiciousActivity(request?: Request): Promise<void> {
    if (!request) return;

    const clientIP = this.getClientIP(request);
    const userAgent = request.headers.get('User-Agent') || '';

    // Check for known malicious patterns
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /python/i,
      /curl/i,
      /wget/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      await this.logSecurityEvent('suspicious_user_agent', 'high', {
        clientIP,
        userAgent,
        reason: 'Suspicious user agent pattern detected'
      });
    }
  }

  private static getClientIP(request: Request): string {
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For') || 
           request.headers.get('X-Real-IP') || 
           'unknown';
  }

  private static async sendToMonitoring(event: any): Promise<void> {
    try {
      await fetch(process.env.MONITORING_ENDPOINT!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONITORING_TOKEN}`
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send monitoring event:', error);
    }
  }
}