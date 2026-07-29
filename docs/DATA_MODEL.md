# Data model

The base schema is in `202607290001_roomready_schema.sql`; `202607290002_multi_university.sql` upgrades it to tenant isolation.

## Tenant metadata

`universities` stores globally unique slug/domain, theme colours, timezone, office names, support contact, and activation status.

## Tenant-owned records

`university_id` is indexed on users, student profiles, functional requirements, buildings, rooms, room features, courses, sections, enrolments, assignments, change events, compatibility checks, remediation cases, notifications, audit events, feature outages, catalogues, templates, and every workflow table.

Natural uniqueness is tenant-scoped:

- user email;
- student external reference;
- course code;
- building/room number;
- section code;
- catalogue key and stable concept;
- workflow name/version;
- notification template key.

## Feature catalogue

`feature_catalogue_entries` maps a university `key` and display name to a `stable_concept_key`. The engine uses the stable concept; the UI and imports use tenant wording. Frequency, active status, category, data type, and sort order are configuration.

## Operational records

Rooms store capability records and optional `room_feature_outages`. Room change events create compatibility checks. Incompatible checks create remediation cases and workflow instances.

## Workflow history

`workflow_definitions` and `workflow_steps` contain published configuration. `workflow_instances` store the definition ID, version, and JSON snapshot. `workflow_step_instances` preserve the label, owner, order, and status used by the case.

## Privacy

The schema stores functional requirements, not diagnoses. There is no diagnosis column. Notification content is audience-specific. Audit metadata must avoid unnecessary student detail.
