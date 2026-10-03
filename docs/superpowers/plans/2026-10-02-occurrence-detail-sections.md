# Occurrence Detail Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:test-driven-development for each behavior change and superpowers:verification-before-completion before reporting completion. Do not commit, push, merge, or deploy.

**Goal:** Expand the authorized occurrence detail into citizen, occurrence, impacts/triage, and attendance sections, with additive storage, group-scoped access, and specific indexed filters.

**Architecture:** Keep the existing Core occurrence lifecycle and current detail route. Add optional structured triage and location references to existing occurrences, seed small catalogs from the approved workbook values, and store attendance actions in an append-only child table. Extend the server API and page using existing capability checks; keep private citizen values behind `privateData`, operational writes behind `operate` and the occurrence's authorized group, and derive actor/time from the active session and database. Structured filters use catalog IDs, equality/`IN`, and bounded date ranges. No free-text `LIKE` filter is introduced.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma, PostgreSQL/Supabase with RLS, existing Core API/session authorization, project test and Docker database workflows.

**Spec:** `docs/superpowers/specs/2026-10-02-occurrence-detail-citizen-triage-attendance-design.md`

## Global Constraints

- Preserve all existing tables, occurrences, IDs, references, events, and lifecycle status values. Schema changes must be additive and nullable/default-safe for existing rows.
- Follow repository migration protections: generate and validate locally against a fresh disposable Docker database; do not apply a migration to remote Supabase.
- Do not reintroduce disabled legacy dispatch/team modules or synchronize/import records from Excel. Use the workbook only for approved field and choice values.
- Keep personal data out of attendance records, URLs, logs, and Realtime payloads. Never trust client-supplied actor IDs or audit timestamps.
- Enforce access on the server and in RLS; UI hiding alone is not authorization. Every attendance read/write must remain within the parent occurrence's access scope.
- Keep occurrence status in the existing Core state machine. `SOLICITOU REFORÇO` is an attendance attribute/event, not a new lifecycle status.
- Implement filters only for fields shown by the interface. Use exact catalog IDs, `=`, `IN`, and `[from, to)` date predicates; do not introduce `%term%`/`LIKE` search. Add indexes only for observed query shapes and confirm plans with representative data.
- Respect `AGENTS.md`: only edit/test locally; no git commit, push, merge, or production deploy. Keep environment configuration in root `.env` only.

## Review Focus

- RLS and API checks must prevent a user with access to one group from reading or recording attendance for another group's occurrence; private citizen details require `privateData` independently of general detail access.
- The attendance author and timestamp must be server-generated, and new entries must not overwrite or expose previous entries.
- Nullable triage fields must render as “Não informado” rather than “Não”. Existing rows must remain valid after migration.
- Filter definitions, SQL predicates, and indexes must match the same exact fields and ordering offered in the UI. Reject accidental `LIKE` filters and unmeasured indexes.
- Migration tests must prove preservation of existing occurrence rows and use an isolated disposable database; remote Supabase remains untouched.

### Task 1: Define typed triage catalogs and validation contracts

