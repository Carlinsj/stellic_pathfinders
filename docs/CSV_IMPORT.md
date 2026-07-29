# Room inventory CSV import

Download the template from setup step 4. Required columns:

```text
building_name,building_code,room_number,capacity,floor,room_type,feature_key,feature_availability,verification_date,verification_source
```

Availability must be `available`, `unavailable`, `unknown`, or `temporarily_unavailable`. Dates use `YYYY-MM-DD`. Capacity must be a positive integer and floor an integer.

The importer validates each row with Zod. Valid rows remain available for import when other rows fail, and each error reports the source row. Quoted comma fields are supported; the competition parser is not intended to replace a full production ETL service.

In production:

1. stage validated rows with the actor’s `university_id`;
2. map `feature_key` through that tenant’s catalogue;
3. reject unknown or inactive keys;
4. upsert buildings/rooms using tenant-scoped constraints;
5. preserve verification source and date;
6. record an audit event and import report.

Scheduling integrations implement a future adapter that resolves the tenant from secure connection metadata and emits the same normalized row shape.
