# Namaah Panel — Zoho Mail & Calendar Integration Spec

**Prepared for:** Engineering Team
**Prepared by:** Nehal Shenoy, Finance Lead, Namaah
**Version:** 1.0
**Date:** May 2026
**Status:** Ready for implementation

---

## 1. Executive Summary

Namaah is integrating Zoho Mail and Zoho Calendar into the internal panel so that **every employee, lead, and admin manages email and scheduling without ever leaving the Namaah app**.

The integration covers:

1. **Auto-provisioning** of Zoho mailboxes when HR creates a user.
2. **Dual-identity login** — users can log in with their personal email OR their assigned Zoho email; both share one password.
3. **Embedded Zoho Mail UI** via iframe + SAML SSO (no separate login to mail.zoho.com).
4. **Unified Account Selector** across every email-sending flow (payslips, offer letters, vendor comms, compose).
5. **Embedded Calendar** (dashboard widget + full-page view) with per-department shared calendars.
6. **Auto-generated recurring reminders** for payroll, statutory compliance, and dept-specific events.
7. **Role-based access control** across the panel: Admin → Department Lead → Team Lead → Employee → Intern.

**Platform target:** Desktop web only for v1. Mobile out of scope.

**Frontend stack:** React / Next.js (existing Namaah panel).

---

## 2. Roles & Permissions

Namaah has five roles in strict hierarchy. Each role inherits NOTHING automatically — permissions are explicit per the matrix below.

| Role | Description |
|---|---|
| **Admin** | Top-level access. HR is a function under Admin (i.e. an Admin can act as HR). Can do anything. |
| **Department Lead** | Owns one department (Engineering / Accounts / HR / Content). Sees the whole department including teams nested inside. |
| **Team Lead** | Owns one team inside a department. Sees only their team members. Mail-wise: only sees their own personal Zoho mailbox. |
| **Employee** | Standard full-time member. Has personal Zoho mailbox. |
| **Intern** | Same as Employee for mail purposes — personal Zoho mailbox auto-provisioned. Distinguished in HR/payroll modules only (stipend logic, training periods, etc.). |

### 2.1 Permission Matrix

| Action | Admin | Dept Lead | Team Lead | Employee | Intern |
|---|:---:|:---:|:---:|:---:|:---:|
| Create / disable employees & interns | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create / disable departments | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create / manage Zoho shared mailboxes | ✅ (in Zoho admin) | ❌ | ❌ | ❌ | ❌ |
| View all employees org-wide | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all employees in own department | ✅ | ✅ | ❌ | ❌ | ❌ |
| View own team members | ✅ | ✅ | ✅ | ❌ | ❌ |
| Send payslips | ✅ | ❌ | ❌ | ❌ | ❌ |
| Send offer letters | ✅ | ❌ | ❌ | ❌ | ❌ |
| Read personal Zoho mailbox | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read department shared mailboxes | ✅ | ✅ (own dept) | ❌ | ❌ | ❌ |
| Send from shared mailboxes | ✅ | ✅ (own dept) | ❌ | ❌ | ❌ |
| Create dept-wide calendar events | ✅ | ✅ (own dept) | ❌ | ❌ | ❌ |
| Create personal calendar events | ✅ | ✅ | ✅ | ✅ | ✅ |
| View statutory compliance reminders | ✅ | ✅ (dept-relevant) | ❌ | ❌ | ❌ |

---

## 3. Tech Stack & Prerequisites

### 3.1 Stack

| Layer | Technology |
|---|---|
| Frontend | React / Next.js |
| Backend | (Existing Namaah backend — Node/Express assumed) |
| Database | Postgres / Supabase |
| Email Provider | Zoho Mail (organization plan, custom domain) |
| Calendar Provider | Zoho Calendar (bundled with Zoho Mail) |
| Auth — Panel | Email + bcrypt password, JWT session |
| Auth — Zoho APIs | OAuth 2.0 (Server-based App) |
| Auth — Iframe Embed | SAML 2.0 SSO (Namaah = IdP, Zoho = SP) |

### 3.2 Prerequisites (Zoho admin work — done BEFORE coding)

