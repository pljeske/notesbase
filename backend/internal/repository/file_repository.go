package repository

import (
	"context"

	"github.com/google/uuid"
	"notes-app/backend/internal/model"
)

type FileRepository interface {
	Create(ctx context.Context, file *model.File) error
	GetByID(ctx context.Context, id uuid.UUID) (*model.File, error)
	Delete(ctx context.Context, id uuid.UUID) error
}
