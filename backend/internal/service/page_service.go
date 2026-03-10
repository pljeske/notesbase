package service

import (
	"context"
	"log"
	"sort"

	"notes-app/backend/internal/model"
	"notes-app/backend/internal/repository"

	"github.com/google/uuid"
)

type PageService struct {
	repo    repository.PageRepository
	fileSvc *FileService
}

func NewPageService(repo repository.PageRepository, fileSvc *FileService) *PageService {
	return &PageService{repo: repo, fileSvc: fileSvc}
}

func (s *PageService) GetTree(ctx context.Context, userID uuid.UUID) ([]model.PageTreeNode, error) {
	pages, err := s.repo.GetAll(ctx, userID)
	if err != nil {
		return nil, err
	}
	return buildTree(pages), nil
}

func (s *PageService) GetPage(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.Page, error) {
	return s.repo.GetByID(ctx, userID, id)
}

func (s *PageService) CreatePage(ctx context.Context, userID uuid.UUID, req model.CreatePageRequest) (*model.Page, error) {
	return s.repo.Create(ctx, userID, req)
}

func (s *PageService) UpdatePage(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.UpdatePageRequest) (*model.Page, error) {
	page, err := s.repo.Update(ctx, userID, id, req)
	if err != nil {
		return nil, err
	}

	// Clean up orphaned files if content was updated
	if req.Content != nil && s.fileSvc != nil {
		if err := s.fileSvc.CleanupOrphanedFiles(ctx, userID, id, page.Content); err != nil {
			log.Printf("Warning: failed to clean up orphaned files for page %s: %v", id, err)
		}
	}

	return page, nil
}

func (s *PageService) DeletePage(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	// Delete all files from S3 before the page cascade deletes them from DB
	if s.fileSvc != nil {
		if err := s.fileSvc.DeleteAllPageFiles(ctx, userID, id); err != nil {
			log.Printf("Warning: failed to delete files for page %s: %v", id, err)
		}
	}

	return s.repo.Delete(ctx, userID, id)
}

func (s *PageService) MovePage(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.MovePageRequest) error {
	return s.repo.Move(ctx, userID, id, req)
}

func buildTree(pages []model.Page) []model.PageTreeNode {
	nodeMap := make(map[uuid.UUID]*model.PageTreeNode)

	// Create nodes
	for _, p := range pages {
		node := model.PageTreeNode{
			ID:        p.ID,
			ParentID:  p.ParentID,
			Title:     p.Title,
			Icon:      p.Icon,
			Position:  p.Position,
			Children:  []model.PageTreeNode{},
			CreatedAt: p.CreatedAt,
			UpdatedAt: p.UpdatedAt,
		}
		nodeMap[p.ID] = &node
	}

	// Build tree
	var roots []*model.PageTreeNode
	for _, p := range pages {
		node := nodeMap[p.ID]
		if p.ParentID == nil {
			roots = append(roots, node)
		} else if parent, ok := nodeMap[*p.ParentID]; ok {
			parent.Children = append(parent.Children, *node)
		}
	}

	// Sort children by position at each level
	var sortFn func(nodes []model.PageTreeNode)
	sortFn = func(nodes []model.PageTreeNode) {
		sort.Slice(nodes, func(i, j int) bool {
			return nodes[i].Position < nodes[j].Position
		})
		for i := range nodes {
			sortFn(nodes[i].Children)
		}
	}

	result := make([]model.PageTreeNode, len(roots))
	for i, r := range roots {
		result[i] = *r
	}
	sortFn(result)

	return result
}
