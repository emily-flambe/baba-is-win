import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnsubscribeService } from '../../src/lib/email/unsubscribe-service';
import { AuthDB } from '../../src/lib/auth/db';
import type { Env } from '../../src/types/env';
import type { UnsubscribeToken } from '../../src/lib/auth/types';

// Mock environment
const mockEnv: Env = {
  SITE_URL: 'https://test.example.com',
  SITE_NAME: 'Test Site',
  JWT_SECRET: 'test-secret',
  GMAIL_CLIENT_ID: 'test-client-id',
  GMAIL_CLIENT_SECRET: 'test-client-secret',
  GMAIL_REFRESH_TOKEN: 'test-refresh-token',
  GMAIL_FROM_EMAIL: 'test@example.com',
  CRON_SECRET: 'test-cron-secret',
  DB: {} as any
};

// Mock AuthDB
const mockAuthDB = {
  createUnsubscribeToken: vi.fn(),
  validateUnsubscribeToken: vi.fn(),
  useUnsubscribeToken: vi.fn(),
  unsubscribeUserFromAll: vi.fn(),
  updateUserPreferences: vi.fn(),
  createNotificationHistory: vi.fn()
} as unknown as AuthDB;

// Mock token data
const mockTokenData: UnsubscribeToken = {
  id: 'token-123',
  userId: 'user-123',
  token: 'secure-token-abc123',
  tokenType: 'one_click',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
};

