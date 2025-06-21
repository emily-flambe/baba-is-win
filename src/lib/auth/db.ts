import type { D1Database } from '@cloudflare/workers-types';
import type { User, Session } from './types';
import { nanoid } from 'nanoid';

export class AuthDB {
  constructor(private db: D1Database) {}

  async createUser(
    email: string,
    username: string,
    passwordHash: string,
    emailBlogUpdates: boolean = false,
    emailThoughtUpdates: boolean = false,
    emailAnnouncements: boolean = false
  ): Promise<User> {
    const id = nanoid();
    const now = Date.now();
    
    await this.db
      .prepare(
        'INSERT INTO users (id, email, username, password_hash, email_blog_updates, email_thought_updates, email_announcements, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .bind(id, email.toLowerCase(), username.toLowerCase(), passwordHash, emailBlogUpdates, emailThoughtUpdates, emailAnnouncements, now, now)
      .run();

    return {
      id,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      createdAt: new Date(now),
      emailBlogUpdates,
      emailThoughtUpdates,
      emailAnnouncements
    };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT id, email, username, email_blog_updates, email_thought_updates, email_announcements, created_at FROM users WHERE email = ?')
      .bind(email.toLowerCase())
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      email: result.email as string,
      username: result.username as string,
      createdAt: new Date(result.created_at as number),
      emailBlogUpdates: Boolean(result.email_blog_updates),
      emailThoughtUpdates: Boolean(result.email_thought_updates),
      emailAnnouncements: Boolean(result.email_announcements)
    };
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT id, email, username, email_blog_updates, email_thought_updates, email_announcements, created_at FROM users WHERE username = ?')
      .bind(username.toLowerCase())
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      email: result.email as string,
      username: result.username as string,
      createdAt: new Date(result.created_at as number),
      emailBlogUpdates: Boolean(result.email_blog_updates),
      emailThoughtUpdates: Boolean(result.email_thought_updates),
      emailAnnouncements: Boolean(result.email_announcements)
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT id, email, username, email_blog_updates, email_thought_updates, email_announcements, created_at FROM users WHERE id = ?')
      .bind(id)
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      email: result.email as string,
      username: result.username as string,
      createdAt: new Date(result.created_at as number),
      emailBlogUpdates: Boolean(result.email_blog_updates),
      emailThoughtUpdates: Boolean(result.email_thought_updates),
      emailAnnouncements: Boolean(result.email_announcements)
    };
  }

  async getPasswordHash(userId: string): Promise<string | null> {
    const result = await this.db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(userId)
      .first();

    return result ? (result.password_hash as string) : null;
  }

  async createSession(userId: string): Promise<Session> {
    const id = nanoid();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    
    await this.db
      .prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(id, userId, expiresAt)
      .run();

    return {
      id,
      userId,
      expiresAt: new Date(expiresAt)
    };
  }

  async getSession(id: string): Promise<Session | null> {
    const result = await this.db
      .prepare('SELECT id, user_id, expires_at FROM sessions WHERE id = ? AND expires_at > ?')
      .bind(id, Date.now())
      .first();

    if (!result) return null;

    return {
      id: result.id as string,
      userId: result.user_id as string,
      expiresAt: new Date(result.expires_at as number)
    };
  }

  async deleteSession(id: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM sessions WHERE id = ?')
      .bind(id)
      .run();
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.db
      .prepare('DELETE FROM sessions WHERE expires_at <= ?')
      .bind(Date.now())
      .run();
  }
}