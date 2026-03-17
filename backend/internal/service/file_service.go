package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"path"
	"regexp"

	"notesbase/backend/internal/model"
	"notesbase/backend/internal/repository"
	"notesbase/backend/internal/storage"

	"github.com/google/uuid"
)

type FileService struct {
	repo    repository.FileRepository
	storage *storage.S3Client
}

func NewFileService(repo repository.FileRepository, s3 *storage.S3Client) *FileService {
	return &FileService{repo: repo, storage: s3}
}

func (s *FileService) Upload(ctx context.Context, userID uuid.UUID, pageID uuid.UUID, filename string, contentType string, size int64, reader io.Reader) (*model.FileResponse, error) {

	ext := path.Ext(filename)
	s3Key := fmt.Sprintf("pages/%s/%s%s", pageID.String(), uuid.New().String(), ext)

	if err := s.storage.Upload(ctx, s3Key, reader, size, contentType); err != nil {
		return nil, fmt.Errorf("upload to storage: %w", err)
	}

	file := &model.File{
		UserID:      userID,
		PageID:      pageID,
		Filename:    filename,
		ContentType: contentType,
		Size:        size,
		S3Key:       s3Key,
	}
	if err := s.repo.Create(ctx, file); err != nil {
		_ = s.storage.Delete(ctx, s3Key)
		return nil, fmt.Errorf("save file metadata: %w", err)
	}

	return &model.FileResponse{
		ID:          file.ID,
		URL:         fmt.Sprintf("/api/files/%s", file.ID.String()),
		Filename:    file.Filename,
		ContentType: file.ContentType,
		Size:        file.Size,
	}, nil
}

func (s *FileService) GetFile(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.File, io.ReadCloser, error) {
	file, err := s.repo.GetByID(ctx, userID, id)
	if err != nil {
		return nil, nil, err
	}
	if file == nil {
		return nil, nil, nil
	}

	reader, err := s.storage.Download(ctx, file.S3Key)
	if err != nil {
		return nil, nil, fmt.Errorf("download from storage: %w", err)
	}

	return file, reader, nil
}

func (s *FileService) DeleteFile(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	file, err := s.repo.GetByID(ctx, userID, id)
	if err != nil {
		return err
	}
	if file == nil {
		return fmt.Errorf("file not found")
	}

	if err := s.storage.Delete(ctx, file.S3Key); err != nil {
		return fmt.Errorf("delete from storage: %w", err)
	}

	return s.repo.Delete(ctx, userID, id)
}

// CleanupOrphanedFiles removes files that are associated with a page but no longer
// referenced in its content. Called after page content is updated.
func (s *FileService) CleanupOrphanedFiles(ctx context.Context, userID uuid.UUID, pageID uuid.UUID, content json.RawMessage) error {
	pageFiles, err := s.repo.GetByPageID(ctx, pageID)
	if err != nil {
		return fmt.Errorf("get page files: %w", err)
	}
	if len(pageFiles) == 0 {
		return nil
	}

	referencedIDs := extractFileIDs(content)

	for _, f := range pageFiles {
		if !referencedIDs[f.ID] {
			if err := s.storage.Delete(ctx, f.S3Key); err != nil {
				log.Printf("Warning: failed to delete S3 object %s: %v", f.S3Key, err)
			}
			if err := s.repo.Delete(ctx, userID, f.ID); err != nil {
				log.Printf("Warning: failed to delete file record %s: %v", f.ID, err)
			}
		}
	}
	return nil
}

// DeleteAllPageFiles removes all files associated with a page from S3 and the database.
// Called before a page is deleted.
func (s *FileService) DeleteAllPageFiles(ctx context.Context, userID uuid.UUID, pageID uuid.UUID) error {
	pageFiles, err := s.repo.GetByPageID(ctx, pageID)
	if err != nil {
		return fmt.Errorf("get page files: %w", err)
	}

	for _, f := range pageFiles {
		if err := s.storage.Delete(ctx, f.S3Key); err != nil {
			log.Printf("Warning: failed to delete S3 object %s: %v", f.S3Key, err)
		}
		if err := s.repo.Delete(ctx, userID, f.ID); err != nil {
			log.Printf("Warning: failed to delete file record %s: %v", f.ID, err)
		}
	}
	return nil
}

// CopyPageFiles server-side copies all files from sourcePageID to targetPageID.
// Returns a map of old file ID → new file ID for content URL rewriting.
func (s *FileService) CopyPageFiles(ctx context.Context, userID uuid.UUID, sourcePageID, targetPageID uuid.UUID) (map[uuid.UUID]uuid.UUID, error) {
	pageFiles, err := s.repo.GetByPageID(ctx, sourcePageID)
	if err != nil {
		return nil, fmt.Errorf("get source page files: %w", err)
	}

	idMap := make(map[uuid.UUID]uuid.UUID, len(pageFiles))
	for _, f := range pageFiles {
		newID := uuid.New()
		newKey := fmt.Sprintf("pages/%s/%s", targetPageID.String(), newID.String()+getExt(f.S3Key))

		if err := s.storage.Copy(ctx, f.S3Key, newKey); err != nil {
			log.Printf("Warning: failed to copy S3 object %s: %v", f.S3Key, err)
			continue
		}

		newFile := &model.File{
			ID:          newID,
			UserID:      userID,
			PageID:      targetPageID,
			Filename:    f.Filename,
			ContentType: f.ContentType,
			Size:        f.Size,
			S3Key:       newKey,
		}
		if err := s.repo.Create(ctx, newFile); err != nil {
			log.Printf("Warning: failed to insert copied file record: %v", err)
			_ = s.storage.Delete(ctx, newKey)
			continue
		}
		idMap[f.ID] = newID
	}
	return idMap, nil
}

func getExt(key string) string {
	for i := len(key) - 1; i >= 0; i-- {
		if key[i] == '.' {
			return key[i:]
		}
		if key[i] == '/' {
			break
		}
	}
	return ""
}

var fileIDPattern = regexp.MustCompile(`/api/files/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`)

// extractFileIDs walks the JSON content and extracts all file UUIDs referenced
// in src attributes (images: /api/files/{id}, PDFs: /api/files/{id}).
func extractFileIDs(content json.RawMessage) map[uuid.UUID]bool {
	ids := make(map[uuid.UUID]bool)
	if content == nil {
		return ids
	}

	// Simple approach: find all /api/files/{uuid} patterns in the raw JSON
	matches := fileIDPattern.FindAllStringSubmatch(string(content), -1)
	for _, match := range matches {
		if id, err := uuid.Parse(match[1]); err == nil {
			ids[id] = true
		}
	}
	return ids
}
