# Task 35 — Climate Events Implementation Plan

> **For agentic workers:** Execute task-by-task with `superpowers:executing-plans`. Keep the Notion page In progress until every required criterion is verified.

**Goal:** Add municipal climate-event lifecycle management and safely link authorized occurrences to persisted events.

**Architecture:** Additive PostgreSQL/Prisma schema changes and RLS-scoped server operations; domain parsing and lifecycle rules remain pure TypeScript. Database locks/triggers enforce one active event per municipality, cross-municipality integrity, occurrence-link audit, and atomic close checks; the existing public intake resolves the active event in its idempotent transaction. The panel gains a dedicated management page, while existing occurrence detail, filters, and CSV expose the persisted link.

**Tech Stack:** Next.js 16.3.5 App Router, TypeScript, Prisma 7.10, PostgreSQL/PostGIS, Supabase Auth/RLS, Playwright.

**Spec:** [Notion Task 35 — Gerir eventos climáticos e vincular ocorrências](https://app.notion.com/p/3f1efe2e57f281b19ed4c7eb2d4aeaa4)

## Global Constraints

- Use only the root `.env`; migrations and database writes must target allowlisted isolated test databases.
- Preserve all existing rows, table identities, occurrence IDs, relationships, photos, and audit history.
- No public event read or caller-supplied event ID in citizen intake; resolve the active event server-side.
- Keep current municipality and group access rules; never reveal out-of-scope occurrence identifiers or counts.
- Use transactional optimistic versions, server timestamps, and audit both event lifecycle and occurrence-link changes.
- Read the relevant installed Next.js guide before changing an App Router page or Route Handler.
- Do not commit, push, deploy, or merge during implementation; verify locally and record sanitized evidence.

## Review Focus

- Concurrent event starts in one municipality must leave at most one active event; different municipalities may each have one.
- Closing must serialize with occurrence insert/link/status/delete/restore and include soft-deleted pending records in the municipal blocker check.
- A public retry must retain its original resolved event after the active event changes.
- RLS must permit authorized municipal reads and manager/admin writes without giving public, operator, or consultation roles event management.
- A manager must not learn whether hidden-group pending occurrences exist beyond a generic out-of-scope blocker.

---

### Task 1: Additive schema, RLS, and concurrency guards

**Files:** `prisma/schema.prisma`; new Prisma migration after `202610060001_dashboard_closures`; `tests/database/climate-events.spec.ts`; `tests/fixtures/access.ts` only if needed.

- [ ] Add failing database assertions for legacy rows remaining unchanged, valid event transitions, one active event per municipality under concurrent starts, group/event municipality integrity, and RLS/grants by role.
- [ ] Run the new database spec and confirm it fails because the schema/API objects are absent.
- [ ] Add `climate_events`, nullable `occurrences.climate_event_id`, relations, partial active-event unique index, lookup indexes, and restricted RLS/grants using additive migration SQL.
- [ ] Add database enforcement for actor/municipality checks, event transitions, versioning, audit writes, and the shared municipality lock used by closure and occurrence writes.
- [ ] Generate Prisma client, run migration tests against the allowlisted isolated database, and confirm all new assertions pass without modifying existing fixture data.

### Task 2: Domain and event management API

**Files:** `src/features/climate-events/contracts.ts`; `domain/input.ts`; `application/manage-climate-events.ts`; `src/server/climate-events.ts`; `src/app/api/core/climate-events/route.ts`; `src/app/api/core/climate-events/[id]/route.ts`; corresponding unit/API specs.

- [ ] Add failing unit tests for name/date bounds, calendar dates, invalid transitions, stale versions, and required link-correction reasons.
- [ ] Add failing API tests for unauthenticated, CONSULTA, OPERADOR, GESTOR, ADMINISTRADOR, inactive profiles, foreign municipality, unknown IDs, and request-field spoofing.
- [ ] Implement list/create and versioned edit/start/close operations with server authorization inside `withSession`; return generic blockers when hidden groups prevent closing.
- [ ] Verify audit events and event responses contain only the permitted event data; keep all responses `no-store`.

### Task 3: Public intake and occurrence-link correction

**Files:** `src/server/occurrences/intake.ts`; `src/server/occurrences/persist.ts`; occurrence mutation domain/application/server; `src/app/api/core/occurrences/[id]/route.ts`; API/unit/database specs.

- [ ] Add failing tests for active-event resolution, no-active behavior, replay after event rotation, unauthorized/cross-municipality corrections, stale versions, and audit atomicity.
- [ ] Resolve and lock the active event inside the public idempotency transaction; persist its ID only on first creation and retain the existing replay response.
- [ ] Add manager/admin-only event-link correction with a justification of at least 10 characters, expected occurrence version, same-municipality validation, and old/new values in `occurrence_events` and `audit_events`.
- [ ] Prove transaction rollback leaves no partial occurrence, event link, or audit record.

### Task 4: Event discovery in occurrence detail, filters, and CSV

**Files:** `src/features/occurrences/list-input.ts`; `src/server/occurrences/list.ts`; `src/features/occurrences/export-csv.ts`; `src/app/api/core/occurrences/export/route.ts`; occurrence API/page UI; affected specs.

- [ ] Add failing tests for event and “Sem evento” filters, scoped event labels in detail/list, CSV identifier/name columns, and hidden occurrence behavior.
- [ ] Add event filter parsing and SQL clauses while preserving current pagination, group scope, and field-level private-data protection.
- [ ] Display event name/state and provide correction controls only to authorized managers/admins; refresh detail after successful save.
- [ ] Verify CSV escaping and no-event representation using existing CSV rules.

### Task 5: Management page and complete validation

**Files:** `src/app/painel/admin/climate-events/page.tsx`; `src/features/climate-events/ui/ClimateEventAdminPanel.tsx`; `src/app/painel/layout.tsx`; `tests/e2e/climate-events.spec.ts`; sanitized result report under `docs/releases/core/testing/results/`.

- [ ] Add failing browser scenarios for create → start → public create → query → correction → resolve/cancel → close, including invalid dates, duplicate active event, pending blocker, hidden-group blocker, empty states, and mobile/keyboard interaction.
- [ ] Build the dedicated management page with explicit confirm actions, expected-version updates, municipal display timezone, and accessible loading/error/success messaging.
- [ ] Run focused unit, API, database, and browser specs; run relevant lint and production build.
- [ ] Verify migrations preserve pre-existing counts and records; record exact commands, results, and any service-level limitation without PII or secrets.
- [ ] Re-fetch the Notion page, check each acceptance criterion against evidence, and set Done only after all criteria pass.
