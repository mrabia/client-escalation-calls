/**
 * User Test Fixtures
 */

import { hashTestPassword } from '../utils/test-helpers';

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  passwordHash?: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'agent' | 'viewer';
  isActive?: boolean;
  createdAt?: Date;
}

/**
 * Base test users
 */
export const testUsers: Record<string, TestUser> = {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
  },
  
  manager: {
    email: 'manager@example.com',
    password: 'Manager123!@#',
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager',
    isActive: true,
  },
  
  agent: {
    email: 'agent@example.com',
    password: 'Agent123!@#',
    firstName: 'Agent',
    lastName: 'User',
    role: 'agent',
    isActive: true,
  },
  
  viewer: {
    email: 'viewer@example.com',
    password: 'Viewer123!@#',
    firstName: 'Viewer',
    lastName: 'User',
    role: 'viewer',
    isActive: true,
  },
  
  inactive: {
    email: 'inactive@example.com',
    password: 'Inactive123!@#',
    firstName: 'Inactive',
    lastName: 'User',
    role: 'agent',
    isActive: false,
  },
};

/**
 * Get test user with hashed password
 */
export async function getTestUser(key: keyof typeof testUsers): Promise<TestUser> {
  const user = { ...testUsers[key] };
  user.passwordHash = await hashTestPassword(user.password);
  return user;
}

/**
 * Get all test users with hashed passwords
 */
export async function getAllTestUsers(): Promise<TestUser[]> {
  const users: TestUser[] = [];
  for (const key of Object.keys(testUsers)) {
    users.push(await getTestUser(key as keyof typeof testUsers));
  }
  return users;
}

/**
 * Create test user object
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    email: 'test@example.com',
    password: 'Test123!@#',
    firstName: 'Test',
    lastName: 'User',
    role: 'agent',
    isActive: true,
    ...overrides,
  };
}
