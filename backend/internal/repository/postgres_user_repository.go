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

type PostgresUserRepository struct {
	pool *pgxpool.Pool
}

func NewPostgresUserRepository(pool *pgxpool.Pool) *PostgresUserRepository {
	return &PostgresUserRepository{pool: pool}
}

func (r *PostgresUserRepository) Create(ctx context.Context, user *model.User) error {
	err := r.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, name, role, encryption_salt)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, created_at, updated_at`,
		user.Email, user.PasswordHash, user.Name, user.Role, user.EncryptionSalt).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

func (r *PostgresUserRepository) GetByEmail(ctx context.Context, email string) (*model.User, error) {
	var u model.User
	var disabledAt *time.Time
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, role, encryption_salt, disabled_at, created_at, updated_at
		 FROM users WHERE email = $1`, email).
		Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.EncryptionSalt, &disabledAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query user by email: %w", err)
	}
	u.DisabledAt = disabledAt
	return &u, nil
}

func (r *PostgresUserRepository) GetByID(ctx context.Context, id uuid.UUID) (*model.User, error) {
	var u model.User
	var disabledAt *time.Time
	err := r.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, role, encryption_salt, disabled_at, created_at, updated_at
		 FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Role, &u.EncryptionSalt, &disabledAt, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query user by id: %w", err)
	}
	u.DisabledAt = disabledAt
	return &u, nil
}

func (r *PostgresUserRepository) Count(ctx context.Context) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count users: %w", err)
	}
	return count, nil
}

func (r *PostgresUserRepository) ListAll(ctx context.Context) ([]*model.User, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, email, name, role, disabled_at, created_at
		 FROM users ORDER BY created_at ASC`)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		var u model.User
		var disabledAt *time.Time
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &disabledAt, &u.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		u.DisabledAt = disabledAt
		users = append(users, &u)
	}
	return users, nil
}

func (r *PostgresUserRepository) UpdateRole(ctx context.Context, id uuid.UUID, role string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
		role, id)
	if err != nil {
		return fmt.Errorf("update user role: %w", err)
	}
	return nil
}

// UpdateRoleChecked atomically updates the role, but prevents demoting the last admin.
// When role is "user", the UPDATE only executes if there are currently ≥2 admins.
// Returns false (without error) when blocked by the last-admin check.
// Uses a serializable transaction with FOR UPDATE to prevent the last-admin race condition.
func (r *PostgresUserRepository) UpdateRoleChecked(ctx context.Context, id uuid.UUID, role string) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`); err != nil {
		return false, fmt.Errorf("set isolation level: %w", err)
	}

	if role == "user" {
		var adminCount int
		if err := tx.QueryRow(ctx,
			`SELECT COUNT(*) FROM users WHERE role = 'admin' FOR UPDATE`,
		).Scan(&adminCount); err != nil {
			return false, fmt.Errorf("count admins: %w", err)
		}
		if adminCount <= 1 {
			return false, nil
		}
	}

	result, err := tx.Exec(ctx,
		`UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2`,
		role, id)
	if err != nil {
		return false, fmt.Errorf("update user role: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return false, fmt.Errorf("commit transaction: %w", err)
	}
	return result.RowsAffected() == 1, nil
}

func (r *PostgresUserRepository) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
		passwordHash, id)
	if err != nil {
		return fmt.Errorf("update user password: %w", err)
	}
	return nil
}

func (r *PostgresUserRepository) SetDisabled(ctx context.Context, id uuid.UUID, disabled bool) error {
	var query string
	if disabled {
		query = `UPDATE users SET disabled_at = NOW(), updated_at = NOW() WHERE id = $1`
	} else {
		query = `UPDATE users SET disabled_at = NULL, updated_at = NOW() WHERE id = $1`
	}
	_, err := r.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("set user disabled: %w", err)
	}
	return nil
}
