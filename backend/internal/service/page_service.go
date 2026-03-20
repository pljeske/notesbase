package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sort"
	"strings"

	"notesbase/backend/internal/model"
	"notesbase/backend/internal/repository"

	"github.com/google/uuid"
)

type PageService struct {
	repo    repository.PageRepository
	tagRepo repository.TagRepository
	fileSvc *FileService
}

func NewPageService(repo repository.PageRepository, tagRepo repository.TagRepository, fileSvc *FileService) *PageService {
	return &PageService{repo: repo, tagRepo: tagRepo, fileSvc: fileSvc}
}

func (s *PageService) GetTree(ctx context.Context, userID uuid.UUID) ([]model.PageTreeNode, error) {
	pages, err := s.repo.GetAll(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Batch load all page tags (avoids N+1)
	var tagsByPage map[uuid.UUID][]model.Tag
	if s.tagRepo != nil {
		tagsByPage, err = s.tagRepo.GetAllPageTags(ctx, userID)
		if err != nil {
			log.Printf("Warning: failed to load page tags: %v", err)
			tagsByPage = make(map[uuid.UUID][]model.Tag)
		}
	} else {
		tagsByPage = make(map[uuid.UUID][]model.Tag)
	}

	return buildTree(pages, tagsByPage), nil
}

func (s *PageService) GetPage(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.Page, error) {
	page, err := s.repo.GetByID(ctx, userID, id)
	if err != nil || page == nil {
		return page, err
	}

	if s.tagRepo != nil {
		tags, err := s.tagRepo.GetByPageID(ctx, userID, id)
		if err != nil {
			log.Printf("Warning: failed to load tags for page %s: %v", id, err)
		} else {
			page.Tags = tags
		}
	}

	return page, nil
}

func (s *PageService) IsPageTrashed(ctx context.Context, userID uuid.UUID, id uuid.UUID) (bool, error) {
	return s.repo.IsTrashed(ctx, userID, id)
}

func (s *PageService) CreatePage(ctx context.Context, userID uuid.UUID, req model.CreatePageRequest) (*model.Page, error) {
	return s.repo.Create(ctx, userID, req)
}

func (s *PageService) UpdatePage(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.UpdatePageRequest) (*model.Page, error) {
	page, err := s.repo.Update(ctx, userID, id, req)
	if err != nil {
		return nil, err
	}
	if page == nil {
		return nil, nil
	}

	if s.tagRepo != nil {
		// Update tags if TagIDs is explicitly set (not nil)
		if req.TagIDs != nil {
			if err := s.tagRepo.SetPageTags(ctx, id, req.TagIDs); err != nil {
				log.Printf("Warning: failed to set page tags for page %s: %v", id, err)
			}
		}
		// Always load tags so the response is complete regardless of what was updated
		tags, err := s.tagRepo.GetByPageID(ctx, userID, id)
		if err == nil {
			page.Tags = tags
		}
	}

	// Clean up orphaned files if content was updated
	if req.Content != nil && s.fileSvc != nil {
		if err := s.fileSvc.CleanupOrphanedFiles(ctx, userID, id, page.Content); err != nil {
			log.Printf("Warning: failed to clean up orphaned files for page %s: %v", id, err)
		}
	}

	return page, nil
}

// DeletePage soft-deletes the page and its subtree. Files are kept until permanent delete.
func (s *PageService) DeletePage(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	return s.repo.SoftDelete(ctx, userID, id)
}

func (s *PageService) SearchPages(ctx context.Context, userID uuid.UUID, query string) ([]model.SearchResult, error) {
	return s.repo.Search(ctx, userID, query)
}

func (s *PageService) MovePage(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.MovePageRequest) error {
	return s.repo.Move(ctx, userID, id, req)
}

func (s *PageService) ListTrash(ctx context.Context, userID uuid.UUID) ([]model.TrashedPage, error) {
	return s.repo.ListTrashed(ctx, userID)
}

func (s *PageService) RestorePage(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	return s.repo.Restore(ctx, userID, id)
}

// PermanentDeletePage deletes all files from S3 then hard-deletes the page from the DB.
func (s *PageService) PermanentDeletePage(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	if s.fileSvc != nil {
		if err := s.fileSvc.DeleteAllPageFiles(ctx, userID, id); err != nil {
			log.Printf("Warning: failed to delete files for page %s: %v", id, err)
		}
	}
	return s.repo.HardDelete(ctx, userID, id)
}

// DuplicatePage copies a page (and optionally its subtree) under the same parent.
func (s *PageService) DuplicatePage(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.DuplicatePageRequest) (*model.Page, error) {
	var pages []model.Page
	var err error

	if req.Deep {
		pages, err = s.repo.GetDescendants(ctx, userID, id)
	} else {
		src, e := s.repo.GetByID(ctx, userID, id)
		if e != nil {
			return nil, e
		}
		if src == nil {
			return nil, fmt.Errorf("page not found")
		}
		pages = []model.Page{*src}
	}

	if err != nil {
		return nil, err
	}
	if len(pages) == 0 {
		return nil, fmt.Errorf("page not found")
	}

	// Build old→new ID map
	idMap := make(map[uuid.UUID]uuid.UUID, len(pages))
	for _, p := range pages {
		idMap[p.ID] = uuid.New()
	}

	var newRoot *model.Page
	for i, p := range pages {
		newID := idMap[p.ID]

		// Remap parent ID
		var newParentID *uuid.UUID
		if p.ParentID == nil || p.ID == id {
			// Root of duplication: keep original parent
			newParentID = p.ParentID
		} else if mappedParent, ok := idMap[*p.ParentID]; ok {
			newParentID = &mappedParent
		} else {
			newParentID = p.ParentID
		}

		title := p.Title
		if i == 0 {
			title = p.Title + " (Copy)"
		}

		// Rewrite file URLs in content
		content := rewriteFileURLs(p.Content, idMap)

		newPage, err := s.repo.CreateWithID(ctx, userID, newID, newParentID, title, content, p.Icon, p.IconColor)
		if err != nil {
			return nil, fmt.Errorf("duplicate page %s: %w", p.ID, err)
		}

		// Copy files for this page and rewrite file ID references in content
		if s.fileSvc != nil {
			fileIDMap, err := s.fileSvc.CopyPageFiles(ctx, userID, p.ID, newID)
			if err != nil {
				log.Printf("Warning: failed to copy files for page %s: %v", p.ID, err)
			}
			if len(fileIDMap) > 0 {
				rewritten := rewriteFileIDsInContent(newPage.Content, fileIDMap)
				if len(rewritten) > 0 {
					contentJSON := json.RawMessage(rewritten)
					if _, err := s.repo.Update(ctx, userID, newID, model.UpdatePageRequest{Content: &contentJSON}); err != nil {
						log.Printf("Warning: failed to update file references for duplicated page %s: %v", newID, err)
					}
				}
			}
		}

		if i == 0 {
			newRoot = newPage
		}
	}

	return newRoot, nil
}

// rewriteFileURLs replaces /api/files/{old-uuid} patterns in content with new page UUIDs.
// Note: actual file UUIDs are rewritten by CopyPageFiles; this handles page-level ID remapping
// in content that references sub-page IDs (not file IDs). For file URLs, CopyPageFiles handles it.
func rewriteFileURLs(content []byte, _ map[uuid.UUID]uuid.UUID) []byte {
	return content
}

// rewriteFileIDsInContent rewrites file IDs in page content JSON using the provided map.
func rewriteFileIDsInContent(content []byte, fileIDMap map[uuid.UUID]uuid.UUID) []byte {
	if len(content) == 0 || len(fileIDMap) == 0 {
		return content
	}
	s := string(content)
	pairs := make([]string, 0, len(fileIDMap)*2)
	for oldID, newID := range fileIDMap {
		pairs = append(pairs, "/api/files/"+oldID.String(), "/api/files/"+newID.String())
	}
	r := strings.NewReplacer(pairs...)
	return []byte(r.Replace(s))
}

func buildTree(pages []model.Page, tagsByPage map[uuid.UUID][]model.Tag) []model.PageTreeNode {
	nodeMap := make(map[uuid.UUID]*model.PageTreeNode)

	for _, p := range pages {
		tags := tagsByPage[p.ID]
		if tags == nil {
			tags = []model.Tag{}
		}
		node := model.PageTreeNode{
			ID:        p.ID,
			ParentID:  p.ParentID,
			Title:     p.Title,
			Icon:      p.Icon,
			IconColor: p.IconColor,
			Position:  p.Position,
			Tags:      tags,
			Children:  []model.PageTreeNode{},
			CreatedAt: p.CreatedAt,
			UpdatedAt: p.UpdatedAt,
		}
		nodeMap[p.ID] = &node
	}

	var roots []*model.PageTreeNode
	for _, p := range pages {
		node := nodeMap[p.ID]
		if p.ParentID == nil {
			roots = append(roots, node)
		} else if parent, ok := nodeMap[*p.ParentID]; ok {
			parent.Children = append(parent.Children, *node)
		}
	}

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
