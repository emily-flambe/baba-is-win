import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload } from './types';

export async function createJWT(
  payload: Omit<JWTPayload, 'exp' | 'iat'>,
  secret: string
): Promise<string> {
  const jwt = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret));
  
  return jwt;
}

export async function verifyJWT(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}