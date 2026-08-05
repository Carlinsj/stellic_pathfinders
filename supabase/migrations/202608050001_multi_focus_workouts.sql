-- Allow students to manage focus rows only for their own tenant-scoped visits.
create policy visit_secondary_focus_owner_select on public.visit_secondary_focuses
for select using (
  university_id = public.current_university_id()
  and exists (
    select 1 from public.visits v
    where v.id = visit_secondary_focuses.visit_id
      and v.university_id = visit_secondary_focuses.university_id
      and (v.user_id = auth.uid() or public.current_user_role() in ('recreation_staff','university_admin','demo_admin','platform_admin'))
  )
);

create policy visit_secondary_focus_owner_insert on public.visit_secondary_focuses
for insert with check (
  university_id = public.current_university_id()
  and exists (
    select 1 from public.visits v
    where v.id = visit_secondary_focuses.visit_id
      and v.university_id = visit_secondary_focuses.university_id
      and v.user_id = auth.uid()
  )
  and exists (
    select 1 from public.workout_focuses wf
    where wf.id = visit_secondary_focuses.workout_focus_id
      and wf.university_id = visit_secondary_focuses.university_id
  )
);

create policy visit_secondary_focus_owner_delete on public.visit_secondary_focuses
for delete using (
  university_id = public.current_university_id()
  and exists (
    select 1 from public.visits v
    where v.id = visit_secondary_focuses.visit_id
      and v.university_id = visit_secondary_focuses.university_id
      and v.user_id = auth.uid()
  )
);

-- Include primary and secondary focuses in privacy-thresholded aggregate results.
create or replace function public.get_live_facility_aggregate(requested_facility_id uuid)
returns table (facility_id uuid, campusfit_check_ins bigint, focus_counts jsonb, activity_counts jsonb, generated_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare tenant_id uuid; threshold integer;
begin
  tenant_id := public.current_university_id();
  if not exists (select 1 from public.facilities f where f.id = requested_facility_id and f.university_id = tenant_id) then raise exception 'tenant access denied'; end if;
  select u.privacy_count_threshold into threshold from public.universities u where u.id = tenant_id;
  return query
  with active as (
    select * from public.visits v
    where v.university_id = tenant_id and v.facility_id = requested_facility_id and v.status = 'checked_in'
  ),
  focus_links as (
    select a.id visit_id, a.primary_workout_focus_id workout_focus_id from active a where a.primary_workout_focus_id is not null
    union
    select sf.visit_id, sf.workout_focus_id
    from public.visit_secondary_focuses sf join active a on a.id = sf.visit_id
    where sf.university_id = tenant_id
  ),
  focuses as (
    select wf.display_name, count(*) count
    from focus_links fl join public.workout_focuses wf on wf.id = fl.workout_focus_id and wf.university_id = tenant_id
    group by wf.display_name
  ),
  acts as (
    select ac.display_name, count(*) count
    from active a join public.activities ac on ac.id = a.activity_id and ac.university_id = tenant_id
    group by ac.display_name
  )
  select requested_facility_id, (select count(*) from active),
    coalesce((select jsonb_object_agg(display_name, case when count >= threshold then to_jsonb(count) else '"Low activity"'::jsonb end) from focuses), '{}'::jsonb),
    coalesce((select jsonb_object_agg(display_name, case when count >= threshold then to_jsonb(count) else '"Low activity"'::jsonb end) from acts), '{}'::jsonb), now();
end $$;
