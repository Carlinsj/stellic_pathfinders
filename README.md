# CampusFit

CampusFit is a mobile-first recreation planning prototype for New York University. It helps students decide **where and when to work out**, compare activity and equipment availability, plan a future visit, or check in for a visit already underway.

> [!IMPORTANT]
> CampusFit check-ins are voluntary product participation—not total or official facility occupancy. Forecasts are estimates and always retain a range, confidence level, freshness, drivers, and source explanation. The bundled people, visits, counts, outages, and forecasts are synthetic.

The current competition build is NYU-only and models four facilities: Palladium, Paulson, 404 Fitness, and the Brooklyn Athletic Facility. Verified facility facts and their official sources live in [the NYU facility catalog](docs/NYU_FACILITY_CATALOG.md).

## Feature reference

CampusFit has separate, role-gated experiences for students, recreation staff, and university administrators. The deterministic demo controls are also restricted to authorized operations accounts. All views use the same tenant-scoped domain state, so an operational change can update student-safe availability, demand, and recommendations without exposing individual attendance.

### Student features

#### Sign-in and navigation

- Select a synthetic student account through the student portal; no password or real university SSO is used in the prototype.
- Remain inside the selected university tenant. Student accounts cannot open staff, administrator, or demo-control routes.
- Use responsive desktop, tablet, mobile, and installable PWA layouts with Home, Plan, Facilities, Demand, and History navigation.
- Sign out without clearing the shared synthetic scenario. The selected account is isolated per browser tab.

#### Home and live participation

- See how many facilities are currently open and the total number of voluntary CampusFit check-ins across the university.
- Compare every facility's current CampusFit participation and open its detail page.
- Review anonymous facility participation broken into scheduled arrivals, walk-in check-ins, and scheduled students who have not checked in yet.
- See freshness, confidence, the planning interval, and an explanation of how each participation tracker was calculated.
- Start a spontaneous check-in without sharing a name or granting location access. The student manually selects a facility, workout or activity-only intent, workout focuses or supported activity, and an expected duration.
- Convert an existing plan into a live check-in without counting the student once as planned and again as active.
- Maintain at most one active check-in at a time.

#### Visit planning and recommendations

- Build a visit through a four-step planner: purpose, time, gym, and review.
- Plan a workout by selecting one or more muscle-group focuses, an optional supported activity, expected equipment, and a normal visit duration from 30 to 100 minutes.
- Plan an activity-only visit using supported courts, lanes, walls, studios, bikes, or other activity resources. Activity-only plans do not add strength-equipment demand.
- Choose today, tomorrow, or a future date and an exact arrival time.
- Review alternate time suggestions, predicted equipment waits, and operational disruptions for the selected plan.
- Rank facilities using operating status, required activity/resource support, forecast range, relevant demand, estimated visit and wait ranges, user preference, and travel time.
- Ask CampusFit to select the highest-ranked eligible gym, compare it with another selection, or switch to the better alternative.
- Review the proposed facility, expected visitor range, forecast confidence, demand drivers, visit-duration range, wait range, relevant resources, and source explanation before saving.
- Preview how saving the draft changes the number of students scheduled in that arrival window.

#### Facilities, schedules, activities, and equipment

- Compare all facilities by live CampusFit participation, predicted demand, travel time, operating status, supported activities, workout duration, and leading equipment pressure.
- Open a facility for its description, address, travel estimate, capacity reference, current hours or closure, and planning links.
- Review current voluntary check-ins separately from the past-data forecast; the capacity comparison is explicitly not a live occupancy meter.
- Inspect privacy-protected top workout focuses and activities. Counts below the university threshold display as `Low activity`.
- View weekly operating hours, temporary closures, an existing plan at that facility, and forecast windows for now through the next five hours, including the best and peak predicted times.
- Browse supported activities and open the planner with the activity and facility preselected. CampusFit identifies support, but does not claim to provide connected class, court, pool, or session schedules.
- Filter equipment by workout focus and see staff-reported operational units, limited or unavailable resources, outage impact, demand level, likely wait range, confidence, and alternative-facility links.
- Explore the dedicated Demand screen by facility and either workout focus or supported activity, then carry that selection into a new plan.

