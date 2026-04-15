package handlers

import (
	"bytes"
	"elearn-backend/internal/config"
	"elearn-backend/internal/repository"
	"elearn-backend/pkg/auth"
	"errors"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func setupAuthHandlerTest(t *testing.T) (*AuthHandler, sqlmock.Sqlmock, func()) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}

	repo := repository.NewUserRepository(db)
	cfg := &config.Config{JWTSecret: "test-secret", JWTExpiry: 24, RefreshExpiry: 7}
	handler := NewAuthHandler(repo, cfg)

	cleanup := func() {
		_ = db.Close()
	}

	return handler, mock, cleanup
}

func TestRegister_WhenFindByEmailFails_Returns500(t *testing.T) {
	handler, mock, cleanup := setupAuthHandlerTest(t)
	defer cleanup()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE email = ?")).
		WithArgs("student@example.com").
		WillReturnError(errors.New("db unavailable"))

	r := gin.New()
	r.POST("/register", handler.Register)

	body := `{"email":"student@example.com","password":"password123","name":"Student"}`
	req := httptest.NewRequest(http.MethodPost, "/register", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, resp.Code)
	}
	if !strings.Contains(resp.Body.String(), "Failed to check existing user") {
		t.Fatalf("expected error message in response, got: %s", resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestLogin_WhenFindByEmailFailsWithDBError_Returns500(t *testing.T) {
	handler, mock, cleanup := setupAuthHandlerTest(t)
	defer cleanup()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE email = ?")).
		WithArgs("student@example.com").
		WillReturnError(errors.New("database timeout"))

	r := gin.New()
	r.POST("/login", handler.Login)

	body := `{"email":"student@example.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, resp.Code)
	}
	if !strings.Contains(resp.Body.String(), "Failed to fetch user") {
		t.Fatalf("expected error message in response, got: %s", resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestLogin_WhenSuccessful_PersistsRefreshTokenHash(t *testing.T) {
	handler, mock, cleanup := setupAuthHandlerTest(t)
	defer cleanup()

	hash, err := auth.HashPassword("password123")
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}

	rows := sqlmock.NewRows([]string{"id", "email", "password_hash", "name", "role", "created_at", "updated_at"}).
		AddRow(int64(1), "student@example.com", hash, "Student", "student", time.Now(), time.Now())
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE email = ?")).
		WithArgs("student@example.com").
		WillReturnRows(rows)

	mock.ExpectExec(regexp.QuoteMeta("UPDATE users SET refresh_token_hash = ?, updated_at = ? WHERE id = ?")).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	r := gin.New()
	r.POST("/login", handler.Login)

	body := `{"email":"student@example.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusOK, resp.Code, resp.Body.String())
	}
	if !strings.Contains(resp.Body.String(), "refresh_token") {
		t.Fatalf("expected refresh token in response body, got: %s", resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestRefresh_WhenFindByIDFailsWithDBError_Returns500(t *testing.T) {
	handler, mock, cleanup := setupAuthHandlerTest(t)
	defer cleanup()

	refreshToken, err := auth.GenerateRefreshToken(1, "test-secret", 7)
	if err != nil {
		t.Fatalf("failed to generate refresh token: %v", err)
	}

	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE id = ?")).
		WithArgs(int64(1)).
		WillReturnError(errors.New("db connection reset"))

	r := gin.New()
	r.POST("/refresh", handler.Refresh)

	body := `{"refresh_token":"` + refreshToken + `"}`
	req := httptest.NewRequest(http.MethodPost, "/refresh", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, resp.Code)
	}
	if !strings.Contains(resp.Body.String(), "Failed to fetch user") {
		t.Fatalf("expected error message in response, got: %s", resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestGetMe_WhenFindByIDFailsWithDBError_Returns500(t *testing.T) {
	handler, mock, cleanup := setupAuthHandlerTest(t)
	defer cleanup()

	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE id = ?")).
		WithArgs(int64(1)).
		WillReturnError(errors.New("db unavailable"))

	r := gin.New()
	r.GET("/me", func(c *gin.Context) {
		c.Set("userID", int64(1))
		handler.GetMe(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/me", nil)
	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", http.StatusInternalServerError, resp.Code)
	}
	if !strings.Contains(resp.Body.String(), "Failed to fetch user") {
		t.Fatalf("expected error message in response, got: %s", resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestLogout_WhenValidRefreshToken_ClearsStoredToken(t *testing.T) {
	handler, mock, cleanup := setupAuthHandlerTest(t)
	defer cleanup()

	refreshToken, err := auth.GenerateRefreshToken(1, "test-secret", 7)
	if err != nil {
		t.Fatalf("failed to generate refresh token: %v", err)
	}

	hash := hashRefreshToken(refreshToken)

	tokenRows := sqlmock.NewRows([]string{"refresh_token_hash"}).AddRow(hash)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT refresh_token_hash FROM users WHERE id = ?")).
		WithArgs(int64(1)).
		WillReturnRows(tokenRows)

	mock.ExpectExec(regexp.QuoteMeta("UPDATE users SET refresh_token_hash = NULL, updated_at = ? WHERE id = ?")).
		WithArgs(sqlmock.AnyArg(), int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))

	r := gin.New()
	r.POST("/logout", handler.Logout)

	bodyJSON := `{"refresh_token":"` + refreshToken + `"}`
	req := httptest.NewRequest(http.MethodPost, "/logout", bytes.NewBufferString(bodyJSON))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusOK, resp.Code, resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestLogout_WhenStoredTokenMismatch_Returns401(t *testing.T) {
	handler, mock, cleanup := setupAuthHandlerTest(t)
	defer cleanup()

	refreshToken, err := auth.GenerateRefreshToken(1, "test-secret", 7)
	if err != nil {
		t.Fatalf("failed to generate refresh token: %v", err)
	}

	tokenRows := sqlmock.NewRows([]string{"refresh_token_hash"}).AddRow("different_hash")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT refresh_token_hash FROM users WHERE id = ?")).
		WithArgs(int64(1)).
		WillReturnRows(tokenRows)

	r := gin.New()
	r.POST("/logout", handler.Logout)

	body := `{"refresh_token":"` + refreshToken + `"}`
	req := httptest.NewRequest(http.MethodPost, "/logout", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusUnauthorized, resp.Code, resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}
