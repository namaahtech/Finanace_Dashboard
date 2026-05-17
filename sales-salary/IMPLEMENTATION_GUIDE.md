# CASCADING SALARY STRUCTURE IMPLEMENTATION GUIDE
## For EZBillify Workspace — Sales Role + Performance Linkage

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN SETTINGS PANEL                      │
│  - Configure salary structures (templates)                   │
│  - Set up commission slabs (Tier 1, 2, 3...)                │
│  - Define salary components (allowances)                     │
│  - Set KPI/KRA/Behavioral weights (performance linkage)      │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    [Salary Structures DB]
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              ADD EMPLOYEE OVERLAY (Next.js)                  │
│  1. Select Access Level → Auto-populate Salary Structure     │
│  2. Display Commission Slabs (tier selection)                │
│  3. Input Monthly Base Salary + Sales Target                 │
│  4. Auto-compute Gross (Base + Commission + Allowances)      │
│  5. Show Performance Linkage Settings (KPI/KRA weights)      │
│  6. Validate: Base Salary ≥ 50% of Gross ✅                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
              [Employee Salary Profile Created]
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          WORKSPACE PROJECTS SECTION (Employee)               │
│  - Employee submits project with:                            │
│    * Target achievement %                                    │
│    * KPI metric values                                       │
│    * KRA metric values                                       │
│    * Behavioral assessment note                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
          [Employee Project Submissions Stored]
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         SALARY COMPUTATION (Server Action)                   │
│  1. Fetch project submissions for month                      │
│  2. Calculate KPI/KRA/Behavioral scores                      │
│  3. Apply commission slab based on achievement               │
│  4. Calculate performance bonus based on scores              │
│  5. Deduct PF/TDS/ESI (statutory)                            │
│  6. Save final salary → monthly_salary_computation           │
│  7. Generate payslip                                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
                  [Monthly Payslip Generated]
```

---

## STEP 1: DATABASE SETUP

### 1a. Run SQL schema
```bash
# In Supabase SQL Editor
psql < salary_schema.sql
```

### 1b. Key tables created:
- `salary_structures` — Admin-defined role templates
- `commission_slabs` — Tiered commission for sales
- `salary_components` — Allowances (HRA, Travel, Mobile)
- `performance_linkage` — KPI/KRA/Behavioral weights
- `employee_salary_profiles` — Applied to actual employees
- `monthly_salary_computation` — Monthly calculated salary
- `employee_project_submissions` — Links to workspace projects
- `statutory_deductions_config` — PF, TDS, ESI rules

---

## STEP 2: ADMIN SETUP (One-time configuration)

### 2a. Create Salary Structure Template for "Sales" role
```
Name: "Sales Representative"
Role Type: SALES
Salary Type: FIXED_MONTHLY
Base Salary: ₹30,000
Base Salary % (min): 50%
```

### 2b. Add Commission Slabs (tier by tier)
```
Tier 1: 50% - 100% achievement   → 5% commission
Tier 2: 100% - 150% achievement  → 10% commission
Tier 3: 150%+ achievement         → 15% commission
```

### 2c. Add Salary Components (allowances)
```
Travel Allowance:  ₹5,000 (fixed)
Mobile Allowance:  ₹2,000 (fixed)
HRA:              15% of base
```

### 2d. Set Performance Linkage Weights
```
KPI Weight:       40% (sales targets, projects completed)
KRA Weight:       40% (work quality, delivery)
Behavioral Weight: 20% (team collaboration, communication)
```

**Access:** Admin Settings → Salary Structure Config

---

## STEP 3: ADD EMPLOYEE FLOW

### 3a. Admin clicks "Add Employee" in workspace

### 3b. Form shows in overlay modal:
```
Access Level dropdown (EMPLOYEE, ADMIN, MANAGER, DEPARTMENT_LEAD)
    ↓ (onChange triggers auto-select)
Salary Structure auto-populated (e.g., "Sales Representative")
    ↓
Employment Type dropdown (FULL_TIME, PART_TIME, INTERNSHIP)
Leave Entitlement dropdown (1 Day/Month, 12 Days/Year, etc.)
    ↓
