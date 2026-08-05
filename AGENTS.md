# CampusFit engineering guide

## Boundaries

- Keep business rules out of React components. Add or change deterministic functions in `src/services`.
- Every tenant-owned record must carry `universityId`/`university_id`.
- Never expose another student's raw active visit to a student-facing component.
- Never label CampusFit check-ins as total or official occupancy.
- Preserve ranges, source explanations, and confidence on every forecast.
- Do not add public attendance lists, workout feeds, rankings, body comparison, calorie, weight-loss, or continuous GPS features.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and the relevant Playwright flows after material changes. Add domain tests before changing lifecycle transitions or forecast equations.

## Structure

- `src/pages`, `src/components`: presentation
- `src/data`: tenant configuration, deterministic seeds, local repository context
- `src/services`: application and domain services
- `src/domain`: shared types
- `supabase`: production schema, RLS, seed examples
- `docs`: verified external-source catalogs that should remain separate from the README
