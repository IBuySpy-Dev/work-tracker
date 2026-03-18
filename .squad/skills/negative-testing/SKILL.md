# Skill: Negative Test Alignment

> Systematic approach to fixing negative tests that are out of sync with route definitions.

## Metadata

- **Confidence:** high
- **Created:** 2026-03-19
- **Last validated:** 2026-03-19
- **Domain:** testing, API, negative testing

## When to Use

- Negative tests are failing en masse after route changes
- New modules are added and need negative test coverage
- Routes are refactored (URL changes, method changes, RBAC changes)

## The Alignment Process

### Step 1 — Gather Route Definitions

For each module, read these files in order:
1. `apps/api/src/index.ts` — find the router mount path (e.g., `/api/labels`)
2. `apps/api/src/modules/{module}/router.ts` — get every route: method, path, middleware chain
3. `apps/api/src/modules/{module}/validators.ts` — get Zod schemas and their required fields

Build a route map: `[METHOD] /api/{mount}{routerPath} → [middleware] → schema`

### Step 2 — Compare Tests Against Route Map

For each test case, verify:
1. **HTTP method** matches router definition (common: PATCH vs PUT)
2. **URL path** matches mount + router path (watch for nested `/admin/` prefixes)
3. **Auth token role** meets `requireMinRole()` or `requireRole()` minimum
4. **Expected status** is achievable given the middleware chain order

### Step 3 — Fix Categories

| Category | Action |
|----------|--------|
| Wrong HTTP method | Change test to use correct method |
| Wrong URL path | Fix URL to match actual route |
| Insufficient auth token | Upgrade token (e.g., supervisor → manager) |
| Non-existent route | Remove test or mark as skip with comment |
| Multiple valid statuses | Use `expect([s1, s2]).toContain(status)` |

### Step 4 — Verify

```bash
npm test -- --reporter=verbose 2>&1 | Select-String "negative"
```

All negative test files should show 0 failures.

## Known Patterns in E-CLAT

### Admin Route Nesting
Labels and Notifications use `/admin/` prefix inside the router:
- Labels: `POST /admin` → full path `/api/labels/admin`
- Notifications: `GET /admin/escalation-rules` → full path `/api/notifications/admin/escalation-rules`

### Templates Multi-Router
Templates module exports 4 routers mounted at different paths:
- `templatesRouter` → `/api/templates`
- `assignmentsRouter` → `/api/assignments`
- `fulfillmentsRouter` → `/api/fulfillments`
- `employeeAssignmentsRouter` → `/api/employee-assignments`

Fulfillment actions (self-attest, attach-document, third-party-verify) are on `fulfillmentsRouter`, NOT `assignmentsRouter`.

### Prisma in Tests
Services import Prisma at module level. Without a DB, some service calls throw `PrismaClientKnownRequestError` → 500. Accept `[expected, 500]` for such cases.

### Auth Token Hierarchy
```
EMPLOYEE(0) < SUPERVISOR(1) < MANAGER(2) < COMPLIANCE_OFFICER(3) < ADMIN(4)
```
- `requireMinRole(MANAGER)` → need managerToken or higher
- `requireRole(ADMIN)` → need exactly adminToken

## Notes

- Always run full test suite after fixing negative tests to check for regressions
- The `helpers.ts` file provides `generateTestToken()` and `seededTestUsers` for consistent test tokens
- Test files follow naming convention: `{module}.negative.test.ts`
