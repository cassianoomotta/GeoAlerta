# GeoAlerta page inventory

**Review date:** 2026-10-06  
**Source of truth:** canonical checkout `C:\Users\Cassiano\Documents\Projetos\GeoAlerta`  
**Classification:** source-based review. A route marked active has a current App Router page and is enabled or separately access-gated; this label does not claim live-service verification.

## Route inventory

| Route | Classification | Navigation and access | Behavior / dependencies |
|---|---|---|---|
| `/` | Active, public | No manager login; public submission APIs validate and persist | Citizen occurrence form; native location, occurrence type catalog, optional photo, public occurrence POST, then public shelter catalog. Source: `src/app/page.tsx`; APIs under `src/app/api/core/public/`. |
| `/login` | Active, public | Auth entry point | Signs in and checks session/profile eligibility before entering the panel. Source: `src/app/login/page.tsx`; `/api/core/session`. |
| `/rastreio` | Disabled legacy route | Not in enabled module registry | Returns the legacy-unavailable view. Source: `src/app/rastreio/page.tsx`, `src/modules/legacy-disabled.tsx`. |
| `/painel` | Active; dashboard module enabled | Sidebar Dashboard; panel data is fetched through protected Core APIs | Dashboard indicators and period filters. Source: `src/modules/registry.ts`, `src/app/painel/page.tsx`, `CoreDashboardIndicators.tsx`, `/api/core/dashboard/indicators`. |
| `/painel/mapa` | Active; map module enabled | Sidebar Mapa; dashboard/map APIs require a valid session and authorized scope | Occurrence counts, date filters, map, markers, legend, and truncation notice. Source: `src/app/painel/mapa/page.tsx`, `CoreMapOverview.tsx`, `/api/core/dashboard`. |
| `/painel/ocorrencias` | Active; occurrence-list module enabled | Sidebar Ocorrências; server page uses `withSession`; capabilities control create/export/admin links | Authorized paginated/filterable list, manual creation, CSV export, column preferences. Source: `src/app/painel/ocorrencias/page.tsx`, list/export/preferences APIs. |
| `/painel/tabela` | Compatibility alias | Not a separate navigation module | Redirects to `/painel/ocorrencias` and preserves query parameters. Source: `src/app/painel/tabela/page.tsx`. |
| `/painel/ocorrencias/[id]` | Active, data access-gated | Detail API validates session and occurrence scope; direct route shows unavailable state on denied/not-found | Authorized details, status/triage operations, service records, audit events, and photos. Source: `src/app/painel/ocorrencias/[id]/page.tsx`, `/api/core/occurrences/[id]`, `service-records`, `photo`. |
| `/painel/ocorrencias/excluidas` | Active, administrator-gated | Linked for administrators from the list; deletion and restoration APIs enforce access | Lists deleted records and restores them through versioned APIs. Source: `src/app/painel/ocorrencias/excluidas/page.tsx`, `/api/core/occurrences/deleted`, occurrence API. |
| `/painel/perfil` | Active | Sidebar Meu perfil; profile API uses session access | Displays and updates the signed-in user's profile and column preferences; supports logout. Source: `src/app/painel/perfil/page.tsx`, `/api/core/profile`, preferences API. |
| `/painel/admin` | Active, administrator-only | Link shown when the capability check succeeds; page independently requires `administer` | User, role, state, and group administration. Source: `src/app/painel/admin/page.tsx`, `AdminPanel`, admin APIs. |
| `/painel/admin/risk-zones` | Active, administrator-only | Direct route; server page requires `administer` | Create/version zones and query temporal history; APIs enforce the same capability. Source: route page, `RiskZonePanel`, `/api/core/admin/risk-zones`. |
| `/painel/admin/status` | Active, administrator-only | Direct route; server page requires `administer` | Configure status presentations/transitions. Source: route page, `StatusConfigurationPanel`, `/api/core/admin/status`. |
| `/painel/admin/shelters` | Active, administrator-only | Panel link shown for administrators; page independently requires `administer` | Administer shelters. Source: route page, `ShelterAdminPanel`, `/api/core/admin/shelters`. |
| `/painel/admin/shelters/novo` | Active, administrator-only | Direct route; page independently requires `administer` | Create a shelter. Source: route page and admin shelters API. |
| `/painel/admin/shelters/[id]/editar` | Active, administrator-only | Direct route; page validates ID, municipality, and `administer` access | Loads and edits a single shelter; invalid or unavailable IDs produce not-found messaging. Source: route page and admin shelters API. |
| `/painel/abrigos` | Disabled legacy route | Module flag `abrigos.enabled=false` | Returns the legacy-unavailable view; admin shelter management is a distinct active route. Source: registry and route wrapper. |
| `/painel/equipes` | Disabled legacy route | Module flag `equipes.enabled=false` | Returns the legacy-unavailable view. Source: registry and route wrapper. |
| `/painel/recursos` | Disabled legacy route | Module flag `recursos.enabled=false` | Returns the legacy-unavailable view. Source: registry and route wrapper. |
| `/painel/voluntarios` | Disabled legacy route | Module flag `voluntarios.enabled=false` | Returns the legacy-unavailable view. Source: registry and route wrapper. |

## Navigation and access observations

