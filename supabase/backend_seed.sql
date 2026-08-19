-- CampusFit hosted Supabase seed
-- Generated from src/data/catalog.ts, src/data/seed.ts, and src/data/universities.ts.
-- Frontend string IDs are converted to deterministic UUIDs using md5(text)::uuid.
-- baselineByHour is mapped to historical_facility_demand.
-- travelMinutes is not persisted because the current schema has no matching field.
-- Synthetic profiles here are database rows only; Supabase Auth users must be created separately if you want to log in as them.

begin;

insert into public.universities (
  id, name, short_name, slug, logo_url,
  primary_colour, secondary_colour, timezone,
  email_domain, recreation_office_name,
  privacy_count_threshold, auto_close_grace_minutes, active
)
values (
  md5('campusfit:university:nyu')::uuid,
  'New York University','NYU','nyu',null,
  '#57068c','#f0e8f5','America/New_York',
  'nyu.edu','NYU Athletics',3,30,true
)
on conflict (slug) do update set
  name=excluded.name,
  short_name=excluded.short_name,
  primary_colour=excluded.primary_colour,
  secondary_colour=excluded.secondary_colour,
  timezone=excluded.timezone,
  email_domain=excluded.email_domain,
  recreation_office_name=excluded.recreation_office_name,
  privacy_count_threshold=excluded.privacy_count_threshold,
  auto_close_grace_minutes=excluded.auto_close_grace_minutes,
  active=excluded.active,
  updated_at=now();

with rows(legacy_key,name,short_name,address,description,capacity) as (
  values
    ('nyu_palladium','Palladium Athletic Facility','Palladium','140 E 14th St','Deep-water pool, multi-use court, climbing wall, cycling room, group fitness, strength, and cardio.',620),
    ('nyu_paulson','John A. Paulson Center','Paulson','181 Mercer St','Six-lane pool, four multi-use courts, squash, jogging track, recreational classes, strength, and cardio.',780),
    ('nyu_404','404 Fitness','404 Fitness','404 Lafayette St','Three floors of strength and cardio with functional turf, fitness studios, cycling, and stretching.',260),
    ('nyu_brooklyn','Brooklyn Athletic Facility','Brooklyn','6 MetroTech Center','Regulation gym, scheduled court sports, group fitness, stretching, strength, and cardio at MetroTech.',310)
)
insert into public.facilities (
  id, university_id, name, short_name, address, description, capacity, active
)
select
  md5('campusfit:facility:'||legacy_key)::uuid,
  md5('campusfit:university:nyu')::uuid,
  name, short_name, address, description, capacity, true
from rows
on conflict (university_id,name) do update set
  short_name=excluded.short_name,
  address=excluded.address,
  description=excluded.description,
  capacity=excluded.capacity,
  active=excluded.active,
  updated_at=now();

delete from public.facility_operating_hours
where university_id=md5('campusfit:university:nyu')::uuid;

insert into public.facility_operating_hours (
  id, university_id, facility_id, weekday, opening_time, closing_time
)
select
  md5('campusfit:hours:'||f.id::text||':'||d.weekday)::uuid,
  f.university_id,
  f.id,
  d.weekday,
  case when d.weekday=0 then time '09:00' else time '06:30' end,
  case when d.weekday in (5,6) then time '22:00' else time '23:30' end
from public.facilities f
cross join generate_series(0,6) d(weekday)
where f.university_id=md5('campusfit:university:nyu')::uuid;

with rows(key,display_name) as (
  values
    ('back','Back'),('chest','Chest'),('legs','Legs'),('shoulders','Shoulders'),
    ('biceps','Biceps'),('triceps','Triceps'),('arms','Arms'),('cardio','Cardio'),
    ('full_body','Full body'),('mobility','Mobility'),
    ('general_strength','General strength'),('general_workout','General workout')
)
insert into public.workout_focuses (id,university_id,key,display_name,active)
select
  md5('campusfit:focus:'||key)::uuid,
  md5('campusfit:university:nyu')::uuid,
  key,display_name,true
from rows
on conflict (university_id,key) do update set
  display_name=excluded.display_name,
  active=excluded.active;