1. Zoho Mail organization plan purchased for `namaah.com` (or final domain).
2. Domain verified inside Zoho (DNS TXT record).
3. MX, SPF, DKIM, DMARC records configured.
4. Super Admin account created.
5. Standard shared mailboxes created manually in Zoho admin (`accounts@`, `hr@`, `info@`, `careers@`, `support@`, `payroll@`, `invoices@`, `noreply@`, etc.). **Per Nehal: these are NOT auto-spawned by the app.**
6. Server-based Application registered at `api-console.zoho.com`:
   - Client ID + Client Secret stored in backend `.env`.
   - Redirect URI: `https://panel.namaah.com/api/auth/zoho/callback`.
   - All scopes from Section 4.3 requested.
7. SAML SSO configured (Namaah backend as IdP, Zoho as SP). Metadata exchanged.

---

## 4. Authentication

### 4.1 User Database Model

```sql
-- users table
id                  uuid PRIMARY KEY
personal_email      text UNIQUE NOT NULL    -- onboarding email, permanent login
zoho_email          text UNIQUE             -- provisioned mailbox, also a login
password_hash       text NOT NULL           -- shared between both login emails
role                text NOT NULL           -- 'admin' | 'dept_lead' | 'team_lead' | 'employee' | 'intern'
department_id       uuid REFERENCES departments(id)
team_id             uuid REFERENCES teams(id)
zoho_user_id        text                    -- 'zuid' from Zoho
zoho_account_id     text                    -- 'accountId' from Zoho
zoho_refresh_token  text                    -- encrypted at rest
status              text NOT NULL           -- 'active' | 'offboarding' | 'disabled'
offboarded_at       timestamptz             -- when disable countdown started
created_at          timestamptz DEFAULT now()
updated_at          timestamptz DEFAULT now()

-- departments table
id          uuid PK
name        text NOT NULL   -- 'Engineering' | 'Accounts' | 'HR' | 'Content'
lead_id     uuid REFERENCES users(id)

-- teams table
id              uuid PK
name            text NOT NULL
department_id   uuid REFERENCES departments(id)
lead_id         uuid REFERENCES users(id)

-- account_access table (which Zoho accounts a user can access in their panel)
id              uuid PK
user_id         uuid REFERENCES users(id)
zoho_account_id text NOT NULL
access_type     text NOT NULL   -- 'owner' | 'shared_read' | 'shared_send'
```

### 4.2 Login Flow

1. User submits login form with `email` + `password`.
2. Backend queries: `WHERE personal_email = $1 OR zoho_email = $1`.
3. Verify bcrypt hash against `password_hash`.
4. Reject if `status != 'active'`.
5. Issue JWT containing `user_id`, `role`, `department_id`, `team_id`.
6. On panel load, frontend calls `GET /api/zoho/sso-token` → returns short-lived SAML assertion for iframe.

### 4.3 OAuth Scopes Required

| Scope | Purpose |
|---|---|
| `ZohoMail.organization.accounts.CREATE` | Create mailbox on employee onboarding |
| `ZohoMail.organization.accounts.UPDATE` | Update / disable on offboarding |
| `ZohoMail.organization.accounts.READ` | List all org accounts |
| `ZohoMail.messages.ALL` | Send & read messages |
| `ZohoMail.folders.ALL` | Manage folders |
| `ZohoMail.accounts.READ` | List accounts authenticated user can access |
| `ZohoMail.tasks.ALL` | Reminders / tasks |
| `ZohoCalendar.calendar.ALL` | Create & manage calendars |
| `ZohoCalendar.event.ALL` | Create, update, delete events |

### 4.4 Token Management

- Store refresh token encrypted (AES-256) at rest.
- Access tokens are short-lived (1 hour) — refresh automatically when API call returns 401.
- Use a single org-level admin refresh token for provisioning APIs; user-level tokens only if needed for user-scoped operations.

---

## 5. Core Flows

### 5.1 Employee/Intern Onboarding (Auto-Provisioning)

**Trigger:** Admin (or HR-function Admin) clicks "Create User" in HR module.

**Steps:**

1. **Form submission** — Admin enters: `full_name`, `personal_email`, `role` (employee/intern), `department`, `team`, `designation`, `joining_date`.
2. **Generate temp password** — random 12-char, bcrypt-hash it.
3. **Insert into `users`** with `status = 'active'`, `personal_email` set, `zoho_email = NULL` (yet).
4. **Call Zoho Mail Users API:**
   ```http
   POST https://mail.zoho.com/api/organization/{zoid}/accounts
   Authorization: Zoho-oauthtoken {access_token}
   Content-Type: application/json

   {
     "primaryEmailAddress": "<firstname>.<lastname>@namaah.com",
     "password": "<temp-password>",
     "displayName": "<full name>",
     "role": "member"
   }
   ```
