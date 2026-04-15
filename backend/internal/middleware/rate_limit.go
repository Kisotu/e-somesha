package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type clientWindow struct {
	count int
	reset time.Time
}

// RateLimitMiddleware enforces a per-client fixed window limit.
func RateLimitMiddleware(maxRequests int, window time.Duration) gin.HandlerFunc {
	if maxRequests <= 0 {
		maxRequests = 1
	}
	if window <= 0 {
		window = time.Minute
	}

	clients := make(map[string]clientWindow)
	var mu sync.Mutex

	return func(c *gin.Context) {
		now := time.Now()
		clientID := c.ClientIP()

		mu.Lock()
		entry, exists := clients[clientID]
		if !exists || now.After(entry.reset) {
			entry = clientWindow{count: 0, reset: now.Add(window)}
		}

		if entry.count >= maxRequests {
			retryAfter := int(time.Until(entry.reset).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			mu.Unlock()

			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests. Please try again later."})
			c.Abort()
			return
		}

		entry.count++
		clients[clientID] = entry
		mu.Unlock()

		c.Next()
	}
}
