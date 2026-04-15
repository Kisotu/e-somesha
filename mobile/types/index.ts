export type UserRole = "student" | "lecturer";

export type User = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: User;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RefreshResponse = {
  access_token: string;
};

export type Course = {
  id: number;
  title: string;
  code: string;
  description: string;
  lecturer_id: number;
  lecturer_name?: string;
  created_at?: string;
  updated_at?: string;
};

export type Announcement = {
  id: number;
  course_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type Quiz = {
  id: number;
  course_id: number;
  title: string;
  description?: string;
  time_limit_minutes?: number;
  question_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type SyncContextValue = {
  isOnline: boolean;
  lastSync: string | null;
  setLastSync: (value: string | null) => void;
};
