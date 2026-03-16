package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Page struct {
	ID        uuid.UUID       `json:"id"`
	ParentID  *uuid.UUID      `json:"parent_id"`
	Title     string          `json:"title"`
	Content   json.RawMessage `json:"content"`
	Position  int             `json:"position"`
	Icon      *string         `json:"icon"`
	Tags      []Tag           `json:"tags"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
	DeletedAt *time.Time      `json:"deleted_at,omitempty"`
}

type PageTreeNode struct {
	ID        uuid.UUID      `json:"id"`
	ParentID  *uuid.UUID     `json:"parent_id"`
	Title     string         `json:"title"`
	Icon      *string        `json:"icon"`
	Position  int            `json:"position"`
	Tags      []Tag          `json:"tags"`
	Children  []PageTreeNode `json:"children"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt *time.Time     `json:"deleted_at,omitempty"`
}

type TrashedPage struct {
	ID        uuid.UUID  `json:"id"`
	Title     string     `json:"title"`
	Icon      *string    `json:"icon"`
	DeletedAt *time.Time `json:"deleted_at"`
}

type CreatePageRequest struct {
	ParentID *uuid.UUID `json:"parent_id"`
	Title    string     `json:"title"`
}

type UpdatePageRequest struct {
	Title   *string          `json:"title,omitempty"`
	Content *json.RawMessage `json:"content,omitempty"`
	Icon    *string          `json:"icon,omitempty"`
	TagIDs  []uuid.UUID      `json:"tag_ids,omitempty"`
}

type MovePageRequest struct {
	ParentID *uuid.UUID `json:"parent_id"`
	Position int        `json:"position"`
}

type DuplicatePageRequest struct {
	Deep bool `json:"deep"`
}

type SearchResult struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
	Icon  *string   `json:"icon"`
}
