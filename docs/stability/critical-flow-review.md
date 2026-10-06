# GeoAlerta — critical-flow review

**Review date:** 2026-10-06  
**Checkout reviewed:** canonical `C:\Users\Cassiano\Documents\Projetos\GeoAlerta`  
**Nature of review:** source inspection plus isolated local test harnesses. No product code, shared environment, or production configuration was changed.

## Evidence summary

| Check | Result | Evidence boundary |
|---|---|---|
| Unit suite | 143 passed | Local unit tests; not proof of hosted integrations. |
| Build | Passed; Next.js 16.3.5 and TypeScript completed | Built in `.cache/next-build-verify` so the user's `.next` server stayed untouched. Next warned that a parent `C:\Users\Cassiano\package-lock.json` was ignored. |
| Repository lint | Passed; 0 errors/warnings | `npm run lint` now ignores generated `.cache`/`venv`, a documentation migration script, and source files only referenced by modules disabled in `src/modules/registry.ts`. Active app, tests, and maintained scripts are included. |
| API E2E | 37 passed | Fixture services and allowlisted test database. The stale response-shape assertion was updated while retaining the private-data denial assertion. |
| Browser E2E | 28 passed | Isolated fixture server, synthetic auth/ingress, and allowlisted test database. |
| Database integration suite | 30 passed | `npm run test:db` on the configured allowlisted target; validates PostgreSQL/PostGIS migrations and RLS there, not hosted Supabase Auth, Storage, or Realtime. |
| Local app on port 3000 | Public/anonymous smoke passed | Browser GET `/` and `/login` returned 200; anonymous `/painel` landed on `/login`. Authenticated manager flows were exercised by fixture E2E, not a real user session on this server. |
| Hosted Supabase / production | Not tested | No live Auth, Storage bytes, hosted Realtime, production data, or deployment was touched. |

## Flow 1 — citizen report and manager notification

1. `/` obtains device geolocation and loads active occurrence types; unavailable GPS or catalog prevents an invalid submission.
2. Public occurrence API validates fields and coordinates, uses idempotency, classifies against active flood zones, and records event/alert data transactionally.
3. The citizen receives a protocol after persistence; the shelter lookup happens after confirmation, so a catalog failure must not erase the protocol and has a retry path.
4. Manager notifications are shown in-app through a snapshot plus Realtime subscription and periodic reconciliation; event IDs are deduplicated.

**Evidence:** source in `src/app/page.tsx`, `src/app/api/core/public/`, and `src/features/occurrences/ui/CoreNotifications.tsx`; unit 143/143, API 37/37, and browser E2E 28/28. The public form and confirmation/shelter error paths pass against the local fixture server.

**Gaps:** fixture coverage does not prove hosted Realtime reconnect/delivery. No authenticated manager session or real hosted Auth, Storage, or Realtime flow was exercised against `localhost:3000`/Supabase. UI-level notification reconnect is not covered by a dedicated E2E scenario.

## Flow 2 — dashboard, map, list, and authorized detail

1. `src/proxy.ts` checks current session eligibility for `/painel/:path*`; API/service boundaries repeat identity, capability, municipality, and group checks.
2. Dashboard and map use shared date filters. The map exposes textual legend and counts, accessible status/type labels, and a 1,000-marker truncation notice.
3. The occurrence list filters and paginates through the URL; `/painel/tabela` redirects to it while preserving compatible parameters.
4. Detail access returns the same not-found response for inaccessible and missing records; fields/actions are then limited by capability and occurrence scope.

**Evidence:** build passed; API 37/37 and browser E2E 28/28; public local smoke confirmed anonymous panel redirection. `src/proxy.ts`, page inventory, API access tests, and `tests/e2e/occurrence-detail.spec.ts` provide source/test evidence.

**Corrections:** three E2E selectors were made explicit about opening the filter disclosure and matching accessible controls. The API test now expects the current authorized detail fields and asserts `privateData` remains absent for `CONSULTA`. Full API/E2E runs pass.

**Gaps:** the live `localhost:3000` check covered only public routes and anonymous redirection. Authenticated operator/manager journeys were tested with fixtures; hosted services remain unverified.

## Flow 3 — occurrence operations, service records, and deleted records

1. List and detail APIs enforce current role and municipal/group scope. Missing and out-of-scope records are intentionally indistinguishable.
2. Status/triage updates use server-side capability checks, configured transitions and version guards. Attendance records are append-only and server-stamped.
3. Administrator-only deleted-record pages/APIs support restore; citizen private data is separately protected by the `privateData` capability.

**Evidence:** API 37/37 and browser E2E 28/28, including role-scope, private-field, detail, attendance, and manual-registration scenarios. Source references include `src/app/api/core/occurrences/[id]/route.ts`, mutation/service-record handlers, `src/server/occurrences/list.ts`, and `src/proxy.ts`.

**Resolution:** the exact-key assertion was updated to match the authorized operational detail contract. A separate assertion still denies `privateData` to `CONSULTA`; the API privacy sentinel test also passes. This was stale test coverage, not a confirmed product privacy leak.

**Gaps:** deleted-record restoration was source/API-reviewed but was not separately exercised in browser E2E. Hosted authentication/storage integration remains unverified.

## Flow 4 — risk-zone administration and classification

1. Administrator page/API access is capability-checked. Zone versions and effective-time history are persisted and queried by the server.
2. Occurrence intake intersects coordinates against active flood zones to determine high priority and stores classification context/version.
3. Historical comparison displays the zone versions effective at two selected instants.

**Evidence:** risk-zone unit/API tests and history/admin E2E cases passed in the suites run; the overall unit/build outcomes are recorded above. Route, API, and tests are named in the page inventory and `tests/api/risk-zones.spec.ts` / `tests/e2e/risk-zone-history.spec.ts`.

**Gaps:** the database suite validates PostgreSQL/PostGIS behavior on its allowlisted test target; it does not certify the hosted project's schema, RLS configuration, or production state.

## Interpretation

The local quality gates pass: unit 143/143, API 37/37, DB 30/30, E2E 28/28, lint, build, and an anonymous browser smoke against `localhost:3000`. Stable-release exit is still unverified because hosted Auth/Storage/Realtime and a real authenticated local/staging flow remain pending; see `page-stability-findings.md`.
