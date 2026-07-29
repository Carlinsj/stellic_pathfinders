create extension if not exists pgcrypto;

create type public.user_role as enum (
  'student',
  'accessibility_coordinator',
  'registrar',
  'facilities_staff',
  'instructor',
  'demo_admin'
);
create type public.requirement_level as enum ('required', 'preferred');
create type public.room_feature_availability as enum (
  'available',
  'unavailable',
  'unknown',
  'temporarily_unavailable'
);
create type public.compatibility_status as enum (
  'compatible',
  'incompatible',
  'verification_required'
);
create type public.case_status as enum (
  'open',
  'in_review',
  'awaiting_verification',
  'resolved'
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  external_student_ref text unique,
  consent_to_student_notifications boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.functional_requirements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  feature_type text not null,
  requirement_level public.requirement_level not null default 'required',
  notes_visible_to_coordinator text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete restrict,
  room_number text not null,
  capacity integer not null check (capacity > 0),
  floor integer not null,
  room_type text not null,
  verified_at timestamptz,
  verification_status text not null default 'needs_review',
  unique (building_id, room_number)
);

create table public.room_features (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  feature_type text not null,
  availability public.room_feature_availability not null,
  quantity integer check (quantity is null or quantity >= 0),
  verification_source text not null,
  verified_at timestamptz not null,
  notes text
);
create index room_features_room_feature_idx
  on public.room_features (room_id, feature_type, verified_at desc);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null unique,
  title text not null
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  section_code text not null,
  instructor_id uuid not null references public.users(id) on delete restrict,
  meeting_days text[] not null,
  start_time time not null,
  end_time time not null,
  enrollment_count integer not null default 0,
  unique (course_id, section_code)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, section_id)
);

create table public.room_assignments (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete restrict,
  effective_from timestamptz not null,
  effective_to timestamptz,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to > effective_from)
);

create table public.room_change_events (
  id uuid primary key default gen_random_uuid(),
  previous_room_id uuid not null references public.rooms(id) on delete restrict,
  new_room_id uuid not null references public.rooms(id) on delete restrict,
  section_id uuid not null references public.sections(id) on delete cascade,
  changed_by uuid not null references public.users(id) on delete restrict,
  effective_at timestamptz not null,
  detected_at timestamptz not null default now(),
  reason text not null
);

create table public.compatibility_checks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  room_change_event_id uuid not null references public.room_change_events(id) on delete cascade,
  status public.compatibility_status not null,
  missing_features jsonb not null default '[]'::jsonb,
  uncertain_features jsonb not null default '[]'::jsonb,
  compatible_features jsonb not null default '[]'::jsonb,
  explanation text not null,
  evaluated_at timestamptz not null default now(),
  engine_version text not null
);

