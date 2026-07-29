# RoomReady

RoomReady preserves approved classroom access requirements when a university changes a course’s assigned room. It now runs as one configurable multi-university platform: one React application, one deterministic compatibility engine, and strictly separated tenant data, terminology, catalogues, workflows, notification templates, and themes.

The competition build includes two complete synthetic tenants:

- New York University: Maya Chen, CS-GY 6033, Room 202 → Room 815, with Room 812 recommended.
- University of Illinois Urbana-Champaign: Jordan Patel, CS 225, DCL 1320 → DCL 1310, with DCL 1327 recommended.

These are demonstration records. Neither university’s adoption, verification, or endorsement is implied.

## Local setup

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). No credentials are required for the local competition demo.

Optional Supabase setup:

```bash
cp .env.example .env
supabase start
supabase db reset
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only when using a Supabase instance. Keep the service-role key server-side.

## Routes

- `/` — platform landing page
- `/nyu` and `/uiuc` — university entry pages
- `/nyu/student` and `/uiuc/student` — tenant student experiences
- `/nyu/admin` and `/uiuc/admin` — tenant room-change simulators
- `/:tenant/admin/setup` — seven-step university onboarding
- `/:tenant/admin/case`, `rooms/:roomId`, and `notifications` — tenant operations

Old single-tenant routes redirect to the NYU demo for backwards compatibility.

## Repository structure

```text
src/
  domain/       deterministic compatibility and ranking rules
  tenancy/      tenant resolution, permissions, themes, and university data
  workflows/    versioned workflow definitions and instances
  imports/      validated room-inventory CSV ingestion
  pages/        shared tenant-aware student and administrator screens
supabase/
  migrations/   normalized schema and tenant-aware RLS
  seed.sql      deterministic synthetic competition data
tests/e2e/      desktop and mobile competition flows
docs/           architecture, security, onboarding, and demo guides
```

Generated dependencies, builds, browser-test results, and repository-analysis output are excluded through `.gitignore`.

## Validation

```bash
npm run quality
npm run test:e2e
```

`quality` runs TypeScript, ESLint, 32 unit/integration tests, and the production build. Playwright covers desktop and mobile NYU/UIUC flows, tenant switching, setup/publish/reset, unknown tenant blocking, and automated accessibility scans.

## Privacy and safety

- Compatibility decisions are deterministic and never made by an LLM.
- Required features are hard eligibility gates; unknown data requests verification.
- The application stores functional classroom requirements, not diagnoses.
- Instructor messages contain only minimum-necessary operational information.
- Final room changes require an authorised staff action.
- All included university, student, room, and course records are synthetic.

## Architecture

- `src/tenancy` resolves the active university, applies theme tokens, exposes typed configuration, enforces role checks, and scopes in-memory queries.
- `src/domain` contains the shared pure compatibility and ranking engine. It compares stable feature concepts while rendering tenant-specific labels.
- `src/workflows` creates immutable workflow snapshots and advances configured step instances.
- `src/imports/roomCsv.ts` validates room imports with Zod and preserves valid rows when other rows fail.
- `src/state/DemoContext.tsx` holds versioned, tenant-separated, device-local competition state. Production records belong in Supabase.
- `supabase/migrations/202607290002_multi_university.sql` adds university scoping, configuration entities, workflow history, and strict RLS.

See [Architecture](docs/ARCHITECTURE.md), [Data model](docs/DATA_MODEL.md), [Tenant isolation](docs/TENANT_ISOLATION.md), and [RLS](docs/ROW_LEVEL_SECURITY.md).

## Add a third university

1. Create the university metadata row and an admin through the secure provisioning path.
2. Complete `/:tenant/admin/setup`: identity, offices, feature mappings, inventory, workflow, preview, and publish.
3. Map each campus feature key to an existing stable concept. Add a new stable concept to `FeatureType` only when the core semantics are genuinely new.
4. Import rooms using the documented CSV or a scheduling adapter.
5. Publish notification templates and a versioned workflow.
6. Add the slug to the production tenant resolver and seed/test fixtures. The compatibility and ranking algorithms require no campus-specific changes.

## Documentation

- [Competition demo](docs/COMPETITION_DEMO.md)
- [University onboarding](docs/UNIVERSITY_ONBOARDING.md)
- [CSV import](docs/CSV_IMPORT.md)
- [Known limitations](docs/KNOWN_LIMITATIONS.md)
