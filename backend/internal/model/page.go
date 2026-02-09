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
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

type PageTreeNode struct {
	ID        uuid.UUID      `json:"id"`
	ParentID  *uuid.UUID     `json:"parent_id"`
	Title     string         `json:"title"`
	Icon      *string        `json:"icon"`
	Position  int            `json:"position"`
	Children  []PageTreeNode `json:"children"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}

type CreatePageRequest struct {
	ParentID *uuid.UUID `json:"parent_id"`
	Title    string     `json:"title"`
}

type UpdatePageRequest struct {
	Title   *string          `json:"title,omitempty"`
	Content *json.RawMessage `json:"content,omitempty"`
	Icon    *string          `json:"icon,omitempty"`
}

type MovePageRequest struct {
	ParentID *uuid.UUID `json:"parent_id"`
	Position int        `json:"position"`
}
