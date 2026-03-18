# Project Context

- **Owner:** ivegamsft
- **Project:** E-CLAT — Employee Compliance and Lifecycle Activity Tracker. Workforce readiness and qualification management for regulated industries.
- **Stack:** Node.js, TypeScript, Express, Zod, PostgreSQL, Prisma, JWT/bcrypt RBAC (5 roles), Terraform, GitHub Actions
- **Structure:** Monorepo (npm workspaces) — apps/api (64 endpoints, 9 modules), apps/web (scaffold), apps/admin (scaffold), packages/shared, data (Prisma)
- **API Modules:** auth, documents, employees, hours, labels, medical, notifications, qualifications, standards
- **Created:** 2026-03-13

## Core Context

### Delivery History

**Phase 0 (2026-03-14):** JWT tokens module, mock user store, RBAC enforcement, Container-first architecture with Docker Compose. Terraform pivoted to Container Apps with managed identity. 10 tests passing.

**Phase 1 (2026-03-15):** PrismaAuditLogger implementation, integration tests (Documents 20, Notifications 24, Audit 2). Employees + Standards + Qualifications + Medical services with Prisma CRUD patterns, date-driven compliance logic. 140/140 tests passing.

**Phase 2 (2026-03-16):** Route taxonomy migrated from `/employees` to `/team` per app spec. Legacy `/employees/*` routes 301-redirect. My section pages (6 components) deliver self-service UI with API normalization pattern. Build: 179/179 tests passing.

**Foundation Sprint (2026-03-17T04:47:00Z):** Observability foundation + multi-IdP identity module. OpenTelemetry SDK, correlation ID middleware, structured logging, health endpoints (/health, /ready, /detailed-health). TokenValidator strategy pattern with JWKS caching/stale fallback. ClaimsNormalizer presets for Entra/Okta/Auth0. 62 tests passing (20 observability + 42 identity). Commits: `fcdc608` (observability), `6649ec3` (identity).

### Critical Implementation Patterns

**Database & Prisma:**
- Singleton in `apps/api/src/config/database.ts`, shared across services
- Enum mapping: Prisma = uppercase (Role, QualificationStatus); DTOs = lowercase strings; services normalize before routes
- Seed: `data/src/seed.ts` uses UUID v5 from mock auth emails; Tier 1 (all envs), Tier 2 (Terraform Entra), Tier 3 (API bootstrap)

**RBAC & Audit:**
- 5-role hierarchy: EMPLOYEE < MANAGER < SUPERVISOR < LEAD < ADMIN
- JWT validation + ownership verification on reads; non-blocking audit logging to AuditLog table
- Sensitive fields redacted in audit logs

**Docker & Infrastructure:**
- Docker: API :3000, Postgres :5432, Azurite :10000
- Terraform: 3-layer (00-foundation, 10-data, 20-compute); Container Apps with managed identity
- Secrets: Key Vault via DefaultAzureCredential; no connection strings in .env

**MVP Scope:**
- Core: Employees + Standards + Qualifications + Medical
- Documents: Manual upload only (no OCR)
- Notifications: In-app only (no email)
- Deferred: Hours, OCR, Email, Labels, Department entity

### Key Service Patterns

**Service Template:** Create `apps/api/src/modules/{entity}/{service,validators,router}.ts`. Service returns lowercase DTOs; router handles status codes.

**Employees, Standards, Qualifications, Medical:** Prisma singleton + DTO-mapping; FK validation; compliance rules (active/expiring_soon satisfy requirements; 30-day window).

**Documents:** Manual upload (no OCR); UUID storageKey; auto-create ReviewQueueItem (PENDING).

**Notifications:** In-app only; preferences per user; mark-read, dismiss, digest.

**Auth:** JWT signing/verification in `apps/api/src/modules/auth/tokens.ts`; mock users per role; Entra Phase 2 (JWKS validation + TokenValidator strategy + AUTH_MODE toggle).

### File Reference Map

**Core:**
- `apps/api/src/config/database.ts` — Prisma singleton
- `apps/api/src/services/audit.ts` — PrismaAuditLogger
- `apps/api/src/modules/{entity}/` — per-service pattern
- `data/prisma/schema.prisma` — DB schema source of truth
- `data/src/seed.ts` — test data seeding
- `infra/layers/{00-foundation,10-data,20-compute}/` — Terraform roots

## 📌 Wave 3: API Decomposition (2026-03-17T04:30:00Z)

**Mission:** Decompose 7 API specifications into 32 implementation GitHub issues.

**Specs decomposed:**
1. eclat-spec.md — PRD → 12 features deferred Phase 2+, terminology aligned (Certifications→Qualifications, Clearance→Medical)
2. rbac-api-spec.md — 65 endpoints by role/resource, permission matrix, 3-layer enforcement
3. proof-vault-spec.md — Encryption, file request workflow, zero-knowledge design
4. templates-attestation-spec.md — 25 new API endpoints, 4 attestation levels, status flows
5. sharing-spec.md — 42 sharing endpoints, permission gates, evidence packages
6. App spec endpoints — Document retrieval (P0 blocker: GET /api/documents/employee/:employeeId), batch readiness, compliance reports
7. Proof Taxonomy — L1–L4 validation, compound rules, attestation floors

**Issues created:** 32 (file request endpoints, encryption key management, template assignments, fulfillment status machines, sharing permission enforcement, batch retrieval, audit trail completion, compliance validation, override workflows, attestation flows, etc.)

**Result:** All issues linked to GitHub Project #2; blocking dependencies mapped.

---

## Learnings

<!-- Append new learnings below. Recent work summarized to Core Context above. -->

