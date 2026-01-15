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

import { AuthService } from '../../../src/services/security/AuthService';
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

    it('should login with valid credentials', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockUser] });
      
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockJwt.sign = jest.fn()
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');
      
      mockRedisService.prototype.set = jest.fn().mockResolvedValue(undefined);

      const result = await authService.login(validCredentials.email, validCredentials.password);

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
      expect(result.user.email).toBe(validCredentials.email);
    });

    it('should reject invalid email', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        authService.login('invalid@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject invalid password', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockUser] });
      
      mockBcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(
        authService.login(validCredentials.email, 'wrongPassword')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject inactive user', async () => {
      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [{ ...mockUser, is_active: false }] });

      await expect(
        authService.login(validCredentials.email, validCredentials.password)
      ).rejects.toThrow('Account is disabled');
    });
  });

  describe('refreshToken', () => {
    it('should refresh with valid refresh token', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'agent',
        type: 'refresh',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockPayload);
      mockRedisService.prototype.get = jest.fn().mockResolvedValue('stored_refresh_token');
      mockJwt.sign = jest.fn().mockReturnValue('new_access_token');

      const result = await authService.refreshToken('valid_refresh_token');

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('new_access_token');
    });

    it('should reject invalid refresh token', async () => {
      mockJwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        authService.refreshToken('invalid_token')
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

      await expect(
        authService.refreshToken('revoked_token')
      ).rejects.toThrow('Token revoked');
    });
  });

  describe('logout', () => {
    it('should revoke refresh token on logout', async () => {
      mockRedisService.prototype.del = jest.fn().mockResolvedValue(1);

      await authService.logout('user-123', 'refresh_token');

      expect(mockRedisService.prototype.del).toHaveBeenCalled();
    });
  });

  describe('validateToken', () => {
    it('should validate a valid access token', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'agent',
        type: 'access',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockPayload);
      mockRedisService.prototype.get = jest.fn().mockResolvedValue(null); // Not blacklisted

      const result = await authService.validateToken('valid_access_token');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
    });

    it('should reject blacklisted token', async () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: 'agent',
        type: 'access',
      };

      mockJwt.verify = jest.fn().mockReturnValue(mockPayload);
      mockRedisService.prototype.get = jest.fn().mockResolvedValue('blacklisted');

      await expect(
        authService.validateToken('blacklisted_token')
      ).rejects.toThrow('Token revoked');
    });

    it('should reject expired token', async () => {
      mockJwt.verify = jest.fn().mockImplementation(() => {
        const error = new Error('jwt expired');
        (error as any).name = 'TokenExpiredError';
        throw error;
      });

      await expect(
        authService.validateToken('expired_token')
      ).rejects.toThrow();
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all user sessions', async () => {
      mockRedisService.prototype.keys = jest.fn()
        .mockResolvedValue(['session:user-123:1', 'session:user-123:2']);
      mockRedisService.prototype.del = jest.fn().mockResolvedValue(1);

      await authService.revokeAllSessions('user-123');

      expect(mockRedisService.prototype.keys).toHaveBeenCalled();
      expect(mockRedisService.prototype.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const mockUser = {
        id: 'user-123',
        password_hash: 'current_hash',
      };

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockUser] })
        .mockResolvedValueOnce({ rows: [] });
      
      mockBcrypt.compare = jest.fn().mockResolvedValue(true);
      mockBcrypt.hash = jest.fn().mockResolvedValue('new_hash');

      await authService.changePassword('user-123', 'currentPassword', 'newPassword123');

      expect(mockDbService.prototype.query).toHaveBeenCalledTimes(2);
    });

    it('should reject invalid current password', async () => {
      const mockUser = {
        id: 'user-123',
        password_hash: 'current_hash',
      };

      mockDbService.prototype.query = jest.fn()
        .mockResolvedValueOnce({ rows: [mockUser] });
      
      mockBcrypt.compare = jest.fn().mockResolvedValue(false);

      await expect(
        authService.changePassword('user-123', 'wrongPassword', 'newPassword123')
      ).rejects.toThrow('Current password is incorrect');
    });
  });
});
