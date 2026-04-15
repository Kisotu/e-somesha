# E-Learning Mobile App - Build Plan

## Project Overview
Offline-first E-Learning mobile app for university students and lecturers with Go backend and React Native/Expo frontend.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React Native (Expo managed workflow) |
| Backend | Go (Gin framework, REST API) |
| Cloud DB | MySQL 8.0 |
| Local DB | SQLite (expo-sqlite) |
| Auth | JWT (access + refresh tokens) |
| Storage | expo-file-system |
| Notifications | Expo Notifications / FCM |
| Sync | Background fetch + push |

---

## Architecture Overview


## Project Structure

```
/home/jake/Desktop/e-somesha/
├── backend/                    # Go REST API
│   ├── cmd/server/
│   │   └── main.go
│   ├── internal/
│   │   ├── config/
│   │   ├── handlers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── repository/
│   │   ├── services/
│   │   └── sync/
│   ├── pkg/
│   │   ├── auth/
│   │   └── database/
│   ├── go.mod
│   └── go.sum
│
├── mobile/                     # React Native Expo app
│   ├── app/                    # Expo Router pages
│   │   ├── (auth)/
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx      # Dashboard/Courses
│   │   │   ├── progress.tsx
│   │   │   ├── announcements.tsx
│   │   │   └── profile.tsx
│   │   ├── course/
│   │   │   ├── [id].tsx       # Course detail
│   │   │   ├── materials.tsx  # Materials list
│   │   │   ├── quizzes.tsx    # Quiz list
│   │   │   └── quiz/
│   │   │       └── [quizId].tsx
│   │   └── _layout.tsx
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── services/
│   ├── database/
│   ├── store/                 # Redux or Context
│   ├── types/
│   ├── utils/
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── api-endpoints.md
│   ├── database-schema.md
│   └── sync-protocol.md
│
└── README.md
```

---

## Phase 1: Backend Development (Go)

### 1.1 Database Schema (MySQL)

```sql
-- Users table
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('student', 'lecturer') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    lecturer_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Enrollments table
CREATE TABLE enrollments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT REFERENCES users(id),
    course_id BIGINT REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- Materials table
CREATE TABLE materials (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    type ENUM('pdf', 'slide', 'image', 'note') NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT,
    checksum VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Quizzes table
CREATE TABLE quizzes (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    time_limit_minutes INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Quiz questions table
CREATE TABLE quiz_questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    quiz_id BIGINT REFERENCES quizzes(id),
    question_text TEXT NOT NULL,
    options JSON NOT NULL,
    correct_option_index INT NOT NULL,
    points INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Quiz attempts table (for sync)
CREATE TABLE quiz_attempts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT REFERENCES users(id),
    quiz_id BIGINT REFERENCES quizzes(id),
    answers JSON NOT NULL,
    score INT NOT NULL,
    attempted_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id, quiz_id, attempted_at)
);

-- Announcements table
CREATE TABLE announcements (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Material views table (for tracking progress)
CREATE TABLE material_views (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT REFERENCES users(id),
    material_id BIGINT REFERENCES materials(id),
    viewed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE(user_id, material_id)
);

-- Download manifests (for offline sync)
CREATE TABLE download_manifests (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    course_id BIGINT REFERENCES courses(id),
    files JSON NOT NULL,
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 1.2 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | Login, returns JWT tokens |
| POST | /api/auth/refresh | Refresh access token |
| GET | /api/users/me | Get current user profile |
| GET | /api/courses | Get enrolled courses |
| GET | /api/courses/:id | Get course details |
| GET | /api/courses/:id/materials | Get course materials |
| GET | /api/courses/:id/quizzes | Get course quizzes |
| GET | /api/courses/:id/announcements | Get course announcements |
| GET | /api/courses/:id/download_manifest | Get offline download manifest |
| GET | /api/sync/courses | Delta sync courses |
| GET | /api/sync/courses/:id | Sync single course data |
| POST | /api/sync/materials_viewed | Batch sync viewed materials |
| POST | /api/sync/quiz_attempts | Batch sync quiz attempts |
| GET | /api/quizzes/:id | Get quiz with questions |
| POST | /api/quizzes/sync | Sync quiz attempts (conflict resolution) |

### 1.3 Backend Implementation Order

1. Project setup (Go modules, Gin router)
2. Database connection and migrations
3. User authentication (register, login, JWT)
4. Course management APIs
5. Materials, Quizzes, Announcements APIs
6. Sync endpoints with delta support
7. Background job for cleanup

---

## Phase 2: Mobile App (React Native/Expo)

### 2.1 Core Dependencies

```json
{
  "dependencies": {
    "expo": "~50.0.0",
    "expo-router": "~3.4.0",
    "expo-sqlite": "~13.3.0",
    "expo-file-system": "~16.0.0",
    "expo-notifications": "~0.27.0",
    "expo-document-picker": "~12.0.0",
    "expo-secure-store": "~12.8.0",
    "expo-network": "~5.8.0",
    "expo-screen-orientation": "~6.4.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "react-native-pdf": "^6.7.0",
    "react-native-screens": "~3.29.0",
    "react-native-safe-area-context": "4.8.2",
    "@reduxjs/toolkit": "^2.0.0",
    "react-redux": "^9.0.0",
    "axios": "^1.6.0",
    "date-fns": "^3.0.0"
  }
}
```

### 2.2 Local SQLite Schema

```sql
-- Local sync metadata
CREATE TABLE sync_metadata (
    id INTEGER PRIMARY KEY,
    last_sync_timestamp TEXT,
    user_id TEXT,
    email TEXT
);

