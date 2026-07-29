# RoomReady

RoomReady preserves approved classroom access requirements when a university changes a course’s assigned room.

The competition demo follows Maya Chen in CS-GY 6033. The course moves from Room 202, which supports all five of Maya’s functional requirements, to incompatible Room 815. RoomReady explains four failed checks, recommends fully compatible Room 812, creates a remediation case, and generates role-specific privacy-safe notifications.

RoomReady performs operational checks. It does not make legal determinations, store diagnoses, or autonomously approve a final room reassignment.

## Quick start

Requirements:

- Node.js 22.13 or newer
- npm 10 or newer

```bash
npm install
npm run dev
```

Open the URL printed by Vite. No environment variables, accounts, or external APIs are required for the local demo.

## Competition demo in under two minutes

1. Open the landing page and select **Run competition demo**.
2. On the simulator, select **Run competition demo** again.
3. Point out the live workflow: one affected student, five checks, case RR-1042, and Room 812.
4. Open the room-change alert to show the Room 202 → Room 815 comparison and four explained failures.
5. Open the room comparison to show that only fully compatible rooms are ranked.
6. Open the remediation case and select **Confirm & resolve**.
7. Open notification previews and show the instructor’s minimum-necessary notice.
8. Select **Reset demo** to restore Room 202.

## Quality commands

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

The unit suite covers the deterministic compatibility engine, alternative-room ranking, the room-change workflow, notification privacy, and demo reset state. Playwright covers the complete competition workflow on desktop and mobile.

## Architecture

The project is a strict TypeScript React application built with Vite, React Router, TanStack Query, Tailwind CSS, Zod, Vitest, Playwright, and a Supabase-ready repository layer.

- `src/pages` — presentation routes
- `src/components` — accessible interface primitives and application shell
- `src/domain` — pure compatibility and ranking logic
- `src/services` — room-change orchestration and notifications
- `src/repositories` — local-demo and Supabase adapters
- `src/data` — deterministic synthetic seed
- `src/state` — demo state and reset behavior
- `supabase` — schema migration, RLS policies, seed, and reset SQL
- `docs` — architecture, data model, and demo notes

See [Architecture](docs/ARCHITECTURE.md) and [Data model](docs/DATA_MODEL.md) for more detail.

## Supabase setup

The app deliberately runs without Supabase so judges can use it offline. To connect a project:

1. Create a Supabase project or start Supabase locally.
2. Apply `supabase/migrations/202607290001_roomready_schema.sql`.
3. Create synthetic auth users for each seeded role.
4. Apply `supabase/seed.sql` and add any user-linked fixtures.
5. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. Keep the service-role key server-side; never expose it to Vite.

Realtime is enabled for room changes, compatibility checks, remediation cases, and notifications. The core workflow remains directly callable for tests and local demo scripts.

## Deployment

Build with `npm run build` and serve the generated `dist` directory with SPA route fallback to `index.html`. Set the two public Supabase variables only when using a hosted backend. The core demo has no paid-service dependency.

For a static host, use:

- Build command: `npm run build`
- Output directory: `dist`
- Node version: `22`
- Rewrite: all unmatched routes → `/index.html`

## Privacy and safety

- Functional room requirements only; no medical diagnoses
- Role-specific disclosure
- Instructor messages omit the student name and full feature profile
- Staff confirmation required before final reassignment
- Row-level security policies for all Supabase tables
- Audit events for significant reads and changes
- Synthetic demo data throughout

Automated checks help identify accessibility regressions but do not establish full accessibility compliance or institutional certification.
