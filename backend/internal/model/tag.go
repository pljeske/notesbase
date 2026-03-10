package model

import (
	"time"

	"github.com/google/uuid"
)

type Tag struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"-"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateTagRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type UpdateTagRequest struct {
	Name  *string `json:"name,omitempty"`
	Color *string `json:"color,omitempty"`
}
