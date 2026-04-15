package database

import (
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestMigrate_AppliesPendingMigrations(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	mock.ExpectExec(regexp.QuoteMeta(migrationTableSQL)).WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT version FROM schema_migrations`)).WillReturnRows(sqlmock.NewRows([]string{"version"}))

	mock.ExpectBegin()
	for _, stmt := range migrations[0].Up {
		mock.ExpectExec(regexp.QuoteMeta(stmt)).WillReturnResult(sqlmock.NewResult(0, 0))
	}
	mock.ExpectExec(regexp.QuoteMeta(`INSERT INTO schema_migrations (version, name) VALUES (?, ?)`)).
		WithArgs(migrations[0].Version, migrations[0].Name).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	if err := Migrate(db); err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestMigrate_SkipsAlreadyAppliedMigrations(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	mock.ExpectExec(regexp.QuoteMeta(migrationTableSQL)).WillReturnResult(sqlmock.NewResult(0, 0))
	rows := sqlmock.NewRows([]string{"version"})
	rows.AddRow(migrations[0].Version)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT version FROM schema_migrations`)).
		WillReturnRows(rows)

	if err := Migrate(db); err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestRollbackLastMigration_RollsBackLatestVersion(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	mock.ExpectExec(regexp.QuoteMeta(migrationTableSQL)).WillReturnResult(sqlmock.NewResult(0, 0))
	rows := sqlmock.NewRows([]string{"version", "name"})
	rows.AddRow(migrations[0].Version, migrations[0].Name)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT version, name FROM schema_migrations ORDER BY version DESC LIMIT 1`)).
		WillReturnRows(rows)

	mock.ExpectBegin()
	for _, stmt := range migrations[0].Down {
		mock.ExpectExec(regexp.QuoteMeta(stmt)).WillReturnResult(sqlmock.NewResult(0, 0))
	}
	mock.ExpectExec(regexp.QuoteMeta(`DELETE FROM schema_migrations WHERE version = ?`)).
		WithArgs(migrations[0].Version).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	if err := RollbackLastMigration(db); err != nil {
		t.Fatalf("expected nil error, got %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}
