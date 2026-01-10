/**
 * Authentication Routes
 * Express routes for authentication endpoints
 */

import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth/AuthService';
import { authenticate } from '../middleware/auth';
import Joi from 'joi';

const router = Router();
const authService = new AuthService();

/**
 * Validation schemas
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.details[0].message,
      });
    }

    const { email, password } = value;

    // Authenticate user
    const tokens = await authService.login(email, password);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error: any) {
    res.status(401).json({ 
      error: error instanceof Error ? error.message : String(error) || 'Authentication failed',
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const { error, value } = refreshSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.details[0].message,
      });
    }

    const { refreshToken } = value;

    // Refresh access token
    const result = await authService.refreshAccessToken(refreshToken);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(401).json({ 
      error: error instanceof Error ? error.message : String(error) || 'Token refresh failed',
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Logout user
    await authService.logout(req.user.sessionId);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error) || 'Logout failed',
    });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    success: true,
    data: {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

/**
 * GET /auth/sessions
 * Get all active sessions for current user
 */
router.get('/sessions', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessions = await authService.getUserSessions(req.user.userId);

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error) || 'Failed to get sessions',
    });
  }
});

/**
 * POST /auth/revoke-all-sessions
 * Revoke all sessions for current user (force logout from all devices)
 */
router.post('/revoke-all-sessions', authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await authService.revokeAllUserSessions(req.user.userId);

    res.json({
      success: true,
      message: 'All sessions revoked successfully',
    });
  } catch (error: any) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : String(error) || 'Failed to revoke sessions',
    });
  }
});

export default router;