-- Local courses cache
CREATE TABLE courses_local (
    id TEXT PRIMARY KEY,
    title TEXT,
    code TEXT,
    lecturer_name TEXT,
    description TEXT,
    is_downloaded INTEGER DEFAULT 0,
    download_progress REAL DEFAULT 0,
    total_materials INTEGER DEFAULT 0,
    downloaded_materials INTEGER DEFAULT 0,
    updated_at TEXT
);

-- Local materials
CREATE TABLE materials_local (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    title TEXT,
    type TEXT,
    local_path TEXT,
    file_size INTEGER,
    checksum TEXT,
    is_viewed INTEGER DEFAULT 0,
    updated_at TEXT,
    FOREIGN KEY (course_id) REFERENCES courses_local(id)
);

-- Local quizzes
CREATE TABLE quizzes_local (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    title TEXT,
    description TEXT,
    time_limit_minutes INTEGER,
    question_count INTEGER DEFAULT 0,
    updated_at TEXT,
    FOREIGN KEY (course_id) REFERENCES courses_local(id)
);

-- Local quiz questions
CREATE TABLE quiz_questions_local (
    id TEXT PRIMARY KEY,
    quiz_id TEXT,
    question_text TEXT,
    options TEXT,
    correct_option_index INTEGER,
    points INTEGER DEFAULT 1,
    FOREIGN KEY (quiz_id) REFERENCES quizzes_local(id)
);

-- Local quiz attempts (sync queue)
CREATE TABLE quiz_attempts_local (
    id TEXT PRIMARY KEY,
    quiz_id TEXT,
    answers TEXT,
    score INTEGER,
    attempted_at TEXT,
    synced INTEGER DEFAULT 0,
    FOREIGN KEY (quiz_id) REFERENCES quizzes_local(id)
);

-- Local announcements
CREATE TABLE announcements_local (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    title TEXT,
    content TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (course_id) REFERENCES courses_local(id)
);

-- Material views sync queue
CREATE TABLE material_views_local (
    id TEXT PRIMARY KEY,
    material_id TEXT,
    viewed_at TEXT,
    synced INTEGER DEFAULT 0,
    FOREIGN KEY (material_id) REFERENCES materials_local(id)
);

