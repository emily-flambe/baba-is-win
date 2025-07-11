export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  emailBlogUpdates?: boolean;
  emailThoughtUpdates?: boolean;
  emailAnnouncements?: boolean;
  // OAuth fields
  googleId?: string;
  provider?: string;
  providerEmail?: string;
  displayName?: string;
  profilePictureUrl?: string;
  emailVerified?: boolean;
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
  emailBlogUpdates?: boolean;
  emailThoughtUpdates?: boolean;
  emailAnnouncements?: boolean;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  username: string;
  provider?: string;
  oauthLinked?: boolean;
  exp: number;
  iat: number;
}