5. **On success** → Zoho returns `zuid` and `accountId`. Update users row with `zoho_email`, `zoho_user_id`, `zoho_account_id`.
6. **Apply default signature** via Signatures API (see Section 6.3).
7. **Insert into `account_access`** with `access_type = 'owner'`.
8. **Send welcome email** to `personal_email` from `noreply@namaah.com` containing:
   - Panel URL
   - Both login emails (personal + new Zoho)
   - Temp password (force change on first login)
   - 3-line walkthrough
9. **Return success** to HR UI.

**Failure handling:**
- If Zoho API fails, ROLLBACK the users insert. Show clear error to Admin.
- If user exists in Zoho (rare collision), append numeric suffix (`firstname.lastname2@namaah.com`).

### 5.2 First-Time Login

1. User logs in at `panel.namaah.com` with `personal_email` + temp password.
2. System forces password change.
3. Backend re-hashes new password — this becomes the password for BOTH login emails going forward.
4. Dashboard loads. Embedded Zoho Mail iframe authenticates via SAML SSO automatically.
5. From this point, the user can also log in using `zoho_email` (same password).

### 5.3 Email Sending — Unified Account Selector

The Account Selector is a **reusable React component** used everywhere the panel sends email.

#### Component contract

```tsx
<AccountSelector
  context={'payslip' | 'offer_letter' | 'vendor' | 'compose' | 'announcement' | 'system'}
  value={selectedAccountId}
  onChange={(accountId) => ...}
/>
```

#### Behavior

- On mount, fetch `GET /api/users/me/accounts` → returns list of Zoho accounts current user can send from (based on `account_access` table + role).
- Render dropdown showing `displayName <email>`.
- Pre-select default based on `context` (see table below).
- User can override (unless role restricts — e.g. only Admin can send from `accounts@` for payslips).

#### Default selection by context

| Context | Default 'From' | Override allowed? |
|---|---|---|
| Payslip dispatch | `accounts@namaah.com` | Yes (Admin only) |
| Offer letter | `hr@namaah.com` | Yes (Admin only) |
| Vendor / invoice comms | `invoices@namaah.com` | Yes |
| Compose (free-form) | User's personal Zoho | Yes |
| Announcement | `info@namaah.com` | Yes (Admin only) |
| System notifications | `noreply@namaah.com` | No (locked) |

#### Send call

```http
POST https://mail.zoho.com/api/accounts/{accountId}/messages
Authorization: Zoho-oauthtoken {access_token}

{
  "fromAddress": "accounts@namaah.com",
  "toAddress": "employee@example.com",
  "subject": "Payslip — May 2026",
  "content": "<html>...</html>",
  "mailFormat": "html",
  "attachments": [ { "storeName": "...", "attachmentName": "May2026_Payslip.pdf", "attachmentPath": "..." } ]
}
```

#### Shared-mailbox archival

When an email is sent FROM a shared mailbox (e.g. `accounts@namaah.com`), automatically BCC the same shared mailbox so:
- A copy lands in the shared inbox.
- All dept leads with access to that mailbox can see what went out.

Implementation: backend appends BCC to the shared mailbox itself before calling the send API, except for `noreply@`.

#### Reply routing

When someone replies to an email sent from a shared mailbox:
- Reply lands in the **shared mailbox** (default Zoho behavior — replies go to From address).
- Reply also lands in the **original sender's personal mailbox** — achieved by setting `Reply-To` to BOTH `accounts@namaah.com` AND the sender's personal Zoho during the send call.

### 5.4 Embedded Mail UI

- Route: `/panel/mail`
- Renders a full-page iframe pointing to `https://mail.zoho.com/zm/#mail/folder/inbox`.
- Iframe authenticates automatically via the SAML SSO session set at login.
- A sidebar in the panel (outside iframe) shows:
  - List of accounts the user can access (personal + any shared).
  - Unread count badge per account (polled every 60s via Messages API `unreadCount`).
  - Clicking an account swaps the iframe `src` to that account's inbox URL.

### 5.5 Calendar Integration

#### 5.5.1 Dashboard widget
- Route: visible on `/panel` (dashboard home).
- Shows next 5 events for the user across:
  - Personal calendar
  - Department shared calendar (if user is in a dept that has one)
- Click any event → opens event detail modal.

