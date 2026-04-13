# CLAUDE.md

## MCP: code-review-graph (USE FIRST)

**Always query the knowledge graph before Grep/Glob/Read.**

| Task          | Tool                                             |
|---------------|--------------------------------------------------|
| Explore code  | `semantic_search_nodes` or `query_graph`         |
| Trace impact  | `get_impact_radius` / `get_affected_flows`       |
| Code review   | `detect_changes` + `get_review_context`          |
| Callers/tests | `query_graph` with `callers_of` / `tests_for`    |
| Architecture  | `get_architecture_overview` + `list_communities` |

Graph auto-updates on file changes. Fall back to file tools only when the graph doesn't cover what you need.

---

## Project Overview

**Notesbase** — self-hosted notes app. Go backend + React/TypeScript frontend. Hierarchical pages (TipTap JSONB), tags,
S3/MinIO file uploads, multi-user with admin roles.

See [`docs/architecture.md`](docs/architecture.md) for full stack details.

---

## Commands

```bash
# Backend
cd backend && go run ./cmd/server/...   # run
cd backend && go test ./...             # test
cd backend && golangci-lint run         # lint (install via go install, not pre-built binary)

# Frontend
cd frontend && npm install && npm run dev   # dev server (proxies /api → :8080)
cd frontend && npm run build               # production build
cd frontend && npm run lint

# Full stack
docker compose up --build
```

See [`docs/runbook.md`](docs/runbook.md) for env vars and deployment details.

---

## Architecture

```
HTTP Request → Handler → Service → Repository → PostgreSQL
```

- `backend/internal/handler/` — Gin HTTP handlers
- `backend/internal/service/` — business logic
- `backend/internal/repository/` — pgx queries (`postgres_*` prefix)
- `backend/internal/model/` — shared structs
- `backend/migrations/` — auto-applied on startup via `golang-migrate`

Frontend: React + Zustand stores, TipTap editor, `frontend/src/api/client.ts` handles 401 → token refresh → retry.

See [`docs/architecture.md`](docs/architecture.md) for domain concepts and key files.

---

## Critical Constraints

- **Migrations run automatically** on server startup — no separate step needed.
- **First registered user** becomes admin; subsequent users are `role=user`.
- **Repositories scope all queries by `user_id`** — omitting it is an IDOR.
- **Auth endpoints** (`/login`, `/register`, `/refresh`) must pass `skipRefresh: true` in the fetch client or
  wrong-password 401s surface as "Session expired".
- **TipTap packages** (`@tiptap/*`) must be updated as a group — never split across PRs.
- **`GITHUB_TOKEN`** cannot trigger other workflows — keep Docker builds in the same `release.yml`.

See [`docs/gotchas.md`](docs/gotchas.md) for the full list of edge cases and lessons learned.

---

## Bot Protection (registration endpoint)

Three layers on `POST /api/auth/register` — no external services:

1. **Honeypot** — `RegisterRequest.Website` must be empty (hidden `<input>` off-screen).
2. **Form timing token** — `GET /api/config` returns a signed `form_token`; backend enforces 3 s min / 1 h max age.
3. **Rate limit** — ~3 req/min (burst 2) per IP via `middleware.RateLimit`.

Apply the same `registerLimiter` to any new resource-creation public endpoint.

---

## Path-Scoped Rules

| Scope                              | File                                                     |
|------------------------------------|----------------------------------------------------------|
| `frontend/**`                      | [`.claude/rules/frontend.md`](.claude/rules/frontend.md) |
| `backend/**`                       | [`.claude/rules/backend.md`](.claude/rules/backend.md)   |
| `.github/**, helm/**, Dockerfile*` | [`.claude/rules/ci-cd.md`](.claude/rules/ci-cd.md)       |