with rows(key,display_name,category) as (
  values
    ('badminton','Badminton','court'),('squash','Squash','court'),
    ('climbing','Climbing','recreation'),('swimming','Swimming','aquatics'),
    ('basketball','Basketball','court'),('volleyball','Volleyball','court'),
    ('indoor_track','Indoor track','cardio'),('group_fitness','Group fitness','fitness'),
    ('racquetball','Racquetball','court'),('cycling','Cycling','cardio'),
    ('pickleball','Pickleball','court'),('futsal','Futsal','court'),
    ('table_tennis','Table tennis','court'),('cricket','Cricket','court'),
    ('functional_training','Functional training','fitness')
)
insert into public.activities (id,university_id,key,display_name,category,active)
select
  md5('campusfit:activity:'||key)::uuid,
  md5('campusfit:university:nyu')::uuid,
  key,display_name,category,true
from rows
on conflict (university_id,key) do update set
  display_name=excluded.display_name,
  category=excluded.category,
  active=excluded.active;

with rows(key,display_name,category,supported_focuses,default_usage_minutes) as (
  values
    ('cable','Cable stations','strength',array['back','chest','arms','biceps','triceps']::text[],12),
    ('pull_up','Pull-up stations','strength',array['back','biceps']::text[],8),
    ('lat_pulldown','Lat pulldown machines','strength',array['back']::text[],10),
    ('row_machine','Row machines','strength',array['back']::text[],12),
    ('dumbbells','Dumbbells','strength',array['back','chest','legs','shoulders','arms','full_body']::text[],14),
    ('bench','Bench stations','strength',array['chest','arms']::text[],14),
    ('smith','Smith machines','strength',array['chest','legs','full_body']::text[],15),
    ('squat_rack','Squat racks','strength',array['legs','full_body']::text[],18),
    ('leg_press','Leg press machines','strength',array['legs']::text[],12),
    ('leg_curl','Leg curl machines','strength',array['legs']::text[],10),
    ('treadmill','Treadmills','cardio',array['cardio']::text[],25),
    ('elliptical','Ellipticals','cardio',array['cardio']::text[],25),
    ('bike','Stationary bikes','cardio',array['cardio']::text[],25),
    ('stair_climber','Stair climbers','cardio',array['cardio','legs']::text[],20),
    ('badminton_court','Badminton courts','activity',array[]::text[],45),
    ('squash_court','Squash courts','activity',array[]::text[],45),
    ('climbing_wall','Climbing wall','activity',array[]::text[],60),
    ('pool_lane','Pool lanes','activity',array[]::text[],40),
    ('basketball_court','Basketball / multi-use courts','activity',array[]::text[],50),
    ('studio','Fitness studios','activity',array['mobility']::text[],45),
    ('indoor_track','Indoor track','activity',array['cardio']::text[],30),
    ('table_tennis_table','Table tennis tables','activity',array[]::text[],30),
    ('functional_turf','Functional training turf','activity',array[]::text[],30),
    ('functional_rig','Functional training rigs','strength',array['full_body','general_strength']::text[],15)
)
insert into public.equipment_types (
  id,university_id,key,display_name,category,supported_workout_focuses,default_usage_minutes,active
)
select
  md5('campusfit:equipment:'||key)::uuid,
  md5('campusfit:university:nyu')::uuid,
  key,display_name,category,supported_focuses,default_usage_minutes,true
from rows
on conflict (university_id,key) do update set
  display_name=excluded.display_name,
  category=excluded.category,
  supported_workout_focuses=excluded.supported_workout_focuses,
  default_usage_minutes=excluded.default_usage_minutes,
  active=excluded.active;

delete from public.facility_activities
where university_id=md5('campusfit:university:nyu')::uuid;

