# E-Somesha Mobile App

Expo + React Native mobile client for the offline-first E-Learning platform.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure API base URL:

```bash
export EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

For Android emulator use `http://10.0.2.2:8080/api`.

Security rules:
- In `dev`, local HTTP URLs are allowed only for `localhost`, `127.0.0.1`, and `10.0.2.2`.
- In `staging` and `prod`, the API URL must use `https://`.
- If no URL is configured outside `dev`, app startup fails fast.

Refresh token contract:
- `/auth/refresh` must always return `access_token`.
- If backend rotates refresh tokens, `/auth/refresh` should also return `refresh_token` and the app will persist it.
- If backend does not rotate, omitting `refresh_token` is supported.

3. Start the app:

```bash
npm run start
```

## Included foundation

- Expo Router structure with auth flow and tabs
- JWT auth context with secure token storage
- Basic dashboard wired to `/api/courses`
- Announcements and profile starter screens
- SQLite initialization for local-first data cache
