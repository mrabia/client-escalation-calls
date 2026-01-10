-- Migration 001: Create Core Tables
-- Description: Creates customers, customer_profiles, payment_records, and agents tables
-- Author: Manus AI
-- Date: 2026-01-09

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    mobile VARCHAR(50),
    address JSONB,
    preferred_contact_method VARCHAR(20) CHECK (preferred_contact_method IN ('email', 'phone', 'sms')),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Create customer_profiles table
CREATE TABLE IF NOT EXISTS customer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    risk_score NUMERIC(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
    average_payment_delay INTEGER DEFAULT 0,
    response_rate NUMERIC(3,2) CHECK (response_rate >= 0 AND response_rate <= 1),
    preferred_contact_time_start TIME,
    preferred_contact_time_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    communication_style VARCHAR(20) CHECK (communication_style IN ('formal', 'casual', 'direct', 'diplomatic')),
    do_not_contact BOOLEAN DEFAULT FALSE,
    contact_restrictions TEXT[] DEFAULT '{}',
    notes TEXT[] DEFAULT '{}',
    last_contact_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(customer_id)
);

-- Create payment_records table
CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    due_date DATE NOT NULL,
    paid_date DATE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'overdue', 'paid', 'partial', 'cancelled')),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'phone', 'sms', 'research')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('idle', 'active', 'busy', 'error', 'offline')),
    capabilities TEXT[] NOT NULL,
    current_task_count INTEGER DEFAULT 0 CHECK (current_task_count >= 0),
    max_concurrent_tasks INTEGER NOT NULL DEFAULT 5 CHECK (max_concurrent_tasks > 0),
    working_hours_start TIME,
    working_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    config JSONB DEFAULT '{}',
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP
);

-- Create indexes for customers
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_company_name ON customers(company_name);
CREATE INDEX idx_customers_deleted_at ON customers(deleted_at) WHERE deleted_at IS NULL;

-- Create indexes for customer_profiles
CREATE INDEX idx_customer_profiles_customer_id ON customer_profiles(customer_id);
CREATE INDEX idx_customer_profiles_risk_level ON customer_profiles(risk_level);

-- Create indexes for payment_records
CREATE INDEX idx_payment_records_customer_id ON payment_records(customer_id);
CREATE INDEX idx_payment_records_status ON payment_records(status);
CREATE INDEX idx_payment_records_due_date ON payment_records(due_date);
CREATE INDEX idx_payment_records_invoice_number ON payment_records(invoice_number);

-- Create indexes for agents
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type_status ON agents(type, status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_profiles_updated_at 
    BEFORE UPDATE ON customer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_records_updated_at 
    BEFORE UPDATE ON payment_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE customers IS 'Stores customer and company information';
COMMENT ON TABLE customer_profiles IS 'Stores behavioral analysis and risk assessment for customers';
COMMENT ON TABLE payment_records IS 'Stores invoice and payment information';
COMMENT ON TABLE agents IS 'Stores agent registration and configuration';
