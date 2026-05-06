# Namaah Nexus — Developer Handoff
**Branch:** `preview` | **Date:** April 8, 2026 | **Prepared by:** Accounts & Finance Lead

> **Context:** This is a platform transformation of Namaah Nexus — Namaah Startup's internal ops system.
> We are migrating from MongoDB → Supabase and building 14 modules for 80+ people across 21 teams.
> **All work must stay on the `preview` branch. `main` is protected.**

---

## Repo Setup (Do This First)

```bash
git clone <repo-url>
cd Finanace_Dashboard
git checkout preview
npm install
npm install @supabase/supabase-js @supabase/ssr   # not yet installed — do this
cp .env.example .env.local
# Fill in .env.local with Supabase credentials (see section below)
npm run dev
```

---

## Environment Variables

Copy `.env.example` → `.env.local`. The **4 Supabase keys** are required to run anything:

| Key | Where to get |
|-----|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → Project → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → `service_role` secret |
| `SUPABASE_JWT_SECRET` | Settings → API → JWT Settings → JWT Secret |

The rest (Google Meet, Power BI, Firebase, SMTP) are needed only when those modules get wired up.

---

## What Has Been Done ✅

### Infrastructure
- [x] `src/lib/supabase.ts` — browser Supabase client (needs `@supabase/ssr` installed)
- [x] `src/lib/supabase-server.ts` — server-side Supabase client + service-role client
- [x] `src/types/database.types.ts` — full TypeScript types for all 14 module tables
- [x] `.env.example` — all environment variables documented
- [x] `.env.local` — created (credentials not filled — do not commit this file)

### Design System
- [x] `src/app/globals.css` — complete CSS variable system for dark/light mode
  - All colours use CSS vars (`--background`, `--foreground`, `--border`, `--card`, etc.)
  - Utility classes: `.field`, `.page-card`, `.stat-card`, `.data-table`
  - Custom scrollbar, print styles

### Layout Components
- [x] `src/components/layout/Sidebar.tsx` — **fully rebuilt**
  - All 14 modules in grouped sections
  - All 6 roles: super_admin, accounts, hr, lead, employee, sales
  - Dark/light mode toggle works correctly
  - Role badge with colour per role
- [x] `src/components/layout/DashboardShell.tsx` — updated
  - Accepts `subtitle` and `actions` props (page header buttons)
  - Sticky header, proper dark/light theme

### Pages Built (Frontend Only — No API calls yet)
- [x] `/admin/teams` — 21 teams grid, department filter, search (`src/app/admin/teams/page.tsx`)
- [x] `/admin/org-chart` — interactive org tree, collapsible nodes (`src/app/admin/org-chart/page.tsx`)
- [x] `/admin/payroll` — payroll table, month/year selector, run payroll (`src/app/admin/payroll/page.tsx`)

---

## What Is Pending ❌ (Your Job)

### A — Pages to Build (Frontend UI only, use mock data, no API)

Follow the exact same pattern as the completed pages. Use `DashboardShell`, `.page-card`, `.stat-card`, `.data-table`, `.field` classes. All pages must work in **both dark and light mode**.

| # | Page | Route | Key UI Elements |
|---|------|--------|-----------------|
| 1 | Employee Payslips | `/dashboard/payslips` | List by month, download PDF button, net/gross breakdown |
| 2 | Invoicing | `/admin/invoicing` | Invoice list table, status filter (draft/sent/paid/overdue), create button |
| 3 | Vendors | `/admin/vendors` | Vendor cards/table, category filter, total spend per vendor |
| 4 | Subscription Tracker | `/admin/subscriptions` | Cards grid, renewal date alerts, cost per team, active/inactive toggle |
| 5 | Team Budgets | `/admin/budgets` | Each team: budget vs spent progress bar, over-budget in red, month selector |
| 6 | CRM Pipeline | `/admin/crm` | Kanban board — 5 columns: New → Contacted → Proposal → Negotiation → Won/Lost |
| 7 | CRM Clients | `/admin/crm/clients` | Table: company, contact, email, total revenue, last activity |
| 8 | Analytics | `/admin/analytics` | Revenue vs expense chart, team cost breakdown, Power BI embed placeholder |
| 9 | Messaging | `/admin/messaging` | Chat layout — left: conversation list, right: message thread + send box |
| 10 | Meetings | `/admin/meetings` | Upcoming meetings list, schedule button, calendar view, Google Meet link badge |
| 11 | Employee Messages | `/dashboard/messages` | Same chat UI as admin/messaging but employee-scoped |
| 12 | Employee Meetings | `/dashboard/meetings` | Meetings the employee is invited to |

