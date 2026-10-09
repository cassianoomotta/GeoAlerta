# Group Membership and User Administration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let municipal admins manage group membership and basic profiles with clear expandable group selectors.

**Architecture:** Reuse the municipality-scoped admin endpoint, extend its validated profile update to name and phone, and expose add/edit/remove membership actions from the group roster. Keep self-protection and audit events.

**Tech Stack:** TypeScript, Next.js Route Handlers, Prisma transaction client, React, Playwright.

**Spec:** [C. Administração de grupos e usuários](../specs/2026-10-08-ajustes-operacionais.md#c-administração-de-grupos-e-usuários)

## Global Constraints

- Only authorized administrators can mutate municipal users or groups.
- Preserve self-account protection, municipality validation, and audit logging.
- Do not change Supabase Auth email identity through the profile editor.

## Review Focus

- Group edits cannot attach users to another municipality's groups.
- Removing a membership does not delete the user account.
- Self profile/access remains protected from mutation.
- Group selectors are keyboard accessible and communicate current selections.

## Tasks

- [ ] Add failing API/unit tests for name/phone profile updates, municipal validation, audit, and self-protection.
- [ ] Add failing E2E tests for expandable multi-selects, removing the redundant create checkbox, and group roster add/edit/remove actions.
- [ ] Add an E2E assertion that only the new-user registration form orders the fields Name, Phone, Email.
- [ ] Extend the validated admin user-update contract/handler and roster UI; retain account email as read-only.
- [ ] Replace group checkboxes with accessible expandable selectors, remove the duplicate default checkbox, and reorder only the new-user registration fields to Name, Phone, Email.
- [ ] Run focused access/API/E2E tests, lint, and build; record database setup limitations.

## Completion

No Git commit, push, merge, or deploy is part of this plan.
