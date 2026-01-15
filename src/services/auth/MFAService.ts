/**
 * Multi-Factor Authentication Service
 * Implements TOTP (Time-based One-Time Password) for two-factor authentication
 */

import crypto from 'crypto';
import { createClient, RedisClientType } from 'redis';
import { config } from '@/config';
import { createLogger, Logger } from '@/utils/logger';

/**
 * MFA Setup Result
 */
export interface MFASetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

/**
 * MFA Verification Result
 */
export interface MFAVerificationResult {
  success: boolean;
  isBackupCode?: boolean;
  remainingBackupCodes?: number;
}

/**
 * MFA User Data stored in database/Redis
 */
export interface MFAUserData {
  secret: string;
  backupCodes: string[];
  enabled: boolean;
  enabledAt?: Date;
  lastVerifiedAt?: Date;
}

/**
 * TOTP Configuration
 */
interface TOTPConfig {
  issuer: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: number;
  period: number;
  window: number;
}

/**
 * MFA Service
 * 
 * Provides TOTP-based two-factor authentication with:
 * - Secret generation and QR code URLs
 * - TOTP verification with time window tolerance
 * - Backup codes for recovery
 * - Rate limiting for verification attempts
 */
export class MFAService {
  private readonly redis: RedisClientType;
  private readonly logger: Logger;
  private readonly totpConfig: TOTPConfig;
  private readonly backupCodeCount: number = 10;
  private readonly maxVerificationAttempts: number = 5;
  private readonly attemptWindowSeconds: number = 300; // 5 minutes

  constructor() {
    this.redis = createClient({ url: config.redis.url });
    this.redis.connect().catch(err => {
      this.logger?.error('Failed to connect to Redis for MFA', err);
    });
    
    this.logger = createLogger('MFAService');
    
    this.totpConfig = {
      issuer: config.app.name || 'ClientEscalation',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      window: 1 // Allow 1 period before/after for clock skew
    };
  }

  /**
   * Generate a new MFA secret for a user
   */
  async setupMFA(userId: string, userEmail: string): Promise<MFASetupResult> {
    try {
      // Generate a random secret (20 bytes = 160 bits, base32 encoded)
      const secretBuffer = crypto.randomBytes(20);
      const secret = this.base32Encode(secretBuffer);
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Create otpauth URL for QR code
      const otpauthUrl = this.generateOtpauthUrl(secret, userEmail);
      
      // Generate QR code data URL (simple text representation for now)
      const qrCodeDataUrl = `otpauth://totp/${encodeURIComponent(this.totpConfig.issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(this.totpConfig.issuer)}&algorithm=${this.totpConfig.algorithm}&digits=${this.totpConfig.digits}&period=${this.totpConfig.period}`;
      
      // Store pending MFA setup (not enabled until verified)
      const mfaData: MFAUserData = {
        secret,
        backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
        enabled: false
      };
      
      await this.redis.set(
        `mfa:pending:${userId}`,
        JSON.stringify(mfaData),
        { EX: 600 } // 10 minutes to complete setup
      );
      
      this.logger.info('MFA setup initiated', { userId });
      
      return {
        secret,
        otpauthUrl,
        qrCodeDataUrl,
        backupCodes
      };
    } catch (error) {
      this.logger.error('Failed to setup MFA', { userId, error });
      throw new Error('Failed to setup MFA');
    }
  }

  /**
   * Verify TOTP code and enable MFA (during setup)
   */
  async verifyAndEnableMFA(userId: string, code: string): Promise<boolean> {
    try {
      // Get pending MFA data
      const pendingData = await this.redis.get(`mfa:pending:${userId}`);
      
      if (!pendingData) {
        throw new Error('No pending MFA setup found');
      }
      
      const mfaData: MFAUserData = JSON.parse(pendingData);
      
      // Verify the TOTP code
      const isValid = this.verifyTOTP(mfaData.secret, code);
      
      if (!isValid) {
        this.logger.warn('Invalid TOTP code during MFA setup', { userId });
        return false;
      }
      
      // Enable MFA
      mfaData.enabled = true;
      mfaData.enabledAt = new Date();
      
      // Store enabled MFA data permanently
      await this.redis.set(
        `mfa:user:${userId}`,
        JSON.stringify(mfaData)
      );
      
      // Delete pending data
      await this.redis.del(`mfa:pending:${userId}`);
      
      this.logger.info('MFA enabled successfully', { userId });
      
      return true;
    } catch (error) {
      this.logger.error('Failed to verify and enable MFA', { userId, error });
      throw error;
    }
  }

