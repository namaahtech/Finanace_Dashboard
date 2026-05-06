# Namaah Nexus — Setup Guide

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google Service Account (for Sheets attendance)

---

## 1. Install Dependencies

```bash
cd HR_Dashboard
npm install
```

---

## 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in:

```env
MONGODB_URI=mongodb://localhost:27017/namaah_pulse
JWT_SECRET=<generate a strong random string>

# Google Sheets (see below)
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GOOGLE_SHEETS_ID=<your sheet ID from the URL>
```

---

## 3. Google Sheets Setup

### Sheet structure:
- Each **sheet tab** is named: `YYYY-MM` (e.g. `2024-04`)
- **Row 1 (header):** `Date | EMP001 | EMP002 | EMP003 | ...`
- **Rows 2+:** `2024-04-01 | P | A | PTO | ...`

### Status codes:
| Code | Meaning |
|------|---------|
| `P`  | Present |
| `A`  | Absent  |
| `PTO` | Leave / PTO |
| `H`  | Holiday |
| `WO` | Weekend Off |

### Create Service Account:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a Service Account → generate JSON key
3. Copy `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
4. Copy `private_key` → `GOOGLE_PRIVATE_KEY`
5. Share your Google Sheet with the service account email (Viewer role)

---

## 4. Seed Database

```bash
npm run seed
```

**Test credentials:**

| Role        | Email               | Password     |
|-------------|---------------------|--------------|
| Super Admin | admin@namaah.in     | Admin@123    |
| HR          | hr@namaah.in        | Hr@12345     |
| Employee 1  | rahul@namaah.in     | Emp@12345    |
| Employee 2  | sneha@namaah.in     | Emp@12345    |
| Employee 3  | amit@namaah.in      | Emp@12345    |

---

## 5. Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/         # login, logout, me
│   │   ├── users/        # CRUD
│   │   ├── attendance/   # Google Sheets integration
│   │   ├── kpi/          # KPI/KRA scores
│   │   ├── incentives/   # Award + vesting + hold
│   │   ├── wallet/       # Wallet summary + txns
│   │   ├── claims/       # Claim cycle management
│   │   ├── reimbursements/
│   │   ├── priority/     # Priority payout requests
│   │   └── config/       # System config (super_admin)
│   ├── dashboard/        # Employee pages
│   └── admin/            # Admin pages
├── models/               # Mongoose schemas
├── services/             # Business logic
│   ├── incentiveService.ts
│   ├── walletService.ts
│   ├── payoutService.ts
│   └── attendanceService.ts
├── middleware/           # JWT auth + RBAC
├── components/           # UI components
│   ├── ui/
│   └── layout/
└── scripts/
    └── seed.ts
```

---

## Business Logic Reference

### Incentive Lifecycle
```
Award → [LOCKED 30 days] → CLAIMABLE → (hold?) HELD → CLAIMED
```

### Hold Bonus
| Action            | Payout   |
|-------------------|----------|
| Claim now         | 100%     |
| Hold 1 month      | 100% + bonus_percentage_1m% |
| Hold 2 months     | 100% + bonus_percentage_2m% (max cap) |

### Claim Cycle
- Each month: first 25 users (configurable) get approved
- Remaining users → auto-queued to next cycle
- Priority requests bypass queue (admin approval required)

### Payout Capacity
- `HIGH` → Normal, no warnings
- `MODERATE` → Slight delay possible
- `LOW` → Banner shown: "Payouts may be delayed"

---

## Production Deployment

1. Set `NODE_ENV=production` in env
2. Use MongoDB Atlas URI
3. Deploy to Vercel: `vercel --prod`
4. Set all env vars in Vercel dashboard
5. Run seed against production DB once

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Any | Current user |
| GET | `/api/users` | HR/Admin | List users |
| POST | `/api/users` | HR/Admin | Create user |
| GET | `/api/attendance` | Any | Fetch attendance |
| GET/POST | `/api/kpi` | Any/HR | KPI scores |
| GET/POST | `/api/incentives` | Any/HR | Incentives |
| POST | `/api/incentives/hold` | Employee | Hold for bonus |
| GET | `/api/wallet` | Any | Wallet summary |
| GET/POST | `/api/claims` | Any/Admin | Claims |
| GET/POST | `/api/reimbursements` | Any/HR | Reimbursements |
| GET/POST | `/api/priority` | Any/HR | Priority requests |
| GET/PATCH | `/api/config` | Any/SuperAdmin | System config |