### 2026-03-18: Test Fixes Phase — Lazy Prisma Init + Negative Test Alignment

- **Issue #220 (Bunk):** Prisma lazy initialization via Proxy-based singleton pattern. PrismaClient no longer instantiated at module evaluation time; deferred to first property access. env.ts validation also lazy. Fixes test setup ordering issues (integration tests now pass; 281 total tests).
- **Issues #218-#227 (Sydnor):** Fixed 96 failing negative tests by aligning to implemented routes. Removed 12 tests for non-existent DELETE endpoints. 237/237 negative tests now pass with 0 regressions.
- Decision: Lazy Prisma Client Initialization, Decision: Negative Test Alignment Strategy (both merged to decisions.md)
- Session log: .squad/log/2026-03-18T17-10Z-test-fixes.md

### Archived Sessions (Pre-2026-03-18)

The following detailed sessions and team updates have been archived to reduce file size. Key artifacts remain in .squad/orchestration-log/ and .squad/log/:

**2026-03-21 — API Spec Bundle (Bunk):** 7 authoritative API specifications (#90, #94, #98, #102, #106, #110, #114) covering OTel SDK, identity provider CRUD, template management, qualifications, multi-tenancy, event-driven architecture, and polyglot data layers. Each ~18–21 KB; all in docs/specs/.

**2026-03-20 — Fulfillment Review Endpoints (Bunk, Issues #17-19):** Team template progress endpoints (GET /api/templates/team), fulfillment review queue (GET /api/fulfillments/reviews), review detail and approval workflow (POST /api/fulfillments/:id/review). Fulfillment expiration/renewal/revocation (GET /api/fulfillments/expiring, POST /api/fulfillments/:id/renew, POST /api/fulfillments/:id/revoke) with SUPERVISOR+/MANAGER+ RBAC.

**2026-03-20 — Fulfillment Review UI (Kima, Issues #18-19):** FulfillmentReviewQueuePage and FulfillmentReviewDetailPage with evidence sections, review history, approval workflow UI. 14 tests across 2 files.

**2026-03-18 — Proof Templates Backend (Bunk):** Full backend module for templates/assignments/fulfillments with RBAC enforcement, status computation, 3 new Prisma models. Mounted /api/templates, /api/assignments, /api/fulfillments routes.

**2026-03-17 — Foundation Sprint:** Observability foundation (OTel SDK, correlation ID middleware, structured logging, health endpoints) + multi-IdP identity module (TokenValidator strategy, JWKS caching, ClaimsNormalizer). 62 tests passing. Commits: fcdc608, 6649ec3.

**2026-03-16 — Hours + Documents (Bunk):** Prisma-backed hours (clock-in/out, manual entry, conflict creation, audit logging) + employee document listing (GET /api/documents/employee/:employeeId).

**2026-03-16 — Web Route Taxonomy (Kima):** Route migration from /employees to /team; legacy 301-redirects. Shared route scaffolding (PageShell, RoutePlaceholderPages, rbac.ts) for /me/*, /team/:id/*, /standards*, /reviews*, /unauthorized, /404.

**2026-03-16 — Team Updates:** Backlog decomposition (Freamon, 51 issues across 5 epics), Copilot instructions + docs taxonomy update (Daniels), API v1 namespace decision (Freamon).

**2026-03-15 — Labels + Dashboard Tests (Sydnor):** 36 labels tests + 27 dashboard tests. Coverage of admin CRUD, RBAC, label deprecation, compliance summary, team rollups, edge cases.

**Full session details available in .squad/log/* and .squad/orchestration-log/* for reference.**


------

- 2026-07-18: Issue #220 — Lazy Prisma client initialization. Refactored `apps/api/src/config/database.ts` to use a Proxy-based lazy singleton: PrismaClient is NOT instantiated at module evaluation time, only on first property access. Also made `apps/api/src/config/env.ts` fully lazy — env validation no longer runs at import time, deferred to first `env.X` access or `loadEnv()` call. Both changes fix test setup ordering: `setup.ts` env vars are now guaranteed to be set before any Prisma or env initialization. Added `getPrismaClient()` for direct access and `_resetPrismaClient()` for test isolation. Proxy pattern preserves the `prisma` export name — zero consumer changes needed. Branch: squad/220-prisma-lazy-init.

## Session: Test Fixes Phase — Integration & Negative Tests (2026-03-18T17:10Z)

**Session ID:** 2026-03-18T17-10Z-test-fixes
**Agents:** Bunk (Backend), Sydnor (Tester)

### Issue #220 Fix Summary (PR #228)

**Root Cause:** Integration test suites (documents, employees, medical, notifications, qualifications, standards) failed with database initialization errors because:
1. `database.ts` instantiated PrismaClient at module evaluation time
2. `env.ts` eagerly parsed and validated env vars at import time
3. Test setup file (`setup.ts`) couldn't set `DATABASE_URL` and `JWT_SECRET` before these imports ran

**Solution Implemented:**
- **database.ts:** Replaced eager singleton with Proxy-based lazy singleton
  - PrismaClient creation deferred to first property access
  - Export name `prisma` preserved (zero consumer changes)
  - Added `_resetPrismaClient()` for test isolation
  
- **env.ts:** Removed eager `parseEnv()` at module scope
  - Lazy validation on first `env.X` property access
  - `loadEnv()` handles keyvault and non-keyvault paths
  - Production startup unchanged

**Test Results:**
- All 6 affected integration suites now load without errors
- 281 tests passing
- Production startup path unaffected

**Decision:** Lazy Prisma Client Initialization (merged to decisions.md)