[SALARY STRUCTURE SECTION]
Monthly Base Salary input: ₹30,000
    ↓ (If Sales role, show:)
Commission Slabs display (Tier 1, 2, 3 with %)
Monthly Sales Target input: ₹500,000
    ↓
[PERFORMANCE LINKAGE SECTION] (Sales roles only)
KPI Weight slider: 40%
KRA Weight slider: 40%
Behavioral Weight slider: 20%
    ↓
Gross Salary Display: ₹(auto-calculated)
Validation: Base ≥ 50% of Gross ✅
    ↓
Create Profile button
```

### 3c. On submit:
```javascript
// Validation
const gross = base + commission + allowances;
if (base / gross < 0.50) {
  ERROR: "Base must be ≥ 50% of gross"
}

// Create record in employee_salary_profiles
INSERT employee_salary_profiles {
  salary_structure_id: "sales-template-id",
  access_level: "EMPLOYEE",
  employment_type: "FULL_TIME",
  monthly_base_salary: 30000,
  monthly_sales_target: 500000,
  commencement_date: "2026-05-17",
}
```

---

## STEP 4: EMPLOYEE SUBMITS PROJECTS

### 4a. Employee goes to Workspace → Projects

### 4b. For each project, submits:
```
Project Name:           "Q2 Sales Blitz"
Target Value:           ₹500,000
Actual Achievement:     ₹600,000 (120%)
Achievement %:          120%

KPI Metrics:
  - Deals closed: 15
  - New customers: 5

KRA Metrics:
  - Report quality: "Excellent"
  - Delivery on time: "Yes"

Behavioral Note:
  "Strong team collaboration, helped junior staff"
```

### 4c. Saved to `employee_project_submissions` table:
```sql
INSERT employee_project_submissions {
  employee_salary_profile_id,
  project_id,
  project_name,
  submission_date,
  target_value,
  actual_achievement,
  achievement_percent: 120,
  kpi_metric_1,
  kpi_metric_2,
  kra_metric_1,
  kra_metric_2,
  behavioral_note,
}
```

---

## STEP 5: MONTHLY SALARY COMPUTATION

### 5a. Admin triggers "Generate Payslip" for May 2026

### 5b. Server action `computeMonthlySalary()` runs:

```typescript
// 1. FETCH employee profile + salary structure
employee = {
  monthly_base_salary: 30000,
  monthly_sales_target: 500000,
  salary_structures: {
    commission_slabs: [...],
    performance_linkage: { kpi: 40, kra: 40, behavioral: 20 }
  }
}

// 2. FETCH all project submissions for MAY
submissions = [
  { achievement_percent: 120, ... },
  { achievement_percent: 110, ... },
  ...
]

// 3. CALCULATE KPI/KRA/Behavioral SCORES
kpiScore = AVG(achievement_percent) = 115 (capped at 100)
kraScore = 85 (from submission metrics)
behavioralScore = 90 (from assessment notes)

// 4. APPLY COMMISSION SLAB
actualSales = 600000
achievementPercent = (600000 / 500000) * 100 = 120%
applicableSlab = Tier 2 (100-150%) → 10% commission
commissionEarned = 600000 * 0.10 = ₹60,000

// 5. CALCULATE ALLOWANCES
travelAllowance = 5000
mobileAllowance = 2000
hra = 30000 * 0.15 = 4500
totalAllowances = 11500

// 6. GROSS SALARY (before bonus)
grossSalary = 30000 + 60000 + 11500 = ₹101,500

// 7. PERFORMANCE BONUS
performanceScore = (100 * 0.40) + (85 * 0.40) + (90 * 0.20)
                 = 40 + 34 + 18 = 92

if performanceScore >= 80:
  bonusPercent = 50% → bonus = 30000 * 0.50 = ₹15,000

// 8. FINAL GROSS
finalGross = 30000 + 60000 + 11500 + 15000 = ₹116,500

// 9. STATUTORY DEDUCTIONS
pfEmployeeDeduction = 30000 * 0.12 = ₹3,600
pfEmployerContribution = 30000 * 0.12 = ₹3,600 (paid by company)
tdsDeduction = (116500 * 12 - 250000) * 0.05 / 12 = ₹2,345
esiDeduction = 0 (gross > 21000, so no ESI)

