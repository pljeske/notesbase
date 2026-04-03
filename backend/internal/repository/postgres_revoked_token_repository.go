package repository

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRevokedTokenRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresRevokedTokenRepository(pool *pgxpool.Pool) *PostgresRevokedTokenRepository {
	return &PostgresRevokedTokenRepository{pool: pool}
}

func (r *PostgresRevokedTokenRepository) Revoke(ctx context.Context, jti string, expiresAt time.Time) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		jti, expiresAt,
	)
	if err != nil {
		return fmt.Errorf("revoke token: %w", err)
	}
	return nil
}

func (r *PostgresRevokedTokenRepository) IsRevoked(ctx context.Context, jti string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM revoked_tokens WHERE jti = $1 AND expires_at > NOW())`,
		jti,
	).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check revoked token: %w", err)
	}
	return exists, nil
}

func (r *PostgresRevokedTokenRepository) DeleteExpired(ctx context.Context) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM revoked_tokens WHERE expires_at <= NOW()`)
	return err
}

// StartCleanup runs a background goroutine that periodically removes expired tokens.
func (r *PostgresRevokedTokenRepository) StartCleanup(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(15 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := r.DeleteExpired(context.Background()); err != nil {
					log.Printf("Warning: revoked token cleanup failed: %v", err)
				}
			case <-ctx.Done():
				return
			}
		}
	}()
}