  /**
   * Verify MFA code during login
   */
  async verifyMFA(userId: string, code: string): Promise<MFAVerificationResult> {
    try {
      // Check rate limiting
      const isRateLimited = await this.checkRateLimit(userId);
      if (isRateLimited) {
        this.logger.warn('MFA verification rate limited', { userId });
        throw new Error('Too many verification attempts. Please try again later.');
      }
      
      // Get MFA data
      const mfaDataStr = await this.redis.get(`mfa:user:${userId}`);
      
      if (!mfaDataStr) {
        throw new Error('MFA not configured for user');
      }
      
      const mfaData: MFAUserData = JSON.parse(mfaDataStr);
      
      if (!mfaData.enabled) {
        throw new Error('MFA is not enabled');
      }
      
      // First, try TOTP verification
      if (this.verifyTOTP(mfaData.secret, code)) {
        // Update last verified
        mfaData.lastVerifiedAt = new Date();
        await this.redis.set(`mfa:user:${userId}`, JSON.stringify(mfaData));
        
        // Clear rate limit on success
        await this.clearRateLimit(userId);
        
        this.logger.info('MFA verified successfully via TOTP', { userId });
        
        return { success: true, isBackupCode: false };
      }
      
      // Try backup code verification
      const backupResult = await this.verifyBackupCode(userId, code, mfaData);
      
      if (backupResult.success) {
        // Clear rate limit on success
        await this.clearRateLimit(userId);
        return backupResult;
      }
      
      // Record failed attempt
      await this.recordFailedAttempt(userId);
      
      this.logger.warn('MFA verification failed', { userId });
      
      return { success: false };
    } catch (error) {
      this.logger.error('MFA verification error', { userId, error });
      throw error;
    }
  }

