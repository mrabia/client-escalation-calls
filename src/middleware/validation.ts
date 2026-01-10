import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import validator from 'validator';

/**
 * Input Validation and Sanitization Middleware
 * 
 * Prevents injection attacks:
 * - SQL injection
 * - XSS (Cross-Site Scripting)
 * - NoSQL injection
 * - Command injection
 * - Path traversal
 */

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return String(input);
  }
  
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');
  
  // Escape HTML to prevent XSS
  sanitized = validator.escape(sanitized);
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return validator.isEmail(email);
}

/**
 * Validate phone number (US format)
 */
export function isValidPhone(phone: string): boolean {
  // Remove formatting
  const cleaned = phone.replace(/\D/g, '');
  // Check if it's 10 or 11 digits (with country code)
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}

/**
 * Validate UUID
 */
export function isValidUUID(uuid: string): boolean {
  return validator.isUUID(uuid);
}

/**
 * Validate date
 */
export function isValidDate(date: string): boolean {
  return validator.isISO8601(date);
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true
  });
}

/**
 * Check for SQL injection patterns
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\bOR\b|\bAND\b).*?=.*?/i,
    /UNION.*?SELECT/i,
    /DROP\s+(TABLE|DATABASE)/i,
    /INSERT\s+INTO/i,
    /DELETE\s+FROM/i,
    /UPDATE.*?SET/i,
    /--/,
    /\/\*/,
    /\*\//,
    /;.*?(DROP|INSERT|DELETE|UPDATE|SELECT)/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for NoSQL injection patterns
 */
export function containsNoSQLInjection(input: string): boolean {
  const noSqlPatterns = [
    /\$where/i,
    /\$ne/i,
    /\$gt/i,
    /\$lt/i,
    /\$regex/i,
    /\$or/i,
    /\$and/i
  ];
  
  return noSqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for path traversal patterns
 */
export function containsPathTraversal(input: string): boolean {
  const pathPatterns = [
    /\.\./,
    /\.\.\//, 
    /\.\.\\/, 
    /%2e%2e/i,
    /%252e%252e/i
  ];
  
  return pathPatterns.some(pattern => pattern.test(input));
}

/**
 * Check for command injection patterns
 */
export function containsCommandInjection(input: string): boolean {
  const commandPatterns = [
    /[;&|`$()]/,
    /\n/,
    /\r/
  ];
  
  return commandPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize request body middleware
 */
export function sanitizeBody(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body) {
        req.body = sanitizeObject(req.body);
      }
      next();
    } catch (error) {
      logger.error('Body sanitization failed', { error });
      res.status(400).json({
        error: 'Invalid request body'
      });
    }
  };
}

/**
 * Sanitize query parameters middleware
 */
export function sanitizeQuery(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }
      next();
    } catch (error) {
      logger.error('Query sanitization failed', { error });
      res.status(400).json({
        error: 'Invalid query parameters'
      });
    }
  };
}

/**
 * Validate request against injection attacks
 */
export function validateInjection(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check body
      if (req.body) {
        const bodyStr = JSON.stringify(req.body);
        
        if (containsSQLInjection(bodyStr)) {
          logger.warn('SQL injection attempt detected', {
            ip: req.ip,
            path: req.path,
            body: req.body
          });
          return res.status(400).json({
            error: 'Invalid input detected'
          });
        }
        
        if (containsNoSQLInjection(bodyStr)) {
          logger.warn('NoSQL injection attempt detected', {
            ip: req.ip,
            path: req.path,
            body: req.body
          });
          return res.status(400).json({
            error: 'Invalid input detected'
          });
        }
        
        if (containsCommandInjection(bodyStr)) {
          logger.warn('Command injection attempt detected', {
            ip: req.ip,
            path: req.path,
            body: req.body
          });
          return res.status(400).json({
            error: 'Invalid input detected'
          });
        }
      }
      
      // Check query parameters
      if (req.query) {
        const queryStr = JSON.stringify(req.query);
        
        if (containsPathTraversal(queryStr)) {
          logger.warn('Path traversal attempt detected', {
            ip: req.ip,
            path: req.path,
            query: req.query
          });
          return res.status(400).json({
            error: 'Invalid input detected'
          });
        }
      }
      
      next();
      
    } catch (error) {
      logger.error('Injection validation failed', { error });
      next(); // Fail open
    }
  };
}

/**
 * Validate specific field types
 */
export function validateFields(schema: Record<string, {
  type: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'uuid' | 'date' | 'url';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      
      // Check required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      
      // Skip validation if not required and not provided
      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }
      
      // Type validation
      switch (rules.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors.push(`${field} must be a string`);
          } else {
            if (rules.minLength && value.length < rules.minLength) {
              errors.push(`${field} must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
              errors.push(`${field} must be at most ${rules.maxLength} characters`);
            }
          }
          break;
          
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push(`${field} must be a number`);
          } else {
            if (rules.min !== undefined && value < rules.min) {
              errors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
              errors.push(`${field} must be at most ${rules.max}`);
            }
          }
          break;
          
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors.push(`${field} must be a boolean`);
          }
          break;
          
        case 'email':
          if (!isValidEmail(value)) {
            errors.push(`${field} must be a valid email address`);
          }
          break;
          
        case 'phone':
          if (!isValidPhone(value)) {
            errors.push(`${field} must be a valid phone number`);
          }
          break;
          
        case 'uuid':
          if (!isValidUUID(value)) {
            errors.push(`${field} must be a valid UUID`);
          }
          break;
          
        case 'date':
          if (!isValidDate(value)) {
            errors.push(`${field} must be a valid ISO 8601 date`);
          }
          break;
          
        case 'url':
          if (!isValidURL(value)) {
            errors.push(`${field} must be a valid URL`);
          }
          break;
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    next();
  };
}
