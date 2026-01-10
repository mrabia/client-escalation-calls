/**
 * Authorization Service
 * Role-Based Access Control (RBAC) implementation
 */

export type Role = 'admin' | 'manager' | 'agent' | 'viewer';
export type Action = 'create' | 'read' | 'update' | 'delete';
export type Resource = 
  | 'users'
  | 'campaigns'
  | 'tasks'
  | 'customers'
  | 'settings'
  | 'reports'
  | 'agents'
  | 'templates'
  | 'audit_logs';

export interface Permission {
  resource: Resource;
  actions: Action[];
}

export interface RolePermissions {
  [key: string]: Permission[];
}

/**
 * Role-based permissions matrix
 */
export const ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'campaigns', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'customers', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'settings', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'agents', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'templates', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'audit_logs', actions: ['read'] },
  ],
  
  manager: [
    { resource: 'users', actions: ['read'] },
    { resource: 'campaigns', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'customers', actions: ['read', 'update'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'agents', actions: ['read', 'update'] },
    { resource: 'templates', actions: ['create', 'read', 'update'] },
    { resource: 'audit_logs', actions: ['read'] },
  ],
  
  agent: [
    { resource: 'users', actions: ['read'] },
    { resource: 'campaigns', actions: ['read'] },
    { resource: 'tasks', actions: ['read', 'update'] },
    { resource: 'customers', actions: ['read', 'update'] },
    { resource: 'settings', actions: [] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'agents', actions: ['read'] },
    { resource: 'templates', actions: ['read'] },
    { resource: 'audit_logs', actions: [] },
  ],
  
  viewer: [
    { resource: 'users', actions: ['read'] },
    { resource: 'campaigns', actions: ['read'] },
    { resource: 'tasks', actions: ['read'] },
    { resource: 'customers', actions: ['read'] },
    { resource: 'settings', actions: [] },
    { resource: 'reports', actions: ['read'] },
    { resource: 'agents', actions: ['read'] },
    { resource: 'templates', actions: ['read'] },
    { resource: 'audit_logs', actions: [] },
  ],
};

export class AuthorizationService {
  /**
   * Check if user has permission to perform action on resource
   */
  hasPermission(role: Role, resource: Resource, action: Action): boolean {
    const rolePermissions = ROLE_PERMISSIONS[role];
    
    if (!rolePermissions) {
      return false;
    }

    const resourcePermission = rolePermissions.find(p => p.resource === resource);
    
    if (!resourcePermission) {
      return false;
    }

    return resourcePermission.actions.includes(action);
  }

  /**
   * Check if user can create resource
   */
  canCreate(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, 'create');
  }

  /**
   * Check if user can read resource
   */
  canRead(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, 'read');
  }

  /**
   * Check if user can update resource
   */
  canUpdate(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, 'update');
  }

  /**
   * Check if user can delete resource
   */
  canDelete(role: Role, resource: Resource): boolean {
    return this.hasPermission(role, resource, 'delete');
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Check if user owns resource (for ownership-based access control)
   */
  isOwner(userId: string, resourceOwnerId: string): boolean {
    return userId === resourceOwnerId;
  }

  /**
   * Check if user can access resource based on role and ownership
   * Combines RBAC with ownership checks
   */
  canAccess(
    role: Role,
    resource: Resource,
    action: Action,
    userId: string,
    resourceOwnerId?: string
  ): boolean {
    // Admin can access everything
    if (role === 'admin') {
      return true;
    }

    // Check role-based permission
    const hasRolePermission = this.hasPermission(role, resource, action);

    // If no ownership check needed, return role permission
    if (!resourceOwnerId) {
      return hasRolePermission;
    }

    // For ownership-sensitive resources, check if user owns it
    const isOwner = this.isOwner(userId, resourceOwnerId);

    // Allow if user has role permission OR is the owner
    return hasRolePermission || isOwner;
  }

  /**
   * Filter resources based on user permissions
   * Returns only resources user has permission to access
   */
  filterByPermission<T extends { id: string; ownerId?: string }>(
    role: Role,
    resource: Resource,
    action: Action,
    userId: string,
    items: T[]
  ): T[] {
    return items.filter(item => 
      this.canAccess(role, resource, action, userId, item.ownerId)
    );
  }

  /**
   * Get list of resources user can access
   */
  getAccessibleResources(role: Role): Resource[] {
    const permissions = this.getRolePermissions(role);
    return permissions
      .filter(p => p.actions.length > 0)
      .map(p => p.resource);
  }

  /**
   * Get list of actions user can perform on a resource
   */
  getResourceActions(role: Role, resource: Resource): Action[] {
    const permissions = this.getRolePermissions(role);
    const resourcePermission = permissions.find(p => p.resource === resource);
    return resourcePermission?.actions || [];
  }

  /**
   * Check if role has any admin privileges
   */
  isAdmin(role: Role): boolean {
    return role === 'admin';
  }

  /**
   * Check if role has manager or higher privileges
   */
  isManagerOrHigher(role: Role): boolean {
    return role === 'admin' || role === 'manager';
  }

  /**
   * Check if role has agent or higher privileges
   */
  isAgentOrHigher(role: Role): boolean {
    return role === 'admin' || role === 'manager' || role === 'agent';
  }

  /**
   * Validate role exists
   */
  isValidRole(role: string): role is Role {
    return ['admin', 'manager', 'agent', 'viewer'].includes(role);
  }
}
