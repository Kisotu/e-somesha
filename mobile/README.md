# E-Somesha Mobile App

Expo + React Native mobile client for the offline-first E-Learning platform.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure API base URL (optional):

```bash
export EXPO_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

For Android emulator use `http://10.0.2.2:8080/api`.

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
