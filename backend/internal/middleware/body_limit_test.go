package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRequestBodyLimitMiddleware_AllowsBodyWithinLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(RequestBodyLimitMiddleware(128))
	r.POST("/payload", func(c *gin.Context) {
		var payload map[string]string
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	reqBody := `{"message":"hello"}`
	req := httptest.NewRequest(http.MethodPost, "/payload", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusOK, resp.Code, resp.Body.String())
	}
}

func TestRequestBodyLimitMiddleware_RejectsBodyOverLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(RequestBodyLimitMiddleware(64))
	r.POST("/payload", func(c *gin.Context) {
		var payload map[string]string
		if err := c.ShouldBindJSON(&payload); err != nil {
			if strings.Contains(err.Error(), "request body too large") {
				c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	largeValue := strings.Repeat("a", 256)
	reqBody := `{"message":"` + largeValue + `"}`
	req := httptest.NewRequest(http.MethodPost, "/payload", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusRequestEntityTooLarge, resp.Code, resp.Body.String())
	}
	if !strings.Contains(resp.Body.String(), "request body too large") {
		t.Fatalf("expected body-too-large error, got %s", resp.Body.String())
	}
}

func TestRequestBodyLimitMiddleware_UsesDefaultWhenLimitInvalid(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(RequestBodyLimitMiddleware(0))
	r.POST("/payload", func(c *gin.Context) {
		var payload map[string]string
		if err := c.ShouldBindJSON(&payload); err != nil {
			if strings.Contains(err.Error(), "request body too large") {
				c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// 32 KB payload should be accepted under default 1 MiB limit.
	message := strings.Repeat("b", 32*1024)
	reqBody := `{"message":"` + message + `"}`
	req := httptest.NewRequest(http.MethodPost, "/payload", bytes.NewBufferString(reqBody))
	req.Header.Set("Content-Type", "application/json")
	resp := httptest.NewRecorder()

	r.ServeHTTP(resp, req)

	if resp.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d; body=%s", http.StatusOK, resp.Code, resp.Body.String())
	}
}