#### Managing an upcoming or active visit

- See the next saved plan, its purpose, expected duration, facility, arrival time, participation window, and forecasted demand from Home or History.
- Reschedule a future visit to another valid date and time or cancel it.
- Mark a plan as 10, 20, or 30 minutes late; CampusFit moves its declared arrival and recalculates the affected forecast intervals.
- Check in from the plan using **I'm here**.
- During a live workout, see elapsed time and expected finish, change workout focuses, add or change a supported activity, and immediately update the anonymous demand contribution.
- Extend a visit to an exact new finish time or check out manually. Closed visits cannot be reopened.
- Receive an in-app reminder after the expected finish, then extend or finish during the university-configured grace period. A stale active visit is automatically closed after that grace period.
- Allow abandoned future plans to expire so they stop contributing to planned demand.

#### Private history

- See only the signed-in student's active, planned, delayed, completed, automatically closed, and cancelled visits.
- Review facility, date, time, purpose, status, expected duration, and actual or recorded duration when available.
- Load older history in groups of 12 and delete an individual visit from private history.
- Keep deletion semantics explicit: removing personal history does not attempt to reverse statistics that were already anonymized and aggregated.

### Recreation staff features

#### Protected operations workspace

- Sign in through the separate staff portal and remain role-gated from student pages and university-administrator settings.
- Review a university-wide summary of reporting facilities, current equipment outages, temporary closures, and synthetic report quality.
- Scan each facility's operating state, issue count, past-data visitor estimate, crowd level, forecast confidence, model range, and source explanation.
- Open a facility workspace with its address, capacity reference, activity count, today's closing time, and Overview, Equipment, Hours, and Forecast tabs.
- Review the same aggregate-only participation tracker used for operations analysis; the staff workspace does not publish attendance lists or student workout feeds.

#### Equipment operations

- Select any equipment type stocked at the facility and review total, operational, and out-of-service quantities.
- Report one or more currently operational units as out of service. Controls are bounded so staff cannot remove more units than are operational.
- Record one or more completed repairs. Controls are bounded so staff cannot restore more units than are currently unavailable.
- Preview the inventory before-and-after result and use quick quantities, including all eligible units.
- Recalculate student equipment status, resource pressure, likely waits, and facility recommendations immediately after an outage or restoration.

#### Hours, closures, and forecasts

- Change today's published closing time for a selected facility.
- Publish a two-hour maintenance or emergency closure after confirmation, then reopen the facility early when appropriate.
- Exclude an actively closed facility from student recommendations immediately.
- Review current anonymous forecast level, approximate expected visitors, declared plans in the interval, confidence, underlying range, and source explanation.
- Keep operational estimates clearly labeled as synthetic past-data guidance rather than official occupancy.

### University administrator features

University administrators can use the staff workspace and additionally open tenant configuration and demo controls.

- Configure and save tenant-scoped primary and accent colors using validated six-digit hex values.
- Set the privacy suppression threshold to a whole number from 3 through 10. Smaller workout-focus and activity buckets then display as `Low activity`.
- Set the automatic-close grace period to a whole number from 10 through 90 minutes.
- Review the tenant's facility, equipment-type, activity, and workout-focus catalogue counts and jump to the operational catalogue tools.
- Preview demonstration, OpenID Connect, or SAML authentication modes. Changing this selector does not create a live SSO integration.
- Draft reminder wording locally. This preview is not published by the university-settings save action.
- See unsaved-change and validation state before saving supported tenant settings.

### Authorized demo controls

