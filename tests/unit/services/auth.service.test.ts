/**
 * Auth Service Unit Tests
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies before imports
jest.mock('../../../src/core/services/database');
jest.mock('../../../src/core/services/redis');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

import { AuthService } from '../../../src/services/auth/AuthService';
import { DatabaseService } from '../../../src/core/services/database';
import { RedisService } from '../../../src/core/services/redis';

const mockDbService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const mockRedisService = RedisService as jest.MockedClass<typeof RedisService>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
  });

  describe('login', () => {
    const validCredentials = {
      email: 'user@example.com',
      password: 'securePassword123',
    };

    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      password_hash: 'hashed_password',
      role: 'agent',
      first_name: 'John',
      last_name: 'Doe',
      is_active: true,
    };

    it('should have login method', () => {
      expect(typeof authService.login).toBe('function');
    });
  });

  describe('refreshAccessToken', () => {
    it('should have refreshAccessToken method', () => {
      expect(typeof authService.refreshAccessToken).toBe('function');
    });

    it('should reject invalid refresh token', async () => {
      mockJwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        authService.refreshAccessToken('invalid_token')
      ).rejects.toThrow();
    });

    it('should reject revoked refresh token', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'agent',
        type: 'refresh',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockPayload);
      mockRedisService.prototype.get = jest.fn().mockResolvedValue(null);

      // Service throws generic error message for security
      await expect(
        authService.refreshAccessToken('revoked_token')
      ).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('logout', () => {
    it('should have logout method', async () => {
      expect(typeof authService.logout).toBe('function');
    });
  });

  describe('validateAccessToken', () => {
    it('should reject invalid token', async () => {
      mockJwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(
        authService.validateAccessToken('invalid_token')
      ).rejects.toThrow('Invalid or expired token');
    });

    it('should reject expired token', async () => {
      mockJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('jwt expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      await expect(
        authService.validateAccessToken('expired_token')
      ).rejects.toThrow('Invalid or expired token');
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should have revokeAllUserSessions method', async () => {
      expect(typeof authService.revokeAllUserSessions).toBe('function');
    });
  });

  // Note: changePassword method is handled by PasswordResetService
});