describe('UnsubscribeService', () => {
  let unsubscribeService: UnsubscribeService;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeService = new UnsubscribeService(mockEnv, mockAuthDB);
  });

  describe('Token Generation', () => {
    it('should generate secure unsubscribe URL', async () => {
      const userId = 'user-123';
      const mockTokenId = 'token-123';
      
      (mockAuthDB.createUnsubscribeToken as any).mockResolvedValue(mockTokenId);

      const url = await unsubscribeService.generateUnsubscribeUrl(userId);

      expect(url).toMatch(/^https:\/\/test\.example\.com\/unsubscribe\?token=[a-f0-9]+$/);
      expect(mockAuthDB.createUnsubscribeToken).toHaveBeenCalledWith({
        userId,
        token: expect.any(String),
        tokenType: 'one_click',
        expiresAt: expect.any(Number)
      });
    });

    it('should generate cryptographically secure tokens', async () => {
      const userId = 'user-123';
      
      (mockAuthDB.createUnsubscribeToken as any).mockResolvedValue('token-123');

      const url1 = await unsubscribeService.generateUnsubscribeUrl(userId);
      const url2 = await unsubscribeService.generateUnsubscribeUrl(userId);

      const token1 = new URL(url1).searchParams.get('token');
      const token2 = new URL(url2).searchParams.get('token');

      expect(token1).not.toBe(token2);
      expect(token1).toHaveLength(64); // 32 bytes * 2 (hex encoding)
      expect(token2).toHaveLength(64);
      expect(token1).toMatch(/^[a-f0-9]+$/);
      expect(token2).toMatch(/^[a-f0-9]+$/);
    });

    it('should set appropriate token expiration', async () => {
      const userId = 'user-123';
      
      (mockAuthDB.createUnsubscribeToken as any).mockResolvedValue('token-123');

      await unsubscribeService.generateUnsubscribeUrl(userId);

      const createCall = (mockAuthDB.createUnsubscribeToken as any).mock.calls[0][0];
      const expiresAt = createCall.expiresAt;
      const now = Math.floor(Date.now() / 1000);
      const oneYear = 365 * 24 * 60 * 60;

      expect(expiresAt).toBeGreaterThan(now + oneYear - 60); // Allow 60 seconds tolerance
      expect(expiresAt).toBeLessThan(now + oneYear + 60);
    });
  });

  describe('Complete Unsubscribe Processing', () => {
    it('should process valid unsubscribe token successfully', async () => {
      const token = 'valid-token-123';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 Test Browser';

      (mockAuthDB.validateUnsubscribeToken as any).mockResolvedValue(mockTokenData);
      (mockAuthDB.unsubscribeUserFromAll as any).mockResolvedValue(undefined);
      (mockAuthDB.createNotificationHistory as any).mockResolvedValue(undefined);

      const result = await unsubscribeService.processUnsubscribe(token, ipAddress, userAgent);

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockAuthDB.validateUnsubscribeToken).toHaveBeenCalledWith(token);
      expect(mockAuthDB.unsubscribeUserFromAll).toHaveBeenCalledWith('user-123');
      expect(mockAuthDB.createNotificationHistory).toHaveBeenCalledWith({
        userId: 'user-123',
        notificationId: expect.stringContaining('unsubscribe_'),
        action: 'unsubscribe_all',
        details: expect.objectContaining({
          userId: 'user-123',
          tokenType: 'one_click',
          action: 'unsubscribe_all',
          ipAddress,
          userAgent
        }),
        ipAddress,
        userAgent
      });
    });

    it('should handle invalid token gracefully', async () => {
      const token = 'invalid-token';
      
      (mockAuthDB.validateUnsubscribeToken as any).mockResolvedValue(null);

      const result = await unsubscribeService.processUnsubscribe(token);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired unsubscribe token');
      expect(mockAuthDB.unsubscribeUserFromAll).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const token = 'valid-token-123';
      
      (mockAuthDB.validateUnsubscribeToken as any).mockResolvedValue(mockTokenData);
      (mockAuthDB.unsubscribeUserFromAll as any).mockRejectedValue(new Error('Database error'));

      const result = await unsubscribeService.processUnsubscribe(token);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('Partial Unsubscribe Processing', () => {
    it('should process partial unsubscribe successfully', async () => {
      const token = 'valid-token-123';
      const preferences = {
        emailBlogUpdates: true,
        emailThoughtUpdates: false,
        emailAnnouncements: true,
        emailFrequency: 'immediate'
      };
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0 Test Browser';

      (mockAuthDB.validateUnsubscribeToken as any).mockResolvedValue(mockTokenData);
      (mockAuthDB.updateUserPreferences as any).mockResolvedValue(undefined);
      (mockAuthDB.createNotificationHistory as any).mockResolvedValue(undefined);

      const result = await unsubscribeService.processPartialUnsubscribe(
        token, 
        preferences, 
        ipAddress, 
        userAgent
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
      expect(mockAuthDB.updateUserPreferences).toHaveBeenCalledWith('user-123', preferences);
      expect(mockAuthDB.createNotificationHistory).toHaveBeenCalledWith({
        userId: 'user-123',
        notificationId: expect.stringContaining('unsubscribe_'),
        action: 'update_preferences',
        details: expect.objectContaining({
          details: preferences
        }),
        ipAddress,
        userAgent
      });
    });

    it('should handle invalid token for partial unsubscribe', async () => {
      const token = 'invalid-token';
      const preferences = {
        emailBlogUpdates: false,
        emailThoughtUpdates: false,
        emailAnnouncements: false,
        emailFrequency: 'immediate'
      };
      
      (mockAuthDB.validateUnsubscribeToken as any).mockResolvedValue(null);

      const result = await unsubscribeService.processPartialUnsubscribe(token, preferences);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired unsubscribe token');
      expect(mockAuthDB.updateUserPreferences).not.toHaveBeenCalled();
    });
  });

  describe('List-Unsubscribe Header Generation', () => {
    it('should generate valid List-Unsubscribe header', () => {
      const userId = 'user-123';
      
      const header = unsubscribeService.generateListUnsubscribeHeader(userId);

      expect(header).toMatch(
        /^<https:\/\/test\.example\.com\/unsubscribe\?token=[a-f0-9]+>, <mailto:unsubscribe@test\.example\.com\?subject=unsubscribe>$/
      );
    });

    it('should create token for List-Unsubscribe header', () => {
      const userId = 'user-123';
      
      // Mock the internal createUnsubscribeToken method
      const createTokenSpy = vi.spyOn(unsubscribeService as any, 'createUnsubscribeToken');
      createTokenSpy.mockResolvedValue(undefined);

      unsubscribeService.generateListUnsubscribeHeader(userId);

      expect(createTokenSpy).toHaveBeenCalledWith({
        userId,
        token: expect.any(String),
        tokenType: 'list_unsubscribe',
        expiresAt: expect.any(Number)
      });
    });
  });

  describe('Security Features', () => {
    it('should track IP address and user agent', async () => {
      const token = 'valid-token-123';
      const ipAddress = '192.168.1.100';
      const userAgent = 'Custom Test Agent';

      (mockAuthDB.validateUnsubscribeToken as any).mockResolvedValue(mockTokenData);
      (mockAuthDB.unsubscribeUserFromAll as any).mockResolvedValue(undefined);
      (mockAuthDB.createNotificationHistory as any).mockResolvedValue(undefined);

      await unsubscribeService.processUnsubscribe(token, ipAddress, userAgent);

      expect(mockAuthDB.createNotificationHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress,
          userAgent,
          details: expect.objectContaining({
            ipAddress,
            userAgent
          })
        })
      );
    });

    it('should handle missing IP address and user agent gracefully', async () => {
      const token = 'valid-token-123';

      (mockAuthDB.validateUnsubscribeToken as any).mockResolvedValue(mockTokenData);
      (mockAuthDB.unsubscribeUserFromAll as any).mockResolvedValue(undefined);
      (mockAuthDB.createNotificationHistory as any).mockResolvedValue(undefined);

      const result = await unsubscribeService.processUnsubscribe(token);

      expect(result.success).toBe(true);
      expect(mockAuthDB.createNotificationHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: undefined,
          userAgent: undefined
        })
      );
    });

    it('should generate unique tokens for each request', async () => {
      const userId = 'user-123';
      const tokens = new Set();
      
      (mockAuthDB.createUnsubscribeToken as any).mockResolvedValue('token-123');

      // Generate multiple tokens
      for (let i = 0; i < 10; i++) {
        const url = await unsubscribeService.generateUnsubscribeUrl(userId);
        const token = new URL(url).searchParams.get('token');
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle token validation errors', async () => {
      const token = 'valid-token-123';
      
      (mockAuthDB.validateUnsubscribeToken as any).mockRejectedValue(new Error('Token validation failed'));

      const result = await unsubscribeService.processUnsubscribe(token);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token validation failed');
    });

    it('should handle user preference update errors', async () => {
      const token = 'valid-token-123';
      const preferences = {
        emailBlogUpdates: false,
        emailThoughtUpdates: false,
        emailAnnouncements: false,
        emailFrequency: 'immediate'
      };
      
      (mockAuthDB.validateUnsubscribeToken as any).mockResolvedValue(mockTokenData);
      (mockAuthDB.updateUserPreferences as any).mockRejectedValue(new Error('Preference update failed'));

      const result = await unsubscribeService.processPartialUnsubscribe(token, preferences);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Preference update failed');
    });
  });
});