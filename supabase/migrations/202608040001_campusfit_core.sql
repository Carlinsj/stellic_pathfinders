-- CampusFit multi-tenant core schema. Requires pgcrypto (enabled by Supabase).
create extension if not exists pgcrypto;

create type public.user_role as enum ('student','recreation_staff','university_admin','demo_admin','platform_admin');
create type public.privacy_level as enum ('anonymous_aggregate','friends_only','private');
create type public.visit_status as enum ('planned','delayed','checked_in','completed','cancelled','expired','auto_closed');
create type public.visit_source as enum ('planned','spontaneous','staff_import','demo');
create type public.visit_intent as enum ('workout','activity');
create type public.crowd_level as enum ('low','moderate','busy','very_busy','unknown');
create type public.confidence_level as enum ('low','medium','high');
create type public.demand_level as enum ('low','moderate','high','very_high','unknown');

create table public.universities (
  id uuid primary key default gen_random_uuid(), name text not null, short_name text not null, slug text unique not null,
  logo_url text, primary_colour text not null, secondary_colour text not null, timezone text not null,
  email_domain text not null, recreation_office_name text not null, privacy_count_threshold integer not null default 3 check (privacy_count_threshold >= 3),
  auto_close_grace_minutes integer not null default 25 check (auto_close_grace_minutes between 5 and 180), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key, university_id uuid not null references public.universities on delete cascade,
  full_name text not null, email text not null, role public.user_role not null default 'student', preferred_facility_id uuid,
  default_privacy_level public.privacy_level not null default 'anonymous_aggregate', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (university_id, email)
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  name text not null, short_name text not null, address text not null, latitude numeric, longitude numeric, capacity integer check (capacity > 0),
  description text, image_url text, active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (university_id, name)
);
alter table public.user_profiles add constraint user_profiles_preferred_facility_fkey foreign key (preferred_facility_id) references public.facilities(id) on delete set null;

create table public.facility_operating_hours (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  facility_id uuid not null references public.facilities on delete cascade, weekday smallint not null check (weekday between 0 and 6),
  opening_time time, closing_time time, effective_from date, effective_to date, closure_reason text
);

create table public.activities (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  key text not null, display_name text not null, category text not null, active boolean not null default true, unique (university_id, key)
);
create table public.facility_activities (
  university_id uuid not null references public.universities on delete cascade, facility_id uuid not null references public.facilities on delete cascade,
  activity_id uuid not null references public.activities on delete cascade, availability text not null, quantity_or_capacity integer,
  schedule_notes text, verified_at timestamptz, primary key (facility_id, activity_id)
);

create table public.workout_focuses (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  key text not null, display_name text not null, parent_focus_id uuid references public.workout_focuses on delete set null,
  active boolean not null default true, unique (university_id, key)
);
create table public.equipment_types (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  key text not null, display_name text not null, category text not null, supported_workout_focuses text[] not null default '{}',
  default_usage_minutes integer not null default 10, active boolean not null default true, unique (university_id, key)
);
create table public.facility_equipment (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  facility_id uuid not null references public.facilities on delete cascade, equipment_type_id uuid not null references public.equipment_types on delete cascade,
  total_quantity integer not null check (total_quantity >= 0), operational_quantity integer not null check (operational_quantity >= 0 and operational_quantity <= total_quantity),
  last_verified_at timestamptz, verification_source text, notes text, unique (facility_id, equipment_type_id)
);
create table public.equipment_outages (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  facility_equipment_id uuid not null references public.facility_equipment on delete cascade, started_at timestamptz not null,
  expected_resolved_at timestamptz, resolved_at timestamptz, reason text not null, status text not null
);
create table public.workout_equipment_weights (
  university_id uuid not null references public.universities on delete cascade, workout_focus_id uuid not null references public.workout_focuses on delete cascade,
  equipment_type_id uuid not null references public.equipment_types on delete cascade, demand_weight numeric not null check (demand_weight between 0 and 1.5),
  expected_usage_minutes integer not null, primary key (workout_focus_id, equipment_type_id)
);

