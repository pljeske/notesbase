package repository

import (
	"context"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
)

type FileRepository interface {
	Create(ctx context.Context, file *model.File) error
	GetByID(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.File, error)
	GetByPageID(ctx context.Context, pageID uuid.UUID) ([]model.File, error)
	Delete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
}
