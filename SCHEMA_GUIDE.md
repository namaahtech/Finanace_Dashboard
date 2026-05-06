# 📋 Finance Dashboard - Complete Schema Guide

## System Architecture Overview

```
EMPLOYEE FORM (Admin Panel)
    ↓
Employment Type → Auto-sets Salary Structure
    ↓
[Full Time/Part Time] → Fixed Monthly (Min-Max Salary)
[Internship] → Stipend (Min-Max Stipend)
    ↓
KPI/KRA Linkage Option (Checkbox)
    ↓
├─ IF ENABLED: Auto salary calculation from KPI/KRA scores
│  └─ Salary = Min + ((KPI_Score/100) × (Max-Min))
│
└─ IF DISABLED: Fixed salary set by admin
```

---

## 🗄️ Database Schema Requirements

### 1️⃣ EMPLOYEES TABLE (Core)
```sql
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS
  salary_min NUMERIC(10,2),              -- Minimum salary range
  salary_max NUMERIC(10,2),              -- Maximum salary range
  salary_step NUMERIC(10,2),             -- Increment steps
  hourly_rate NUMERIC(8,2),              -- For hourly employees
  daily_rate NUMERIC(8,2),               -- For daily wage
  stipend_amount NUMERIC(10,2),          -- For interns (same as salary_min)
  kpi_weight NUMERIC(3,1) DEFAULT 40,    -- % of KPI in final score
  kra_weight NUMERIC(3,1) DEFAULT 40,    -- % of KRA in final score
  behavioral_weight NUMERIC(3,1) DEFAULT 20,  -- % behavioral
  kpi_enabled BOOLEAN DEFAULT true,      -- Enable KPI tracking
  enable_salary_linkage BOOLEAN DEFAULT false; -- Link to KPI/KRA
```

### 2️⃣ KPI_SCORES TABLE (Performance Data)
```sql
CREATE TABLE IF NOT EXISTS kpi_scores (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  month INTEGER,
  year INTEGER,
  kpi_score NUMERIC(5,2),        -- 0-100
  kra_score NUMERIC(5,2),        -- 0-100
  behavioral_score NUMERIC(5,2), -- 0-100
  final_score NUMERIC(5,2),      -- Weighted average
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, month, year)
);
```

### 3️⃣ SALARY_BRACKETS TABLE (Reference Ranges)
```sql
CREATE TABLE IF NOT EXISTS salary_brackets (
  id UUID PRIMARY KEY,
  designation TEXT NOT NULL,
  level TEXT NOT NULL,           -- L1, L2, L3, Senior, etc.
  min_salary NUMERIC(10,2),
  max_salary NUMERIC(10,2),
  step_increment NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(designation, level)
);
```

### 4️⃣ SALARY_PERFORMANCE_MAPPING TABLE (Audit Trail)
```sql
CREATE TABLE IF NOT EXISTS salary_performance_mapping (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  effective_date DATE NOT NULL,
  kpi_score NUMERIC(5,2),
  kra_score NUMERIC(5,2),
  behavioral_score NUMERIC(5,2),
  final_performance_score NUMERIC(5,2),
  salary_min NUMERIC(10,2),      -- Range at that time
  salary_max NUMERIC(10,2),
  calculated_salary NUMERIC(10,2),  -- Auto-calculated from KPI
  final_salary NUMERIC(10,2),     -- What they actually got
  manual_override BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 Data Flow: Salary Calculation

### SCENARIO 1: Internship with Stipend + KPI Linkage

```
Employee Type: Internship
↓
Salary Structure: Stipend (AUTO)
↓
Min Stipend: ₹10,000
Max Stipend: ₹15,000
Enable Linkage: ✓ YES
↓
Admin doesn't set salary - system calculates it
↓
When KPI/KRA scores are generated:
  KPI Score: 80%
  KRA Score: 85%
  Behavioral: 75%
  Final Score: (80×0.4 + 85×0.4 + 75×0.2) = 81.5%
↓
Calculated Salary = 10,000 + ((81.5/100) × (15,000-10,000))
                  = 10,000 + (0.815 × 5,000)
                  = 10,000 + 4,075
                  = ₹14,075 ✅
