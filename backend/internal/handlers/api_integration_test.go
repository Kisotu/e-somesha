package handlers

import (
	"bytes"
	"elearn-backend/internal/config"
	"elearn-backend/internal/middleware"
	"elearn-backend/internal/repository"
	authpkg "elearn-backend/pkg/auth"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func setupAPIRouterIntegrationTest(t *testing.T) (*gin.Engine, sqlmock.Sqlmock, func()) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}

	cfg := &config.Config{JWTSecret: "test-secret", JWTExpiry: 24, RefreshExpiry: 7}
	userRepo := repository.NewUserRepository(db)
	courseRepo := repository.NewCourseRepository(db)

	authHandler := NewAuthHandler(userRepo, cfg)
	syncHandler := NewSyncHandler(courseRepo)

	r := gin.New()
	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		auth.POST("/login", authHandler.Login)

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg))
		sync := protected.Group("/sync")
		sync.Use(middleware.RequestBodyLimitMiddleware(1 << 20))
		sync.POST("/materials_viewed", syncHandler.SyncMaterialsViewed)
	}

	cleanup := func() {
		_ = db.Close()
	}

	return r, mock, cleanup
}

func TestLoginEndpoint_ReturnsTokensForValidCredentials(t *testing.T) {
	r, mock, cleanup := setupAPIRouterIntegrationTest(t)
	defer cleanup()

	hash, err := authpkg.HashPassword("password123")
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

	body := `{"email":"student@example.com","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusOK, resp.Code, resp.Body.String())
	}
	if !strings.Contains(resp.Body.String(), "access_token") || !strings.Contains(resp.Body.String(), "refresh_token") {
		t.Fatalf("expected token fields in response body, got %s", resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestSyncMaterialsViewedEndpoint_RejectsUnauthorizedRequests(t *testing.T) {
	r, mock, cleanup := setupAPIRouterIntegrationTest(t)
	defer cleanup()

	body := `{"views":[{"user_id":1,"material_id":10,"viewed_at":"2026-04-15T00:00:00Z"}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/sync/materials_viewed", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, resp.Code)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestSyncMaterialsViewedEndpoint_AcceptsAuthorizedValidPayload(t *testing.T) {
	r, mock, cleanup := setupAPIRouterIntegrationTest(t)
	defer cleanup()

	token, err := authpkg.GenerateAccessToken(1, "student@example.com", "student", "test-secret", 24)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	mock.ExpectExec(regexp.QuoteMeta(`
		INSERT INTO material_views (user_id, material_id, viewed_at)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE viewed_at = VALUES(viewed_at), updated_at = NOW()
	`)).
		WithArgs(int64(1), int64(10), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	body := `{"views":[{"user_id":1,"material_id":10,"viewed_at":"2026-04-15T00:00:00Z"}]}`
	req := httptest.NewRequest(http.MethodPost, "/api/sync/materials_viewed", bytes.NewBufferString(body))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusOK, resp.Code, resp.Body.String())
	}
	if !strings.Contains(resp.Body.String(), `"synced":1`) {
		t.Fatalf("expected synced=1 response, got %s", resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}
