-- DaiLi Pay Database Schema
-- PostgreSQL Database Schema for v1.1

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Stores all system users (agents, admins, super admins)
-- Contributors are NOT stored here (they're in contributors table)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('agent', 'operations_admin', 'super_admin')),
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    device_id VARCHAR(255), -- For agent device tracking
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_device_id ON users(device_id);

-- ============================================
-- CONTRIBUTORS TABLE
-- ============================================
-- Stores contributor profiles (informal workers)
CREATE TABLE contributors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    id_photograph_url TEXT, -- URL to stored ID photo
    qr_hash VARCHAR(255) UNIQUE NOT NULL, -- Physical QR card hash
    qr_issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    onboarded_by_agent_id UUID REFERENCES users(id),
    onboarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contributors_phone ON contributors(phone_number);
CREATE INDEX idx_contributors_qr_hash ON contributors(qr_hash);
CREATE INDEX idx_contributors_agent ON contributors(onboarded_by_agent_id);

-- ============================================
-- LEDGER EVENTS TABLE (IMMUTABLE)
-- ============================================
-- All financial transactions are recorded here
-- This is the single source of truth for balances
-- Records are IMMUTABLE - no updates allowed, only inserts
CREATE TABLE ledger_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('DEPOSIT', 'WITHDRAWAL', 'REVERSAL', 'RECONCILIATION')),
    contributor_id UUID NOT NULL REFERENCES contributors(id),
    agent_id UUID REFERENCES users(id), -- Agent who processed the transaction
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    reference_id VARCHAR(255) UNIQUE NOT NULL, -- Unique transaction reference
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    gps_accuracy DECIMAL(10, 2),
    device_id VARCHAR(255), -- Device that created the transaction
    synced BOOLEAN DEFAULT false, -- For offline transactions
    synced_at TIMESTAMP,
    metadata JSONB, -- Additional transaction metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES users(id) -- User who created the record
);

CREATE INDEX idx_ledger_contributor ON ledger_events(contributor_id);
CREATE INDEX idx_ledger_agent ON ledger_events(agent_id);
CREATE INDEX idx_ledger_reference ON ledger_events(reference_id);
CREATE INDEX idx_ledger_synced ON ledger_events(synced);
CREATE INDEX idx_ledger_created_at ON ledger_events(created_at);
CREATE INDEX idx_ledger_event_type ON ledger_events(event_type);

-- Prevent updates to ledger_events (immutability)
CREATE OR REPLACE FUNCTION prevent_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger events are immutable. Use reversal + re-entry for corrections.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_ledger_update_trigger
    BEFORE UPDATE ON ledger_events
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ledger_update();

-- ============================================
-- WITHDRAWALS TABLE
-- ============================================
-- Tracks withdrawal requests through state machine
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contributor_id UUID NOT NULL REFERENCES contributors(id),
    agent_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    state VARCHAR(50) NOT NULL DEFAULT 'REQUESTED' CHECK (state IN ('REQUESTED', 'OTP_VERIFIED', 'PENDING_ADMIN', 'APPROVED', 'EXECUTED', 'REJECTED')),
    otp_code VARCHAR(10), -- OTP sent to contributor
    otp_verified_at TIMESTAMP,
    otp_expires_at TIMESTAMP,
    ledger_event_id UUID REFERENCES ledger_events(id), -- Link to ledger when executed
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id), -- Admin who approved
    approved_at TIMESTAMP,
    rejected_by UUID REFERENCES users(id), -- Admin who rejected
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdrawals_contributor ON withdrawals(contributor_id);
CREATE INDEX idx_withdrawals_agent ON withdrawals(agent_id);
CREATE INDEX idx_withdrawals_state ON withdrawals(state);
CREATE INDEX idx_withdrawals_otp ON withdrawals(otp_code);

-- ============================================
-- AGENT RECONCILIATION TABLE
-- ============================================
-- Tracks agent reconciliation sessions
CREATE TABLE agent_reconciliations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES users(id),
    unreconciled_balance_before DECIMAL(15, 2) NOT NULL,
    cash_amount_presented DECIMAL(15, 2) NOT NULL,
    reconciled_amount DECIMAL(15, 2) NOT NULL,
    discrepancy DECIMAL(15, 2), -- Difference between expected and actual
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reconciled_by UUID REFERENCES users(id), -- Admin who reconciled
    reconciled_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reconciliations_agent ON agent_reconciliations(agent_id);
CREATE INDEX idx_reconciliations_status ON agent_reconciliations(status);
CREATE INDEX idx_reconciliations_created_at ON agent_reconciliations(created_at);

-- ============================================
-- AGENT UNRECONCILED BALANCE VIEW
-- ============================================
-- Calculates current unreconciled balance per agent
-- This is used for circuit breaker enforcement
CREATE OR REPLACE VIEW agent_unreconciled_balance AS
SELECT 
    agent_id,
    COALESCE(SUM(
        CASE 
            WHEN event_type = 'DEPOSIT' THEN amount
            WHEN event_type = 'WITHDRAWAL' THEN -amount
            WHEN event_type = 'REVERSAL' THEN -amount
            ELSE 0
        END
    ), 0) as unreconciled_balance
