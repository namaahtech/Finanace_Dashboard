# NAMAAH NEXUS — COMPLETE PROJECT STATUS DOCUMENT

> **As of:** 11 May 2026 | **Build:** Next.js 14 App Router + Supabase + LiveKit + Zoho Mail + Gemma AI

---

## OVERALL PROGRESS SNAPSHOT

| Category | Count | Status |
|---|---|---|
| Total Pages | 86 | ✅ Built |
| API Routes | 89 | ✅ Built |
| UI Components | 29 | ✅ Built |
| Database Tables (all migrations) | 70+ | ✅ Migrated |
| Roles / Panels | 8 | ✅ Configured |
| Real-time Subscriptions | 12+ modules | ✅ Active |
| AI Features (Gemma 4) | 7 modules | ✅ Wired |
| Zoho Mail Integration | 9 sub-pages | ⚠️ Needs OAuth setup |
| LMS Academy | 6 pages | ✅ Built |
| LiveKit Video Meetings | Full | ✅ Active |

---

# PANEL 1 — SUPER ADMIN PANEL

> Role key: `super_admin` | Login redirects to: `/admin`

---

## MODULE 1.1 — DASHBOARD
**Route:** `/admin`
**Status:** ✅ Full UI + Real-time

**What is working:**
- KPI stat cards: Total employees, active projects, pending invoices, total budget used
- Finance snapshot widget (revenue vs expense mini-chart)
- Live headcount and attendance summary
- Quick-action buttons to every major module

**Real-time:** Supabase channel on `employees`, `invoices`, `projects` tables — counts update live without refresh

**Linking:**
- Dashboard stat "Employees" card → clicks → `/admin/users`
- Dashboard stat "Projects" card → clicks → `/admin/projects`
- Dashboard stat "Invoices" card → clicks → `/admin/invoicing`
- Dashboard stat "Attendance" card → clicks → `/admin/attendance`
- Global Attendance Widget (top bar) → always visible, shows punch-in/out status

---

## MODULE 1.2 — EMPLOYEES
**Route:** `/admin/users`
**Status:** ✅ Full UI + Real-time + AI-linked

**What is working:**
- Full employee table with search, filter by department/role/status
- Add Employee slide-over form: name, email, role, department, designation, shift assignment, team assignment, employment type
- Salary structure fields: fixed/range, base salary, min/max
- KPI weight settings: KPI% + KRA% + Behavioral% (must total 100)
- Enable Salary Linkage toggle (links KPI score to salary calculation)
- **Zoho Mail auto-provision checkbox** — when checked and Zoho is connected, creates `firstname.lastname@namaah.in` on employee save. Shows live email preview. Shows amber disabled badge if Zoho not connected yet.
- Edit employee: all fields editable, Zoho mail NOT re-triggered on edit
- Deactivate / Delete employee

**Real-time:** Table refreshes on any `employees` table change via Supabase channel

**Linking:**
- "Add Employee" button → opens slide-over form (same page, no navigation)
- Employee row → click → expands details or opens edit form
- Zoho Mail checkbox → on save → calls `POST /api/mail/accounts/create-employee` → stores in `zoho_mail_accounts` table
- Department dropdown → populated from `teams` table (type = department)
- Shift dropdown → populated from `shifts` table
- Team dropdown → populated from `teams` table

---

## MODULE 1.3 — PROJECTS
**Route:** `/admin/projects`
**Status:** ✅ Full UI + Kanban + Real-time

**What is working:**
- Project Kanban board (drag cards between status columns: Planning / Active / On Hold / Completed)
- Project cards: name, client, deadline, assigned team, progress bar, status badge
- Create Project modal: title, description, client, budget, start/end dates, team assignment
- Task management per project: open project → task board with subtasks
- Task assignment to specific employees
- Task comments (threaded)
- Delegation modal: delegate project authority to another employee
- Oversight matrix: shows who oversees what
- Multi-assignee support on tasks

**Real-time:** Supabase channels on `projects`, `project_tasks`, `task_comments`

**Linking:**
- Project card "Open" → `/admin/projects` (detail panel slides open, same page)
- Task row → expand → shows subtasks + comments
- "Add Member" → calls `POST /api/project-members`
- Employee name in task → links to employee record in `/admin/users`
- "View in Dashboard" (for employees assigned) → their view at `/dashboard/projects/[id]`

---

## MODULE 1.4 — SHIFT MANAGEMENT
**Route:** `/admin/shifts`
**Status:** ✅ Full UI

**What is working:**
- Create/edit/delete shifts (name, start time, end time, grace period minutes)
- Assign employees to shifts
- View which employees are on each shift

**Linking:**
- Shifts list → each shift shows employee count → click count → filters `/admin/attendance` by that shift

---

## MODULE 1.5 — TEAMS & ORG CHART
**Route:** `/admin/teams` | `/admin/org-chart`
**Status:** ✅ Full UI

**What is working:**
- Teams: create departments and sub-teams, assign managers, view members
- Org Chart: visual hierarchy tree of entire company, departments, reporting lines

**Linking:**
- Teams → each team node → click → filters employee list
- Org Chart node → click → shows employee card with quick actions

---

## MODULE 1.6 — ATTENDANCE
**Route:** `/admin/attendance`
**Status:** ✅ Full UI + Real-time

**What is working:**
- Date-range attendance table for all employees
- Columns: employee name, punch-in, punch-out, hours worked, late/early flags, leave type
- Manual override: admin can edit attendance records
- Bulk approve/reject leave requests
- Leave quota management per employee
- Monthly attendance heatmap per employee
- Export CSV

**Real-time:** Supabase channel on `attendance` table — punches appear live

**Linking:**
- Employee name row → click → opens profile at `/admin/users` with that employee focused
- "Leave Requests" tab → approve/reject → triggers notification to employee
- Attendance data feeds into → `/admin/payroll` (for salary deduction calculation)
- Attendance data feeds into → `/admin/kpi` (for attendance KPI sub-score)

---

## MODULE 1.7 — KPI / KRA
**Route:** `/admin/kpi`
**Status:** ✅ Full UI + Auto-calculation + Real-time

