import * as SQLite from "expo-sqlite";

let database: SQLite.SQLiteDatabase | undefined;

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!database) {
    database = SQLite.openDatabaseSync("esomesha.db");
  }
  return database;
};

const schemaStatements = [
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
  `CREATE TABLE IF NOT EXISTS announcements_local (
    id TEXT PRIMARY KEY,
    course_id TEXT,
    title TEXT,
    content TEXT,
    created_at TEXT,
    updated_at TEXT
  );`,
];

export const initializeDatabase = async (): Promise<void> => {
  const db = getDatabase();

  for (const statement of schemaStatements) {
    await db.execAsync(statement);
  }
};
