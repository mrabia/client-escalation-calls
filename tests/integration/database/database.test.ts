/**
 * Database Integration Tests
 * 
 * Tests database connectivity, migrations, and basic CRUD operations
 */

import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
  query,
  withTransaction,
  getClient,
} from '@tests/utils/test-db';
import { createTestCustomer } from '@tests/fixtures/customers';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('Database Connectivity', () => {
    it('should connect to database successfully', async () => {
      const result = await query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });

    it('should execute queries with parameters', async () => {
      const result = await query('SELECT $1::text as value', ['test']);
      expect(result.rows[0].value).toBe('test');
    });

    it('should handle connection pool', async () => {
      const client = await getClient();
      expect(client).toBeDefined();
      client.release();
    });
  });

  describe('Migrations', () => {
    it('should have users table', async () => {
      const result = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'users'
      `);
      expect(result.rows.length).toBe(1);
    });

    it('should have customers table', async () => {
      const result = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'customers'
      `);
      expect(result.rows.length).toBe(1);
    });

    it('should have campaigns table', async () => {
      const result = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'campaigns'
      `);
      expect(result.rows.length).toBe(1);
    });

    it('should have contact_attempts table', async () => {
      const result = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'contact_attempts'
      `);
      expect(result.rows.length).toBe(1);
    });

    it('should have audit_logs table', async () => {
      const result = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      `);
      expect(result.rows.length).toBe(1);
    });
  });

  describe('CRUD Operations', () => {
    it('should insert customer record', async () => {
      const customer = createTestCustomer();
      
      const result = await query(
        `INSERT INTO customers (id, company_name, contact_name, email, phone, preferred_contact_method)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [customer.id, customer.companyName, customer.contactName, customer.email, customer.phone, customer.preferredContactMethod]
      );

      expect(result.rows[0].company_name).toBe(customer.companyName);
      expect(result.rows[0].email).toBe(customer.email);
    });

    it('should read customer record', async () => {
      const customer = createTestCustomer();
      
      await query(
        `INSERT INTO customers (id, company_name, contact_name, email, phone, preferred_contact_method)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [customer.id, customer.companyName, customer.contactName, customer.email, customer.phone, customer.preferredContactMethod]
      );

      const result = await query('SELECT * FROM customers WHERE id = $1', [customer.id]);
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe(customer.email);
    });

    it('should update customer record', async () => {
      const customer = createTestCustomer();
      
      await query(
        `INSERT INTO customers (id, company_name, contact_name, email, phone, preferred_contact_method)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [customer.id, customer.companyName, customer.contactName, customer.email, customer.phone, customer.preferredContactMethod]
      );

      await query(
        'UPDATE customers SET contact_name = $1 WHERE id = $2',
        ['Updated Name', customer.id]
      );

      const result = await query('SELECT * FROM customers WHERE id = $1', [customer.id]);
      expect(result.rows[0].contact_name).toBe('Updated Name');
    });

    it('should delete customer record', async () => {
      const customer = createTestCustomer();
      
      await query(
        `INSERT INTO customers (id, company_name, contact_name, email, phone, preferred_contact_method)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [customer.id, customer.companyName, customer.contactName, customer.email, customer.phone, customer.preferredContactMethod]
      );

      await query('DELETE FROM customers WHERE id = $1', [customer.id]);

      const result = await query('SELECT * FROM customers WHERE id = $1', [customer.id]);
      expect(result.rows.length).toBe(0);
    });
  });

  describe('Transactions', () => {
    it('should commit transaction on success', async () => {
      const customer = createTestCustomer();

      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO customers (id, company_name, contact_name, email, phone, preferred_contact_method)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [customer.id, customer.companyName, customer.contactName, customer.email, customer.phone, customer.preferredContactMethod]
        );
      });

      const result = await query('SELECT * FROM customers WHERE id = $1', [customer.id]);
      expect(result.rows.length).toBe(1);
    });

    it('should rollback transaction on error', async () => {
      const customer = createTestCustomer();

      try {
        await withTransaction(async (client) => {
          await client.query(
            `INSERT INTO customers (id, company_name, contact_name, email, phone, preferred_contact_method)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [customer.id, customer.companyName, customer.contactName, customer.email, customer.phone, customer.preferredContactMethod]
          );
          
          // Force error
          throw new Error('Rollback test');
        });
      } catch (error) {
        // Expected
      }

      const result = await query('SELECT * FROM customers WHERE id = $1', [customer.id]);
      expect(result.rows.length).toBe(0);
    });
  });

  describe('Constraints', () => {
    it('should enforce unique email constraint', async () => {
      const customer = createTestCustomer();
      
      await query(
        `INSERT INTO customers (id, company_name, contact_name, email, phone, preferred_contact_method)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [customer.id, customer.companyName, customer.contactName, customer.email, customer.phone, customer.preferredContactMethod]
      );

      await expect(
        query(
          `INSERT INTO customers (id, company_name, contact_name, email, phone, preferred_contact_method)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [customer.id + '-2', customer.companyName, customer.contactName, customer.email, customer.phone, customer.preferredContactMethod]
        )
      ).rejects.toThrow();
    });

    it('should enforce foreign key constraints', async () => {
      // Try to insert campaign with non-existent customer
      await expect(
        query(
          `INSERT INTO campaigns (id, customer_id, name, status)
           VALUES ($1, $2, $3, $4)`,
          ['campaign-1', 'non-existent-customer', 'Test Campaign', 'active']
        )
      ).rejects.toThrow();
    });
  });
});