with rows(facility_key,activity_key) as (
  values
    ('nyu_palladium','swimming'),('nyu_palladium','basketball'),('nyu_palladium','volleyball'),
    ('nyu_palladium','climbing'),('nyu_palladium','cycling'),('nyu_palladium','group_fitness'),
    ('nyu_paulson','swimming'),('nyu_paulson','basketball'),('nyu_paulson','volleyball'),
    ('nyu_paulson','badminton'),('nyu_paulson','pickleball'),('nyu_paulson','squash'),
    ('nyu_paulson','indoor_track'),('nyu_paulson','group_fitness'),
    ('nyu_404','group_fitness'),('nyu_404','cycling'),('nyu_404','functional_training'),
    ('nyu_brooklyn','basketball'),('nyu_brooklyn','volleyball'),('nyu_brooklyn','badminton'),
    ('nyu_brooklyn','futsal'),('nyu_brooklyn','table_tennis'),('nyu_brooklyn','cricket'),
    ('nyu_brooklyn','group_fitness')
)
insert into public.facility_activities (
  university_id,facility_id,activity_id,availability,verified_at
)
select
  md5('campusfit:university:nyu')::uuid,
  md5('campusfit:facility:'||facility_key)::uuid,
  md5('campusfit:activity:'||activity_key)::uuid,
  'available',
  now()
from rows;

delete from public.workout_equipment_weights
where university_id=md5('campusfit:university:nyu')::uuid;

with rows(focus_key,equipment_key,weight) as (
  values
    ('back','cable',1.00),('back','pull_up',0.85),('back','lat_pulldown',0.95),('back','row_machine',0.90),('back','dumbbells',0.45),
    ('chest','bench',1.00),('chest','dumbbells',0.80),('chest','cable',0.65),('chest','smith',0.55),
    ('legs','squat_rack',1.00),('legs','leg_press',0.90),('legs','smith',0.60),('legs','leg_curl',0.75),('legs','dumbbells',0.35),
    ('shoulders','dumbbells',1.00),('shoulders','cable',0.65),('shoulders','smith',0.35),
    ('biceps','dumbbells',0.80),('biceps','cable',0.65),('biceps','pull_up',0.35),
    ('triceps','cable',0.90),('triceps','dumbbells',0.50),('triceps','bench',0.35),
    ('arms','cable',1.00),('arms','dumbbells',0.90),('arms','bench',0.45),
    ('cardio','treadmill',0.80),('cardio','elliptical',0.50),('cardio','bike',0.55),('cardio','stair_climber',0.45),('cardio','indoor_track',0.30),
    ('full_body','functional_rig',0.80),('full_body','dumbbells',0.80),('full_body','squat_rack',0.55),('full_body','cable',0.50),
    ('mobility','studio',0.75),
    ('general_strength','functional_rig',0.80),('general_strength','dumbbells',0.65),('general_strength','cable',0.55),
    ('general_workout','treadmill',0.40),('general_workout','dumbbells',0.40),('general_workout','cable',0.35)
)
insert into public.workout_equipment_weights (
  university_id,workout_focus_id,equipment_type_id,demand_weight,expected_usage_minutes
)
select
  md5('campusfit:university:nyu')::uuid,
  md5('campusfit:focus:'||r.focus_key)::uuid,
  md5('campusfit:equipment:'||r.equipment_key)::uuid,
  r.weight,e.default_usage_minutes
from rows r
join public.equipment_types e
  on e.id=md5('campusfit:equipment:'||r.equipment_key)::uuid;

delete from public.equipment_outages
where university_id=md5('campusfit:university:nyu')::uuid;
delete from public.facility_equipment
where university_id=md5('campusfit:university:nyu')::uuid;