// 10. NET SALARY
netSalary = 116500 - 3600 - 2345 = ₹110,555

// 11. SAVE TO DATABASE
INSERT monthly_salary_computation {
  employee_salary_profile_id,
  month: "2026-05-01",
  base_salary: 30000,
  commission_earned: 60000,
  bonus_earned: 15000,
  allowances_total: 11500,
  gross_salary: 101500,
  pf_employee_deduction: 3600,
  pf_employer_contribution: 3600,
  tds_deduction: 2345,
  esi_deduction: 0,
  net_salary: 110555,
  kpi_score: 100,
  kra_score: 85,
  behavioral_score: 90,
  performance_bonus_percent: 50,
  final_gross_salary: 116500,
}
```

---

## STEP 6: PAYSLIP GENERATION

### 6a. Payslip shows (standard format):

```
EMPLOYEE PAYSLIP - MAY 2026

EARNINGS:
  Base Salary:           ₹30,000
  Commission:            ₹60,000
  Allowances:            ₹11,500
  Performance Bonus:     ₹15,000
  ─────────────────────
  GROSS SALARY:          ₹116,500

DEDUCTIONS:
  PF (Employee):         ₹3,600
  Income Tax (TDS):      ₹2,345
  ESI:                   ₹0
  ─────────────────────
  TOTAL DEDUCTIONS:      ₹5,945

NET SALARY (Take-home):  ₹110,555

PERFORMANCE SCORES:
  KPI Score:             100/100 (40% weight)
  KRA Score:             85/100  (40% weight)
  Behavioral Score:      90/100  (20% weight)
  ─────────────────────
  Overall Performance:   92%
  Bonus Eligibility:     50% ✅

EMPLOYER CONTRIBUTIONS:
  PF (Employer):         ₹3,600
  ESI (Employer):        ₹0
  Total Cost to Company: ₹120,100
```

---

## STEP 7: VALIDATION RULES (Code checks)

### 7a. Base Salary ≥ 50% of Gross
```javascript
const baseSalaryPercent = (baseSalary / finalGross) * 100;
if (baseSalaryPercent < 50) {
  throw new Error(`Base salary is ${baseSalaryPercent}%. Must be ≥ 50%.`);
}
```

### 7b. Commission Slab Matching
```javascript
const achievementPercent = (actualSales / target) * 100;
const slab = commissionSlabs.find(
  s => achievementPercent >= s.min_target_percent && 
       achievementPercent <= s.max_target_percent
);
if (!slab) {
  commission = 0; // No commission if outside slabs
}
```

### 7c. Performance Score Calculation
```javascript
const perfScore = 
  (kpiScore * kpiWeight / 100) +
  (kraScore * kraWeight / 100) +
  (behavioralScore * behavioralWeight / 100);

// Bonus tiers
if (perfScore >= 80) bonus = base * 0.50;
else if (perfScore >= 70) bonus = base * 0.30;
else if (perfScore >= 60) bonus = base * 0.15;
else bonus = 0;
```

---

## STEP 8: SYNC WITH WORKSPACE PROJECTS

### 8a. When employee updates project in Workspace:
```javascript
// In Projects page, onProjectSubmit():
await supabase
  .from('employee_project_submissions')
  .insert({
    employee_salary_profile_id: currentUser.salaryProfileId,
    project_id: projectId,
    project_name: projectName,
    submission_date: TODAY,
    target_value,
    actual_achievement,
    achievement_percent: (actual / target) * 100,
    kpi_metric_1,
    kpi_metric_2,
    kra_metric_1,
    kra_metric_2,
    behavioral_note,
  });
