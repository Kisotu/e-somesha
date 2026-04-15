# E-Somesha Backend API

Go + Gin backend for the E-Somesha offline-first learning platform.

This service provides:

- JWT-based authentication and refresh flow.
- Protected learning endpoints (courses, materials, quizzes, announcements).
- Synchronization endpoints for offline-generated learner events.
- Operational safety controls such as rate limiting and request body limits.

## Design Goals

1. **Stable contracts for mobile sync** under unreliable connectivity.
2. **Strong guardrails** around authentication and abuse-prone routes.
3. **Graceful startup behavior** with fallback demo mode when MySQL is unavailable.
4. **Simple layered architecture** that keeps handlers, models, and data access separated.

## Runtime Architecture

```text
HTTP Client (Mobile/Web)
        |
        v
Gin Router (cmd/server/main.go)
        |
        +--> Middleware
        |     - CORS
        |     - Auth (protected routes)
        |     - Rate limiting (auth routes)
        |     - Request body limit (sync writes)
        |
        +--> Handlers (internal/handlers)
                |
                +--> Repository Layer (internal/repository)
                        |
                        +--> MySQL (pkg/database)
```

### Layer Breakdown

- `cmd/server/main.go`: application bootstrap, route registration, migration command handling.
- `internal/config`: environment-driven configuration loading.
- `internal/handlers`: HTTP transport layer and request/response mapping.
- `internal/repository`: persistence and query logic.
- `internal/models`: internal/domain data structures and sync payload types.
- `internal/services`: coordination logic for sync workflows.
- `pkg/auth`: JWT and password helpers.
- `pkg/database`: DB connection and migration helpers.

## System Thinking For Sync

The backend acts as the **source of truth** while mobile clients may operate offline for long periods.

- **Inbound offline events** (material views, quiz attempts) are accepted in batches.
- **Ownership checks** reject attempts where `user_id` does not match authenticated identity.
- **Conflict handling** on quiz attempts favors fresher server-recognized state when local data is stale.
- **Partial acceptance** reports synced, conflicted, and rejected items so clients can reconcile intentionally.

This design avoids all-or-nothing sync failures and supports eventual consistency at scale.

## Quick Start

### Prerequisites

- Go 1.21+
- MySQL 8.0+ (optional for demo mode)

### 1) Install Dependencies

```bash
go mod download
```

### 2) Configure Environment

Set environment variables (shell or `.env` equivalent):

```bash
export SERVER_PORT=8080
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=elearn
export JWT_SECRET=replace-this-secret-in-production
export JWT_EXPIRY_HOURS=24
export REFRESH_EXPIRY_DAYS=7
export AUTH_LOGIN_RATE_LIMIT=5
export AUTH_REGISTER_RATE_LIMIT=3
export AUTH_REFRESH_RATE_LIMIT=30
export AUTH_RATE_LIMIT_WINDOW_SECONDS=60
```

### 3) Create Database

```sql
CREATE DATABASE IF NOT EXISTS elearn;
```

### 4) Run Server

```bash
go run cmd/server/main.go
```

On startup, migrations run automatically after a successful DB connection.

## Migration Commands

```bash
go run cmd/server/main.go migrate:up
go run cmd/server/main.go migrate:down
```

## Demo Mode

If DB connection fails, the server starts in demo mode with mock data and the same route surface for rapid frontend development.

## API Surface

### Public

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness + mode check |
| `POST` | `/api/auth/register` | Account registration |
| `POST` | `/api/auth/login` | Access + refresh token issuance |
| `POST` | `/api/auth/refresh` | Access token refresh |
| `POST` | `/api/auth/logout` | Session logout |

### Protected

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/users/me` | Current user profile |
| `GET` | `/api/courses` | User courses |
| `GET` | `/api/courses/:id` | Course details |
| `GET` | `/api/courses/:id/materials` | Course materials |
| `GET` | `/api/courses/:id/quizzes` | Course quizzes |
| `GET` | `/api/courses/:id/announcements` | Course announcements |
| `GET` | `/api/courses/:id/download_manifest` | Offline manifest metadata |
| `GET` | `/api/quizzes/:id` | Quiz details |
| `GET` | `/api/sync/courses` | Delta-style course sync |
| `GET` | `/api/sync/courses/:id` | Single-course sync |
| `POST` | `/api/sync/materials_viewed` | Upload viewed-material events |
| `POST` | `/api/sync/quiz_attempts` | Upload quiz attempts |

## Operational Notes

- Auth endpoints are rate-limited independently by operation type.
- Sync write endpoints enforce request body size limits.
- JWT secret defaults are for local development only.

## Testing

Run tests from the backend directory:

```bash
go test ./...
```

Coverage includes handlers, auth behavior, middleware boundaries, repository logic, and database connectivity contracts.

## Repository Context

For platform-level architecture and mobile interaction details, see the repository root guide at `../README.md`.