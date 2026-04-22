# Namaah Nexus — Platform Transformation Plan
**Branch:** `preview` | **Version:** 1.0 | **April 2026**

---

## Current State (What Exists in Code)

| # | Module | Status | Tech |
|---|--------|--------|------|
| 1 | Auth (login/logout/session) | EXISTS | iron-session |
| 2 | Employee profiles + directory | EXISTS (partial) | MongoDB/User model |
| 3 | KPI / KRA scoring | EXISTS | MongoDB/KpiScore model |
| 4 | Incentive management | EXISTS | Full vesting/hold/claim logic |
| 5 | Claims management | EXISTS | Approval flow |
| 6 | Reimbursements | EXISTS | Approval flow |
| 7 | Priority payout requests | EXISTS | Queue system |
| 8 | Attendance (basic) | EXISTS | Google Sheets read |
| 9 | System config (CEO only) | EXISTS | MongoDB/SystemConfig |
| 10 | Wallet / transaction ledger | EXISTS | MongoDB |
| — | Roles: employee, hr, lead, super_admin | EXISTS | 4 roles only |

**Missing vs Proposal:** 2 roles + 8 entire modules + payroll + payslips + RLS + Flutter app

---

## Database Migration: MongoDB → Supabase

### What to Replace

| MongoDB / iron-session | Supabase Equivalent |
|---|---|
| `src/lib/db.ts` (mongoose connect) | `src/lib/supabase.ts` (supabase-js client) |
| `src/middleware/auth.ts` (iron-session) | Supabase Auth + RLS middleware |
| `src/models/*.ts` (Mongoose schemas) | SQL tables in Supabase |
| `multer` file uploads | Supabase Storage |
| Manual role checks in API routes | Row Level Security (RLS) policies |
| JWT in iron-session cookie | Supabase JWT (built-in) |

### Migration Steps (No Downtime)
1. **Audit & Map** — export MongoDB collections, map to SQL tables
2. **Schema + RLS** — create tables + write all 6 role policies BEFORE import
3. **Migrate + Verify** — run scripts, verify counts, run both DBs parallel 1 week
4. **Cutover** — remove MONGODB_URI, drop iron-session

---

## All 14 Modules — Build Checklist

### MODULE 01 — Employee & Team Management
**Status:** REVAMP + NEW features

- [ ] Employee profiles + directory → REVAMP (add team, designation fields)
- [ ] 21 teams + department hierarchy → NEW (`teams` table)
- [ ] Role-based access — 6 levels → REVAMP (add `accounts`, `sales` roles)
- [ ] Dynamic team creation by admin → NEW
- [ ] Org chart view → NEW (tree component)

**Tables:** `employees`, `teams`, `departments`
**Routes:** `/admin/employees`, `/admin/teams`, `/admin/org-chart`

---

### MODULE 02 — Attendance & Leaves
**Status:** NEW (replace Google Sheets with DB)

- [ ] Daily clock in / clock out → NEW (`attendance_logs` table)
- [ ] Leave request + approval flow → NEW (`leave_requests` table)
- [ ] Monthly attendance reports → NEW
- [ ] Leave balance tracker → NEW (`leave_balances` table)
- [ ] Auto-link attendance to payroll → NEW (deductions hook)

**Tables:** `attendance_logs`, `leave_requests`, `leave_balances`, `leave_types`
**Routes:** `/dashboard/attendance`, `/admin/attendance`, `/admin/leaves`

---

### MODULE 03 — KPI / KRA & Performance
**Status:** EXISTS → REVAMP + add team-level features

- [ ] KPI score entry per employee → EXISTS (KpiScore model)
- [ ] Weighted KRA tracking → EXISTS
- [ ] Team-level KPI view for leads → NEW
- [ ] Lead sets monthly targets for team → NEW (`kpi_targets` table)
- [ ] Performance history + trends → NEW (chart view)

**Tables:** `kpi_scores` (rename), `kpi_targets`
**Routes:** `/admin/kpi` (revamp), `/admin/kpi/team`

---

### MODULE 04 — Incentives & Payroll
**Status:** EXISTS (incentives) + NEW (payroll)

- [ ] Incentive management → EXISTS (migrate logic)
- [ ] Company multiplier system → EXISTS (migrate)
- [ ] Full payroll calculation → NEW (`payroll_runs` table)
- [ ] Payslip generation + PDF export → NEW (`payslips` table, @react-pdf/renderer)
- [ ] Vesting schedule tracking → REVAMP

**Tables:** `incentives`, `wallets`, `transactions`, `payroll_runs`, `payslips`
**Routes:** `/admin/payroll`, `/dashboard/payslips`

