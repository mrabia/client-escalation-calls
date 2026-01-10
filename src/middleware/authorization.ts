/**
 * Authorization Middleware
 * Express middleware for RBAC permission checking
 */

import { Request, Response, NextFunction } from 'express';
import { AuthorizationService, Resource, Action, Role } from '../services/auth/AuthorizationService';

const authzService = new AuthorizationService();

/**
 * Require permission middleware
 * Checks if user has permission to perform action on resource
 */
export function requirePermission(resource: Resource, action: Action) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasPermission = authzService.hasPermission(
      req.user.role as Role,
      resource,
      action
    );

    if (!hasPermission) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: { resource, action },
        userRole: req.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Require ownership or permission middleware
 * Checks if user owns resource OR has role-based permission
 */
export function requireOwnershipOrPermission(
  resource: Resource,
  action: Action,
  getResourceOwnerId: (req: Request) => string | Promise<string>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const resourceOwnerId = await getResourceOwnerId(req);
      
      const canAccess = authzService.canAccess(
        req.user.role as Role,
        resource,
        action,
        req.user.userId,
        resourceOwnerId
      );

      if (!canAccess) {
        res.status(403).json({ 
          error: 'Insufficient permissions or not resource owner',
          required: { resource, action },
          userRole: req.user.role,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify ownership' });
    }
  };
}

/**
 * Shorthand middleware for common CRUD operations
 */
export const canCreate = (resource: Resource) => requirePermission(resource, 'create');
export const canRead = (resource: Resource) => requirePermission(resource, 'read');
export const canUpdate = (resource: Resource) => requirePermission(resource, 'update');
export const canDelete = (resource: Resource) => requirePermission(resource, 'delete');

/**
 * Check if user is admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!authzService.isAdmin(req.user.role as Role)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

/**
 * Check if user is manager or higher
 */
export function requireManagerOrHigher(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!authzService.isManagerOrHigher(req.user.role as Role)) {
    res.status(403).json({ error: 'Manager access or higher required' });
    return;
  }

  next();
}

/**
 * Check if user is agent or higher
 */
export function requireAgentOrHigher(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!authzService.isAgentOrHigher(req.user.role as Role)) {
    res.status(403).json({ error: 'Agent access or higher required' });
    return;
  }

  next();
}