  /**
   * Check if MFA is enabled for a user
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const mfaDataStr = await this.redis.get(`mfa:user:${userId}`);
      
      if (!mfaDataStr) {
        return false;
      }
      
      const mfaData: MFAUserData = JSON.parse(mfaDataStr);
      return mfaData.enabled;
    } catch (error) {
      this.logger.error('Failed to check MFA status', { userId, error });
      return false;
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string): Promise<void> {
    try {
      await this.redis.del(`mfa:user:${userId}`);
      await this.redis.del(`mfa:pending:${userId}`);
      
      this.logger.info('MFA disabled', { userId });
    } catch (error) {
      this.logger.error('Failed to disable MFA', { userId, error });
      throw error;
    }
  }

  /**
   * Generate new backup codes (invalidates old ones)
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const mfaDataStr = await this.redis.get(`mfa:user:${userId}`);
      
      if (!mfaDataStr) {
        throw new Error('MFA not configured for user');
      }
      
      const mfaData: MFAUserData = JSON.parse(mfaDataStr);
      
      // Generate new backup codes
      const newCodes = this.generateBackupCodes();
      mfaData.backupCodes = newCodes.map(code => this.hashBackupCode(code));
      
      // Save updated data
      await this.redis.set(`mfa:user:${userId}`, JSON.stringify(mfaData));
      
      this.logger.info('Backup codes regenerated', { userId });
      
      return newCodes;
    } catch (error) {
      this.logger.error('Failed to regenerate backup codes', { userId, error });
      throw error;
    }
  }

  /**
   * Get remaining backup codes count
   */
  async getRemainingBackupCodesCount(userId: string): Promise<number> {
    try {
      const mfaDataStr = await this.redis.get(`mfa:user:${userId}`);
      
      if (!mfaDataStr) {
        return 0;
      }
      
      const mfaData: MFAUserData = JSON.parse(mfaDataStr);
      return mfaData.backupCodes.length;
    } catch (error) {
      this.logger.error('Failed to get backup codes count', { userId, error });
      return 0;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Verify TOTP code
   */
  private verifyTOTP(secret: string, code: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    const period = this.totpConfig.period;
    const window = this.totpConfig.window;
    
    // Check current and adjacent time windows
    for (let i = -window; i <= window; i++) {
      const timeCounter = Math.floor((now + i * period) / period);
      const expectedCode = this.generateTOTP(secret, timeCounter);
      
      if (this.secureCompare(code, expectedCode)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate TOTP code for a given time counter
   */
  private generateTOTP(secret: string, counter: number): string {
    // Decode base32 secret
    const secretBuffer = this.base32Decode(secret);
    
    // Create counter buffer (8 bytes, big-endian)
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));
    
    // Generate HMAC
    const hmac = crypto.createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const hash = hmac.digest();
    
    // Dynamic truncation
    const offset = hash[hash.length - 1] & 0x0f;
    const binary = 
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);
    
    // Generate code
    const otp = binary % Math.pow(10, this.totpConfig.digits);
    return otp.toString().padStart(this.totpConfig.digits, '0');
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    
    for (let i = 0; i < this.backupCodeCount; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    
    return codes;
  }

  /**
   * Hash a backup code for storage
   */
  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(
    userId: string, 
    code: string, 
    mfaData: MFAUserData
  ): Promise<MFAVerificationResult> {
    const hashedCode = this.hashBackupCode(code);
    const codeIndex = mfaData.backupCodes.indexOf(hashedCode);
    
    if (codeIndex === -1) {
      return { success: false };
    }
    
    // Remove used backup code
    mfaData.backupCodes.splice(codeIndex, 1);
    mfaData.lastVerifiedAt = new Date();
    
    // Save updated data
    await this.redis.set(`mfa:user:${userId}`, JSON.stringify(mfaData));
    
    this.logger.info('MFA verified via backup code', { 
      userId, 
      remainingCodes: mfaData.backupCodes.length 
    });
    
    return {
      success: true,
      isBackupCode: true,
      remainingBackupCodes: mfaData.backupCodes.length
    };
  }

  /**
   * Generate otpauth URL for QR code
   */
  private generateOtpauthUrl(secret: string, email: string): string {
    const params = new URLSearchParams({
      secret,
      issuer: this.totpConfig.issuer,
      algorithm: this.totpConfig.algorithm,
      digits: this.totpConfig.digits.toString(),
      period: this.totpConfig.period.toString()
    });
    
    return `otpauth://totp/${encodeURIComponent(this.totpConfig.issuer)}:${encodeURIComponent(email)}?${params.toString()}`;
  }

  /**
   * Base32 encode
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;
    
    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;
      
      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 31];
    }
    
    return result;
  }

  /**
   * Base32 decode
   */
  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanedInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
    
    let bits = 0;
    let value = 0;
    const result: number[] = [];
    
    for (const char of cleanedInput) {
      value = (value << 5) | alphabet.indexOf(char);
      bits += 5;
      
      if (bits >= 8) {
        result.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    
    return Buffer.from(result);
  }

  /**
   * Secure string comparison (constant time)
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Check rate limiting for verification attempts
   */
  private async checkRateLimit(userId: string): Promise<boolean> {
    const attempts = await this.redis.get(`mfa:attempts:${userId}`);
    return attempts !== null && Number.parseInt(attempts, 10) >= this.maxVerificationAttempts;
  }

  /**
   * Record failed verification attempt
   */
  private async recordFailedAttempt(userId: string): Promise<void> {
    const key = `mfa:attempts:${userId}`;
    await this.redis.incr(key);
    await this.redis.expire(key, this.attemptWindowSeconds);
  }

  /**
   * Clear rate limit (on successful verification)
   */
  private async clearRateLimit(userId: string): Promise<void> {
    await this.redis.del(`mfa:attempts:${userId}`);
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}

// Singleton instance
let mfaServiceInstance: MFAService | null = null;

export function getMFAService(): MFAService {
  if (!mfaServiceInstance) {
    mfaServiceInstance = new MFAService();
  }
  return mfaServiceInstance;
}