---

### MODULE 05 — Claims & Reimbursements
**Status:** REVAMP

- [ ] Claims management → REVAMP (multi-level approval)
- [ ] Reimbursements flow → REVAMP
- [ ] Receipt upload + cloud storage → NEW (Supabase Storage: `receipts` bucket)
- [ ] Multi-level approval chain → NEW (2-step: lead → accounts)
- [ ] Priority payout requests → REVAMP

**Tables:** `claims`, `reimbursements`, `priority_requests`
**Routes:** `/dashboard/claims`, `/dashboard/reimbursements`, `/admin/claims`

---

### MODULE 06 — Invoicing & Purchases
**Status:** ALL NEW

- [ ] Invoice creation + tracking → NEW
- [ ] Purchase order management → NEW
- [ ] Vendor / supplier records → NEW
- [ ] Payment status tracking → NEW
- [ ] Invoice PDF export → NEW (@react-pdf/renderer)

**Tables:** `invoices`, `purchase_orders`, `vendors`
**Routes:** `/admin/invoicing`, `/admin/vendors`
**Access:** Super Admin ✓, Accounts ✓ only

---

### MODULE 07 — Subscription Tracker
**Status:** ALL NEW

- [ ] All subscriptions in one place → NEW
- [ ] Assigned to team + person → NEW
- [ ] Renewal date alerts → NEW (cron job or Supabase scheduled function)
- [ ] Cost per team breakdown → NEW
- [ ] Active / unused status tracking → NEW

**Tables:** `subscriptions`
**Routes:** `/admin/subscriptions`
**Access:** Super Admin ✓, Accounts ✓, Lead ~ (own team)

---

### MODULE 08 — Team Budget Management
**Status:** ALL NEW

- [ ] Monthly budget per team → NEW
- [ ] Auto spend tracking → NEW (trigger on claims/invoices/subscriptions)
- [ ] Over-budget alerts → NEW
- [ ] Budget vs actuals view → NEW
- [ ] Rollover + carry-forward rules → NEW

**Tables:** `team_budgets`, `budget_transactions`
**Routes:** `/admin/budgets`
**Access:** Super Admin ✓, Accounts ✓, Lead ~ (own team)

---

### MODULE 09 — CRM — Leads & Pipeline
**Status:** ALL NEW

- [ ] Lead + prospect tracking → NEW
- [ ] Deal pipeline + stages → NEW (kanban)
- [ ] Follow-up reminders + tasks → NEW
- [ ] Client + customer records → NEW
- [ ] Deal revenue linked to finance → NEW (hook into budgets)

**Tables:** `leads`, `deals`, `clients`, `crm_tasks`
**Routes:** `/admin/crm`, `/admin/crm/pipeline`, `/admin/crm/clients`
**Access:** Super Admin ✓, Accounts ~ (revenue view), Sales ✓

---

### MODULE 10 — Analytics & Reporting
**Status:** REVAMP + NEW Power BI

- [ ] Company overview dashboard → REVAMP (StartupFinanceSnapshot.tsx)
- [ ] Power BI embedded reports → NEW (iframe embed + Azure AD token)
- [ ] Team-wise cost analytics → NEW
- [ ] Revenue vs expense trends → REVAMP
- [ ] Export reports — PDF / Excel → NEW

**Routes:** `/admin/analytics`
**Access:** Super Admin ✓, Accounts ✓, HR ~ (people analytics), Lead ~ (team)

---

### MODULE 11 — Internal Messaging
**Status:** ALL NEW

- [ ] Direct messages between users → NEW
- [ ] Team group channels → NEW
- [ ] Approval notifications → NEW (realtime trigger on status change)
- [ ] Supabase Realtime powered → NEW (messages table + subscription)
- [ ] Read receipts + timestamps → NEW

**Tables:** `messages`, `channels`, `channel_members`, `message_reads`
**Routes:** `/dashboard/messages`
**Access:** All 6 roles ✓

---

### MODULE 12 — Meetings & Scheduling
**Status:** ALL NEW

- [ ] Schedule meetings inside panel → NEW
- [ ] Google Meet API — auto link gen → NEW (Google Calendar API)
- [ ] Auto-notify all attendees → NEW (email via SMTP)
- [ ] Meeting history log → NEW
- [ ] Calendar view → NEW

**Tables:** `meetings`, `meeting_attendees`
**Routes:** `/admin/meetings`, `/dashboard/meetings`
**Access:** Super Admin ✓, Accounts ✓, HR ✓, Lead ✓, Employee ~ (invited only)

---

### MODULE 13 — Mobile App (Flutter)
**Status:** ALL NEW — separate repo

