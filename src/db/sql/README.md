# SQL Migration Folder

Use this folder for SQL-first migrations that represent your canonical DB model.

Suggested naming pattern:

- `0001_init.sql`
- `0002_add_indexes.sql`
- `0003_audit-improvements.sql`

Keep each migration immutable after it is applied in production.
