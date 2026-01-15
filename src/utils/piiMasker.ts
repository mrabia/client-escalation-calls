/**
 * PII Data Masking Utility
 * Masks Personally Identifiable Information in logs and data
 */

/**
 * PII Pattern definitions
 */
interface PIIPattern {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string) => string);
}

/**
 * Configuration for PII masking
 */
export interface PIIMaskingConfig {
  enabled: boolean;
  maskChar: string;
  preserveLength: boolean;
  patterns: {
    email: boolean;
    phone: boolean;
    ssn: boolean;
    creditCard: boolean;
    ipAddress: boolean;
    name: boolean;
    address: boolean;
    dateOfBirth: boolean;
    accountNumber: boolean;
    customPatterns?: PIIPattern[];
  };
}

/**
 * Default PII masking configuration
 */
const defaultConfig: PIIMaskingConfig = {
  enabled: process.env.PII_MASKING_ENABLED !== 'false',
  maskChar: '*',
  preserveLength: false,
  patterns: {
    email: true,
    phone: true,
    ssn: true,
    creditCard: true,
    ipAddress: true,
    name: false, // Disabled by default - too many false positives
    address: false, // Disabled by default - too many false positives
    dateOfBirth: true,
    accountNumber: true
  }
};

/**
 * PII Masker Class
 * Provides methods to mask PII data in strings and objects
 */
export class PIIMasker {
  private config: PIIMaskingConfig;
  private patterns: PIIPattern[];

  constructor(config: Partial<PIIMaskingConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.patterns = this.buildPatterns();
  }

  /**
   * Build regex patterns based on configuration
   */
  private buildPatterns(): PIIPattern[] {
    const patterns: PIIPattern[] = [];

    if (this.config.patterns.email) {
      patterns.push({
        name: 'email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: (match: string) => this.maskEmail(match)
      });
    }

    if (this.config.patterns.phone) {
      patterns.push({
        name: 'phone',
        // US phone formats: (123) 456-7890, 123-456-7890, 1234567890, +1-123-456-7890
        pattern: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
        replacement: (match: string) => this.maskPhone(match)
      });
    }

    if (this.config.patterns.ssn) {
      patterns.push({
        name: 'ssn',
        // SSN format: 123-45-6789 or 123456789
        pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
        replacement: '***-**-****'
      });
    }

    if (this.config.patterns.creditCard) {
      patterns.push({
        name: 'creditCard',
        // Credit card: 16 digits with optional spaces/dashes
        pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        replacement: (match: string) => this.maskCreditCard(match)
      });
    }

    if (this.config.patterns.ipAddress) {
      patterns.push({
        name: 'ipAddress',
        // IPv4 addresses
        pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
        replacement: (match: string) => this.maskIP(match)
      });
    }

    if (this.config.patterns.dateOfBirth) {
      patterns.push({
        name: 'dateOfBirth',
        // Common date formats: MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY
        pattern: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/g,
        replacement: '**/**/****'
      });
    }

    if (this.config.patterns.accountNumber) {
      patterns.push({
        name: 'accountNumber',
        // Account numbers: typically 8-17 digits
        pattern: /\b(?:account|acct|acc)[#:\s]*\d{8,17}\b/gi,
        replacement: (match: string) => {
          const prefix = match.replace(/\d+$/, '');
          return `${prefix}********`;
        }
      });
    }

    // Add custom patterns
    if (this.config.patterns.customPatterns) {
      patterns.push(...this.config.patterns.customPatterns);
    }

    return patterns;
  }

  /**
   * Mask email address (preserve domain structure)
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return this.mask(email);
    
    const maskedLocal = local.length <= 2 
      ? this.mask(local)
      : local[0] + this.mask(local.slice(1, -1)) + local[local.length - 1];
    
    const domainParts = domain.split('.');
    const maskedDomain = domainParts.length >= 2
      ? this.mask(domainParts[0]) + '.' + domainParts.slice(1).join('.')
      : this.mask(domain);
    
    return `${maskedLocal}@${maskedDomain}`;
  }

  /**
   * Mask phone number (preserve last 4 digits)
   */
  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return this.mask(phone);
    
    const last4 = digits.slice(-4);
    return `***-***-${last4}`;
  }

