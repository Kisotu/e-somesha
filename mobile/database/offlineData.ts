import { Announcement, Course, Material, Quiz } from "../types";
import { getDatabase } from "./init";

type DbCourseRow = {
  id: string;
  title: string | null;
  code: string | null;
  lecturer_name: string | null;
  description: string | null;
  is_downloaded: number;
  download_progress: number;
  total_materials: number;
  downloaded_materials: number;
  updated_at: string | null;
};

type DbMaterialRow = {
  id: string;
  course_id: string;
  title: string | null;
  type: string | null;
  file_url: string | null;
  file_size: number | null;
  checksum: string | null;
  updated_at: string | null;
};

type DbQuizRow = {
  id: string;
  course_id: string;
  title: string | null;
  description: string | null;
  time_limit_minutes: number | null;
  question_count: number | null;
  updated_at: string | null;
};

type DbProgressRow = {
  total_courses: number;
  downloaded_courses: number;
  total_materials: number;
  total_announcements: number;
  total_quiz_attempts: number;
  latest_attempted_at: string | null;
};

type DbPendingQuizAttemptRow = {
  queue_id: number;
  local_attempt_id: number;
  user_id: string;
  quiz_id: string;
  course_id: string;
  selected_answers: string;
  score: number;
  attempted_at: string;
};

export type PendingQuizAttempt = {
  queueId: number;
  localAttemptId: number;
  userId: number;
  quizId: number;
  courseId: number;
  answers: number[];
  score: number;
  attemptedAt: string;
};

export type ProgressMetrics = {
  totalCourses: number;
  downloadedCourses: number;
  totalMaterials: number;
  totalAnnouncements: number;
  totalQuizAttempts: number;
  latestAttemptedAt: string | null;
  downloadCompletionPercent: number;
};

const toNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeTimestamp = (value?: string): string => value ?? new Date().toISOString();

