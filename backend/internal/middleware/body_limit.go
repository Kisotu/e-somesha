package middleware

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

// RequestBodyLimitMiddleware limits the maximum bytes read from request body.
func RequestBodyLimitMiddleware(maxBytes int64) gin.HandlerFunc {
	if maxBytes <= 0 {
		maxBytes = 1 << 20 // 1 MiB safe default
	}

	return func(c *gin.Context) {
		c.Request.Body = httpMaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

// Wrapped for testability and to keep middleware code concise.
var httpMaxBytesReader = func(w gin.ResponseWriter, r io.ReadCloser, n int64) io.ReadCloser {
	return http.MaxBytesReader(w, r, n)
}
