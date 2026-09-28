# Namaah Nexus

Internal operations platform for Namaah: HR, onboarding, payroll, finance, LMS, mail, meetings and workspace in one Next.js app backed by Supabase.

| Area | What's in it |
|------|--------------|
| People | Employees, org chart, teams, shifts, attendance, leave, KPI/KRA, recruitment & ATS |
| Onboarding | Offer letter builder → admin approval → Zoho mail with PDFs → candidate KYC upload → OTP + face-verified e-sign |
| Finance | Payroll, payslips, internship payroll, invoicing, vendors, budgets, claims, reimbursements, incentives |
| Learning | Courses, lessons, assignments with deadlines/reminders, certificates |
| Collaboration | Zoho mail inbox/sent, meetings (LiveKit), workspace docs/sheets/slides/notes, file share |
| Admin | Role permissions, master audit log, live presence |

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**, Radix UI / shadcn components
- **Supabase**: Postgres, Auth, Storage, Realtime
- Integrations: Zoho (Mail, Calendar, SAML SSO), LiveKit, SMTP, OpenRouter/Anthropic/local LLM, face-api + MediaPipe

## Prerequisites

- **Node.js 20+** (developed on 22)
- **npm**
- A **Supabase** project (or the Supabase CLI for a local stack)
- Optional: Docker (face-match worker), Python 3.10+ (recruitment processor), a LiveKit server (meetings)

## Quick start

```bash
# 1. Clone and install
git clone https://github.com/namaahtech/Finanace_Dashboard.git
cd Finanace_Dashboard
npm install

# 2. Configure environment
cp .env.example .env.local
# then fill in the values (see "Environment variables" below)

# 3. Set up the database (see "Database setup" below)
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# 4. Run the dev server
npm run dev
```

Open http://localhost:3000 and log in.

## Environment variables

Put these in `.env.local` (never commit it). `.env.example` has the full template.

### Required

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (server-only, keep secret) |
| `NEXT_PUBLIC_APP_URL` | Base URL used in magic links and emails. `http://localhost:3000` for local dev |
| `NEXT_PUBLIC_SITE_URL` | Same as above |

### Optional, per feature

| Feature | Variables |
|---------|-----------|
| Zoho Mail / Calendar / provisioning | `ZOHO_ACCOUNTS_URL`, `ZOHO_MAIL_API_URL`, `ZOHO_CALENDAR_URL`, `ZOHO_MAIL_DOMAIN`, `ZOHO_ORG_ID`, `ZOHO_WEBHOOK_TOKEN` (client ID/secret are stored in the `zoho_config` table after the first OAuth connect) |
| SMTP email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME` |
| Meetings (LiveKit) | `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL` |
| Meeting AI analysis | `ANTHROPIC_API_KEY` |
| AI features (ATS, legal scan) | `OPENROUTER_API_KEY`, or `LOCAL_AI_ENDPOINT` + `LOCAL_AI_MODEL` for a self-hosted Ollama |
| E-sign face match | `FACE_MATCH_WORKER_URL`, `FACE_MATCH_WORKER_SECRET`, `NEXT_PUBLIC_FACE_VERIFY_MODE` |
| Encryption at rest | `BIOMETRIC_ENC_KEY`, `CREDENTIAL_ENC_KEY` (32 bytes, hex or base64) |
| Scheduled jobs | `CRON_SECRET` (sent as the `x-cron-secret` header) |
| Google Sheets attendance | `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEETS_ID` |

A feature whose variables are missing will show an error when used; the rest of the app still runs.

## Database setup

`supabase/` is the source of truth for the schema. Full details are in [supabase/README.md](supabase/README.md).

> `src/supabase/migrations/` is **deprecated history**. Do not run it against a new database. See [src/supabase/DEPRECATED.md](src/supabase/DEPRECATED.md).

1. **Create a Supabase project** (Postgres 15, region close to users, e.g. `ap-south-1`).
2. **Link and push migrations**
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. **Create storage buckets**: run [supabase/storage/buckets.sql](supabase/storage/buckets.sql) in the Supabase SQL editor.
4. **Create the first admin**
   - Supabase → Authentication → Users → Add user (tick "Auto Confirm User").
   - Copy the new user's UUID and run in the SQL editor:
     ```sql
     INSERT INTO public.employees (id, name, email, role, employee_id, is_active, joining_date)
     VALUES ('<auth-user-uuid>', 'Admin', 'admin@yourcompany.com', 'admin', 'EMP-0001', true, CURRENT_DATE);
     ```
5. **Seed permissions**: log in, open `/admin/permissions`, pick the Admin role and click **Save Permissions**. Do this if the sidebar is empty.

### Adding a migration

```bash
npx supabase migration new <descriptive_name>
# edit the generated file in supabase/migrations/
npx supabase db push
```

Every migration needs a unique timestamp prefix. Two files with the same prefix will make `db push` fail.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build (uses 8 GB heap) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run bridge` | Tunnel a local LiveKit server (port 7880) through ngrok and update `.env.local` |
| `npm run copy:mediapipe` | Copy MediaPipe WASM into `public/mediapipe/wasm` (re-run after upgrading `@mediapipe/tasks-vision`) |

