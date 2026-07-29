# Architecture

RoomReady uses explicit layers so room decisions remain deterministic and independently testable.

## 1. Presentation

React Router routes in `src/pages` render the landing page, student dashboard, room-change alert, comparison, remediation case, simulator, room capability record, and notification previews. `src/components` contains the application shell and accessible status primitives.

## 2. Application services

`processRoomChange.ts` coordinates the demo workflow:

1. Create a room-change event.
2. Evaluate the replacement room for the affected enrolment.
3. Rank compatible alternatives.
4. Create a remediation case when needed.
5. Create audience-specific notifications.
6. Produce audit events.

It is callable directly by tests, UI actions, a future edge function, or a registrar adapter.

## 3. Compatibility engine

`compatibilityEngine.ts` is a pure TypeScript function. It sorts input for deterministic output, chooses the safest result for duplicate feature records, applies hard requirement rules, flags stale evidence, and returns human-readable reasons. It has no network, storage, UI, or AI dependency.

`rankRooms.ts` gates on full compatibility and schedule availability before applying an explainable score for capacity, building continuity, travel distance, verification freshness, and disruption.

## 4. Database and repositories

The local demo uses typed seed data and browser storage for resettable device-local state. `RoomReadyRepository` defines the persistence boundary. The Supabase client adapter is enabled only when public connection values exist.

The migration defines the normalized PostgreSQL schema, RLS policies, and realtime publication.

## 5. Notifications

`NotificationAdapter` supports in-app, preview, and console transports. Template-generated copy is the default. A future AI copy adapter may only rewrite already-determined facts and must fall back to these templates.

## 6. Realtime

Hosted implementations subscribe to room-change events, compatibility checks, remediation cases, and notifications. The UI’s demo state mirrors this event sequence synchronously to remain reliable offline.

## Trust boundaries

- Instructors receive only course-level minimum-necessary notices.
- Students and accessibility coordinators can see student-specific results.
- Facilities receive a requirement-level verification task without a diagnosis.
- Registrars confirm assignments.
- Audit metadata excludes unnecessary student detail.
