export interface User {
  id: number;
  name?: string;
  username: string;
  email: string;
  role: 'admin' | 'administrator' | 'student' | 'lecturer';
  created_at: string;
}

export interface DashboardStats {
  total_students: number;
  total_lecturers: number;
  total_courses: number;
  total_quizzes: number;
}

export interface Course {
  id: number;
  title: string;
  code: string;
  description: string;
  instructor_id: number;
  created_at: string;
  updated_at: string;
}

export interface Quiz {
  id: number;
  course_id: number;
  title: string;
  description: string;
  time_limit: number; // in minutes
  created_at: string;
}

export interface Question {
  id: number;
  quiz_id: number;
  content: string;
  type: 'multiple-choice' | 'true-false';
  points: number;
  options?: string[]; // JSON string in DB, array in frontend
  correct_answer: string;
}
