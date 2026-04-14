package database

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

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
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id BIGINT PRIMARY KEY AUTO_INCREMENT,
			email VARCHAR(255) UNIQUE NOT NULL,
			password_hash VARCHAR(255) NOT NULL,
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
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}