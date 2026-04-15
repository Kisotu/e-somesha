package repository

import (
	"errors"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestGetEnrolledCourses_WhenRowsIterationFails_ReturnsError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	repo := NewCourseRepository(db)

	iterationErr := errors.New("row iteration failed")
	rows := sqlmock.NewRows([]string{"id", "title", "code", "description", "lecturer_id", "name", "created_at", "updated_at"}).
		AddRow(int64(1), "Course A", "CS101", "Intro", int64(2), "Lecturer A", time.Now(), time.Now()).
		AddRow(int64(2), "Course B", "CS102", "Algo", int64(3), "Lecturer B", time.Now(), time.Now()).
		RowError(1, iterationErr)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT c.id, c.title, c.code, c.description, c.lecturer_id, u.name, c.created_at, c.updated_at
		FROM courses c
		JOIN enrollments e ON c.id = e.course_id
		JOIN users u ON c.lecturer_id = u.id
		WHERE e.user_id = ?
		ORDER BY c.title
	`)).
		WithArgs(int64(10)).
		WillReturnRows(rows)

	_, err = repo.GetEnrolledCourses(10)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), iterationErr.Error()) {
		t.Fatalf("expected error to contain %q, got %q", iterationErr.Error(), err.Error())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestGetMaterialViews_WhenRowsIterationFails_ReturnsError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	repo := NewCourseRepository(db)

	iterationErr := errors.New("material views row iteration failed")
	rows := sqlmock.NewRows([]string{"id", "user_id", "material_id", "viewed_at", "created_at", "updated_at"}).
		AddRow(int64(1), int64(10), int64(99), time.Now(), time.Now(), time.Now()).
		AddRow(int64(2), int64(10), int64(100), time.Now(), time.Now(), time.Now()).
		RowError(1, iterationErr)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, user_id, material_id, viewed_at, created_at, updated_at
		FROM material_views WHERE user_id = ?
	`)).
		WithArgs(int64(10)).
		WillReturnRows(rows)

	_, err = repo.GetMaterialViews(10)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), iterationErr.Error()) {
		t.Fatalf("expected error to contain %q, got %q", iterationErr.Error(), err.Error())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestSyncCoursesSince_WhenMaterialsFetchFails_ReturnsWrappedError(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	repo := NewCourseRepository(db)

	now := time.Now().UTC()
	rows := sqlmock.NewRows([]string{"id", "title", "code", "description", "lecturer_id", "name", "created_at", "updated_at"}).
		AddRow(int64(1), "Course A", "CS101", "Intro", int64(2), "Lecturer A", now, now)

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT c.id, c.title, c.code, c.description, c.lecturer_id, u.name, c.created_at, c.updated_at
		FROM courses c
		JOIN enrollments e ON c.id = e.course_id
		JOIN users u ON c.lecturer_id = u.id
		WHERE e.user_id = ?
		ORDER BY c.title
	`)).
		WithArgs(int64(10)).
		WillReturnRows(rows)

	materialErr := errors.New("materials query failed")
	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, course_id, title, type, file_url, file_size, checksum, created_at, updated_at
		FROM materials WHERE course_id = ? ORDER BY title
	`)).
		WithArgs(int64(1)).
		WillReturnError(materialErr)

	_, _, _, _, err = repo.SyncCoursesSince(10, now.Add(-time.Hour))
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "failed to fetch materials for course 1") {
		t.Fatalf("expected wrapped course context in error, got %q", err.Error())
	}
	if !strings.Contains(err.Error(), materialErr.Error()) {
		t.Fatalf("expected underlying error in message, got %q", err.Error())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestToJSON_WhenMarshalFails_ReturnsError(t *testing.T) {
	_, err := toJSON(func() {})
	if err == nil {
		t.Fatal("expected marshal error, got nil")
	}
}
