/**
 * Customer Test Fixtures
 */

import { randomEmail, randomPhone, generateUUID } from '../utils/test-helpers';

export interface TestCustomer {
  id?: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  mobile?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  preferredContactMethod: 'email' | 'phone' | 'sms';
  riskLevel?: 'low' | 'medium' | 'high';
  creditLimit?: number;
  currentBalance?: number;
  createdAt?: Date;
}

/**
 * Base test customers
 */
export const testCustomers: Record<string, TestCustomer> = {
  lowRisk: {
    companyName: 'Acme Logistics Inc',
    contactName: 'John Smith',
    email: 'john@acmelogistics.com',
    phone: '+15551234567',
    mobile: '+15551234568',
    address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
    },
    preferredContactMethod: 'email',
    riskLevel: 'low',
    creditLimit: 100000,
    currentBalance: 5000,
  },
  
  mediumRisk: {
    companyName: 'FastShip Co',
    contactName: 'Jane Doe',
    email: 'jane@fastship.com',
    phone: '+15552345678',
    preferredContactMethod: 'phone',
    riskLevel: 'medium',
    creditLimit: 50000,
    currentBalance: 25000,
  },
  
  highRisk: {
    companyName: 'QuickMove LLC',
    contactName: 'Bob Johnson',
    email: 'bob@quickmove.com',
    phone: '+15553456789',
    mobile: '+15553456790',
    preferredContactMethod: 'sms',
    riskLevel: 'high',
    creditLimit: 20000,
    currentBalance: 18000,
  },
  
  overdue: {
    companyName: 'LatePayments Inc',
    contactName: 'Alice Brown',
    email: 'alice@latepayments.com',
    phone: '+15554567890',
    preferredContactMethod: 'email',
    riskLevel: 'high',
    creditLimit: 30000,
    currentBalance: 32000, // Over limit
  },
};

/**
 * Get test customer
 */
export function getTestCustomer(key: keyof typeof testCustomers): TestCustomer {
  return { ...testCustomers[key], id: generateUUID() };
}

/**
 * Get all test customers
 */
export function getAllTestCustomers(): TestCustomer[] {
  return Object.keys(testCustomers).map(key => 
    getTestCustomer(key as keyof typeof testCustomers)
  );
}

/**
 * Create test customer object
 */
export function createTestCustomer(overrides: Partial<TestCustomer> = {}): TestCustomer {
  return {
    id: generateUUID(),
    companyName: 'Test Company',
    contactName: 'Test Contact',
    email: randomEmail(),
    phone: randomPhone(),
    preferredContactMethod: 'email',
    riskLevel: 'low',
    creditLimit: 50000,
    currentBalance: 10000,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Create multiple test customers
 */
export function createTestCustomers(count: number): TestCustomer[] {
  const customers: TestCustomer[] = [];
  for (let i = 0; i < count; i++) {
    customers.push(createTestCustomer({
      companyName: `Test Company ${i + 1}`,
      contactName: `Test Contact ${i + 1}`,
    }));
  }
  return customers;
}
