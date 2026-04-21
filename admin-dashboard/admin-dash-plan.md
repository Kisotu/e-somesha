# E-Somesha Admin Dashboard — Build Plan

## Progress Overview

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation (Vite, Tailwind, Shadcn, AuthContext, JWT) | ✅ Done |
| Phase 2 | Dashboard & User Management | ✅ Done |
| Phase 3 | Course CRUD & Enrollments | ✅ Done |
| Phase 4 | Materials & Announcements | ✅ Done |
| Phase 5 | Quizzing & Inline Question Builder | ✅ Done |
| Phase 6 | Final Polish, Responsive Audit & Stats Integration | ⏳ In-Progress |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite |
| Language | TypeScript |
| State | TanStack Query v5 |
| UI | Shadcn/ui + Tailwind CSS |
| Auth | JWT (shared with mobile) |

---

## Backend API Status

| Resource | Endpoints | Status |
|----------|-----------|--------|
| **Stats** | GET `/api/admin/stats` | ✅ Done |
| **Users** | GET/PATCH/DELETE `/api/admin/users/:id` | ✅ Done |
| **Courses** | GET/POST/PUT/DELETE `/api/admin/courses/:id` | ✅ Done |
| **Enrollments** | POST `/api/admin/enrollments`, DELETE `/api/admin/enrollments` | ✅ Done |
| **Materials** | POST/PUT/DELETE `/api/admin/courses/:id/materials` | ✅ Done |
| **Quizzes** | POST/PUT/DELETE `/api/admin/courses/:id/quizzes` | ✅ Done |
| **Questions** | POST/PUT/DELETE `/api/admin/quizzes/:id/questions` | ✅ Done |
| **Announcements**| POST/PUT/DELETE `/api/admin/courses/:id/announcements` | ✅ Done |

---

## Implementation Details

### Completed Components
- **Auth**: `Login.tsx`, `AuthContext.tsx`, `AdminGuard.tsx`
- **Dashboard**: `Dashboard.tsx` with Recharts stats
- **User Management**: `UserList.tsx` with filtering and role updates
- **Course Management**: `CourseList.tsx`, `EnrollmentManagement.tsx`
- **Resource Management**: `CourseDetail.tsx` (Tabbed interface for Materials, Announcements, Quizzes)
- **Quiz Engine**: `QuizBuilder.tsx` for granular question management

### Pending / Under Polish
- **Stats Integration**: Ensure all dashboard charts are fully populated from backend.
- **Responsive Audit**: Final check of tabbed layouts on mobile mirrors.
- **Empty States**: Consistent "No data" components across all views.
- **Performance**: Query pre-fetching for course details.

---

## Phase 6: Final Polish Checklist

1. [ ] **Global Search**: Quick-jump to courses or users from the top bar.
2. [ ] **Activity Log**: View recent admin actions.
3. [ ] **Mobile Sidebar**: Better drawer implementation for small screens.
4. [ ] **Skeleton Loaders**: Replace generic spinners with skeleton states.
5. [ ] **Error Boundaries**: Graceful handling of API failures or 404s.
