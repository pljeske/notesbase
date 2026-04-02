package repository

import (
	"context"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
)

type APIKeyRepository interface {
	Create(ctx context.Context, key *model.APIKey, keyHash string) error
	GetByHash(ctx context.Context, keyHash string) (*model.APIKey, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]model.APIKey, error)
	Delete(ctx context.Context, userID uuid.UUID, keyID uuid.UUID) error
	TouchLastUsed(ctx context.Context, keyID uuid.UUID) error
}
