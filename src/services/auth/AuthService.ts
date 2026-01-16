/**
 * Authentication Service
 * Handles user authentication, JWT generation, and session management
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from 'redis';
import crypto from 'node:crypto';
import { config } from '@/config';
import { DatabaseService } from '@/core/services/database';
import { createLogger } from '@/utils/logger';

export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  name: string;
  active: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

export class AuthService {
  private readonly redisClient: any;
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly bcryptRounds: number;
  private readonly db: DatabaseService;
  private readonly logger = createLogger('AuthService');

  constructor() {
    this.db = new DatabaseService();
    // Use centralized config for all auth settings
    this.jwtSecret = config.auth.jwtSecret || 'default-secret-change-in-production';
    this.jwtRefreshSecret = config.auth.jwtRefreshSecret || 'default-refresh-secret-change-in-production';
    this.accessTokenExpiry = config.auth.jwtExpiresIn;
    this.refreshTokenExpiry = config.auth.jwtRefreshExpiresIn;
    this.bcryptRounds = config.auth.bcryptRounds;
    
    // Initialize Redis client for session management using config
    this.redisClient = createClient({
      url: config.redis.url,
    });
    
    this.redisClient.connect().catch(console.error);
  }

  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<AuthTokens> {
    // Get user from database
    const user = await this.getUserByEmail(email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.active) {
      throw new Error('Account is inactive');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate session ID
    const sessionId = this.generateSessionId();

    // Generate tokens
    const tokens = await this.generateTokens(user, sessionId);

    // Store session in Redis
    await this.createSession(sessionId, user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as TokenPayload;

      // Check if session exists and is valid
      const session = await this.getSession(payload.sessionId);
      
      if (session?.refreshToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Check if session is expired
      if (session.expiresAt < Date.now()) {
        await this.deleteSession(payload.sessionId);
        throw new Error('Session expired');
      }

      // Get user
      const user = await this.getUserById(payload.userId);
      
      if (!user?.active) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user, payload.sessionId);
      const expiresIn = this.getTokenExpiry(this.accessTokenExpiry);

      return { accessToken, expiresIn };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Failed to refresh access token', { err });
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(sessionId: string): Promise<void> {
    await this.deleteSession(sessionId);
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as TokenPayload;

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Check if session exists
      const session = await this.getSession(payload.sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      return payload;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn('Failed to validate access token', { err });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User, sessionId: string): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken(user, sessionId);
    const refreshToken = this.generateRefreshToken(user, sessionId);
    const expiresIn = this.getTokenExpiry(this.accessTokenExpiry);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Generate access token (short-lived)
   */
  private generateAccessToken(user: User, sessionId: string): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const options: SignOptions = { expiresIn: this.accessTokenExpiry as jwt.SignOptions['expiresIn'] };
    return jwt.sign(payload, this.jwtSecret, options);
  }

  /**
   * Generate refresh token (long-lived)
   */
  private generateRefreshToken(user: User, sessionId: string): string {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const options: SignOptions = { expiresIn: this.refreshTokenExpiry as jwt.SignOptions['expiresIn'] };
    return jwt.sign(payload, this.jwtRefreshSecret, options);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Create session in Redis
   */
  private async createSession(sessionId: string, userId: string, refreshToken: string): Promise<void> {
    const session = {
      userId,
      refreshToken,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.getTokenExpiry(this.refreshTokenExpiry) * 1000,
    };

    const ttl = this.getTokenExpiry(this.refreshTokenExpiry);
    
    await this.redisClient.set(
      `session:${sessionId}`,
      JSON.stringify(session),
      { EX: ttl }
    );
  }

  /**
   * Get session from Redis
   */
  private async getSession(sessionId: string): Promise<any> {
    const sessionData = await this.redisClient.get(`session:${sessionId}`);
    
    if (!sessionData) {
      return null;
    }

    return JSON.parse(sessionData);
  }

  /**
   * Delete session from Redis
   */
  private async deleteSession(sessionId: string): Promise<void> {
    await this.redisClient.del(`session:${sessionId}`);
  }

  /**
   * Blacklist token (for logout before expiry)
   */
  private async blacklistToken(token: string, expiresIn: number): Promise<void> {
    await this.redisClient.set(
      `blacklist:${token}`,
      '1',
      { EX: expiresIn }
    );
  }

  /**
   * Check if token is blacklisted
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.redisClient.get(`blacklist:${token}`);
    return result !== null;
  }

  /**
   * Get token expiry in seconds
   */
  private getTokenExpiry(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = Number.parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; // 15 minutes default
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.bcryptRounds);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Get user by email (placeholder - should query database)
   */
  private async getUserByEmail(email: string): Promise<User | null> {
    await this.db.initialize();
    const result = await this.db.query<{
      id: string;
      email: string;
      password_hash: string;
      role: User['role'];
      first_name: string;
      last_name: string;
      is_active: boolean;
      mfa_enabled: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT id, email, password_hash, role, first_name, last_name, is_active, mfa_enabled, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [email]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      name: `${row.first_name} ${row.last_name}`,
      active: row.is_active,
      mfaEnabled: row.mfa_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get user by ID (placeholder - should query database)
   */
  private async getUserById(userId: string): Promise<User | null> {
    await this.db.initialize();
    const result = await this.db.query<{
      id: string;
      email: string;
      password_hash: string;
      role: User['role'];
      first_name: string;
      last_name: string;
      is_active: boolean;
      mfa_enabled: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      'SELECT id, email, password_hash, role, first_name, last_name, is_active, mfa_enabled, created_at, updated_at FROM users WHERE id = $1 LIMIT 1',
      [userId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      password: row.password_hash,
      role: row.role,
      name: `${row.first_name} ${row.last_name}`,
      active: row.is_active,
      mfaEnabled: row.mfa_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const keys = await this.redisClient.keys('session:*');
    const sessions: string[] = [];

    for (const key of keys) {
      const sessionData = await this.redisClient.get(key);
      const session = JSON.parse(sessionData);
      
      if (session.userId === userId) {
        sessions.push(key.replace('session:', ''));
      }
    }

    return sessions;
  }

  /**
   * Revoke all sessions for a user (force logout from all devices)
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);
    
    for (const sessionId of sessions) {
      await this.deleteSession(sessionId);
    }
  }
}