```

### SCENARIO 2: Fixed Monthly Salary + Manual Override

```
Employee Type: Full Time
↓
Salary Structure: Fixed Monthly (AUTO)
↓
Min Salary: ₹50,000
Max Salary: ₹80,000
Enable Linkage: ✗ NO
↓
Admin manually sets: ₹65,000
↓
This fixed amount is used, KPI doesn't affect it
```

### SCENARIO 3: Hourly Paid

```
Employee Type: Part Time
↓
Salary Structure: Hourly
↓
Hourly Rate: ₹500/hour
Enable Linkage: ✗ NO (Not applicable)
↓
Salary = 500 × Hours Worked (calculated elsewhere)
```

---

## 🔗 Connection Points

### Form → Database
```
📝 Admin fills form
  ├─ Employment Type = "Internship"
  │  └─ Auto-set Salary Structure = "Stipend"
  │
  ├─ Min Stipend = 10,000
  ├─ Max Stipend = 15,000
  │
  ├─ KPI Weight = 40%
  ├─ KRA Weight = 40%
  ├─ Behavioral Weight = 20%
  │
  └─ Enable Salary Linkage = ✓
       │
       └─ SAVE TO EMPLOYEES TABLE
            ├─ salary_min = 10000
            ├─ salary_max = 15000
            ├─ kpi_weight = 40
            ├─ kra_weight = 40
            ├─ behavioral_weight = 20
            └─ enable_salary_linkage = true
```

### KPI/KRA → Auto-Calculated Salary
```
📊 KPI Calculation System (Monthly)
  ├─ Fetches attendance data
  ├─ Fetches project completion data
  ├─ Fetches task completion data
  ├─ Calculates scores:
  │  ├─ KPI Score = 75
  │  ├─ KRA Score = 82
  │  └─ Behavioral = 70
  │
  └─ Final Score = (75×0.4 + 82×0.4 + 70×0.2) = 77.6%
       │
       ├─ CHECK: enable_salary_linkage = true?
       │   └─ YES: Auto-calculate salary
       │        └─ Salary = min + ((77.6/100) × (max-min))
       │           = 10,000 + (0.776 × 5,000)
       │           = ₹13,880
       │
       └─ SAVE TO salary_performance_mapping:
           ├─ employee_id
           ├─ kpi_score = 75
           ├─ kra_score = 82
           ├─ behavioral_score = 70
           ├─ final_performance_score = 77.6
           ├─ salary_min = 10000
           ├─ salary_max = 15000
           ├─ calculated_salary = 13880 ✅
           └─ final_salary = 13880
```

---

## 📊 Sample Queries

### Get Employee with Salary Range
```sql
SELECT 
  name, 
  designation, 
  salary_min, 
  salary_max,
  kpi_weight, 
  kra_weight, 
  behavioral_weight,
  enable_salary_linkage
FROM employees 
WHERE id = 'emp-123';
```

### Get Latest Performance Score
```sql
SELECT 
  e.name,
  k.kpi_score,
  k.kra_score,
  k.behavioral_score,
  k.final_score,
  s.calculated_salary,
  s.final_salary
FROM employees e
JOIN kpi_scores k ON e.id = k.employee_id
LEFT JOIN salary_performance_mapping s ON e.id = s.employee_id
WHERE e.id = 'emp-123'
ORDER BY k.created_at DESC
LIMIT 1;
```

### Get Salary Range by Designation
```sql
SELECT 
  designation,
  level,
  min_salary,
  max_salary,
  step_increment
FROM salary_brackets
WHERE designation = 'Frontend Developer'
ORDER BY level;
```

---

## ✅ Migration File Location
```
src/supabase/migrations/047_salary_ranges_and_kpi_linkage.sql
```

Run this in Supabase SQL Editor to create all tables and functions.

---

## 🎯 Implementation Checklist

- [ ] Apply Migration 047 to Supabase
- [ ] Verify `employees` table has all new columns
- [ ] Verify `kpi_scores`, `salary_brackets`, `salary_performance_mapping` tables exist
- [ ] Test admin form with Internship → auto-sets Stipend
- [ ] Test min/max salary inputs showing correctly
- [ ] Test KPI/KRA linkage checkbox
- [ ] Create sample salary brackets for your designations
- [ ] Run test KPI calculation to generate `salary_performance_mapping` records
- [ ] Verify salary auto-adjusts based on performance scores

---

## 🔐 Row Level Security (RLS)

All tables have RLS enabled:
- Employees can view their own salary/performance data
- HR/Admins can view and manage all employee data
- Salary calculations are automatic (function-based)

---

## 📞 Quick Reference

| Feature | Table | Column |
|---------|-------|--------|
| Min/Max Salary | employees | salary_min, salary_max |
| KPI Weights | employees | kpi_weight, kra_weight, behavioral_weight |
| Enable Auto-Calc | employees | enable_salary_linkage |
| Performance Scores | kpi_scores | kpi_score, kra_score, behavioral_score, final_score |
| Auto-Calculated Salary | salary_performance_mapping | calculated_salary |
| Audit Trail | salary_performance_mapping | (all records) |
| Salary Ranges | salary_brackets | min_salary, max_salary |