create table public.remediation_cases (
  id uuid primary key default gen_random_uuid(),
  compatibility_check_id uuid not null unique references public.compatibility_checks(id) on delete cascade,
  status public.case_status not null default 'open',
  assigned_team text not null,
  proposed_room_id uuid references public.rooms(id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check ((status = 'resolved') = (resolved_at is not null))
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  room_change_event_id uuid not null references public.room_change_events(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  audience public.user_role not null,
  subject text not null,
  body text not null,
  transport text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.student_profiles enable row level security;
alter table public.functional_requirements enable row level security;
alter table public.buildings enable row level security;
alter table public.rooms enable row level security;
alter table public.room_features enable row level security;
alter table public.courses enable row level security;
alter table public.sections enable row level security;
alter table public.enrollments enable row level security;
alter table public.room_assignments enable row level security;
alter table public.room_change_events enable row level security;
alter table public.compatibility_checks enable row level security;
alter table public.remediation_cases enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_events enable row level security;

create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create policy "users read self" on public.users
  for select using (id = auth.uid());
create policy "staff read users" on public.users
  for select using (public.current_user_role() in (
    'accessibility_coordinator', 'registrar', 'facilities_staff', 'demo_admin'
  ));

create policy "students read own profile" on public.student_profiles
  for select using (user_id = auth.uid());
create policy "coordinators manage student profiles" on public.student_profiles
  for all using (public.current_user_role() in ('accessibility_coordinator', 'demo_admin'))
  with check (public.current_user_role() in ('accessibility_coordinator', 'demo_admin'));

create policy "students read own functional requirements" on public.functional_requirements
  for select using (
    exists (
      select 1 from public.student_profiles p
      where p.id = student_id and p.user_id = auth.uid()
    )
  );
create policy "coordinators manage functional requirements" on public.functional_requirements
  for all using (public.current_user_role() in ('accessibility_coordinator', 'demo_admin'))
  with check (public.current_user_role() in ('accessibility_coordinator', 'demo_admin'));

create policy "authenticated users read buildings" on public.buildings
  for select to authenticated using (true);
create policy "authenticated users read rooms" on public.rooms
  for select to authenticated using (true);
create policy "authenticated users read room features" on public.room_features
  for select to authenticated using (true);
create policy "facilities manage rooms" on public.rooms
  for all using (public.current_user_role() in ('facilities_staff', 'registrar', 'demo_admin'))
  with check (public.current_user_role() in ('facilities_staff', 'registrar', 'demo_admin'));
create policy "facilities manage room features" on public.room_features
  for all using (public.current_user_role() in ('facilities_staff', 'demo_admin'))
  with check (public.current_user_role() in ('facilities_staff', 'demo_admin'));

create policy "authenticated users read courses" on public.courses
  for select to authenticated using (true);
create policy "authenticated users read sections" on public.sections
  for select to authenticated using (true);
create policy "registrars manage assignments" on public.room_assignments
  for all using (public.current_user_role() in ('registrar', 'demo_admin'))
  with check (public.current_user_role() in ('registrar', 'demo_admin'));
create policy "registrars manage room change events" on public.room_change_events
  for all using (public.current_user_role() in ('registrar', 'demo_admin'))
  with check (public.current_user_role() in ('registrar', 'demo_admin'));

create policy "students read own enrollments" on public.enrollments
  for select using (
    exists (
      select 1 from public.student_profiles p
      where p.id = student_id and p.user_id = auth.uid()
    )
  );
create policy "staff read enrollments" on public.enrollments
  for select using (public.current_user_role() in (
    'accessibility_coordinator', 'registrar', 'demo_admin'
  ));

create policy "students read own checks" on public.compatibility_checks
  for select using (
    exists (
      select 1 from public.student_profiles p
      where p.id = student_id and p.user_id = auth.uid()
    )
  );
create policy "coordinators manage checks" on public.compatibility_checks
  for all using (public.current_user_role() in ('accessibility_coordinator', 'demo_admin'))
  with check (public.current_user_role() in ('accessibility_coordinator', 'demo_admin'));

create policy "authorised staff manage cases" on public.remediation_cases
  for all using (public.current_user_role() in (
    'accessibility_coordinator', 'registrar', 'facilities_staff', 'demo_admin'
  ))
  with check (public.current_user_role() in (
    'accessibility_coordinator', 'registrar', 'facilities_staff', 'demo_admin'
  ));

create policy "users read own notifications" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "demo staff create notifications" on public.notifications
  for insert with check (public.current_user_role() in (
    'accessibility_coordinator', 'registrar', 'demo_admin'
  ));

create policy "authorised staff read audits" on public.audit_events
  for select using (public.current_user_role() in (
    'accessibility_coordinator', 'registrar', 'facilities_staff', 'demo_admin'
  ));
create policy "authenticated inserts audits" on public.audit_events
  for insert to authenticated with check (actor_id = auth.uid() or actor_id is null);

alter publication supabase_realtime add table public.room_change_events;
alter publication supabase_realtime add table public.compatibility_checks;
alter publication supabase_realtime add table public.remediation_cases;
alter publication supabase_realtime add table public.notifications;