-- Downloaded files tracking
CREATE TABLE downloaded_files (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    material_id TEXT,
    local_uri TEXT,
    file_size INTEGER,
    checksum TEXT,
    downloaded_at TEXT,
    FOREIGN KEY (course_id) REFERENCES courses_local(id),
    FOREIGN KEY (material_id) REFERENCES materials_local(id)
);
```

### 2.3 Mobile Implementation Order

1. **Project Setup**
   - Initialize Expo app with expo-router
   - Configure TypeScript
   - Set up folder structure

2. **Authentication Module**
   - Login/Register screens
   - JWT storage (expo-secure-store)
   - Auth context provider
   - Auto-login on app start

3. **Database Module**
   - SQLite initialization
   - Create all tables
   - Database service class

4. **Network & Sync Module**
   - Network status detection (expo-network)
   - Offline/Online state management
   - Sync service with conflict resolution
   - Background sync scheduling

5. **Course Dashboard**
   - Course list from local DB
   - Pull-to-refresh sync
   - Offline indicator banner
   - Download status badges

6. **Offline Download System**
   - Download manager service
   - Progress tracking
   - File system storage
   - Storage usage display
   - Delete downloaded courses

7. **Materials Module**
   - Materials list view
   - PDF viewer integration
   - Mark as viewed tracking
   - Sync viewed status

8. **Quiz Module**
   - Quiz list and details
   - Offline quiz attempt
   - Local scoring
   - Sync queue management
   - Timestamp-based conflict resolution

9. **Announcements Module**
   - Announcements list
   - Local cache display
   - Pull-to-refresh

10. **Progress Tracking**
    - Aggregate progress calculation
    - Visual progress indicators
    - Sync pending items count

11. **Push Notifications**
    - FCM setup
    - Notification handling
    - Deep linking

---

## Phase 3: Offline Sync Architecture

### 3.1 Sync Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        SYNC PROCESS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. INITIAL SYNC (Login)                                        │
│     ├─ Download user profile                                    │
│     ├─ Download enrolled courses metadata                       │
│     ├─ Download materials/quizzes/announcements (last 30 days)  │
│     └─ Store all in local SQLite                                │
│                                                                  │
│  2. BACKGROUND SYNC (Every 30 min when online)                  │
│     ├─ GET /api/sync/courses?last_sync=<timestamp>              │
│     ├─ Compare checksums with local manifest                    │
│     ├─ Download only changed files                              │
│     └─ Update local DB                                          │
│                                                                  │
│  3. UPLOAD SYNC (On app start + periodic)                       │
│     ├─ POST /api/sync/materials_viewed (batch)                  │
│     ├─ POST /api/sync/quiz_attempts (batch)                     │
│     └─ Mark synced items in local DB                            │
│                                                                  │
│  4. CONFLICT RESOLUTION                                          │
│     ├─ Compare updated_at timestamps                            │
│     ├─ Keep newer record (server or local)                      │
│     └─ For quiz attempts: reject if server has newer            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Conflict Resolution Rules

| Data Type | Rule |
|-----------|------|
| Materials Viewed | Last updated timestamp wins |
| Quiz Attempts | Newer timestamp wins; reject if server has newer |
| Course Updates | Server wins; prompt user to re-download |
| Announcements | Server wins; merge new ones locally |

---

## Phase 4: Implementation Timeline

### Week 1: Backend Foundation
- [ ] Go project setup with Gin
- [ ] Database schema and migrations
- [ ] Authentication (register, login, JWT)
- [ ] Basic course APIs

### Week 2: Backend APIs + Sync
- [ ] Materials, Quizzes, Announcements APIs
- [ ] Download manifest endpoint
- [ ] Sync endpoints with delta support
- [ ] Batch upload handlers

### Week 3: Mobile Foundation
- [ ] Expo project setup
- [ ] Navigation structure
- [ ] SQLite database setup
- [ ] Auth screens and context

### Week 4: Core Mobile Features
- [ ] Course dashboard with local-first
- [ ] Offline detection banner
- [ ] Download manager
- [ ] Materials viewer

### Week 5: Quiz + Progress
- [ ] Quiz module with offline support
- [ ] Local scoring system
- [ ] Progress tracking
- [ ] Sync queue management

### Week 6: Polish + Notifications
- [ ] Push notifications
- [ ] Background sync
- [ ] Storage management UI
- [ ] Error handling and testing

---

## Phase 5: Key Files to Create

### Backend (Go)
```
backend/
├── cmd/server/main.go                 # Entry point
├── go.mod                             # Dependencies
├── internal/config/config.go          # Config loader
├── internal/models/user.go            # User model
├── internal/models/course.go          # Course model
├── internal/models/sync.go            # Sync models
├── internal/handlers/auth.go          # Auth handlers
├── internal/handlers/course.go        # Course handlers
├── internal/handlers/sync.go          # Sync handlers
├── internal/middleware/auth.go        # JWT middleware
├── internal/repository/user_repo.go   # User repository
├── internal/repository/course_repo.go # Course repository
├── internal/services/auth_service.go  # Auth business logic
├── internal/services/sync_service.go  # Sync business logic
└── pkg/database/mysql.go              # DB connection
```

### Mobile (React Native/Expo)
```
mobile/
├── app.json                           # Expo config
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript config
├── app/_layout.tsx                    # Root layout
├── app/(auth)/login.tsx               # Login screen
├── app/(auth)/register.tsx            # Register screen
├── app/(tabs)/_layout.tsx             # Tab navigator
├── app/(tabs)/index.tsx               # Dashboard
├── app/(tabs)/progress.tsx            # Progress screen
├── app/(tabs)/announcements.tsx       # Announcements
├── app/(tabs)/profile.tsx             # Profile
├── app/course/[id].tsx                # Course detail
├── app/course/materials.tsx           # Materials list
├── app/course/quizzes.tsx             # Quiz list
├── app/course/quiz/[quizId].tsx       # Quiz taking
├── components/OfflineBanner.tsx       # Offline indicator
├── components/CourseCard.tsx          # Course card
├── components/DownloadButton.tsx      # Download button
├── context/AuthContext.tsx            # Auth state
├── context/SyncContext.tsx            # Sync state
├── database/init.ts                   # SQLite setup
├── database/course_db.ts              # Course queries
├── database/quiz_db.ts                # Quiz queries
├── services/api.ts                    # API client
├── services/sync_service.ts           # Sync logic
├── services/download_service.ts       # Download manager
├── services/storage_service.ts        # File storage
├── store/store.ts                     # Redux store
├── store/slices/courseSlice.ts        # Course state
├── store/slices/syncSlice.ts          # Sync state
├── types/index.ts                     # TypeScript types
└── utils/helpers.ts                   # Utility functions
```

---

## Phase 6: API Contract Examples

### Login Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "student@university.edu",
    "name": "John Doe",
    "role": "student"
  }
}
```

