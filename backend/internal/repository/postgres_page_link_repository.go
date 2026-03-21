package repository

import (
	"context"
	"fmt"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresPageLinkRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresPageLinkRepository(pool *pgxpool.Pool) *PostgresPageLinkRepository {
	return &PostgresPageLinkRepository{pool: pool}
}

// ReplaceLinks deletes all existing links from source and inserts new ones.
// Only inserts links to target pages that actually exist and are not deleted.
func (r *PostgresPageLinkRepository) ReplaceLinks(ctx context.Context, sourceID uuid.UUID, targetIDs []uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM page_links WHERE source_page_id = $1`, sourceID)
	if err != nil {
		return fmt.Errorf("delete page links: %w", err)
	}
	if len(targetIDs) == 0 {
		return nil
	}
	_, err = r.pool.Exec(ctx,
		`INSERT INTO page_links (source_page_id, target_page_id)
         SELECT $1, id FROM pages WHERE id = ANY($2::uuid[]) AND deleted_at IS NULL
         ON CONFLICT DO NOTHING`,
		sourceID, targetIDs)
	if err != nil {
		return fmt.Errorf("insert page links: %w", err)
	}
	return nil
}

// GetBacklinks returns all non-deleted pages owned by userID that link to targetID.
func (r *PostgresPageLinkRepository) GetBacklinks(ctx context.Context, userID uuid.UUID, targetID uuid.UUID) ([]model.SearchResult, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT p.id, p.title, p.icon, p.icon_color
         FROM page_links pl
         JOIN pages p ON pl.source_page_id = p.id
         WHERE pl.target_page_id = $1
           AND p.user_id = $2
           AND p.deleted_at IS NULL
         ORDER BY p.updated_at DESC`,
		targetID, userID)
	if err != nil {
		return nil, fmt.Errorf("get backlinks: %w", err)
	}
	defer rows.Close()
	var results []model.SearchResult
	for rows.Next() {
		var res model.SearchResult
		if err := rows.Scan(&res.ID, &res.Title, &res.Icon, &res.IconColor); err != nil {
			return nil, fmt.Errorf("scan backlink: %w", err)
		}
		results = append(results, res)
	}
	if results == nil {
		results = []model.SearchResult{}
	}
	return results, rows.Err()
}
