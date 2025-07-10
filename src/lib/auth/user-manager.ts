import { GoogleUserInfo } from '../oauth/google';

export interface OAuthUserData {
  googleId: string;
  email: string;
  displayName: string;
  profilePictureUrl: string;
  providerEmail: string;
}

export class UserManager {
  constructor(private db: D1Database) {}

  async findUserByGoogleId(googleId: string): Promise<any> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE google_id = ?
    `).bind(googleId).first();

    return result;
  }

  async findUserByEmail(email: string): Promise<any> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).bind(email).first();

    return result;
  }

  async findUserById(id: string): Promise<any> {
    const result = await this.db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(id).first();

    return result;
  }

  async createOAuthUser(userData: OAuthUserData): Promise<any> {
    const id = crypto.randomUUID();
    const timestamp = Date.now();

    const result = await this.db.prepare(`
      INSERT INTO users (
        id, email, username, google_id, provider, provider_email,
        display_name, profile_picture_url, password_hash,
        email_verified, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      userData.email,
      userData.email, // Use email as username for OAuth users
      userData.googleId,
      'google',
      userData.providerEmail,
      userData.displayName,
      userData.profilePictureUrl,
      '', // Empty password hash for OAuth users
      true, // OAuth emails are verified by Google
      timestamp,
      timestamp
    ).run();

    if (!result.success) {
      throw new Error('Failed to create OAuth user');
    }

    return this.findUserByGoogleId(userData.googleId);
  }

  async linkGoogleAccount(userId: string, userData: OAuthUserData): Promise<void> {
    const result = await this.db.prepare(`
      UPDATE users 
      SET google_id = ?, provider_email = ?, display_name = ?, 
          profile_picture_url = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      userData.googleId,
      userData.providerEmail,
      userData.displayName,
      userData.profilePictureUrl,
      Date.now(),
      userId
    ).run();

    if (!result.success) {
      throw new Error('Failed to link Google account');
    }
  }

  async updateOAuthUser(googleId: string, userData: Partial<OAuthUserData>): Promise<void> {
    const updateFields = [];
    const values = [];

    if (userData.displayName) {
      updateFields.push('display_name = ?');
      values.push(userData.displayName);
    }

    if (userData.profilePictureUrl) {
      updateFields.push('profile_picture_url = ?');
      values.push(userData.profilePictureUrl);
    }

    if (updateFields.length === 0) return;

    updateFields.push('updated_at = ?');
    values.push(Date.now());
    values.push(googleId);

    const result = await this.db.prepare(`
      UPDATE users SET ${updateFields.join(', ')} WHERE google_id = ?
    `).bind(...values).run();

    if (!result.success) {
      throw new Error('Failed to update OAuth user');
    }
  }
}