- `src/modules/registry.ts` currently enables Dashboard, Mapa, and Ocorrências only. The layout adds Meu perfil and conditionally adds administrator links.
- `/painel/tabela` is a redirect alias, not a second occurrence-list implementation.
- The disabled `/painel/abrigos` route is not the same feature as administrator shelter management at `/painel/admin/shelters`.
- Several App Router pages render a shell and rely on their server data access or protected APIs for authorization. For access-sensitive routes, page and API enforcement must both be reviewed; a visible shell is not evidence of authorized data.
- Files under `src/modules/legacy*` are not routes by themselves. Legacy page implementations are not classified as active unless referenced by an App Router page or current navigation.

## Evidence limits

This inventory is based on route source, module configuration, and authorization/data-call references. It does not prove behavior against a live Supabase/PostGIS project or production, and does not certify visual states in the browser.

## Route state and access evidence

The `/painel/:path*` boundary is guarded in `src/proxy.ts` and redirects unauthenticated users to `/login`. Each data boundary still performs its own server-side identity, capability, municipality, and group checks; a route guard or hidden navigation item alone is not the authorization proof. The page-level states below are source-derived unless a specific test result is cited in `critical-flow-review.md`.

| Route | Access evidence | Visible states and recovery |
|---|---|---|
| `/` | Public route; catalog/submission handlers under `src/app/api/core/public/` validate input and GPS server-side. | GPS requesting/success/denied/unavailable/timeout; catalog loading/error disables unavailable choices; submit pending/error/retry/success; shelter list loading/empty/error after protocol confirmation. |
| `/login` | `src/proxy.ts`, `/api/core/session`, login page. | Input validation, pending sign-in, authentication/profile rejection, eligible session redirect. |
| `/rastreio` | Route wrapper and `src/modules/legacy-disabled.tsx`. | Stable disabled/legacy notice; no live tracking flow. |
| `/painel` | `src/proxy.ts`; page/data access through dashboard API and session. | Indicators loading/error/incomplete/empty; period filters and chart data; access failure is not treated as successful data. |
| `/painel/mapa` | `src/proxy.ts`; map and dashboard APIs enforce current session and scope. | Dynamic map loading, data loading/error/empty, marker summary, accessible legend, and 1,000-marker truncation notice. |
| `/painel/ocorrencias` | `src/proxy.ts`; server page uses `withSession`; list/export/preferences APIs apply role/scope restrictions. | Loading/error/empty/paginated list; filters are collapsed by default; column preferences; manual form pending/error/success where capability permits. E2E selector failures are recorded separately. |
| `/painel/tabela` | Route redirects to the authorized occurrence list. | Redirect preserves compatible search parameters; it has no independent data state. |
| `/painel/ocorrencias/[id]` | `src/proxy.ts`; detail and mutation APIs check current session and occurrence group/municipality. | Fetching, unavailable for denied/not-found, detail sections, empty history/attendance, operation pending/error/success; private citizen fields and photo require `privateData`. |
| `/painel/ocorrencias/excluidas` | `src/proxy.ts`; page and deleted/restoration APIs require administrator capability. | Loading, error/access denied, empty list, paginated results, restoration success/error. |
| `/painel/perfil` | `src/proxy.ts`; profile/preferences APIs validate session. | Loading/error, saved profile/preferences, sign-out. |
| `/painel/admin` | `src/proxy.ts`; page and APIs independently require `administer`. | Loading/error, account/group list, validation errors, save/transition feedback. |
| `/painel/admin/risk-zones` | `src/proxy.ts`; server page and zone APIs require `administer`. | Loading/error/empty zones, create/edit validation, save feedback, history comparison/map state. |
| `/painel/admin/status` | `src/proxy.ts`; page and status APIs require `administer`. | Catalog loading/error, configuration state, invalid transition feedback, save success/error. Catalog presentation fallback can mask a catalog-fetch problem; validate the actual API separately. |
| `/painel/admin/shelters` | `src/proxy.ts`; page and shelter APIs require `administer`. | List loading/error/empty and create/edit/activate/deactivate feedback. |
| `/painel/admin/shelters/novo` | `src/proxy.ts`; save endpoint independently requires `administer`. | Form validation, pending, API error, saved state. |
| `/painel/admin/shelters/[id]/editar` | `src/proxy.ts`; validates ID, municipality, and capability before loading; API rechecks on save. | Loading, invalid/not-found, validation, save error/success. |
| `/painel/abrigos` | Legacy wrapper; module registry flag is disabled. | Disabled/legacy notice. This is separate from active administrator shelter management. |
| `/painel/equipes` | Legacy wrapper; module registry flag is disabled. | Disabled/legacy notice. |
| `/painel/recursos` | Legacy wrapper; module registry flag is disabled. | Disabled/legacy notice. |
| `/painel/voluntarios` | Legacy wrapper; module registry flag is disabled. | Disabled/legacy notice. |

### Common panel behavior

- `CoreNotifications` loads an authorized snapshot, subscribes to Realtime inserts, reconciles with a three-second snapshot, deduplicates by event ID, and handles revoked/failed access. The visible panel has loading/error/empty and alert states. Source inspection is not a real Realtime delivery test.
- Login redirects and panel access are based on the current server profile; client role metadata is not authoritative.
- These states are source-derived. An item is only locally validated where a named test suite/result is explicitly recorded in `critical-flow-review.md`.
