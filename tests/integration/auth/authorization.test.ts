/**
 * Authorization Integration Tests
 * 
 * Tests role-based access control (RBAC) and permissions
 */

import { AuthorizationService } from '@/services/auth/AuthorizationService';
import { AuthService } from '@/services/auth/AuthService';
import { setupTestDatabase, teardownTestDatabase, cleanDatabase } from '@tests/utils/test-db';
import { flushRedis, closeTestRedisClient } from '@tests/utils/test-redis';
import { testUsers } from '@tests/fixtures/users';
import { logger } from '@/utils/logger';

describe('Authorization Integration Tests', () => {
  let authService: AuthService;
  let authzService: AuthorizationService;
  let adminUser: any;
  let managerUser: any;
  let agentUser: any;
  let viewerUser: any;

  beforeAll(async () => {
    await setupTestDatabase();
    authService = new AuthService(logger);
    authzService = new AuthorizationService();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestRedisClient();
  });

  beforeEach(async () => {
    await cleanDatabase();
    await flushRedis();

    // Register test users with different roles
    adminUser = await authService.register({
      email: testUsers.admin.email,
      password: testUsers.admin.password,
      firstName: testUsers.admin.firstName,
      lastName: testUsers.admin.lastName,
      role: testUsers.admin.role,
    });

    managerUser = await authService.register({
      email: testUsers.manager.email,
      password: testUsers.manager.password,
      firstName: testUsers.manager.firstName,
      lastName: testUsers.manager.lastName,
      role: testUsers.manager.role,
    });

    agentUser = await authService.register({
      email: testUsers.agent.email,
      password: testUsers.agent.password,
      firstName: testUsers.agent.firstName,
      lastName: testUsers.agent.lastName,
      role: testUsers.agent.role,
    });

    viewerUser = await authService.register({
      email: testUsers.viewer.email,
      password: testUsers.viewer.password,
      firstName: testUsers.viewer.firstName,
      lastName: testUsers.viewer.lastName,
      role: testUsers.viewer.role,
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin to access admin resources', async () => {
      const hasAccess = await authzService.checkPermission(
        adminUser.user.id,
        'users:manage'
      );

      expect(hasAccess).toBe(true);
    });

    it('should allow manager to manage campaigns', async () => {
      const hasAccess = await authzService.checkPermission(
        managerUser.user.id,
        'campaigns:manage'
      );

      expect(hasAccess).toBe(true);
    });

    it('should allow agent to execute tasks', async () => {
      const hasAccess = await authzService.checkPermission(
        agentUser.user.id,
        'tasks:execute'
      );

      expect(hasAccess).toBe(true);
    });

    it('should restrict viewer to read-only access', async () => {
      const canRead = await authzService.checkPermission(
        viewerUser.user.id,
        'campaigns:view'
      );

      const canWrite = await authzService.checkPermission(
        viewerUser.user.id,
        'campaigns:manage'
      );

      expect(canRead).toBe(true);
      expect(canWrite).toBe(false);
    });

    it('should deny agent access to admin resources', async () => {
      const hasAccess = await authzService.checkPermission(
        agentUser.user.id,
        'users:manage'
      );

      expect(hasAccess).toBe(false);
    });

    it('should deny viewer access to task execution', async () => {
      const hasAccess = await authzService.checkPermission(
        viewerUser.user.id,
        'tasks:execute'
      );

      expect(hasAccess).toBe(false);
    });
  });

  describe('Permission Checks', () => {
    it('should check multiple permissions at once', async () => {
      const permissions = await authzService.checkPermissions(
        adminUser.user.id,
        ['users:manage', 'campaigns:manage', 'tasks:execute']
      );

      expect(permissions['users:manage']).toBe(true);
      expect(permissions['campaigns:manage']).toBe(true);
      expect(permissions['tasks:execute']).toBe(true);
    });

    it('should return false for non-existent permissions', async () => {
      const hasAccess = await authzService.checkPermission(
        agentUser.user.id,
        'nonexistent:permission'
      );

      expect(hasAccess).toBe(false);
    });

    it('should handle permission inheritance correctly', async () => {
      // Admin should have all permissions
      const adminPermissions = await authzService.getUserPermissions(adminUser.user.id);
      
      // Manager should have subset
      const managerPermissions = await authzService.getUserPermissions(managerUser.user.id);

      expect(adminPermissions.length).toBeGreaterThan(managerPermissions.length);
    });
  });

  describe('Resource Ownership', () => {
    it('should allow user to access own resources', async () => {
      const canAccess = await authzService.checkResourceOwnership(
        agentUser.user.id,
        'user',
        agentUser.user.id
      );

      expect(canAccess).toBe(true);
    });

    it('should deny user access to other users resources', async () => {
      const canAccess = await authzService.checkResourceOwnership(
        agentUser.user.id,
        'user',
        managerUser.user.id
      );

      expect(canAccess).toBe(false);
    });

    it('should allow admin to access any resource', async () => {
      const canAccess = await authzService.checkResourceOwnership(
        adminUser.user.id,
        'user',
        agentUser.user.id
      );

      expect(canAccess).toBe(true);
    });
  });

  describe('Role Management', () => {
    it('should allow admin to change user roles', async () => {
      await authzService.changeUserRole(
        adminUser.user.id,
        agentUser.user.id,
        'manager'
      );

      const updatedUser = await authService.getUserById(agentUser.user.id);
      expect(updatedUser.role).toBe('manager');
    });

    it('should deny non-admin from changing roles', async () => {
      await expect(
        authzService.changeUserRole(
          agentUser.user.id,
          viewerUser.user.id,
          'manager'
        )
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should validate role transitions', async () => {
      // Can't change admin to viewer directly (security)
      await expect(
        authzService.changeUserRole(
          adminUser.user.id,
          adminUser.user.id,
          'viewer'
        )
      ).rejects.toThrow();
    });
  });
});
