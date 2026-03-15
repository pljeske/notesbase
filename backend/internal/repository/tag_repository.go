package repository

import (
	"context"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
)

type TagRepository interface {
	Create(ctx context.Context, userID uuid.UUID, req model.CreateTagRequest) (*model.Tag, error)
	GetAll(ctx context.Context, userID uuid.UUID) ([]model.Tag, error)
	GetByID(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.Tag, error)
	Update(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.UpdateTagRequest) (*model.Tag, error)
	Delete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error
	GetByPageID(ctx context.Context, pageID uuid.UUID) ([]model.Tag, error)
	GetAllPageTags(ctx context.Context, userID uuid.UUID) (map[uuid.UUID][]model.Tag, error)
	SetPageTags(ctx context.Context, pageID uuid.UUID, tagIDs []uuid.UUID) error
	GetPagesByTag(ctx context.Context, userID uuid.UUID, tagID uuid.UUID) ([]model.Page, error)
}
