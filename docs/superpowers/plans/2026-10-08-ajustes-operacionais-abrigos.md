# Shelter Capacity and Directions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make shelter capacity, occupancy, and directions understandable and fix supported short Google Maps links.

**Architecture:** Derive display availability from capacity and occupancy, keep persistence compatible, generate navigation URLs from validated coordinates, and avoid fetching user-supplied links on the server.

**Tech Stack:** TypeScript, Next.js Route Handlers, React, Playwright.

**Spec:** [B. Abrigos](../specs/2026-10-08-ajustes-operacionais.md#b-abrigos)

## Global Constraints

- Preserve municipality-scoped admin authorization and existing audit writes.
- Never resolve user-provided map URLs with server-side HTTP requests.

## Review Focus

- Capacity zero and occupancy above capacity produce zero available slots and a full status.
- Explicit coordinates plus an approved short link are accepted; mismatched extractable coordinates remain rejected.
- Unknown host, malformed URL, and missing location remain rejected.
- Public shelter links use the same validated destination coordinates.

## Tasks

- [ ] Add failing unit tests for short Maps links with coordinates, URL allowlist, capacity arithmetic, and derived full state.
- [ ] Implement safe link handling and pure availability/status derivation; keep manual open/closed state.
- [ ] Update admin shelter form/list labels and navigation links; show a precise location error for unextractable links without coordinates.
- [ ] Run shelter unit/API/E2E coverage, lint, and build; record environment limitations.

## Completion

No Git commit, push, merge, or deploy is part of this plan.
