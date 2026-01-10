/**
 * Mock Factories
 * Factory functions to create mock objects for testing
 */

import { Customer, Payment, Task, Campaign } from '../../src/types';

export class MockFactory {
  static createCustomer(overrides?: Partial<Customer>): Customer {
    return {
      id: `cust_${Math.random().toString(36).substring(7)}`,
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      riskLevel: 'medium',
      totalDebt: 5000,
      daysOverdue: 30,
      paymentHistory: [],
      communicationHistory: [],
      preferences: {
        contactMethod: 'email',
        bestTimeToContact: '10:00-12:00',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createPayment(overrides?: Partial<Payment>): Payment {
    return {
      id: `pay_${Math.random().toString(36).substring(7)}`,
      customerId: `cust_${Math.random().toString(36).substring(7)}`,
      amount: 1000,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'overdue',
      daysOverdue: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createTask(overrides?: Partial<Task>): Task {
    return {
      id: `task_${Math.random().toString(36).substring(7)}`,
      customerId: `cust_${Math.random().toString(36).substring(7)}`,
      campaignId: `camp_${Math.random().toString(36).substring(7)}`,
      type: 'email',
      status: 'pending',
      priority: 5,
      scheduledFor: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createCampaign(overrides?: Partial<Campaign>): Campaign {
    return {
      id: `camp_${Math.random().toString(36).substring(7)}`,
      name: 'Test Campaign',
      type: 'standard',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      targetCustomers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static createMemoryEpisode(overrides?: any) {
    return {
      id: `episode_${Math.random().toString(36).substring(7)}`,
      customerId: `cust_${Math.random().toString(36).substring(7)}`,
      interaction: 'Customer agreed to payment plan',
      outcome: 'success',
      strategy: 'offer_payment_plan',
      timestamp: new Date(),
      metadata: {
        amountOwed: 5000,
        daysOverdue: 45,
        paymentPlanDuration: 60,
      },
      ...overrides,
    };
  }

  static createMemoryStrategy(overrides?: any) {
    return {
      id: `strategy_${Math.random().toString(36).substring(7)}`,
      name: 'Payment Plan for High-Risk Customers',
      description: 'Offer 2-month payment plans for customers 30-60 days overdue',
      conditions: {
        riskLevel: 'high',
        daysOverdueMin: 30,
        daysOverdueMax: 60,
      },
      successRate: 0.75,
      usageCount: 50,
      ...overrides,
    };
  }
}
