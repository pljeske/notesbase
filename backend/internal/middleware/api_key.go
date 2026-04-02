package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"

	"notesbase/backend/internal/model"
	"notesbase/backend/internal/repository"

	"github.com/gin-gonic/gin"
)

const apiKeyContextKey = "apiKey"

// APIKeyAuth validates an API key from the Authorization header (Bearer nbp_...).
// On success it sets the userID and userRole context values so existing handlers work unchanged.
func APIKeyAuth(repo repository.APIKeyRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			return
		}

		rawKey := parts[1]
		if !strings.HasPrefix(rawKey, "nbp_") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid api key"})
			return
		}

		hash := sha256.Sum256([]byte(rawKey))
		keyHash := hex.EncodeToString(hash[:])

		key, err := repo.GetByHash(c.Request.Context(), keyHash)
		if err != nil || key == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid api key"})
			return
		}

		c.Set(userIDKey, key.UserID)
		c.Set(userRoleKey, "user") // plugin keys never get admin
		c.Set(apiKeyContextKey, key)

		go repo.TouchLastUsed(context.Background(), key.ID)

		c.Next()
	}
}

// RequireScope aborts the request if the resolved API key does not include the given scope.
func RequireScope(scope string) gin.HandlerFunc {
	return func(c *gin.Context) {
		val, exists := c.Get(apiKeyContextKey)
		if !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "scope check requires api key auth"})
			return
		}

		key, ok := val.(*model.APIKey)
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "invalid api key context"})
			return
		}

		for _, s := range key.Scopes {
			if s == scope {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "api key missing required scope: " + scope})
	}
}
