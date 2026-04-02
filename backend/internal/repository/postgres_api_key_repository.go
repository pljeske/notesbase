package repository

import (
	"context"
	"fmt"

	"notesbase/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresAPIKeyRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresAPIKeyRepository(pool *pgxpool.Pool) *PostgresAPIKeyRepository {
	return &PostgresAPIKeyRepository{pool: pool}
}

func (r *PostgresAPIKeyRepository) Create(ctx context.Context, key *model.APIKey, keyHash string) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, created_at`,
		key.UserID, key.Name, keyHash, key.KeyPrefix, key.Scopes,
	).Scan(&key.ID, &key.CreatedAt)
	if err != nil {
		return fmt.Errorf("insert api key: %w", err)
	}
	return nil
}

func (r *PostgresAPIKeyRepository) GetByHash(ctx context.Context, keyHash string) (*model.APIKey, error) {
	var k model.APIKey
	err := r.pool.QueryRow(ctx,
		`SELECT id, user_id, name, key_prefix, scopes, last_used_at, created_at
		 FROM api_keys WHERE key_hash = $1`, keyHash,
	).Scan(&k.ID, &k.UserID, &k.Name, &k.KeyPrefix, &k.Scopes, &k.LastUsedAt, &k.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query api key by hash: %w", err)
	}
	return &k, nil
}

func (r *PostgresAPIKeyRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]model.APIKey, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, name, key_prefix, scopes, last_used_at, created_at
		 FROM api_keys WHERE user_id = $1 ORDER BY created_at ASC`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list api keys: %w", err)
	}
	defer rows.Close()

	var keys []model.APIKey
	for rows.Next() {
		var k model.APIKey
		if err := rows.Scan(&k.ID, &k.Name, &k.KeyPrefix, &k.Scopes, &k.LastUsedAt, &k.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan api key: %w", err)
		}
		keys = append(keys, k)
	}
	if keys == nil {
		keys = []model.APIKey{}
	}
	return keys, nil
}

func (r *PostgresAPIKeyRepository) Delete(ctx context.Context, userID uuid.UUID, keyID uuid.UUID) error {
	tag, err := r.pool.Exec(ctx,
		`DELETE FROM api_keys WHERE id = $1 AND user_id = $2`, keyID, userID,
	)
	if err != nil {
		return fmt.Errorf("delete api key: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("api key not found")
	}
	return nil
}

func (r *PostgresAPIKeyRepository) TouchLastUsed(ctx context.Context, keyID uuid.UUID) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, keyID,
	)
	return err
}
