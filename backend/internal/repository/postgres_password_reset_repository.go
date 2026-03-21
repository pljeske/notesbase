package repository

import (
	"context"
	"fmt"
	"time"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresPasswordResetRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresPasswordResetRepository(pool *pgxpool.Pool) *PostgresPasswordResetRepository {
	return &PostgresPasswordResetRepository{pool: pool}
}

func (r *PostgresPasswordResetRepository) Create(ctx context.Context, userID uuid.UUID, tokenHash string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)`,
		userID, tokenHash, expiresAt)
	if err != nil {
		return fmt.Errorf("insert password reset token: %w", err)
	}
	return nil
}

func (r *PostgresPasswordResetRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*model.PasswordResetToken, error) {
	var t model.PasswordResetToken
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, token_hash, expires_at, created_at
		 FROM password_reset_tokens WHERE token_hash = $1`, tokenHash).
		Scan(&t.ID, &t.UserID, &t.TokenHash, &t.ExpiresAt, &t.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query password reset token: %w", err)
	}
	return &t, nil
}

func (r *PostgresPasswordResetRepository) DeleteByUserID(ctx context.Context, userID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM password_reset_tokens WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete password reset tokens for user: %w", err)
	}
	return nil
}

func (r *PostgresPasswordResetRepository) DeleteByTokenHash(ctx context.Context, tokenHash string) error {
	result, err := r.pool.Exec(ctx,
		`DELETE FROM password_reset_tokens WHERE token_hash = $1`, tokenHash)
	if err != nil {
		return fmt.Errorf("delete password reset token: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("token not found")
	}
	return nil
}