create table public.visits (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  user_id uuid not null references public.user_profiles on delete cascade, facility_id uuid not null references public.facilities on delete restrict,
  status public.visit_status not null, source public.visit_source not null, intent public.visit_intent not null, planned_arrival_at timestamptz, original_planned_arrival_at timestamptz,
  checked_in_at timestamptz, checked_out_at timestamptz, expected_duration_minutes integer not null check (expected_duration_minutes between 5 and 480),
  expected_end_at timestamptz, auto_close_at timestamptz, last_activity_at timestamptz, primary_workout_focus_id uuid references public.workout_focuses on delete set null,
  activity_id uuid references public.activities on delete set null, privacy_level public.privacy_level not null default 'anonymous_aggregate', crowd_feedback text,
  reliability_weight numeric not null default 1 check (reliability_weight between 0 and 1), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint visits_intent_fields_check check (
    (intent = 'workout' and primary_workout_focus_id is not null)
    or (intent = 'activity' and activity_id is not null and primary_workout_focus_id is null)
  )
);
create unique index visits_one_active_per_user on public.visits(user_id) where status = 'checked_in';
create index visits_tenant_facility_status_idx on public.visits(university_id, facility_id, status);
create index visits_planned_arrival_idx on public.visits(university_id, planned_arrival_at) where status in ('planned','delayed');

create table public.visit_secondary_focuses (
  university_id uuid not null references public.universities on delete cascade, visit_id uuid not null references public.visits on delete cascade,
  workout_focus_id uuid not null references public.workout_focuses on delete cascade, primary key (visit_id, workout_focus_id)
);
create table public.visit_equipment_needs (
  university_id uuid not null references public.universities on delete cascade, visit_id uuid not null references public.visits on delete cascade,
  equipment_type_id uuid not null references public.equipment_types on delete cascade, primary key (visit_id, equipment_type_id)
);
create table public.visit_status_history (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  visit_id uuid not null references public.visits on delete cascade, previous_status public.visit_status, new_status public.visit_status not null,
  reason text not null, changed_by uuid references public.user_profiles on delete set null, changed_at timestamptz not null default now()
);
create table public.visit_time_update_history (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  visit_id uuid not null references public.visits on delete cascade, previous_time timestamptz not null, new_time timestamptz not null,
  reason text not null, changed_at timestamptz not null default now()
);

create table public.historical_facility_demand (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  facility_id uuid not null references public.facilities on delete cascade, weekday smallint not null, interval_start time not null, interval_end time not null,
  estimated_occupancy_range_low integer not null, estimated_occupancy_range_high integer not null, source text not null,
  confidence public.confidence_level not null, observation_date date not null
);
create table public.demand_forecasts (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  facility_id uuid not null references public.facilities on delete cascade, interval_start timestamptz not null, interval_end timestamptz not null,
  expected_range_low integer not null, expected_range_high integer not null, crowd_level public.crowd_level not null,
  confidence public.confidence_level not null, generated_at timestamptz not null default now(), engine_version text not null
);
create table public.equipment_demand_forecasts (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  facility_id uuid not null references public.facilities on delete cascade, equipment_type_id uuid not null references public.equipment_types on delete cascade,
  interval_start timestamptz not null, interval_end timestamptz not null, demand_level public.demand_level not null,
  estimated_queue_minutes_low integer not null, estimated_queue_minutes_high integer not null, confidence public.confidence_level not null, generated_at timestamptz not null default now()
);
create table public.occupancy_observations (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  facility_id uuid not null references public.facilities on delete cascade, source_type text not null, observed_at timestamptz not null,
  count_low integer not null, count_high integer not null, confidence public.confidence_level not null, metadata jsonb not null default '{}'
);
create table public.equipment_availability_reports (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  facility_equipment_id uuid not null references public.facility_equipment on delete cascade, user_id uuid not null references public.user_profiles on delete cascade,
  report_type text not null check (report_type in ('occupied','unavailable','out_of_service','queue_estimate')), created_at timestamptz not null default now(),
  expires_at timestamptz not null, status text not null, confirmation_count integer not null default 0
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  user_id uuid not null references public.user_profiles on delete cascade, visit_id uuid references public.visits on delete cascade,
  kind text not null, body text not null, scheduled_at timestamptz, sent_at timestamptz, read_at timestamptz, created_at timestamptz not null default now()
);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities on delete cascade,
  actor_id uuid references public.user_profiles on delete set null, action text not null, target_type text not null, target_id uuid,
  metadata jsonb not null default '{}', created_at timestamptz not null default now()
);

create or replace function public.current_university_id() returns uuid language sql stable security definer set search_path = public
as $$ select university_id from public.user_profiles where id = auth.uid() $$;
create or replace function public.current_user_role() returns public.user_role language sql stable security definer set search_path = public
as $$ select role from public.user_profiles where id = auth.uid() $$;

