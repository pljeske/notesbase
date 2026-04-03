package repository

import (
	"context"
	"time"
)

type RevokedTokenRepository interface {
	Revoke(ctx context.Context, jti string, expiresAt time.Time) error
	IsRevoked(ctx context.Context, jti string) (bool, error)
	DeleteExpired(ctx context.Context) error
}
