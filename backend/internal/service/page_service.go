package service

import (
	"context"
	"sort"

	"github.com/google/uuid"
	"notes-app/backend/internal/model"
	"notes-app/backend/internal/repository"
)

type PageService struct {
	repo repository.PageRepository
}

func NewPageService(repo repository.PageRepository) *PageService {
	return &PageService{repo: repo}
}

func (s *PageService) GetTree(ctx context.Context) ([]model.PageTreeNode, error) {
	pages, err := s.repo.GetAll(ctx)
	if err != nil {
		return nil, err
	}
	return buildTree(pages), nil
}

func (s *PageService) GetPage(ctx context.Context, id uuid.UUID) (*model.Page, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *PageService) CreatePage(ctx context.Context, req model.CreatePageRequest) (*model.Page, error) {
	return s.repo.Create(ctx, req)
}

func (s *PageService) UpdatePage(ctx context.Context, id uuid.UUID, req model.UpdatePageRequest) (*model.Page, error) {
	return s.repo.Update(ctx, id, req)
}

func (s *PageService) DeletePage(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *PageService) MovePage(ctx context.Context, id uuid.UUID, req model.MovePageRequest) error {
	return s.repo.Move(ctx, id, req)
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