with base_counts(key,qty) as (
  values
    ('cable',8),('pull_up',5),('lat_pulldown',5),('row_machine',4),('dumbbells',16),('bench',9),
    ('smith',4),('squat_rack',7),('leg_press',4),('leg_curl',4),('treadmill',22),('elliptical',12),
    ('bike',14),('stair_climber',7),('badminton_court',4),('squash_court',3),('climbing_wall',1),
    ('pool_lane',6),('basketball_court',2),('studio',3),('indoor_track',1),('table_tennis_table',4),
    ('functional_turf',1),('functional_rig',4)
),
facility_order(facility_key,idx) as (
  values ('nyu_palladium',0),('nyu_paulson',1),('nyu_404',2),('nyu_brooklyn',3)
),
verified(facility_key,equipment_key,qty) as (
  values
    ('nyu_palladium','pool_lane',8),('nyu_palladium','basketball_court',1),('nyu_palladium','climbing_wall',5),
    ('nyu_paulson','pool_lane',6),('nyu_paulson','basketball_court',4),('nyu_paulson','squash_court',2),
    ('nyu_404','studio',2),('nyu_404','functional_turf',1),('nyu_brooklyn','basketball_court',1)
),
activity_equipment(activity_key,equipment_key) as (
  values
    ('badminton','badminton_court'),('squash','squash_court'),('climbing','climbing_wall'),
    ('swimming','pool_lane'),('basketball','basketball_court'),('volleyball','basketball_court'),
    ('indoor_track','indoor_track'),('group_fitness','studio'),('racquetball','squash_court'),
    ('cycling','bike'),('pickleball','basketball_court'),('futsal','basketball_court'),
    ('table_tennis','table_tennis_table'),('cricket','basketball_court'),
    ('functional_training','functional_turf')
),
computed as (
  select
    fo.facility_key,fo.idx,et.key equipment_key,et.category,bc.qty base_qty,v.qty verified_qty,
    case
      when et.category <> 'activity' then true
      when exists (
        select 1
        from activity_equipment ae
        join public.facility_activities fa
          on fa.activity_id=md5('campusfit:activity:'||ae.activity_key)::uuid
         and fa.facility_id=md5('campusfit:facility:'||fo.facility_key)::uuid
        where ae.equipment_key=et.key
      ) then true
      else false
    end present
  from facility_order fo
  cross join public.equipment_types et
  join base_counts bc on bc.key=et.key
  left join verified v
    on v.facility_key=fo.facility_key and v.equipment_key=et.key
  where et.university_id=md5('campusfit:university:nyu')::uuid
)
insert into public.facility_equipment (
  id,university_id,facility_id,equipment_type_id,total_quantity,operational_quantity,
  last_verified_at,verification_source,notes
)
select
  md5('campusfit:facility-equipment:'||facility_key||':'||equipment_key)::uuid,
  md5('campusfit:university:nyu')::uuid,
  md5('campusfit:facility:'||facility_key)::uuid,
  md5('campusfit:equipment:'||equipment_key)::uuid,
  case when not present then 0 else coalesce(verified_qty,greatest(1,base_qty-idx*2)) end,
  case
    when not present then 0
    when facility_key='nyu_palladium' and equipment_key='cable'
      then greatest(0,coalesce(verified_qty,greatest(1,base_qty-idx*2))-2)
    else coalesce(verified_qty,greatest(1,base_qty-idx*2))
  end,
  now(),'CampusFit deterministic seed',
  case when facility_key='nyu_palladium' and equipment_key='cable'
       then 'Temporary maintenance — synthetic demo outage' else null end
from computed;

insert into public.equipment_outages (
  id,university_id,facility_equipment_id,started_at,expected_resolved_at,resolved_at,reason,status
)
values (
  md5('campusfit:outage:nyu_palladium:cable')::uuid,
  md5('campusfit:university:nyu')::uuid,
  md5('campusfit:facility-equipment:nyu_palladium:cable')::uuid,
  now()-interval '1 hour',
  now()+interval '3 hours',
  null,
  'Temporary maintenance — synthetic demo outage',
  'active'
);

with rows(legacy_key,full_name,email,role,preferred_facility_key,privacy) as (
  values
    ('nyu_maya','Maya Chen','maya.chen@nyu.edu','student','nyu_palladium','anonymous_aggregate'),
    ('nyu_theo','Theo Rivera','theo.rivera@nyu.edu','student','nyu_paulson','anonymous_aggregate'),
    ('nyu_aisha','Aisha Brooks','aisha.brooks@nyu.edu','student','nyu_404','anonymous_aggregate'),
    ('nyu_staff_1','Sam Ortiz','sam.ortiz@nyu.edu','recreation_staff',null,'private'),
    ('nyu_staff_2','Priya Shah','priya.shah@nyu.edu','recreation_staff',null,'private'),
    ('nyu_admin','Taylor Morgan','taylor.morgan@nyu.edu','university_admin',null,'private')
)
insert into public.user_profiles (
  id,university_id,full_name,email,role,preferred_facility_id,default_privacy_level
)
select
  md5('campusfit:user:'||legacy_key)::uuid,
  md5('campusfit:university:nyu')::uuid,
  full_name,email,role::public.user_role,
  case when preferred_facility_key is null then null
       else md5('campusfit:facility:'||preferred_facility_key)::uuid end,
  privacy::public.privacy_level
