package service

import (
	"context"

	"notesbase/backend/internal/model"
	"notesbase/backend/internal/repository"

	"github.com/google/uuid"
)

type TagService struct {
	repo repository.TagRepository
}

func NewTagService(repo repository.TagRepository) *TagService {
	return &TagService{repo: repo}
}

func (s *TagService) ListTags(ctx context.Context, userID uuid.UUID) ([]model.Tag, error) {
	return s.repo.GetAll(ctx, userID)
}

func (s *TagService) CreateTag(ctx context.Context, userID uuid.UUID, req model.CreateTagRequest) (*model.Tag, error) {
	return s.repo.Create(ctx, userID, req)
}

func (s *TagService) UpdateTag(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.UpdateTagRequest) (*model.Tag, error) {
	return s.repo.Update(ctx, userID, id, req)
}

func (s *TagService) DeleteTag(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	return s.repo.Delete(ctx, userID, id)
}

func (s *TagService) GetPagesByTag(ctx context.Context, userID uuid.UUID, tagID uuid.UUID) ([]model.Page, error) {
	return s.repo.GetPagesByTag(ctx, userID, tagID)
}
