begin;
delete from public.audit_events;
delete from public.notifications;
delete from public.remediation_cases;
delete from public.compatibility_checks;
delete from public.room_change_events;
delete from public.room_assignments;
delete from public.enrollments;
delete from public.functional_requirements;
delete from public.student_profiles;
delete from public.sections;
delete from public.courses;
delete from public.room_features;
delete from public.rooms;
delete from public.buildings;
\ir seed.sql
commit;
