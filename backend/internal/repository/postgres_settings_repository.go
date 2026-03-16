package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresSettingsRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresSettingsRepository(pool *pgxpool.Pool) *PostgresSettingsRepository {
	return &PostgresSettingsRepository{pool: pool}
}

func (r *PostgresSettingsRepository) Get(ctx context.Context, key string) (string, bool, error) {
	var value string
	err := r.pool.QueryRow(ctx,
		`SELECT value FROM app_settings WHERE key = $1`, key).
		Scan(&value)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", false, nil
		}
		return "", false, fmt.Errorf("get setting %q: %w", key, err)
	}
	return value, true, nil
}

func (r *PostgresSettingsRepository) Set(ctx context.Context, key, value string) error {
	_, err := r.pool.Exec(ctx,
		`INSERT INTO app_settings (key, value, updated_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
		key, value)
	if err != nil {
		return fmt.Errorf("set setting %q: %w", key, err)
	}
	return nil
}
