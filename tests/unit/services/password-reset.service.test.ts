/**
 * Password Reset Service Unit Tests
 */

import crypto from 'node:crypto';

jest.mock('../../../src/core/services/database');
jest.mock('redis');

import { createClient } from 'redis';
import { DatabaseService } from '../../../src/core/services/database';
import { PasswordResetService } from '../../../src/services/auth/PasswordResetService';

const mockDbService = DatabaseService as jest.MockedClass<typeof DatabaseService>;
const mockCreateClient = createClient as unknown as jest.Mock;

describe('PasswordResetService', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    sAdd: jest.fn().mockResolvedValue(1),
    sMembers: jest.fn().mockResolvedValue([]),
    expire: jest.fn().mockResolvedValue(true),
    incr: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockRedisClient as any);
    mockDbService.prototype.initialize = jest.fn().mockResolvedValue(undefined);
  });

  it('should reset password with a valid token', async () => {
    const token = 'valid-reset-token';
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const request = {
      userId: 'user-123',
      email: 'user@example.com',
      token: hashedToken,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(request));

    mockDbService.prototype.query = jest.fn().mockResolvedValue({
      rows: [],
      rowCount: 1,
    } as any);

    const mockAuthService = {
      hashPassword: jest.fn().mockResolvedValue('hashed_password'),
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    } as any;

    const service = new PasswordResetService(mockAuthService);

    const result = await service.resetPassword(token, 'NewPassword1!');

    expect(result.success).toBe(true);
    expect(mockAuthService.hashPassword).toHaveBeenCalledWith('NewPassword1!');
    expect(mockDbService.prototype.query).toHaveBeenCalledWith(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      ['hashed_password', 'user-123']
    );
    expect(mockRedisClient.del).toHaveBeenCalledWith(`reset:token:${hashedToken}`);
    expect(mockAuthService.revokeAllUserSessions).toHaveBeenCalledWith('user-123');

    await service.close();
  });
});
