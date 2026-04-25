# KPI/KRA Real-Time Performance System - Implementation Guide

## 🎯 Overview

Complete real-time KPI/KRA (Key Performance Indicator / Key Result Area) tracking system for employee performance management with instant database synchronization.

---

## ✅ Issues Fixed

### 1. **Missing Key Prop Warning** ✅
**Error**: `Each child in a list should have a unique "key" prop`
**File**: `src/app/admin/kpi/page.tsx:367`
**Fix**: Added fallback key with safe field mapping
```jsx
// Before (Error)
<option key={emp._id} value={emp._id}>

// After (Fixed)
<option key={emp._id || emp.id || emp.employeeId} value={emp._id || emp.id || emp.employeeId}>
```

---

## 📊 Database Schema

### New Tables Created

#### 1. **kpi_metrics** (Performance Scores)
```sql
id UUID PRIMARY KEY
employee_id UUID (REFERENCES employees)
month INTEGER (1-12)
year INTEGER

-- Score Components
kpi_score NUMERIC(5,2) -- 0-100
kpi_entries JSONB -- [{label, weight, score}]
kra_score NUMERIC(5,2) -- 0-100
kra_metrics JSONB -- {ownership, quality, initiative}
behavioral_score NUMERIC(5,2) -- 0-100
behavioral_metrics JSONB -- {attendance, discipline, communication}

-- Final Results
final_score NUMERIC(5,2) -- 0-100
rating_label TEXT -- Outstanding/Exceeds/Meets/Needs Improvement/Poor

-- Metadata
remarks TEXT
incentive_hint NUMERIC(10,2)
entered_by UUID
entered_at TIMESTAMPTZ
updated_at TIMESTAMPTZ

UNIQUE(employee_id, month, year)
```

#### 2. **kpi_history** (Change Tracking)
```sql
id UUID PRIMARY KEY
kpi_id UUID (REFERENCES kpi_metrics)
employee_id UUID

-- Previous values
prev_kpi_score, prev_kra_score, prev_behavioral_score, prev_final_score

-- New values
new_kpi_score, new_kra_score, new_behavioral_score, new_final_score

-- Change metadata
changed_by UUID
change_reason TEXT
changed_at TIMESTAMPTZ
```

#### 3. **kpi_summary** (Quick Access Dashboard)
```sql
id UUID PRIMARY KEY
employee_id UUID UNIQUE (REFERENCES employees)

current_month, current_year, current_score, current_rating
avg_3month NUMERIC(5,2)
avg_6month NUMERIC(5,2)
ytd_average NUMERIC(5,2)
trend TEXT -- improving/stable/declining

updated_at TIMESTAMPTZ
```

### New Columns Added to `employees` Table
```sql
current_kpi_score NUMERIC(5,2)
current_kra_score NUMERIC(5,2)
current_behavioral_score NUMERIC(5,2)
current_final_score NUMERIC(5,2)
current_rating TEXT
ytd_average NUMERIC(5,2)
performance_trend TEXT
last_kpi_update TIMESTAMPTZ
```

---

## 🔄 Real-Time Features

### Automatic Triggers
1. **sync_employee_kpi()** - Updates employee table when KPI is entered
2. **update_kpi_summary()** - Updates summary table for quick access
3. **log_kpi_change()** - Records all changes to history table

### Real-Time Subscriptions
```typescript
// Supabase real-time channel
const subscription = supabase
  .channel(`kpi-${userId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'kpi_metrics',
    filter: `employee_id=eq.${userId}`
  }, () => fetchKpiData())
  .subscribe();
```

### Polling Update (3-second interval)
```typescript
// Fallback polling every 3 seconds
const interval = setInterval(() => {
  axios.get(`/api/kpi?employeeId=${selectedUser}`)
    .then((res) => setScores(res.data.data || []))
}, 3000);
```

---

## 🔗 API Endpoints

### GET /api/kpi
**Fetch KPI metrics**
```
Query Params:
- employeeId: UUID (filter by employee)
- month: 1-12 (specific month)
- year: YYYY (specific year)
- allEmployees: boolean (get all, not just latest)

Response:
{
  success: true,
  data: [
    {
      id: UUID,
      employee_id: UUID,
      month: 3,
      year: 2026,
      kpi_score: 85.5,
      final_score: 87.0,
      rating_label: "Exceeds",
      employee: { id, name, employeeId, department }
    }
  ],
  count: 1
}
```

### POST /api/kpi
**Create or update KPI score**
```
Body:
{
  id?: UUID (for update),
  employee_id: UUID,
  month: 3,
  year: 2026,
  kpi_score: 85,
  kpi_entries: [{label, weight, score}],
  kra_score: 80,
  kra_metrics: {ownership, quality, initiative},
  behavioral_score: 90,
  behavioral_metrics: {attendance, discipline, communication},
  final_score: 85,
  rating_label: "Exceeds",
  remarks: "Good performance..."
}

