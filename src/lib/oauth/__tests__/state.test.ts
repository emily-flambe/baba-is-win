import { OAuthStateManager } from '../state';

describe('OAuthStateManager', () => {
  const mockJwtSecret = 'test-secret-key-that-is-long-enough-for-testing';
  let stateManager: OAuthStateManager;

  beforeEach(() => {
    stateManager = new OAuthStateManager(mockJwtSecret);
  });

  describe('createState', () => {
    it('should create a JWT token', async () => {
      const state = await stateManager.createState({ userId: 'test-user' });
      
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.split('.')).toHaveLength(3);
    });

    it('should include timestamp automatically', async () => {
      const beforeTime = Date.now();
      const state = await stateManager.createState({ userId: 'test-user' });
      const afterTime = Date.now();
      
      const verified = await stateManager.verifyState(state);
      
      expect(verified.timestamp).toBeDefined();
      expect(verified.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(verified.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should preserve provided data', async () => {
      const testData = {
        returnUrl: '/dashboard',
        linkAccount: true,
        userId: 'test-user-123'
      };

      const state = await stateManager.createState(testData);
      const verified = await stateManager.verifyState(state);
      
      expect(verified.returnUrl).toBe(testData.returnUrl);
      expect(verified.linkAccount).toBe(testData.linkAccount);
      expect(verified.userId).toBe(testData.userId);
    });

    it('should handle empty data', async () => {
      const state = await stateManager.createState({});
      const verified = await stateManager.verifyState(state);
      
      expect(verified.timestamp).toBeDefined();
      expect(verified.returnUrl).toBeUndefined();
      expect(verified.linkAccount).toBeUndefined();
      expect(verified.userId).toBeUndefined();
    });

    it('should create different tokens for different data', async () => {
      const state1 = await stateManager.createState({ userId: 'user1' });
      const state2 = await stateManager.createState({ userId: 'user2' });
      
      expect(state1).not.toBe(state2);
    });

    it('should create different tokens even with same data', async () => {
      const data = { userId: 'same-user' };
      const state1 = await stateManager.createState(data);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const state2 = await stateManager.createState(data);
      
      expect(state1).not.toBe(state2);
    });
  });

  describe('verifyState', () => {
    it('should verify valid state tokens', async () => {
      const testData = {
        returnUrl: '/test',
        linkAccount: false,
        userId: 'verify-test-user'
      };

      const state = await stateManager.createState(testData);
      const verified = await stateManager.verifyState(state);
      
      expect(verified.returnUrl).toBe(testData.returnUrl);
      expect(verified.linkAccount).toBe(testData.linkAccount);
      expect(verified.userId).toBe(testData.userId);
    });

    it('should reject invalid tokens', async () => {
      await expect(stateManager.verifyState('invalid.token.here')).rejects.toThrow('Invalid or expired OAuth state');
    });

    it('should reject empty tokens', async () => {
      await expect(stateManager.verifyState('')).rejects.toThrow('Invalid or expired OAuth state');
    });

    it('should reject malformed tokens', async () => {
      await expect(stateManager.verifyState('not.a.valid.jwt')).rejects.toThrow('Invalid or expired OAuth state');
    });

    it('should reject tokens with wrong signature', async () => {
      const validState = await stateManager.createState({ userId: 'test' });
      const parts = validState.split('.');
      const tamperedState = parts[0] + '.' + parts[1] + '.tamperedSignature';
      
      await expect(stateManager.verifyState(tamperedState)).rejects.toThrow('Invalid or expired OAuth state');
    });
  });

  describe('security', () => {
    it('should use different signatures for different secrets', async () => {
      const manager1 = new OAuthStateManager('secret1');
      const manager2 = new OAuthStateManager('secret2');
      
      const state1 = await manager1.createState({ userId: 'test' });
      
      await expect(manager2.verifyState(state1)).rejects.toThrow('Invalid or expired OAuth state');
    });

    it('should include expiration time in JWT', async () => {
      const state = await stateManager.createState({ userId: 'test' });
      
      // Decode JWT payload to check expiration
      const parts = state.split('.');
      const payload = JSON.parse(atob(parts[1]));
      
      expect(payload.exp).toBeDefined();
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });
});