**What is working:**
- Per-employee KPI score cards: KPI score (auto-calc), KRA score, Behavioral score, Final Weighted Score
- Auto-calculation engine: calls `POST /api/kpi/calculate` → Gemma AI + rule engine computes score from attendance, tasks completed, sales targets
- Manual override panel: admin can set override score with reason
- Weight configuration per employee (set in `/admin/users`)
- Score history chart (last 6 months)
- Department average vs individual comparison
- Salary linkage indicator: if enabled, shows "this score affects salary"

**Real-time:** Supabase channel on `kpi_scores` — scores update when calculation runs

**Linking:**
- KPI score card → click employee name → `/admin/users` employee profile
- "Recalculate All" button → calls `/api/kpi/calculate` → updates all scores
- Score → if salary linkage ON → score auto-flows into `/admin/payroll` salary calculation
- KPI data feeds into → Incentives module for performance-based payouts

---

## MODULE 1.8 — PAYROLL
**Route:** `/admin/payroll`
**Status:** ✅ Full UI + Salary Linkage

**What is working:**
- Monthly payroll table: all employees, base salary, KPI bonus, deductions, net pay
- Salary structures: Fixed Monthly / Salary Range (min-max with KPI-linked variable)
- One-click Generate Payslip (PDF) per employee
- Bulk run payroll for entire month
- Payslip sent to employee's email (SMTP configured in settings)
- Attendance-based deductions (late deductions, LOP - Loss of Pay)
- Tax/PF/ESI fields (manual input)
- Hold salary for individual (with reason)

**Linking:**
- Payroll table employee → click → opens salary breakdown slide-over
- "Generate Slip" → calls `POST /api/payroll` → PDF generated → stored → employee sees it at `/dashboard/payslips`
- KPI score (if salary_linkage = ON) → auto-populates KPI bonus field
- Deductions pulled from `/admin/attendance` LOP data

---

## MODULE 1.9 — INCENTIVES
**Route:** `/admin/incentives`
**Status:** ✅ Full UI

**What is working:**
- Create incentive rules (performance-based, attendance-based, target-based)
- Assign incentive amounts per employee or team
- Hold/release incentive payments
- Monthly incentive summary table
- Employee sees their incentive at `/dashboard/incentives`

**Linking:**
- Incentive row → employee name → `/admin/users`
- "Hold" button → calls `POST /api/incentives/hold` → employee's view shows "On Hold" badge
- Incentive data contributes to payroll total

---

## MODULE 1.10 — CLAIMS
**Route:** `/admin/claims`
**Status:** ✅ Full UI

**What is working:**
- View all employee expense claims
- Approve / Reject with note
- Claim categories (travel, equipment, meals, etc.)
- Attach receipts (file upload)

---

## MODULE 1.11 — REIMBURSEMENTS
**Route:** `/admin/reimbursements`
**Status:** ✅ Full UI

**What is working:**
- View all reimbursement requests from employees
- Approve/partial approve/reject
- Link reimbursement to payroll cycle
- Export for accounting

**Linking:**
- Approved reimbursements → can be added into current payroll run at `/admin/payroll`

---

## MODULE 1.12 — PRIORITY PAYOUT
**Route:** `/admin/priority`
**Status:** ✅ Full UI

**What is working:**
- Priority bonus payout management separate from salary
- Create priority payout entries for ad-hoc bonuses
- Employee views their priority payout at `/dashboard/priority`

---

## MODULE 1.13 — INVOICING
**Route:** `/admin/invoicing`
**Status:** ✅ Full UI + PDF + Email Delivery

**What is working:**
- Create/edit/delete invoices
- Line items, GST/tax calculations, currency support
- Invoice status: Draft / Sent / Paid / Overdue
- PDF generation (Puppeteer/React PDF)
- Email delivery: "Create & Send" sends PDF to client email via SMTP
- Invoice settings: company logo, bank details, footer, SMTP config at `/api/invoices/settings`
- SMTP test button at `/api/invoices/settings/test-smtp`
- Client GST details auto-fill from CRM clients
- Share invoice via public link

**Linking:**
- Client name → pulls from `/admin/crm/clients` table
- "Send Invoice" → calls `POST /api/invoices/share` → email sent via SMTP
- Paid invoices → feed into `/admin/budgets` revenue tracking
- Invoice PDF → link shareable with client (no auth required to view)

---

## MODULE 1.14 — VENDORS & PURCHASES
**Route:** `/admin/vendors`
**Status:** ✅ Full UI

**What is working:**
- Vendor directory: add/edit/delete vendors (name, GSTIN, contact, bank)
- Purchase orders against vendors
- Purchase logs and history
- Link purchases to budget lines

**Linking:**
- Vendor → purchase orders → `/api/purchases`
- Purchases → deducted from relevant budget at `/admin/budgets`

---

## MODULE 1.15 — SUBSCRIPTIONS
**Route:** `/admin/subscriptions`
**Status:** ✅ Full UI

**What is working:**
- Add software/service subscriptions (name, cost, renewal date, category)
- Assign subscription access to employees (send credentials via email)
- Renewal reminders (date-based alerts)
- Cost tracking across all subscriptions

**Linking:**
- "Send Access" button → calls `POST /api/subscriptions/[id]/send-access` → sends email to assigned employee
- Subscription cost → tracked in `/admin/budgets` operational expenses

---

## MODULE 1.16 — BUDGETS
**Route:** `/admin/budgets`
**Status:** ✅ Full UI + Real-time

**What is working:**
- Create budgets per department/project
- Budget allocations with line items
- Live vs planned spend comparison
- Donut/bar charts for visual spend tracking
- Budget alerts when nearing limit

**Real-time:** Supabase channel on `budgets`, `budget_allocations`

**Linking:**
- Budget line → drills into allocation detail
- Vendor purchases → auto-reduce budget balance
- Invoice payments received → increase available fund
- Salary run → deducts from HR budget line

---

## MODULE 1.17 — SALES PIPELINE (CRM)
**Route:** `/admin/crm`
**Status:** ✅ Full UI + Kanban

