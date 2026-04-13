# Runbook

## Prerequisites

```bash
cp .env.example .env   # first-time setup
```

## Commands

### Backend (Go)

```bash
cd backend && go run ./cmd/server/...                            # run
cd backend && go build -o bin/server ./cmd/server/...           # build
cd backend && go test ./...                                      # all tests
cd backend && go test ./internal/service/... -run TestFoo       # single test
cd backend && go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest && golangci-lint run
```

> Use `go install` for golangci-lint — pre-built binaries fail if `go.mod` targets a newer Go.

### Frontend (Node/Vite)

```bash
cd frontend && npm install          # install deps
cd frontend && npm run dev          # dev server (proxies /api → :8080)
cd frontend && npm run build        # production build
cd frontend && npm run lint
cd frontend && npm run preview      # preview production build
```

### Full Stack (Docker)

```bash
docker compose up            # start all services (PostgreSQL, MinIO, backend, frontend)
docker compose up -d         # background
docker compose up --build    # rebuild after code changes
```

## Environment Variables

| Variable               | Description                                      |
|------------------------|--------------------------------------------------|
| `DATABASE_URL`         | PostgreSQL connection string                     |
| `JWT_SECRET`           | Must be changed in production                    |
| `MINIO_ENDPOINT`       | MinIO/S3 endpoint                                |
| `MINIO_ACCESS_KEY`     | MinIO access key                                 |
| `MINIO_SECRET_KEY`     | MinIO secret key                                 |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins                  |
| `DISABLE_REGISTRATION` | Set `true` to prevent new signups                |
| `SMTP_HOST`            | SMTP server; leave empty to log emails to stdout |
| `APP_URL`              | Public frontend URL (used in reset email links)  |

## Deployment

### Helm

```bash
helm upgrade --install notesbase helm/notesbase -f values.yaml
```

Chart uses `groundhog2k/postgres` (not Bitnami) and official `minio` from `charts.min.io`. See [
`.claude/rules/ci-cd.md`](../.claude/rules/ci-cd.md) for subchart gotchas.

### Container (OpenShift / non-root)

Images must: `USER <uid>:0`, `chown -R <uid>:0` on runtime paths, `chmod g+rwX` on writable dirs.

Frontend Caddy image requires:

1. Strip file capability in `Dockerfile.frontend`:
   `RUN apk add --no-cache libcap && setcap -r /usr/bin/caddy && apk del libcap`
2. Mount `emptyDir` volumes over `/data` and `/config` when `readOnlyRootFilesystem: true`.

### CI/CD (GitHub Actions)

- Semantic release: `go-semantic-release@v1`
- Docker multi-platform (`linux/amd64,linux/arm64`): use `type=registry` build cache in GHCR (not `type=gha`)
- `GITHUB_TOKEN` cannot trigger other workflows — Docker builds stay in `release.yml`
- Release asset uploads need `permissions: contents: write`
