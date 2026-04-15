# E-Somesha Mobile App

Expo + React Native client for the E-Somesha offline-first learning platform.

The mobile app is built to keep learners productive in unstable network conditions by combining:

- Local SQLite persistence for read availability.
- Deferred sync for offline-generated actions.
- Defensive auth/session handling for long-lived app sessions.

## Product Intent

1. **Learning should continue offline** after initial data fetch.
2. **User actions should not be lost** when connectivity drops.
3. **Reconnect should be safe and automatic** with bounded retries and token refresh coordination.

## Architecture

```text
UI Screens (app/ via Expo Router)
	  |
	  v
Context Layer (context/)
  - AuthContext: session state and identity
  - SyncContext: network state + pending attempt flushing
	  |
	  v
Service Layer (services/)
  - api client, auth handling, retry logic, refresh queue
	  |
	  +--> Remote backend API
	  |
	  +--> Local Data Layer (database/)
		  - SQLite schema init
		  - offlineData access for cache + queue tables
```

## Core System Thinking

### 1) Offline-First Read Model

- Course, material, quiz, and announcement data are persisted locally.
- UI can render from local store while disconnected.

### 2) Queue-Then-Flush Write Model

- Quiz attempts can be queued locally with timestamps.
- On reconnect, `SyncContext` flushes pending attempts to backend sync endpoints.
- Successful uploads are marked synced; failures remain queued for later retries.

### 3) Session Resilience

- A refresh queue prevents multiple concurrent token refresh calls.
- Retry logic applies exponential backoff for transient network/server failures.
- Auth refresh supports both rotating and non-rotating refresh token contracts.

The app favors availability and learner continuity, then converges to server truth when possible.

## Project Layout

```text
mobile/
├── app/                    # Route groups and screens
│   ├── (auth)/             # Login/register flows
│   ├── (tabs)/             # Main application tabs
│   └── course/             # Course detail and quiz routes
├── components/             # Reusable UI components
├── context/                # Auth and sync providers
├── database/               # SQLite initialization and data access
├── services/               # API/retry/auth helpers
├── types/                  # Shared TypeScript types
└── utils/                  # Validation and constants
```

## Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Expo-compatible device/emulator

### 1) Install Dependencies

```bash
npm install
```

### 2) Configure API Base URL

```bash
export EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

For Android emulator, use:

```bash
export EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8080/api
```

### API URL Safety Rules

- In `dev`, local HTTP is allowed only for `localhost`, `127.0.0.1`, and `10.0.2.2`.
- In `staging` and `prod`, API URL must be `https://`.
- Missing URL outside `dev` fails fast at startup.

### Refresh Contract Expectations

- `/auth/refresh` must always return `access_token`.
- If backend rotates refresh tokens, return `refresh_token` as well.
- If backend does not rotate refresh tokens, omission is supported.

### 3) Start The App

```bash
npm run start
```

Useful scripts:

```bash
npm run android
npm run ios
npm run web
npm run test
npm run lint
npm run typecheck
```

## Testing And Reliability Focus

Current tests cover critical reliability behavior, including:

- Auth session handling
- API integration edge cases
- Retry policies
- Refresh queue behavior
- Input validation

Run all tests:

```bash
npm run test
```

## Platform Context

For backend contracts and full-system architecture, see:

- `../README.md`
- `../backend/README.md`
