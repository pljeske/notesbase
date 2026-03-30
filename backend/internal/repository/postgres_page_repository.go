package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"notesbase/backend/internal/model"

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
		`SELECT id, parent_id, title, icon, icon_color, is_encrypted, position, created_at, updated_at
		 FROM pages WHERE user_id = $1 AND deleted_at IS NULL ORDER BY position ASC`, userID)
	if err != nil {
		return nil, fmt.Errorf("query pages: %w", err)
	}
	defer rows.Close()

	var pages []model.Page
	for rows.Next() {
		var p model.Page
		if err := rows.Scan(&p.ID, &p.ParentID, &p.Title, &p.Icon, &p.IconColor, &p.IsEncrypted, &p.Position, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan page: %w", err)
		}
		pages = append(pages, p)
	}
	return pages, rows.Err()
}

func (r *PostgresPageRepository) GetByID(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.Page, error) {
	var p model.Page
	err := r.pool.QueryRow(ctx,
		`SELECT id, parent_id, title, content, icon, icon_color, is_encrypted, position, created_at, updated_at
		 FROM pages WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, id, userID).
		Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.IconColor, &p.IsEncrypted, &p.Position, &p.CreatedAt, &p.UpdatedAt)
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
		 VALUES ($1, $2, $3, (SELECT COALESCE(MAX(position), -1) + 1 FROM pages WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND deleted_at IS NULL))
		 RETURNING id, parent_id, title, content, icon, icon_color, is_encrypted, position, created_at, updated_at`,
		userID, req.ParentID, title).
		Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.IconColor, &p.IsEncrypted, &p.Position, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert page: %w", err)
	}
	return &p, nil
}

func (r *PostgresPageRepository) CreateWithID(ctx context.Context, userID uuid.UUID, id uuid.UUID, parentID *uuid.UUID, title string, content []byte, icon *string, iconColor *string) (*model.Page, error) {
	if title == "" {
		title = "Untitled"
	}
	var p model.Page
	err := r.pool.QueryRow(ctx,
		`INSERT INTO pages (id, user_id, parent_id, title, content, icon, icon_color, position)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, (SELECT COALESCE(MAX(position), -1) + 1 FROM pages WHERE user_id = $2 AND parent_id IS NOT DISTINCT FROM $3 AND deleted_at IS NULL))
		 RETURNING id, parent_id, title, content, icon, icon_color, is_encrypted, position, created_at, updated_at`,
		id, userID, parentID, title, content, icon, iconColor).
		Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.IconColor, &p.IsEncrypted, &p.Position, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert page with id: %w", err)
	}
	return &p, nil
}

func (r *PostgresPageRepository) Update(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.UpdatePageRequest) (*model.Page, error) {
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
	if req.IconColor != nil {
		setClauses += fmt.Sprintf("icon_color = $%d, ", argIdx)
		args = append(args, *req.IconColor)
		argIdx++
	}
	if req.IsEncrypted != nil {
		setClauses += fmt.Sprintf("is_encrypted = $%d, ", argIdx)
		args = append(args, *req.IsEncrypted)
		argIdx++
	}

	if setClauses == "" {
		return r.GetByID(ctx, userID, id)
	}

	setClauses = setClauses[:len(setClauses)-2]

	query := fmt.Sprintf(
		`UPDATE pages SET %s WHERE id = $%d AND user_id = $%d AND deleted_at IS NULL
		 RETURNING id, parent_id, title, content, icon, icon_color, is_encrypted, position, created_at, updated_at`,
		setClauses, argIdx, argIdx+1)
	args = append(args, id, userID)

	var p model.Page
	err := r.pool.QueryRow(ctx, query, args...).
		Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.IconColor, &p.IsEncrypted, &p.Position, &p.CreatedAt, &p.UpdatedAt)
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

func (r *PostgresPageRepository) SoftDelete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`WITH RECURSIVE subtree AS (
			SELECT id FROM pages WHERE id = $1 AND user_id = $2
			UNION ALL
			SELECT p.id FROM pages p JOIN subtree s ON p.parent_id = s.id
		)
		UPDATE pages SET deleted_at = NOW()
		WHERE id IN (SELECT id FROM subtree) AND deleted_at IS NULL`,
		id, userID)
	if err != nil {
		return fmt.Errorf("soft delete page: %w", err)
	}
	return nil
}

