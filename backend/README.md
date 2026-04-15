# E-Somesha Backend API

> Go + Gin backend for the offline-first E-Somesha learning platform.

<p align="left">
  <img src="https://img.shields.io/badge/Go-00ADD8?style=flat-square&logo=go&logoColor=white" alt="Go" />
  <img src="https://img.shields.io/badge/Gin-008080?style=flat-square&logo=gin&logoColor=white" alt="Gin" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=json-web-tokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
</p>

<table>
        <tr>
                <td><strong>🧱 Core role</strong><br />Source of truth for identity, courses, and sync</td>
                <td><strong>🔐 Security</strong><br />JWT auth, rate limits, auth middleware</td>
                <td><strong>🌐 Runtime</strong><br />MySQL-backed, with demo-mode fallback</td>
        </tr>
</table>

This service provides:

- <strong>🔑 JWT-based authentication</strong> and refresh flow.
- <strong>📘 Protected learning endpoints</strong> for courses, materials, quizzes, and announcements.
- <strong>🔄 Synchronization endpoints</strong> for offline-generated learner events.
- <strong>🧯 Operational safety controls</strong> such as rate limiting and request body limits.

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

- <strong>📦 Inbound offline events</strong> (material views, quiz attempts) are accepted in batches.
- <strong>🪪 Ownership checks</strong> reject attempts where `user_id` does not match authenticated identity.
- <strong>⚖️ Conflict handling</strong> on quiz attempts favors fresher server-recognized state when local data is stale.
- <strong>🧾 Partial acceptance</strong> reports synced, conflicted, and rejected items so clients can reconcile intentionally.

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

Create a `.env` file in `backend/` (loaded automatically on startup):

```env
SERVER_PORT=8080
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=elearn
JWT_SECRET=replace-this-secret-in-production
JWT_EXPIRY_HOURS=24
REFRESH_EXPIRY_DAYS=7
AUTH_LOGIN_RATE_LIMIT=5
AUTH_REGISTER_RATE_LIMIT=3
AUTH_REFRESH_RATE_LIMIT=30
AUTH_RATE_LIMIT_WINDOW_SECONDS=60
```

You can still export variables in your shell if needed, but `.env` is the default local setup.

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

- <strong>Auth endpoints</strong> are rate-limited independently by operation type.
- <strong>Sync write endpoints</strong> enforce request body size limits.
- <strong>JWT secret defaults</strong> are for local development only.

## Testing

Run tests from the backend directory:

```bash
go test ./...
```

Coverage includes handlers, auth behavior, middleware boundaries, repository logic, and database connectivity contracts.

## Repository Context

For platform-level architecture and mobile interaction details, see the repository root guide at [../README.md](../README.md).