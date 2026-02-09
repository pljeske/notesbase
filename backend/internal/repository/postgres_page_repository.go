package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"notes-app/backend/internal/model"
)

type PostgresPageRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresPageRepository(pool *pgxpool.Pool) *PostgresPageRepository {
	return &PostgresPageRepository{pool: pool}
}

func (r *PostgresPageRepository) GetAll(ctx context.Context) ([]model.Page, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, parent_id, title, icon, position, created_at, updated_at
		 FROM pages ORDER BY position ASC`)
	if err != nil {
		return nil, fmt.Errorf("query pages: %w", err)
	}
	defer rows.Close()

	var pages []model.Page
	for rows.Next() {
		var p model.Page
		if err := rows.Scan(&p.ID, &p.ParentID, &p.Title, &p.Icon, &p.Position, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan page: %w", err)
		}
		pages = append(pages, p)
	}
	return pages, rows.Err()
}

func (r *PostgresPageRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.Page, error) {
	var p model.Page
	err := r.pool.QueryRow(ctx,
		`SELECT id, parent_id, title, content, icon, position, created_at, updated_at
		 FROM pages WHERE id = $1`, id).
		Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.Position, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query page: %w", err)
	}
	return &p, nil
}

func (r *PostgresPageRepository) Create(ctx context.Context, req model.CreatePageRequest) (*model.Page, error) {
	title := req.Title
	if title == "" {
		title = "Untitled"
	}

	var p model.Page
	err := r.pool.QueryRow(ctx,
		`INSERT INTO pages (parent_id, title, position)
		 VALUES ($1, $2, (SELECT COALESCE(MAX(position), -1) + 1 FROM pages WHERE parent_id IS NOT DISTINCT FROM $1))
		 RETURNING id, parent_id, title, content, icon, position, created_at, updated_at`,
		req.ParentID, title).
		Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.Position, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert page: %w", err)
	}
	return &p, nil
}

func (r *PostgresPageRepository) Update(ctx context.Context, id uuid.UUID, req model.UpdatePageRequest) (*model.Page, error) {
	// Build dynamic update
	setClauses := ""
	args := []interface{}{}
	argIdx := 1

	if req.Title != nil {
		setClauses += fmt.Sprintf("title = $%d, ", argIdx)
		args = append(args, *req.Title)
		argIdx++
	}
	if req.Content != nil {
		setClauses += fmt.Sprintf("content = $%d, ", argIdx)
		contentBytes, _ := json.Marshal(req.Content)
		args = append(args, contentBytes)
		argIdx++
	}
	if req.Icon != nil {
		setClauses += fmt.Sprintf("icon = $%d, ", argIdx)
		args = append(args, *req.Icon)
		argIdx++
	}

	if setClauses == "" {
		return r.GetByID(ctx, id)
	}

	// Remove trailing comma+space
	setClauses = setClauses[:len(setClauses)-2]

	query := fmt.Sprintf(
		`UPDATE pages SET %s WHERE id = $%d
		 RETURNING id, parent_id, title, content, icon, position, created_at, updated_at`,
		setClauses, argIdx)
	args = append(args, id)

	var p model.Page
	err := r.pool.QueryRow(ctx, query, args...).
		Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.Position, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("update page: %w", err)
	}
	return &p, nil
}

func (r *PostgresPageRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM pages WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete page: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("page not found")
	}
	return nil
}

func (r *PostgresPageRepository) Move(ctx context.Context, id uuid.UUID, req model.MovePageRequest) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Update the page's parent and position
	_, err = tx.Exec(ctx,
		`UPDATE pages SET parent_id = $1, position = $2 WHERE id = $3`,
		req.ParentID, req.Position, id)
	if err != nil {
		return fmt.Errorf("move page: %w", err)
	}

	// Re-sequence siblings in the target parent to avoid gaps/collisions
	_, err = tx.Exec(ctx,
		`WITH ranked AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY position, updated_at) - 1 AS new_pos
			FROM pages
			WHERE parent_id IS NOT DISTINCT FROM $1
		)
		UPDATE pages SET position = ranked.new_pos
		FROM ranked WHERE pages.id = ranked.id`,
		req.ParentID)
	if err != nil {
		return fmt.Errorf("resequence siblings: %w", err)
	}

	return tx.Commit(ctx)
}
