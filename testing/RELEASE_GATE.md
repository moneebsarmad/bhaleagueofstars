# Release Gate (No Ship Unless)

- All tests pass: `npm run test:all` from `apps/portal`
- Golden outputs match: `testing/rls/golden-views.test.ts`
- RLS negative tests pass for student, parent, house_mentor, staff
- No open P0/P1 issues for auth/permissions/points
- Supabase migrations applied + verified
- Backup + rollback plan exists for prod (DB snapshot + Vercel rollback)
