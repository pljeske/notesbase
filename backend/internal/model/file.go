package model

import (
	"time"

	"github.com/google/uuid"
)

type File struct {
	ID          uuid.UUID `json:"id"`
	PageID      uuid.UUID `json:"page_id"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"content_type"`
	Size        int64     `json:"size"`
	S3Key       string    `json:"-"`
	CreatedAt   time.Time `json:"created_at"`
}

type FileResponse struct {
	ID          uuid.UUID `json:"id"`
	URL         string    `json:"url"`
	Filename    string    `json:"filename"`
	ContentType string    `json:"content_type"`
	Size        int64     `json:"size"`
}
