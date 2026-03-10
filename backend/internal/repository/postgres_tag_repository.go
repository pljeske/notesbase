package repository

import (
	"context"
	"fmt"

	"notes-app/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresTagRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresTagRepository(pool *pgxpool.Pool) *PostgresTagRepository {
	return &PostgresTagRepository{pool: pool}
}

func (r *PostgresTagRepository) Create(ctx context.Context, userID uuid.UUID, req model.CreateTagRequest) (*model.Tag, error) {
	color := req.Color
	if color == "" {
		color = "#6B7280"
	}
	var t model.Tag
	err := r.pool.QueryRow(ctx,
		`INSERT INTO tags (user_id, name, color) VALUES ($1, $2, $3)
		 RETURNING id, user_id, name, color, created_at`,
		userID, req.Name, color).
		Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert tag: %w", err)
	}
	return &t, nil
}

func (r *PostgresTagRepository) GetAll(ctx context.Context, userID uuid.UUID) ([]model.Tag, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, name, color, created_at FROM tags WHERE user_id = $1 ORDER BY name ASC`,
		userID)
	if err != nil {
		return nil, fmt.Errorf("query tags: %w", err)
	}
	defer rows.Close()

	var tags []model.Tag
	for rows.Next() {
		var t model.Tag
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

func (r *PostgresTagRepository) GetByID(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.Tag, error) {
	var t model.Tag
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, name, color, created_at FROM tags WHERE id = $1 AND user_id = $2`,
		id, userID).
		Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query tag: %w", err)
	}
	return &t, nil
}

func (r *PostgresTagRepository) Update(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.UpdateTagRequest) (*model.Tag, error) {
	setClauses := ""
	args := []interface{}{}
	argIdx := 1

	if req.Name != nil {
		setClauses += fmt.Sprintf("name = $%d, ", argIdx)
		args = append(args, *req.Name)
		argIdx++
	}
	if req.Color != nil {
		setClauses += fmt.Sprintf("color = $%d, ", argIdx)
		args = append(args, *req.Color)
		argIdx++
	}

	if setClauses == "" {
		return r.GetByID(ctx, userID, id)
	}
	setClauses = setClauses[:len(setClauses)-2]

	query := fmt.Sprintf(
		`UPDATE tags SET %s WHERE id = $%d AND user_id = $%d
		 RETURNING id, user_id, name, color, created_at`,
		setClauses, argIdx, argIdx+1)
	args = append(args, id, userID)

	var t model.Tag
	err := r.pool.QueryRow(ctx, query, args...).
		Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("update tag: %w", err)
	}
	return &t, nil
}

func (r *PostgresTagRepository) Delete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM tags WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete tag: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("tag not found")
	}
	return nil
}

func (r *PostgresTagRepository) GetByPageID(ctx context.Context, pageID uuid.UUID) ([]model.Tag, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT t.id, t.user_id, t.name, t.color, t.created_at
		 FROM tags t JOIN page_tags pt ON t.id = pt.tag_id
		 WHERE pt.page_id = $1 ORDER BY t.name ASC`,
		pageID)
	if err != nil {
		return nil, fmt.Errorf("query tags by page: %w", err)
	}
	defer rows.Close()

	var tags []model.Tag
	for rows.Next() {
		var t model.Tag
		if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

// GetAllPageTags loads all page→tag associations for a user in one query.
func (r *PostgresTagRepository) GetAllPageTags(ctx context.Context, userID uuid.UUID) (map[uuid.UUID][]model.Tag, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT pt.page_id, t.id, t.user_id, t.name, t.color, t.created_at
		 FROM page_tags pt JOIN tags t ON t.id = pt.tag_id
		 WHERE t.user_id = $1`,
		userID)
	if err != nil {
		return nil, fmt.Errorf("query all page tags: %w", err)
	}
	defer rows.Close()

	result := make(map[uuid.UUID][]model.Tag)
	for rows.Next() {
		var pageID uuid.UUID
		var t model.Tag
		if err := rows.Scan(&pageID, &t.ID, &t.UserID, &t.Name, &t.Color, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan page tag: %w", err)
		}
		result[pageID] = append(result[pageID], t)
	}
	return result, rows.Err()
}

func (r *PostgresTagRepository) SetPageTags(ctx context.Context, pageID uuid.UUID, tagIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, `DELETE FROM page_tags WHERE page_id = $1`, pageID)
	if err != nil {
		return fmt.Errorf("delete page tags: %w", err)
	}

	for _, tagID := range tagIDs {
		_, err = tx.Exec(ctx,
			`INSERT INTO page_tags (page_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			pageID, tagID)
		if err != nil {
			return fmt.Errorf("insert page tag: %w", err)
		}
	}

	return tx.Commit(ctx)
}

func (r *PostgresTagRepository) GetPagesByTag(ctx context.Context, userID uuid.UUID, tagID uuid.UUID) ([]model.Page, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT p.id, p.parent_id, p.title, p.icon, p.position, p.created_at, p.updated_at
		 FROM pages p JOIN page_tags pt ON p.id = pt.page_id
		 WHERE p.user_id = $1 AND pt.tag_id = $2 AND p.deleted_at IS NULL
		 ORDER BY p.updated_at DESC`,
		userID, tagID)
	if err != nil {
		return nil, fmt.Errorf("query pages by tag: %w", err)
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
