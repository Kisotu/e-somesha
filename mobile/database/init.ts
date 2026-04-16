import * as SQLite from "expo-sqlite";

let database: SQLite.SQLiteDatabase | undefined;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!database) {
    database = SQLite.openDatabaseSync("esomesha.db");
  }
  return database;
};

const schemaStatements = [
  `PRAGMA foreign_keys = ON;`,
  `CREATE TABLE IF NOT EXISTS sync_metadata (
    id INTEGER PRIMARY KEY,
    last_sync_timestamp TEXT,
    user_id TEXT,
    email TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS courses_local (
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
  );`,
  `CREATE TABLE IF NOT EXISTS materials_local (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT,
    type TEXT,
    file_url TEXT,
    file_size INTEGER,
    checksum TEXT,
    updated_at TEXT,
    FOREIGN KEY (course_id) REFERENCES courses_local(id) ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS quizzes_local (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT,
    description TEXT,
    time_limit_minutes INTEGER,
    question_count INTEGER,
    updated_at TEXT,
    FOREIGN KEY (course_id) REFERENCES courses_local(id) ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS quiz_attempts_local (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    selected_answers TEXT NOT NULL,
    score INTEGER NOT NULL,
    attempted_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses_local(id) ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS quiz_attempt_sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    local_attempt_id INTEGER NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    enqueued_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (local_attempt_id) REFERENCES quiz_attempts_local(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS announcements_local (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    title TEXT,
    content TEXT,
    created_at TEXT,
    updated_at TEXT
  );`,
  `DROP TABLE IF EXISTS announcements_local_new;`,
  `CREATE TABLE IF NOT EXISTS announcements_local_new (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    title TEXT,
    content TEXT,
    created_at TEXT,
    updated_at TEXT,
    FOREIGN KEY (course_id) REFERENCES courses_local(id) ON DELETE CASCADE ON UPDATE CASCADE
  );`,
  `INSERT OR REPLACE INTO announcements_local_new (id, course_id, title, content, created_at, updated_at)
   SELECT id, course_id, title, content, created_at, updated_at
   FROM announcements_local
   WHERE course_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM courses_local WHERE courses_local.id = announcements_local.course_id);`,
  `DROP TABLE IF EXISTS announcements_local;`,
  `ALTER TABLE announcements_local_new RENAME TO announcements_local;`,
  `CREATE INDEX IF NOT EXISTS idx_courses_local_updated_at ON courses_local(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_courses_local_is_downloaded ON courses_local(is_downloaded);`,
  `CREATE INDEX IF NOT EXISTS idx_materials_local_course_id ON materials_local(course_id);`,
  `CREATE INDEX IF NOT EXISTS idx_materials_local_updated_at ON materials_local(updated_at);`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_local_course_id ON quizzes_local(course_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_local_course_id ON quiz_attempts_local(course_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_local_attempted_at ON quiz_attempts_local(attempted_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_local_user_id ON quiz_attempts_local(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_attempt_sync_queue_user_id ON quiz_attempt_sync_queue(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_announcements_local_course_id_created_at
   ON announcements_local(course_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_announcements_local_updated_at ON announcements_local(updated_at);`,
];

export const initializeDatabase = async (): Promise<void> => {
  const db = getDatabase();

  for (const statement of schemaStatements) {
    await db.execAsync(statement);
  }

  const quizAttemptColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(quiz_attempts_local);`);
  const hasUserIdColumn = quizAttemptColumns.some((column) => column.name === "user_id");

  if (!hasUserIdColumn) {
    await db.execAsync(`ALTER TABLE quiz_attempts_local ADD COLUMN user_id TEXT NOT NULL DEFAULT '0';`);
  }
};
