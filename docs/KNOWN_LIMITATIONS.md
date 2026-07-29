# Known limitations

- University and room records are synthetic and are not authoritative campus inventories.
- Competition authentication is persona simulation. Production requires Supabase Auth/SSO and server-side profile provisioning.
- Setup publish is device-local for safe judging. Production publish should persist a versioned transaction in Supabase.
- The CSV parser covers the documented competition format; production bulk imports need streaming, duplicate reconciliation, and a downloadable error file.
- Scheduling, facilities, SIS, email, and SSO adapters are contracts only; no external actions occur.
- Geographic distance values are seeded for deterministic ranking rather than calculated from verified pathways.
- Database RLS is defined and application isolation is tested, but hosted projects should add database-level JWT impersonation tests to CI.
- The platform administrator elevated-support workflow is represented by an explicit denial boundary; a full audited approval UI is future work.
