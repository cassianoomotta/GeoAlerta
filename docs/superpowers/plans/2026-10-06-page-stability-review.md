# Page Stability Review Implementation Plan

> **For agentic workers:** Use native inline execution in this session. This review plan authorizes documentation and validation only, not product-code changes.

**Goal:** Produce a source-backed inventory, critical-flow review, findings register, and stable-release exit criteria.
**Architecture:** Review route tree, module registry, pages, API/access boundaries, tests, and local browser evidence. Keep findings separate from implementation; each correction must map to an approved story.
**Tech Stack:** Next.js 16.3.5, React 19, TypeScript, Supabase/PostGIS, Playwright, Notion.
**Spec:** docs/superpowers/specs/2026-10-06-page-stability-review-spec.md

## Global Constraints
- Work in the canonical checkout and preserve unrelated user changes.
- Do not change product behavior without an approved story and observable acceptance criteria.
- Sanitize evidence; no secrets, tokens, or personal data.
- Doubles do not prove real-service, permission, or production behavior.
- Use only the environment-file location prescribed by AGENTS.md.
- No commit, push, merge, shared-environment change, or deploy.

## Review Focus
- A directly addressable route may not be enabled in the module registry; compare navigation, guards, and API access.
- A page shell may load while its data request is denied; inspect both.
- Navigation visibility and backend role/municipal/group checks may differ; inspect both.
- Empty, loading, error, truncation, or stale-data states may differ across dashboard, map, list, and detail.
- Test doubles may mask missing local-browser or real-service evidence; label evidence type.

---

### Task 1: Enumerate and classify pages
**Files:** Read src/app/**, src/modules/registry.ts, middleware/access helpers. Create docs/stability/page-inventory.md.
**Produces:** Every page route, navigation entry, active/disabled/legacy classification, source reference, relevant API dependency.
- [ ] Compare the inventory to the full page-route tree; omit no page.
- [ ] Record evidence for each status and access classification.

### Task 2: Map behavior, permissions, and states
**Files:** Read active pages, API handlers, access utilities, focused tests. Modify docs/stability/page-inventory.md.
**Produces:** Per-route behavior, allowed role/scope, loading/empty/error/truncated states, dependencies, and evidence type.
- [ ] Inspect both page/navigation and API/service access boundaries.
- [ ] Cite source or named test for each assertion; label unverified states.

### Task 3: Review critical flows
**Files:** Read public report, dashboard, map, occurrence list/detail, notification, and zone administration code/tests. Create docs/stability/critical-flow-review.md.
**Produces:** Stepwise flow matrix, local validation evidence, integration evidence, and gaps.
- [ ] Trace all four flows in the spec, noting required access and observable results.
- [ ] Use available approved local evidence; record blocked checks without treating mocks as integrated proof.

### Task 4: Findings and release criteria
**Files:** Create docs/stability/page-stability-findings.md; update docs/stability/critical-flow-review.md.
**Produces:** Findings with impact/evidence/disposition, follow-up story ownership, release checklist, known limitations.
- [ ] Link each proposed correction to an approved story or specify a follow-up story with observable criteria.
- [ ] Map every spec acceptance rule to a review artifact.
- [ ] Set exit criteria requiring explicit results for critical flows and disclosure of unverified integrations.

### Task 5: Notion closeout
**Files:** Notion page [0.1.0] 26 — Review and stabilize the experience by page.
- [ ] Record document paths and actual validation results.
- [ ] Keep In progress while any acceptance criterion is incomplete.
- [ ] Mark Done only after inventory, flow review, findings ownership, and exit criteria are verified.