### B — Existing Pages to Revamp (switch inline styles → CSS vars)

These pages currently use hardcoded hex colors in `style={{}}` attributes which break light mode. Replace all `style={{ background: "#08101d" }}` type code with Tailwind `bg-card`, `bg-background`, `text-foreground`, etc.

| Page | File | What to fix |
|------|------|-------------|
| Employee Dashboard | `src/app/dashboard/page.tsx` | All inline `style={{}}` gradient backgrounds → Tailwind |
| Admin Overview | `src/app/admin/page.tsx` | Same — hardcoded dark hex colors |
| KPI Entry | `src/app/admin/kpi/page.tsx` | Background styles |
| Incentives Admin | `src/app/admin/incentives/page.tsx` | Background styles |
| System Config | `src/app/admin/config/page.tsx` | Background styles |

### C — Admin Report Page Update

`src/app/admin/report/page.tsx` currently shows only 3 roles and 10 features. Update it to show:
- All **6 roles**: Super Admin, Accounts, HR, Lead, Employee, Sales
- All **14 modules** with ✓ / ~ / — access per role (see access matrix in `PLAN.md`)

### D — Supabase Schema (Run in Supabase SQL Editor)

Create the database by running these SQL files in order in the Supabase SQL editor:
1. `src/supabase/schema.sql` — **needs to be created** (all tables for 14 modules)
2. `src/supabase/rls.sql` — **needs to be created** (Row Level Security for 6 roles)
3. `src/supabase/seed.sql` — **needs to be created** (initial data: admin user, config)

Use `src/types/database.types.ts` as the reference — all table names and column types are defined there.

### E — Auth Migration (After all frontend pages are done)

The current auth uses `iron-session` + MongoDB. This needs to be replaced with Supabase Auth:

1. **`src/middleware.ts`** — replace iron-session check with Supabase session check
2. **`src/app/api/auth/login/route.ts`** — replace with Supabase `signInWithPassword`
3. **`src/app/api/auth/logout/route.ts`** — replace with Supabase `signOut`
4. **`src/app/api/auth/me/route.ts`** — replace with Supabase `getUser`
5. **`src/components/layout/AuthProvider.tsx`** — wire to Supabase session

### F — API Routes Migration (After auth is done)

Replace each MongoDB/Mongoose API route with Supabase queries. Do one module at a time:

| Priority | Module | API Files |
|----------|--------|-----------|
| 1 | Users/Employees | `src/app/api/users/` |
| 2 | KPI | `src/app/api/kpi/` |
| 3 | Incentives | `src/app/api/incentives/` |
| 4 | Claims | `src/app/api/claims/` |
| 5 | Reimbursements | `src/app/api/reimbursements/` |
| 6 | Wallet | `src/app/api/wallet/` |
| 7 | Priority | `src/app/api/priority/` |
| 8 | Attendance | `src/app/api/attendance/` |
| 9 | Config | `src/app/api/config/` |

### G — New API Routes (New modules have no APIs yet)

| Module | Route to create |
|--------|----------------|
| Payroll | `src/app/api/payroll/route.ts` |
| Invoicing | `src/app/api/invoicing/route.ts` |
| Vendors | `src/app/api/vendors/route.ts` |
| Subscriptions | `src/app/api/subscriptions/route.ts` |
| Budgets | `src/app/api/budgets/route.ts` |
| CRM Leads | `src/app/api/crm/leads/route.ts` |
| CRM Clients | `src/app/api/crm/clients/route.ts` |
| Messages | `src/app/api/messages/route.ts` |
| Meetings | `src/app/api/meetings/route.ts` |

---

## Design Rules (Follow These Exactly)

### Component Pattern
Every page must follow this shell:
```tsx
export default function SomePage() {
  return (
    <DashboardShell
      title="Page Title"
      subtitle="One line description"
      actions={<button>Action</button>}  // optional
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">...</div>
      </div>

      {/* Main content */}
      <div className="page-card">
        <table className="data-table">...</table>
      </div>
    </DashboardShell>
  );
}
```

### CSS Classes to Use
| Purpose | Class |
|---------|-------|
| Page section card | `page-card` |
| Stat/metric card | `stat-card` |
| Table | `data-table` (on `<table>`) |
| Input / select | `field` |
| Muted text | `text-muted` |
| Subtle text | `text-subtle` |
| Page background | `bg-background` |
| Card background | `bg-card` |
| Border | `border-default` |
| Success badge bg | `bg-success-subtle` |
| Warning badge bg | `bg-warning-subtle` |
| Danger badge bg | `bg-danger-subtle` |

