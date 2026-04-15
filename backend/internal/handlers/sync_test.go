package handlers

import (
	"bytes"
	"elearn-backend/internal/models"
	"elearn-backend/internal/repository"
	"encoding/json"
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

func setupSyncHandlerTest(t *testing.T) (*SyncHandler, sqlmock.Sqlmock, func()) {
	t.Helper()

	gin.SetMode(gin.TestMode)

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}

	repo := repository.NewCourseRepository(db)
	handler := NewSyncHandler(repo)

	cleanup := func() {
		_ = db.Close()
	}

	return handler, mock, cleanup
}

func TestSyncMaterialsViewed_InvalidMaterialIDRejectedWithReason(t *testing.T) {
	handler, mock, cleanup := setupSyncHandlerTest(t)
	defer cleanup()

	r := gin.New()
	r.POST("/sync/materials_viewed", func(c *gin.Context) {
		c.Set("userID", int64(42))
		handler.SyncMaterialsViewed(c)
	})

	body := `{"views":[{"user_id":42,"material_id":0,"viewed_at":"2026-04-15T00:00:00Z"}]}`
	req := httptest.NewRequest(http.MethodPost, "/sync/materials_viewed", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, resp.Code)
	}

	var out models.MaterialViewSyncResponse
	if err := json.Unmarshal(resp.Body.Bytes(), &out); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if out.Synced != 0 {
		t.Fatalf("expected synced=0, got %d", out.Synced)
	}
	if len(out.Rejected) != 1 || out.Rejected[0] != 0 {
		t.Fatalf("expected rejected [0], got %+v", out.Rejected)
	}
	if len(out.RejectedDetails) != 1 || out.RejectedDetails[0].Reason != "Invalid material ID" {
		t.Fatalf("unexpected rejected details: %+v", out.RejectedDetails)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestSyncMaterialsViewed_UserMismatchRejectedWithReason(t *testing.T) {
	handler, mock, cleanup := setupSyncHandlerTest(t)
	defer cleanup()

	r := gin.New()
	r.POST("/sync/materials_viewed", func(c *gin.Context) {
		c.Set("userID", int64(7))
		handler.SyncMaterialsViewed(c)
	})

	body := `{"views":[{"user_id":9,"material_id":15,"viewed_at":"2026-04-15T00:00:00Z"}]}`
	req := httptest.NewRequest(http.MethodPost, "/sync/materials_viewed", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, resp.Code)
	}

	var out models.MaterialViewSyncResponse
	if err := json.Unmarshal(resp.Body.Bytes(), &out); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(out.RejectedDetails) != 1 || out.RejectedDetails[0].Reason != "User ID mismatch" {
		t.Fatalf("unexpected rejected details: %+v", out.RejectedDetails)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestSyncQuizAttempts_TooManyAnswersRejected(t *testing.T) {
	handler, mock, cleanup := setupSyncHandlerTest(t)
	defer cleanup()

	r := gin.New()
	r.POST("/sync/quiz_attempts", func(c *gin.Context) {
		c.Set("userID", int64(1))
		handler.SyncQuizAttempts(c)
	})

	answers := make([]string, 201)
	for i := range answers {
		answers[i] = "1"
	}
	body := `{"attempts":[{"user_id":1,"quiz_id":10,"answers":[` + strings.Join(answers, ",") + `],"score":5,"attempted_at":"2026-04-15T00:00:00Z"}]}`
	req := httptest.NewRequest(http.MethodPost, "/sync/quiz_attempts", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, resp.Code)
	}

	var out models.QuizAttemptSyncResponse
	if err := json.Unmarshal(resp.Body.Bytes(), &out); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(out.Rejected) != 1 || out.Rejected[0].Reason != "Invalid answers payload" {
		t.Fatalf("unexpected rejected results: %+v", out.Rejected)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestSyncQuizAttempts_ExistingAttemptLookupDBErrorAddsRejectedReason(t *testing.T) {
	handler, mock, cleanup := setupSyncHandlerTest(t)
	defer cleanup()

	r := gin.New()
	r.POST("/sync/quiz_attempts", func(c *gin.Context) {
		c.Set("userID", int64(5))
		handler.SyncQuizAttempts(c)
	})

	mock.ExpectQuery(regexp.QuoteMeta(`
		SELECT id, user_id, quiz_id, answers, score, attempted_at, created_at, updated_at
		FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?
		ORDER BY attempted_at DESC LIMIT 1
	`)).
		WithArgs(int64(5), int64(77)).
		WillReturnError(errors.New("db timeout"))

	body := `{"attempts":[{"user_id":5,"quiz_id":77,"answers":[1,2],"score":2,"attempted_at":"2026-04-15T00:00:00Z"}]}`
	req := httptest.NewRequest(http.MethodPost, "/sync/quiz_attempts", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, resp.Code)
	}

	var out models.QuizAttemptSyncResponse
	if err := json.Unmarshal(resp.Body.Bytes(), &out); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(out.Rejected) != 1 {
		t.Fatalf("expected one rejected result, got %+v", out.Rejected)
	}
	if out.Rejected[0].Reason != "Failed to check existing attempt" {
		t.Fatalf("expected rejected reason %q, got %q", "Failed to check existing attempt", out.Rejected[0].Reason)
	}
	if out.Synced != 0 {
		t.Fatalf("expected synced=0, got %d", out.Synced)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}

func TestSyncQuizAttempts_TooManyAttemptsReturnsBadRequest(t *testing.T) {
	handler, mock, cleanup := setupSyncHandlerTest(t)
	defer cleanup()

	r := gin.New()
	r.POST("/sync/quiz_attempts", func(c *gin.Context) {
		c.Set("userID", int64(1))
		handler.SyncQuizAttempts(c)
	})

	attempts := make([]string, 501)
	for i := range attempts {
		attempts[i] = `{"user_id":1,"quiz_id":1,"answers":[1],"score":1,"attempted_at":"` + time.Now().UTC().Format(time.RFC3339) + `"}`
	}
	body := `{"attempts":[` + strings.Join(attempts, ",") + `]}`
	req := httptest.NewRequest(http.MethodPost, "/sync/quiz_attempts", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")

	resp := httptest.NewRecorder()
	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusBadRequest, resp.Code, resp.Body.String())
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}
