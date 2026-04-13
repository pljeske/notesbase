# Architecture

## Backend: Layered Go Application

```
HTTP Request → Handler → Service → Repository → PostgreSQL
```

| Layer        | Path                           | Role                                                         |
|--------------|--------------------------------|--------------------------------------------------------------|
| Entry point  | `backend/cmd/server/main.go`   | Wires dependencies, starts server                            |
| Handlers     | `backend/internal/handler/`    | Gin HTTP, input validation, response marshalling             |
| Services     | `backend/internal/service/`    | Business logic (auth, page tree, tag ops)                    |
| Repositories | `backend/internal/repository/` | pgx queries; all implementations prefixed `postgres_*`       |
| Models       | `backend/internal/model/`      | Shared structs (request/response/DB in same file per domain) |
| Middleware   | `backend/internal/middleware/` | JWT auth, CORS, rate limiting, form token validation         |
| Migrations   | `backend/migrations/`          | Sequential SQL files via `golang-migrate`                    |

- Repositories use **interfaces**; services receive dependencies via **constructor injection**.
- Migrations run **automatically** on startup via `database.RunMigrations` in `main.go`.
- Go version: **1.25.6** (see `backend/go.mod`).

## Frontend: React + Zustand

| Path                               | Role                                                               |
|------------------------------------|--------------------------------------------------------------------|
| `frontend/src/App.tsx`             | Router with `AuthGuard`, `GuestGuard`, `AdminGuard`                |
| `frontend/src/api/client.ts`       | Base fetch wrapper; 401 → silent token refresh → retry             |
| `frontend/src/stores/`             | Zustand stores for auth, pages, tags (auth state in localStorage)  |
| `frontend/src/components/editor/`  | TipTap rich text editor (code blocks, images, syntax highlighting) |
| `frontend/src/components/sidebar/` | Page tree navigation                                               |

## Key Domain Concepts

- **Pages**: hierarchical via `parent_id`, user-isolated. Content stored as JSONB (TipTap format). Soft-deleted via
  `deleted_at`.
- **First registered user** becomes admin. Subsequent users are `role=user`.
- **Registration** can be disabled via `DISABLE_REGISTRATION` env var or the admin panel (`app_settings` table).
- **Files**: stored in MinIO/S3; only metadata (`s3_key`, `size`, `mime_type`) is in PostgreSQL. All queries scope by
  `user_id`.
- **JWT**: access token 15 min + refresh token 168 h. Frontend auto-refreshes on 401. Tokens revoked by JTI in
  `revoked_tokens` table.
- **Plugin API**: separate route group at `/api/v1/plugin/...` authenticated via API keys (`nbp_` prefix, SHA-256
  stored). Scoped per-route.
- **Page links / backlinks**: `page_links(source_page_id, target_page_id)` composite PK, updated on every content save
  by walking `pageMention` nodes.
- **FTS**: `jsonb_to_tsvector('english', content, '["string"]')` with GIN indexes (migration 000007). Only activated for
  `length(query) >= 3`.

## Bot Protection on Registration

Three layers on `POST /api/auth/register` — no external services:

1. **Honeypot** (`RegisterRequest.Website` must be empty)
2. **Form timing token** (`GET /api/config` → signed `<unix_ts>.<hmac>`, 3 s min / 1 h max age)
3. **Stricter rate limit** (~3 req/min burst 2 vs. login's ~10/min burst 5)