  /**
   * Mask credit card (preserve last 4 digits)
   */
  private maskCreditCard(card: string): string {
    const digits = card.replace(/\D/g, '');
    if (digits.length < 4) return this.mask(card);
    
    const last4 = digits.slice(-4);
    return `****-****-****-${last4}`;
  }

  /**
   * Mask IP address (preserve first octet)
   */
  private maskIP(ip: string): string {
    const octets = ip.split('.');
    if (octets.length !== 4) return this.mask(ip);
    
    return `${octets[0]}.***.***.**`;
  }

  /**
   * Generic mask function
   */
  private mask(value: string): string {
    if (this.config.preserveLength) {
      return this.config.maskChar.repeat(value.length);
    }
    return this.config.maskChar.repeat(Math.min(value.length, 8));
  }

  /**
   * Mask PII in a string
   */
  maskString(input: string): string {
    if (!this.config.enabled || !input) {
      return input;
    }

    let result = input;
    
    for (const pattern of this.patterns) {
      if (typeof pattern.replacement === 'function') {
        result = result.replace(pattern.pattern, pattern.replacement);
      } else {
        result = result.replace(pattern.pattern, pattern.replacement);
      }
    }
    
    return result;
  }

  /**
   * Mask PII in an object (deep)
   */
  maskObject<T>(obj: T): T {
    if (!this.config.enabled) {
      return obj;
    }

    return this.deepMask(obj) as T;
  }

  /**
   * Deep mask implementation
   */
  private deepMask(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.maskString(value);
    }

    if (Array.isArray(value)) {
      return value.map(item => this.deepMask(item));
    }

    if (typeof value === 'object') {
      const masked: Record<string, unknown> = {};
      
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        // Check if key suggests sensitive data
        if (this.isSensitiveKey(key)) {
          masked[key] = this.maskSensitiveValue(val);
        } else {
          masked[key] = this.deepMask(val);
        }
      }
      
      return masked;
    }

    return value;
  }

  /**
   * Check if a key name suggests sensitive data
   */
  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'password', 'passwd', 'pwd', 'secret',
      'token', 'apikey', 'api_key', 'apiKey',
      'authorization', 'auth', 'bearer',
      'ssn', 'socialSecurity', 'social_security',
      'creditCard', 'credit_card', 'cardNumber', 'card_number',
      'cvv', 'cvc', 'securityCode', 'security_code',
      'pin', 'bankAccount', 'bank_account', 'routingNumber', 'routing_number',
      'dob', 'dateOfBirth', 'date_of_birth', 'birthDate', 'birth_date'
    ];
    
    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive.toLowerCase()));
  }

  /**
   * Mask a value that was identified by its key as sensitive
   */
  private maskSensitiveValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '[REDACTED]';
    }
    
    if (typeof value === 'string') {
      if (value.length === 0) return '[EMPTY]';
      return `[REDACTED:${value.length} chars]`;
    }
    
    return '[REDACTED]';
  }

  /**
   * Create a masked copy of headers (for HTTP logging)
   */
  maskHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string | string[] | undefined> {
    const sensitiveHeaders = [
      'authorization', 'x-api-key', 'x-auth-token',
      'cookie', 'set-cookie', 'x-csrf-token'
    ];
    
    const masked: Record<string, string | string[] | undefined> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        masked[key] = '[REDACTED]';
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  /**
   * Check if masking is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PIIMaskingConfig>): void {
    this.config = { ...this.config, ...config };
    this.patterns = this.buildPatterns();
  }
}

// Singleton instance with default config
let piiMaskerInstance: PIIMasker | null = null;

/**
 * Get the singleton PII masker instance
 */
export function getPIIMasker(): PIIMasker {
  if (!piiMaskerInstance) {
    piiMaskerInstance = new PIIMasker();
  }
  return piiMaskerInstance;
}

/**
 * Convenience function to mask a string
 */
export function maskPII(input: string): string {
  return getPIIMasker().maskString(input);
}

/**
 * Convenience function to mask an object
 */
export function maskPIIObject<T>(obj: T): T {
  return getPIIMasker().maskObject(obj);
}