FROM ledger_events
WHERE agent_id IS NOT NULL
    AND synced = true
    AND event_type != 'RECONCILIATION'
    AND id NOT IN (
        -- Exclude transactions that have been reconciled
        SELECT DISTINCT le.id
        FROM ledger_events le
        INNER JOIN agent_reconciliations ar ON ar.agent_id = le.agent_id
        WHERE le.created_at <= ar.reconciled_at
            AND ar.status = 'APPROVED'
    )
GROUP BY agent_id;

-- ============================================
-- CONTRIBUTOR BALANCE VIEW
-- ============================================
-- Calculates current balance per contributor
-- Balances are DERIVED, not stored
CREATE OR REPLACE VIEW contributor_balance AS
SELECT 
    contributor_id,
    COALESCE(SUM(
        CASE 
            WHEN event_type = 'DEPOSIT' THEN amount
            WHEN event_type = 'WITHDRAWAL' THEN -amount
            WHEN event_type = 'REVERSAL' THEN -amount
            ELSE 0
        END
    ), 0) as balance
FROM ledger_events
WHERE synced = true
    AND event_type IN ('DEPOSIT', 'WITHDRAWAL', 'REVERSAL')
GROUP BY contributor_id;

-- ============================================
-- OTP RECORDS TABLE
-- ============================================
-- Stores OTP codes for withdrawals
CREATE TABLE otp_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contributor_id UUID NOT NULL REFERENCES contributors(id),
    withdrawal_id UUID REFERENCES withdrawals(id),
    otp_code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('WITHDRAWAL', 'BALANCE_CHECK')),
    expires_at TIMESTAMP NOT NULL,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_otp_contributor ON otp_records(contributor_id);
CREATE INDEX idx_otp_code ON otp_records(otp_code);
CREATE INDEX idx_otp_expires ON otp_records(expires_at);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
-- Immutable audit trail for all system actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES users(id), -- User who performed the action
    actor_role VARCHAR(50), -- Role at time of action
    action_type VARCHAR(100) NOT NULL, -- e.g., 'USER_LOGIN', 'DEPOSIT_CREATED', 'WITHDRAWAL_APPROVED'
    resource_type VARCHAR(100), -- e.g., 'CONTRIBUTOR', 'TRANSACTION', 'WITHDRAWAL'
    resource_id UUID, -- ID of the affected resource
    ip_address INET,
    user_agent TEXT,
    device_id VARCHAR(255),
    request_path TEXT,
    request_method VARCHAR(10),
    request_body JSONB,
    response_status INT,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action_type);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- Prevent updates to audit_logs (immutability)
CREATE OR REPLACE FUNCTION prevent_audit_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_audit_update_trigger
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_audit_update();

-- ============================================
-- TRANSACTION SYNC QUEUE TABLE
-- ============================================
-- For offline transactions waiting to sync
CREATE TABLE sync_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_event_id UUID NOT NULL REFERENCES ledger_events(id),
    agent_id UUID NOT NULL REFERENCES users(id),
    device_id VARCHAR(255),
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 10,
    last_retry_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCING', 'SYNCED', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_queue_agent ON sync_queue(agent_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_ledger_event ON sync_queue(ledger_event_id);

-- ============================================
-- SYSTEM SETTINGS TABLE
-- ============================================
-- Stores system-wide configuration
CREATE TABLE system_settings (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description) VALUES
    ('CIRCUIT_BREAKER_LIMIT', '10000', 'Maximum unreconciled balance for agents (in kobo)'),
    ('OTP_EXPIRY_MINUTES', '10', 'OTP expiration time in minutes'),
    ('OTP_LENGTH', '6', 'OTP code length'),
    ('GPS_REQUIRED', 'true', 'Whether GPS is required for deposits'),
    ('SYNC_RETRY_INTERVAL_MINUTES', '15', 'Background sync retry interval in minutes'),
    ('MAX_OFFLINE_HOURS', '72', 'Maximum hours agents can operate offline');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get contributor balance
CREATE OR REPLACE FUNCTION get_contributor_balance(p_contributor_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    v_balance DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(balance, 0) INTO v_balance
    FROM contributor_balance
    WHERE contributor_id = p_contributor_id;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to get agent unreconciled balance
CREATE OR REPLACE FUNCTION get_agent_unreconciled_balance(p_agent_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    v_balance DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(unreconciled_balance, 0) INTO v_balance
    FROM agent_unreconciled_balance
    WHERE agent_id = p_agent_id;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if agent is locked (circuit breaker)
CREATE OR REPLACE FUNCTION is_agent_locked(p_agent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_balance DECIMAL(15, 2);
    v_limit DECIMAL(15, 2);
BEGIN
    v_balance := get_agent_unreconciled_balance(p_agent_id);
    
    SELECT CAST(value AS DECIMAL(15, 2)) INTO v_limit
    FROM system_settings
    WHERE key = 'CIRCUIT_BREAKER_LIMIT';
    
    RETURN v_balance >= COALESCE(v_limit, 10000);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributors_updated_at BEFORE UPDATE ON contributors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reconciliations_updated_at BEFORE UPDATE ON agent_reconciliations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_queue_updated_at BEFORE UPDATE ON sync_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
