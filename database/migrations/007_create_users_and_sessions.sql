-- Migration 007: Create Users and Sessions Tables
-- Description: User authentication, sessions, and access control
-- Author: System
-- Date: 2026-01-15

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'agent', 'viewer', 'api')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    preferences JSONB DEFAULT '{"timezone": "UTC", "notifications": {"email": true, "inApp": true}}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- API keys for service-to-service auth
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(10) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    rate_limit_per_minute INTEGER DEFAULT 1000,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    conditions JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(role, resource, action)
);

-- Insert default role permissions
INSERT INTO role_permissions (role, resource, action) VALUES
    -- Admin has full access
    ('admin', '*', '*'),
    
    -- Manager permissions
    ('manager', 'campaigns', 'create'),
    ('manager', 'campaigns', 'read'),
    ('manager', 'campaigns', 'update'),
    ('manager', 'campaigns', 'delete'),
    ('manager', 'tasks', 'create'),
    ('manager', 'tasks', 'read'),
    ('manager', 'tasks', 'update'),
    ('manager', 'tasks', 'assign'),
    ('manager', 'customers', 'read'),
    ('manager', 'customers', 'update'),
    ('manager', 'reports', 'read'),
    ('manager', 'agents', 'read'),
    ('manager', 'agents', 'configure'),
    
    -- Agent permissions
    ('agent', 'tasks', 'read'),
    ('agent', 'tasks', 'update'),
    ('agent', 'customers', 'read'),
    ('agent', 'contact_attempts', 'create'),
    ('agent', 'contact_attempts', 'read'),
    ('agent', 'templates', 'read'),
    
    -- Viewer permissions (read-only)
    ('viewer', 'campaigns', 'read'),
    ('viewer', 'tasks', 'read'),
    ('viewer', 'customers', 'read'),
    ('viewer', 'reports', 'read'),
    
    -- API service permissions
    ('api', 'campaigns', 'read'),
    ('api', 'tasks', 'read'),
    ('api', 'tasks', 'update'),
    ('api', 'customers', 'read'),
    ('api', 'webhooks', 'receive')
ON CONFLICT (role, resource, action) DO NOTHING;

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- Triggers
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
    UPDATE user_sessions 
    SET is_active = FALSE, revoked_at = NOW()
    WHERE expires_at < NOW() AND is_active = TRUE;
    
    DELETE FROM password_reset_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_permission(
    p_user_role VARCHAR,
    p_resource VARCHAR,
    p_action VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role = p_user_role
        AND (resource = '*' OR resource = p_resource)
        AND (action = '*' OR action = p_action)
    );
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE users IS 'System users for authentication and authorization';
COMMENT ON TABLE user_sessions IS 'Active user sessions with JWT tokens';
COMMENT ON TABLE password_reset_tokens IS 'Temporary tokens for password reset flow';
COMMENT ON TABLE api_keys IS 'API keys for programmatic access';
COMMENT ON TABLE role_permissions IS 'Role-based access control permissions';
COMMENT ON FUNCTION clean_expired_sessions IS 'Cleanup function for expired sessions';
COMMENT ON FUNCTION check_permission IS 'Check if a role has permission for resource/action';

-- Rollback script
-- DROP FUNCTION IF EXISTS check_permission CASCADE;
-- DROP FUNCTION IF EXISTS clean_expired_sessions CASCADE;
-- DROP TABLE IF EXISTS role_permissions CASCADE;
-- DROP TABLE IF EXISTS api_keys CASCADE;
-- DROP TABLE IF EXISTS password_reset_tokens CASCADE;
-- DROP TABLE IF EXISTS user_sessions CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
