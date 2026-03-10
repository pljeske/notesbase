package repository

import (
	"context"
	"encoding/json"
	"fmt"

	"notes-app/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresPageRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresPageRepository(pool *pgxpool.Pool) *PostgresPageRepository {
	return &PostgresPageRepository{pool: pool}
}

func (r *PostgresPageRepository) GetAll(ctx context.Context, userID uuid.UUID) ([]model.Page, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, parent_id, title, icon, position, created_at, updated_at
		 FROM pages WHERE user_id = $1 ORDER BY position ASC`, userID)
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

func (r *PostgresPageRepository) GetByID(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.Page, error) {
	var p model.Page
	err := r.pool.QueryRow(ctx,
		`SELECT id, parent_id, title, content, icon, position, created_at, updated_at
		 FROM pages WHERE id = $1 AND user_id = $2`, id, userID).
		Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.Position, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query page: %w", err)
	}
	return &p, nil
}

func (r *PostgresPageRepository) Create(ctx context.Context, userID uuid.UUID, req model.CreatePageRequest) (*model.Page, error) {
	title := req.Title
	if title == "" {
		title = "Untitled"
	}

	var p model.Page
	err := r.pool.QueryRow(ctx,
		`INSERT INTO pages (user_id, parent_id, title, position)
		 VALUES ($1, $2, $3, (SELECT COALESCE(MAX(position), -1) + 1 FROM pages WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2))
		 RETURNING id, parent_id, title, content, icon, position, created_at, updated_at`,
		userID, req.ParentID, title).
		Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.Position, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert page: %w", err)
	}
	return &p, nil
}

func (r *PostgresPageRepository) Update(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.UpdatePageRequest) (*model.Page, error) {
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
		return r.GetByID(ctx, userID, id)
	}

	// Remove trailing comma+space
	setClauses = setClauses[:len(setClauses)-2]

	query := fmt.Sprintf(
		`UPDATE pages SET %s WHERE id = $%d AND user_id = $%d
		 RETURNING id, parent_id, title, content, icon, position, created_at, updated_at`,
		setClauses, argIdx, argIdx+1)
	args = append(args, id, userID)

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

func (r *PostgresPageRepository) Delete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM pages WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete page: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("page not found")
	}
	return nil
}

func (r *PostgresPageRepository) Move(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.MovePageRequest) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Update the page's parent and position (only if owned by user)
	tag, err := tx.Exec(ctx,
		`UPDATE pages SET parent_id = $1, position = $2 WHERE id = $3 AND user_id = $4`,
		req.ParentID, req.Position, id, userID)
	if err != nil {
		return fmt.Errorf("move page: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("page not found")
	}

	// Re-sequence siblings in the target parent to avoid gaps/collisions
	_, err = tx.Exec(ctx,
		`WITH ranked AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY position, updated_at) - 1 AS new_pos
			FROM pages
			WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2
		)
		UPDATE pages SET position = ranked.new_pos
		FROM ranked WHERE pages.id = ranked.id`,
		userID, req.ParentID)
	if err != nil {
		return fmt.Errorf("resequence siblings: %w", err)
	}

	return tx.Commit(ctx)
}
