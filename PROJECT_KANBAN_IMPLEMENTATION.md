# Project Assignment & Kanban Implementation Plan

## 📊 SCHEMA ANALYSIS & REQUIRED UPDATES

### ⚠️ **CRITICAL: Missing Tables**

1. **`teams` table - MISSING** ❌
   - Referenced by `project_teams` but doesn't exist
   - **MUST CREATE** before project assignment works

2. **`project_members` table - MISSING** ❌
   - Need to track which employees are assigned to which projects
   - Currently only have project_teams (team-level), need employee-level assignment

### 📋 **Required Database Changes**

#### 1. Create TEAMS Table
```sql
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    department TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. Create PROJECT_MEMBERS Table (Employee-to-Project Assignment)
```sql
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'Member', -- Developer, Lead, Designer, etc.
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, employee_id)
);
```

#### 3. Add to PROJECTS Table (if missing)
```sql
ALTER TABLE projects ADD COLUMN IF NOT EXISTS progress NUMERIC(3,0) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_lead_id UUID REFERENCES employees(id);
```

#### 4. Enhance PROJECT_TASKS Table
```sql
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(5,2);
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS spent_hours NUMERIC(5,2) DEFAULT 0;
```

---

## 🚀 **IMPLEMENTATION PLAN**

### **Phase 1: Backend API Endpoints** (Create these routes)

#### 1. Get Assigned Projects
```
GET /api/projects/assigned
- Returns projects assigned to logged-in employee
- Response: { projects: [ { id, name, progress, tasks_count, completed_count, due_date } ] }
```

#### 2. Get Project Details with Tasks
```
GET /api/projects/[id]
- Returns project + all tasks
- Response: { project, tasks: [{ id, title, status, assigned_to, priority }] }
```

#### 3. Update Task Status (Kanban Drag-Drop)
```
PUT /api/tasks/[id]/status
- Body: { status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' }
- Updates task and recalculates project progress
```

#### 4. Assign Project to Employees
```
POST /api/project-members
- Body: { project_id, employee_ids: [], role: 'Member' }
- Adds employees to project
```

---

### **Phase 2: Employee Dashboard Components**

#### 1. ProjectCard Component
```
- Shows: Project name, progress bar, task counts
- Click: Opens Kanban view
- Visual: Color-coded by status
```

#### 2. ProjectProgressBar Component
```
- Shows: X/Y tasks completed
- Color: Green (complete), Blue (in-progress), Gray (todo)
- Click: Opens detailed Kanban
```

#### 3. ProjectKanban Component
```
- Four columns: TODO | IN_PROGRESS | REVIEW | COMPLETED
- Drag-drop tasks between columns
- Real-time sync with Supabase
- Show task details on hover
```

#### 4. Project Modal/Drawer
```
- Toggle between: List View ↔ Kanban View
- Show project metadata (due date, team members, progress)
- Quick task creation
```

---

### **Phase 3: Real-Time Sync**

#### 1. Supabase Subscriptions
```typescript
// Subscribe to project changes
const channel = supabase
  .channel(`projects:${projectId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'project_tasks',
    filter: `project_id=eq.${projectId}`
  }, (payload) => {
    // Update Kanban board in real-time
  })
  .subscribe();
```

#### 2. Auto-Calculate Progress
```sql
-- Trigger to update project.progress when tasks change
CREATE TRIGGER update_project_progress
AFTER INSERT OR UPDATE OR DELETE ON project_tasks
FOR EACH ROW
EXECUTE FUNCTION calculate_project_progress();
```

---

## 📱 **FRONTEND STRUCTURE**

### **Employee Dashboard (`src/app/dashboard/page.tsx`)**
```
┌─────────────────────────────────────┐
│        My Assigned Projects         │
├─────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────┐   │
│ │ Project A   │  │ Project B   │   │
│ │ 12/20 Done  │  │ 8/15 Done   │   │
│ │ ████░░░░░░  │  │ ███░░░░░░░░ │   │
│ │ [Click for] │  │ [Click for] │   │
│ │  Kanban     │  │  Kanban     │   │
│ └─────────────┘  └─────────────┘   │
└─────────────────────────────────────┘
```

### **Kanban View Modal**
```
┌────────────────────────────────────────┐
│ Project Name  [← Back]  [List] [Kanban]│
├──────────┬──────────┬──────────┬───────┤
│   TODO   │IN_PROGRESS│ REVIEW │DONE   │
├──────────┼──────────┼──────────┼───────┤
│[Task 1]  │[Task 4]  │[Task 6] │[Task 8]│
│[Task 2]  │[Task 5]  │         │[Task 9]│
│[Task 3]  │          │         │        │
└──────────┴──────────┴──────────┴───────┘
```

---

## 🔄 **DATA FLOW**

```
Admin Panel (Projects)
    ↓
Assign Project → employees
    ↓
INSERT into project_members
    ↓
Trigger: notify assigned employees
    ↓
Employee Dashboard
    ↓
[Auto-shows: My Assigned Projects]
    ↓
Click Project → Open Kanban
    ↓
Drag Task → Update Status
    ↓
Supabase Realtime Updates
    ↓
Progress Auto-Calculated
    ↓
Dashboard Refreshes in Real-Time
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### Database
- [ ] Create `teams` table
- [ ] Create `project_members` table
- [ ] Add `progress` column to `projects`
- [ ] Create progress calculation trigger
- [ ] Add realtime subscriptions

### APIs
- [ ] `GET /api/projects/assigned`
- [ ] `GET /api/projects/[id]`
- [ ] `PUT /api/tasks/[id]/status`
- [ ] `POST /api/project-members`

### Components
- [ ] ProjectCard
- [ ] ProjectProgressBar
- [ ] ProjectKanban (with drag-drop)
- [ ] Project Modal/Drawer

### Admin Panel Update
- [ ] Add "Assign to Employees" button in projects
- [ ] Multi-select employee picker
- [ ] Assignment confirmation & realtime update

### Employee Dashboard Update
- [ ] "My Projects" section
- [ ] ProjectCard grid
- [ ] Click → Kanban modal
- [ ] Realtime progress sync

---

## 🎯 **SUCCESS CRITERIA**

1. ✓ Admin assigns project to employee
2. ✓ Employee instantly sees in dashboard
3. ✓ Employee opens Kanban view
4. ✓ Can drag tasks between columns
5. ✓ Progress bar updates in real-time
6. ✓ All changes sync instantly across all users
7. ✓ Beautiful UI matching design system

---

## 📍 **Files to Create/Modify**

### New Files
- `src/supabase/migrations/046_teams_and_project_members.sql`
- `src/app/api/projects/assigned/route.ts`
- `src/app/api/project-members/route.ts`
- `src/app/api/tasks/[id]/status/route.ts`
- `src/components/projects/ProjectCard.tsx`
- `src/components/projects/ProjectKanban.tsx`
- `src/components/projects/ProjectModal.tsx`

### Modify
- `src/app/dashboard/page.tsx` - Add My Projects section
- `src/app/admin/projects/page.tsx` - Add assignment UI

---

**Status**: Ready for implementation  
**Complexity**: High - Requires database, APIs, components, real-time sync  
**Estimated Time**: 2-3 hours full implementation

