/**
 * Authentication Integration Tests
 * 
 * Tests user registration, login, logout, and session management
 */

import { AuthService } from '@/services/auth/AuthService';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '@tests/utils/test-db';
import { flushRedis, closeTestRedisClient } from '@tests/utils/test-redis';
import { testUsers, getTestUser } from '@tests/fixtures/users';
import { generateTestToken, verifyTestToken } from '@tests/utils/test-helpers';
import { logger } from '@/utils/logger';

describe('Authentication Integration Tests', () => {
  let authService: AuthService;

  beforeAll(async () => {
    await setupTestDatabase();
    authService = new AuthService(logger);
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestRedisClient();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await flushRedis();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'New',
        lastName: 'User',
        role: 'agent' as const,
      };

      const result = await authService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(userData.email);
      expect(result.user.firstName).toBe(userData.firstName);
      expect(result.user).not.toHaveProperty('password');
    });

    it('should hash password during registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'PlainPassword123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'agent' as const,
      };

      const result = await authService.register(userData);

      // Verify password is not stored in plain text
      expect(result.user).not.toHaveProperty('password');
      
      // Verify we can login with the password
      const loginResult = await authService.login(userData.email, userData.password);
      expect(loginResult).toHaveProperty('accessToken');
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123!',
        firstName: 'Duplicate',
        lastName: 'User',
        role: 'agent' as const,
      };

      await authService.register(userData);

      await expect(authService.register(userData)).rejects.toThrow('Email already exists');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'weak@example.com',
        password: '123', // Too weak
        firstName: 'Weak',
        lastName: 'Password',
        role: 'agent' as const,
      };

      await expect(authService.register(userData)).rejects.toThrow();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email', // Invalid format
        password: 'SecurePass123!',
        firstName: 'Invalid',
        lastName: 'Email',
        role: 'agent' as const,
      };

      await expect(authService.register(userData)).rejects.toThrow();
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Register a test user
      await authService.register({
        email: testUsers.agent.email,
        password: testUsers.agent.password,
        firstName: testUsers.agent.firstName,
        lastName: testUsers.agent.lastName,
        role: testUsers.agent.role,
      });
    });

    it('should login with correct credentials', async () => {
      const result = await authService.login(
        testUsers.agent.email,
        testUsers.agent.password
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(testUsers.agent.email);
    });

    it('should generate valid JWT tokens', async () => {
      const result = await authService.login(
        testUsers.agent.email,
        testUsers.agent.password
      );

      const decoded = verifyTestToken(result.accessToken);
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email');
      expect(decoded.email).toBe(testUsers.agent.email);
    });

    it('should reject login with incorrect password', async () => {
      await expect(
        authService.login(testUsers.agent.email, 'WrongPassword123!')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject login with non-existent email', async () => {
      await expect(
        authService.login('nonexistent@example.com', 'Password123!')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject login for inactive user', async () => {
      // Register and deactivate user
      const user = await authService.register({
        email: 'inactive@example.com',
        password: 'Password123!',
        firstName: 'Inactive',
        lastName: 'User',
        role: 'agent',
      });

      await authService.deactivateUser(user.user.id!);

      await expect(
        authService.login('inactive@example.com', 'Password123!')
      ).rejects.toThrow('Account is inactive');
    });
  });

  describe('Session Management', () => {
    let userId: string;
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'session@example.com',
        password: 'Password123!',
        firstName: 'Session',
        lastName: 'User',
        role: 'agent',
      });

      userId = result.user.id!;
      accessToken = result.accessToken;
      refreshToken = result.refreshToken;
    });

    it('should validate valid access token', async () => {
      const result = await authService.validateToken(accessToken);

      expect(result).toBeTruthy();
      expect(result.userId).toBe(userId);
    });

    it('should reject invalid access token', async () => {
      const invalidToken = 'invalid.token.here';

      await expect(authService.validateToken(invalidToken)).rejects.toThrow();
    });

    it('should refresh access token with valid refresh token', async () => {
      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.accessToken).not.toBe(accessToken); // New token
    });

    it('should reject refresh with invalid refresh token', async () => {
      const invalidRefreshToken = 'invalid.refresh.token';

      await expect(
        authService.refreshAccessToken(invalidRefreshToken)
      ).rejects.toThrow();
    });

    it('should logout and invalidate tokens', async () => {
      await authService.logout(userId, accessToken);

      // Token should be blacklisted
      await expect(authService.validateToken(accessToken)).rejects.toThrow('Token has been revoked');
    });

    it('should logout from all devices', async () => {
      // Create multiple sessions
      const login1 = await authService.login('session@example.com', 'Password123!');
      const login2 = await authService.login('session@example.com', 'Password123!');

      // Logout from all devices
      await authService.logoutAll(userId);

      // All tokens should be invalidated
      await expect(authService.validateToken(login1.accessToken)).rejects.toThrow();
      await expect(authService.validateToken(login2.accessToken)).rejects.toThrow();
    });
  });

  describe('Password Management', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'password@example.com',
        password: 'OldPassword123!',
        firstName: 'Password',
        lastName: 'User',
        role: 'agent',
      });

      userId = result.user.id!;
    });

    it('should change password with correct old password', async () => {
      await authService.changePassword(userId, 'OldPassword123!', 'NewPassword123!');

      // Should be able to login with new password
      const result = await authService.login('password@example.com', 'NewPassword123!');
      expect(result).toHaveProperty('accessToken');
    });

    it('should reject password change with incorrect old password', async () => {
      await expect(
        authService.changePassword(userId, 'WrongOldPassword!', 'NewPassword123!')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should reject weak new password', async () => {
      await expect(
        authService.changePassword(userId, 'OldPassword123!', '123')
      ).rejects.toThrow();
    });
  });
});
