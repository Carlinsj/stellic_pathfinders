-- Convert the existing RoomReady schema into a tenant-scoped platform.
-- This migration preserves existing records by assigning them to the NYU demo
-- tenant before removing temporary defaults.

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text not null,
  slug text not null unique,
  primary_colour text not null,
  secondary_colour text not null,
  logo_url text,
  timezone text not null,
  accessibility_office_name text not null,
  accessibility_office_short_name text not null,
  facilities_office_name text not null,
  scheduling_office_name text not null,
  support_email text not null,
  domain text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.universities enable row level security;

insert into public.universities (
  id, name, short_name, slug, primary_colour, secondary_colour, logo_url,
  timezone, accessibility_office_name, accessibility_office_short_name,
  facilities_office_name, scheduling_office_name, support_email, domain,
  active, created_at, updated_at
)
select *
from (
  values
    (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'New York University',
      'NYU',
      'nyu',
      '#57068C',
      '#2D0A4E',
      null::text,
      'America/New_York',
      'Moses Center for Student Accessibility',
      'Moses Center',
      'NYU Facilities Operations',
      'University Programs Scheduling',
      'roomready-nyu@example.edu',
      'example.nyu.edu',
      true,
      now(),
      now()
    ),
    (
      '22222222-2222-4222-8222-222222222222'::uuid,
      'University of Illinois Urbana-Champaign',
      'Illinois',
      'uiuc',
      '#13294B',
      '#B33A00',
      null::text,
      'America/Chicago',
      'Disability Resources and Educational Services',
      'DRES',
      'Facilities & Services',
      'Classroom Scheduling',
      'roomready-uiuc@example.edu',
      'example.illinois.edu',
      true,
      now(),
      now()
    )
) as seed(
  id, name, short_name, slug, primary_colour, secondary_colour, logo_url,
  timezone, accessibility_office_name, accessibility_office_short_name,
  facilities_office_name, scheduling_office_name, support_email, domain,
  active, created_at, updated_at
)
on conflict (slug) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  updated_at = now();

alter type public.user_role add value if not exists 'scheduling_staff';
alter type public.user_role add value if not exists 'university_admin';
alter type public.user_role add value if not exists 'platform_admin';

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'users', 'student_profiles', 'functional_requirements', 'buildings', 'rooms',
    'room_features', 'courses', 'sections', 'enrollments', 'room_assignments',
    'room_change_events', 'compatibility_checks', 'remediation_cases',
    'notifications', 'audit_events'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists university_id uuid references public.universities(id) on delete restrict default %L::uuid not null',
      table_name,
      '11111111-1111-4111-8111-111111111111'
    );
    execute format(
      'create index if not exists %I on public.%I (university_id)',
      table_name || '_university_idx',
      table_name
    );
    execute format(
      'alter table public.%I alter column university_id drop default',
      table_name
    );
  end loop;
end
$$;

alter table public.users alter column university_id drop not null;
alter table public.users
  add constraint users_platform_admin_university_check
  check (
    (role::text = 'platform_admin' and university_id is null)
    or (role::text <> 'platform_admin' and university_id is not null)
  ) not valid;

alter table public.users drop constraint if exists users_email_key;
alter table public.users
  add constraint users_university_email_key unique (university_id, email);
alter table public.student_profiles
  drop constraint if exists student_profiles_external_student_ref_key;
alter table public.student_profiles
  add constraint student_profiles_university_external_ref_key
  unique (university_id, external_student_ref);
alter table public.courses drop constraint if exists courses_course_code_key;
alter table public.courses
  add constraint courses_university_course_code_key unique (university_id, course_code);
alter table public.rooms drop constraint if exists rooms_building_id_room_number_key;
alter table public.rooms
  add constraint rooms_university_building_room_key
  unique (university_id, building_id, room_number);
alter table public.sections drop constraint if exists sections_course_id_section_code_key;
alter table public.sections
  add constraint sections_university_course_section_key
  unique (university_id, course_id, section_code);
alter table public.enrollments
  drop constraint if exists enrollments_student_id_section_id_key;
alter table public.enrollments
  add constraint enrollments_university_student_section_key
  unique (university_id, student_id, section_id);

create table if not exists public.feature_catalogue_entries (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  key text not null,
  stable_concept_key text not null,
  display_name text not null,
  description text not null,
  category text not null,
  data_type text not null check (data_type in ('boolean', 'quantity', 'status')),
  required_verification_frequency_days integer not null check (required_verification_frequency_days > 0),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (university_id, key),
  unique (university_id, stable_concept_key)
);
create index if not exists feature_catalogue_university_idx
  on public.feature_catalogue_entries (university_id, active, sort_order);

create table if not exists public.room_feature_outages (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  room_feature_id uuid not null references public.room_features(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz,
  reason text not null,
  status text not null check (status in ('active', 'scheduled', 'resolved')),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);
create index if not exists room_feature_outages_university_idx
  on public.room_feature_outages (university_id, status);

create table if not exists public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  name text not null,
  version integer not null check (version > 0),
  active boolean not null default false,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (university_id, name, version)
);
create unique index if not exists workflow_definitions_one_active_idx
  on public.workflow_definitions (university_id)
  where active;

