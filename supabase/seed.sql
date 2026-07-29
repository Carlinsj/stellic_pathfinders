-- RoomReady competition seed uses fixed UUIDs for deterministic resets.
-- Users referenced here are synthetic and should be created in auth.users first
-- when running against a hosted Supabase project.

insert into public.buildings (id, name, address, latitude, longitude) values
  ('00000000-0000-4000-8000-000000000201', '2 MetroTech Center', '2 MetroTech Center, Brooklyn, NY', 40.693500, -73.985700),
  ('00000000-0000-4000-8000-000000000601', '6 MetroTech Center', '6 MetroTech Center, Brooklyn, NY', 40.694100, -73.985200)
on conflict (id) do update set name = excluded.name;

insert into public.rooms (
  id, building_id, room_number, capacity, floor, room_type, verified_at, verification_status
) values
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000201', '202', 48, 2, 'Lecture classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('00000000-0000-4000-8000-000000000815', '00000000-0000-4000-8000-000000000201', '815', 56, 8, 'Tiered lecture room', '2026-07-18T14:00:00Z', 'verified'),
  ('00000000-0000-4000-8000-000000000812', '00000000-0000-4000-8000-000000000201', '812', 52, 8, 'Flexible classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('00000000-0000-4000-8000-000000000804', '00000000-0000-4000-8000-000000000201', '804', 44, 8, 'Seminar room', '2025-10-10T14:00:00Z', 'needs_review'),
  ('00000000-0000-4000-8000-000000000606', '00000000-0000-4000-8000-000000000601', '606', 72, 6, 'Lecture classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000201', '405', 38, 4, 'Active learning room', '2026-07-18T14:00:00Z', 'verified')
on conflict (id) do update set
  capacity = excluded.capacity,
  verified_at = excluded.verified_at,
  verification_status = excluded.verification_status;

-- The complete, executable local seed is mirrored in src/data/demoData.ts so
-- the competition demo never depends on external services or auth fixtures.