- View the deterministic demo clock plus active check-in and future-plan counts.
- Add a future plan, create a spontaneous strength check-in, delay a plan by 20 minutes, check out a synthetic user, or move an active synthetic visit to another facility.
- Add synthetic squash, badminton, or climbing demand only at facilities that support the selected activity.
- Trigger a two-unit cable outage and observe downstream equipment guidance and recommendations.
- Follow the built-in short presentation script for a planned workout, delay, check-in, live edit, and checkout.
- Reset the tenant's shared synthetic state back to its original seed after confirmation.

### Product-wide behavior and boundaries

- Local shared state persists in `localStorage` and synchronizes across tabs on the same origin; remote mode uses the authenticated Fastify and Supabase path.
- Student-facing data contains the current student's own visits and privacy-protected aggregates, never another student's raw active visit or history.
- Every forecast preserves an expected range, crowd level, confidence, freshness, drivers, and source explanation.
- CampusFit check-ins are always described as voluntary participation—not total or official facility occupancy.
- The prototype does not provide public attendance lists, workout feeds, rankings, body comparison, calorie or weight-loss tracking, continuous GPS, or real university SSO.

## Technology

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, TypeScript, React Router, TanStack Query |
| Build and PWA | Vite 7, `vite-plugin-pwa` |
| API | Fastify 5, Zod, JWT demo sessions |
| Persistence | Supabase Postgres, row-level security, aggregate RPCs |
| Unit tests | Vitest |
| Browser tests | Playwright across Chromium desktop, tablet, and mobile projects |
| Code quality | TypeScript strict mode and ESLint |

## Quick start

### Prerequisites

- Node.js 20 or newer
- npm 10 or newer

### Run the deterministic local demo

The local mode has no database or API dependency.

```bash
npm install
VITE_API_MODE=local npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The development launcher forwards extra Vite arguments, so a fixed host and port can be supplied when needed:

```bash
VITE_API_MODE=local npm run dev -- --host 127.0.0.1 --port 5173
```

`npm run dev` installs missing frontend dependencies automatically. An explicit `npm install` is still recommended for a predictable first setup.

### Demo accounts

No password is required in the local prototype. Choose an account from the appropriate portal.

| Portal | Accounts | Access |
| --- | --- | --- |
| `/nyu/login` | Maya Chen, Theo Rivera, Aisha Brooks | Student planning, check-in, facilities, demand, and private history |
| `/nyu/staff-login` | Sam Ortiz, Priya Shah | Facility and equipment operations |
| `/nyu/staff-login` | Taylor Morgan | University administration and operations |

Local shared synthetic state is stored in `localStorage` and synchronized across tabs on the same origin. The selected account is stored per tab in `sessionStorage`. Resetting the demo restores the deterministic seed state.

## Runtime modes

The frontend supports three API modes through `VITE_API_MODE`.

| Mode | Behavior |
| --- | --- |
| `local` | Always use the deterministic in-browser repository. Best for development and browser tests. |
| `auto` or unset | Try the configured API, then continue with the local demo if it is unavailable. |
| `remote` | Require API-backed sign-in and state; failed remote sessions do not silently remain authenticated. |

Two additional frontend variables control API routing:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | Browser-visible API base URL. |
| `VITE_API_PROXY_TARGET` | `http://127.0.0.1:3001` | Vite development proxy target for `/api`. |

Only variables prefixed with `VITE_` are exposed to the browser. Never place Supabase secrets, JWT secrets, or internal job credentials in a `VITE_` variable.

## Run with Fastify and Supabase

The development launcher starts the backend when `VITE_API_MODE` is not `local` and either a root `.env` or `backend/.env` exists.

1. Create a Supabase project.
2. Apply the SQL files in `supabase/migrations` in filename order.
3. Apply `supabase/backend_seed.sql` for the complete synthetic NYU dataset expected by the API. `supabase/seed.sql` is a smaller legacy/example seed; use it only when you do not need the backend demo and do not apply both seeds to the same database.
4. Copy `backend/.env.example` to either `.env` at the repository root or `backend/.env`.
5. Fill every required value and use secrets of at least 32 characters.
6. Install dependencies and start the combined development environment.

