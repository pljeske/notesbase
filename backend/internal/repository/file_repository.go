package repository

import (
	"context"

	"notes-app/backend/internal/model"

	"github.com/google/uuid"
)

type FileRepository interface {
	Create(ctx context.Context, file *model.File) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.File, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