create table if not exists public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete cascade,
  step_key text not null,
  step_type text not null,
  label text not null,
  owner_role text not null,
  sort_order integer not null,
  optional boolean not null default false,
  configuration jsonb not null default '{}'::jsonb,
  unique (workflow_definition_id, step_key),
  unique (workflow_definition_id, sort_order)
);
create index if not exists workflow_steps_university_idx
  on public.workflow_steps (university_id, workflow_definition_id, sort_order);

create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  remediation_case_id uuid not null unique references public.remediation_cases(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete restrict,
  workflow_definition_version integer not null,
  definition_snapshot jsonb not null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists workflow_instances_university_idx
  on public.workflow_instances (university_id, status);

create table if not exists public.workflow_step_instances (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete restrict,
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete cascade,
  step_key text not null,
  label_snapshot text not null,
  sort_order integer not null,
  status text not null check (
    status in ('pending', 'active', 'blocked', 'completed', 'skipped', 'cancelled')
  ),
  assigned_role text not null,
  completed_by uuid references public.users(id) on delete set null,
  completed_at timestamptz,
  unique (workflow_instance_id, step_key),
  unique (workflow_instance_id, sort_order)
);
create index if not exists workflow_step_instances_university_idx
  on public.workflow_step_instances (university_id, workflow_instance_id, status);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  template_key text not null,
  audience text not null,
  subject_template text not null,
  body_template text not null,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (university_id, template_key)
);
create index if not exists notification_templates_university_idx
  on public.notification_templates (university_id, active);

alter table public.feature_catalogue_entries enable row level security;
alter table public.room_feature_outages enable row level security;
alter table public.workflow_definitions enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.workflow_instances enable row level security;
alter table public.workflow_step_instances enable row level security;
alter table public.notification_templates enable row level security;

create or replace function public.current_university_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select university_id from public.users where id = auth.uid()
$$;

create or replace function public.current_user_role_text()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text from public.users where id = auth.uid()
$$;

create or replace function public.is_current_tenant(record_university_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select record_university_id = public.current_university_id()
$$;

-- Remove the prototype's cross-tenant policies before installing tenant-aware ones.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'users', 'student_profiles', 'functional_requirements', 'buildings',
        'rooms', 'room_features', 'courses', 'sections', 'enrollments',
        'room_assignments', 'room_change_events', 'compatibility_checks',
        'remediation_cases', 'notifications', 'audit_events'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

create policy "users read same tenant or self" on public.users
  for select using (
    id = auth.uid()
    or (
      public.is_current_tenant(university_id)
      and public.current_user_role_text() in (
        'accessibility_coordinator', 'university_admin', 'demo_admin'
      )
    )
  );

create policy "students read own tenant profile" on public.student_profiles
  for select using (
    public.is_current_tenant(university_id)
    and user_id = auth.uid()
  );
create policy "coordinators manage tenant profiles" on public.student_profiles
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('accessibility_coordinator', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('accessibility_coordinator', 'demo_admin')
  );

create policy "students read own tenant requirements" on public.functional_requirements
  for select using (
    public.is_current_tenant(university_id)
    and exists (
      select 1 from public.student_profiles profile
      where profile.id = student_id
        and profile.university_id = functional_requirements.university_id
        and profile.user_id = auth.uid()
    )
  );
create policy "coordinators manage tenant requirements" on public.functional_requirements
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('accessibility_coordinator', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('accessibility_coordinator', 'demo_admin')
  );

create policy "tenant users read buildings" on public.buildings
  for select to authenticated using (public.is_current_tenant(university_id));
create policy "tenant users read rooms" on public.rooms
  for select to authenticated using (public.is_current_tenant(university_id));
create policy "tenant users read room features" on public.room_features
  for select to authenticated using (public.is_current_tenant(university_id));
create policy "tenant users read courses" on public.courses
  for select to authenticated using (public.is_current_tenant(university_id));
create policy "tenant users read sections" on public.sections
  for select to authenticated using (public.is_current_tenant(university_id));

create policy "facilities manage tenant rooms" on public.rooms
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'facilities_staff', 'scheduling_staff', 'university_admin', 'demo_admin'
    )
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'facilities_staff', 'scheduling_staff', 'university_admin', 'demo_admin'
    )
  );
create policy "facilities manage tenant room features" on public.room_features
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('facilities_staff', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('facilities_staff', 'demo_admin')
  );

create policy "students read own tenant enrollments" on public.enrollments
  for select using (
    public.is_current_tenant(university_id)
    and exists (
      select 1 from public.student_profiles profile
      where profile.id = student_id
        and profile.university_id = enrollments.university_id
        and profile.user_id = auth.uid()
    )
  );
create policy "authorised staff read tenant enrollments" on public.enrollments
  for select using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'accessibility_coordinator', 'scheduling_staff', 'university_admin', 'demo_admin'
    )
  );

