import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '@/utils/logger';
import { config } from '@/config';

export class DatabaseService {
  private pool: Pool;
  private isInitialized = false;

  constructor() {
    // Use config for database connection with pool settings from environment
    this.pool = new Pool({
      connectionString: config.database.url,
      max: config.database.poolMax,
      min: config.database.poolMin,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
    });
    
    logger.info('Database pool configured', {
      poolMin: config.database.poolMin,
      poolMax: config.database.poolMax,
      ssl: config.database.ssl
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Database pool error:', err);
    });

    this.pool.on('connect', () => {
      logger.debug('Database client connected');
    });

    this.pool.on('remove', () => {
      logger.debug('Database client removed');
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      // Create tables if they don't exist
      await this.createTables();

      this.isInitialized = true;
      logger.info('Database service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text.substring(0, 100),
        duration,
        rowCount: result.rowCount
      });

      return result;
    } catch (error) {
      logger.error('Database query failed:', {
        query: text,
        params,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    if (!this.isInitialized) {
      throw new Error('Database service not initialized');
    }

    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async createTables(): Promise<void> {
    const queries = [
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
      
      // Customers table
      `CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50),
        mobile VARCHAR(50),
        address JSONB,
        preferred_contact_method VARCHAR(20) DEFAULT 'email',
        profile JSONB DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Payment records table
      `CREATE TABLE IF NOT EXISTS payment_records (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        due_date DATE NOT NULL,
        paid_date DATE,
        status VARCHAR(20) DEFAULT 'pending',
        invoice_number VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Campaigns table
      `CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'draft',
        escalation_steps JSONB NOT NULL DEFAULT '[]',
        current_step INTEGER DEFAULT 0,
        start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date TIMESTAMP,
        paused_until TIMESTAMP,
        results JSONB DEFAULT '{}',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Agents table
      `CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'idle',
        capabilities TEXT[] DEFAULT '{}',
        current_tasks INTEGER DEFAULT 0,
        max_concurrent_tasks INTEGER DEFAULT 5,
        performance JSONB DEFAULT '{}',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type VARCHAR(50) NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        assigned_agent_id UUID REFERENCES agents(id),
        status VARCHAR(20) DEFAULT 'pending',
        context JSONB NOT NULL DEFAULT '{}',
        due_at TIMESTAMP,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )`,

      // Contact attempts table
      `CREATE TABLE IF NOT EXISTS contact_attempts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL REFERENCES agents(id),
        channel VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        response TEXT,
        duration INTEGER,
        metadata JSONB DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`,
      `CREATE INDEX IF NOT EXISTS idx_payment_records_customer_id ON payment_records(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_payment_records_due_date ON payment_records(due_date)`,
      `CREATE INDEX IF NOT EXISTS idx_campaigns_customer_id ON campaigns(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_campaign_id ON tasks(campaign_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_agent_id ON tasks(assigned_agent_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`,
      `CREATE INDEX IF NOT EXISTS idx_contact_attempts_task_id ON contact_attempts(task_id)`,
      
      // Update triggers
      `CREATE OR REPLACE FUNCTION update_updated_at_column()
       RETURNS TRIGGER AS $$
       BEGIN
         NEW.updated_at = CURRENT_TIMESTAMP;
         RETURN NEW;
       END;
       $$ language 'plpgsql'`,

      `DROP TRIGGER IF EXISTS update_customers_updated_at ON customers`,
      `CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

      `DROP TRIGGER IF EXISTS update_payment_records_updated_at ON payment_records`,
      `CREATE TRIGGER update_payment_records_updated_at BEFORE UPDATE ON payment_records
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

      `DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns`,
      `CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

      `DROP TRIGGER IF EXISTS update_agents_updated_at ON agents`,
      `CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`,

      `DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks`,
      `CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`
    ];

    for (const query of queries) {
      try {
        await this.pool.query(query);
      } catch (error) {
        logger.error('Failed to execute table creation query:', {
          query: query.substring(0, 100),
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }

    logger.info('Database tables created/verified successfully');
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database connection pool closed');
    }
  }
}