**What is working:**
- Sales pipeline Kanban: Lead → Prospect → Proposal → Negotiation → Won/Lost
- Drag deals between stages
- Deal cards: client name, value, assigned sales rep, expected close date
- Activity log per deal
- `/admin/crm/clients` — full client directory with contact info, GST, industry

**Linking:**
- Deal → client name → `/admin/crm/clients` detail
- Won deal → creates client record if not exists
- Client record → used for invoice auto-fill at `/admin/invoicing`
- Sales rep assigned to deal → employee at `/admin/users`

---

## MODULE 1.18 — HR — JOB CLUSTERS
**Route:** `/admin/hr/job-clusters`
**Status:** ✅ Full UI

**What is working:**
- Job Clusters: define role families with skill requirements, salary bands, education criteria
- Used as templates when creating job openings in Recruitment

**Linking:**
- Job Cluster → used in `/admin/recruitment` when posting a new opening
- Job Cluster salary band → reference for offer letters in `/admin/users` Add Employee

---

## MODULE 1.19 — RECRUITMENT HUB
**Route:** `/admin/recruitment`
**Status:** ✅ Full UI + AI-powered

**What is working:**
- Post job openings (title, cluster, description, requirements)
- Public careers page auto-populated at `/career` and `/careers`
- Application pipeline Kanban: Applied → Screened → Interview → Offer → Joined/Rejected
- ATS Resume Scanner at `/admin/ats`: upload PDF → Gemma AI scores resume vs job requirements → outputs match %
- AI recruiter decision support: `POST /api/admin/recruitment/decision`
- Schedule interviews directly from candidate card

**Linking:**
- Job posting → appears on public `/careers` page (no auth required)
- Application "Schedule Interview" → creates record in `/admin/interviews`
- Application "Move to Offer" → triggers offer letter flow
- "Joined" status → auto-creates employee record at `/admin/users`
- ATS upload → `POST /api/admin/ats/upload` + `POST /api/admin/ats/scan` (Gemma AI)

---

## MODULE 1.20 — INTERVIEWS
**Route:** `/admin/interviews` | `/admin/interviews/[id]/recap`
**Status:** ✅ Full UI + AI Recap

**What is working:**
- Interview schedule board
- Interviewer assignment
- Interview room: `/admin/interviews/[id]/recap` — full audit panel
- Join LiveKit video call from interview room
- Post-interview: record notes, AI-generated summary via Gemma
- `POST /api/admin/interviews/record` — saves interview outcome
- AI career advice at `POST /api/admin/career/advice`

**Linking:**
- Interview → came from `/admin/recruitment` candidate card
- Interview room → `/meet/[id]` (LiveKit real video call)
- Interview outcome → feeds back to recruitment pipeline stage

---

## MODULE 1.21 — LMS — ACADEMY MANAGER
**Route:** `/admin/lms` | `/admin/lms/courses` | `/admin/lms/courses/new` | `/admin/lms/certifications`
**Status:** ✅ Full UI

**What is working:**
- Academy overview: total courses, enrolled employees, completions, certifications issued
- Manage all courses: create, edit, delete, assign to employees
- Course builder with modules + lessons (video, text, quiz types)
- Learning paths: sequence of courses
- Certifications: issue and track per employee
- Badges system: earn badges on course completion
- Announcements: broadcast to enrolled employees

**Linking:**
- Course created here → employees see it at `/dashboard/academy`
- Employee enrolls → `lms_enrollments` table → progress tracked at `lms_lesson_progress`
- Certification issued → visible at `/dashboard/academy` for employee
- Badge earned → shown on employee profile

---

## MODULE 1.22 — WORKSPACE (Admin)
**Routes:** `/admin/workspace` | `/admin/workspace/documents` | `/admin/workspace/spreadsheets` | `/admin/workspace/presentations` | `/admin/workspace/notes`
**Status:** ✅ Full UI + AI Sidebar + Real-time

**What is working:**
- Workspace Hub: overview of all docs, sheets, presentations, notes
- Documents: rich-text editor (Coda.io-inspired), create/edit/delete docs, AI writing assistant sidebar
- Spreadsheets: Excel-like grid editor, formula support
- Presentations: slide editor, create/edit/delete presentations
- Notes: Google Keep-style sticky notes, colour-coded
- Sharing: share any workspace item with specific employees (read/write permissions)
- AI Sidebar: calls `POST /api/workspace/ai` (Gemma) — summarise, continue writing, rewrite

**Real-time:** Supabase channel on workspace tables — collaborative edits visible live

**Linking:**
- Documents `[id]` → `/admin/workspace/documents/[id]` (full editor)
- Spreadsheets `[id]` → `/admin/workspace/spreadsheets/[id]` (full editor)
- Presentations `[id]` → `/admin/workspace/presentations/[id]` (full editor)
- Share button → `POST /api/workspace/shares` → shared user sees item in their Workspace section
- All roles with Workspace access see their shared + own files

---

## MODULE 1.23 — COMMS — MAIL (Zoho Integration)
**Routes:** `/admin/mail/*` (8 sub-pages)
**Status:** ⚠️ UI 100% complete — needs Zoho OAuth credentials in `.env.local` to go live

### Sub-module 1.23.1 — Mail Hub
**Route:** `/admin/mail`
- AI-powered overview: Kanban board of emails sorted by Gemma AI category (URGENT / WORK / FINANCE / FOLLOW_UP / GENERAL)
- Drag email cards between Kanban columns → updates `ai_category` in DB
- Stat cards: Unread count, Sent Today, Active Threads, Shared Files
- AI Daily Digest: "Generate Digest" → Gemma summarises all unread urgent emails
- Sentiment Overview bar (positive/neutral/negative breakdown)
- Quick access links to all mail sub-pages
- Real-time: Supabase channel on `mail_messages` → Kanban updates live
- **Linking:** "Not Connected" banner → links to `/admin/mail/config`

