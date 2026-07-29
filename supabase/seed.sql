-- Complete deterministic multi-university competition seed.
-- Every person, building, room, course, and operational record is synthetic.

insert into public.buildings (id, university_id, name, address, latitude, longitude) values
  ('10000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', '2 MetroTech Center', 'Synthetic campus record · Brooklyn, NY', 40.693500, -73.985700),
  ('10000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', '6 MetroTech Center', 'Synthetic campus record · Brooklyn, NY', 40.694100, -73.985200),
  ('10000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Rogers Hall Demo Annex', 'Synthetic campus record · Brooklyn, NY', 40.694600, -73.986100),
  ('20000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Digital Computer Laboratory', 'Synthetic demo inventory · Urbana, IL', 40.113800, -88.226300),
  ('20000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Siebel Center Demo Wing', 'Synthetic demo inventory · Urbana, IL', 40.114000, -88.224900),
  ('20000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Loomis Laboratory Demo Wing', 'Synthetic demo inventory · Urbana, IL', 40.110800, -88.223700)
on conflict (id) do update set
  university_id = excluded.university_id,
  name = excluded.name,
  address = excluded.address;

insert into public.rooms (
  id, university_id, building_id, room_number, capacity, floor, room_type,
  verified_at, verification_status
) values
  ('10000000-0000-4000-8000-000000000202', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000001', '202', 48, 2, 'Lecture classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000815', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000001', '815', 56, 8, 'Tiered lecture room', '2026-07-18T14:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000812', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000001', '812', 52, 8, 'Flexible classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000804', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000001', '804', 44, 8, 'Seminar room', '2025-10-10T14:00:00Z', 'needs_review'),
  ('10000000-0000-4000-8000-000000000606', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000002', '606', 72, 6, 'Lecture classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000405', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000001', '405', 38, 4, 'Active learning room', '2026-07-18T14:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000310', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000002', '310', 60, 3, 'Flexible classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000110', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000003', '110', 70, 1, 'Lecture classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000214', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000003', '214', 32, 2, 'Seminar room', '2026-07-18T14:00:00Z', 'verified'),
  ('10000000-0000-4000-8000-000000000701', '11111111-1111-4111-8111-111111111111', '10000000-0000-4000-8000-000000000002', '701', 80, 7, 'Lecture classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000001320', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000001', 'DCL 1320', 52, 1, 'Flexible classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000001310', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000001', 'DCL 1310', 64, 1, 'Fixed-seat classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000001327', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000001', 'DCL 1327', 58, 1, 'Flexible classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000001304', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000001', 'DCL 1304', 46, 1, 'Seminar room', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000001404', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000002', 'SC 1404', 80, 1, 'Lecture classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000002405', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000002', 'SC 2405', 44, 2, 'Flexible classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000000141', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000003', 'LL 141', 96, 1, 'Lecture classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000000144', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000003', 'LL 144', 36, 1, 'Seminar room', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000002302', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000001', 'DCL 2302', 72, 2, 'Lecture classroom', '2026-07-18T14:00:00Z', 'verified'),
  ('20000000-0000-4000-8000-000000001302', '22222222-2222-4222-8222-222222222222', '20000000-0000-4000-8000-000000000002', 'SC 1302', 50, 1, 'Flexible classroom', '2026-07-18T14:00:00Z', 'verified')
on conflict (id) do update set
  university_id = excluded.university_id,
  capacity = excluded.capacity,
  verified_at = excluded.verified_at,
  verification_status = excluded.verification_status;

insert into public.feature_catalogue_entries (
  id, university_id, key, stable_concept_key, display_name, description,
  category, data_type, required_verification_frequency_days, active, sort_order
) values
  ('11000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'height_adjustable_student_desk', 'adjustable_desk', 'Height-adjustable student desk', 'Adjustable-height work surface.', 'Furniture', 'status', 180, true, 1),
  ('11000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111111', 'step_free_student_seating', 'step_free_student_area', 'Step-free route to student seating', 'Step-free route to the student area.', 'Mobility access', 'status', 180, true, 2),
  ('11000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'step_free_instruction_area', 'step_free_instruction_area', 'Step-free access to the instructional area', 'Step-free route to the teaching area.', 'Mobility access', 'status', 180, true, 3),
  ('11000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111', 'integrated_accessible_seating', 'integrated_accessible_seating', 'Accessible seating integrated with classmates', 'Integrated accessible seating position.', 'Seating', 'status', 180, true, 4),
  ('11000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'reachable_electrical_outlet', 'electrical_outlet', 'Reachable electrical outlet', 'Reachable power from the seating area.', 'Electrical access', 'status', 180, true, 5),
  ('11000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111111', 'assistive_listening_system', 'assistive_listening', 'Assistive-listening equipment', 'Installed or portable listening system.', 'Classroom technology', 'status', 90, true, 6),
  ('21000000-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'integrated_accessible_seating', 'integrated_accessible_seating', 'Accessible seating integrated with classmates', 'Integrated accessible seating position.', 'Seating', 'status', 180, true, 1),
  ('21000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'arm_free_classroom_chair', 'arm_free_chair', 'Arm-free classroom chair', 'Stable chair without fixed arms.', 'Furniture', 'status', 180, true, 2),
  ('21000000-0000-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'reachable_power_connection', 'electrical_outlet', 'Reachable electrical connection', 'Reachable power from the seating area.', 'Electrical access', 'status', 180, true, 3),
  ('21000000-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'assistive_listening_system', 'assistive_listening', 'Assistive-listening system', 'Installed or portable listening system.', 'Classroom technology', 'status', 90, true, 4),
  ('21000000-0000-4000-8000-000000000005', '22222222-2222-4222-8222-222222222222', 'step_free_seating_route', 'step_free_student_area', 'Step-free access to the seating area', 'Step-free route to the student area.', 'Mobility access', 'status', 180, true, 5),
  ('21000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'adjustable_accessible_workstation', 'adjustable_desk', 'Adjustable accessible workstation', 'Adjustable-height work surface.', 'Furniture', 'status', 180, true, 6)
on conflict (university_id, key) do update set
  display_name = excluded.display_name,
  stable_concept_key = excluded.stable_concept_key,
  active = excluded.active;

-- Browser competition data is mirrored in src/tenancy/tenantConfigs.ts so the
-- demo remains fully runnable without Supabase credentials.
