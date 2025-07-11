import { SignJWT, jwtVerify } from 'jose';

export interface OAuthState {
  timestamp: number;
  returnUrl?: string;
  linkAccount?: boolean;
  userId?: string;
}

export class OAuthStateManager {
  private secret: Uint8Array;

  constructor(jwtSecret: string) {
    this.secret = new TextEncoder().encode(jwtSecret);
  }

  async createState(data: Partial<OAuthState>): Promise<string> {
    const payload = {
      timestamp: Date.now(),
      ...data
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10m') // State expires in 10 minutes
      .sign(this.secret);

    return jwt;
  }

  async verifyState(state: string): Promise<OAuthState> {
    try {
      const { payload } = await jwtVerify(state, this.secret);
      return payload as OAuthState;
    } catch (error) {
      throw new Error('Invalid or expired OAuth state');
    }
  }
}