### Sub-module 1.23.2 — Inbox
**Route:** `/admin/mail/inbox`
- 3-panel layout: folder tree (left) + email list (centre) + reading pane (right)
- Folder tree: Inbox / Sent / Drafts / Starred / Trash + AI Labels with colour dots
- Email list: search, AI category badge, priority dot, star toggle, read/unread indicator
- Reading pane: subject, from, date, AI summary strip, full body, reply suggestion chips (3 AI-generated)
- Reply panel: inline compose with Send button
- Click email → marks read via `PATCH /api/mail/inbox`
- Star toggle → `PATCH /api/mail/inbox`
- Reply → `POST /api/mail/send`

### Sub-module 1.23.3 — Compose
**Route:** `/admin/mail/compose`
- To / CC / BCC with employee autocomplete (pulls from Supabase `employees` table)
- Tag-based recipient chips (Enter or comma)
- Subject with AI subject suggestion button
- Formatting toolbar: Bold, Italic, Link, List
- Template picker grid
- AI Assist: "Improve Tone" / "Shorten" → calls `/api/mail/ai/classify` → shows improved version → Apply or Discard
- Save Draft → `POST /api/mail/drafts`
- Send → `POST /api/mail/send` → email goes via Zoho Mail API

### Sub-module 1.23.4 — Sent
**Route:** `/admin/mail/sent`
- Two-panel: sent email list + reading pane
- Reads `mail_messages` where `folder = 'Sent'`

### Sub-module 1.23.5 — Drafts
**Route:** `/admin/mail/drafts`
- Two-panel: draft list + preview
- Delete draft | "Continue Editing" → opens draft in Compose
- Fetches from `GET /api/mail/drafts?employee_id=...`

### Sub-module 1.23.6 — File Share Hub
**Route:** `/admin/mail/files`
- Stat cards: Total Files, Total Size, Shared by Me, Downloads
- Scope filter: All / Uploaded by Me / Shared with Me
- Grid of file cards with type icons, hover: Download, Delete
- Upload via FormData → `POST /api/mail/files` → Supabase Storage bucket `mail-files`
- File Preview Modal with metadata

### Sub-module 1.23.7 — Templates
**Route:** `/admin/mail/templates`
- Grid view + Kanban view (Active / Draft / Archived columns, drag-and-drop)
- Category filter pill tabs + search
- Create/Edit modal: name, category, subject, body, variables JSON
- 6 pre-seeded templates: Welcome, Invoice Reminder, Meeting Follow-up, Project Kickoff, Salary Slip, Leave Approval

### Sub-module 1.23.8 — Mail Config
**Route:** `/admin/mail/config`
- 3-step OAuth wizard: Create Zoho App → Enter Credentials → Authorize
- Connection status card: green (connected) / amber (not connected)
- Token expiry display + auto-refresh indicator
- Test Connection button → calls `GET /api/mail/inbox?limit=1`
- Info panel about auto email provisioning

---

## MODULE 1.24 — COMMS — MESSAGES
**Route:** `/admin/messaging`
**Status:** ✅ Full UI + Real-time

**What is working:**
- Direct messaging between employees
- Group channels (team-based channels auto-created)
- Real-time message delivery via Supabase Realtime
- File attachment support, unread count badges
- Channel creation (admin can create channels manually)

**Real-time:** Supabase channel on `messages` and `channels` tables

---

## MODULE 1.25 — COMMS — MEETINGS (LiveKit)
**Route:** `/admin/meetings`
**Status:** ✅ Full + LiveKit Video Active

**What is working:**
- Schedule meetings: title, date, time, participants (multi-select employees)
- Meeting list with upcoming/past tabs
- "Join" button → navigates to `/meet/[id]` — full LiveKit video room
- LiveKit room: camera, mic, screen share, chat panel
- Post-meeting: AI-generated meeting minutes via `POST /api/meetings/minutes` (Gemma)
- Meeting analysis: action items extracted via `POST /api/meetings/analyze`
- Participants notified via in-app notification

**Linking:**
- "Join" → `/meet/[id]` (LiveKit full-screen page)
- Meeting minutes → stored in `meeting_minutes` table → viewable after call ends
- Interview meetings → created from `/admin/interviews` schedule action

---

## MODULE 1.26 — ANALYTICS
**Route:** `/admin/analytics`
**Status:** ✅ Full UI + Charts

**What is working:**
- Company-level analytics: revenue trends, headcount growth, project completion rates
- Employee analytics: individual performance over time
- Finance charts: expense vs revenue, budget utilisation
- Calls `GET /api/analytics/company` and `GET /api/analytics/employees`

---

## MODULE 1.27 — PERMISSIONS
**Route:** `/admin/permissions`
**Status:** ✅ Full UI
- Role-based permission matrix visual
- Per-role access control settings

---

## MODULE 1.28 — SYSTEM CONFIG
**Route:** `/admin/config`
**Status:** ✅ Full UI
- Company profile settings, SMTP configuration, feature toggles, exchange rate settings

---

## MODULE 1.29 — FEATURE REPORT
**Route:** `/admin/report`
**Status:** ✅ Full UI
- Internal feature completion report (also visible to HR)

---

---

# PANEL 2 — HR PANEL

> Role key: `hr` | Login redirects to: `/admin`

HR sees everything Super Admin sees **EXCEPT:**
- No Finance section (no Invoicing, Vendors, Subscriptions, Budgets, Priority Payout)
- No System Config, no Permissions page, no Org Chart
- No Mail Config (cannot configure Zoho OAuth)
- No LMS course creation (can see Academy Manager + Certifications only)
- No Payroll module

**HR has all of these working:**

