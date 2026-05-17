-- ============================================================================
-- SALARY CONFIGURATION SCHEMA FOR EZBILLIFY WORKSPACE
-- ============================================================================
-- This schema enables role-based salary structures with performance linkage
-- Supports: Base salary, Commission slabs, KPI/KRA/Behavioral scoring

-- 1. SALARY STRUCTURES (Admin-defined templates)
CREATE TABLE salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL, -- "Sales Role", "Engineer Role"
  role_type TEXT NOT NULL, -- 'SALES', 'EMPLOYEE', 'ADMIN', 'MANAGER'
  salary_type TEXT NOT NULL DEFAULT 'FIXED_MONTHLY', -- 'FIXED_MONTHLY', 'HOURLY_PAY', 'DAILY_PAY', 'STIPEND'
  base_salary_amount NUMERIC NOT NULL, -- Base salary in rupees
  base_salary_percent INT DEFAULT 50, -- Min 50% of gross (legal requirement)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, role_type),
  CHECK (base_salary_percent >= 50 AND base_salary_percent <= 100)
);

-- 2. COMMISSION SLABS (Tiered commission for sales roles)
CREATE TABLE commission_slabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
  slab_name TEXT NOT NULL, -- "Tier 1", "Tier 2"
  min_target_percent INT NOT NULL, -- e.g., 50 (50% of target)
  max_target_percent INT NOT NULL, -- e.g., 100 (100% of target)
  commission_percent NUMERIC NOT NULL, -- e.g., 5.0 (5% commission)
  commission_amount NUMERIC, -- Fixed amount alternative (if not percentage)
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK (min_target_percent <= max_target_percent),
  CHECK (commission_percent > 0 OR commission_amount > 0)
);

-- 3. SALARY COMPONENTS (Allowances, benefits)
CREATE TABLE salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
  component_name TEXT NOT NULL, -- "Travel Allowance", "Mobile Allowance", "HRA"
  component_type TEXT NOT NULL, -- 'ALLOWANCE', 'DEDUCTION', 'BENEFIT'
  amount NUMERIC, -- Fixed amount
  percent NUMERIC, -- Percentage of base
  is_optional BOOLEAN DEFAULT FALSE, -- Admin can toggle
  created_at TIMESTAMP DEFAULT NOW(),
  CHECK ((amount > 0 OR percent > 0) AND NOT (amount > 0 AND percent > 0))
);

-- 4. PERFORMANCE LINKAGE SETTINGS (KPI/KRA/Behavioral weights)
CREATE TABLE performance_linkage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id) ON DELETE CASCADE,
  kpi_weight INT NOT NULL DEFAULT 40, -- 0-100 %
  kra_weight INT NOT NULL DEFAULT 40, -- 0-100 %
  behavioral_weight INT NOT NULL DEFAULT 20, -- 0-100 %
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (kpi_weight + kra_weight + behavioral_weight = 100)
);

-- 5. EMPLOYEE SALARY PROFILES (Applied to actual employees)
CREATE TABLE employee_salary_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  salary_structure_id UUID NOT NULL REFERENCES salary_structures(id),
  access_level TEXT NOT NULL, -- 'EMPLOYEE', 'ADMIN', 'MANAGER', 'DEPARTMENT_LEAD'
  employment_type TEXT NOT NULL, -- 'FULL_TIME', 'PART_TIME', 'INTERNSHIP'
  leave_entitlement TEXT NOT NULL DEFAULT '1 Day / Month', -- Annual leave policy
  monthly_base_salary NUMERIC NOT NULL, -- Base salary (must be ≥ 50% of gross)
  monthly_sales_target NUMERIC, -- For sales roles
  commencement_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id, user_id)
);

