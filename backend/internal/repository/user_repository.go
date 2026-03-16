package repository

import (
	"context"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
)

type UserRepository interface {
	Create(ctx context.Context, user *model.User) error
	GetByEmail(ctx context.Context, email string) (*model.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*model.User, error)
	Count(ctx context.Context) (int, error)
	ListAll(ctx context.Context) ([]*model.User, error)
	UpdateRole(ctx context.Context, id uuid.UUID, role string) error
	SetDisabled(ctx context.Context, id uuid.UUID, disabled bool) error
}