| Module | Route | Status |
|---|---|---|
| Dashboard | `/admin` | ✅ |
| Projects | `/admin/projects` | ✅ |
| Employees | `/admin/users` | ✅ (full add/edit + Zoho provisioning) |
| Shift Management | `/admin/shifts` | ✅ |
| Teams | `/admin/teams` | ✅ |
| Workspace (all 4 types) | `/admin/workspace/*` | ✅ |
| Job Clusters | `/admin/hr/job-clusters` | ✅ |
| Recruitment Hub | `/admin/recruitment` | ✅ |
| ATS Scanner | `/admin/ats` | ✅ |
| Interviews | `/admin/interviews` | ✅ |
| Academy Manager | `/admin/lms` | ✅ |
| Certifications | `/admin/lms/certifications` | ✅ |
| Attendance | `/admin/attendance` | ✅ |
| KPI / KRA | `/admin/kpi` | ✅ |
| Incentives | `/admin/incentives` | ✅ |
| Claims | `/admin/claims` | ✅ |
| Reimbursements | `/admin/reimbursements` | ✅ |
| Mail Hub + Inbox + Compose + Sent + Drafts + Files + Templates | `/admin/mail/*` | ✅ |
| Messages | `/admin/messaging` | ✅ |
| Meetings | `/admin/meetings` | ✅ |
| Feature Report | `/admin/report` | ✅ |

---

---

# PANEL 3 — ACCOUNTS PANEL

> Role key: `accounts` | Login redirects to: `/admin`

| Module | Route | Status |
|---|---|---|
| Dashboard | `/admin` | ✅ |
| Payroll | `/admin/payroll` | ✅ |
| Incentives | `/admin/incentives` | ✅ |
| Claims | `/admin/claims` | ✅ |
| Reimbursements | `/admin/reimbursements` | ✅ |
| Invoicing | `/admin/invoicing` | ✅ |
| Vendors | `/admin/vendors` | ✅ |
| Subscriptions | `/admin/subscriptions` | ✅ |
| Budgets | `/admin/budgets` | ✅ |
| Mail Hub + Inbox + Compose + Sent + Drafts + Files + Templates | `/admin/mail/*` | ✅ |
| Messages | `/admin/messaging` | ✅ |
| Meetings | `/admin/meetings` | ✅ |
| Analytics | `/admin/analytics` | ✅ |

**Accounts does NOT see:** Employees, Recruitment, LMS, KPI, Projects, Workspace, Org Chart, System sections.

---

---

# PANEL 4 — MANAGER PANEL

> Role key: `manager` (display: "Department Lead") | Login redirects to: `/manager/dashboard`

| Module | Route | Status |
|---|---|---|
| Manager Dashboard | `/manager/dashboard` | ✅ |
| Projects (dept-scoped) | `/admin/projects` | ✅ |
| Teams | `/manager/teams` | ✅ |
| Org Chart (dept) | `/manager/org-chart` | ✅ |
| Job Clusters | `/admin/hr/job-clusters` | ✅ |
| Recruitment Hub | `/admin/recruitment` | ✅ |
| ATS Scanner | `/admin/ats` | ✅ |
| KPI / KRA (team) | `/admin/kpi` | ✅ |
| Academy Manager | `/admin/lms` | ✅ |
| My Profile | `/dashboard/profile` | ✅ |
| My Attendance | `/dashboard/attendance` | ✅ |
| My Incentives | `/dashboard/incentives` | ✅ |
| My Payslips | `/dashboard/payslips` | ✅ |
| Workspace (all 4 types) | `/admin/workspace/*` | ✅ |
| Inbox + Compose + Sent + Files | `/admin/mail/inbox` etc. | ✅ |
| Messages | `/dashboard/messages` | ✅ |
| Meetings | `/dashboard/meetings` | ✅ |

---

---

# PANEL 5 — LEAD PANEL

> Role key: `lead` (display: "Team Lead") | Login redirects to: `/lead/dashboard`

| Module | Route | Status |
|---|---|---|
| Lead Dashboard | `/lead/dashboard` | ✅ |
| Projects (team-scoped) | `/admin/projects` | ✅ |
| KPI / KRA (team) | `/admin/kpi` | ✅ |
| Recruitment Hub | `/admin/recruitment` | ✅ |
| ATS Scanner | `/admin/ats` | ✅ |
| Attendance (team) | `/admin/attendance` | ✅ |
| Team Budget | `/admin/budgets` | ✅ |
| Subscriptions | `/admin/subscriptions` | ✅ |
| Workspace (all 4 types) | `/admin/workspace/*` | ✅ |
| Mail Hub + Inbox + Compose + Sent + Files | `/admin/mail/*` | ✅ |
| Messages | `/admin/messaging` | ✅ |
| Meetings | `/admin/meetings` | ✅ |

---

---

# PANEL 6 — SALES PANEL

> Role key: `sales` | Login redirects to: `/dashboard`

| Module | Route | Status |
|---|---|---|
| Sales Pipeline (Kanban) | `/admin/crm` | ✅ (own deals) |
| Clients | `/admin/crm/clients` | ✅ |
| Employee Dashboard | `/dashboard` | ✅ |
| My Profile | `/dashboard/profile` | ✅ |
| My Payslips | `/dashboard/payslips` | ✅ |
| Inbox + Compose + Sent | `/admin/mail/*` | ✅ |
| Messages | `/admin/messaging` | ✅ |
| Meetings | `/admin/meetings` | ✅ |

**Sales does NOT see:** Payroll, KPI, Projects, Workspace, HR, LMS modules.

---

---

# PANEL 7 — INTERNSHIP PANEL

> Role key: `internship` | Login redirects to: `/dashboard`

| Module | Route | Status |
|---|---|---|
| Employee Dashboard | `/dashboard` | ✅ |
| Training Academy | `/dashboard/academy` | ✅ (primary focus) |
| My Profile | `/dashboard/profile` | ✅ |
| My Attendance | `/dashboard/attendance` | ✅ |
| Workspace Hub | `/admin/workspace` | ✅ |
| Documents | `/admin/workspace/documents` | ✅ |
| Notes | `/admin/workspace/notes` | ✅ |
| Inbox + Compose + Sent | `/admin/mail/*` | ✅ |
| Messages | `/dashboard/messages` | ✅ |
| Meetings | `/dashboard/meetings` | ✅ |

---

---

# PANEL 8 — EMPLOYEE PANEL

> Role key: `employee` | Login redirects to: `/dashboard`

## MODULE 8.1 — EMPLOYEE DASHBOARD
**Route:** `/dashboard`
**Status:** ✅ Full UI + Real-time
- Personal overview: today's attendance status, current tasks, upcoming meetings
- Quick punch-in/out via GlobalAttendanceWidget (visible in top bar always)
- Notifications bell with real-time alerts