from rows
on conflict (university_id,email) do update set
  full_name=excluded.full_name,
  role=excluded.role,
  preferred_facility_id=excluded.preferred_facility_id,
  default_privacy_level=excluded.default_privacy_level,
  updated_at=now();

insert into public.user_profiles (
  id,university_id,full_name,email,role,default_privacy_level
)
select
  md5('campusfit:user:nyu_synthetic_user_'||i)::uuid,
  md5('campusfit:university:nyu')::uuid,
  'Synthetic Live User '||i,
  'synthetic.live.'||i||'@campusfit.invalid',
  'student'::public.user_role,
  'anonymous_aggregate'::public.privacy_level
from generate_series(0,41) g(i)
on conflict (university_id,email) do nothing;

insert into public.user_profiles (
  id,university_id,full_name,email,role,default_privacy_level
)
select
  md5('campusfit:user:nyu_future_user_'||i)::uuid,
  md5('campusfit:university:nyu')::uuid,
  'Synthetic Future User '||i,
  'synthetic.future.'||i||'@campusfit.invalid',
  'student'::public.user_role,
  'anonymous_aggregate'::public.privacy_level
from generate_series(0,27) g(i)
on conflict (university_id,email) do nothing;

delete from public.historical_facility_demand
where university_id=md5('campusfit:university:nyu')::uuid
  and source='CampusFit deterministic baseline';

with facility_baseline(facility_key,capacity,peak,midday) as (
  values
    ('nyu_palladium',620,0.86::numeric,0.48::numeric),
    ('nyu_paulson',780,0.66::numeric,0.40::numeric),
    ('nyu_404',260,0.78::numeric,0.52::numeric),
    ('nyu_brooklyn',310,0.57::numeric,0.32::numeric)
),
hour_ratios(hour_num,ratio_key) as (
  values
    (6,'fixed_028'),(7,'fixed_038'),(8,'fixed_050'),(9,'fixed_038'),(10,'fixed_032'),
    (11,'midday'),(12,'midday_plus_012'),(13,'midday'),(14,'fixed_038'),(15,'fixed_050'),
    (16,'peak_minus_012'),(17,'peak_minus_004'),(18,'peak'),(19,'peak_minus_005'),
    (20,'fixed_058'),(21,'fixed_042'),(22,'fixed_024')
),
expanded as (
  select
    fb.*,hr.hour_num,
    case hr.ratio_key
      when 'fixed_028' then 0.28
      when 'fixed_038' then 0.38
      when 'fixed_050' then 0.50
      when 'fixed_032' then 0.32
      when 'midday' then fb.midday
      when 'midday_plus_012' then fb.midday+0.12
      when 'peak_minus_012' then fb.peak-0.12
      when 'peak_minus_004' then fb.peak-0.04
      when 'peak' then fb.peak
      when 'peak_minus_005' then fb.peak-0.05
      when 'fixed_058' then 0.58
      when 'fixed_042' then 0.42
      when 'fixed_024' then 0.24
    end::numeric ratio
  from facility_baseline fb
  cross join hour_ratios hr
)
insert into public.historical_facility_demand (
  id,university_id,facility_id,weekday,interval_start,interval_end,
  estimated_occupancy_range_low,estimated_occupancy_range_high,
  source,confidence,observation_date
)
select
  md5('campusfit:baseline:'||e.facility_key||':'||d.weekday||':'||e.hour_num)::uuid,
  md5('campusfit:university:nyu')::uuid,
  md5('campusfit:facility:'||e.facility_key)::uuid,
  d.weekday,
  make_time(e.hour_num,0,0),
  make_time(e.hour_num,59,59),
  greatest(0,floor(e.capacity*e.ratio*0.90)::integer),
  greatest(0,ceil(e.capacity*e.ratio*1.10)::integer),
  'CampusFit deterministic baseline',
  'medium'::public.confidence_level,
  current_date
