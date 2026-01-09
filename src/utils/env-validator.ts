/**
 * Environment Variable Validator
 * Validates required environment variables on application startup
 */

import { logger } from './logger';

interface EnvConfig {
  name: string;
  required: boolean;
  defaultValue?: string;
  validator?: (value: string) => boolean;
  description?: string;
}

const ENV_CONFIG: EnvConfig[] = [
  // Application
  { name: 'NODE_ENV', required: true, defaultValue: 'development' },
  { name: 'PORT', required: true, defaultValue: '3000', validator: (v) => !isNaN(Number(v)) },
  
  // Database
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },
  { name: 'DB_HOST', required: false, defaultValue: 'localhost' },
  { name: 'DB_PORT', required: false, defaultValue: '5432' },
  { name: 'DB_NAME', required: false, defaultValue: 'client_escalation_calls' },
  { name: 'DB_USER', required: false, defaultValue: 'postgres' },
  { name: 'DB_PASSWORD', required: false },
  
  // Redis
  { name: 'REDIS_URL', required: true, description: 'Redis connection string' },
  { name: 'REDIS_HOST', required: false, defaultValue: 'localhost' },
  { name: 'REDIS_PORT', required: false, defaultValue: '6379' },
  
  // Authentication
  { name: 'JWT_SECRET', required: true, description: 'JWT secret key (min 32 characters)', validator: (v) => v.length >= 32 },
  { name: 'JWT_EXPIRES_IN', required: false, defaultValue: '24h' },
  
  // Email (SMTP)
  { name: 'SMTP_HOST', required: false },
  { name: 'SMTP_PORT', required: false, defaultValue: '587' },
  { name: 'SMTP_USER', required: false },
  { name: 'SMTP_PASSWORD', required: false },
  
  // Email (IMAP)
  { name: 'IMAP_HOST', required: false },
  { name: 'IMAP_PORT', required: false, defaultValue: '993' },
  { name: 'IMAP_USER', required: false },
  { name: 'IMAP_PASSWORD', required: false },
  
  // Twilio
  { name: 'TWILIO_ACCOUNT_SID', required: false },
  { name: 'TWILIO_AUTH_TOKEN', required: false },
  { name: 'TWILIO_PHONE_NUMBER', required: false },
  
  // Elasticsearch
  { name: 'ELASTICSEARCH_URL', required: false, defaultValue: 'http://localhost:9200' },
  
  // Feature Flags
  { name: 'ENABLE_EMAIL_AGENT', required: false, defaultValue: 'true' },
  { name: 'ENABLE_PHONE_AGENT', required: false, defaultValue: 'true' },
  { name: 'ENABLE_SMS_AGENT', required: false, defaultValue: 'true' },
];

export class EnvValidator {
  private errors: string[] = [];
  private warnings: string[] = [];
  
  /**
   * Validate all environment variables
   */
  validate(): boolean {
    this.errors = [];
    this.warnings = [];
    
    for (const config of ENV_CONFIG) {
      this.validateVariable(config);
    }
    
    this.logResults();
    
    return this.errors.length === 0;
  }
  
  /**
   * Validate a single environment variable
   */
  private validateVariable(config: EnvConfig): void {
    const value = process.env[config.name];
    
    // Check if required variable is missing
    if (config.required && !value) {
      if (config.defaultValue) {
        process.env[config.name] = config.defaultValue;
        this.warnings.push(
          `${config.name} is missing, using default: ${config.defaultValue}`
        );
      } else {
        this.errors.push(
          `${config.name} is required but not set${config.description ? `: ${config.description}` : ''}`
        );
      }
      return;
    }
    
    // Set default value if variable is not set
    if (!value && config.defaultValue) {
      process.env[config.name] = config.defaultValue;
      return;
    }
    
    // Run custom validator if provided
    if (value && config.validator && !config.validator(value)) {
      this.errors.push(
        `${config.name} has invalid value: ${value}${config.description ? ` (${config.description})` : ''}`
      );
    }
  }
  
  /**
   * Log validation results
   */
  private logResults(): void {
    if (this.warnings.length > 0) {
      logger.warn('Environment validation warnings:');
      this.warnings.forEach(warning => logger.warn(`  - ${warning}`));
    }
    
    if (this.errors.length > 0) {
      logger.error('Environment validation errors:');
      this.errors.forEach(error => logger.error(`  - ${error}`));
      logger.error('\nPlease check your .env file or environment variables.');
      logger.error('See .env.example for reference.\n');
    } else {
      logger.info('✓ Environment validation passed');
    }
  }
  
  /**
   * Get validation errors
   */
  getErrors(): string[] {
    return this.errors;
  }
  
  /**
   * Get validation warnings
   */
  getWarnings(): string[] {
    return this.warnings;
  }
  
  /**
   * Check if a specific feature is enabled
   */
  static isFeatureEnabled(featureName: string): boolean {
    const value = process.env[featureName];
    return value === 'true' || value === '1' || value === 'yes';
  }
  
  /**
   * Get environment value with type conversion
   */
  static getEnv(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || '';
  }
  
  static getEnvNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (!value) return defaultValue || 0;
    const num = Number(value);
    return isNaN(num) ? (defaultValue || 0) : num;
  }
  
  static getEnvBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (!value) return defaultValue || false;
    return value === 'true' || value === '1' || value === 'yes';
  }
}

/**
 * Validate environment on module load
 */
export function validateEnvironment(): void {
  const validator = new EnvValidator();
  const isValid = validator.validate();
  
  if (!isValid) {
    logger.error('Environment validation failed. Exiting...');
    process.exit(1);
  }
}

/**
 * Export singleton instance
 */
export const envValidator = new EnvValidator();
