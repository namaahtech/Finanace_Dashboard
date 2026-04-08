-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES ENUM
CREATE TYPE user_role AS ENUM ('super_admin', 'accounts', 'hr', 'lead', 'employee', 'sales');

-- 01. EMPLOYEES
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    employee_id TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'employee',
    department TEXT,
    designation TEXT,
    team_id UUID,
    joining_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 02. TEAMS
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    department TEXT NOT NULL,
    lead_id UUID REFERENCES employees(id),
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circular reference fix: Alter employees to reference teams
ALTER TABLE employees ADD CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(id);

-- 03. ATTENDANCE LOGS
CREATE TABLE attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIME,
    clock_out TIME,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'half_day')) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- 04. LEAVE REQUESTS
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('casual', 'sick', 'earned', 'unpaid')) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 05. KPI SCORES
CREATE TABLE kpi_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    kra_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    kpi_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    behavioral_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    final_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

-- 06. INCENTIVES
CREATE TABLE incentives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    fixed_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    variable_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('locked', 'claimable', 'held', 'claimed')) NOT NULL DEFAULT 'locked',
    vesting_start DATE NOT NULL,
    vesting_end DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 07. PAYROLL RUNS
CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    base_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
    incentive_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    deductions NUMERIC(15,2) NOT NULL DEFAULT 0,
    gross_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_pay NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('draft', 'processed', 'paid')) NOT NULL DEFAULT 'draft',
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, month, year)
);

-- 08. VENDORS
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    category TEXT NOT NULL,
    total_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 09. CLIENTS
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    total_revenue NUMERIC(15,2) NOT NULL DEFAULT 0,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. INVOICES
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id),
    vendor_id UUID REFERENCES vendors(id),
    amount NUMERIC(15,2) NOT NULL,
    tax NUMERIC(15,2) NOT NULL DEFAULT 0,
    total NUMERIC(15,2) NOT NULL,
    status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) NOT NULL DEFAULT 'draft',
    due_date DATE NOT NULL,
    type TEXT CHECK (type IN ('receivable', 'payable')) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. SUBSCRIPTIONS
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    team_id UUID REFERENCES teams(id),
    assigned_to UUID REFERENCES employees(id),
    cost_monthly NUMERIC(15,2) NOT NULL DEFAULT 0,
    renewal_date DATE NOT NULL,
    status TEXT CHECK (status IN ('active', 'inactive', 'expiring_soon')) NOT NULL DEFAULT 'active',
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. TEAM BUDGETS
CREATE TABLE team_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    budget_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    spent_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    status TEXT CHECK (status IN ('on_track', 'warning', 'over_budget')) NOT NULL DEFAULT 'on_track',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, month, year)
);

-- 13. LEADS (CRM)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    source TEXT,
    stage TEXT CHECK (stage IN ('new', 'contacted', 'proposal', 'negotiation', 'won', 'lost')) NOT NULL DEFAULT 'new',
    deal_value NUMERIC(15,2) NOT NULL DEFAULT 0,
    assigned_to UUID REFERENCES employees(id),
    follow_up_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. MESSAGES & CHANNELS
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    type TEXT CHECK (type IN ('direct', 'group')) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE channel_members (
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (channel_id, employee_id)
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES employees(id),
    recipient_id UUID REFERENCES employees(id),
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. MEETINGS
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    meet_link TEXT,
    organizer_id UUID NOT NULL REFERENCES employees(id),
    status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled')) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meeting_attendees (
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) NOT NULL DEFAULT 'pending',
    PRIMARY KEY (meeting_id, employee_id)
);

-- 16. SYSTEM CONFIG
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revenue NUMERIC(20,2) NOT NULL DEFAULT 0,
    profit_percentage INTEGER NOT NULL DEFAULT 85,
    expense_percentage INTEGER NOT NULL DEFAULT 15,
    company_stage TEXT NOT NULL DEFAULT 'Early Growth',
    vesting_days INTEGER NOT NULL DEFAULT 30,
    bonus_percentage_1m INTEGER NOT NULL DEFAULT 5,
    bonus_percentage_2m INTEGER NOT NULL DEFAULT 10,
    claim_limit INTEGER NOT NULL DEFAULT 25,
    payout_pool_amount NUMERIC(20,2) NOT NULL DEFAULT 0,
    payout_capacity TEXT CHECK (payout_capacity IN ('HIGH', 'MODERATE', 'LOW')) NOT NULL DEFAULT 'HIGH',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL REFERENCES employees(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- REIMBURSEMENTS (missed in initial list but in PLAN.md)
CREATE TABLE reimbursements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    receipt_url TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'paid')) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. PAYOUT CLAIMS
CREATE TABLE payout_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    incentive_id UUID NOT NULL REFERENCES incentives(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'queued', 'paid', 'rejected')) NOT NULL DEFAULT 'pending',
    cycle INTEGER NOT NULL,
    queue_position INTEGER,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES employees(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRIORITY REQUESTS
CREATE TABLE priority_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    incentive_id UUID NOT NULL REFERENCES incentives(id) ON DELETE CASCADE,
    amount NUMERIC(15,2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    reject_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. WALLETS (Fiscal Aggregates)
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    earned_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    locked_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    claimable_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    held_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    claimed_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. WALLET TRANSACTIONS
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g., 'incentive_earned', 'incentive_vested', 'incentive_claimed'
    amount NUMERIC(15,2) NOT NULL,
    balance_after NUMERIC(15,2) NOT NULL,
    reference_id UUID, -- Can be Incentive ID, Payout ID, etc.
    reference_model TEXT,
    description TEXT,
    meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Set up timestamps trigger for wallets
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Circular reference fix: Alter employees to reference teams
ALTER TABLE employees ADD CONSTRAINT fk_team FOREIGN KEY (team_id) REFERENCES teams(id);

-- Set up timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
