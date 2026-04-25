# Complete Schema Analysis - Finance Dashboard

## Overview
The schema is organized into 4 main functional areas, with clear separation of concerns and no conflicts.

---

## 1. KPI/PERFORMANCE SYSTEM (Migrations 044-045)

### Migration 044: KPI Core Tables
```
kpi_metrics (Performance scores per employee per month)
├── employee_id (FK → employees)
├── month, year (unique per employee)
├── kpi_score (0-100)
├── kra_score (0-100)
├── behavioral_score (0-100)
├── final_score (weighted average)
├── rating_label (Outstanding/Exceeds/Meets/Needs Improvement/Poor)
└── Triggers: Updates kpi_summary, logs history

kpi_history (Audit trail for score changes)
├── kpi_id (FK → kpi_metrics)
├── employee_id (FK → employees)
├── prev_* and new_* score columns
└── changed_by, changed_at

kpi_summary (Quick dashboard view per employee)
├── employee_id (UNIQUE)
├── current_month, current_year, current_score
├── avg_3month, avg_6month, ytd_average
└── trend (improving/stable/declining)
```

### Migration 045: KPI Fields in Employees
Syncs current KPI data into employees table for quick access:
```
employees table additions:
├── current_kpi_score
├── current_kra_score
├── current_behavioral_score
├── current_final_score
├── current_rating
├── ytd_average
├── performance_trend
└── last_kpi_update

Trigger: sync_employee_kpi_trigger
└─ Auto-syncs from kpi_metrics whenever scores change
```

---

## 2. SALARY SYSTEM (Migration 047)

### Fixed Migration 047 Issues
✅ Constraint creation wrapped in DO block with exception handling
✅ Removed dummy sample data (add via admin panel only)
✅ Realtime publication wrapped with exception handling
✅ RLS enable wrapped with exception handling
✅ Triggers wrapped with exception handling

### Employees Table Salary Additions
```
Base Salary Fields:
├── salary_min (for stipend/range)
├── salary_max (for stipend/range)
├── salary_step (increment between levels)
├── hourly_rate (for hourly employees)
├── daily_rate (for daily wage employees)
└── stipend_amount (for interns)

KPI Linkage Fields:
├── kpi_weight (0-100, defaults to 40)
├── kra_weight (0-100, defaults to 40)
├── behavioral_weight (0-100, defaults to 20)
│  └─ Constraint: Must sum to 100
├── kpi_enabled (boolean, defaults true)
└── enable_salary_linkage (boolean, defaults false)
   └─ When true: salary auto-adjusts based on KPI scores
```

### New Salary Tables
```
salary_brackets (Reference salary ranges by designation)
├── id (UUID)
├── designation (e.g., "Frontend Developer")
├── level (e.g., "L1", "L2", "Senior")
├── min_salary
├── max_salary
├── step_increment
└── UNIQUE(designation, level)

salary_performance_mapping (Audit trail for salary calculations)
├── id (UUID)
├── employee_id (FK → employees)
├── effective_date
├── kpi_score, kra_score, behavioral_score
├── final_performance_score
├── adjusted_salary (calculated)
├── salary_increase_percent
└── notes
```

### Salary Calculation Function
```
calculate_performance_adjusted_salary(employee_id, min, max, score)
  Returns: min + ((score/100) × (max-min))
  Maps 0-100 performance score to min-max salary range
```

---

## 3. TEAMS & PROJECT SYSTEM (Migration 046)

### Teams Table
```
teams
├── id (UUID)
├── name (UNIQUE)
├── department
├── description
└── created_at, updated_at
```

### Project Member Assignment
```
project_members (Employee → Project mapping)
├── id (UUID)
├── project_id (FK → projects)
├── employee_id (FK → employees)
├── role (Developer, Lead, Designer, Manager, etc.)
└── UNIQUE(project_id, employee_id)
```

### Project Enhancements
```
projects table additions:
├── progress (0-100, auto-calculated)
└── team_lead_id (FK → employees)

project_tasks table additions:
├── order_index (for drag-drop)
├── estimated_hours
└── spent_hours

Trigger: calculate_project_progress
└─ Auto-updates projects.progress based on task completion
```

---

## 4. CONSISTENCY & INTEGRITY

