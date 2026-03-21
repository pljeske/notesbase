package repository

import (
	"context"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
)

type PageLinkRepository interface {
	ReplaceLinks(ctx context.Context, sourceID uuid.UUID, targetIDs []uuid.UUID) error
	GetBacklinks(ctx context.Context, userID uuid.UUID, targetID uuid.UUID) ([]model.SearchResult, error)
}