export const offlineData = {
  async upsertCourses(courses: Course[]): Promise<void> {
    const db = getDatabase();

    for (const course of courses) {
      await db.runAsync(
        `INSERT INTO courses_local (
          id, title, code, lecturer_name, description, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          code = excluded.code,
          lecturer_name = excluded.lecturer_name,
          description = excluded.description,
          updated_at = excluded.updated_at`,
        [
          String(course.id),
          course.title,
          course.code,
          course.lecturer_name ?? null,
          course.description,
          safeTimestamp(course.updated_at),
        ],
      );
    }
  },

  async upsertMaterials(materials: Material[]): Promise<void> {
    const db = getDatabase();

    for (const material of materials) {
      await db.runAsync(
        `INSERT INTO materials_local (
          id, course_id, title, type, file_url, file_size, checksum, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          course_id = excluded.course_id,
          title = excluded.title,
          type = excluded.type,
          file_url = excluded.file_url,
          file_size = excluded.file_size,
          checksum = excluded.checksum,
          updated_at = excluded.updated_at`,
        [
          String(material.id),
          String(material.course_id),
          material.title,
          material.type,
          material.file_url,
          material.file_size ?? null,
          material.checksum ?? null,
          safeTimestamp(material.updated_at),
        ],
      );
    }
  },

  async upsertQuizzes(quizzes: Quiz[]): Promise<void> {
    const db = getDatabase();

    for (const quiz of quizzes) {
      await db.runAsync(
        `INSERT INTO quizzes_local (
          id, course_id, title, description, time_limit_minutes, question_count, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          course_id = excluded.course_id,
          title = excluded.title,
          description = excluded.description,
          time_limit_minutes = excluded.time_limit_minutes,
          question_count = excluded.question_count,
          updated_at = excluded.updated_at`,
        [
          String(quiz.id),
          String(quiz.course_id),
          quiz.title,
          quiz.description ?? null,
          quiz.time_limit_minutes ?? null,
          quiz.question_count ?? null,
          safeTimestamp(quiz.updated_at),
        ],
      );
    }
  },

  async upsertAnnouncements(announcements: Announcement[]): Promise<void> {
    const db = getDatabase();

    for (const announcement of announcements) {
      await db.runAsync(
        `INSERT INTO announcements_local (
          id, course_id, title, content, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          course_id = excluded.course_id,
          title = excluded.title,
          content = excluded.content,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at`,
        [
          String(announcement.id),
          String(announcement.course_id),
          announcement.title,
          announcement.content,
          announcement.created_at,
          announcement.updated_at,
        ],
      );
    }
  },

  async markCourseDownloaded(courseId: number, materialCount: number): Promise<void> {
    const db = getDatabase();

    await db.runAsync(
      `UPDATE courses_local SET
        is_downloaded = 1,
        download_progress = 1,
        total_materials = ?,
        downloaded_materials = ?,
        updated_at = ?
      WHERE id = ?`,
      [materialCount, materialCount, new Date().toISOString(), String(courseId)],
    );
  },

  async getCourseMaterials(courseId: number): Promise<Material[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<DbMaterialRow>(
      `SELECT id, course_id, title, type, file_url, file_size, checksum, updated_at
       FROM materials_local
       WHERE course_id = ?
       ORDER BY updated_at DESC`,
      [String(courseId)],
    );

    return rows.map((row) => ({
      id: toNumber(row.id),
      course_id: toNumber(row.course_id),
      title: row.title ?? "Untitled",
      type: row.type ?? "file",
      file_url: row.file_url ?? "",
      file_size: row.file_size ?? undefined,
      checksum: row.checksum ?? undefined,
      updated_at: row.updated_at ?? undefined,
    }));
  },

  async getCourseQuizzes(courseId: number): Promise<Quiz[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<DbQuizRow>(
      `SELECT id, course_id, title, description, time_limit_minutes, question_count, updated_at
       FROM quizzes_local
       WHERE course_id = ?
       ORDER BY updated_at DESC`,
      [String(courseId)],
    );

    return rows.map((row) => ({
      id: toNumber(row.id),
      course_id: toNumber(row.course_id),
      title: row.title ?? "Untitled quiz",
      description: row.description ?? undefined,
      time_limit_minutes: row.time_limit_minutes ?? undefined,
      question_count: row.question_count ?? undefined,
      updated_at: row.updated_at ?? undefined,
    }));
  },

  async getCourses(): Promise<Course[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<DbCourseRow>(
      `SELECT id, title, code, lecturer_name, description, is_downloaded, download_progress,
              total_materials, downloaded_materials, updated_at
       FROM courses_local
       ORDER BY updated_at DESC`,
    );

    return rows.map((row) => ({
      id: toNumber(row.id),
      title: row.title ?? "Untitled course",
      code: row.code ?? "N/A",
      description: row.description ?? "",
      lecturer_id: 0,
      lecturer_name: row.lecturer_name ?? undefined,
      updated_at: row.updated_at ?? undefined,
    }));
  },

  async saveQuizAttempt(
    userId: number,
    quizId: number,
    courseId: number,
    answers: number[],
    score: number,
    attemptedAt: string,
  ): Promise<void> {
    const db = getDatabase();

    const result = await db.runAsync(
      `INSERT INTO quiz_attempts_local (quiz_id, course_id, user_id, selected_answers, score, attempted_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [String(quizId), String(courseId), String(userId), JSON.stringify(answers), score, attemptedAt],
    );

    const localAttemptId = result.lastInsertRowId;
    if (typeof localAttemptId === "number") {
      await db.runAsync(
        `INSERT OR IGNORE INTO quiz_attempt_sync_queue (local_attempt_id, user_id) VALUES (?, ?)`,
        [localAttemptId, String(userId)],
      );
    }
  },

  async getPendingQuizAttempts(userId: number): Promise<PendingQuizAttempt[]> {
    const db = getDatabase();
    const rows = await db.getAllAsync<DbPendingQuizAttemptRow>(
      `SELECT
        q.id AS queue_id,
        q.local_attempt_id,
        q.user_id,
        a.quiz_id,
        a.course_id,
        a.selected_answers,
        a.score,
        a.attempted_at
       FROM quiz_attempt_sync_queue q
       INNER JOIN quiz_attempts_local a ON a.id = q.local_attempt_id
       WHERE q.user_id = ?
       ORDER BY q.id ASC`,
      [String(userId)],
    );

    const pending: PendingQuizAttempt[] = [];

    for (const row of rows) {
      try {
        const parsed = JSON.parse(row.selected_answers) as number[];
        pending.push({
          queueId: row.queue_id,
          localAttemptId: row.local_attempt_id,
          userId: toNumber(row.user_id),
          quizId: toNumber(row.quiz_id),
          courseId: toNumber(row.course_id),
          answers: parsed,
          score: row.score,
          attemptedAt: row.attempted_at,
        });
      } catch {
        // Drop malformed queued attempt rows to avoid perpetual retry loops.
        await db.runAsync(`DELETE FROM quiz_attempt_sync_queue WHERE id = ?`, [row.queue_id]);
      }
    }

    return pending;
  },

  async getPendingQuizAttemptCount(userId: number): Promise<number> {
    const db = getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM quiz_attempt_sync_queue WHERE user_id = ?`,
      [String(userId)],
    );

    return row?.count ?? 0;
  },

  async markQuizAttemptsSynced(queueIds: number[]): Promise<void> {
    if (queueIds.length === 0) {
      return;
    }

    const db = getDatabase();

    for (const queueId of queueIds) {
      await db.runAsync(`DELETE FROM quiz_attempt_sync_queue WHERE id = ?`, [queueId]);
    }
  },

  async getProgressMetrics(): Promise<ProgressMetrics> {
    const db = getDatabase();
    const row = await db.getFirstAsync<DbProgressRow>(
      `SELECT
         (SELECT COUNT(*) FROM courses_local) AS total_courses,
         (SELECT COUNT(*) FROM courses_local WHERE is_downloaded = 1) AS downloaded_courses,
         (SELECT COUNT(*) FROM materials_local) AS total_materials,
         (SELECT COUNT(*) FROM announcements_local) AS total_announcements,
         (SELECT COUNT(*) FROM quiz_attempts_local) AS total_quiz_attempts,
         (SELECT MAX(attempted_at) FROM quiz_attempts_local) AS latest_attempted_at`,
    );

    const totalCourses = row?.total_courses ?? 0;
    const downloadedCourses = row?.downloaded_courses ?? 0;

    return {
      totalCourses,
      downloadedCourses,
      totalMaterials: row?.total_materials ?? 0,
      totalAnnouncements: row?.total_announcements ?? 0,
      totalQuizAttempts: row?.total_quiz_attempts ?? 0,
      latestAttemptedAt: row?.latest_attempted_at ?? null,
      downloadCompletionPercent:
        totalCourses > 0 ? Math.round((downloadedCourses / totalCourses) * 100) : 0,
    };
  },
};