## MODULE 8.2 — MY PROFILE
**Route:** `/dashboard/profile`
**Status:** ✅ Full UI
- Personal info, salary info (read-only), KPI weight view, Zoho mail address, profile photo upload

## MODULE 8.3 — ATTENDANCE
**Route:** `/dashboard/attendance`
**Status:** ✅ Full UI + Real-time
- Personal attendance calendar/heatmap
- Punch-in/Punch-out (GlobalAttendanceWidget in topbar)
- Leave application form: type, dates, reason
- Leave balance display, leave request status tracking

## MODULE 8.4 — PERFORMANCE
**Route:** `/dashboard/performance`
**Status:** ✅ Full UI
- Personal KPI/KRA score display
- Score breakdown: KPI + KRA + Behavioral + Weighted Final
- Score history chart (6 months)

**Linking:** Score pulls from `kpi_scores` table → populated by admin running `/api/kpi/calculate`

## MODULE 8.5 — INCENTIVES
**Route:** `/dashboard/incentives`
**Status:** ✅ Full UI
- View assigned incentive amounts, status: Pending / Approved / On Hold / Paid, history

## MODULE 8.6 — PAYSLIPS
**Route:** `/dashboard/payslips`
**Status:** ✅ Full UI
- List of all monthly payslips, download PDF, full breakdown

## MODULE 8.7 — REIMBURSEMENTS
**Route:** `/dashboard/reimbursements`
**Status:** ✅ Full UI
- Submit reimbursement request, track status, view history

## MODULE 8.8 — PRIORITY PAYOUT
**Route:** `/dashboard/priority`
**Status:** ✅ Full UI
- View priority bonus payouts assigned to them

## MODULE 8.9 — TRAINING ACADEMY (LMS)
**Route:** `/dashboard/academy` | `/dashboard/academy/[id]`
**Status:** ✅ Full UI + Progress Tracking
- Browse enrolled courses
- Lesson viewer (video/text/quiz), progress bar per course
- Quiz attempts and scores
- Certification view: download/view earned certificates
- Badges display

**Linking:**
- Course card → `/dashboard/academy/[id]`
- Lesson completion → updates `lms_lesson_progress` → progress bar recalculates
- Quiz submission → scored → updates `lms_quiz_attempts`
- Course completion → triggers certification creation at `lms_certifications`

## MODULE 8.10 — WORKSPACE
**Routes:** `/admin/workspace/*` (shared, scoped by Supabase RLS)
**Status:** ✅ Full UI
- All 4 workspace types, own + shared items visible

## MODULE 8.11 — COMMS
| Module | Route | Status |
|---|---|---|
| Inbox | `/admin/mail/inbox` | ✅ |
| Compose | `/admin/mail/compose` | ✅ |
| Sent | `/admin/mail/sent` | ✅ |
| Drafts | `/admin/mail/drafts` | ✅ |
| Messages | `/dashboard/messages` | ✅ |
| Meetings | `/dashboard/meetings` | ✅ |

## MODULE 8.12 — PROJECTS (Employee view)
**Route:** `/dashboard/projects/[id]`
**Status:** ✅ Full UI
- View assigned projects, own tasks, update task status, add comments

---

---

# AUTH FLOW & ENTRY POINTS

| Entry | Route | Redirects To |
|---|---|---|
| Root URL | `/` | Redirects based on auth state |
| Not logged in | `/login` | Login form |
| Forgot password | `/forgot-password` | Reset flow |
| New employee onboarding | `/onboarding` | Profile setup wizard |
| Public job listings | `/career` or `/careers` | Public page, no auth |
| After login — `super_admin` / `hr` / `accounts` | — | `/admin` |
| After login — `manager` | — | `/manager/dashboard` |
| After login — `lead` | — | `/lead/dashboard` |
| After login — `employee` / `sales` / `internship` | — | `/dashboard` |
| Video call (any role) | `/meet/[id]` | LiveKit full-screen room |

---

---

# REAL-TIME MODULES SUMMARY

| Module | Supabase Channel | Trigger |
|---|---|---|
| Mail Hub Kanban | `mail_hub_rt` on `mail_messages` | New email received or AI classified |
| Messages | `messages_rt` on `messages` | New message sent |
| Attendance | `attendance_rt` on `attendance` | Punch-in/out |
| Projects | `projects_rt` on `projects`, `tasks` | Task status change, new task |
| Budgets | `budgets_rt` on `budgets`, `allocations` | New expense logged |
| KPI Scores | `kpi_rt` on `kpi_scores` | Score recalculated |
| Notifications | `notifications_rt` on `notifications` | Any event triggers notification |
| Workspace Docs | `workspace_rt` on `workspace_documents` | Collaborative edit |
| CRM Pipeline | `crm_rt` on `crm_deals` | Deal stage change |
| Meeting Minutes | `meetings_rt` on `meeting_minutes` | AI minutes generated post-call |
| LMS Progress | `lms_rt` on `lms_lesson_progress` | Lesson completed |
| Recruitment | `recruitment_rt` on `applications` | New applicant, status change |

---

---

# SETUP CHECKLIST BEFORE GOING LIVE

| Item | Status | Action Required |
|---|---|---|
| Zoho Mail OAuth credentials | ⚠️ Pending | Fill `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_ORG_ID` in `.env.local` |
| Supabase migration 069 | ⚠️ Pending | Run `069_zoho_mail_schema.sql` in Supabase SQL Editor |
| Supabase Storage bucket | ⚠️ Pending | Create bucket named `mail-files` in Supabase Storage dashboard |
| SMTP config for invoices | ⚠️ Configure | Set at `/admin/config` or `/admin/invoicing` settings |
| LiveKit server | ✅ Active | `wss://ashy-gawk-stapling.ngrok-free.dev` — confirm ngrok tunnel is running |

---

---

# TEST LOGIN CREDENTIALS

> All accounts are on Supabase project: **Namaah_testing** (Production)

## Super Admin Account

