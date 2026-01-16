-- Migration 008: Create Email Delivery Tracking Tables
-- Description: Email delivery status, bounces, and campaign analytics
-- Author: System
-- Date: 2026-01-15

-- Email delivery records
CREATE TABLE IF NOT EXISTS email_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(255) NOT NULL UNIQUE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    contact_attempt_id UUID,
    
    -- Email details
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    subject VARCHAR(500),
    template_id UUID,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL CHECK (status IN (
        'queued', 'sending', 'sent', 'delivered', 
        'opened', 'clicked', 'bounced', 'soft_bounce',
        'complained', 'unsubscribed', 'failed'
    )) DEFAULT 'queued',
    
    -- Timestamps
    queued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Metrics
    open_count INTEGER NOT NULL DEFAULT 0,
    click_count INTEGER NOT NULL DEFAULT 0,
    
    -- Error handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP,
    
    -- Metadata
    provider VARCHAR(50),
    provider_message_id VARCHAR(255),
    headers JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email bounces table
CREATE TABLE IF NOT EXISTS email_bounces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID REFERENCES email_deliveries(id) ON DELETE CASCADE,
    email_address VARCHAR(255) NOT NULL,
    bounce_type VARCHAR(50) NOT NULL CHECK (bounce_type IN ('hard', 'soft', 'complaint', 'unknown')),
    bounce_subtype VARCHAR(100),
    diagnostic_code VARCHAR(255),
    action_taken VARCHAR(50) CHECK (action_taken IN ('none', 'suppressed', 'unsubscribed')),
    raw_response JSONB,
    bounced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email suppression list (global)
CREATE TABLE IF NOT EXISTS email_suppressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_address VARCHAR(255) NOT NULL UNIQUE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('hard_bounce', 'complaint', 'unsubscribe', 'manual')),
    source VARCHAR(100),
    notes TEXT,
    suppressed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email links for click tracking