```bash
npm install
npm --prefix backend install
npm run dev
```

The frontend normally runs at `http://localhost:5173`; the API listens on `http://127.0.0.1:3001`. Health is available at `GET /api/v1/health`.

### Backend environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Publishable project key used by the server client. |
| `SUPABASE_SECRET_KEY` | Yes | Server-only privileged key. Never expose it to Vite. |
| `DEMO_JWT_SECRET` | Yes | Secret used for temporary demo session tokens; minimum 32 characters. |
| `INTERNAL_JOB_SECRET` | Yes | Secret protecting lifecycle maintenance jobs; minimum 32 characters. |
| `DEMO_ENABLED` | No | Enables demo accounts and deterministic demo actions; defaults to `true`. Disable in production. |
| `PORT` | No | API port; defaults to `3001`. |
| `HOST` | No | API bind address; defaults to `127.0.0.1`. |

The API contract is documented in [endpoints.yml](endpoints.yml). It is the required production-facing contract for tenant validation, role authorization, visit ownership, aggregate participation, staff mutations, and internal lifecycle jobs.

## Application routes

| Route | Audience | Purpose |
| --- | --- | --- |
| `/` | Public | Product overview and data-source disclosure |
| `/privacy` | Public | Prototype privacy explanation |
| `/nyu/login` | Public | Student demo account selection |
| `/nyu/staff-login` | Public | Staff and administrator demo account selection |
| `/nyu/home` | Student | Dashboard, facility participation, upcoming and active visits |
| `/nyu/plan` | Student | Workout or activity-only planning and recommendations |
| `/nyu/facilities` | Student | Facility comparison |
| `/nyu/facilities/:facilityId` | Student | Facility hours, activities, equipment, and forecasts |
| `/nyu/activity` | Student | Workout-equipment or activity-resource demand |
| `/nyu/history` | Student | Current user's private visit history |
| `/nyu/staff` | Staff/admin | Facility operations |
| `/nyu/admin` | University admin | Tenant configuration |
| `/nyu/demo` | Authorized operations role | Deterministic scenario controls |

Route guards redirect anonymous users to the appropriate portal and prevent students from entering operations areas or staff from entering student areas.

## Architecture

```text
Browser
  └─ React pages and components
       ├─ Tenant/CampusFit contexts
       ├─ deterministic domain services
       └─ CampusFit API adapter
            ├─ local repository (local or auto fallback)
            └─ Fastify /api/v1
                 └─ Supabase Postgres + RLS + aggregate RPCs
```

Repository responsibilities:

```text
src/pages/           Route-level presentation
src/components/      Reusable presentation components
src/services/        Deterministic rules, forecasting, lifecycle, and API adapter
src/domain/          Shared application types
src/data/            NYU configuration, deterministic seeds, and repository contexts
backend/src/routes/  Authenticated HTTP endpoints
backend/src/services/ Server-side authorization, validation, and lifecycle rules
supabase/migrations  Schema, constraints, RLS, and aggregate functions
supabase/*.sql       Deterministic database seed data
tests/               Playwright user, role, privacy, responsive, and operations flows
docs/                Verified external-source catalogs kept separate from product docs
```

Business rules belong in `src/services`, not React components. Every tenant-owned record carries `universityId` in TypeScript or `university_id` in Postgres.

## Core domain behavior

### Visit lifecycle

```text
planned ──> delayed ──> checked_in ──> completed
   │           │              └──────> auto_closed
   └───────────┴─────────────────────> cancelled or expired
```

- Closed visits never reopen.
- A student can have at most one active check-in.
- Checking in moves a future plan into live aggregate participation without double-counting it.
- Activity-only visits require a supported activity and do not inflate workout-equipment demand.
- Workout visits require a primary focus and may include secondary focuses or an optional activity.
- A partial database index and application lifecycle guards enforce the active-visit invariant.

### Forecasting and recommendations

