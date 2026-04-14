# E-Learning Backend API

Go-based REST API for the offline-first E-Learning mobile application.

## Requirements

- Go 1.21+
- MySQL 8.0+ (or use demo mode without database)

## Quick Start

### 1. Install Dependencies

```bash
go mod download
```

### 2. Configure Environment

Create a `.env` file or set environment variables:

```bash
export SERVER_PORT=8080
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=elearn
export JWT_SECRET=your-super-secret-key-change-in-production
```

### 3. Create Database

```sql
CREATE DATABASE IF NOT EXISTS elearn;
```

### 4. Run Server

```bash
go run cmd/server/main.go
```

The server will automatically run database migrations on startup.

### Demo Mode

If MySQL is not available, the server starts in demo mode with mock responses:

```bash
go run cmd/server/main.go
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get tokens |
| POST | /api/auth/refresh | Refresh access token |

### Courses (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/courses | Get enrolled courses |
| GET | /api/courses/:id | Get course details |
| GET | /api/courses/:id/materials | Get course materials |
| GET | /api/courses/:id/quizzes | Get course quizzes |
| GET | /api/courses/:id/announcements | Get announcements |
| GET | /api/courses/:id/download_manifest | Get offline download manifest |

### Quizzes (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/quizzes/:id | Get quiz with questions |

### Sync (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/sync/courses | Delta sync courses |
| GET | /api/sync/courses/:id | Sync single course |
| POST | /api/sync/materials_viewed | Sync viewed materials |
| POST | /api/sync/quiz_attempts | Sync quiz attempts |

## Request/Response Examples

### Register

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.edu",
    "password": "password123",
    "name": "John Doe",
    "role": "student"
  }'
```

### Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.edu",
    "password": "password123"
  }'
```

### Get Courses (Authenticated)

```bash
curl http://localhost:8080/api/courses \
  -H "Authorization: Bearer <access_token>"
```

### Sync Quiz Attempts

```bash
curl -X POST http://localhost:8080/api/sync/quiz_attempts \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "attempts": [
      {
        "quiz_id": 1,
        "answers": [0, 2, 1, 3],
        "score": 80,
        "attempted_at": "2026-04-14T15:30:00Z"
      }
    ]
  }'
```

## Project Structure

```
backend/
├── cmd/server/main.go          # Entry point
├── internal/
│   ├── config/                  # Configuration
│   ├── handlers/                # HTTP handlers
│   ├── middleware/              # Auth middleware
│   ├── models/                  # Data models
│   └── repository/              # Database operations
├── pkg/
│   ├── auth/                    # JWT & password utilities
│   └── database/                # MySQL connection
└── go.mod
```

## License

MIT