#### 5.5.2 Full calendar view
- Route: `/panel/calendar`
- Day / week / month toggle.
- Color-coded by calendar source (personal = blue, department = green, statutory = red).
- "+ New Event" button → opens event creation modal with attendee picker (autocompletes from users table).

#### 5.5.3 Per-department shared calendars
- Auto-created in Zoho when a department is created in the panel.
- Department Leads can create events on the dept calendar.
- All members of the department see the dept calendar by default (read-only unless lead/admin).

#### 5.5.4 Statutory + payroll auto-reminders
Auto-create recurring events on the **Accounts department calendar** on system bootstrap:

| Reminder | Recurrence | Calendar |
|---|---|---|
| Generate payslips | 28th of every month | Accounts |
| TDS payment | 7th of every month | Accounts |
| GSTR-1 filing | 11th of every month | Accounts |
| GSTR-3B filing | 20th of every month | Accounts |
| PF / ESI payment | 15th of every month | Accounts |
| Advance tax | Quarterly (15-Jun, 15-Sep, 15-Dec, 15-Mar) | Accounts |
| TDS return | Quarterly (31-Jul, 31-Oct, 31-Jan, 31-May) | Accounts |
| Intern training-period reviews | Per intern joining date + 90 days | HR |

> Final list to be confirmed against Nehal's statutory compliance calendar doc already produced.

#### 5.5.5 Reminder delivery
User-configurable in panel settings. Defaults:
- In-panel popup notification (15 mins before event)
- Email reminder (1 day before for major events, 15 mins before for meetings)

---

## 6. Cross-Cutting Concerns

### 6.1 Offboarding

When Admin marks a user as `offboarding`:
1. Set `status = 'offboarding'`, `offboarded_at = now()`.
2. User can still log in for 7 days (configurable) — keep mailbox active.
3. Forward all incoming mail to their Department Lead during this window.
4. After 7 days, a scheduled job:
   - Calls Zoho Users API to disable mailbox (`PUT /accounts/{zuid}/status` with `accountEnabled: false`).
   - Sets `status = 'disabled'` in Namaah users table.
   - Revokes panel login.
5. Mailbox data retained in Zoho per org retention policy (NOT deleted by the panel).

### 6.2 Email Signatures

Auto-applied template per account, set via Signatures API at provisioning time.

**Personal mailbox template:**
```
{{full_name}}
{{designation}} | {{department}}
Namaah | namaah.com
{{personal_phone_optional}}
```

**Shared mailbox templates** (set manually in Zoho admin once):
```
The {{Department}} Team
Namaah | namaah.com
```

Signatures should be re-pushed if user updates designation in HR module.

### 6.3 Attachments

