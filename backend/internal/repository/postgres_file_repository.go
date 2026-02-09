package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"notes-app/backend/internal/model"
)

type PostgresFileRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresFileRepository(pool *pgxpool.Pool) *PostgresFileRepository {
	return &PostgresFileRepository{pool: pool}
}

func (r *PostgresFileRepository) Create(ctx context.Context, file *model.File) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO files (page_id, filename, content_type, size, s3_key)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, created_at`,
		file.PageID, file.Filename, file.ContentType, file.Size, file.S3Key,
	).Scan(&file.ID, &file.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert file: %w", err)
	}
	return nil
}

func (r *PostgresFileRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.File, error) {
	var f model.File
	err := r.pool.QueryRow(ctx,
		`SELECT id, page_id, filename, content_type, size, s3_key, created_at
		 FROM files WHERE id = $1`, id,
	).Scan(&f.ID, &f.PageID, &f.Filename, &f.ContentType, &f.Size, &f.S3Key, &f.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query file: %w", err)
	}
	return &f, nil
}

func (r *PostgresFileRepository) Delete(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, `DELETE FROM files WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete file: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("file not found")
	}
	return nil
}
