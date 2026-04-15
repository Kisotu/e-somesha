# E-Somesha Project Audit: Errors, Bugs, and Phased Fix Plan

## Scope
- Backend reviewed: Go API, middleware, handlers, repositories, config, DB bootstrap.
- Mobile reviewed: Expo React Native app routing, auth/session flow, API layer, storage, sync/network context.
- Validation run:
  - Backend package check: go test ./... (no tests present, packages compile).
  - Mobile type check: npx tsc --noEmit (no type errors reported).

## Key Findings (Actionable)

### Critical
1. Plaintext DB credential committed in repo.
   - Evidence: [Db.txt](Db.txt#L1)
   - Risk: Immediate credential leak and unauthorized DB access.

2. Insecure JWT default secret accepted at runtime.
   - Evidence: [backend/internal/config/config.go](backend/internal/config/config.go#L23)
   - Risk: Token forgery if env var is missing in production.

3. CORS misconfiguration (wildcard origin with credentials=true).
   - Evidence: [backend/internal/middleware/auth.go](backend/internal/middleware/auth.go#L46)
   - Risk: Browser security policy conflicts and potential cross-origin abuse.

4. Server silently switches to demo mode when DB connection fails.
   - Evidence: [backend/cmd/server/main.go](backend/cmd/server/main.go#L18)
   - Risk: Production may run with mock auth/data if DB is down.

### High
5. Repository row iteration errors are never checked.
   - Evidence: [backend/internal/repository/course_repo.go](backend/internal/repository/course_repo.go#L34), [backend/internal/repository/course_repo.go](backend/internal/repository/course_repo.go#L86), [backend/internal/repository/course_repo.go](backend/internal/repository/course_repo.go#L126)
   - Risk: Partial/corrupt query reads can be returned as success.

6. Multiple handler paths ignore repository errors and return partial success.
   - Evidence: [backend/internal/handlers/course.go](backend/internal/handlers/course.go#L190), [backend/internal/handlers/sync.go](backend/internal/handlers/sync.go#L172)
   - Risk: Data inconsistencies are hidden from client.

7. Sync aggregation swallows repo errors per course.
   - Evidence: [backend/internal/repository/course_repo.go](backend/internal/repository/course_repo.go#L319)
   - Risk: Missing materials/quizzes/announcements with no failure signal.

8. JSON marshal errors are ignored in persistence helper.
   - Evidence: [backend/internal/repository/course_repo.go](backend/internal/repository/course_repo.go#L334)
   - Risk: Invalid payload may be saved as empty/invalid JSON.

9. Registration existence check ignores DB error.
   - Evidence: [backend/internal/handlers/auth.go](backend/internal/handlers/auth.go#L33)
   - Risk: DB failure can be misinterpreted as "email not found" and create wrong response behavior.

10. No auth rate limiting on login/register/refresh.
    - Evidence: [backend/cmd/server/main.go](backend/cmd/server/main.go#L45)
    - Risk: Brute force and credential stuffing.

### Medium
11. Mobile API client clears auth state on any 401 without refresh retry.
    - Evidence: [mobile/services/api.ts](mobile/services/api.ts#L20)
    - Risk: Frequent forced logouts and poor session resilience.

12. Mobile refresh endpoint exists but is not integrated into interceptor/session flow.
    - Evidence: [mobile/services/authService.ts](mobile/services/authService.ts#L20), [mobile/context/AuthContext.tsx](mobile/context/AuthContext.tsx#L65)
    - Risk: Expired access tokens cause unnecessary sign-outs.

13. Hardcoded default credentials in login screen.
    - Evidence: [mobile/app/(auth)/login.tsx](mobile/app/(auth)/login.tsx#L8)
    - Risk: Security and UX anti-pattern; accidental credential leakage in demos/screenshots.

14. Hardcoded LAN API fallback in app constants.
    - Evidence: [mobile/utils/constants.ts](mobile/utils/constants.ts#L1)
    - Risk: Breaks non-local environments and encourages env drift.

15. Network status polling every 5s via interval.
    - Evidence: [mobile/context/SyncContext.tsx](mobile/context/SyncContext.tsx#L24)
    - Risk: Unnecessary battery/network overhead.

16. Quiz navigation uses fixed sample quiz id.
    - Evidence: [mobile/app/course/quizzes.tsx](mobile/app/course/quizzes.tsx#L12)
    - Risk: Wrong quiz opened; placeholder logic in production flow.

### Quality / Maintainability
17. No automated tests present for backend packages.
    - Evidence: go test output for all backend packages reports "[no test files]".
    - Risk: Regressions likely during auth/sync changes.

18. Migration strategy is only CREATE IF NOT EXISTS, no versioned schema transitions.
    - Evidence: [backend/pkg/database/mysql.go](backend/pkg/database/mysql.go#L35)
    - Risk: Future schema evolution and rollback become fragile.

## Phased Remediation Plan

## Phase 0 (Day 0-1): Security Containment
Goal: Remove active security exposure immediately.

- Remove secrets from repository and rotate compromised DB credentials.
  - Delete/replace [Db.txt](Db.txt)
  - Add ignore rules and document secure secret handling.
- Enforce required JWT secret at startup.
  - Fail fast if JWT_SECRET is empty or default in [backend/internal/config/config.go](backend/internal/config/config.go#L23)
- Fix CORS policy for real allowed origins and credential behavior.
  - Update [backend/internal/middleware/auth.go](backend/internal/middleware/auth.go#L46)
- Disable implicit demo-mode fallback in production builds.
  - Gate in [backend/cmd/server/main.go](backend/cmd/server/main.go#L18) behind explicit DEMO_MODE flag.

Definition of done:
- No plaintext credentials in repository history head.
- Server refuses startup with weak/missing JWT secret.
- CORS allows only configured origins.
- DB outage causes safe failure, not silent demo mode.

## Phase 1 (Week 1): Backend Correctness and Error Integrity
Goal: Stop silent failures and inconsistent responses.

- Add rows.Err checks in all repository iteration methods.
  - [backend/internal/repository/course_repo.go](backend/internal/repository/course_repo.go#L34)
- Stop ignoring errors in handlers.
  - Replace ignored calls in [backend/internal/handlers/course.go](backend/internal/handlers/course.go#L190)
  - Replace ignored calls in [backend/internal/handlers/sync.go](backend/internal/handlers/sync.go#L172)
- Refactor SyncCoursesSince to return structured partial failure or fail clearly.
  - [backend/internal/repository/course_repo.go](backend/internal/repository/course_repo.go#L302)
- Handle JSON marshal errors instead of discarding them.
  - [backend/internal/repository/course_repo.go](backend/internal/repository/course_repo.go#L334)
- Tighten auth/register/login repository error handling paths.
  - [backend/internal/handlers/auth.go](backend/internal/handlers/auth.go#L33)

Definition of done:
- API never returns successful payloads when underlying repo operations fail silently.
- Error responses are deterministic and logged.

## Phase 2 (Week 2): Authentication Hardening and Session UX
Goal: Improve auth security and prevent unnecessary user sign-outs.

- Add rate limiting for auth endpoints.
  - [backend/cmd/server/main.go](backend/cmd/server/main.go#L45)
- Implement mobile token refresh flow in axios interceptor.
  - Retry once on 401 using refresh token, then clear state only on refresh failure.
  - [mobile/services/api.ts](mobile/services/api.ts#L20)
- Wire refresh usage in auth context lifecycle.
  - [mobile/context/AuthContext.tsx](mobile/context/AuthContext.tsx#L20)
- Remove hardcoded login defaults.
  - [mobile/app/(auth)/login.tsx](mobile/app/(auth)/login.tsx#L8)
- Replace hardcoded LAN base URL with environment-driven setup for dev/staging/prod.
  - [mobile/utils/constants.ts](mobile/utils/constants.ts#L1)

Definition of done:
- Expired token does not force logout if refresh succeeds.
- Brute-force pressure on auth routes is throttled.
- No credentials prefilled in shipped UI.

## Phase 3 (Week 3): Data/Sync Reliability
Goal: Make sync behavior predictable and auditable.

- Add request-size and payload-shape limits for sync endpoints.
  - [backend/internal/handlers/sync.go](backend/internal/handlers/sync.go#L58)
- Add explicit per-item validation and clear rejection reasons.
  - [backend/internal/handlers/sync.go](backend/internal/handlers/sync.go#L98)
- Improve network monitoring efficiency on mobile.
  - Replace polling with subscription-based connectivity updates in [mobile/context/SyncContext.tsx](mobile/context/SyncContext.tsx#L24)
- Remove placeholder fixed quiz routing and fetch real quiz ids.
  - [mobile/app/course/quizzes.tsx](mobile/app/course/quizzes.tsx#L12)

Definition of done:
- Sync APIs reject invalid payloads early and consistently.
- Mobile sync state changes are event-driven and efficient.

## Phase 4 (Week 4+): Testing and Delivery Guardrails
Goal: Prevent regressions and improve deployment confidence.

- Add backend tests first for auth, middleware, repository edge cases.
- Add API integration tests for sync and enrollment flows.
- Add mobile tests for auth bootstrap and token refresh behavior.
- Introduce CI pipeline gates: go test, tsc, lint, and basic security checks.
- Adopt versioned migrations (up/down) instead of only startup CREATE statements.

Definition of done:
- PRs fail on regressions before merge.
- Critical auth/sync paths have automated coverage.

## Recommended Execution Order
1. Phase 0 immediately.
2. Phase 1 before feature work.
3. Phase 2 and Phase 3 in parallel if team capacity allows.
4. Phase 4 as a non-negotiable baseline for ongoing development.