- **Max size:** 25 MB per attachment (Zoho's hard limit is higher but cap conservatively).
- **Max total per email:** 25 MB.
- **Payslip-specific:** PDFs auto-generated by Accounts module. Filename format: `{{EmployeeID}}_Payslip_{{Month}}_{{Year}}.pdf`.
- **Password protection on payslip PDFs:** Use employee DOB (DDMMYYYY) as PDF password. Set during PDF generation, communicated in email body.

### 6.4 Notifications

- Unread email count badge per account in the panel sidebar (poll Messages API `unreadCount` every 60s).
- In-panel toast for new emails to user's personal inbox (poll same endpoint).
- Calendar reminders surface in panel as popup + (optional) email.

### 6.5 Audit Logging

Log every:
- User creation / disable
- Mailbox provisioning event
- Email sent from a shared mailbox (who sent it, to whom, subject, account_id)
- Login attempts (success + failure)

Table:
```sql
audit_log
id          uuid PK
user_id     uuid
action      text
metadata    jsonb
created_at  timestamptz
```

Admin can view audit log at `/panel/admin/audit`.

---

## 7. API Endpoints (Namaah Backend)

### 7.1 Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Accepts personal_email or zoho_email + password |
| POST | `/api/auth/change-password` | Forced on first login |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/zoho/callback` | OAuth callback |
| GET | `/api/zoho/sso-token` | Short-lived SAML assertion for iframe |

### 7.2 Users (HR Module)

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/api/users` | Admin | Create user + auto-provision Zoho |
| GET | `/api/users` | Admin | List all users |
| GET | `/api/users/department/:id` | Admin, Dept Lead (own) | List dept users |
| GET | `/api/users/team/:id` | Admin, Dept Lead (own), Team Lead (own) | List team users |
| PATCH | `/api/users/:id` | Admin | Update user details |
| POST | `/api/users/:id/offboard` | Admin | Begin offboarding |
| GET | `/api/users/me` | All | Self details |
| GET | `/api/users/me/accounts` | All | List Zoho accounts current user can access |

### 7.3 Mail

| Method | Path | Description |
|---|---|---|
| POST | `/api/mail/send` | Send email (server-side wraps Zoho Messages API; enforces shared-mailbox BCC + reply-to logic) |
| GET | `/api/mail/unread-counts` | Returns unread count per account_id user can access |
| POST | `/api/mail/payslip` | Trigger payslip dispatch (uses AccountSelector default = `accounts@`) |
| POST | `/api/mail/offer-letter` | Trigger offer letter dispatch |
| POST | `/api/mail/announcement` | Admin only |

### 7.4 Calendar

| Method | Path | Description |
|---|---|---|
| GET | `/api/calendar/events` | List events for user (personal + accessible dept calendars) |
| POST | `/api/calendar/events` | Create event |
| PATCH | `/api/calendar/events/:id` | Update event |
| DELETE | `/api/calendar/events/:id` | Delete event |
| POST | `/api/calendar/seed-statutory` | Admin only — bootstrap statutory reminders |

### 7.5 Departments & Teams

| Method | Path | Roles | Description |
|---|---|---|---|
| POST | `/api/departments` | Admin | Create department (also creates shared calendar) |
| POST | `/api/teams` | Admin | Create team under a department |

---

## 8. Frontend (React/Next.js) Component Map

```
/panel
├── /dashboard                  — Calendar widget + unread mail summary
├── /mail                       — Embedded Zoho iframe + account sidebar
├── /calendar                   — Full day/week/month view
├── /hr
│   ├── /employees              — Admin view: create / list / disable users
│   ├── /payslips               — Payslip generator (uses <AccountSelector context="payslip" />)
│   └── /offer-letters          — Offer letter generator
├── /accounts
│   ├── /payroll                — Payroll calendar + cutoffs
│   └── /compliance             — Statutory reminders view
├── /settings                   — Personal: signature, reminder prefs
└── /admin
    ├── /departments
    ├── /teams
    └── /audit                  — Audit log viewer
```

**Shared components:**
- `<AccountSelector />` — described in 5.3
- `<RoleGuard role="admin" />` — wraps protected routes
- `<UnreadBadge accountId={...} />` — used in sidebar
- `<EventModal />` — calendar event create/edit
- `<EmailComposer />` — wraps AccountSelector + rich-text editor + attachment uploader

---

## 9. Build Sequence (Suggested)

1. **Zoho admin setup** (Section 3.2) — no code yet.
2. **Database schema** — users, departments, teams, account_access, audit_log.
3. **Auth** — login with dual emails, JWT, password change.
4. **Zoho OAuth wiring** — backend can refresh tokens, call a test API.
5. **Auto-provisioning flow** — create employee → Zoho mailbox created.
6. **SAML SSO + iframe embed** — `/panel/mail` route works end-to-end.
7. **Account Selector component** — works in `/panel/mail/compose`.
8. **Payslip module** — wires AccountSelector + Zoho send.
9. **Offer letter module** — same pattern.
10. **Shared mailbox BCC + reply-to logic.**
11. **Unread count polling + sidebar badges.**
12. **Calendar widget + full view.**
13. **Statutory reminder seeding.**
14. **Offboarding flow + scheduled disable job.**
15. **Audit log + Admin views.**
16. **End-to-end QA across all 5 roles.**

---

## 10. Open Questions / TBD

- Final domain — confirm `namaah.com` vs. alternate.
- Final list of standard shared mailboxes — confirm with Admin before Zoho setup.
- Offboarding retention window — 7 days suggested; confirm with HR policy.
- Payslip PDF password format — DOB suggested; confirm.
- Statutory calendar — cross-check Section 5.5.4 list against Nehal's existing compliance calendar doc.
- Whether Department Leads should be able to BCC personal mailbox on shared-mailbox sends, or always inherit the auto-BCC.

---

## 11. References

- Zoho Mail API overview: https://www.zoho.com/mail/help/api/overview.html
- Zoho Mail API index: https://www.zoho.com/mail/help/api/
- Zoho Calendar API: https://www.zoho.com/calendar/help/api/
- OAuth setup: https://api-console.zoho.com
- SAML SSO setup: Zoho admin console → Security → SSO

---

*End of spec — v1.0*
