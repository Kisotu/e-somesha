# Mobile Audit: Phased Fix Recommendations

## Scope
This audit covers the `mobile` app only (Expo + React Native + TypeScript).

Validation commands run during this audit:
- `npm test` (pass: 1 file, 3 tests)
- `npx tsc --noEmit` (pass)
- `rg -n "setLastSync|getDatabase\(|TODO|FIXME|console\.log|any\b" mobile`

## Priority Findings

### Critical
1. Insecure default API base URL fallback uses HTTP:
   - `utils/constants.ts`
   - Current fallback: `http://localhost:8080/api`
   - Risk: accidental non-TLS usage can expose bearer tokens in transit.

2. Refresh flow stores only `access_token` after refresh:
   - `services/api.ts`, `types/index.ts`
   - `RefreshResponse` only includes `access_token`, and client only updates access token.
   - Risk: if backend rotates refresh tokens, client can break session behavior; if backend does not rotate, long-lived token risk remains.

3. Local sign-out does not revoke server-side refresh token:
   - `context/AuthContext.tsx` (`signOut`)
   - Risk: token may remain valid server-side until expiry/revocation elsewhere.

### High
1. Silent error swallowing in auth bootstrap and refresh paths:
   - `context/AuthContext.tsx`
   - Multiple empty `catch {}` blocks reduce observability and hide auth edge-case failures.

2. Announcements only fetched for first enrolled course:
   - `app/(tabs)/announcements.tsx`
   - Logic fetches `courses[0]` only.
   - Impact: incomplete data shown to users.

3. Missing client-side input validation on auth forms:
   - `app/(auth)/login.tsx`, `app/(auth)/register.tsx`
   - No local checks for empty values, invalid email, weak password constraints.

4. Root database initialization has no failure handling:
   - `app/_layout.tsx`, `database/init.ts`
   - `initializeDatabase()` is fired and not guarded by user-visible fallback state.

5. SQLite schema lacks relational constraints for local integrity:
   - `database/init.ts`
   - No foreign key between announcements and courses.

### Medium
1. Route matching in refresh interceptor is string-fragile:
   - `services/api.ts`
   - Uses URL `includes(...)` checks for auth endpoints.

2. Header mutation uses broad type assertions:
   - `services/api.ts`
   - Multiple casts to `Record<string, string>`; can mask shape problems.

3. Generic error messages reduce diagnosability:
   - `app/(auth)/login.tsx`, `app/(auth)/register.tsx`, tab screens

4. Minimal automated coverage for critical auth paths:
   - Current tests cover only `services/refreshQueue.ts` behavior.

5. DB write/read path has no indexes for common access paths:
   - `database/init.ts`

### Low
1. Feature stubs shipped in routed screens:
   - `app/(tabs)/progress.tsx`
   - `app/course/materials.tsx`
   - `app/course/quiz/[quizId].tsx`

2. No-op action handler on course download:
   - `app/course/[id].tsx` uses `onPress={() => {}}` for `DownloadButton`.

3. Hard-coded role during registration:
   - `app/(auth)/register.tsx` sets `role: "student"` only.

4. Likely unused API in sync context:
   - `types/index.ts` exposes `setLastSync`
   - `context/SyncContext.tsx` provides it, but no call sites found via grep.

5. `getDatabase()` helper appears only used by init path currently:
   - `database/init.ts`
   - Indicates local DB abstraction not yet leveraged by feature code.

## Security Notes
1. Enforce HTTPS for all non-local environments.
2. Align refresh-token contract with backend (rotation vs non-rotation) and implement accordingly.
3. Revoke refresh token server-side on logout.
4. Avoid exposing raw backend errors to UI; map to safe domain errors.
5. Add request timeout and retry policy boundaries for resilience.

## Phased Remediation Plan

## Phase 0: Safety Guardrails (1-2 days)
Goal: close immediate security and session risks.

Tasks:
1. Replace insecure default URL behavior in `utils/constants.ts`:
   - Fail fast when API URL is missing in non-dev builds.
   - Require `https://` in staging/prod.
2. Define refresh-token contract with backend and update client types:
   - If refresh returns new refresh token, persist it.
   - If not rotating, document TTL/revocation policy clearly.
3. Add server logout call in `signOut()` before local clear:
   - Revoke refresh token where API supports it.
4. Normalize auth error mapping in one place:
   - Convert network/401/5xx into safe user-facing messages.

Definition of done:
- No HTTP fallback used outside local dev.
- Refresh flow contract documented and implemented.
- Logout invalidates server session (or explicit backend gap documented).

## Phase 1: Auth Robustness and Error Observability (2-4 days)
Goal: remove silent failures and make auth state transitions deterministic.

Tasks:
1. Remove empty catch blocks in `AuthContext`.
2. Add structured error handling for bootstrap and `refreshMe()` paths.
3. Add explicit loading/error states around database bootstrap in `app/_layout.tsx`.
4. Add unit tests for:
   - bootstrap with valid tokens
   - refresh success/failure
   - logout clearing + revoke call

Definition of done:
- No empty catch blocks in auth/session flow.
- Auth transitions covered by tests.
- Startup failures surface actionable UI state.

## Phase 2: Data Correctness and Input Quality (3-5 days)
Goal: prevent invalid user input and incomplete data loading.

Tasks:
1. Add client-side validation:
   - Email format
   - Required name/password
   - Password minimum quality rules
2. Fix announcements aggregation:
   - Fetch announcements across all enrolled courses, merge/sort.
3. Add SQLite FK constraints and indexes:
   - FK for `announcements_local.course_id -> courses_local.id`
   - Indexes on common filter/sort columns.
4. Improve retry strategy for transient network failures in data-fetch screens.

Definition of done:
- Invalid auth forms cannot submit.
- Announcements view includes all course announcements.
- Local DB rejects orphan records and performs stable list queries.

## Phase 3: Feature Completion (1-2 weeks)
Goal: replace placeholders and no-op actions with production behavior.

Tasks:
1. Implement `materials` screen data flow.
2. Implement quiz attempt flow in `app/course/quiz/[quizId].tsx`.
3. Implement progress metrics screen.
4. Wire `DownloadButton` action in `app/course/[id].tsx` to real sync/download behavior.
5. Integrate local DB read/write usage beyond initialization.

Definition of done:
- No placeholder routed screens remain.
- Course detail actions trigger real logic.
- Offline/local data is visible in user flows.

## Phase 4: Quality Gates and Maintainability (3-5 days)
Goal: make regressions harder and quality standards explicit.

Tasks:
1. Add linting and formatting scripts in `package.json`:
   - `lint`, `lint:fix`, `format`, `typecheck`.
2. Expand tests beyond refresh queue:
   - API interceptor tests
   - Auth context tests
   - Screen behavior tests for validation and loading states
3. Add CI checks for mobile:
   - `npm ci`
   - `npm test`
   - `npx tsc --noEmit`
   - lint script
4. Clean up likely unused exports/state (`setLastSync`) or implement usage.

Definition of done:
- CI fails on type/test/lint regressions.
- Critical auth/network paths have automated coverage.
- No known unused public exports in core contexts.

## Suggested Commit Strategy Per Phase
1. `fix(mobile-security): enforce secure API base URL and logout revocation`
2. `refactor(mobile-auth): harden bootstrap refresh and error handling`
3. `fix(mobile-data): validate auth input and aggregate announcements`
4. `feat(mobile-learning): implement materials quiz and progress flows`
5. `chore(mobile-quality): add linting CI and broader test coverage`