-- 6. MONTHLY SALARY COMPUTATION (Calculated salary for each month)
CREATE TABLE monthly_salary_computation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_salary_profile_id UUID NOT NULL REFERENCES employee_salary_profiles(id),
  month DATE NOT NULL, -- First day of month (e.g., 2026-05-01)
  base_salary NUMERIC NOT NULL, -- Fixed base
  commission_earned NUMERIC DEFAULT 0, -- From commission slabs based on achievement
  bonus_earned NUMERIC DEFAULT 0, -- Performance bonus
  allowances_total NUMERIC DEFAULT 0, -- HRA + Travel + Mobile etc.
  gross_salary NUMERIC NOT NULL, -- base + commission + bonus + allowances
  pf_employee_deduction NUMERIC DEFAULT 0, -- 12% of base
  pf_employer_contribution NUMERIC DEFAULT 0, -- 12% of base (company pays)
  tds_deduction NUMERIC DEFAULT 0, -- Income tax
  esi_deduction NUMERIC DEFAULT 0, -- Health insurance
  net_salary NUMERIC NOT NULL, -- gross - deductions
  kpi_score NUMERIC DEFAULT NULL, -- 0-100
  kra_score NUMERIC DEFAULT NULL, -- 0-100
  behavioral_score NUMERIC DEFAULT NULL, -- 0-100
  performance_bonus_percent NUMERIC DEFAULT 0, -- Calculated from scores
  final_gross_salary NUMERIC NOT NULL, -- After performance adjustment
  payslip_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_salary_profile_id, month)
);

-- 7. EMPLOYEE PROJECTS/WORK SUBMISSION (Links to workspace projects)
CREATE TABLE employee_project_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_salary_profile_id UUID NOT NULL REFERENCES employee_salary_profiles(id),
  project_id UUID, -- Links to workspace projects
  project_name TEXT NOT NULL,
  submission_date DATE NOT NULL,
  target_value NUMERIC, -- Target for sales roles
  actual_achievement NUMERIC, -- Actual sales/output
  achievement_percent NUMERIC, -- (actual / target) * 100
  kpi_metric_1 TEXT, -- Custom KPI metric
  kpi_metric_2 TEXT,
  kpi_metric_3 TEXT,
  kra_metric_1 TEXT, -- Custom KRA metric
  kra_metric_2 TEXT,
  behavioral_note TEXT, -- Behavioral assessment
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. STATUTORY DEDUCTIONS REFERENCE (For calculations)
CREATE TABLE statutory_deductions_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  pf_employee_percent NUMERIC DEFAULT 12.0, -- Employee contribution
  pf_employer_percent NUMERIC DEFAULT 12.0, -- Employer contribution (12% of basic)
  esi_employee_percent NUMERIC DEFAULT 0.75, -- If salary < 21000
  esi_employer_percent NUMERIC DEFAULT 3.25,
  esi_threshold NUMERIC DEFAULT 21000, -- Salary limit for ESI
  tds_enabled BOOLEAN DEFAULT TRUE,
  annual_income_threshold NUMERIC DEFAULT 250000, -- Below this, no TDS
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(business_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_salary_structures_business_role ON salary_structures(business_id, role_type);
CREATE INDEX idx_employee_salary_profiles_business_user ON employee_salary_profiles(business_id, user_id);
CREATE INDEX idx_monthly_salary_month ON monthly_salary_computation(month);
CREATE INDEX idx_employee_projects_employee ON employee_project_submissions(employee_salary_profile_id);

-- ============================================================================
-- RLS POLICIES (Multi-tenant isolation)
-- ============================================================================
ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_slabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_linkage ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_salary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_salary_computation ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_project_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only admins of business can view salary structures
CREATE POLICY "salary_structures_business_isolation" ON salary_structures
  USING (business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role IN ('ADMIN', 'OWNER')
  ));

-- RLS policy: Employees can only view their own salary profiles
CREATE POLICY "employee_salary_self_view" ON employee_salary_profiles
  USING (
    user_id = auth.uid() OR 
    business_id IN (SELECT business_id FROM business_members WHERE user_id = auth.uid() AND role IN ('ADMIN', 'OWNER'))
  );