create policy "scheduling manages tenant assignments" on public.room_assignments
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('scheduling_staff', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('scheduling_staff', 'demo_admin')
  );
create policy "scheduling manages tenant room changes" on public.room_change_events
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('scheduling_staff', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('scheduling_staff', 'demo_admin')
  );

create policy "students read own tenant checks" on public.compatibility_checks
  for select using (
    public.is_current_tenant(university_id)
    and exists (
      select 1 from public.student_profiles profile
      where profile.id = student_id
        and profile.university_id = compatibility_checks.university_id
        and profile.user_id = auth.uid()
    )
  );
create policy "operational staff read tenant checks" on public.compatibility_checks
  for select using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'accessibility_coordinator', 'facilities_staff', 'scheduling_staff',
      'university_admin', 'demo_admin'
    )
  );
create policy "coordinators manage tenant checks" on public.compatibility_checks
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('accessibility_coordinator', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('accessibility_coordinator', 'demo_admin')
  );

create policy "students read own tenant cases" on public.remediation_cases
  for select using (
    public.is_current_tenant(university_id)
    and exists (
      select 1
      from public.compatibility_checks check_record
      join public.student_profiles profile on profile.id = check_record.student_id
      where check_record.id = compatibility_check_id
        and check_record.university_id = remediation_cases.university_id
        and profile.user_id = auth.uid()
    )
  );
create policy "staff manage tenant cases" on public.remediation_cases
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'accessibility_coordinator', 'facilities_staff', 'scheduling_staff', 'demo_admin'
    )
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'accessibility_coordinator', 'facilities_staff', 'scheduling_staff', 'demo_admin'
    )
  );

create policy "users read own tenant notifications" on public.notifications
  for select using (
    public.is_current_tenant(university_id)
    and recipient_id = auth.uid()
  );
create policy "staff create tenant notifications" on public.notifications
  for insert with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'accessibility_coordinator', 'scheduling_staff', 'demo_admin'
    )
  );
create policy "staff read tenant audit events" on public.audit_events
  for select using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'accessibility_coordinator', 'university_admin', 'demo_admin'
    )
  );
create policy "tenant users insert audit events" on public.audit_events
  for insert to authenticated with check (
    public.is_current_tenant(university_id)
    and (actor_id = auth.uid() or actor_id is null)
  );

create policy "university admins manage own university" on public.universities
  for update using (
    id = public.current_university_id()
    and public.current_user_role_text() in ('university_admin', 'demo_admin')
  )
  with check (id = public.current_university_id());
create policy "platform admins manage university metadata" on public.universities
  for all using (public.current_user_role_text() = 'platform_admin')
  with check (public.current_user_role_text() = 'platform_admin');
create policy "tenant users read own university metadata" on public.universities
  for select using (id = public.current_university_id());

create policy "tenant users read feature catalogue" on public.feature_catalogue_entries
  for select using (public.is_current_tenant(university_id));
create policy "university admins manage feature catalogue" on public.feature_catalogue_entries
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('university_admin', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('university_admin', 'demo_admin')
  );

create policy "tenant staff read room outages" on public.room_feature_outages
  for select using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'accessibility_coordinator', 'facilities_staff', 'scheduling_staff',
      'university_admin', 'demo_admin'
    )
  );
create policy "facilities manage tenant room outages" on public.room_feature_outages
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('facilities_staff', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('facilities_staff', 'demo_admin')
  );

create policy "tenant staff read workflow definitions" on public.workflow_definitions
  for select using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() <> 'student'
  );
create policy "university admins manage workflow definitions" on public.workflow_definitions
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('university_admin', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('university_admin', 'demo_admin')
  );
create policy "tenant staff read workflow steps" on public.workflow_steps
  for select using (public.is_current_tenant(university_id));
create policy "university admins manage workflow steps" on public.workflow_steps
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('university_admin', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('university_admin', 'demo_admin')
  );
create policy "tenant staff read workflow instances" on public.workflow_instances
  for select using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'accessibility_coordinator', 'facilities_staff', 'scheduling_staff',
      'university_admin', 'demo_admin'
    )
  );
create policy "coordinators manage workflow instances" on public.workflow_instances
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('accessibility_coordinator', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('accessibility_coordinator', 'demo_admin')
  );
create policy "tenant staff read workflow step instances" on public.workflow_step_instances
  for select using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in (
      'accessibility_coordinator', 'facilities_staff', 'scheduling_staff',
      'university_admin', 'demo_admin'
    )
  );
create policy "tenant owners update workflow step instances" on public.workflow_step_instances
  for update using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() = assigned_role
  )
  with check (public.is_current_tenant(university_id));

create policy "tenant staff read notification templates" on public.notification_templates
  for select using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() <> 'student'
  );
create policy "university admins manage notification templates" on public.notification_templates
  for all using (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('university_admin', 'demo_admin')
  )
  with check (
    public.is_current_tenant(university_id)
    and public.current_user_role_text() in ('university_admin', 'demo_admin')
  );
