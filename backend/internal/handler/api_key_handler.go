package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"

	"notesbase/backend/internal/middleware"
	"notesbase/backend/internal/model"
	"notesbase/backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type APIKeyHandler struct {
	repo repository.APIKeyRepository
}

func NewAPIKeyHandler(repo repository.APIKeyRepository) *APIKeyHandler {
	return &APIKeyHandler{repo: repo}
}

func (h *APIKeyHandler) ListKeys(c *gin.Context) {
	userID := middleware.GetUserID(c)
	keys, err := h.repo.ListByUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list api keys"})
		return
	}
	c.JSON(http.StatusOK, keys)
}

func (h *APIKeyHandler) CreateKey(c *gin.Context) {
	var req model.CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for _, s := range req.Scopes {
		if !model.ValidScopes[s] {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid scope: %s", s)})
			return
		}
	}

	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate key"})
		return
	}
	rawKey := "nbp_" + hex.EncodeToString(rawBytes)

	hash := sha256.Sum256([]byte(rawKey))
	keyHash := hex.EncodeToString(hash[:])

	key := &model.APIKey{
		UserID:    middleware.GetUserID(c),
		Name:      req.Name,
		KeyPrefix: rawKey[:12], // "nbp_" + first 8 hex chars
		Scopes:    req.Scopes,
	}

	if err := h.repo.Create(c.Request.Context(), key, keyHash); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create api key"})
		return
	}

	c.JSON(http.StatusCreated, model.CreateAPIKeyResponse{
		APIKey: *key,
		RawKey: rawKey,
	})
}

func (h *APIKeyHandler) DeleteKey(c *gin.Context) {
	keyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid key id"})
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.repo.Delete(c.Request.Context(), userID, keyID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "api key not found"})
		return
	}

	c.Status(http.StatusNoContent)
}
