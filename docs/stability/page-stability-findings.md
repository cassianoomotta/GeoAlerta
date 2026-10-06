# GeoAlerta — page stability findings and release criteria

**Review date:** 2026-10-06  
**Disposition:** F-01 through F-03 were addressed locally without changing product behavior. F-04 and F-05 remain integration/coverage gaps. No production or shared environment was changed.

## Findings register

### F-01 — Resolved: browser selectors for list filters and manual entry

- **Impact:** these stale selectors blocked browser coverage of manager filtering and manual intake.
- **Evidence/resolution:** tests now explicitly open the collapsed filter disclosure, reopen it after URL navigations, and target its named controls. The manual form uses exact accessible roles/names. Full E2E passes 28/28, including pagination, filtering, manual submission, and idempotency.
- **Disposition:** resolved in the test suite; no product UI behavior changed.

### F-02 — Resolved: API privacy test asserted a stale detail-response shape

- **Impact:** one stale projection assertion prevented the API suite from passing.
- **Evidence/resolution:** `tests/api/access.spec.ts` now checks the authorized operational detail fields and explicitly denies `privateData` to `CONSULTA`. Existing sentinel, scope, and indistinguishable-404 checks remain. Full API passes 37/37.
- **Disposition:** resolved in tests; no product API behavior changed.

### F-03 — Resolved: default lint scope included generated and disabled legacy code

- **Impact:** generated `.cache`/`venv` and inactive legacy implementations drowned out the maintained-code signal.
- **Evidence/resolution:** `eslint.config.mjs` now excludes generated paths, one documentation migration script, and files only referenced by modules disabled in `src/modules/registry.ts`. `tests/database/migrations.spec.ts` was rewritten to avoid unused destructuring. Standard `npm run lint` passes with 0 errors and warnings.
- **Disposition:** resolved for the standard active-code check. Lint debt in disabled legacy modules is documented and must be addressed before any such module is re-enabled.

### F-04 — Hosted service integration remains unverified

- **Impact:** fixture tests cannot establish hosted Auth, Storage, Realtime, or the real project's configuration.
- **Evidence:** local `localhost:3000` browser smoke returned 200 on `/` and `/login`; anonymous `/painel` ended at `/login`. The database suite passed 30/30 on the allowlisted target, covering migrations/PostGIS/RLS there. No authenticated session or hosted service was exercised.
- **Proposed owner:** environment/release validation checklist, to be run by the project owner in an explicitly selected local/staging environment.
- **Acceptance criteria:** against an explicitly selected non-production Supabase project, record sanitized environment/revision; verify Auth, Storage photo authorization, hosted RLS, and Realtime delivery/revocation. Use synthetic records only in staging and record cleanup. Never write test data to production.

### F-05 — Notification subscription/reconnect lacks a dedicated UI E2E scenario

- **Impact:** snapshot/realtime reconciliation is present in source but not proven as a full user-visible sequence.
- **Evidence:** `src/features/occurrences/ui/CoreNotifications.tsx` contains snapshot loading, Realtime subscription, periodic reconciliation and deduplication; no dedicated UI test exercises insert/reconnect/revocation end-to-end.
- **Proposed owner:** notifications validation story, coordinated with F-04.
- **Acceptance criteria:** with controlled local fixtures, show initial snapshot, one new notification exactly once, recovery after a missed event/reconnect, visible access-revocation/error handling, and no notification from another authorized scope. Label real hosted verification separately.

## Stable-release exit checklist

- [ ] All 20 page routes are inventoried, classified, and their navigation/access boundaries reviewed (`page-inventory.md`).
- [ ] All four critical flows have evidence and explicit integration limits (`critical-flow-review.md`).
- [x] F-01 and F-02 are resolved and full API/E2E suites pass.
- [x] Standard lint scope is reliable and maintained-code findings are resolved or explicitly accepted; disabled legacy lint debt is recorded.
- [x] Build succeeds and browser checks cover current code through full fixture E2E plus a localhost public/anonymous smoke.
- [x] Database migration, PostGIS, RLS, and access suite passes on the allowlisted test database (30/30); this does not certify the hosted project.
- [ ] Hosted Auth, Storage, Realtime and any staging-only integration checks have explicit results, or are listed as release blockers.
- [ ] No production/shared-environment mutation or deployment is included in this review.

## Completion boundary for Task 26

Task 26 can close as a **review/documentation task** once the route inventory, flow review, findings with owners/acceptance criteria, release checklist, and actual validation results are linked from Notion. Closing this review does not mean the product meets the release checklist; the known test/lint failures and unverified integrations remain open follow-up work.
