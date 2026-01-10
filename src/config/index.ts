/**
 * Application Configuration
 * Centralized configuration management with environment variables
 */

import dotenv from 'dotenv';
import path from 'path';
import { EnvValidator } from '../utils/env-validator';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Application Configuration Object
 */
export const config = {
  // Application
  app: {
    env: EnvValidator.getEnv('NODE_ENV', 'development'),
    port: EnvValidator.getEnvNumber('PORT', 3000),
    name: EnvValidator.getEnv('APP_NAME', 'Client Escalation Calls'),
    apiVersion: EnvValidator.getEnv('API_VERSION', 'v1'),
    logLevel: EnvValidator.getEnv('LOG_LEVEL', 'info'),
  },
  
  // Database
  database: {
    url: EnvValidator.getEnv('DATABASE_URL'),
    host: EnvValidator.getEnv('DB_HOST', 'localhost'),
    port: EnvValidator.getEnvNumber('DB_PORT', 5432),
    name: EnvValidator.getEnv('DB_NAME', 'client_escalation_calls'),
    user: EnvValidator.getEnv('DB_USER', 'postgres'),
    password: EnvValidator.getEnv('DB_PASSWORD', 'password'),
    poolMin: EnvValidator.getEnvNumber('DB_POOL_MIN', 2),
    poolMax: EnvValidator.getEnvNumber('DB_POOL_MAX', 10),
    ssl: EnvValidator.getEnvBoolean('DB_SSL', false),
  },
  
  // Redis
  redis: {
    url: EnvValidator.getEnv('REDIS_URL', 'redis://localhost:6379'),
    host: EnvValidator.getEnv('REDIS_HOST', 'localhost'),
    port: EnvValidator.getEnvNumber('REDIS_PORT', 6379),
    password: EnvValidator.getEnv('REDIS_PASSWORD'),
    db: EnvValidator.getEnvNumber('REDIS_DB', 0),
    ttl: EnvValidator.getEnvNumber('REDIS_TTL', 1800),
  },
  
  // Message Queue
  messageQueue: {
    rabbitmq: {
      url: EnvValidator.getEnv('RABBITMQ_URL', 'amqp://localhost:5672'),
      host: EnvValidator.getEnv('RABBITMQ_HOST', 'localhost'),
      port: EnvValidator.getEnvNumber('RABBITMQ_PORT', 5672),
      user: EnvValidator.getEnv('RABBITMQ_USER', 'guest'),
      password: EnvValidator.getEnv('RABBITMQ_PASSWORD', 'guest'),
      vhost: EnvValidator.getEnv('RABBITMQ_VHOST', '/'),
    },
    kafka: {
      brokers: EnvValidator.getEnv('KAFKA_BROKERS', 'localhost:9092').split(','),
      clientId: EnvValidator.getEnv('KAFKA_CLIENT_ID', 'client-escalation-calls'),
      groupId: EnvValidator.getEnv('KAFKA_GROUP_ID', 'escalation-group'),
    },
  },
  
  // Email (SMTP)
  email: {
    smtp: {
      host: EnvValidator.getEnv('SMTP_HOST', 'smtp.gmail.com'),
      port: EnvValidator.getEnvNumber('SMTP_PORT', 587),
      secure: EnvValidator.getEnvBoolean('SMTP_SECURE', false),
      user: EnvValidator.getEnv('SMTP_USER'),
      password: EnvValidator.getEnv('SMTP_PASSWORD'),
      fromName: EnvValidator.getEnv('SMTP_FROM_NAME', 'Payment Collection Team'),
      fromEmail: EnvValidator.getEnv('SMTP_FROM_EMAIL', 'noreply@yourcompany.com'),
    },
    imap: {
      host: EnvValidator.getEnv('IMAP_HOST', 'imap.gmail.com'),
      port: EnvValidator.getEnvNumber('IMAP_PORT', 993),
      secure: EnvValidator.getEnvBoolean('IMAP_SECURE', true),
      user: EnvValidator.getEnv('IMAP_USER'),
      password: EnvValidator.getEnv('IMAP_PASSWORD'),
    },
  },
  
  // Twilio
  twilio: {
    accountSid: EnvValidator.getEnv('TWILIO_ACCOUNT_SID'),
    authToken: EnvValidator.getEnv('TWILIO_AUTH_TOKEN'),
    phoneNumber: EnvValidator.getEnv('TWILIO_PHONE_NUMBER'),
    smsServiceSid: EnvValidator.getEnv('TWILIO_SMS_SERVICE_SID'),
    webhookUrl: EnvValidator.getEnv('TWILIO_WEBHOOK_URL'),
  },
  
  // Authentication
  auth: {
    jwtSecret: EnvValidator.getEnv('JWT_SECRET'),
    jwtExpiresIn: EnvValidator.getEnv('JWT_EXPIRES_IN', '24h'),
    jwtRefreshSecret: EnvValidator.getEnv('JWT_REFRESH_SECRET'),
    jwtRefreshExpiresIn: EnvValidator.getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
    bcryptRounds: EnvValidator.getEnvNumber('BCRYPT_ROUNDS', 12),
  },
  
  // Elasticsearch
  elasticsearch: {
    url: EnvValidator.getEnv('ELASTICSEARCH_URL', 'http://localhost:9200'),
    username: EnvValidator.getEnv('ELASTICSEARCH_USERNAME'),
    password: EnvValidator.getEnv('ELASTICSEARCH_PASSWORD'),
    indexPrefix: EnvValidator.getEnv('ELASTICSEARCH_INDEX_PREFIX', 'escalation'),
  },
  
  // AI & LLM (for future implementation)
  ai: {
    openai: {
      apiKey: EnvValidator.getEnv('OPENAI_API_KEY'),
    },
    anthropic: {
      apiKey: EnvValidator.getEnv('ANTHROPIC_API_KEY'),
    },
    google: {
      apiKey: EnvValidator.getEnv('GOOGLE_AI_API_KEY'),
    },
  },
  
  // Vector Database (for future implementation)
  vectorDb: {
    pinecone: {
      apiKey: EnvValidator.getEnv('PINECONE_API_KEY'),
      environment: EnvValidator.getEnv('PINECONE_ENVIRONMENT'),
      indexName: EnvValidator.getEnv('PINECONE_INDEX_NAME', 'escalation-memory'),
    },
    qdrant: {
      url: EnvValidator.getEnv('QDRANT_URL', 'http://localhost:6333'),
      apiKey: EnvValidator.getEnv('QDRANT_API_KEY'),
    },
  },
  
  // Business Rules
  business: {
    maxDailyContactsPerCustomer: EnvValidator.getEnvNumber('MAX_DAILY_CONTACTS_PER_CUSTOMER', 3),
    campaignCooldownHours: EnvValidator.getEnvNumber('CAMPAIGN_COOLDOWN_HOURS', 4),
    businessHoursStart: EnvValidator.getEnv('BUSINESS_HOURS_START', '09:00'),
    businessHoursEnd: EnvValidator.getEnv('BUSINESS_HOURS_END', '17:00'),
    defaultTimezone: EnvValidator.getEnv('DEFAULT_TIMEZONE', 'America/New_York'),
  },
  
  // Compliance
  compliance: {
    enableDoNotCallCheck: EnvValidator.getEnvBoolean('ENABLE_DO_NOT_CALL_CHECK', true),
    enableTcpaCompliance: EnvValidator.getEnvBoolean('ENABLE_TCPA_COMPLIANCE', true),
    enableAuditLogging: EnvValidator.getEnvBoolean('ENABLE_AUDIT_LOGGING', true),
  },
  
  // Feature Flags
  features: {
    emailAgent: EnvValidator.getEnvBoolean('ENABLE_EMAIL_AGENT', true),
    phoneAgent: EnvValidator.getEnvBoolean('ENABLE_PHONE_AGENT', true),
    smsAgent: EnvValidator.getEnvBoolean('ENABLE_SMS_AGENT', true),
    researchAgent: EnvValidator.getEnvBoolean('ENABLE_RESEARCH_AGENT', false),
    aiGeneration: EnvValidator.getEnvBoolean('ENABLE_AI_GENERATION', false),
    vectorMemory: EnvValidator.getEnvBoolean('ENABLE_VECTOR_MEMORY', false),
  },
  
  // CORS
  cors: {
    origin: EnvValidator.getEnv('CORS_ORIGIN', 'http://localhost:3000').split(','),
    credentials: EnvValidator.getEnvBoolean('CORS_CREDENTIALS', true),
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: EnvValidator.getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
    maxRequests: EnvValidator.getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },
  
  // File Upload
  upload: {
    maxFileSizeMB: EnvValidator.getEnvNumber('MAX_FILE_SIZE_MB', 10),
    uploadDir: EnvValidator.getEnv('UPLOAD_DIR', './uploads'),
  },
  
  // Monitoring
  monitoring: {
    prometheusPort: EnvValidator.getEnvNumber('PROMETHEUS_PORT', 9090),
    grafanaPort: EnvValidator.getEnvNumber('GRAFANA_PORT', 3001),
  },
  
  // WebSocket
  websocket: {
    port: EnvValidator.getEnvNumber('WEBSOCKET_PORT', 3001),
    path: EnvValidator.getEnv('WEBSOCKET_PATH', '/ws'),
  },
  
  // Development
  dev: {
    debug: EnvValidator.getEnvBoolean('DEBUG', false),
    prettyLogs: EnvValidator.getEnvBoolean('PRETTY_LOGS', true),
  },
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return config.app.env === 'production';
};

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => {
  return config.app.env === 'development';
};

/**
 * Check if running in test
 */
export const isTest = (): boolean => {
  return config.app.env === 'test';
};

/**
 * Export configuration
 */
export default config;
