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
	// UpdateRoleChecked updates the user's role. When demoting to "user" it only
	// applies the change if at least 2 admins currently exist, preventing the last
	// admin from being demoted. Returns false if the update was blocked.
	UpdateRoleChecked(ctx context.Context, id uuid.UUID, role string) (updated bool, err error)
	SetDisabled(ctx context.Context, id uuid.UUID, disabled bool) error
	UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error
}
