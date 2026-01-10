/**
 * Authentication Middleware
 * Express middleware for JWT validation and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/auth/AuthService';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const authService = new AuthService();

/**
 * Authenticate middleware - validates JWT token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token
    const payload = await authService.validateAccessToken(token);

    // Attach user to request
    req.user = payload;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication - validates token if present, but doesn't require it
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await authService.validateAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Token invalid, but continue without user
    next();
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Require admin or manager role
 */
export const requireManager = requireRole('admin', 'manager');

/**
 * Require admin, manager, or agent role
 */
export const requireAgent = requireRole('admin', 'manager', 'agent');
