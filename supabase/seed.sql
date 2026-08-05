-- Deterministic competition seed. All rows are synthetic.
insert into public.universities (id,name,short_name,slug,primary_colour,secondary_colour,timezone,email_domain,recreation_office_name,privacy_count_threshold,auto_close_grace_minutes) values
('10000000-0000-0000-0000-000000000001','New York University','NYU','nyu','#38255c','#ede7f6','America/New_York','nyu.edu','NYU Athletics',3,25);

insert into public.facilities (id,university_id,name,short_name,address,capacity,description) values
('11000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Palladium Athletic Facility','Palladium','140 E 14th St',620,'Strength, pool, courts, and studios.'),
('11000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','Paulson Center','Paulson','181 Mercer St',780,'Modern recreation near Washington Square.'),
('11000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','404 Fitness','404 Fitness','404 Lafayette St',260,'Compact workout-focused facility.'),
('11000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','Brooklyn Athletic Facility','Brooklyn','6 MetroTech Center',310,'Brooklyn campus recreation.');

-- Local UI seed generation lives in src/data/seed.ts and creates 250 synthetic NYU visits.
-- Production-style database seeds can create historical observations deterministically:
insert into public.historical_facility_demand
(university_id,facility_id,weekday,interval_start,interval_end,estimated_occupancy_range_low,estimated_occupancy_range_high,source,confidence,observation_date)
select f.university_id, f.id, d.weekday, make_time(h.hour_value,0,0), make_time(h.hour_value,30,0),
  greatest(5, round(f.capacity * (0.18 + ((h.hour_value + d.weekday) % 7) * 0.07))::integer),
  greatest(12, round(f.capacity * (0.28 + ((h.hour_value + d.weekday) % 7) * 0.08))::integer),
  'synthetic_demo','medium', current_date - d.weekday
from public.facilities f cross join generate_series(0,6) d(weekday) cross join generate_series(6,22) h(hour_value);
