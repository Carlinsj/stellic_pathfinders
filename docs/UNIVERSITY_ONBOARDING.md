# University onboarding

Open `/:tenant/admin/setup` as a university administrator.

1. **University identity** — name, short name, immutable demo slug, optional logo, accessible brand colours, timezone, and email domain.
2. **Office information** — accessibility, facilities, and scheduling names plus support/escalation contacts.
3. **Feature catalogue** — enable defaults, rename labels, add tenant custom entries, group by category, and set verification frequency.
4. **Import rooms** — upload CSV, create manually, import synthetic demo data, or review the future adapter contract.
5. **Workflow** — reorder configured steps with keyboard-accessible Move up/Move down buttons.
6. **Preview** — inspect draft brand tokens, student alert wording, catalogue labels, and timeline.
7. **Publish** — activate the configuration in competition mode.

Publishing is blocked if either main colour has less than 4.5:1 contrast on white. Competition publishing is local and never sends notifications or writes to an external scheduling system.

Production publishing should create immutable configuration versions in Supabase, validate domain ownership, authorize `manage_tenant_configuration` server-side, and publish within a transaction.
