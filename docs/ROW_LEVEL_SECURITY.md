# Row-Level Security

The multi-university migration removes all permissive prototype policies and installs tenant-aware replacements.

Helper functions:

- `current_university_id()` reads the authenticated user’s university.
- `current_user_role_text()` returns the role without unsafe new-enum comparisons.
- `is_current_tenant(row_university_id)` performs the common boundary check.

Access summary:

- students: own profile, requirements, enrolments, compatibility checks, cases, and notifications;
- instructors: no functional-requirement policy; privacy-safe notices are delivered through notifications;
- accessibility coordinators: tenant student profiles, requirements, checks, cases, and workflows;
- facilities: tenant rooms, feature records, outages, operational checks, and assigned case/workflow steps;
- scheduling: tenant assignments, change events, room checks, recommendations, and assigned steps;
- university admins: own university metadata, catalogues, templates, and workflow definitions;
- platform admins: university metadata only.

Required isolation tests exist in `src/tenancy/multiTenant.test.ts`; production deployments should also execute database-level tests under impersonated Supabase JWTs.