### All Tables Have
✅ UUID primary keys with gen_random_uuid()
✅ created_at/updated_at timestamps
✅ Foreign key constraints with ON DELETE CASCADE
✅ Proper indexes on FK columns
✅ Row Level Security (RLS) enabled
✅ Realtime subscriptions enabled

### All Triggers Use Exception Handling
✅ DO blocks wrap risky operations
✅ duplicate_object exceptions caught
✅ Allows safe re-runs of migrations

### RLS Policies (Consistent Pattern)
```
Employees:
├─ View own data via employee_id = auth.uid()
└─ View salary_brackets (public view)

HR/Admins (roles: super_admin, hr, accounts, lead):
└─ Full access to all management tables
```

---

## 5. DATA FLOW ARCHITECTURE

### Complete Employee Salary Journey
```
Admin Panel Form
  ↓ (filled by admin)
Employment Type → Auto-sets Salary Structure
  ├─ Internship → Stipend (min/max inputs)
  ├─ Full Time → Fixed Monthly (single salary)
  ├─ Part Time → Hourly or Daily
  └─ All → KPI Weight inputs (must sum to 100%)
  ↓ (saves to /api/users POST)
employees table
  ├── salary_min, salary_max (or base_salary)
  ├── kpi_weight, kra_weight, behavioral_weight
  └── enable_salary_linkage
  ↓ (when KPI scores calculated)
kpi_metrics table (new scores entered)
  ↓ (trigger: sync_employee_kpi_trigger)
employees.current_kpi_score etc.
  ↓ (if enable_salary_linkage = true)
Salary auto-calculated from function:
  min + ((final_score/100) × (max-min))
  ↓ (recorded in)
salary_performance_mapping (audit trail)
  ↓ (displayed in)
Employee Profile Page
  └─ Shows salary structure, ranges, weights, current KPI
```

### Real-time Sync Points
- kpi_metrics → employees (trigger)
- project_tasks changes → projects.progress (trigger)
- employees changes → profile page (Supabase realtime)
- teams changes → team selection dropdowns (Supabase realtime)

---

## 6. MIGRATION EXECUTION ORDER

Run these migrations in sequence:
1. **044** - KPI/KRA System (creates kpi_metrics, kpi_history, kpi_summary)
2. **045** - KPI Fields in Employees (adds current_* fields)
3. **046** - Teams & Project Members (creates teams, project_members)
4. **047** - Salary Ranges & KPI Linkage (adds salary fields, creates salary tables)

✅ All four are now idempotent and can be re-run safely

---

## 7. NO DUMMY DATA POLICY

✅ Migration 047 sample salary_brackets data removed
✅ Migration 046 team seed data kept (essential for operations)
✅ All other schemas contain only table definitions
✅ Admin panel is the only source of business data entry

---

## 8. API ENDPOINTS (Complete Data Flow)

### Employee Management
- `POST /api/users` → Creates employee + saves all fields
- `PATCH /api/users/[id]` → Updates employee including salary fields
- `GET /api/employees/[id]` → Returns complete employee with salary info
- `GET /api/users` → Lists all employees

### KPI Management
- `GET /api/kpi?month=X&year=Y` → Gets KPI scores
- `POST /api/kpi` → Records KPI scores (auto-triggers salary calc)

### Project Management
- `GET /api/projects/assigned` → Gets projects for employee
- `POST /api/project-members` → Assigns employee to project
- `PUT /api/tasks/[id]/status` → Updates task (triggers progress calc)

---

## 9. SCHEMA VALIDATION CHECKLIST

✅ No duplicate column names across migrations
✅ No duplicate constraint names (fixed with DO blocks)
✅ All foreign keys reference existing tables
✅ All triggers use existing functions
✅ Realtime publications handle duplicates
✅ RLS policies use consistent role checks
✅ Weights validation constraint (sum = 100)
✅ Score range validations (0-100)
✅ No circular dependencies
✅ Idempotent operations (safe re-runs)

---

## 10. NEXT STEPS

1. ✅ Run Migration 047 (fixed version)
2. ✅ Verify no schema conflicts in Supabase
3. ✅ Test API endpoints with new fields
4. ✅ Create first employee in admin panel
5. ✅ Verify profile page displays all data
6. ✅ Add salary brackets through admin panel
7. ✅ Test KPI score calculation and salary linkage
