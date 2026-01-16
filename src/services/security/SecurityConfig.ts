/**
 * Security Configuration
 * 
 * Centralized security settings and hardening configuration
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Security headers configuration
 */
export const securityHeaders = {
  // Strict Transport Security - force HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline for Swagger UI
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  
  // Prevent clickjacking
  frameOptions: 'DENY',
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // XSS protection
  xssFilter: true,
  
  // Referrer policy
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  // Permissions policy
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: []
  }
};

/**
 * SSL/TLS Configuration
 */
export const sslConfig = {
  // Minimum TLS version
  minVersion: 'TLSv1.2' as const,
  
  // Preferred cipher suites (in order of preference)
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256'
  ].join(':'),
  
  // Honor server cipher order
  honorCipherOrder: true,
  
  // Session configuration
  sessionTimeout: 300, // 5 minutes
  
  // Certificate paths (for self-managed SSL)
  certPath: process.env.SSL_CERT_PATH,
  keyPath: process.env.SSL_KEY_PATH,
  caPath: process.env.SSL_CA_PATH
};

/**
 * Rate limiting tiers
 */
export const rateLimitConfig = {
  // Standard API endpoints
  standard: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many requests, please try again later'
  },
  
  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many authentication attempts'
  },
  
  // Password reset (very strict)
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset attempts'
  },
  
  // File upload
  upload: {
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: 'Upload limit exceeded'
  }
};

/**
 * CORS configuration
 */
export const corsConfig = {
  // Allowed origins (from environment)
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  
  // Allowed methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-Correlation-ID'
  ],
  
  // Exposed headers
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  
  // Allow credentials
  credentials: true,
  
  // Preflight cache
  maxAge: 86400 // 24 hours
};

/**
 * Input validation limits
 */
export const inputLimits = {
  // Maximum request body size
  maxBodySize: '10mb',
  
  // Maximum URL-encoded body size
  maxUrlEncodedSize: '10mb',
  
  // Maximum JSON depth
  maxJsonDepth: 10,
  
  // Maximum array items
  maxArrayItems: 1000,
  
  // Maximum string length
  maxStringLength: 50000,
  
  // File upload limits
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
};

/**
 * Session security configuration
 */
export const sessionConfig = {
  // Session name (avoid default)
  name: 'sid',
  
  // Cookie settings
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
    domain: process.env.COOKIE_DOMAIN
  },
  
  // Session expiry
  maxAge: 24 * 60 * 60, // 24 hours in seconds
  
  // Absolute timeout (force re-auth)
  absoluteTimeout: 7 * 24 * 60 * 60, // 7 days
  
  // Idle timeout
  idleTimeout: 30 * 60 // 30 minutes
};

/**
 * Password policy
 */
export const passwordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  preventCommonPasswords: true,
  preventUserInfo: true, // Can't use email/name in password
  historyCount: 5, // Remember last N passwords
  maxAge: 90, // Days before password expires
  minAge: 1 // Days before password can be changed again
};

/**
 * JWT configuration
 */
export const jwtConfig = {
  // Algorithm
  algorithm: 'HS256' as const,
  
  // Access token expiry
  accessTokenExpiry: '15m',
  
  // Refresh token expiry
  refreshTokenExpiry: '7d',
  
  // Issuer
  issuer: 'client-escalation-calls',
  
  // Audience
  audience: 'api',
  
  // Clock tolerance (for clock skew)
  clockTolerance: 30 // seconds
};

/**
 * Security middleware for request validation
 */
export function securityMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      `max-age=${securityHeaders.hsts.maxAge}; includeSubDomains; preload`
    );
  }
  
  // Validate content type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (contentType && !isValidContentType(contentType)) {
      res.status(415).json({ error: 'Unsupported Media Type' });
      return;
    }
  }
  
  next();
}

/**
 * Validate content type
 */
function isValidContentType(contentType: string): boolean {
  const allowed = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data'
  ];
  
  return allowed.some(type => contentType.includes(type));
}

/**
 * Sanitize request data
 */
export function sanitizeInput(data: unknown): unknown {
  if (typeof data === 'string') {
    // Remove null bytes
    return data.replace(/\0/g, '');
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (data && typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}

/**
 * IP whitelist/blacklist
 */
export const ipConfig = {
  // Enable IP filtering
  enabled: process.env.ENABLE_IP_FILTERING === 'true',
  
  // Whitelist mode (true = only allow whitelisted, false = block blacklisted)
  whitelistMode: false,
  
  // Whitelisted IPs/CIDRs
  whitelist: (process.env.IP_WHITELIST || '').split(',').filter(Boolean),
  
  // Blacklisted IPs/CIDRs
  blacklist: (process.env.IP_BLACKLIST || '').split(',').filter(Boolean),
  
  // Trust proxy settings
  trustProxy: process.env.TRUST_PROXY === 'true' || process.env.RAILWAY_ENVIRONMENT !== undefined
};
