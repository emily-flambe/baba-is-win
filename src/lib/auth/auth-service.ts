import { createJWT } from './jwt';
import type { User, JWTPayload } from './types';

export class AuthService {
  constructor(private jwtSecret: string) {}

  async createSession(user: User): Promise<string> {
    const payload: Omit<JWTPayload, 'exp' | 'iat'> = {
      sub: user.id,
      email: user.email,
      username: user.username,
      provider: user.provider || 'email',
      oauthLinked: !!user.googleId
    };

    return createJWT(payload, this.jwtSecret);
  }

  createCookie(sessionToken: string): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `session=${sessionToken}`,
      'HttpOnly',
      'Path=/',
      'Max-Age=604800', // 7 days
      'SameSite=Strict'
    ];

    if (isProduction) {
      cookieOptions.push('Secure');
    }

    return cookieOptions.join('; ');
  }

  createClearCookie(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      'session=',
      'HttpOnly',
      'Path=/',
      'Max-Age=0',
      'SameSite=Strict'
    ];

    if (isProduction) {
      cookieOptions.push('Secure');
    }

    return cookieOptions.join('; ');
  }
}