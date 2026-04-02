package model

import (
	"time"

	"github.com/google/uuid"
)

const (
	ScopePageRead  = "pages:read"
	ScopePageWrite = "pages:write"
	ScopeTagRead   = "tags:read"
	ScopeTagWrite  = "tags:write"
	ScopeFileRead  = "files:read"
	ScopeFileWrite = "files:write"
)

var ValidScopes = map[string]bool{
	ScopePageRead:  true,
	ScopePageWrite: true,
	ScopeTagRead:   true,
	ScopeTagWrite:  true,
	ScopeFileRead:  true,
	ScopeFileWrite: true,
}

type APIKey struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"-"`
	Name       string     `json:"name"`
	KeyPrefix  string     `json:"key_prefix"`
	Scopes     []string   `json:"scopes"`
	LastUsedAt *time.Time `json:"last_used_at"`
	CreatedAt  time.Time  `json:"created_at"`
}

type CreateAPIKeyRequest struct {
	Name   string   `json:"name" binding:"required"`
	Scopes []string `json:"scopes" binding:"required"`
}

type CreateAPIKeyResponse struct {
	APIKey
	RawKey string `json:"key"`
}
