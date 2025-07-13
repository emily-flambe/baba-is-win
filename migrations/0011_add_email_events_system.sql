-- Migration 0011: Add comprehensive email event logging system
-- This creates a complete audit trail for all email operations

-- Main email events table - captures every operation
CREATE TABLE IF NOT EXISTS email_events (
    id TEXT PRIMARY KEY,
    correlation_id TEXT NOT NULL,  -- Links related events
    event_type TEXT NOT NULL,      -- 'auth', 'send', 'template', 'user_lookup', 'api_request'
    event_category TEXT NOT NULL,  -- 'gmail_api', 'template_render', 'user_query', 'auth_token'
    event_name TEXT NOT NULL,      -- Specific event like 'token_refresh', 'send_email', 'render_template'
    
    -- Context information
    user_id TEXT,
    notification_id TEXT,
    content_id TEXT,
    content_type TEXT,             -- 'blog', 'thought'
    
    -- Status and error tracking
    status TEXT NOT NULL,          -- 'started', 'completed', 'failed', 'retrying'
    error_code TEXT,
    error_message TEXT,
    error_details TEXT,            -- JSON string with full error context
    stack_trace TEXT,
    
    -- Performance metrics
    started_at INTEGER NOT NULL,   -- Unix timestamp
    completed_at INTEGER,          -- Unix timestamp
    duration_ms INTEGER,
    
    -- Request/Response data (sanitized)
    request_data TEXT,             -- JSON string (sensitive data removed)
    response_data TEXT,            -- JSON string (sanitized)
    payload_size INTEGER,
    response_size INTEGER,
    
    -- Gmail specific fields
    gmail_message_id TEXT,
    access_token_prefix TEXT,      -- First 10 chars for debugging
    rate_limit_remaining INTEGER,
    quota_used INTEGER,
    
    -- Additional context
    environment TEXT DEFAULT 'production',
    worker_version TEXT,
    user_agent TEXT,
    ip_address TEXT,
    
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Optimized indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_events_correlation_id ON email_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_user_id ON email_events(user_id);
CREATE INDEX IF NOT EXISTS idx_email_events_notification_id ON email_events(notification_id);
CREATE INDEX IF NOT EXISTS idx_email_events_started_at ON email_events(started_at);
CREATE INDEX IF NOT EXISTS idx_email_events_error_code ON email_events(error_code);

-- Aggregate metrics table for dashboard performance
CREATE TABLE IF NOT EXISTS email_event_aggregates (
    id TEXT PRIMARY KEY,
    date_key TEXT NOT NULL,       -- YYYY-MM-DD format
    hour_key INTEGER NOT NULL,    -- Hour of day (0-23)
    
    -- Event counts by type
    total_events INTEGER DEFAULT 0,
    auth_events INTEGER DEFAULT 0,
    send_events INTEGER DEFAULT 0,
    template_events INTEGER DEFAULT 0,
    api_events INTEGER DEFAULT 0,
    
    -- Success/failure counts
    completed_events INTEGER DEFAULT 0,
    failed_events INTEGER DEFAULT 0,
    retrying_events INTEGER DEFAULT 0,
    
    -- Performance metrics
    avg_duration_ms INTEGER DEFAULT 0,
    max_duration_ms INTEGER DEFAULT 0,
    min_duration_ms INTEGER DEFAULT 0,
    
    -- Gmail specific metrics
    gmail_api_calls INTEGER DEFAULT 0,
    gmail_successes INTEGER DEFAULT 0,
    gmail_failures INTEGER DEFAULT 0,
    rate_limit_hits INTEGER DEFAULT 0,
    quota_exceeded_count INTEGER DEFAULT 0,
    
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_aggregates_date_hour ON email_event_aggregates(date_key, hour_key);

-- Debug sessions table for complex troubleshooting
CREATE TABLE IF NOT EXISTS email_debug_sessions (
    id TEXT PRIMARY KEY,
    session_name TEXT NOT NULL,
    description TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    
    -- Filter criteria used
    filter_criteria TEXT,         -- JSON string
    
    -- Results summary
    total_events_captured INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    
    -- Findings
    primary_issue TEXT,
    resolution TEXT,
    notes TEXT,
    
    created_by TEXT DEFAULT 'system',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Performance optimization: trigger to update aggregates
-- This will be handled in the application layer for better control