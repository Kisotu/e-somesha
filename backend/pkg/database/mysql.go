package database

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

type Migration struct {
	Version int
	Name    string
	Up      []string
	Down    []string
}

var migrationTableSQL = `CREATE TABLE IF NOT EXISTS schema_migrations (
	version INT PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`

var migrations = []Migration{
	{
		Version: 1,
		Name:    "initial_schema",
		Up: []string{
			`CREATE TABLE IF NOT EXISTS users (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				email VARCHAR(255) UNIQUE NOT NULL,
				password_hash VARCHAR(255) NOT NULL,
				refresh_token_hash VARCHAR(255) NULL,
				name VARCHAR(255) NOT NULL,
				role ENUM('student', 'lecturer') DEFAULT 'student',
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			)`,
			`CREATE TABLE IF NOT EXISTS courses (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				title VARCHAR(255) NOT NULL,
				code VARCHAR(50) UNIQUE NOT NULL,
				description TEXT,
				lecturer_id BIGINT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (lecturer_id) REFERENCES users(id)
			)`,
			`CREATE TABLE IF NOT EXISTS enrollments (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				user_id BIGINT NOT NULL,
				course_id BIGINT NOT NULL,
				enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE KEY unique_enrollment (user_id, course_id),
				FOREIGN KEY (user_id) REFERENCES users(id),
				FOREIGN KEY (course_id) REFERENCES courses(id)
			)`,
			`CREATE TABLE IF NOT EXISTS materials (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				course_id BIGINT NOT NULL,
				title VARCHAR(255) NOT NULL,
				type ENUM('pdf', 'slide', 'image', 'note') NOT NULL,
				file_url VARCHAR(500) NOT NULL,
				file_size BIGINT,
				checksum VARCHAR(64),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (course_id) REFERENCES courses(id)
			)`,
			`CREATE TABLE IF NOT EXISTS quizzes (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				course_id BIGINT NOT NULL,
				title VARCHAR(255) NOT NULL,
				description TEXT,
				time_limit_minutes INT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (course_id) REFERENCES courses(id)
			)`,
			`CREATE TABLE IF NOT EXISTS quiz_questions (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				quiz_id BIGINT NOT NULL,
				question_text TEXT NOT NULL,
				options JSON NOT NULL,
				correct_option_index INT NOT NULL,
				points INT DEFAULT 1,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
			)`,
			`CREATE TABLE IF NOT EXISTS quiz_attempts (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				user_id BIGINT NOT NULL,
				quiz_id BIGINT NOT NULL,
				answers JSON NOT NULL,
				score INT NOT NULL,
				attempted_at TIMESTAMP NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users(id),
				FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
				UNIQUE KEY unique_attempt (user_id, quiz_id, attempted_at)
			)`,
			`CREATE TABLE IF NOT EXISTS announcements (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				course_id BIGINT NOT NULL,
				title VARCHAR(255) NOT NULL,
				content TEXT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (course_id) REFERENCES courses(id)
			)`,
			`CREATE TABLE IF NOT EXISTS material_views (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				user_id BIGINT NOT NULL,
				material_id BIGINT NOT NULL,
				viewed_at TIMESTAMP NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				UNIQUE KEY unique_view (user_id, material_id),
				FOREIGN KEY (user_id) REFERENCES users(id),
				FOREIGN KEY (material_id) REFERENCES materials(id)
			)`,
			`CREATE TABLE IF NOT EXISTS download_manifests (
				id BIGINT PRIMARY KEY AUTO_INCREMENT,
				course_id BIGINT NOT NULL UNIQUE,
				files JSON NOT NULL,
				version INT DEFAULT 1,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
				FOREIGN KEY (course_id) REFERENCES courses(id)
			)`,
		},
		Down: []string{
			`DROP TABLE IF EXISTS download_manifests`,
			`DROP TABLE IF EXISTS material_views`,
			`DROP TABLE IF EXISTS announcements`,
			`DROP TABLE IF EXISTS quiz_attempts`,
			`DROP TABLE IF EXISTS quiz_questions`,
			`DROP TABLE IF EXISTS quizzes`,
			`DROP TABLE IF EXISTS materials`,
			`DROP TABLE IF EXISTS enrollments`,
			`DROP TABLE IF EXISTS courses`,
			`DROP TABLE IF EXISTS users`,
		},
	},
	{
		Version: 2,
		Name:    "add_refresh_token_hash",
		Up: []string{
			`ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255) NULL AFTER password_hash`,
		},
		Down: []string{
			`ALTER TABLE users DROP COLUMN IF EXISTS refresh_token_hash`,
		},
	},
}

func Connect(host string, port int, user, password, dbname string) error {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&loc=UTC",
		user, password, host, port, dbname)

	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)
	DB.SetConnMaxLifetime(5 * time.Minute)

	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	return nil
}

func Migrate(db *sql.DB) error {
	if err := ensureMigrationTable(db); err != nil {
		return err
	}

	applied, err := getAppliedMigrationVersions(db)
	if err != nil {
		return err
	}

	for _, migration := range migrations {
		if _, ok := applied[migration.Version]; ok {
			continue
		}

		if err := applyMigration(db, migration); err != nil {
			return err
		}
	}

	return nil
}

func RollbackLastMigration(db *sql.DB) error {
	if err := ensureMigrationTable(db); err != nil {
		return err
	}

	var version int
	var name string
	err := db.QueryRow(`SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1`).Scan(&version, &name)
	if errors.Is(err, sql.ErrNoRows) {
		return nil
	}
	if err != nil {
		return fmt.Errorf("failed to read latest migration: %w", err)
	}

	var target *Migration
	for i := range migrations {
		if migrations[i].Version == version {
			target = &migrations[i]
			break
		}
	}
	if target == nil {
		return fmt.Errorf("no migration definition found for version %d (%s)", version, name)
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin rollback transaction: %w", err)
	}

	for _, stmt := range target.Down {
		if _, err := tx.Exec(stmt); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to rollback migration %d (%s): %w", target.Version, target.Name, err)
		}
	}

	if _, err := tx.Exec(`DELETE FROM schema_migrations WHERE version = ?`, target.Version); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("failed to delete migration record %d: %w", target.Version, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit rollback transaction: %w", err)
	}

	return nil
}

func ensureMigrationTable(db *sql.DB) error {
	if _, err := db.Exec(migrationTableSQL); err != nil {
		return fmt.Errorf("failed to ensure migration table: %w", err)
	}
	return nil
}

func getAppliedMigrationVersions(db *sql.DB) (map[int]struct{}, error) {
	rows, err := db.Query(`SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("failed to query applied migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[int]struct{})
	for rows.Next() {
		var version int
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("failed to scan migration version: %w", err)
		}
		applied[version] = struct{}{}
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed while iterating migrations: %w", err)
	}

	return applied, nil
}

func applyMigration(db *sql.DB, migration Migration) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin migration transaction: %w", err)
	}

	for _, stmt := range migration.Up {
		if _, err := tx.Exec(stmt); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to apply migration %d (%s): %w", migration.Version, migration.Name, err)
		}
	}

	if _, err := tx.Exec(`INSERT INTO schema_migrations (version, name) VALUES (?, ?)`, migration.Version, migration.Name); err != nil {
		_ = tx.Rollback()
		return fmt.Errorf("failed to record migration %d (%s): %w", migration.Version, migration.Name, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit migration %d (%s): %w", migration.Version, migration.Name, err)
	}

	return nil
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}
