# Operational occurrence UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clarify occurrence transitions, photo consent, public appearance, and alert separation.

**Architecture:** Keep occurrence mutation rules server-side and make their client presentation conditional on the selected transition. Scope the light palette to the public intake. Hydrate visible alert IDs with protocol/type using one authenticated, group-scoped server query.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, Playwright.

**Spec:** [A. Ocorrências](../specs/2026-10-08-ajustes-operacionais.md#a-ocorrências)

## Global Constraints

- Preserve municipal authorization, server-side transition validation, and stored theme preference.
- Keep the intake in the light palette without changing the authenticated dashboard theme.

## Review Focus

- Photo removal or replacement clears prior consent and permits re-selection.
- Required reason remains required even when the form is conditionally displayed.
- Dark preference remains intact after visiting the public intake.
- Metadata lookup exposes only occurrences visible to the current actor and every alert still links to its own occurrence.

## Interfaces

- Transition labels map `EM_TRIAGEM` to “Enviar para triagem” and `CANCELADA` to “Cancelar ocorrência”; other statuses retain readable verbs.
- Photo submit remains disabled unless `withoutPhoto || !selectedPhoto || photoAuthorized` and the existing location/form requirements are met.

## Tasks

- [ ] Add failing unit/UI assertions for transition label/color/reason behavior and intake consent/theme behavior.
- [ ] Add failing API/unit tests for actor/group scoping in alert occurrence metadata, and E2E assertions for card separation, protocol/type, and correct links.
- [ ] Implement conditional transition reason UI, semantic blue/red action styling, scoped light intake, and the single-query alert metadata endpoint/presentation.
- [ ] Run focused unit/E2E tests, lint, and build; record any database-backed limitation.

## Completion

No Git commit, push, merge, or deploy is part of this plan.
