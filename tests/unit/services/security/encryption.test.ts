/**
 * Encryption Service Unit Tests
 * 
 * Tests encryption/decryption functionality
 */

import { EncryptionService } from '@/services/security/EncryptionService';
import { logger } from '@/utils/logger';

describe('Encryption Service Tests', () => {
  let encryptionService: EncryptionService;

  beforeAll(() => {
    // Ensure encryption key is set
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    encryptionService = new EncryptionService(logger);
  });

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt plaintext successfully', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');
    });

    it('should decrypt encrypted data successfully', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', () => {
      const plaintext = '';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', () => {
      const plaintext = '你好世界 🌍 مرحبا';
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('should handle long text', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encryptionService.encrypt(plaintext);
      const decrypted = encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('Security Properties', () => {
    it('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'test data';
      const encrypted1 = encryptionService.encrypt(plaintext);
      const encrypted2 = encryptionService.encrypt(plaintext);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to same plaintext
      expect(encryptionService.decrypt(encrypted1)).toBe(plaintext);
      expect(encryptionService.decrypt(encrypted2)).toBe(plaintext);
    });

    it('should fail decryption with tampered ciphertext', () => {
      const plaintext = 'sensitive data';
      const encrypted = encryptionService.encrypt(plaintext);
      
      // Tamper with the encrypted data
      const tampered = encrypted.slice(0, -5) + 'XXXXX';

      expect(() => {
        encryptionService.decrypt(tampered);
      }).toThrow();
    });

    it('should fail decryption with invalid format', () => {
      expect(() => {
        encryptionService.decrypt('invalid-encrypted-data');
      }).toThrow();
    });
  });

  describe('Field Encryption', () => {
    it('should encrypt specific object fields', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        email: 'john@example.com',
        creditCard: '4111-1111-1111-1111',
      };

      const encrypted = encryptionService.encryptFields(data, ['ssn', 'creditCard']);

      expect(encrypted.name).toBe(data.name);
      expect(encrypted.email).toBe(data.email);
      expect(encrypted.ssn).not.toBe(data.ssn);
      expect(encrypted.creditCard).not.toBe(data.creditCard);
    });

    it('should decrypt specific object fields', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        creditCard: '4111-1111-1111-1111',
      };

      const encrypted = encryptionService.encryptFields(data, ['ssn', 'creditCard']);
      const decrypted = encryptionService.decryptFields(encrypted, ['ssn', 'creditCard']);

      expect(decrypted.name).toBe(data.name);
      expect(decrypted.ssn).toBe(data.ssn);
      expect(decrypted.creditCard).toBe(data.creditCard);
    });

    it('should handle missing fields gracefully', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const encrypted = encryptionService.encryptFields(data, ['ssn', 'creditCard']);

      expect(encrypted.name).toBe(data.name);
      expect(encrypted.email).toBe(data.email);
      expect(encrypted).not.toHaveProperty('ssn');
      expect(encrypted).not.toHaveProperty('creditCard');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid encryption key', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'invalid-key';

      expect(() => {
        new EncryptionService(logger);
      }).toThrow('ENCRYPTION_KEY must be 32 bytes');

      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when encryption key is missing', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => {
        new EncryptionService(logger);
      }).toThrow('ENCRYPTION_KEY environment variable is required');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });
});
