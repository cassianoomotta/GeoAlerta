# Page Stability Review — Specification

**Story:** [0.1.0] 26 — Review and stabilize the experience by page
**Date:** 2026-10-06

## Goal
Inventory active GeoAlerta pages and critical user flows, record inconsistencies with evidence and ownership, and define honest stable-release exit criteria.

## Scope
Review public routes (/ , /login, /rastreio); operational routes (/painel, /painel/mapa, occurrence list/detail/excluded pages, profile); administration routes (risk zones, shelters, statuses); and module routes for shelters, teams, resources, and volunteers. Determine active/disabled/legacy status from route files, module flags, navigation, and access checks. Inspect API/service dependencies only to explain page behavior, authorization, states, and integration boundaries.

## Critical flows
1. Citizen report: location/input validation, submission, triage, manager notification.
2. Manager dashboard: time filters/indicators, map/list navigation, authorized detail.
3. Occurrence operations: list/detail, status/service updates, deleted-record handling.
4. Flood/risk-zone administration: versions, permissions, classification, historical views.

## Deliverables
- Route inventory: behavior, access, visible states, dependencies, source/evidence references.
- Critical-flow review: checked steps, findings, and evidence limits.
- Findings register: each correction linked to an approved story or proposed as a separate story with observable acceptance criteria. This review does not authorize unrelated implementation.
- Stable-release exit criteria and integrations/environments still unvalidated.

## Acceptance and validation
- Distinguish active, disabled, directly addressable, and legacy routes with evidence.
- Separate source/test, local-browser, and real-service evidence.
- Mocks/doubles do not prove Supabase, PostGIS, RLS, role, or production behavior.
- Sanitize evidence; exclude credentials, tokens, personal data, and raw environment values.
- Do not claim a flow complete when required pages, access checks, or integrations remain unverified.
- Do not change product behavior without a specific approved story and its acceptance criteria.
- Follow repository AGENTS.md: local work only; no AI commit, push, merge, shared-environment change, or deploy; environment values only in the prescribed local .env.

## Out of scope
New product capabilities, broad refactors, schema changes, shared-environment operations, and deployment.