**Windows note:** the `build` script sets `NODE_OPTIONS` in Unix syntax. In PowerShell run it like this instead:

```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"; npx next build
```

## Roles

| Role | Lands on | Scope |
|------|----------|-------|
| `admin` | `/admin` | Everything |
| `hr` | `/hr` | People modules |
| `accounts` | `/accounts` | Finance modules |
| `dept_lead` | `/department-lead` | Department-scoped views and approvals |
| `team_lead` | `/team-lead` | Team-scoped views and approvals |
| `employee`, `intern` | `/dashboard` | Self-service |

Which modules each role can see is controlled from `/admin/permissions` (stored in the `role_permissions` table).

## Supporting services (optional)

### Face-match worker, `worker/face-match/`

Server-side face verification for the e-sign gate. It runs as a separate container because TensorFlow's native binary can't run on Vercel.

```bash
cd worker/face-match
node copy-models.mjs
npm install
WORKER_SECRET=dev-secret npm start   # http://localhost:8080/health
```

Then set `FACE_MATCH_WORKER_URL` and `FACE_MATCH_WORKER_SECRET` in the app's `.env.local`. For deployment (Cloud Run, Render, etc.), see [worker/face-match/README.md](worker/face-match/README.md).

### Recruitment processor, `python_service/`

Python worker that processes recruitment data. It reads Supabase credentials from `../.env.local`.

```bash
cd python_service
pip install supabase requests python-dotenv
python main.py
```

### LiveKit server, `vm-setup/`

`vm-setup/livekit-setup.sh` installs a LiveKit server on a VM. For local development, use `npm run bridge` to expose a local LiveKit server.

## Scheduled jobs

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `POST /api/lms/reminders/run` | Daily | LMS deadline reminders and auto-certification. Send header `x-cron-secret: $CRON_SECRET` |

## Project structure

```
src/
├── app/
│   ├── admin/            # Admin panel
│   ├── hr/               # HR panel
│   ├── accounts/         # Finance panel
│   ├── department-lead/  # Dept lead views
│   ├── team-lead/        # Team lead views
│   ├── dashboard/        # Employee self-service
│   ├── onboarding/       # Candidate-facing onboarding (magic link)
│   ├── sign/             # E-sign flow
│   ├── meet/             # Meetings
│   ├── careers/          # Public careers page
│   └── api/              # Route handlers
├── components/           # UI components
├── lib/                  # Supabase clients, auth, Zoho, crypto, LMS, onboarding logic
├── hooks/  store/  types/  services/
supabase/                 # Migrations, storage buckets, CLI config (source of truth)
worker/face-match/        # Face verification microservice
python_service/           # Recruitment processor
public/                   # Static assets, face models, MediaPipe WASM
```

## Deployment

The app deploys to **Vercel**:

1. Import the repo in Vercel.
2. Add all the environment variables from `.env.local`, with `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL` set to the production domain.
3. Deploy. The `preview` branch is used for staging; merge to `main` for production.
4. Set up a daily cron for `/api/lms/reminders/run`.
5. Deploy the face-match worker separately if e-sign face verification is enabled.

## More docs

- [supabase/README.md](supabase/README.md): database deployment in detail
- [docs/ZOHO_INTEGRATION.md](docs/ZOHO_INTEGRATION.md): Zoho setup
- [worker/face-match/README.md](worker/face-match/README.md): face-match worker
- [HANDOFF.md](HANDOFF.md): project handoff notes
