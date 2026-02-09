package repository

import (
	"context"

	"github.com/google/uuid"
	"notes-app/backend/internal/model"
)

type PageRepository interface {
	GetAll(ctx context.Context) ([]model.Page, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.Page, error)
	Create(ctx context.Context, req model.CreatePageRequest) (*model.Page, error)
	Update(ctx context.Context, id uuid.UUID, req model.UpdatePageRequest) (*model.Page, error)
	Delete(ctx context.Context, id uuid.UUID) error
	Move(ctx context.Context, id uuid.UUID, req model.MovePageRequest) error
}
