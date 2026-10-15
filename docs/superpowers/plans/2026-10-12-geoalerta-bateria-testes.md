# GeoAlerta test battery and audit evidence plan

> **For agentic workers:** Use `superpowers:executing-plans` to execute this checklist. No commit, push, merge, or production deploy is permitted.

**Goal:** Re-run the current GeoAlerta test suites safely, perform load testing only against an explicit disposable target, and produce a reproducible report with evidence and limits.

**Architecture:** Reuse the existing Playwright projects, guarded test database fixtures, build/lint/type checks, load executor, and release testing documentation. Do not replace existing uncommitted evidence; add a dated report and sanitized outputs for this execution.

**Tech Stack:** Node.js, Playwright, Next.js 16, PostgreSQL/PostGIS, Supabase, Docker where available.

**Spec:** `docs/releases/core/testing/automated-tests.md`, `docs/releases/core/testing/README.md`, and repository `AGENTS.md`.

## Global Constraints

- Local environment variables come only from root `.env`; never print or copy secret values.
- Database writes must pass the explicit disposable-target guard and allowlist.
- Never run stress or write tests against production or shared Supabase.
- Do not commit, push, merge, or deploy.
- Preserve all existing worktree changes and reports.

## Review Focus

- Test runner can accidentally initialize a database before tests; verify target guards and environment availability first.
- Load executor writes occurrences and updates records; require an explicitly disposable allowlisted host and synthetic data.
- Unit/API/database/E2E evidence does not by itself prove hosted production capacity.
- Report must distinguish current fresh results from prior historical results and blocked suites.
- Sanitize outputs so no credentials, contact data, or private records enter artifacts.

## Tasks

### Task 1: Establish execution baseline

- [x] Record HEAD and dirty working tree without modifying existing changes.
- [x] Inspect test commands, suite setup, test-target guards, load prerequisites, and prior reports.
- [x] Run fresh unit suite and record exact result.

### Task 2: Run current local quality and integration suites

- [x] Run lint, TypeScript, build, design-system, API, and database suites against the corrected local test setup: lint/TypeScript/build approved, design-system 7/7, API 60/60, DB 34/34, migrations 4/4. Browser matrix: 203 passed, 3 skipped, 1 local network-buffer error; focused rerun passed.
- [x] Capture exit status, counts, and sanitized failure summaries; separate blocked infrastructure from product failures.

### Task 3: Assess and run stress/restore verification

- [x] Check Docker and guarded disposable load configuration without printing `.env` values.
- [x] Prepare a local-only Auth/Storage/Realtime target, generate ten synthetic sessions in memory, and enforce the local host/build allowlist.
- [x] Complete the guarded 60-minute load run; record progress, metrics, run ID, and sanitized result.
- [x] Measure capacity by RPM against authenticated read routes only; stop early on latency/errors and confirm the highest passing stage in a five-minute soak. The final soak passed at 1,268 RPM; 1,667 RPM did not pass.
- [x] Attempt restoration verification on synthetic source and temporary target; blocked before restore because only PostgreSQL 16.4 dump tools were available for a PostgreSQL 17.11 source. Sanitized failure retained; no source writes; temporary database and helper role cleaned.

### Task 4: Publish auditable result

- [x] Create a dated report under `docs/releases/core/testing/results/` with commit, environment class, commands, outcomes, evidence paths, and limitations.
- [x] Update the results index and preserve earlier reports.
- [x] Finalize the report and index with completed stress result and restore limitation; verify evidence paths.
- [x] Produce a charted PDF report, render every page, and record capacity profile/limits without asserting hosted capacity.
