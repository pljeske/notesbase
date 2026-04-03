package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type ipLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type rateLimiterStore struct {
	mu      sync.Mutex
	entries map[string]*ipLimiter
	r       rate.Limit
	burst   int
}

func newRateLimiterStore(r rate.Limit, burst int) *rateLimiterStore {
	s := &rateLimiterStore{
		entries: make(map[string]*ipLimiter),
		r:       r,
		burst:   burst,
	}
	go s.cleanup()
	return s
}

func (s *rateLimiterStore) get(ip string) *rate.Limiter {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.entries[ip]
	if !ok {
		entry = &ipLimiter{limiter: rate.NewLimiter(s.r, s.burst)}
		s.entries[ip] = entry
	}
	entry.lastSeen = time.Now()
	return entry.limiter
}

// cleanup removes entries that haven't been seen in the last 10 minutes.
func (s *rateLimiterStore) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		s.mu.Lock()
		for ip, entry := range s.entries {
			if time.Since(entry.lastSeen) > 10*time.Minute {
				delete(s.entries, ip)
			}
		}
		s.mu.Unlock()
	}
}

// RateLimit returns a middleware that limits requests to r per second with the
// given burst size, keyed by client IP. Responds with 429 when the limit is exceeded.
func RateLimit(r rate.Limit, burst int) gin.HandlerFunc {
	store := newRateLimiterStore(r, burst)
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !store.get(ip).Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests"})
			return
		}
		c.Next()
	}
}
