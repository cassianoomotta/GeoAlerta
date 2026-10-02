# Orientação de Abrigos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any citizen see route-ready shelters that are both active and `Aberto` after registering any occurrence, and let Administrators manage those shelters safely.

**Architecture:** Reuse `public.shelters` with an `is_active` flag, validated location, restrictive delete behavior, and server-enforced RLS. A public read-only endpoint uses the restricted ingestion role and returns a whitelist; authenticated Core endpoints use `withSession` and `administer`. The post-confirmation view fetches the public catalog without changing occurrence confirmation semantics.

**Tech Stack:** Next.js 16.3.5 Route Handlers, React 19, Prisma 7.10.0, PostgreSQL/PostGIS, Supabase Auth/RLS, Playwright, Docker.

**Spec:** `docs/superpowers/specs/2026-10-02-shelter-guidance-design.md`

## Global Constraints

- Keep `prisma/migrations/` as the canonical repository migration history; do not reapply `0_legacy` or reset the shared database.
- Preserve existing `public.shelters` rows and operational status; `is_active` defaults to true, while public visibility also requires `status = 'Aberto'`.
- Only an active `ADMINISTRADOR` may administer shelters in municipality `sa_patrulha`.
- Keep `shelter_people` inaccessible and its rows unchanged; a shelter delete must be rejected when linked rows exist.
- Never expose `service_role` credentials or direct table write access in the browser; public responses contain only the approved shelter fields.
- Show required-field `*` markers in the new administrative form; add no package dependencies.
- Use the repository-root `.env` only; run schema checks only against explicitly allowlisted Docker/local targets.
- Do not execute `git commit`, `git push`, `git merge`, or production deploys.

## Review Focus

- Invalid, partial, or untrusted map links must be rejected without network resolution; pin this in Task 1's parser tests.
- `is_active = true` must not publish `Lotado` or `Encerrado` shelters; pin this in Task 2's database/API tests.
- Existing shelter rows must remain unchanged and active after migration; add `NOT VALID` constraints to enforce valid new writes without rewriting incomplete legacy rows, and pin this in Task 2's migration preservation test.
- A delete racing with or encountering linked `shelter_people` rows must not cascade; pin this in Task 2's foreign-key and API tests.
- Empty or failed catalog fetch after a successful occurrence must leave its protocol visible and allow retry; pin this in Task 5's E2E tests.

---

### Task 1: Shelter contracts, input validation, and map directions

**Files:**
- Create: `src/features/shelters/contracts.ts`
- Create: `src/features/shelters/domain/input.ts`
- Create: `src/features/shelters/domain/directions.ts`
- Test: `tests/unit/shelters.spec.ts`

**Interfaces:**
- Produces `ShelterStatus = 'Aberto' | 'Lotado' | 'Encerrado'` and `ShelterType = 'humano' | 'pet' | 'misto'`.
- Produces `ShelterInput` with `name`, `type`, `address`, `lat`, `lng`, `capacity`, `occupied`, `phone`, `manager`, `status`, and `isActive`.
- Produces `parseShelterInput(value: unknown): ShelterInput`, accepting either a finite WGS84 coordinate pair or a recognized Google Maps/Waze destination URL that embeds coordinates; it rejects arbitrary hosts, shortened/ambiguous destinations, incomplete pairs, and conflicting inputs.
- Produces `buildShelterDirections(lat: number, lng: number): { googleMaps: string; waze: string }` using the current official URL formats verified before implementation.

- [x] **Step 1: Write unit tests** for trimmed required name/address, allowed type/status, nonnegative integer capacity/occupancy, paired in-range coordinates, valid recognized map links, malformed/short links, and exact Google/Waze destination URLs.
- [x] **Step 2: Run `node scripts/with-env.mjs playwright test --project=unit tests/unit/shelters.spec.ts`** and verify the new contract/helper tests fail for the missing modules.
- [x] **Step 3: Verify current Google Maps and Waze URL formats from their official documentation**, then implement the types, parser, host allowlist, coordinate extraction, and route builders in the three feature files.
- [x] **Step 4: Re-run the unit test command** and verify all shelter validation and route-link tests pass.

