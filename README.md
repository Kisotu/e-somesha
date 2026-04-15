# E-Somesha

E-Somesha is an offline-first learning platform composed of:

- A Go backend API that serves authentication, course content, and sync endpoints.
- An Expo React Native mobile app that works online and offline with local persistence.

The project is designed for unreliable network environments where learning should continue even when connectivity drops.

## Why This Project Exists

Many learners experience intermittent or expensive connectivity. E-Somesha prioritizes:

- **Learning continuity:** core content remains accessible without stable internet.
- **Eventual consistency:** user actions taken offline are safely synchronized later.
- **Resilience over fragility:** graceful degradation (including backend demo mode).

## Monorepo Layout

```text
e-somesha/
├── backend/                         # Go API service
│   ├── cmd/server/main.go           # API bootstrap and route wiring
│   ├── internal/                    # Business logic and application layers
│   ├── pkg/                         # Shared technical packages (auth, database)
│   └── scripts/                     # SQL seed scripts
├── mobile/                          # Expo + React Native client
│   ├── app/                         # Router-based screens
│   ├── context/                     # Auth and sync runtime context
│   ├── database/                    # SQLite init and offline data access
│   ├── services/                    # API clients and reliability primitives
│   └── types/                       # Shared app-level types
├── BUILD_PLAN.md                    # Build and delivery planning
└── PHASED_FIX_RECOMMENDATIONS.md    # Stabilization roadmap
```

## Architecture At A Glance

```text
┌──────────────────────────────────────────────────────────────────┐
│ Mobile App (Expo, React Native, TypeScript)                    │
│  - UI routes (app/)                                             │
│  - Auth + Sync contexts                                         │
│  - Local SQLite cache + queued offline actions                  │
└───────────────┬──────────────────────────────────────────────────┘
                │ HTTPS JSON API
                ▼
┌──────────────────────────────────────────────────────────────────┐
│ Backend API (Go, Gin, MySQL)                                    │
│  - Auth endpoints (register/login/refresh/logout)               │
│  - Courses, materials, quizzes, announcements                   │
│  - Sync endpoints for queued progress updates                   │
│  - Rate limits, auth middleware, migration support              │
└───────────────┬──────────────────────────────────────────────────┘
                │ SQL
                ▼
┌──────────────────────────────────────────────────────────────────┐
│ MySQL + Migrations                                               │
└──────────────────────────────────────────────────────────────────┘
```

## System Thinking

E-Somesha is engineered as a **distributed system with one edge client** (mobile) and one central authority (backend). Key design principles:

1. **Offline-first read path**
   - The app persists course data in SQLite and serves local reads even without connectivity.
2. **Queued write path**
   - Actions like quiz attempts can be stored locally, then flushed when network recovers.
3. **Conflict strategy**
   - Backend sync logic resolves stale writes defensively (for example, server-side time precedence).
4. **Failure as normal behavior**
   - Retry logic with exponential backoff handles transient errors.
   - Refresh-queue logic prevents token refresh stampedes.
5. **Graceful degradation**
   - Backend demo mode enables API interaction even if database connectivity is unavailable.

This architecture trades strict immediate consistency for **availability and learner continuity**, then converges state through synchronization.

## Typical Data Flow

1. User signs in and receives tokens.
2. Mobile app fetches course data and stores it locally.
3. User studies content and can continue offline.
4. Offline actions are queued locally.
5. On reconnect, sync endpoints process queued events and reconcile conflicts.
6. Local cache is updated with latest server state.

## Running The Stack

### Backend

See [backend/README.md](backend/README.md) for environment variables, database notes, and API endpoint details.

### Mobile

See [mobile/README.md](mobile/README.md) for Expo setup, API URL configuration, and local-offline behavior.

## Quality And Validation

- Backend includes unit/integration tests for handlers, middleware, repositories, and auth paths.
- Mobile includes tests for auth session handling, retry behavior, API integration edges, and validation.

## Roadmap Signals

Use these repository docs to understand current and planned hardening work:

- [BUILD_PLAN.md](BUILD_PLAN.md)
- [PHASED_FIX_RECOMMENDATIONS.md](PHASED_FIX_RECOMMENDATIONS.md)
- [mobile/MOBILE_PHASED_FIX_RECOMMENDATIONS.md](mobile/MOBILE_PHASED_FIX_RECOMMENDATIONS.md)

## License

No explicit license is currently declared at repository root.