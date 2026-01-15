/**
 * Password Reset Service
 * Handles secure password reset flow with email verification
 */

import crypto from 'crypto';
import { createClient, RedisClientType } from 'redis';
import { config } from '@/config';
import { createLogger, Logger } from '@/utils/logger';
import { AuthService } from './AuthService';

/**
 * Password Reset Request
 */
export interface PasswordResetRequest {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Password Reset Result
 */
export interface PasswordResetResult {
  success: boolean;
  message: string;
}

/**
 * Password Reset Service
 * 
 * Provides secure password reset functionality:
 * - Secure token generation
 * - Token expiration (configurable)
 * - Rate limiting for reset requests
 * - Email notification integration
 * - Audit logging of reset attempts
 */
export class PasswordResetService {
  private readonly redis: RedisClientType;
  private readonly logger: Logger;
  private readonly authService: AuthService;
  
  // Configuration
  private readonly tokenExpiryMinutes: number = 60; // 1 hour
  private readonly maxRequestsPerHour: number = 3;
  private readonly tokenLength: number = 32;

  constructor(authService?: AuthService) {
    this.redis = createClient({ url: config.redis.url });
    this.redis.connect().catch(err => {
      this.logger?.error('Failed to connect to Redis for PasswordReset', err);
    });
    
    this.logger = createLogger('PasswordResetService');
    this.authService = authService || new AuthService();
  }

  /**
   * Request a password reset
   * Returns a token that should be sent via email
   */
  async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; expiresAt: Date } | null> {
    try {
      // Check rate limiting
      const isRateLimited = await this.checkRateLimit(email);
      if (isRateLimited) {
        this.logger.warn('Password reset rate limited', { email });
        // Don't reveal rate limiting to prevent email enumeration
        return null;
      }

      // In a real implementation, we would look up the user by email
      // For now, we generate a token regardless (to prevent email enumeration)
      const userId = await this.getUserIdByEmail(email);
      
      if (!userId) {
        // Don't reveal if email exists - still log but return success-like response
        this.logger.info('Password reset requested for unknown email', { email });
        // Record the attempt for rate limiting
        await this.recordResetAttempt(email);
        return null;
      }

      // Generate secure token
      const token = this.generateSecureToken();
      const expiresAt = new Date(Date.now() + this.tokenExpiryMinutes * 60 * 1000);

      // Store reset request
      const resetRequest: PasswordResetRequest = {
        userId,
        email,
        token: this.hashToken(token),
        expiresAt,
        createdAt: new Date(),
        ipAddress,
        userAgent
      };

      await this.storeResetRequest(resetRequest);
      
      // Record attempt for rate limiting
      await this.recordResetAttempt(email);

      // Invalidate any existing reset tokens for this user
      await this.invalidatePreviousTokens(userId, token);

      this.logger.info('Password reset token generated', { 
        userId, 
        email,
        expiresAt 
      });

      return { token, expiresAt };
    } catch (error) {
      this.logger.error('Failed to request password reset', { email, error });
      throw new Error('Failed to process password reset request');
    }
  }

  /**
   * Verify a password reset token
   */
  async verifyResetToken(token: string): Promise<{ userId: string; email: string } | null> {
    try {
      const hashedToken = this.hashToken(token);
      const requestData = await this.redis.get(`reset:token:${hashedToken}`);

      if (!requestData) {
        this.logger.warn('Invalid or expired reset token');
        return null;
      }

      const request: PasswordResetRequest = JSON.parse(requestData);

      // Check expiration
      if (new Date(request.expiresAt) < new Date()) {
        this.logger.warn('Expired reset token', { userId: request.userId });
        await this.deleteResetToken(hashedToken);
        return null;
      }

      return { userId: request.userId, email: request.email };
    } catch (error) {
      this.logger.error('Failed to verify reset token', { error });
      return null;
    }
  }