func (r *PostgresPageRepository) ListTrashed(ctx context.Context, userID uuid.UUID) ([]model.TrashedPage, error) {
	// Auto-purge pages older than 30 days in a background goroutine to avoid blocking the response.
	go func() {
		if _, err := r.PurgeExpired(context.Background(), userID, time.Now().AddDate(0, 0, -30)); err != nil {
			log.Printf("auto-purge trash failed for user %s: %v", userID, err)
		}
	}()

	rows, err := r.pool.Query(ctx,
		`SELECT id, title, icon, icon_color, deleted_at
		 FROM pages WHERE user_id = $1 AND deleted_at IS NOT NULL
		 ORDER BY deleted_at DESC`, userID)
	if err != nil {
		return nil, fmt.Errorf("list trashed: %w", err)
	}
	defer rows.Close()

	var pages []model.TrashedPage
	for rows.Next() {
		var p model.TrashedPage
		if err := rows.Scan(&p.ID, &p.Title, &p.Icon, &p.IconColor, &p.DeletedAt); err != nil {
			return nil, fmt.Errorf("scan trashed page: %w", err)
		}
		pages = append(pages, p)
	}
	return pages, rows.Err()
}

func (r *PostgresPageRepository) Restore(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Check if the page's parent is also deleted; if so, re-parent to root
	_, err = tx.Exec(ctx,
		`UPDATE pages SET
			deleted_at = NULL,
			parent_id = CASE
				WHEN parent_id IS NOT NULL AND EXISTS (
					SELECT 1 FROM pages p2 WHERE p2.id = pages.parent_id AND p2.deleted_at IS NOT NULL
				) THEN NULL
				ELSE parent_id
			END
		WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL`,
		id, userID)
	if err != nil {
		return fmt.Errorf("restore page: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *PostgresPageRepository) HardDelete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM pages WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL`,
		id, userID)
	if err != nil {
		return fmt.Errorf("hard delete page: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("page not found in trash")
	}
	return nil
}

func (r *PostgresPageRepository) PurgeExpired(ctx context.Context, userID uuid.UUID, before time.Time) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx,
		`DELETE FROM pages WHERE user_id = $1 AND deleted_at IS NOT NULL AND deleted_at < $2 RETURNING id`,
		userID, before)
	if err != nil {
		return nil, fmt.Errorf("purge expired: %w", err)
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan purged id: %w", err)
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *PostgresPageRepository) GetDescendants(ctx context.Context, userID uuid.UUID, id uuid.UUID) ([]model.Page, error) {
	rows, err := r.pool.Query(ctx,
		`WITH RECURSIVE subtree AS (
			SELECT id, parent_id, title, content, icon, icon_color, is_encrypted, position, created_at, updated_at, 0 AS depth
			FROM pages WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
			UNION ALL
			SELECT p.id, p.parent_id, p.title, p.content, p.icon, p.icon_color, p.is_encrypted, p.position, p.created_at, p.updated_at, s.depth + 1
			FROM pages p JOIN subtree s ON p.parent_id = s.id
			WHERE p.deleted_at IS NULL
		)
		SELECT id, parent_id, title, content, icon, icon_color, is_encrypted, position, created_at, updated_at
		FROM subtree ORDER BY depth ASC, position ASC`,
		id, userID)
	if err != nil {
		return nil, fmt.Errorf("get descendants: %w", err)
	}
	defer rows.Close()

	var pages []model.Page
	for rows.Next() {
		var p model.Page
		if err := rows.Scan(&p.ID, &p.ParentID, &p.Title, &p.Content, &p.Icon, &p.IconColor, &p.IsEncrypted, &p.Position, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan descendant: %w", err)
		}
		pages = append(pages, p)
	}
	return pages, rows.Err()
}

func (r *PostgresPageRepository) Move(ctx context.Context, userID uuid.UUID, id uuid.UUID, req model.MovePageRequest) error {
	// Prevent circular parent references: reject if the target parent is a descendant of this page.
	if req.ParentID != nil {
		var isDescendant bool
		err := r.pool.QueryRow(ctx,
			`WITH RECURSIVE subtree AS (
				SELECT id FROM pages WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
				UNION ALL
				SELECT p.id FROM pages p JOIN subtree s ON p.parent_id = s.id WHERE p.deleted_at IS NULL
			)
			SELECT EXISTS(SELECT 1 FROM subtree WHERE id = $3)`,
			id, userID, *req.ParentID).Scan(&isDescendant)
		if err != nil {
			return fmt.Errorf("check circular parent: %w", err)
		}
		if isDescendant {
			return fmt.Errorf("cannot move a page under one of its own descendants")
		}
	}

	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Fetch the page's current position and parent so we can shift siblings correctly.
	var currentPos int
	var currentParentID *uuid.UUID
	err = tx.QueryRow(ctx,
		`SELECT position, parent_id FROM pages WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
		id, userID).Scan(&currentPos, &currentParentID)
	if err != nil {
		return fmt.Errorf("get current state: %w", err)
	}

	// For same-parent reorders, shift the siblings between old and new position to
	// keep positions unique before we place the moved page. Without this, the
	// resequence step would break ties by updated_at and land the page in the
	// wrong slot.
	isSameParent := (currentParentID == nil && req.ParentID == nil) ||
		(currentParentID != nil && req.ParentID != nil && *currentParentID == *req.ParentID)
	if isSameParent && req.Position != currentPos {
		if req.Position < currentPos {
			// Moving up: push items in [new_pos, old_pos) one step down.
			_, err = tx.Exec(ctx,
				`UPDATE pages SET position = position + 1
				 WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2
				   AND deleted_at IS NULL AND id != $3
				   AND position >= $4 AND position < $5`,
				userID, req.ParentID, id, req.Position, currentPos)
		} else {
			// Moving down: pull items in (old_pos, new_pos] one step up.
			_, err = tx.Exec(ctx,
				`UPDATE pages SET position = position - 1
				 WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2
				   AND deleted_at IS NULL AND id != $3
				   AND position > $4 AND position <= $5`,
				userID, req.ParentID, id, currentPos, req.Position)
		}
		if err != nil {
			return fmt.Errorf("shift siblings: %w", err)
		}
	}

	tag, err := tx.Exec(ctx,
		`UPDATE pages SET parent_id = $1, position = $2 WHERE id = $3 AND user_id = $4 AND deleted_at IS NULL`,
		req.ParentID, req.Position, id, userID)
	if err != nil {
		return fmt.Errorf("move page: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("page not found")
	}

	_, err = tx.Exec(ctx,
		`WITH ranked AS (
			SELECT id, ROW_NUMBER() OVER (ORDER BY position, updated_at) - 1 AS new_pos
			FROM pages
			WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND deleted_at IS NULL
		)
		UPDATE pages SET position = ranked.new_pos
		FROM ranked WHERE pages.id = ranked.id`,
		userID, req.ParentID)
	if err != nil {
		return fmt.Errorf("resequence siblings: %w", err)
	}

	return tx.Commit(ctx)
}

func (r *PostgresPageRepository) Search(ctx context.Context, userID uuid.UUID, query string) ([]model.SearchResult, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, title, icon, icon_color
		 FROM pages
		 WHERE user_id = $1
		   AND deleted_at IS NULL
		   AND is_encrypted = FALSE
		   AND (
		     title ILIKE '%' || $2 || '%'
		     OR (
		       length($2) >= 3
		       AND jsonb_to_tsvector('english', content, '["string"]') @@ plainto_tsquery('english', $2)
		     )
		   )
		 ORDER BY
		   CASE WHEN title ILIKE '%' || $2 || '%' THEN 0 ELSE 1 END,
		   updated_at DESC
		 LIMIT 50`,
		userID, query)
	if err != nil {
		return nil, fmt.Errorf("search pages: %w", err)
	}
	defer rows.Close()

	var results []model.SearchResult
	for rows.Next() {
		var sr model.SearchResult
		if err := rows.Scan(&sr.ID, &sr.Title, &sr.Icon, &sr.IconColor); err != nil {
			return nil, fmt.Errorf("scan search result: %w", err)
		}
		results = append(results, sr)
	}
	if results == nil {
		results = []model.SearchResult{}
	}
	return results, rows.Err()
}

func (r *PostgresPageRepository) IsTrashed(ctx context.Context, userID uuid.UUID, id uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM pages WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL)`,
		id, userID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check trashed: %w", err)
	}
	return exists, nil
}
