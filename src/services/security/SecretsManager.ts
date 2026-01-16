/**
 * Secrets Manager Service
 * 
 * Provides abstraction layer for secrets management supporting:
 * - AWS Secrets Manager
 * - HashiCorp Vault
 * - Railway (environment variables)
 * - Local .env files (development only)
 */

import { Logger } from 'winston';

export enum SecretsProvider {
  AWS_SECRETS_MANAGER = 'aws',
  HASHICORP_VAULT = 'vault',
  RAILWAY = 'railway',
  ENV = 'env'
}

export interface SecretsConfig {
  provider: SecretsProvider;
  aws?: {
    region: string;
    secretId?: string;
  };
  vault?: {
    address: string;
    token?: string;
    path: string;
    namespace?: string;
  };
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
}

interface CachedSecret {
  value: string;
  expiresAt: number;
}

export class SecretsManager {
  private readonly logger: Logger;
  private readonly config: SecretsConfig;
  private readonly cache: Map<string, CachedSecret> = new Map();
  private awsClient: any = null;
  private vaultClient: any = null;

  constructor(logger: Logger, config?: Partial<SecretsConfig>) {
    this.logger = logger;
    
    this.config = {
      provider: this.detectProvider(),
      cacheEnabled: true,
      cacheTtlSeconds: 300, // 5 minutes
      ...config
    };

    this.logger.info(`SecretsManager initialized with provider: ${this.config.provider}`);
  }

  /**
   * Auto-detect secrets provider based on environment
   */
  private detectProvider(): SecretsProvider {
    if (process.env.RAILWAY_ENVIRONMENT) {
      return SecretsProvider.RAILWAY;
    }
    if (process.env.AWS_REGION && process.env.AWS_SECRET_ID) {
      return SecretsProvider.AWS_SECRETS_MANAGER;
    }
    if (process.env.VAULT_ADDR) {
      return SecretsProvider.HASHICORP_VAULT;
    }
    return SecretsProvider.ENV;
  }

  /**
   * Get a secret by key
   */
  async getSecret(key: string): Promise<string | undefined> {
    // Check cache first
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }

    let value: string | undefined;

    try {
      switch (this.config.provider) {
        case SecretsProvider.AWS_SECRETS_MANAGER:
          value = await this.getFromAWS(key);
          break;
        case SecretsProvider.HASHICORP_VAULT:
          value = await this.getFromVault(key);
          break;
        case SecretsProvider.RAILWAY:
        case SecretsProvider.ENV:
        default:
          value = process.env[key];
          break;
      }

      // Cache the value
      if (value && this.config.cacheEnabled) {
        this.cache.set(key, {
          value,
          expiresAt: Date.now() + (this.config.cacheTtlSeconds * 1000)
        });
      }

      return value;
    } catch (error) {
      this.logger.error(`Failed to get secret: ${key}`, { error });
      // Fallback to environment variable
      return process.env[key];
    }
  }

  /**
   * Get multiple secrets at once
   */
  async getSecrets(keys: string[]): Promise<Record<string, string | undefined>> {
    const results: Record<string, string | undefined> = {};
    
    await Promise.all(
      keys.map(async (key) => {
        results[key] = await this.getSecret(key);
      })
    );

    return results;
  }

  /**
   * Get secret from AWS Secrets Manager
   */
  private async getFromAWS(key: string): Promise<string | undefined> {
    try {
      if (!this.awsClient) {
        const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
        this.awsClient = new SecretsManagerClient({
          region: this.config.aws?.region || process.env.AWS_REGION || 'us-east-1'
        });
      }

      const { GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
      const secretId = this.config.aws?.secretId || process.env.AWS_SECRET_ID;
      
      const response = await this.awsClient.send(
        new GetSecretValueCommand({ SecretId: secretId })
      );

      if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString);
        return secrets[key];
      }

      return undefined;
    } catch (error) {
      this.logger.error('AWS Secrets Manager error', { error, key });
      throw error;
    }
  }

  /**
   * Get secret from HashiCorp Vault
   */
  private async getFromVault(key: string): Promise<string | undefined> {
    try {
      const vaultAddr = this.config.vault?.address || process.env.VAULT_ADDR;
      const vaultToken = this.config.vault?.token || process.env.VAULT_TOKEN;
      const vaultPath = this.config.vault?.path || process.env.VAULT_PATH || 'secret/data/app';
      const namespace = this.config.vault?.namespace || process.env.VAULT_NAMESPACE;

      if (!vaultAddr || !vaultToken) {
        throw new Error('Vault address and token are required');
      }

      const headers: Record<string, string> = {
        'X-Vault-Token': vaultToken,
        'Content-Type': 'application/json'
      };

      if (namespace) {
        headers['X-Vault-Namespace'] = namespace;
      }

      const response = await fetch(`${vaultAddr}/v1/${vaultPath}`, { headers });
      
      if (!response.ok) {
        throw new Error(`Vault request failed: ${response.status}`);
      }

      const data = await response.json() as { data?: { data?: Record<string, string> } };
      return data.data?.data?.[key];
    } catch (error) {
      this.logger.error('Vault error', { error, key });
      throw error;
    }
  }

  /**
   * Clear secrets cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Secrets cache cleared');
  }

  /**
   * Rotate a secret (AWS Secrets Manager only)
   */
  async rotateSecret(secretId: string): Promise<void> {
    if (this.config.provider !== SecretsProvider.AWS_SECRETS_MANAGER) {
      throw new Error('Secret rotation only supported for AWS Secrets Manager');
    }

    try {
      const { RotateSecretCommand } = await import('@aws-sdk/client-secrets-manager');
      
      await this.awsClient.send(
        new RotateSecretCommand({ SecretId: secretId })
      );

      this.clearCache();
      this.logger.info(`Secret rotated: ${secretId}`);
    } catch (error) {
      this.logger.error('Failed to rotate secret', { error, secretId });
      throw error;
    }
  }

  /**
   * Validate required secrets exist
   */
  async validateRequiredSecrets(requiredKeys: string[]): Promise<{
    valid: boolean;
    missing: string[];
  }> {
    const missing: string[] = [];

    for (const key of requiredKeys) {
      const value = await this.getSecret(key);
      if (!value) {
        missing.push(key);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

/**
 * Required secrets for production
 */
export const REQUIRED_SECRETS = {
  core: [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL'
  ],
  encryption: [
    'ENCRYPTION_KEY'
  ],
  email: [
    'SMTP_USER',
    'SMTP_PASSWORD'
  ],
  twilio: [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ],
  ai: [
    'OPENAI_API_KEY'
  ]
} as const;

/**
 * Singleton instance
 */
let secretsManagerInstance: SecretsManager | null = null;

export function getSecretsManager(logger: Logger): SecretsManager {
  if (!secretsManagerInstance) {
    secretsManagerInstance = new SecretsManager(logger);
  }
  return secretsManagerInstance;
}
