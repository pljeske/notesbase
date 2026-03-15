package repository

import (
	"context"
	"fmt"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresFileRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresFileRepository(pool *pgxpool.Pool) *PostgresFileRepository {
	return &PostgresFileRepository{pool: pool}
}

func (r *PostgresFileRepository) Create(ctx context.Context, file *model.File) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO files (user_id, page_id, filename, content_type, size, s3_key)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, created_at`,
		file.UserID, file.PageID, file.Filename, file.ContentType, file.Size, file.S3Key,
	).Scan(&file.ID, &file.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert file: %w", err)
	}
	return nil
}

func (r *PostgresFileRepository) GetByID(ctx context.Context, userID uuid.UUID, id uuid.UUID) (*model.File, error) {
	var f model.File
	err := r.pool.QueryRow(ctx,
		`SELECT id, page_id, filename, content_type, size, s3_key, created_at
		 FROM files WHERE id = $1 AND user_id = $2`, id, userID,
	).Scan(&f.ID, &f.PageID, &f.Filename, &f.ContentType, &f.Size, &f.S3Key, &f.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query file: %w", err)
	}
	return &f, nil
}

func (r *PostgresFileRepository) GetByPageID(ctx context.Context, pageID uuid.UUID) ([]model.File, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, user_id, page_id, filename, content_type, size, s3_key, created_at
		 FROM files WHERE page_id = $1`, pageID,
	)
	if err != nil {
		return nil, fmt.Errorf("query files by page: %w", err)
	}
	defer rows.Close()

	var files []model.File
	for rows.Next() {
		var f model.File
		if err := rows.Scan(&f.ID, &f.UserID, &f.PageID, &f.Filename, &f.ContentType, &f.Size, &f.S3Key, &f.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan file: %w", err)
		}
		files = append(files, f)
	}
	return files, nil
}

func (r *PostgresFileRepository) Delete(ctx context.Context, userID uuid.UUID, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM files WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete file: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("file not found")
	}
	return nil
}
