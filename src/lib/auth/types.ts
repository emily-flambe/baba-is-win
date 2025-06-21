export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface AuthRequest {
  email?: string;
  username?: string;
  password: string;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  username: string;
  exp: number;
  iat: number;
}