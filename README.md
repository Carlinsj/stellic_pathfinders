# CampusFit

CampusFit is a mobile-first NYU recreation planning prototype. It helps students choose an NYU facility and time for either a workout or a specific activity. Voluntary CampusFit check-ins are always distinguished from planned, historical, predicted, official, and unknown occupancy information.

The competition build is configured exclusively for New York University. All local people, visits, counts, outages, and forecasts are deterministic synthetic data.

## Run locally

Requirements: Node.js 20+ and npm 10+.

```bash
npm run dev
```

The launcher installs dependencies when they are missing and starts Vite, normally at `http://localhost:5173`. The local demo needs no Supabase project or paid service.

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

## Product flow

- `/` introduces the NYU experience; `/nyu/login` is the student entry and `/nyu/staff-login` is the separate role-gated staff entry.
- `/:tenant/home` explains the current recommendation, shows the CampusFit check-in count, and manages upcoming or active visits.
- `/:tenant/plan` plans either a workout or an activity-only visit and compares eligible facilities and times.
- `/:tenant/facilities` and `/:tenant/facilities/:id` compare facility resources and demand.
- `/:tenant/activity` shows workout-specific out-of-service equipment, operational alternatives, and demand ranges; activity-only users receive activity-resource demand instead.
- `/:tenant/history` is private to the current user.
- `/:tenant/staff`, `/:tenant/admin`, and `/:tenant/demo` live in a separate role-gated NYU Athletics operations console and never appear in student navigation.

## Design and data

- React pages and components handle presentation; deterministic rules live in `src/services`.
- A tenant context loads university configuration and repository state. Every tenant-owned record includes a university identifier.
- Local deterministic state powers the competition demo. `supabase/migrations` contains the normalized PostgreSQL schema, indexes, RLS policies, and aggregate-access functions for a production implementation.
- Forecasts combine synthetic historical ranges, discounted plans, active CampusFit participation, facility hours, capacity, resource supply, outages, and source reliability. Every result retains a range, confidence, drivers, freshness, and source explanation.
- Student equipment status is derived from the chosen workout focus and tenant-owned facility inventory. It distinguishes reduced supply from a complete outage without exposing internal staff controls or another student's activity.
- Recommendations first reject closed facilities or those missing a required activity or operational resource. Eligible options are ranked by crowd range, relevant resource pressure, estimated duration, preference, and travel time.
- An activity-only visit requires a supported activity and does not inflate workout-equipment demand. A workout requires a primary focus and can optionally include an activity.

Visit lifecycle:

```text
planned -> delayed -> checked_in -> completed
   |          |             \----> auto_closed
   \----------+-------------------> cancelled or expired
```

Closed visits never reopen. Checking in moves a plan from future demand into live aggregate participation without double-counting it. A partial database index and lifecycle guard prevent concurrent active visits.

## Privacy and tenancy

Student views receive aggregate facility results, never another student's raw active visit or a named attendance list. Small focus and activity buckets are suppressed as `Low activity`. Private history is owner-only and deletable. Supabase RLS scopes data to the signed-in profile's university; students read live data through aggregate-only functions.

CampusFit check-ins are not total or official occupancy. Exact occupancy would require a university-approved authoritative integration. Continuous location tracking is neither used nor recommended.

## Verified facility sources

The [NYU recreation facility catalog](docs/NYU_FACILITY_CATALOG.md) records NYU Athletics' four member facilities, special activities, resources, addresses, and official source pages. Activity availability remains schedule-dependent.

## Production path and limitations

The local repository resets to deterministic demo state on refresh or reset. Supabase is modeled but not hosted; demo authentication is not university authentication; updates are local rather than cross-device; and forecast accuracy has not been validated against real recreation data.

For production, apply the Supabase migrations, replace local repositories with tenant-scoped server operations, connect university-approved OIDC/SAML and data sources, schedule reminder and stale-visit closure jobs, publish narrow realtime invalidations, and configure retention, backups, audit review, rate limits, accessibility checks, and incident response. Secrets belong in deployment configuration, never the client bundle.