### Never Use
- `style={{ background: "#..." }}` — use Tailwind classes
- `bg-white` or `bg-gray-900` directly — use `bg-card` or `bg-background`
- `text-gray-X` for primary text — use `text-foreground` or `text-muted`
- Hardcoded colors that don't respond to dark/light mode

### Colors (Tailwind classes are fine for accents)
- Primary action: `bg-sky-600 hover:bg-sky-700 text-white`
- Success: `text-emerald-600`, `bg-emerald-100 dark:bg-emerald-900/30`
- Warning: `text-amber-600`, `bg-amber-100 dark:bg-amber-900/30`
- Danger: `text-red-500`, `bg-red-100 dark:bg-red-900/30`
- Purple: `text-purple-600`, `bg-purple-100 dark:bg-purple-900/30`

---

## File Reference

```
src/
├── app/
│   ├── globals.css              ✅ done — CSS variable system
│   ├── admin/
│   │   ├── page.tsx             ⚠️  revamp needed (inline styles)
│   │   ├── users/page.tsx       ✅ works
│   │   ├── teams/page.tsx       ✅ done
│   │   ├── org-chart/page.tsx   ✅ done
│   │   ├── kpi/page.tsx         ⚠️  revamp needed
│   │   ├── incentives/page.tsx  ⚠️  revamp needed
│   │   ├── payroll/page.tsx     ✅ done (frontend only)
│   │   ├── claims/page.tsx      ✅ works
│   │   ├── reimbursements/      ✅ works
│   │   ├── priority/page.tsx    ✅ works
│   │   ├── invoicing/           ❌ build this
│   │   ├── vendors/             ❌ build this
│   │   ├── subscriptions/       ❌ build this
│   │   ├── budgets/             ❌ build this
│   │   ├── crm/page.tsx         ❌ build this (pipeline kanban)
│   │   ├── crm/clients/         ❌ build this
│   │   ├── analytics/           ❌ build this
│   │   ├── messaging/           ❌ build this
│   │   ├── meetings/            ❌ build this
│   │   ├── config/page.tsx      ⚠️  revamp needed
│   │   └── report/page.tsx      ⚠️  update to 6 roles + 14 modules
│   └── dashboard/
│       ├── page.tsx             ⚠️  revamp needed (inline styles)
│       ├── attendance/          ✅ works
│       ├── performance/         ✅ works
│       ├── incentives/          ✅ works
│       ├── payslips/            ❌ build this
│       ├── reimbursements/      ✅ works
│       ├── priority/            ✅ works
│       ├── messages/            ❌ build this
│       └── meetings/            ❌ build this
├── components/layout/
│   ├── Sidebar.tsx              ✅ done — all 14 modules, 6 roles
│   ├── DashboardShell.tsx       ✅ done — subtitle + actions props
│   ├── AuthProvider.tsx         ⚠️  needs Supabase auth wiring (after pages done)
│   └── ThemeProvider.tsx        ✅ works
├── lib/
│   ├── supabase.ts              ✅ done (needs npm install)
│   ├── supabase-server.ts       ✅ done (needs npm install)
│   ├── db.ts                    ⚠️  keep until MongoDB migration done
│   ├── session.ts               ⚠️  keep until auth migration done
│   └── utils.ts                 ✅ works
├── types/
│   └── database.types.ts        ✅ done — all table types defined
├── supabase/                    ❌ create this folder
│   ├── schema.sql               ❌ create this
│   ├── rls.sql                  ❌ create this
│   └── seed.sql                 ❌ create this
├── models/                      ⚠️  keep until MongoDB migration done
└── middleware/
    └── auth.ts                  ⚠️  keep until auth migration done
```

---

## Order of Work (Recommended)

1. `npm install @supabase/supabase-js @supabase/ssr`
2. Build all missing frontend pages (Section A above) — no API calls, mock data only
3. Revamp existing pages with inline styles (Section B)
4. Update report page (Section C)
5. Create Supabase SQL schema files (Section D)
6. Run schema in Supabase dashboard
7. Migrate auth to Supabase (Section E)
8. Migrate existing API routes (Section F)
9. Build new API routes (Section G)
10. Full QA — test dark + light mode on every page, every role

---

## Questions / Context

- This is an internal tool for Namaah Startup — 80+ employees, 21 teams
- The person who owns this project is the Accounts & Finance Lead
- All costs must stay at Rs 0/month — use free tiers only
- Reference `PLAN.md` for the full 14-module specification and access matrix
- Reference `Namaah_Pulse_Transformation_Proposal.pdf` for business context