  /**
   * Reset password using token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<PasswordResetResult> {
    try {
      // Verify token first
      const tokenData = await this.verifyResetToken(token);

      if (!tokenData) {
        return {
          success: false,
          message: 'Invalid or expired reset token'
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          message: passwordValidation.message
        };
      }

      // Hash new password
      const hashedPassword = await this.authService.hashPassword(newPassword);

      // Update password in database
      const updated = await this.updateUserPassword(tokenData.userId, hashedPassword);

      if (!updated) {
        return {
          success: false,
          message: 'Failed to update password'
        };
      }

      // Invalidate the token
      const hashedToken = this.hashToken(token);
      await this.deleteResetToken(hashedToken);

      // Revoke all existing sessions for security
      await this.authService.revokeAllUserSessions(tokenData.userId);

      this.logger.info('Password reset successful', { userId: tokenData.userId });

      return {
        success: true,
        message: 'Password has been reset successfully'
      };
    } catch (error) {
      this.logger.error('Failed to reset password', { error });
      return {
        success: false,
        message: 'An error occurred while resetting password'
      };
    }
  }

  /**
   * Generate email content for password reset
   */
  generateResetEmail(
    email: string,
    token: string,
    expiresAt: Date
  ): { subject: string; html: string; text: string } {
    const baseUrl = process.env.BASE_URL || `http://localhost:${config.app.port}`;
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const expiryMinutes = this.tokenExpiryMinutes;

    const subject = `Password Reset Request - ${config.app.name}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${config.app.name}</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset the password for your account associated with <strong>${email}</strong>.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; font-size: 14px; color: #666;">${resetUrl}</p>
            <div class="warning">
              <strong>Important:</strong>
              <ul>
                <li>This link will expire in ${expiryMinutes} minutes</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from ${config.app.name}.</p>
            <p>If you have any questions, please contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Password Reset Request - ${config.app.name}

Hello,

We received a request to reset the password for your account associated with ${email}.

To reset your password, visit the following link:
${resetUrl}

Important:
- This link will expire in ${expiryMinutes} minutes
- If you didn't request this reset, please ignore this email
- Never share this link with anyone

This is an automated message from ${config.app.name}.
    `.trim();

    return { subject, html, text };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(this.tokenLength).toString('hex');
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Store reset request in Redis
   */
  private async storeResetRequest(request: PasswordResetRequest): Promise<void> {
    const ttl = this.tokenExpiryMinutes * 60;
    
    // Store by hashed token
    await this.redis.set(
      `reset:token:${request.token}`,
      JSON.stringify(request),
      { EX: ttl }
    );

    // Also store reference by user ID for invalidation
    await this.redis.sAdd(`reset:user:${request.userId}`, request.token);
    await this.redis.expire(`reset:user:${request.userId}`, ttl);
  }

  /**
   * Delete reset token
   */
  private async deleteResetToken(hashedToken: string): Promise<void> {
    await this.redis.del(`reset:token:${hashedToken}`);
  }

  /**
   * Invalidate previous tokens for user
   */
  private async invalidatePreviousTokens(userId: string, currentToken: string): Promise<void> {
    try {
      const tokens = await this.redis.sMembers(`reset:user:${userId}`);
      const currentHashed = this.hashToken(currentToken);
      
      for (const token of tokens) {
        if (token !== currentHashed) {
          await this.redis.del(`reset:token:${token}`);
        }
      }
    } catch (error) {
      this.logger.error('Failed to invalidate previous tokens', { userId, error });
    }
  }

  /**
   * Check rate limiting for reset requests
   */
  private async checkRateLimit(email: string): Promise<boolean> {
    const key = `reset:ratelimit:${email.toLowerCase()}`;
    const attempts = await this.redis.get(key);
    
    return attempts !== null && Number.parseInt(attempts, 10) >= this.maxRequestsPerHour;
  }

  /**
   * Record reset attempt for rate limiting
   */
  private async recordResetAttempt(email: string): Promise<void> {
    const key = `reset:ratelimit:${email.toLowerCase()}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 3600); // 1 hour window
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }

    return { valid: true, message: 'Password meets requirements' };
  }

  /**
   * Get user ID by email (placeholder - should query database)
   */
  private async getUserIdByEmail(email: string): Promise<string | null> {
    // TODO: Implement actual database lookup
    // This is a placeholder that should be replaced with actual database query
    // For now, return null to indicate user lookup should be implemented
    this.logger.debug('getUserIdByEmail called - needs database implementation', { email });
    return null;
  }

  /**
   * Update user password in database (placeholder)
   */
  private async updateUserPassword(userId: string, hashedPassword: string): Promise<boolean> {
    // TODO: Implement actual database update
    // This is a placeholder that should be replaced with actual database query
    this.logger.debug('updateUserPassword called - needs database implementation', { userId });
    return false;
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
let passwordResetServiceInstance: PasswordResetService | null = null;

export function getPasswordResetService(authService?: AuthService): PasswordResetService {
  if (!passwordResetServiceInstance) {
    passwordResetServiceInstance = new PasswordResetService(authService);
  }
  return passwordResetServiceInstance;
}
