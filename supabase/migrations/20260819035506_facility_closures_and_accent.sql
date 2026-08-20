alter table public.universities
add column if not exists accent_colour text;

create table if not exists public.facility_closures (
  id uuid primary key default gen_random_uuid(),

  university_id uuid not null
    references public.universities(id)
    on delete cascade,

  facility_id uuid not null
    references public.facilities(id)
    on delete cascade,

  reason text not null,

  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,

  created_by uuid
    references public.user_profiles(id)
    on delete set null,

  created_at timestamptz not null default now()
);

create index if not exists facility_closures_active_idx
on public.facility_closures(
  university_id,
  facility_id,
  starts_at,
  ends_at
);

alter table public.facility_closures
enable row level security;

create policy facility_closures_tenant_read
on public.facility_closures
for select
using (
  university_id = public.current_university_id()
);

create policy facility_closures_staff_write
on public.facility_closures
for all
using (
  university_id = public.current_university_id()
  and public.current_user_role() in (
    'recreation_staff',
    'university_admin',
    'platform_admin'
  )
)
with check (
  university_id = public.current_university_id()
  and public.current_user_role() in (
    'recreation_staff',
    'university_admin',
    'platform_admin'
  )
);

create policy university_admin_update
on public.universities
for update
using (
  id = public.current_university_id()
  and public.current_user_role()
    in (
      'university_admin',
      'platform_admin'
    )
)
with check (
  id = public.current_university_id()
);