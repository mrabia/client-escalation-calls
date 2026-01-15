import { Request, Response, NextFunction } from 'express';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { config } from '@/config';

/**
 * Rate Limiter Configuration
 */
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix?: string;    // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  handler?: (req: Request, res: Response) => void;
}

/**
 * Rate Limiter Middleware
 * 
 * Implements token bucket algorithm with Redis
 * Prevents API abuse and DDoS attacks
 */
export class RateLimiter {
  private redis: RedisClientType;
  private logger: Logger;
  private config: Required<RateLimitConfig>;
  
  constructor(
    redis: RedisClientType,
    logger: Logger,
    config: RateLimitConfig
  ) {
    this.redis = redis;
    this.logger = logger;
    this.config = {
      keyPrefix: 'ratelimit',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      handler: this.defaultHandler,
      ...config
    };
  }
  
  /**
   * Create Express middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Get identifier (IP address or user ID)
        const identifier = this.getIdentifier(req);
        const key = `${this.config.keyPrefix}:${identifier}`;
        
        // Check rate limit
        const allowed = await this.checkLimit(key);
        
        if (!allowed) {
          // Rate limit exceeded
          const retryAfter = Math.ceil(this.config.windowMs / 1000);
          res.set('Retry-After', String(retryAfter));
          res.set('X-RateLimit-Limit', String(this.config.maxRequests));
          res.set('X-RateLimit-Remaining', '0');
          res.set('X-RateLimit-Reset', String(Date.now() + this.config.windowMs));
          
          this.logger.warn('Rate limit exceeded', {
            identifier,
            path: req.path,
            method: req.method
          });
          
          return this.config.handler(req, res);
        }
        
        // Get current count for headers
        const count = await this.getCount(key);
        res.set('X-RateLimit-Limit', String(this.config.maxRequests));
        res.set('X-RateLimit-Remaining', String(Math.max(0, this.config.maxRequests - count)));
        
        // Increment counter after response
        if (!this.config.skipSuccessfulRequests || !this.config.skipFailedRequests) {
          res.on('finish', async () => {
            const shouldCount = 
              (!this.config.skipSuccessfulRequests || res.statusCode >= 400) &&
              (!this.config.skipFailedRequests || res.statusCode < 400);
            
            if (shouldCount) {
              await this.increment(key);
            }
          });
        } else {
          await this.increment(key);
        }
        
        next();
        
      } catch (error) {
        this.logger.error('Rate limiter error', { error });
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }
  
  /**
   * Check if request is within rate limit
   */
  private async checkLimit(key: string): Promise<boolean> {
    const count = await this.getCount(key);
    return count < this.config.maxRequests;
  }
  
  /**
   * Get current request count
   */
  private async getCount(key: string): Promise<number> {
    const count = await this.redis.get(key);
    return count ? parseInt(count) : 0;
  }
  
  /**
   * Increment request counter
   */
  private async increment(key: string): Promise<void> {
    const multi = this.redis.multi();
    multi.incr(key);
    multi.pExpire(key, this.config.windowMs);
    await multi.exec();
  }
  
  /**
   * Get identifier from request
   */
  private getIdentifier(req: Request): string {
    // Prefer authenticated user ID
    if (req.user && (req.user as any).id) {
      return `user:${(req.user as any).id}`;
    }
    
    // Fall back to IP address
    const ip = req.ip || 
               req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.socket.remoteAddress || 
               'unknown';
    
    return `ip:${ip}`;
  }
  
  /**
   * Default rate limit exceeded handler
   */
  private defaultHandler(req: Request, res: Response): void {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: res.get('Retry-After')
    });
  }
}

/**
 * Create rate limiter from environment config
 * Uses RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_REQUESTS from config
 */
export const createRateLimiterFromConfig = (
  redis: RedisClientType,
  logger: Logger,
  keyPrefix: string = 'ratelimit:api'
) => new RateLimiter(
  redis,
  logger,
  {
    windowMs: config.rateLimit.windowMs,
    maxRequests: config.rateLimit.maxRequests,
    keyPrefix
  }
);

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimitPresets = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes
   */
  auth: (redis: RedisClientType, logger: Logger) => new RateLimiter(
    redis,
    logger,
    {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
      keyPrefix: 'ratelimit:auth',
      skipSuccessfulRequests: true // Only count failed attempts
    }
  ),
  
  /**
   * Standard rate limit for API endpoints
   * Uses values from config (RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS)
   */
  api: (redis: RedisClientType, logger: Logger) => new RateLimiter(
    redis,
    logger,
    {
      windowMs: config.rateLimit.windowMs,
      maxRequests: config.rateLimit.maxRequests,
      keyPrefix: 'ratelimit:api'
    }
  ),
  
  /**
   * Generous rate limit for public endpoints
   * 1000 requests per hour
   */
  public: (redis: RedisClientType, logger: Logger) => new RateLimiter(
    redis,
    logger,
    {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 1000,
      keyPrefix: 'ratelimit:public'
    }
  ),
  
  /**
   * Very strict rate limit for sensitive operations
   * 3 requests per hour
   */
  sensitive: (redis: RedisClientType, logger: Logger) => new RateLimiter(
    redis,
    logger,
    {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
      keyPrefix: 'ratelimit:sensitive'
    }
  )
};
