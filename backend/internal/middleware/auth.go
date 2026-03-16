package middleware

import (
	"net/http"
	"strings"

	"notesbase/backend/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	userIDKey   = "userID"
	userRoleKey = "userRole"
)

func Auth(authSvc *service.AuthService) gin.HandlerFunc {
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

		userID, role, err := authSvc.ValidateToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set(userIDKey, userID)
		c.Set(userRoleKey, role)
		c.Next()
	}
}

func RequireAdmin(c *gin.Context) {
	if GetUserRole(c) != "admin" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin access required"})
		return
	}
	c.Next()
}

func GetUserID(c *gin.Context) uuid.UUID {
	val, exists := c.Get(userIDKey)
	if !exists {
		return uuid.Nil
	}
	userID, ok := val.(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return userID
}

func GetUserRole(c *gin.Context) string {
	val, _ := c.Get(userRoleKey)
	role, _ := val.(string)
	return role
}
