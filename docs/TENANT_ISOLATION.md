# Tenant isolation

Tenant isolation is enforced at multiple layers:

1. The URL resolver accepts only registered slugs.
2. A user profile/URL conflict is blocked before a workspace renders.
3. Domain records carry `universityId`.
4. repository helpers filter by the actor university and reject cross-tenant updates;
5. PostgreSQL tables carry indexed `university_id`;
6. RLS compares every row to `current_university_id()`;
7. role-specific policies reduce access further.

Changing `/nyu` to `/uiuc` changes requested context only. It does not change `auth.uid()`, the user profile university, permissions, or RLS.

Competition browser state uses `roomready-demo-v3:<slug>` keys. During tenant changes, mismatched state is neither rendered nor persisted into the new tenant. Reset All Demo Data removes both demo keys.

Platform administrators have a null university and may manage `universities` metadata. They receive no blanket policies on student profiles, functional requirements, checks, cases, or notifications.

Production services must include `university_id` in reads and mutations even when RLS is enabled. RLS is a defense-in-depth boundary, not a reason to omit explicit query scoping.