-- Tenant isolation is applied to every tenant-owned table. Visits are additionally owner/staff restricted.
do $$ declare table_name text; begin
  foreach table_name in array array[
    'user_profiles','facilities','facility_operating_hours','activities','facility_activities','workout_focuses','equipment_types',
    'facility_equipment','equipment_outages','workout_equipment_weights','visits','visit_secondary_focuses','visit_equipment_needs',
    'visit_status_history','visit_time_update_history','historical_facility_demand','demand_forecasts','equipment_demand_forecasts',
    'occupancy_observations','equipment_availability_reports','notifications','audit_events'
  ] loop execute format('alter table public.%I enable row level security', table_name); end loop;
end $$;

create policy universities_public_active on public.universities for select using (active);
alter table public.universities enable row level security;

do $$ declare table_name text; begin
  foreach table_name in array array[
    'facilities','facility_operating_hours','activities','facility_activities','workout_focuses','equipment_types','facility_equipment',
    'historical_facility_demand','demand_forecasts','equipment_demand_forecasts','occupancy_observations'
  ] loop execute format('create policy tenant_read on public.%I for select using (university_id = public.current_university_id())', table_name); end loop;
end $$;

create policy profile_self_or_tenant_staff on public.user_profiles for select using (
  id = auth.uid() or (university_id = public.current_university_id() and public.current_user_role() in ('recreation_staff','university_admin','platform_admin'))
);
create policy profile_self_update on public.user_profiles for update using (id = auth.uid()) with check (id = auth.uid() and university_id = public.current_university_id());
create policy visit_owner_or_staff on public.visits for select using (
  university_id = public.current_university_id() and (user_id = auth.uid() or public.current_user_role() in ('recreation_staff','university_admin','demo_admin','platform_admin'))
);
create policy visit_owner_insert on public.visits for insert with check (university_id = public.current_university_id() and user_id = auth.uid());
create policy visit_owner_update on public.visits for update using (university_id = public.current_university_id() and user_id = auth.uid())
  with check (university_id = public.current_university_id() and user_id = auth.uid());
create policy visit_owner_delete on public.visits for delete using (university_id = public.current_university_id() and user_id = auth.uid());
create policy notification_owner on public.notifications for select using (university_id = public.current_university_id() and user_id = auth.uid());

-- Only staff/admin roles may mutate university operational configuration.
do $$ declare table_name text; begin
  foreach table_name in array array['facilities','facility_operating_hours','activities','facility_activities','facility_equipment','equipment_outages']
  loop execute format('create policy tenant_staff_write on public.%I for all using (university_id = public.current_university_id() and public.current_user_role() in (''recreation_staff'',''university_admin'',''platform_admin'')) with check (university_id = public.current_university_id())', table_name); end loop;
end $$;

-- Public student clients call this aggregate RPC instead of selecting other students' active visits.
create or replace function public.get_live_facility_aggregate(requested_facility_id uuid)
returns table (facility_id uuid, campusfit_check_ins bigint, focus_counts jsonb, activity_counts jsonb, generated_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare tenant_id uuid; threshold integer;
begin
  tenant_id := public.current_university_id();
  if not exists (select 1 from public.facilities f where f.id = requested_facility_id and f.university_id = tenant_id) then raise exception 'tenant access denied'; end if;
  select u.privacy_count_threshold into threshold from public.universities u where u.id = tenant_id;
  return query
  with active as (select * from public.visits v where v.university_id = tenant_id and v.facility_id = requested_facility_id and v.status = 'checked_in'),
  focuses as (select wf.display_name, count(*) count from active a join public.workout_focuses wf on wf.id = a.primary_workout_focus_id group by wf.display_name),
  acts as (select ac.display_name, count(*) count from active a join public.activities ac on ac.id = a.activity_id group by ac.display_name)
  select requested_facility_id, (select count(*) from active),
    coalesce((select jsonb_object_agg(display_name, case when count >= threshold then to_jsonb(count) else '"Low activity"'::jsonb end) from focuses), '{}'::jsonb),
    coalesce((select jsonb_object_agg(display_name, case when count >= threshold then to_jsonb(count) else '"Low activity"'::jsonb end) from acts), '{}'::jsonb), now();
end $$;
revoke all on function public.get_live_facility_aggregate(uuid) from public;
grant execute on function public.get_live_facility_aggregate(uuid) to authenticated;