- [ ] Employee clock in / out on mobile → NEW
- [ ] Leave requests on mobile → NEW
- [ ] Expense submission + receipt photo → NEW
- [ ] KPI + payslip view → NEW
- [ ] Push notifications → NEW (Firebase FCM)

**Connects to:** Same Supabase backend (anon key + RLS)
**Repo:** Create `namaah-nexus-flutter` repo separately

---

### MODULE 14 — System & Configuration
**Status:** EXISTS → REVAMP + RLS

- [ ] System config — CEO only → EXISTS (migrate)
- [ ] MongoDB to Supabase migration → NEW (one-time scripts)
- [ ] Full audit logs + liability trail → NEW (`audit_logs` table)
- [ ] Feature report — all 6 roles → REVAMP
- [ ] Row Level Security policies → NEW (Supabase native)

**Tables:** `system_config`, `audit_logs`
**Routes:** `/admin/config` (revamp)

---

## 6 Roles — Access Matrix

| Module | Super Admin | Accounts | HR | Lead | Employee | Sales |
|--------|:-----------:|:--------:|:--:|:----:|:--------:|:-----:|
| Employee & team mgmt | ✓ | ~ | ✓ | ~ | ~ | ~ |
| Attendance & leaves | ✓ | ~ | ✓ | ~ | ~ | ~ |
| KPI / KRA | ✓ | — | ✓ | ~ | ~ | ~ |
| Incentives & payroll | ✓ | ✓ | ~ | — | ~ | ~ |
| Claims & reimburse | ✓ | ✓ | ~ | ~ | ~ | ~ |
| Invoicing & purchases | ✓ | ✓ | — | — | — | — |
| Subscription tracker | ✓ | ✓ | — | ~ | — | — |
| Team budgets | ✓ | ✓ | — | ~ | — | — |
| CRM — leads & pipeline | ✓ | ~ | — | — | — | ✓ |
| CRM — clients & deals | ✓ | ~ | — | — | — | ✓ |
| Analytics & reporting | ✓ | ✓ | ~ | ~ | — | ~ |
| Internal messaging | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Meetings & scheduling | ✓ | ✓ | ✓ | ✓ | ~ | ✓ |
| System & config | ✓ | — | — | — | — | — |

✓ Full | ~ Partial/own data | — No access

---

## Tech Stack (Final)

| Layer | Tool | Notes |
|---|---|---|
| DB + Auth + Storage + Realtime | Supabase | Free tier — 50K MAU, 500MB |
| Web panel | Next.js 15 + Vercel | Keep existing — no frontend migration |
| Mobile app | Flutter | New repo — iOS + Android |
| Meeting links | Google Meet API | Google Calendar API (free with Workspace) |
| Analytics | Power BI | Embedded in admin panel |
| Messaging | Supabase Realtime | Built-in — no extra service |
| File storage | Supabase Storage | Receipts, invoices, payslips |
| PDF export | @react-pdf/renderer | Payslips + invoices |
| Push notifications | Firebase FCM | Flutter app only |

---

## 16-Week Build Schedule

| Phase | Weeks | Focus | Modules |
|-------|-------|-------|---------|
| Phase 1 | 1–4 | Foundation & Migration | 01 (revamp) + 02 (new) + 14 (partial) + Auth rebuild |
| Phase 2 | 5–8 | Finance & Performance | 03 (revamp) + 04 (payroll) + 05 (revamp) + 06 + 07 |
| Phase 3 | 9–13 | CRM + Budgets + Communication | 08 + 09 + 11 + 12 |
| Phase 4 | 14–16 | Analytics + Mobile + Go Live | 10 + 13 + full QA + UAT |

---

## Files to Create (Phase 1 — Start Now)

```
src/
├── lib/
│   ├── supabase.ts            ← Supabase client (replaces db.ts)
│   └── supabase-server.ts     ← Server-side Supabase client
├── middleware.ts              ← Supabase auth middleware (replaces iron-session)
├── types/
│   └── database.types.ts      ← Generated from Supabase schema
└── supabase/
    ├── schema.sql             ← Full SQL schema — all 14 modules
    ├── rls.sql                ← All RLS policies for 6 roles
    └── seed.sql               ← Initial seed data
```

---

## How to Start (Right Now)

1. Create Supabase project at https://supabase.com
2. Copy URL + keys into `.env.local` (file already created)
3. Run `schema.sql` in Supabase SQL editor
4. Run `rls.sql` to apply all role policies
5. `npm install @supabase/supabase-js @supabase/ssr`
6. Start Phase 1 coding on `preview` branch

---

*This plan is on branch `preview`. main is protected. All development happens here until full QA passes.*