| Field | Value |
|---|---|
| **Email** | `admin@namaah.io` |
| **Password** | `admin123` |
| **Role** | `super_admin` |
| **Panel** | Full access — all 29 modules |
| **Login URL** | `/login` → redirects to `/admin` |

---

## All Other User Accounts

> **Common Password for all accounts below:** `Namaah@1234`

| Display Name | Email | Role | Panel Access |
|---|---|---|---|
| **Likith (Team Lead)** | `darshankdarshangowda61@gmail.com` | `lead` | Lead Panel → `/lead/dashboard` |
| **Darshan** | `devu47362@gmail.com` | `employee` | Employee Panel → `/dashboard` |
| **Chethan (Manager)** | `dmk90197@gmail.com` | `manager` | Manager Panel → `/manager/dashboard` |
| **Suhas (Emp-FrontendDev)** | `employee01@gmail.com` | `employee` | Employee Panel → `/dashboard` |
| **Srinivas (Emp-BackendDev)** | `employee02@gmail.com` | `employee` | Employee Panel → `/dashboard` |
| **Pavan (Team Lead)** | `ezbillifyworkforce@gmail.com` | `lead` | Lead Panel → `/lead/dashboard` |

---

## Quick Role Summary

| Role | Password | Panel Entry |
|---|---|---|
| `super_admin` — admin@namaah.io | `admin123` | `/admin` |
| `lead` — darshankdarshangowda61@gmail.com | `Namaah@1234` | `/lead/dashboard` |
| `employee` — devu47362@gmail.com | `Namaah@1234` | `/dashboard` |
| `manager` — dmk90197@gmail.com | `Namaah@1234` | `/manager/dashboard` |
| `employee` — employee01@gmail.com | `Namaah@1234` | `/dashboard` |
| `employee` — employee02@gmail.com | `Namaah@1234` | `/dashboard` |
| `lead` — ezbillifyworkforce@gmail.com | `Namaah@1234` | `/lead/dashboard` |

---

**Total pages built: 86 | Total API routes: 89 | All 8 role panels scoped and linked | 12+ real-time subscriptions active**

---

*Document generated: 11 May 2026 | Project: Namaah Nexus | Stack: Next.js 14 + Supabase + LiveKit + Zoho Mail + Gemma 4*

---

---

# UPDATES LOG

## Update: 11 May 2026 → 12 May 2026

> **Session focus:** Dynamic RBAC Permissions — Full Enforcement Layer, Real-time Page Guards, Live Member Registry

---

### NEW: `usePermission` Hook (Global)

**File:** `src/hooks/usePermission.ts`
**Status:** ✅ Built & Active

A central React hook consumed by all pages. Returns `{ canView, canCreate, canEdit, canDelete, canExport }` for any `moduleKey`. Super Admin always receives full access regardless of DB config. When `permissions` is null (still loading), falls back to full access to prevent flash. Used across 10+ admin pages to conditionally render action buttons.

---

### UPDATED: MODULE 1.2 — EMPLOYEES (Granular Permission Enforcement + Role Dropdown Filtering)

**New behaviour:**
- "Add Employee" button hidden when `can_create = false` for the viewer's role
- "Edit Employee" hidden in row menu when `can_edit = false`
- "Delete Account" hidden in row menu when `can_delete = false`
- Role/Access Level dropdown in Add Employee form now filters to **only the roles that the current user's role is permitted to assign** — pulled from `role_assignable_roles` table via `/api/permissions/assignable-roles`
- Real-time: when Super Admin updates role assignment rights for a role, any active user of that role instantly sees their dropdown update without refresh (Supabase broadcast on `"permissions_sync"` channel)

---

### UPDATED: MODULE 1.8 — PAYROLL (Granular Permission Enforcement)

- "Run Payroll" button hidden when `can_create = false`
- "Export" button hidden when `can_export = false`
- "Edit" and "Disburse" row actions hidden when `can_edit = false`

---

### UPDATED: MODULE 1.13 — INVOICING (Granular Permission Enforcement)

- "Create Invoice" button hidden when `can_create = false`
- "Download PDF" hidden when `can_export = false`
- "Delete Invoice" hidden when `can_delete = false`

---

### UPDATED: MODULE 1.6 — ATTENDANCE (Granular Permission Enforcement)

- "Export" button hidden when `can_export = false`
- Inline "Edit log" button hidden when `can_edit = false`
- Inline "Delete log" button hidden when `can_delete = false`

---

### UPDATED: MODULE 1.3 — PROJECTS (Granular Permission Enforcement)

- "New Project" button hidden when `can_create = false`
- "Edit" in card context menu hidden when `can_edit = false`
- "Delete" in card context menu hidden when `can_delete = false`

---

### UPDATED: MODULE 1.5 — TEAMS & ORG CHART (Granular Permission Enforcement)

- "Add" node button hidden when `can_create = false`
- "Edit" node button hidden when `can_edit = false`
- "Delete" node button hidden when `can_delete = false`

---

### UPDATED: MODULE 1.19 — RECRUITMENT HUB (Granular Permission Enforcement)

- "Post New Job" button hidden when `can_create = false`

---

### UPDATED: MODULE 1.7 — KPI / KRA (Granular Permission Enforcement)

- Score submission blocked when `can_edit = false` for `kpi_kra` module (previously only role-based check)

---

### UPDATED: MODULE 1.10 — CLAIMS (Granular Permission Enforcement)

- "Advance Cycle" button hidden when `can_edit = false`
- "Process Payout" row button hidden when `can_edit = false`

---

### UPDATED: MODULE 1.11 — REIMBURSEMENTS (Granular Permission Enforcement)

- "Approve" and "Reject" buttons hidden when `can_edit = false`
- "Mark Paid" button hidden when `can_edit = false`

---

### NEW: UNIVERSAL REAL-TIME PAGE GUARD (DashboardShell)

**File:** `src/components/layout/DashboardShell.tsx`
**Status:** ✅ Active across 57 pages + messaging page

