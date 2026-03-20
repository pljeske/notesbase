package repository

import (
	"context"
	"time"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
)

type PasswordResetRepository interface {
	Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*model.PasswordResetToken, error)
	DeleteByUserID(ctx context.Context, userID uuid.UUID) error
	DeleteByTokenHash(ctx context.Context, tokenHash string) error
}
