# Testing System (Portal Unified App)

This folder contains the deterministic test harness for the unified portal app.

## Quick start (local)

1) Start Supabase locally and apply migrations + seed:
```bash
supabase start
supabase db reset --seed-file supabase/seed/test_seed.sql
```

2) Export Supabase env values (local):
```bash
SUPABASE_JSON=$(supabase status --output json)
export NEXT_PUBLIC_SUPABASE_URL=$(echo "$SUPABASE_JSON" | jq -r '.api_url')
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(echo "$SUPABASE_JSON" | jq -r '.anon_key')
export SUPABASE_SERVICE_ROLE_KEY=$(echo "$SUPABASE_JSON" | jq -r '.service_role_key')
```

3) Run tests from `apps/portal`:
```bash
npm run test:unit
npm run test:rls
npm run test:e2e
npm run test:all
```

## Seed data + expectations
- Seed data: `supabase/seed/test_seed.sql`
- Golden outputs: `testing/expected/standings.json`
- Golden check tests: `testing/rls/golden-views.test.ts`

## Test users (created automatically in tests)
- Users are created via Supabase Admin API using deterministic IDs:
  - `super_admin@example.test`
  - `admin@example.test`
  - `teacher@example.test`
  - `support@example.test`
  - `mentor@example.test`
  - `student@example.test`
  - `parent@example.test`
- Password: `Test1234!`

## Admin app deprecation
The legacy admin app (`apps/admin`) is deprecated and should not be deployed. A `vercel.json` ignore rule is present to prevent accidental deployment.