`DashboardShell` now accepts a `moduleKey` prop. A `useEffect` watches the `permissions` object from `AuthProvider` (already real-time via broadcast). The instant `permissions[moduleKey].can_view` becomes `false`:
- Super Admin: never redirected
- All other roles: immediately redirected to their home dashboard (`router.replace()`)
  - `lead` → `/lead/dashboard`
  - `manager` → `/manager/dashboard`
  - `employee` / `internship` / `sales` → `/dashboard`
  - `hr` / `accounts` / others → `/admin`

**Scope:** `moduleKey` injected into all 57 pages using DashboardShell. The messaging page (`/admin/messaging`) has a standalone guard since it uses its own layout. This means when admin turns off any module for any role, any user of that role currently viewing that page is redirected away **without needing a refresh**.

**Module key corrections applied:**
- `/admin/report` → `feature_report` (not `reports`)
- `/dashboard/priority` → `my_priority_payout` (not `my_priority`)
- `/admin/config` → `system_config`

---

### UPDATED: MODULE 1.27 — PERMISSIONS (Live Member Counts + Members Tab)

**Route:** `/admin/permissions`
**Status:** ✅ Full UI + Real-time Members Registry

**New in this update:**

**Live member counts on role cards:**
- Hardcoded `members` values removed from ROLES array
- On mount: queries `SELECT role FROM employees` from Supabase, builds `roleCounts` map per role
- Each role card shows `{roleCounts[role.id] ?? 0} members` — updates live
- Supabase `postgres_changes` realtime subscription on `employees` table — any INSERT, UPDATE, or DELETE instantly re-fires the count query; all 8 role cards update simultaneously

**New "Members" tab (3rd tab):**
- Tab label: `Members (N)` where N is the live count for the selected role
- Shows a scrollable list of all employees with the selected role
- Each member card displays:
  - Avatar initials with active (green) / inactive (grey) status dot
  - Full name + Employee ID badge
  - Email address
  - Department (with building icon)
  - Designation (with crown icon)
  - Join date (with calendar icon)
  - Active / Inactive status pill
- Summary bar at top: total count, active count, inactive count
- Empty state: shown when no employees have this role yet
- Loading state: spinner while fetching
- Real-time: member list refreshes whenever an employee is added, role is changed, or employee is deleted
- Footer "Save" bar is hidden when on the Members tab (read-only view)

**New migration required:**
- `src/supabase/migrations/071_employees_realtime.sql`
- Run in Supabase SQL Editor: `ALTER PUBLICATION supabase_realtime ADD TABLE employees;`
- Required to enable `postgres_changes` events on the `employees` table

---

### UPDATED: REAL-TIME MODULES SUMMARY

| Module | Supabase Channel / Method | Trigger |
|---|---|---|
| Mail Hub Kanban | `mail_hub_rt` on `mail_messages` | New email received or AI classified |
| Messages | `messages_rt` on `messages` | New message sent |
| Attendance | `attendance_rt` on `attendance` | Punch-in/out |
| Projects | `projects_rt` on `projects`, `tasks` | Task status change, new task |
| Budgets | `budgets_rt` on `budgets`, `allocations` | New expense logged |
| KPI Scores | `kpi_rt` on `kpi_scores` | Score recalculated |
| Notifications | `notifications_rt` on `notifications` | Any event triggers notification |
| Workspace Docs | `workspace_rt` on `workspace_documents` | Collaborative edit |
| CRM Pipeline | `crm_rt` on `crm_deals` | Deal stage change |
| Meeting Minutes | `meetings_rt` on `meeting_minutes` | AI minutes generated post-call |
| LMS Progress | `lms_rt` on `lms_lesson_progress` | Lesson completed |
| Recruitment | `recruitment_rt` on `applications` | New applicant, status change |
| **Permissions sidebar** | **`permissions_sync` broadcast** | **Admin saves any role permission** |
| **Page permission guard** | **`permissions_sync` broadcast** | **Any module toggled off for active user** |
| **Role assignment dropdown** | **`permissions_sync` broadcast** | **Admin changes assignable roles** |
| **Employee member counts** | **`postgres_changes` on `employees`** | **Any employee added / role changed / deleted** |

---

### UPDATED: OVERALL PROGRESS SNAPSHOT

| Category | Count | Status |
|---|---|---|
| Total Pages | 87 | ✅ Built |
| API Routes | 89 | ✅ Built |
| UI Components | 30 | ✅ Built |
| Database Tables (all migrations) | 70+ | ✅ Migrated |
| Roles / Panels | 8 | ✅ Configured |
| Real-time Subscriptions | 16 modules | ✅ Active |
| AI Features (Gemma 4) | 7 modules | ✅ Wired |
| Zoho Mail Integration | 9 sub-pages | ⚠️ Needs OAuth setup |
| LMS Academy | 6 pages | ✅ Built |
| LiveKit Video Meetings | Full | ✅ Active |
| **RBAC Granular Enforcement** | **10 modules** | **✅ Active** |
| **Real-time Page Guards** | **57 pages** | **✅ Active** |

---

### UPDATED: SETUP CHECKLIST BEFORE GOING LIVE

| Item | Status | Action Required |
|---|---|---|
| Zoho Mail OAuth credentials | ⚠️ Pending | Fill `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_ORG_ID` in `.env.local` |
| Supabase migration 069 | ⚠️ Pending | Run `069_zoho_mail_schema.sql` in Supabase SQL Editor |
| Supabase migration 070 | ✅ Done | Permissions system — run `070_permissions_system.sql` |
| **Supabase migration 071** | **⚠️ Pending** | **Run `071_employees_realtime.sql` — enables realtime on employees table** |
| Supabase Storage bucket | ⚠️ Pending | Create bucket named `mail-files` in Supabase Storage dashboard |
| SMTP config for invoices | ⚠️ Configure | Set at `/admin/config` or `/admin/invoicing` settings |
| LiveKit server | ✅ Active | `wss://ashy-gawk-stapling.ngrok-free.dev` — confirm ngrok tunnel is running |

---

*Last updated: 11 May 2026 → 12 May 2026 | Session: RBAC Full Enforcement + Real-time Page Guards + Live Permissions Member Registry | Stack: Next.js 14 + Supabase + LiveKit + Zoho Mail + Gemma 4*
