# Traceability Matrix

Each item lists the exact test file(s) covering it. Checkboxes indicate coverage.

## Routes
- [x] `/dashboard` (staff leaderboard) -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard` (admin overview) -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/rewards` -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/analytics` -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/staff` -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/reports` -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/behaviour` -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/implementation-health` -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/students` -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/add-points` -> `testing/e2e/add-points.spec.ts`
- [x] `/dashboard/settings` -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/profile` -> `testing/e2e/routing.spec.ts`
- [x] `/dashboard/house` -> `testing/e2e/routing.spec.ts`
- [x] Removed: `/dashboard/search` -> `testing/e2e/routing.spec.ts`
- [x] Removed: `/dashboard/announcements` -> `testing/e2e/routing.spec.ts`
- [x] Removed: `/dashboard/data-quality` -> `testing/e2e/routing.spec.ts`

## API routes
- [x] `POST /api/behaviour/upload` -> `testing/e2e/api.spec.ts`
- [x] `POST /api/behaviour/reprocess` -> `testing/e2e/api.spec.ts`
- [x] `GET /api/staff/engagement` -> `testing/e2e/api.spec.ts`
- [x] `GET /api/implementation-health` -> `testing/e2e/api.spec.ts`
- [x] `POST /api/points/award` -> `testing/e2e/api.spec.ts`, `testing/e2e/add-points.spec.ts`

## Tables
- [x] `profiles` -> `testing/rls/rls-access.test.ts`
- [x] `staff` -> `testing/rls/rls-access.test.ts`
- [x] `admins` -> `testing/rls/rls-access.test.ts`
- [x] `students` -> `testing/rls/rls-access.test.ts`
- [x] `merit_log` -> `testing/rls/rls-access.test.ts`, `testing/e2e/add-points.spec.ts`
- [x] `3r_categories` -> `testing/e2e/api.spec.ts` (invalid category check)
- [x] `audit_logs` -> `testing/rls/rls-access.test.ts`

## Views
- [x] `house_standings_view` -> `testing/rls/golden-views.test.ts`
- [x] `top_students_per_house` -> `testing/rls/golden-views.test.ts`

## Permissions
- [x] `points.award` -> `testing/unit/permissions.test.ts`, `testing/rls/rls-access.test.ts`
- [x] `points.view_all` -> `testing/rls/rls-access.test.ts`
- [x] `analytics.view_all` -> `testing/unit/use-permissions.test.tsx`
- [x] `analytics.view_house` -> `testing/unit/use-permissions.test.tsx`
- [x] `students.view_all` -> `testing/rls/rls-access.test.ts`
- [x] `students.view_house` -> `testing/rls/rls-access.test.ts`
- [x] `reports.export_all` -> `testing/e2e/routing.spec.ts`
- [x] `staff.manage` -> `testing/e2e/routing.spec.ts`
- [x] `audit.view` -> `testing/rls/rls-access.test.ts`

## Middleware / Auth
- [x] Middleware redirect unauthenticated -> `testing/e2e/routing.spec.ts`
- [x] Role-dependent landing -> `testing/e2e/routing.spec.ts`
- [x] Realtime updates -> `testing/e2e/realtime.spec.ts`