Response:
{
  success: true,
  data: { ... full KPI object with employee details }
}
```

### GET /api/kpi/summary
**Fetch performance summaries**
```
Query Params:
- employeeId: UUID (optional, filter)

Response:
{
  success: true,
  data: [
    {
      employee_id: UUID,
      current_score: 85.0,
      current_rating: "Exceeds",
      avg_3month: 82.5,
      avg_6month: 80.0,
      ytd_average: 81.5,
      trend: "improving"
    }
  ]
}
```

### DELETE /api/kpi
**Delete KPI record (Admin only)**
```
Query Params:
- id: UUID (KPI ID to delete)

Response:
{ success: true, message: "KPI deleted" }
```

---

## 🎨 Components Implemented

### 1. **EmployeeKpiDashboard** (`components/kpi/EmployeeKpiDashboard.tsx`)
Real-time KPI display for employee dashboard

**Features**:
- Current month KPI/KRA/Behavioral scores
- Final performance score (0-100)
- Performance rating with color coding
- Trend indicator (improving/stable/declining)
- Comparison with previous month
- Remarks/Feedback display
- Auto-refresh via Supabase realtime + polling

**Usage**:
```tsx
import { EmployeeKpiDashboard } from "@/components/kpi/EmployeeKpiDashboard";

export default function EmployeeDashboard() {
  return <EmployeeKpiDashboard />;
}
```

**Display**:
```
┌─────────────────────────────┐
│ Your Overall Performance    │
│ 87.5 / 100                  │
├─────────────────────────────┤
│ KPI: 85.5  KRA: 80.0  Beh: 90.0
│ Rating: EXCEEDS ↗ Improving
│ Prev Month: +2.1
├─────────────────────────────┤
│ Feedback: Good initiative...│
│ March 2026                  │
└─────────────────────────────┘
```

### 2. **Admin KPI Page** (`app/admin/kpi/page.tsx`)
HR/Admin interface for entering and managing KPI scores

**Features**:
- Employee selection dropdown with safe key mapping
- Period navigation (month/year)
- KPI entry form with weighted scoring
- KRA metrics (Ownership, Quality, Initiative)
- Behavioral metrics (Attendance, Discipline, Communication)
- Real-time score calculations
- Dual tabs: Entry (form) + Overview (admin view)
- Real-time polling every 3 seconds
- Performance history
- Incentive hint calculation

**Real-Time Updates**:
```typescript
// Form auto-populates when data is entered by another admin
// Scores update instantly (3-second polling)
// Status indicators show when KPI is being edited
```

---

## 📈 Performance Rating System

| Score Range | Rating | Incentive | Color |
|-------------|--------|-----------|-------|
| 90-100 | Outstanding | +20% bonus | 🟢 Emerald |
| 75-89 | Exceeds | +15% bonus | 🔵 Sky |
| 60-74 | Meets | +10% bonus | 🟡 Amber |
| 40-59 | Needs Improvement | 0% bonus | 🟠 Orange |
| 0-39 | Poor | -5% penalty | 🔴 Red |

---

## 🔐 Row Level Security (RLS)

### Policies
```sql
-- Employees can only view their own KPI
CREATE POLICY "employees_view_own_kpi"
  ON kpi_metrics FOR SELECT
  USING (employee_id = auth.uid());

-- HR/Admins can view all KPIs
CREATE POLICY "hr_view_all_kpi"
  ON kpi_metrics FOR SELECT
  USING (
    (SELECT role FROM employees WHERE id = auth.uid())
    IN ('super_admin', 'hr', 'lead')
  );

-- Only HR/Admins can create/update/delete
CREATE POLICY "hr_manage_kpi"
  ON kpi_metrics FOR ALL
  USING (
    (SELECT role FROM employees WHERE id = auth.uid())
    IN ('super_admin', 'hr', 'lead')
  );
```

---

## 🚀 Usage Examples

### Employee Dashboard Integration
```tsx
import { EmployeeKpiDashboard } from "@/components/kpi/EmployeeKpiDashboard";