Forecasts combine synthetic historical ranges, discounted plans, active CampusFit participation, operating hours, facility capacity, resource supply, outages, and source reliability. They deliberately avoid false precision.

Recommendations first reject facilities that are closed or lack a required activity or operational resource. Eligible facilities are ranked using:

1. Forecast crowd range and confidence
2. Relevant equipment or activity-resource pressure
3. Estimated visit duration and wait range
4. User preference
5. Travel time

A recommendation never converts CampusFit participation into an official occupancy claim.

## Privacy, safety, and tenancy invariants

- Student-facing payloads receive the current student's own visits plus aggregate facility results.
- Another student's raw active visit, identity, or attendance history is never exposed to a student component.
- Small workout-focus and activity buckets are suppressed as `Low activity` at the tenant privacy threshold.
- Private history is owner-only and deletable.
- Supabase RLS scopes tenant-owned tables to the signed-in profile's university.
- Browser clients read live participation through aggregate-only functions rather than selecting other students' visits.
- Continuous location tracking is not used or recommended.
- The product excludes public attendance lists, workout feeds, rankings, body comparison, calorie, and weight-loss features.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite and, when configured, the Fastify watcher |
| `npm run typecheck` | Run the strict frontend TypeScript project build without emitting files |
| `npm run lint` | Lint the repository with zero warnings allowed |
| `npm test` | Run deterministic service and adapter tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run build` | Type-check and create the production Vite/PWA bundle in `dist/` |
| `npm run preview` | Preview the production frontend bundle |
| `npm run test:e2e` | Run all Playwright projects |
| `npm --prefix backend run typecheck` | Type-check the Fastify backend |
| `npm --prefix backend run dev` | Start only the Fastify watcher |

Install Playwright's Chromium browser once before the first end-to-end run:

```bash
npx playwright install chromium
```

Run the same baseline verification expected for material changes:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

The Playwright configuration starts the app in deterministic local mode and checks desktop Chromium, iPad Pro 11, and iPhone 13 profiles. Browser fixtures fail tests on unexpected console or page errors.

## Data sources and limitations

- The [NYU facility catalog](docs/NYU_FACILITY_CATALOG.md) records official pages used for names, addresses, activities, and publicly stated resource quantities. Activity availability remains schedule-dependent.
- Local fallback data resets to deterministic demo state on reset and is scoped to the current browser origin.
- API mode persists tenant-scoped visits, equipment changes, tenant settings, and reversible demo operations in Supabase.
- Demo JWT authentication is not NYU authentication.
- Forecast accuracy has not been validated against authoritative recreation data.
- Capacity and synthetic historical demand are modeling inputs, not live official counts.
- Exact occupancy would require a university-approved authoritative integration.

## Production readiness checklist

Before treating CampusFit as a production service:

- Replace demo sessions with university-approved OIDC or SAML.
- Disable demo account and scenario endpoints.
- Connect approved authoritative hours, closure, equipment, and occupancy sources.
- Validate forecast equations and confidence calibration against real observations.
- Schedule the protected reminder, expiry, and stale-visit lifecycle job.
- Configure narrow realtime invalidations or polling budgets.
- Define data retention and deletion policy, backups, audit review, and incident response.
- Add rate limits, abuse monitoring, secret rotation, and deployment-specific CORS policy.
- Complete accessibility, security, privacy, and institutional review.
- Keep all privileged keys in server-side deployment configuration.

## Contributing guardrails

When changing the project:

1. Put deterministic business logic in `src/services` and add domain tests before changing lifecycle transitions or forecast equations.
2. Keep tenant ownership explicit on every owned record and API path.
3. Preserve forecast ranges, confidence, freshness, drivers, and source explanations.
4. Keep CampusFit participation clearly labeled as voluntary and non-official.
5. Preserve aggregate-only student access and role separation.
6. Run type checking, linting, unit tests, the production build, and relevant Playwright flows before handoff.

See [AGENTS.md](AGENTS.md) for the concise engineering constraints used in this repository.
