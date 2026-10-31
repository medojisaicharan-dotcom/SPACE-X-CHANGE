# SPACEXCHANGE (SPACE-X-CHANGE)

SPACEXCHANGE is a full-featured resource-sharing platform for institutions, laboratories, equipment owners and community makerspaces. Members can discover and book underused resources, owners manage requests and handovers, and managers/admins oversee eligibility, incidents and platform integrity.

The app runs against **Supabase** when `VITE_SUPABASE_URL` and a publishable/anon key are present, and falls back to a complete **local demo** otherwise. Both modes keep the same pages, services and booking lifecycle.

## Quick start

Requirements: Node.js 18+ and npm.

```powershell
npm install
npm run dev
```

Open http://localhost:5173. If port 5173 is already in use, Vite prints the next available URL (for example http://localhost:5174).

Other commands:

```powershell
npm run typecheck
npm run build
npm run preview
```

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| User | `user@spacexchange.demo` | `User@123` |
| Resource owner | `owner@spacexchange.demo` | `Owner@123` |
| Institution manager | `manager@spacexchange.demo` | `Manager@123` |
| Administrator | `admin@spacexchange.demo` | `Admin@123` |

The login screen has one-click buttons that fill these credentials in demo mode. Role-based landing pages are:

- User: `/dashboard`
- Resource owner: `/owner`
- Institution manager / administrator: `/admin`

## What works

- Public landing, resource marketplace, search/filter/sort, resource detail, how-it-works and about pages.
- Signup, login, logout, account profile/password updates, protected and role-gated routes.
- Complete booking lifecycle: request, approve/reject, cancel, waitlist, check-in, check-out, overdue handling and completion.
- Conflict detection, booking limits, availability windows, blackout dates and institutional priority.
- Eligibility checks based on qualifications, training, institution and verification, with evidence upload/review.
- Owner console: listings, availability calendar, request queue, handover/condition checklists, incident visibility and analytics.
- Admin console: users and evidence review, institutions, platform-wide resources, bookings, incidents, eligibility rules, settings and audit history.
- Notifications, activity timeline, audit logging and CSV export of audit records.
- Responsive Tailwind UI with accessible forms, modals and status feedback.

## Data modes

The driver is chosen at build time in `src/lib/config.ts`:

| Mode | When it is used | Where data lives |
| --- | --- | --- |
| Supabase | `VITE_SUPABASE_URL` and a publishable/anon key are set | Supabase Auth + Postgres |
| Demo | No Supabase credentials, or `VITE_DATA_MODE=demo` | `localStorage` |

To run against Supabase, create `.env.local`:

```powershell
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
# or the legacy key
# VITE_SUPABASE_ANON_KEY=eyJ...
```

Never put a service-role or secret key in a `VITE_` variable. Those keys are only used by local scripts.

If your project has **Confirm email** enabled under Supabase Authentication, new accounts must confirm their address before signing in. Disable it for local testing, or apply the migrations and seed script below.

## Demo mode and limitations

- Set `VITE_DATA_MODE=demo` to force the browser driver even when Supabase keys exist.
- Demo data is stored in `localStorage`:
  - `spacexchange.db.v1` - all application data
  - `spacexchange.session.v1` - current session
  - `spacexchange.search.v1` - last search preferences
- Demo passwords are salted and hashed with SHA-256 through the Web Crypto API before local storage. This is **not** production authentication; Supabase mode uses Supabase Auth.
- Image uploads are stored as data URLs, so very large images can hit browser or row-size limits.
- No real AI provider is configured. `src/services/aiService.ts` is a transparent rule-based assistant, not an LLM.
- No payments are taken. Costs and deposits are estimates only.
- To reset demo data, sign in as an administrator and use **Admin Settings -> Reset demo data**, or clear the three localStorage keys above. Reset is disabled in Supabase mode.
- Do not use real personal, institutional or confidential data in the demo.

## Routes

Public: `/`, `/explore`, `/resources/:id`, `/how-it-works`, `/about`

Auth: `/login`, `/signup`, `/forgot-password`

User: `/dashboard`, `/dashboard/bookings`, `/dashboard/eligibility`, `/dashboard/incidents`, `/dashboard/activity`, `/notifications`, `/account`

Owner: `/owner`, `/owner/resources`, `/owner/resources/new`, `/owner/resources/:id/edit`, `/owner/bookings`, `/owner/availability`, `/owner/handover`, `/owner/incidents`, `/owner/analytics`

Admin/manager: `/admin`, `/admin/users`, `/admin/institutions`, `/admin/resources`, `/admin/bookings`, `/admin/incidents`, `/admin/eligibility`, `/admin/settings`, `/admin/audit`

## Supabase schema and seeding

Two migrations are provided:

```text
database/migrations/0001_init.sql            tables, enums, guards, RLS
database/migrations/0002_app_integration.sql auth profile trigger, directory RPC,
                                             notification policies, overdue sweep
```

`0002_app_integration.sql` is required for the app to work in Supabase mode. It:

- creates a `profiles` row for every new Supabase Auth user (using signup metadata),
- exposes `list_profile_directory()` so members can resolve names without seeing emails,
- adds notification insert/delete policies for cross-user workflow notifications,
- adds `sweep_overdue_bookings()` so overdue state is decided server-side.

Apply both in the Supabase SQL editor in order, or with the Supabase CLI:

```powershell
supabase db push
```

Then configure `.env.local` and restart `npm run dev`. The login screen shows a live-mode notice instead of demo accounts.

### Seed the demo accounts, institutions and listings

There are two equivalent ways to seed. Both use `database/seed/catalog.json` as the single
source of truth (19 institutions and 51 listings), so they never drift apart.

**Option A — SQL editor (no secret key needed).** Open
`database/seed/0003_seed_live_data.sql`, paste the whole file into the Supabase SQL editor and
run it. It creates four pre-confirmed demo accounts, every partner institution, their resource
listings and the platform settings. It is idempotent (deterministic ids), so re-running updates
rows instead of duplicating them.

**Option B — service-role script (local only).**

```powershell
$env:SUPABASE_URL="https://<project>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
npm run seed:supabase
```

The service-role key is never read by the frontend. After editing `database/seed/catalog.json`,
run `npm run seed:sql` to regenerate the SQL seed.

## Project structure

```text
src/
  components/     UI kit, booking modals, resource cards, layout components
  contexts/       authentication and toast providers
  hooks/          live-query and database-version hooks
  integrations/   Supabase client setup
  layouts/        public, auth and dashboard layouts
  lib/            config, Supabase repository, unified database driver and seed data
  pages/          public, auth, user, owner and admin pages
  services/       booking, eligibility, resource, incident, admin, audit and analytics logic
  types/          shared TypeScript models and labels
  utils/          formatting, date, CSV and helper functions
database/
  migrations/     PostgreSQL/Supabase schema and RLS policies
public/           images and favicon assets
```

## Security notes

- In Supabase mode, authentication is handled by Supabase Auth and every table is protected by row level security. The browser only ever receives the publishable/anon key.
- Background writes are queued and any rejection (for example an RLS denial or a missing migration) is surfaced as a toast and the cache is reloaded from the server.
- In demo mode, the database and session live in the browser and can be modified by the user. Do not treat demo permissions or password hashing as production security.
- The production path should add short-lived storage URLs, rate limiting and server-side execution for high-risk notifications, approvals and audit writes.
- RLS policies are included as a starting point, but review them against your institution's policy and threat model before production use.