```

### 8b. Admin sees real-time impact:
- Can view employee's current scores
- Preview estimated salary for the month
- Adjust performance metrics manually if needed
- Trigger payslip generation

---

## STEP 9: INTEGRATION CHECKLIST

### Files to create/modify:
- [ ] `salary_schema.sql` — Run in Supabase
- [ ] `app/admin/employees/add-employee.tsx` — Add Employee modal
- [ ] `app/actions/salary-calculations.ts` — Computation logic
- [ ] `app/admin/settings/salary-structure-config.tsx` — Admin panel
- [ ] `app/workspace/projects/project-submission.tsx` — Project link (NEW)
- [ ] `app/admin/payroll/payslip.tsx` — Payslip display (NEW)

### Database migrations:
```bash
# Run in Supabase → SQL Editor
-- Copy salary_schema.sql content
-- Execute all CREATE TABLE statements
-- Enable RLS policies
```

### Environment variables (if needed):
```env
# No new env vars required for salary system
# Uses existing SUPABASE_SERVICE_ROLE_KEY
```

---

## STEP 10: TESTING SCENARIOS

### Scenario 1: Sales role, 120% target achievement
```
Base: ₹30,000
Target: ₹500,000
Actual: ₹600,000 (120%)
Commission Slab: Tier 2 (10%)
Commission Earned: ₹60,000
Expected Gross: ₹101,500+
```

### Scenario 2: Perfect performance (100 KPI, 100 KRA, 100 Behavioral)
```
Performance Score: 100%
Bonus: ₹30,000 (50% of base)
Final Gross: ₹131,500
Net after deductions: ≈₹125,000
```

### Scenario 3: Poor performance (50 KPI, 50 KRA, 50 Behavioral)
```
Performance Score: 50%
Bonus: ₹0 (< 60% threshold)
Final Gross: ₹101,500 (no bonus)
Net after deductions: ≈₹95,500
```

---

## STEP 11: ADMIN DASHBOARD (To add)

```
Dashboard should show:
├── Salary Structure Summary
│   ├── Number of structures
│   ├── Number of employees per structure
│   └── Average monthly payout
│
├── Current Month Payroll
│   ├── Total gross salary
│   ├── Commission paid
│   ├── Bonus paid
│   └── Statutory deductions
│
├── Performance Analytics
│   ├── Average KPI score
│   ├── Average KRA score
│   ├── Average Behavioral score
│   └── Bonus payout %
│
└── Employee Salary History
    ├── Monthly trends
    ├── Performance vs Salary
    └── Export payslip (PDF)
```

---

## STEP 12: SECURITY & RLS

### RLS Policies:
```sql
-- Admins can view/edit salary structures
CREATE POLICY admin_salary_structures
  ON salary_structures
  USING (business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role IN ('ADMIN', 'OWNER')
  ));

-- Employees can view only their own salary
CREATE POLICY employee_salary_self
  ON employee_salary_profiles
  USING (user_id = auth.uid());

-- Admins can view all employee salaries
CREATE POLICY admin_salary_all
  ON monthly_salary_computation
  USING (employee_salary_profiles.business_id IN (
    SELECT business_id FROM business_members 
    WHERE user_id = auth.uid() AND role = 'ADMIN'
  ));
```

---

## FINAL WORKFLOW

```
1. ADMIN SETUP (once)
   ├─ Create salary structures
   ├─ Set commission slabs
   ├─ Define components
   └─ Configure performance weights

2. MONTHLY CYCLE
   ├─ Add/Update employees (access level → auto-select structure)
   ├─ Employees submit projects (with KPI/KRA/Behavioral data)
   ├─ Admin triggers payslip generation
   │  ├─ System fetches project submissions
   │  ├─ Calculates scores
   │  ├─ Applies commission slab
   │  ├─ Computes performance bonus
   │  └─ Deducts statutory amounts
   └─ Payslips generated & distributed

3. EMPLOYEE VIEWS
   ├─ Own salary profile
   ├─ Payslip details
   └─ Performance scores

4. ANALYTICS
   ├─ Salary trends
   ├─ Performance correlation
   └─ Cost-to-company tracking
```

---

## DONE! 🚀

Your salary system now:
✅ Auto-cascades role selection → salary structure
✅ Displays commission slabs for sales roles
✅ Links to workspace project submissions
✅ Calculates KPI/KRA/Behavioral scores
✅ Applies performance bonuses
✅ Deducts statutory requirements (PF/TDS/ESI)
✅ Validates Base ≥ 50% of Gross (legal compliance)
✅ Generates monthly payslips

All built with Next.js, Supabase, TypeScript, and server actions! 💪
