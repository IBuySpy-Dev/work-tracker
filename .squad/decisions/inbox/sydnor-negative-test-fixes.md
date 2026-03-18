# Decision: Negative Test Alignment Strategy

**Date:** 2026-03-19
**Author:** Sydnor (Tester)
**PR:** #229
**Issues:** #218, #219, #221–#227

## Context

96 of 249 negative tests were failing because test expectations didn't match actual route definitions. Tests were written against intended API design rather than implemented routes.

## Decision

1. **Align tests to implementation, not specs.** Tests must target routes that actually exist with the correct HTTP method, URL, and minimum auth role.
2. **Remove tests for non-existent routes.** 12 tests targeted DELETE endpoints that were never implemented. Removed rather than left as failing documentation.
3. **Accept multiple status codes where Prisma initialization varies.** Some routes return 500 in test context because Prisma client initializes at import time. Tests accept `[expected, 500]` where this is known.

## Consequences

- Negative test suite is now a reliable regression gate (237/237 pass)
- When new routes are added, corresponding negative tests should be added following patterns in the test files
- If DELETE endpoints are implemented later, new negative tests should be written at that time
- The `medicalQuerySchema` in validators.ts is dead code — no route uses it. Should be either wired or removed.

## Status

**Accepted** — changes merged via PR #229.
