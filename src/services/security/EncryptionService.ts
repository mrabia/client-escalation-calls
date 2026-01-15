import crypto from 'crypto';
import { Logger } from 'winston';

/**
 * Encryption Service
 * 
 * Provides encryption/decryption for sensitive data:
 * - Customer PII (names, addresses, SSN)
 * - Payment information (card numbers, bank accounts)
 * - Authentication credentials
 * 
 * Uses AES-256-GCM for encryption (FIPS 140-2 compliant)
 */
export class EncryptionService {
  private readonly logger: Logger;
  private encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private initialized: boolean = false;
  
  constructor(logger: Logger, encryptionKey?: string) {
    this.logger = logger;
    
    // Get encryption key from parameter or environment
    const keyString = encryptionKey || process.env.ENCRYPTION_KEY;
    
    if (!keyString) {
      // In development, log warning but don't throw - allow graceful degradation
      this.logger.warn('ENCRYPTION_KEY not set - encryption service will be unavailable');
      this.encryptionKey = Buffer.alloc(32); // Placeholder
      return;
    }
    
    // Support both hex-encoded keys (64 chars) and plain string keys (32 chars)
    if (keyString.length === 64) {
      // Hex-encoded 32-byte key
      this.encryptionKey = Buffer.from(keyString, 'hex');
    } else if (keyString.length >= 32) {
      // Plain string key - use first 32 chars
      this.encryptionKey = Buffer.from(keyString.substring(0, 32), 'utf8');
    } else {
      // Pad short keys (not recommended for production)
      this.logger.warn('ENCRYPTION_KEY is shorter than 32 characters - padding applied');
      this.encryptionKey = Buffer.from(keyString.padEnd(32, '0'), 'utf8');
    }
    
    this.initialized = true;
    this.logger.info('Encryption service initialized');
  }
  
  /**
   * Check if encryption service is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
  
  /**
   * Encrypt sensitive data
   * Returns base64-encoded string in format: iv:authTag:encryptedData
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV (initialization vector)
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv) as crypto.CipherGCM;
      
      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV + authTag + encrypted data
      const result = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
      
      return Buffer.from(result).toString('base64');
      
    } catch (error) {
      this.logger.error('Encryption failed', { error });
      throw new Error('Encryption failed');
    }
  }
  
  /**
   * Decrypt encrypted data
   */
  decrypt(encryptedData: string): string {
    try {
      // Decode from base64
      const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
      
      // Split into components
      const parts = decoded.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);
      
      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
      
    } catch (error) {
      this.logger.error('Decryption failed', { error });
      throw new Error('Decryption failed');
    }
  }
  
  /**
   * Encrypt object fields
   * Encrypts specified fields in an object, leaving others untouched
   */
  encryptFields<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        const value = String(result[field]);
        result[field] = this.encrypt(value) as any;
      }
    }
    
    return result;
  }
  
  /**
   * Decrypt object fields
   */
  decryptFields<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of fields) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          result[field] = this.decrypt(String(result[field])) as any;
        } catch (error) {
          this.logger.warn(`Failed to decrypt field ${String(field)}`, { error });
          // Leave field as-is if decryption fails
        }
      }
    }
    
    return result;
  }
  
  /**
   * Hash sensitive data (one-way)
   * Use for data that needs to be compared but never decrypted
   */
  hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }
  
  /**
   * Mask sensitive data for logging
   * Shows only first and last characters
   */
  mask(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars * 2) {
      return '*'.repeat(data.length);
    }
    
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const middle = '*'.repeat(data.length - visibleChars * 2);
    
    return `${start}${middle}${end}`;
  }
  
  /**
   * Generate encryption key (for setup)
   * Run once and store in environment variable
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * Sensitive field types that should be encrypted
 */
export const SENSITIVE_FIELDS = {
  customer: ['ssn', 'taxId', 'bankAccount', 'creditCard'],
  payment: ['cardNumber', 'cvv', 'bankAccount', 'routingNumber'],
  auth: ['password', 'apiKey', 'secret', 'token']
} as const;
