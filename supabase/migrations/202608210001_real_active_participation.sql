create or replace function public.get_facility_participation_tracker(
  requested_university_id uuid,
  requested_facility_id uuid,
  requested_at timestamptz default now()
)
returns table (
  university_id uuid,
  facility_id uuid,
  interval_start timestamptz,
  interval_end timestamptz,
  campusfit_check_ins bigint,
  planned_check_ins bigint,
  walk_in_check_ins bigint,
  scheduled_for_window bigint,
  scheduled_not_checked_in bigint,
  typical_visitor_range_low integer,
  typical_visitor_range_high integer,
  confidence public.confidence_level,
  updated_at timestamptz,
  source_explanation text,
  official_occupancy_connected boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  tenant_timezone text;
begin
  if not exists (
    select 1 from public.facilities f
    where f.id = requested_facility_id
      and f.university_id = requested_university_id
      and f.active = true
  ) then
    raise exception 'tenant access denied';
  end if;

  select u.timezone into tenant_timezone
  from public.universities u
  where u.id = requested_university_id and u.active = true;

  if tenant_timezone is null then
    raise exception 'tenant access denied';
  end if;

  return query
  with active as (
    select v.user_id, v.source
    from public.visits v
    where v.university_id = requested_university_id
      and v.facility_id = requested_facility_id
      and v.status = 'checked_in'
      and v.source <> 'demo'
      and v.auto_close_at > requested_at
  ),
  window_plans as (
    select v.id
    from public.visits v
    where v.university_id = requested_university_id
      and v.facility_id = requested_facility_id
      and v.status in ('planned', 'delayed')
      and v.source <> 'demo'
      and v.planned_arrival_at >= requested_at
      and v.planned_arrival_at < requested_at + interval '30 minutes'
  ),
  historical as (
    select
      round(avg(h.estimated_occupancy_range_low))::integer as range_low,
      round(avg(h.estimated_occupancy_range_high))::integer as range_high,
      count(*) as sample_count
    from public.historical_facility_demand h
    where h.university_id = requested_university_id
      and h.facility_id = requested_facility_id
      and h.weekday = extract(dow from requested_at at time zone tenant_timezone)::smallint
      and h.interval_start <= (requested_at at time zone tenant_timezone)::time
      and h.interval_end > (requested_at at time zone tenant_timezone)::time
  )
  select
    requested_university_id,
    requested_facility_id,
    requested_at,
    requested_at + interval '30 minutes',
    (select count(distinct user_id) from active),
    (select count(distinct user_id) from active where source = 'planned'),
    (select count(distinct user_id) from active where source <> 'planned'),
    (select count(*) from window_plans),
    (select count(*) from window_plans),
    coalesce((select range_low from historical), 0),
    coalesce((select range_high from historical), 0),
    case when (select sample_count from historical) >= 8
      then 'medium'::public.confidence_level
      else 'low'::public.confidence_level
    end,
    now(),
    case when (select sample_count from historical) > 0
      then 'Live totals count current, voluntary CampusFit check-ins only. The typical range uses historical facility-demand records for this time. No official occupancy feed is connected.'
      else 'Live totals count current, voluntary CampusFit check-ins only. No historical range is available for this time, and no official occupancy feed is connected.'
    end,
    false;
end
$$;

revoke all on function public.get_facility_participation_tracker(uuid, uuid, timestamptz) from public;
revoke all on function public.get_facility_participation_tracker(uuid, uuid, timestamptz) from anon;
revoke all on function public.get_facility_participation_tracker(uuid, uuid, timestamptz) from authenticated;
grant execute on function public.get_facility_participation_tracker(uuid, uuid, timestamptz) to service_role;
