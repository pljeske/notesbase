package repository

import (
	"context"

	"notes-app/backend/internal/model"

	"github.com/google/uuid"
)

type PageRepository interface {
	GetAll(ctx context.Context, userID uuid.UUID) ([]model.Page, error)
	GetByID(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.Page, error)
	Create(ctx context.Context, userID uuid.UUID, req model.CreatePageRequest) (*model.Page, error)
	Update(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.UpdatePageRequest) (*model.Page, error)
	Delete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
	Move(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.MovePageRequest) error
}