from expanded e
cross join generate_series(0,6) d(weekday);

-- Remove prior deterministic visits so this file is re-runnable.
delete from public.visits
where id in (
  select md5('campusfit:visit:nyu_historical_'||i)::uuid from generate_series(0,179) g(i)
  union all
  select md5('campusfit:visit:nyu_live_'||i)::uuid from generate_series(0,41) g(i)
  union all
  select md5('campusfit:visit:nyu_planned_'||i)::uuid from generate_series(0,27) g(i)
);

with focus_keys(idx,key) as (
  values
    (0,'back'),(1,'chest'),(2,'legs'),(3,'shoulders'),(4,'biceps'),(5,'triceps'),
    (6,'arms'),(7,'cardio'),(8,'full_body'),(9,'mobility'),(10,'general_strength'),(11,'general_workout')
),
facility_keys(idx,key) as (
  values (0,'nyu_palladium'),(1,'nyu_paulson'),(2,'nyu_404'),(3,'nyu_brooklyn')
),
student_keys(idx,key) as (
  values (0,'nyu_maya'),(1,'nyu_theo'),(2,'nyu_aisha')
),
rows as (
  select
    i,fk.key facility_key,sk.key student_key,wf.key focus_key,
    42+(i%7)*6 duration,
    (
      (current_date-(1+(i%35)))::timestamp
      + make_interval(hours=>7+((i*3)%15),mins=>((i*7)%60))
    ) at time zone 'America/New_York' checked_in_at
  from generate_series(0,179) g(i)
  join facility_keys fk on fk.idx=i%4
  join student_keys sk on sk.idx=i%3
  join focus_keys wf on wf.idx=i%12
)
insert into public.visits (
  id,university_id,user_id,facility_id,status,source,intent,
  checked_in_at,checked_out_at,expected_duration_minutes,expected_end_at,
  auto_close_at,last_activity_at,primary_workout_focus_id,activity_id,
  privacy_level,reliability_weight,created_at,updated_at
)
select
  md5('campusfit:visit:nyu_historical_'||i)::uuid,
  md5('campusfit:university:nyu')::uuid,
  md5('campusfit:user:'||student_key)::uuid,
  md5('campusfit:facility:'||facility_key)::uuid,
  case when i%19=0 then 'auto_closed'::public.visit_status else 'completed'::public.visit_status end,
  'demo'::public.visit_source,
  'workout'::public.visit_intent,
  checked_in_at,
  checked_in_at+make_interval(mins=>duration),
  duration,
  checked_in_at+make_interval(mins=>duration),
  checked_in_at+make_interval(mins=>duration+30),
  checked_in_at,
  md5('campusfit:focus:'||focus_key)::uuid,
  null,
  'anonymous_aggregate'::public.privacy_level,
  case when i%19=0 then 0.35 else 1 end,
  checked_in_at,
  checked_in_at+make_interval(mins=>duration)
from rows;

