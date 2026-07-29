# Data model

The normalized Supabase schema is defined in `supabase/migrations/202607290001_roomready_schema.sql`.

## Identity and requirements

- `users` maps authenticated people to one of six supported roles.
- `student_profiles` stores only a synthetic external reference and notification preference.
- `functional_requirements` stores active functional feature types, required/preferred level, and coordinator-only notes. There is no diagnosis column.

## Spaces and capabilities

- `buildings` stores campus locations.
- `rooms` stores capacity, floor, room type, and verification state.
- `room_features` stores feature availability, quantity, evidence source, time, and notes. Multiple records can preserve history; the engine deterministically applies the safest current interpretation.

## Courses and assignments

- `courses` and `sections` model a scheduled class and instructor.
- `enrollments` connect student profiles to sections.
- `room_assignments` retain current and historical locations using effective ranges.
- `room_change_events` record each detected move and its source.

## Operational response

- `compatibility_checks` persist pass, fail, and unknown lists with the engine version.
- `remediation_cases` assign ownership, proposed alternatives, and resolution.
- `notifications` store role-specific delivery content.
- `audit_events` record significant actions without unnecessary accommodation detail.

## Row-level security

Students can read their own profile, requirements, enrolments, checks, and notifications. Instructors cannot read functional requirements. Coordinators manage requirements and checks; facilities manage room capabilities; registrars manage assignments; authorised staff share case access.
