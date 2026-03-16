package repository

import (
	"context"
	"time"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
)

type PageRepository interface {
	GetAll(ctx context.Context, userID uuid.UUID) ([]model.Page, error)
	GetByID(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.Page, error)
	Create(ctx context.Context, userID uuid.UUID, req model.CreatePageRequest) (*model.Page, error)
	CreateWithID(ctx context.Context, userID uuid.UUID, id uuid.UUID, parentID *uuid.UUID, title string, content []byte, icon *string) (*model.Page, error)
	Update(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.UpdatePageRequest) (*model.Page, error)
	Delete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
	Move(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.MovePageRequest) error
	SoftDelete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
	ListTrashed(ctx context.Context, userID uuid.UUID) ([]model.TrashedPage, error)
	Restore(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
	HardDelete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
	PurgeExpired(ctx context.Context, userID uuid.UUID, before time.Time) ([]uuid.UUID, error)
	GetDescendants(ctx context.Context, userID uuid.UUID, id uuid.UUID) ([]model.Page, error)
	Search(ctx context.Context, userID uuid.UUID, query string) ([]model.SearchResult, error)
}