with focus_keys(idx,key) as (
  values
    (0,'back'),(1,'chest'),(2,'legs'),(3,'shoulders'),(4,'biceps'),(5,'triceps'),
    (6,'arms'),(7,'cardio'),(8,'full_body'),(9,'mobility'),(10,'general_strength'),(11,'general_workout')
),
facility_keys(idx,key) as (
  values (0,'nyu_palladium'),(1,'nyu_paulson'),(2,'nyu_404'),(3,'nyu_brooklyn')
),
facility_activity_choice(facility_key,activity_key) as (
  values
    ('nyu_palladium','swimming'),('nyu_paulson','swimming'),
    ('nyu_404','group_fitness'),('nyu_brooklyn','basketball')
),
rows as (
  select
    i,fk.key facility_key,wf.key focus_key,(i%4=0) is_activity,fac.activity_key,
    55+(i%4)*10 duration,
    (current_date::timestamp+make_interval(hours=>17,mins=>(i%50)))
      at time zone 'America/New_York' checked_in_at
  from generate_series(0,41) g(i)
  join facility_keys fk on fk.idx=i%4
  join focus_keys wf on wf.idx=((i*5)%12)
  join facility_activity_choice fac on fac.facility_key=fk.key
)
insert into public.visits (
  id,university_id,user_id,facility_id,status,source,intent,
  planned_arrival_at,original_planned_arrival_at,checked_in_at,
  expected_duration_minutes,expected_end_at,auto_close_at,last_activity_at,
  primary_workout_focus_id,activity_id,privacy_level,reliability_weight,created_at,updated_at
)
select
  md5('campusfit:visit:nyu_live_'||i)::uuid,
  md5('campusfit:university:nyu')::uuid,
  md5('campusfit:user:nyu_synthetic_user_'||i)::uuid,
  md5('campusfit:facility:'||facility_key)::uuid,
  'checked_in'::public.visit_status,
  case when i%3=0 then 'planned'::public.visit_source else 'spontaneous'::public.visit_source end,
  case when is_activity then 'activity'::public.visit_intent else 'workout'::public.visit_intent end,
  case when i%3=0 then checked_in_at else null end,
  case when i%3=0 then checked_in_at else null end,
  checked_in_at,
  duration,
  checked_in_at+make_interval(mins=>duration),
  checked_in_at+make_interval(mins=>duration+30),
  checked_in_at,
  case when is_activity then null else md5('campusfit:focus:'||focus_key)::uuid end,
  case when is_activity then md5('campusfit:activity:'||activity_key)::uuid else null end,
  'anonymous_aggregate'::public.privacy_level,
  1,
  checked_in_at,
  checked_in_at
from rows;

with focus_keys(idx,key) as (
  values
    (0,'back'),(1,'chest'),(2,'legs'),(3,'shoulders'),(4,'biceps'),(5,'triceps'),
    (6,'arms'),(7,'cardio'),(8,'full_body'),(9,'mobility'),(10,'general_strength'),(11,'general_workout')
),
facility_keys(idx,key) as (
  values (0,'nyu_palladium'),(1,'nyu_paulson'),(2,'nyu_404'),(3,'nyu_brooklyn')
),
facility_activity_choice(facility_key,activity_key) as (
  values
    ('nyu_palladium','swimming'),('nyu_paulson','swimming'),
    ('nyu_404','group_fitness'),('nyu_brooklyn','basketball')
),
rows as (
  select
    i,fk.key facility_key,wf.key focus_key,(i%5=0) is_activity,fac.activity_key,
    (current_date::timestamp+make_interval(hours=>18+(i%3),mins=>((i%4)*15)))
      at time zone 'America/New_York' arrival
  from generate_series(0,27) g(i)
  join facility_keys fk on fk.idx=((i*3)%4)
  join focus_keys wf on wf.idx=((i+3)%12)
  join facility_activity_choice fac on fac.facility_key=fk.key
)
insert into public.visits (
  id,university_id,user_id,facility_id,status,source,intent,
  planned_arrival_at,original_planned_arrival_at,expected_duration_minutes,
  primary_workout_focus_id,activity_id,privacy_level,reliability_weight,created_at,updated_at
)
select
  md5('campusfit:visit:nyu_planned_'||i)::uuid,
  md5('campusfit:university:nyu')::uuid,
  md5('campusfit:user:nyu_future_user_'||i)::uuid,
  md5('campusfit:facility:'||facility_key)::uuid,
  'planned'::public.visit_status,
  'demo'::public.visit_source,
  case when is_activity then 'activity'::public.visit_intent else 'workout'::public.visit_intent end,
  arrival,arrival,60,
  case when is_activity then null else md5('campusfit:focus:'||focus_key)::uuid end,
  case when is_activity then md5('campusfit:activity:'||activity_key)::uuid else null end,
  'anonymous_aggregate'::public.privacy_level,
  1,
  (current_date::timestamp+interval '12 hours') at time zone 'America/New_York',
  (current_date::timestamp+interval '12 hours') at time zone 'America/New_York'
from rows;

commit;

-- Quick checks:
-- select slug,name from public.universities;
-- select count(*) from public.facilities;
-- select count(*) from public.activities;
-- select count(*) from public.workout_focuses;
-- select count(*) from public.equipment_types;
-- select status,count(*) from public.visits group by status order by status;
