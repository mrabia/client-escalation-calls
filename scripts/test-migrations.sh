#!/bin/bash
# Migration Test Script
# Description: Tests database migrations and seed data
# Author: Manus AI
# Date: 2026-01-09

set -e

echo "======================================"
echo "Database Migration Test Script"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection parameters
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-client_escalation_calls}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"

# Export password for psql
export PGPASSWORD="$DB_PASSWORD"

echo "Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo ""

# Function to run SQL and check result
run_sql() {
    local description=$1
    local sql=$2
    
    echo -n "Testing: $description... "
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$sql" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        return 1
    fi
}

# Function to run SQL file
run_sql_file() {
    local description=$1
    local file=$2
    
    echo "Running: $description..."
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file"; then
        echo -e "${GREEN}✓ SUCCESS${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo ""
        return 1
    fi
}

# Check if database is accessible
echo "Step 1: Checking database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${RED}✗ Cannot connect to database${NC}"
    echo ""
    echo "Please ensure:"
    echo "  1. PostgreSQL is running"
    echo "  2. Database '$DB_NAME' exists"
    echo "  3. Connection parameters are correct"
    echo ""
    echo "To start with Docker:"
    echo "  docker-compose up -d postgres"
    echo ""
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Run migrations
echo "Step 2: Running migrations..."
cd "$(dirname "$0")/../database/migrations"

if run_sql_file "Migration 001: Core Tables" "001_create_core_tables.sql" && \
   run_sql_file "Migration 002: Campaigns and Tasks" "002_create_campaigns_and_tasks.sql" && \
   run_sql_file "Migration 003: Contact Attempts and Templates" "003_create_contact_attempts_and_templates.sql" && \
   run_sql_file "Migration 004: Audit and Compliance" "004_create_audit_and_compliance.sql" && \
   run_sql_file "Migration 005: System Metrics and Views" "005_create_system_metrics_and_views.sql"; then
    echo -e "${GREEN}✓ All migrations completed successfully${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    exit 1
fi
echo ""

# Verify tables exist
echo "Step 3: Verifying tables..."
run_sql "customers table" "SELECT COUNT(*) FROM customers;"
run_sql "customer_profiles table" "SELECT COUNT(*) FROM customer_profiles;"
run_sql "payment_records table" "SELECT COUNT(*) FROM payment_records;"
run_sql "agents table" "SELECT COUNT(*) FROM agents;"
run_sql "campaigns table" "SELECT COUNT(*) FROM campaigns;"
run_sql "tasks table" "SELECT COUNT(*) FROM tasks;"
run_sql "contact_attempts table" "SELECT COUNT(*) FROM contact_attempts;"
run_sql "templates table" "SELECT COUNT(*) FROM templates;"
run_sql "audit_logs table" "SELECT COUNT(*) FROM audit_logs;"
run_sql "opt_outs table" "SELECT COUNT(*) FROM opt_outs;"
run_sql "compliance_rules table" "SELECT COUNT(*) FROM compliance_rules;"
run_sql "system_metrics table" "SELECT COUNT(*) FROM system_metrics;"
echo ""

# Verify views exist
echo "Step 4: Verifying views..."
run_sql "v_active_campaigns view" "SELECT COUNT(*) FROM v_active_campaigns;"
run_sql "v_pending_tasks view" "SELECT COUNT(*) FROM v_pending_tasks;"
run_sql "v_agent_performance view" "SELECT COUNT(*) FROM v_agent_performance;"
run_sql "v_customer_communications view" "SELECT COUNT(*) FROM v_customer_communications;"
run_sql "v_overdue_payments view" "SELECT COUNT(*) FROM v_overdue_payments;"
run_sql "v_campaign_effectiveness view" "SELECT COUNT(*) FROM v_campaign_effectiveness;"
echo ""

# Verify functions exist
echo "Step 5: Verifying functions..."
run_sql "check_opt_out_status function" "SELECT check_opt_out_status('11111111-1111-1111-1111-111111111111'::uuid, 'email');"
run_sql "calculate_customer_risk_score function" "SELECT calculate_customer_risk_score('11111111-1111-1111-1111-111111111111'::uuid);"
echo ""

# Run seed data
echo "Step 6: Loading seed data..."
cd "$(dirname "$0")/../database/seeds"
if run_sql_file "Seed Data" "001_seed_test_data.sql"; then
    echo -e "${GREEN}✓ Seed data loaded successfully${NC}"
else
    echo -e "${RED}✗ Seed data loading failed${NC}"
    exit 1
fi
echo ""

# Verify seed data
echo "Step 7: Verifying seed data..."
run_sql "Customers seeded" "SELECT COUNT(*) FROM customers WHERE id::text LIKE '11111111%';"
run_sql "Agents seeded" "SELECT COUNT(*) FROM agents WHERE id::text LIKE 'e1111111%' OR id::text LIKE 'p1111111%' OR id::text LIKE 's1111111%';"
run_sql "Campaigns seeded" "SELECT COUNT(*) FROM campaigns WHERE id::text LIKE 'c1111111%';"
run_sql "Templates seeded" "SELECT COUNT(*) FROM templates WHERE name LIKE 'payment_reminder%';"
echo ""

# Run sample queries
echo "Step 8: Running sample queries..."
echo ""

echo "Active Campaigns:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT id, name, status, company_name FROM v_active_campaigns LIMIT 5;"
echo ""

echo "Pending Tasks:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT id, type, priority, status, company_name FROM v_pending_tasks LIMIT 5;"
echo ""

echo "Agent Performance:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT type, status, tasks_completed, success_rate_percentage FROM v_agent_performance;"
echo ""

echo "Overdue Payments:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT invoice_number, amount, days_overdue, company_name, risk_level FROM v_overdue_payments LIMIT 5;"
echo ""

echo "======================================"
echo -e "${GREEN}✓ All tests passed successfully!${NC}"
echo "======================================"
echo ""
echo "Database is ready for use."
echo ""