export default function EmployeeDashboard() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        {/* ... other widgets ... */}
      </div>
      <div className="col-span-1">
        <EmployeeKpiDashboard />
      </div>
    </div>
  );
}
```

### Admin - Create KPI Entry
```typescript
const submitKpi = async () => {
  const response = await axios.post('/api/kpi', {
    employee_id: selectedEmployee.id,
    month: form.month,
    year: form.year,
    kpi_score: calculatedKpiScore,
    kpi_entries: form.kpiEntries,
    kra_score: calculatedKraScore,
    kra_metrics: form.kraMetrics,
    behavioral_score: calculatedBehavioralScore,
    behavioral_metrics: form.behavioralMetrics,
    final_score: calculatedFinalScore,
    rating_label: calculatedRating,
    remarks: form.remarks
  });

  // Real-time subscription automatically updates dashboard
};
```

### Admin - Fetch Employee KPI History
```typescript
const fetchHistory = async () => {
  const response = await axios.get(`/api/kpi?employeeId=${empId}&allEmployees=true`);
  
  // Returns all KPI entries for employee, sorted by date
  const kpiHistory = response.data.data;
};
```

---

## 📁 Files Modified/Created

✅ **Fixed**:
- `src/app/admin/kpi/page.tsx` - Key prop error + real-time polling

✅ **Created**:
- `src/supabase/migrations/044_kpi_kra_system.sql` - Database schema
- `src/supabase/migrations/045_add_kpi_to_employees.sql` - Employee table updates
- `src/app/api/kpi/route.ts` - Real-time API endpoints
- `src/components/kpi/EmployeeKpiDashboard.tsx` - Employee dashboard widget
- `KPI_SYSTEM_IMPLEMENTATION.md` - This documentation

---

## 🧪 Testing Checklist

- [x] Database migrations run successfully
- [x] KPI form submits data correctly
- [x] Real-time updates propagate (3-sec polling)
- [x] Employee can view own KPI
- [x] HR/Admin can create/edit KPI
- [x] Rating calculation is accurate
- [x] Trend indicator works
- [x] Remarks display correctly
- [x] History tracking works
- [x] RLS policies enforced
- [x] Key prop warning resolved

---

## 🔧 Configuration

### Real-Time Polling Interval
```typescript
// In EmployeeKpiDashboard.tsx line 113
const interval = setInterval(() => {
  // Fetch every 3000ms (3 seconds)
}, 3000);
```

**To change interval**: Update `3000` to desired milliseconds

### Rating Thresholds
```typescript
// In lib/kpiMath.ts
export function getKpiRating(score: number) {
  if (score >= 90) return "Outstanding";
  if (score >= 75) return "Exceeds";
  if (score >= 60) return "Meets";
  if (score >= 40) return "Needs Improvement";
  return "Poor";
}
```

---

## 📊 Data Flow Diagram

```
Employee Dashboard          Admin Panel
    │                           │
    ├── View KPI Score          ├── Enter KPI
    │   (Real-time)             │   (Submit Form)
    │                           │
    └──────────────────────────┴──→ API POST /api/kpi
                                    │
                                    ↓
                        Supabase kpi_metrics table
                        (Insert/Update)
                                    │
                        ┌───────────┼───────────┐
                        ↓           ↓           ↓
                    sync_employee  update_kpi  log_kpi
                    _kpi trigger   _summary    _change
                                   trigger     trigger
                        │           │           │
                        ↓           ↓           ↓
                    employees    kpi_summary  kpi_history
                    (updated)    (created)    (created)
                        │
                        └───────────→ Supabase Realtime
                                    Channel Subscription
                                    │
                                    ↓
                        Employee KpiDashboard Component
                        (Auto-refresh + display)
```

---

## 🎯 Next Steps (Optional Enhancements)

1. **Quarterly Reviews**: Aggregate monthly KPIs into quarterly reviews
2. **Peer Ratings**: Add peer feedback component
3. **Goal Setting**: Pre-quarter goal setting workflow
4. **Calibration**: HR calibration sessions for consistency
5. **Export Reports**: PDF reports for performance reviews
6. **Email Notifications**: Notify when KPI is entered/updated
7. **Mobile App**: Mobile view for reviewing KPI

---

## 🆘 Troubleshooting

### "Missing required fields" error
**Solution**: Ensure all fields are provided in POST request
- employee_id, month, year are mandatory

### "Cannot read property '_id' of undefined"
**Solution**: Already fixed! Key prop now uses fallback mapping

### Real-time data not updating
**Solution**: Check browser DevTools → Network tab for API errors
1. Verify Supabase connection
2. Check RLS policies
3. Ensure user has role (super_admin, hr, lead, or is own employee)

### Performance scores not calculating
**Solution**: Verify kpiMath functions are imported correctly
```typescript
import { calculateFinalKpiScore, getKpiRating } from "@/lib/kpiMath";
```

---

**Status**: ✅ Production Ready  
**Last Updated**: 2026-04-25  
**Version**: 1.0.0
