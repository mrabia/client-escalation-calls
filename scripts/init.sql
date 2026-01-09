-- Database Initialization Script
-- This script is automatically run by PostgreSQL container on first startup
-- Author: Manus AI
-- Date: 2026-01-09

-- Create database if it doesn't exist (this is handled by POSTGRES_DB env var in docker-compose)
-- But we'll ensure the extensions and basic setup

\echo 'Initializing Client Escalation Calls Database...'
\echo ''

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For JSONB indexing

\echo 'Extensions enabled.'
\echo ''
\echo 'Database initialization complete.'
\echo 'Run migrations from /database/migrations/ to create schema.'