**Files:**
- Create `src/features/occurrences/triage-contracts.ts`.
- Create `src/features/occurrences/triage-contracts.test.ts` (or the repository's colocated test convention).
- Update `src/features/occurrences/README.md` only if needed to document the new domain contract.

**Interfaces:** Define stable codes for occurrence situation (`EM_RISCO`, `JA_OCORREU`), tri-state victim/displaced answers (`SIM`, `NAO`, unknown as `null`), and structured damage/place/agency/location references. Define validated DTOs for editing triage and creating an attendance record; user/actor IDs and audit timestamps must not be accepted in client input.

**Steps:**
1. Write failing domain tests for accepted codes, invalid codes, null-as-unknown semantics, optional `OUTROS` description, and rejected client-supplied actor/time fields.
2. Run the targeted test and confirm it fails for missing behavior.
3. Implement parsing/validation without query or persistence logic.
4. Run the targeted test and typecheck; confirm all cases pass.

### Task 2: Additive database schema, catalogs, RLS, and measured indexes

**Files:**
- Update `prisma/schema.prisma` with optional occurrence references/triage fields, catalog models, and `OccurrenceServiceRecord`.
- Add the next Prisma migration under `prisma/migrations/<timestamp>_occurrence_triage_and_service_records/migration.sql`.
- Add or extend database migration/RLS tests in the existing database test location, plus seed fixtures sourced from the approved `DADOS` choices where the project keeps database test fixtures.

**Interfaces:** Add nullable catalog FKs for registering institution, neighborhood/locality and damage location; nullable `occurrence_situation`, `has_victims`, `has_displaced`, and optional `damage_location_detail`; add service records with occurrence FK, agency, attending person, attended time, action, result/notes, reinforcement flag, server-authored actor and created time. Catalog rows use stable codes and display labels. RLS must resolve access through the parent occurrence and the existing group policy model.

**Steps:**
1. Write a disposable-DB migration test that creates representative existing occurrences and verifies their IDs/data remain unchanged, new columns are null, and catalog/service-record FKs enforce integrity. Add RLS tests for authorized, wrong-group, and unauthenticated access.
2. Run the new tests against a fresh Docker database and confirm the expected failures before the schema exists.
3. Update Prisma models and create a nullable/additive migration with catalog seeds from the approved spreadsheet list. Grant only the minimum table operations needed; make attendance actor/time database-derived. Add parent-scope policies for reads and inserts and an auditable correction mechanism that preserves the original record.
4. Add only indexes needed by the detail/timeline and approved list-filter query shapes (including parent occurrence/time ordering and selective catalog/group/date combinations). Avoid standalone indexes on low-selectivity booleans.
5. Run Prisma validation, migration tests, RLS tests, and `EXPLAIN (ANALYZE, BUFFERS)` on representative disposable data; keep only indexes that improve an exposed query shape.

### Task 3: Extend detail and attendance APIs with server-side authorization

**Files:**
- Update `src/app/api/core/occurrences/[id]/route.ts`.
- Add `src/app/api/core/occurrences/[id]/service-records/route.ts` (or follow the existing route organization if an equivalent action endpoint is more consistent).
- Add a focused application module such as `src/features/occurrences/application/record-service-action.ts` and its tests.
- Update existing API/domain test fixtures for the occurrence detail.

**Interfaces:** Detail response adds structured citizen, occurrence, triage, and ordered attendance data. Citizen name/contact are returned only after server authorization for `privateData`; attendance details remain group-scoped. `POST` accepts validated action fields only and derives actor and timestamps from session/database. Use a transaction to persist the service record and its technical audit event. Any editable occurrence fields use the existing version/concurrency guard and lifecycle command.

**Steps:**
1. Write failing API/application tests for private-data redaction, permitted detail, wrong-group denial, valid attendance insert, server-owned actor/time, unchanged prior entries, audit transaction rollback, and stale-version behavior.
2. Run targeted tests and confirm missing contract behavior.
3. Implement response mapping and service-record command through existing authorization helpers; never put citizen or service text into Realtime or public responses.
4. Run targeted unit/API tests and typecheck. Verify existing detail/history/status behavior remains compatible.

### Task 4: Build the four-section occurrence detail and attendance timeline

**Files:**
- Update `src/app/painel/ocorrencias/[id]/page.tsx`.
- Add focused components under `src/features/occurrences/ui/` if needed, such as `OccurrenceCitizenSection.tsx`, `OccurrenceTriageSection.tsx`, and `OccurrenceServiceTimeline.tsx`.
- Add/update component or E2E tests using the existing project convention.

**Interfaces:** Render four named sections: citizen, occurrence, impacts/triage, attendance/actions. Show “Não informado” for unknown tri-state values. Keep citizen values absent for users without `privateData`. Show previous service entries chronologically, and provide a validated form only for users with `operate` on the occurrence group. The form supports multiple entries and communicates save errors without losing the typed draft.

**Steps:**
1. Write failing UI/E2E tests for all four sections, privacy by capability, “Não informado”, adding two distinct entries, and controls absent for read-only/wrong-group users.
2. Run the targeted tests and confirm the current page does not satisfy them.
3. Implement the layout and timeline against the API contract, preserving the current protocol navigation, status actions, photo, and technical history.
4. Run UI tests, relevant accessibility checks, and typecheck. Verify keyboard form flow and error recovery.

### Task 5: Add structured, exact filters and validate query plans

**Files:**
- Update `src/features/occurrences/list-input.ts` and the matching server list/query implementation (locate the existing filter-to-query path before editing).
- Update `src/app/painel/ocorrencias/page.tsx` and relevant filter components.
- Update list/API/database query tests and fixtures.

**Interfaces:** Offer filters only for approved structured fields available to the user: type, Core status, priority, group, registering institution, neighborhood/locality, occurrence situation, damage location, victims, displaced, attending agency, and date windows where the result set supports them. Use identifiers/enums with equality or `IN`; represent dates as inclusive start/exclusive end. “Não informado” is an explicit null filter. Do not add generic text search or `LIKE`.

**Steps:**
1. Write failing parser/query tests for exact single/multi-value filters, null selection, UTC date boundaries, invalid IDs, and empty-filter behavior. Add a guard test that the generated structured query path has no `LIKE`/`ILIKE` predicate.
2. Run tests and confirm missing filter support.
3. Implement allowlisted filter parsing and parameterized query construction using indexed predicates; preserve current default sorting and pagination.
4. Run tests against representative Docker data; inspect `EXPLAIN (ANALYZE, BUFFERS)` for the actual query combinations and tune migration indexes only where evidence supports them.

### Task 6: End-to-end regression, documentation, and completion checks

**Files:**
- Update `docs/releases/core/PRD.md` or the relevant Core detail/API documentation to reflect approved fields and behavior.
- Update `src/server/occurrences/README.md`, `src/features/occurrences/README.md`, and/or `prisma/README.md` only where implementation changes their documented contracts.
- Add/update E2E coverage in the existing E2E test location.

**Steps:**
1. Add a complete E2E scenario: open a protocol, view each section, exercise structured filters, edit authorized fields, create two attendance entries, and verify role/group visibility and citizen-data privacy.
2. Run the focused unit/API/UI/E2E/database suite, Prisma validation, lint, TypeScript, and the repository's supported Docker restore/migration checks.
3. Review migration SQL for destructive statements and query generation for accidental `LIKE`. Apply remote migrations only after explicit user authorization; record and verify the resulting state.
4. Report test evidence, any unavailable checks, and the exact local files changed. Do not commit or deploy.

## Execution Notes

- Keep each task independently testable and finish one task's red/green checks before proceeding.
- Do not start implementation until the user reviews this plan and selects an execution approach.
- Recommended approach: native execution in this chat, because the migration, RLS/API contract, and detail UI are tightly coupled. Subagent-driven execution is an alternative only if the user selects that method.