CREATE TABLE IF NOT EXISTS email_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES email_deliveries(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    tracking_url TEXT NOT NULL UNIQUE,
    link_position INTEGER,
    link_text VARCHAR(500),
    click_count INTEGER NOT NULL DEFAULT 0,
    first_clicked_at TIMESTAMP,
    last_clicked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email click events
CREATE TABLE IF NOT EXISTS email_click_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES email_deliveries(id) ON DELETE CASCADE,
    link_id UUID REFERENCES email_links(id) ON DELETE SET NULL,
    clicked_url TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    clicked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Email open events
CREATE TABLE IF NOT EXISTS email_open_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delivery_id UUID NOT NULL REFERENCES email_deliveries(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    opened_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Campaign email stats (aggregated)
CREATE TABLE IF NOT EXISTS campaign_email_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Volume metrics
    total_sent INTEGER NOT NULL DEFAULT 0,
    total_delivered INTEGER NOT NULL DEFAULT 0,
    total_bounced INTEGER NOT NULL DEFAULT 0,
    total_failed INTEGER NOT NULL DEFAULT 0,
    
    -- Engagement metrics
    total_opened INTEGER NOT NULL DEFAULT 0,
    unique_opens INTEGER NOT NULL DEFAULT 0,
    total_clicked INTEGER NOT NULL DEFAULT 0,
    unique_clicks INTEGER NOT NULL DEFAULT 0,
    
    -- Negative metrics
    total_complaints INTEGER NOT NULL DEFAULT 0,
    total_unsubscribes INTEGER NOT NULL DEFAULT 0,
    
    -- Calculated rates (stored for performance)
    delivery_rate NUMERIC(5,4),
    open_rate NUMERIC(5,4),
    click_rate NUMERIC(5,4),
    bounce_rate NUMERIC(5,4),
    
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    UNIQUE(campaign_id, date)
);

-- Indexes
CREATE INDEX idx_email_deliveries_message_id ON email_deliveries(message_id);
CREATE INDEX idx_email_deliveries_campaign_id ON email_deliveries(campaign_id);
CREATE INDEX idx_email_deliveries_customer_id ON email_deliveries(customer_id);
CREATE INDEX idx_email_deliveries_status ON email_deliveries(status);
CREATE INDEX idx_email_deliveries_to_address ON email_deliveries(to_address);
CREATE INDEX idx_email_deliveries_queued_at ON email_deliveries(queued_at);
CREATE INDEX idx_email_deliveries_next_retry ON email_deliveries(next_retry_at) 
    WHERE status IN ('failed', 'soft_bounce') AND retry_count < max_retries;

CREATE INDEX idx_email_bounces_email ON email_bounces(email_address);
CREATE INDEX idx_email_bounces_type ON email_bounces(bounce_type);
CREATE INDEX idx_email_bounces_delivery ON email_bounces(delivery_id);

CREATE INDEX idx_email_suppressions_email ON email_suppressions(email_address);
CREATE INDEX idx_email_suppressions_reason ON email_suppressions(reason);

CREATE INDEX idx_email_links_delivery ON email_links(delivery_id);
CREATE INDEX idx_email_links_tracking ON email_links(tracking_url);

CREATE INDEX idx_email_click_events_delivery ON email_click_events(delivery_id);
CREATE INDEX idx_email_click_events_clicked_at ON email_click_events(clicked_at);

CREATE INDEX idx_email_open_events_delivery ON email_open_events(delivery_id);
CREATE INDEX idx_email_open_events_opened_at ON email_open_events(opened_at);

CREATE INDEX idx_campaign_email_stats_campaign ON campaign_email_stats(campaign_id, date);

-- Triggers
CREATE TRIGGER update_email_deliveries_updated_at 
    BEFORE UPDATE ON email_deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_email_stats_updated_at 
    BEFORE UPDATE ON campaign_email_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if email is suppressed
CREATE OR REPLACE FUNCTION is_email_suppressed(p_email VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM email_suppressions
        WHERE email_address = LOWER(p_email)
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_email_stats(p_campaign_id UUID, p_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO campaign_email_stats (campaign_id, date, total_sent, total_delivered, total_bounced, total_failed, total_opened, unique_opens, total_clicked, unique_clicks, total_complaints, total_unsubscribes)
    SELECT 
        p_campaign_id,
        p_date,
        COUNT(*) FILTER (WHERE status != 'queued'),
        COUNT(*) FILTER (WHERE status = 'delivered' OR opened_at IS NOT NULL),
        COUNT(*) FILTER (WHERE status IN ('bounced', 'soft_bounce')),
        COUNT(*) FILTER (WHERE status = 'failed'),
        SUM(open_count),
        COUNT(*) FILTER (WHERE open_count > 0),
        SUM(click_count),
        COUNT(*) FILTER (WHERE click_count > 0),
        COUNT(*) FILTER (WHERE status = 'complained'),
        COUNT(*) FILTER (WHERE status = 'unsubscribed')
    FROM email_deliveries
    WHERE campaign_id = p_campaign_id
    AND DATE(queued_at) = p_date
    ON CONFLICT (campaign_id, date) DO UPDATE SET
        total_sent = EXCLUDED.total_sent,
        total_delivered = EXCLUDED.total_delivered,
        total_bounced = EXCLUDED.total_bounced,
        total_failed = EXCLUDED.total_failed,
        total_opened = EXCLUDED.total_opened,
        unique_opens = EXCLUDED.unique_opens,
        total_clicked = EXCLUDED.total_clicked,
        unique_clicks = EXCLUDED.unique_clicks,
        total_complaints = EXCLUDED.total_complaints,
        total_unsubscribes = EXCLUDED.total_unsubscribes,
        updated_at = NOW();
    
    -- Calculate rates
    UPDATE campaign_email_stats SET
        delivery_rate = CASE WHEN total_sent > 0 THEN total_delivered::NUMERIC / total_sent ELSE 0 END,
        open_rate = CASE WHEN total_delivered > 0 THEN unique_opens::NUMERIC / total_delivered ELSE 0 END,
        click_rate = CASE WHEN unique_opens > 0 THEN unique_clicks::NUMERIC / unique_opens ELSE 0 END,
        bounce_rate = CASE WHEN total_sent > 0 THEN total_bounced::NUMERIC / total_sent ELSE 0 END
    WHERE campaign_id = p_campaign_id AND date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE email_deliveries IS 'Tracks individual email delivery status and metrics';
COMMENT ON TABLE email_bounces IS 'Records email bounce events with diagnostic information';
COMMENT ON TABLE email_suppressions IS 'Global email suppression list for blocked addresses';
COMMENT ON TABLE email_links IS 'Tracked links within emails for click analytics';
COMMENT ON TABLE email_click_events IS 'Individual click events on tracked links';
COMMENT ON TABLE email_open_events IS 'Individual email open events';
COMMENT ON TABLE campaign_email_stats IS 'Aggregated daily email stats per campaign';
COMMENT ON FUNCTION is_email_suppressed IS 'Check if an email address is on the suppression list';
COMMENT ON FUNCTION update_campaign_email_stats IS 'Refresh aggregated campaign email statistics';

-- Rollback script
-- DROP FUNCTION IF EXISTS update_campaign_email_stats CASCADE;
-- DROP FUNCTION IF EXISTS is_email_suppressed CASCADE;
-- DROP TABLE IF EXISTS campaign_email_stats CASCADE;
-- DROP TABLE IF EXISTS email_open_events CASCADE;
-- DROP TABLE IF EXISTS email_click_events CASCADE;
-- DROP TABLE IF EXISTS email_links CASCADE;
-- DROP TABLE IF EXISTS email_suppressions CASCADE;
-- DROP TABLE IF EXISTS email_bounces CASCADE;
-- DROP TABLE IF EXISTS email_deliveries CASCADE;