### Task 2: Additive database migration and access controls

**Files:**
- Modify: `prisma/schema.prisma` (`shelters`, `shelter_people` relation)
- Create: Prisma-generated migration under `prisma/migrations/` (use the repository's Prisma migration workflow)
- Modify: `tests/database/migrations.spec.ts`
- Test: `tests/database/shelters.spec.ts`

**Interfaces:**
- `shelters.is_active` is `BOOLEAN NOT NULL DEFAULT TRUE`.
- New/changed active shelters require nonempty address and valid, paired WGS84 latitude/longitude; the public catalog excludes legacy rows that lack a usable location.
- The `shelter_people.shelter_id` foreign key uses `ON DELETE RESTRICT`, not cascade.
- `geoalerta_ingest` has column-limited SELECT and RLS visibility only for active `Aberto` shelters in `sa_patrulha`.
- `geoalerta_runtime` has only the column privileges needed for shelter administration; RLS requires current active Administrator identity and matching municipality.
- No new grant or policy exposes `shelter_people` or grants write access to `anon`/`authenticated`.

- [x] **Step 1: Extend the database tests** to assert existing shelter values survive, existing rows default active, active location constraints hold, linked shelter deletion is restricted, ingest sees only active/open target-municipality rows, and runtime access is denied to non-admin users.
- [x] **Step 2: Run `npm run test:db -- tests/database/shelters.spec.ts`** against the Docker allowlisted database and confirm the new assertions fail before the migration.
- [x] **Step 3: Update Prisma models and generate a reviewed schema diff with the installed Prisma CLI**; include the narrow RLS/grant and foreign-key SQL in the canonical migration. Keep the new migration additive and existing shelter rows unchanged.
- [x] **Step 4: Update the migration fixture that creates a shelter** to include a valid address/location, then run `npm run test:db` and verify migrations and access tests pass on both legacy and empty-schema paths.
- [x] **Step 5: Run `node scripts/with-env.mjs prisma generate`** and verify the generated client includes `is_active`.

### Task 3: Public catalog and Administrator shelter API

**Files:**
- Modify: `src/server/occurrences/intake.ts` (catalog read through the restricted ingestion connection)
- Create: `src/app/api/core/public/shelters/route.ts`
- Create: `src/app/api/core/admin/shelters/route.ts`
- Test: `tests/api/shelters.spec.ts`

**Interfaces:**
- `listOpenShelters(): Promise<PublicShelter[]>` uses the restricted ingest connection and returns only `id`, `name`, `type`, `address`, `lat`, `lng`, and `status` for `is_active = true`, `status = 'Aberto'`, `municipio = 'sa_patrulha'`, ordered by name.
- `PublicShelter` contains no capacity/occupancy, phone, manager, notes, or `shelter_people` fields.
- `GET /api/core/public/shelters` returns `{ shelters: PublicShelter[] }` and `Cache-Control: no-store`.
- `GET` and action-based `POST /api/core/admin/shelters` use `withSession`, require `administer`, validate with `parseShelterInput`, and audit successful changes.
- `DELETE` returns a conflict for a foreign-key restriction and does not remove linked rows.

- [x] **Step 1: Write API tests** for public field whitelisting and active/open/municipality filters, no-store headers, admin CRUD, forbidden roles, invalid input, and deletion blocked by a linked row.
- [x] **Step 2: Implement and run** the API tests. Public reads use the restricted ingestion role; Administrator mutations use session authorization, parameterized SQL, and audit events.

### Task 4: Administrator shelter interface

**Files:**
- Create: `src/app/painel/admin/shelters/page.tsx`
- Create: `src/features/shelters/ui/ShelterAdminPanel.tsx`
- Modify: `src/features/access/ui/AdminPanel.tsx` (link to the shelter screen)
- Test: `tests/e2e/shelters-admin.spec.ts`

**Interfaces:**
- The page is guarded server-side with `withSession` and `requireCapability(actor, 'administer')`.
- The panel consumes only `/api/core/admin/shelters` and supports list, create, edit, activate/deactivate, and delete actions.
- The panel never exposes shelter-person management; all required fields show `*`; a map URL input is normalized by the Task 1 parser before persistence.
- The legacy `/painel/abrigos` route and module remain disabled.

- [x] **Step 1: Write an E2E test** proving the Administrator link and list are visible to an Administrator, and non-admin access to the page and mutation API is rejected.
- [x] **Step 2: Implement the guarded page and test** creation, editing, status/activation changes, safe deletion, and access denial. Keep status (`Aberto`/`Lotado`/`Encerrado`) separate from `is_active`.

### Task 5: Post-registration shelter guidance

**Files:**
- Modify: `src/app/page.tsx` (confirmation state and shelter section)
- Test: RF-004 cases in `tests/e2e/public-occurrence.spec.ts`

**Interfaces:**
- The post-confirmation section in `src/app/page.tsx` fetches `/api/core/public/shelters` and renders the returned open shelters with address and Google Maps/Waze route buttons.
- A successful occurrence protocol/status remains visible if the shelter fetch returns an error or no shelters; the error state offers a retry.
- The list is independent of occurrence type and uses no direct browser database client.

- [x] **Step 1: Write E2E tests** for successful occurrence confirmation followed by shelters, both route links, a different occurrence type, failed fetch/retry, and protocol persistence.
- [x] **Step 2: Implement and run** the post-confirmation shelter section without changing occurrence submission/idempotency; the success protocol remains visible independently of catalog availability.

### Task 6: Documentation, whole-suite checks, and migration handoff

**Files:**
- Modify: `docs/releases/core/PRD.md`
- Modify: `docs/releases/core/requirements.md`
- Modify: `docs/releases/core/architecture/README.md`
- Verify: `docs/superpowers/specs/2026-10-02-shelter-guidance-design.md`

- [x] **Step 1: Update product and architecture documentation** to state any occurrence shows only active `Aberto` shelters, Admin-only management, safe deletion, and the public data whitelist.
- [x] **Step 2: Run relevant unit, API, database, E2E, TypeScript, and lint checks.** Shelter-specific checks pass; unrelated existing failures are recorded in the handoff below.
- [x] **Step 3: Reconcile migration history** for project `fwqbwqxgajnrjwccdebh`. Confirmed the occurrence-type catalog and numeric protocol effects were already present in schema and Supabase history, then recorded their exact local Prisma checksums as applied. After the user's explicit instruction, applied the two shelter migrations and recorded their exact checksums.
- [x] **Step 4: Review local Docker evidence and remote post-migration state.** Remote shelter count stayed 2, linked people stayed 1, FK is RESTRICT, location/capacity checks pass, runtime/admin and ingestion column grants are present, and anonymous/direct people-table access is absent.
- [x] **Step 5: Run `git diff --check` and leave all changes uncommitted for the user.**

**Remote database boundary:** `prisma.config.ts` keeps local Prisma migration commands on allowlisted test targets. After the user explicitly requested reconciliation and application, the verified remote history was reconciled and the two shelter migrations were applied through the Supabase management connection. The Prisma CLI could not establish the remote schema-engine connection; the migration rows were therefore recorded transactionally in `_prisma_migrations` with checksums computed from the exact local SQL and guarded by checks for the already-applied schema effects.

**Validation handoff:** shelter unit tests 5/5, database shelter test 1/1, shelter API tests 3/3, relevant public/admin E2E tests 5/5, TypeScript, targeted ESLint, and `git diff --check` pass. Broader suites still report failures outside this feature: API address/protocol assertions; a database soft-deleted occurrence fixture authorization; and E2E legacy type-filter/manual type/protocol expectations. Remote checks confirm the shelter migrations and reconciled Prisma entries are recorded and the existing shelter/person rows remain intact. The restricted-role smoke query could not use `SET ROLE` under the MCP executor, but column grants were verified directly. Supabase's security advisor reports RLS disabled on `public.spatial_ref_sys`; no change was made.