### Download Manifest Response
```json
{
  "course_id": 1,
  "version": 2,
  "files": [
    {
      "material_id": 101,
      "title": "Lecture 1 Slides",
      "type": "slide",
      "url": "https://api.example.com/files/slides/lecture1.pdf",
      "file_size": 2048576,
      "checksum": "sha256:abc123..."
    }
  ],
  "quizzes": [
    {
      "id": 201,
      "title": "Quiz 1",
      "question_count": 10,
      "time_limit_minutes": 30
    }
  ],
  "announcements": [
    {
      "id": 301,
      "title": "Course Update",
      "content": "...",
      "created_at": "2026-04-01T10:00:00Z"
    }
  ]
}
```

### Sync Request (Quiz Attempts)
```json
{
  "attempts": [
    {
      "quiz_id": 201,
      "answers": [0, 2, 1, 3, 0],
      "score": 80,
      "attempted_at": "2026-04-14T15:30:00Z"
    }
  ]
}
```

### Sync Response (Quiz Attempts)
```json
{
  "synced": 1,
  "conflicts": [],
  "rejected": []
}
```

---

## Testing Checklist

### Backend Tests
- [ ] User registration and login
- [ ] JWT token validation
- [ ] Course enrollment access control
- [ ] Delta sync returns correct changes
- [ ] Batch sync handles duplicates
- [ ] Conflict resolution for quiz attempts

### Mobile Tests
- [ ] App works completely offline with cached data
- [ ] Downloaded courses accessible offline
- [ ] Quiz attempts saved locally
- [ ] Sync queue uploads on reconnect
- [ ] Storage usage calculated correctly
- [ ] Download progress updates in real-time
- [ ] PDF viewer opens downloaded files
- [ ] Offline banner shows/hides correctly
- [ ] Push notifications received

---

## Security Considerations

1. **JWT Storage**: Use expo-secure-store for tokens
2. **Offline Data**: Encrypt sensitive local data
3. **File Checksums**: Verify downloaded files
4. **Quiz Answers**: Never download correct answers to client
5. **API Security**: Rate limiting, input validation

---

## Performance Targets

| Metric | Target |
|--------|--------|
| App cold start | < 3 seconds |
| Course list (offline) | < 500ms |
| Quiz submission (offline) | < 100ms |
| Sync batch upload | < 5 seconds |
| Download 100MB course | < 5 minutes |

---

## Next Steps

1. Start backend development (Week 1)
2. Set up database and run migrations
3. Implement authentication APIs
4. Test all endpoints with Postman
5. Then move to mobile development