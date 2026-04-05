# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Notesbase is a self-hosted notes application with a Go backend and React/TypeScript frontend. It supports hierarchical
pages (tree structure), rich text editing via TipTap, tags, file uploads to S3/MinIO, and multi-user support with admin
roles.

## Commands

### Backend (Go)

```bash
# Run the server
cd backend && go run ./cmd/server/...

# Build
cd backend && go build -o bin/server ./cmd/server/...

# Run tests
cd backend && go test ./...

# Run a single test
cd backend && go test ./internal/service/... -run TestFunctionName

# Lint (requires golangci-lint)
cd backend && golangci-lint run
```

### Frontend (Node/Vite)

```bash
# Install dependencies
cd frontend && npm install

# Dev server (proxies /api to backend at localhost:8080)
cd frontend && npm run dev

# Production build
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Preview production build
cd frontend && npm run preview
```

### Full Stack (Docker)

```bash
# Start all services (PostgreSQL, MinIO, backend, frontend)
docker compose up

# Start in background
docker compose up -d

# Rebuild after code changes
docker compose up --build
```

## Architecture

### Backend: Layered Go Application

```
HTTP Request → Handler → Service → Repository → PostgreSQL
```

- **`backend/cmd/server/main.go`** — Wires up all dependencies and starts the server
- **`backend/internal/handler/`** — HTTP handlers (Gin), input validation, response marshalling
- **`backend/internal/service/`** — Business logic (auth, page tree building, tag operations)
- **`backend/internal/repository/`** — Raw pgx queries; all implementations prefixed `postgres_*`
- **`backend/internal/model/`** — Shared structs (request/response/DB models in same file per domain)
- **`backend/internal/middleware/`** — JWT auth validation, CORS
- **`backend/migrations/`** — Sequential SQL migration files managed by `golang-migrate`

Repositories use interfaces; services receive dependencies via constructor injection.

### Frontend: React + Zustand

- **`frontend/src/App.tsx`** — Router with `AuthGuard`, `GuestGuard`, `AdminGuard`
- **`frontend/src/api/client.ts`** — Base fetch wrapper; handles 401 → silent token refresh → retry
- **`frontend/src/stores/`** — Zustand stores for auth, pages, tags (auth state persisted to localStorage)
- **`frontend/src/components/editor/`** — TipTap-based rich text editor with code blocks, images, syntax highlighting
- **`frontend/src/components/sidebar/`** — Page tree navigation

### Key Domain Concepts

- **Pages** are hierarchical (parent/child via `parent_id`) and user-isolated. Content is stored as JSONB (TipTap JSON
  format). Soft-deleted via `deleted_at`.
- **First registered user** automatically becomes admin. Subsequent users are `role=user`.
- **Registration** can be disabled via `DISABLE_REGISTRATION` env var or the admin panel (stored in `app_settings` table
  as a key-value pair).
- **Files** are stored in MinIO/S3; only metadata (s3_key, size, mime_type) is in PostgreSQL.
- **JWT**: Access token (15m) + Refresh token (168h). The frontend auto-refreshes on 401.

### Environment Variables

See `.env.example` for all variables. Key ones:

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Must be changed in production
- `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` — File storage
- `CORS_ALLOWED_ORIGINS` — Comma-separated allowed origins
- `DISABLE_REGISTRATION` — Set to `true` to prevent new signups

## Gotchas

### Phosphor Icons naming

Icon names don't always match intuition. Verify against the type definitions before using:

```bash
grep 'export \* from.*/<Name>' frontend/node_modules/@phosphor-icons/react/dist/index.d.ts
```

Known substitutions: `Grid→GridFour`, `Wifi→WifiHigh`, `Brackets→BracketsSquare`, `Film→FilmSlate`,
`Speaker→SpeakerHigh`, `Map→MapTrifold`, `Navigation→NavigationArrow`, `Puzzle→PuzzlePiece`. The project's
linter/formatter appends `Icon` to all imports (e.g. `TextB` → `TextBIcon`, `Link` → `LinkIcon`).

### Web Crypto API: Uint8Array type narrowing

`crypto.subtle` methods require `Uint8Array<ArrayBuffer>` (not `Uint8Array<ArrayBufferLike>`). Annotate buffers
explicitly: `new Uint8Array(n) as Uint8Array<ArrayBuffer>`, cast
`new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>`, and type `decode()` helper return as
`Uint8Array<ArrayBuffer>`. Omitting these causes TS2769 at build time.

### Phosphor icon component maps

Don't store Phosphor icons in a `Record<K, Icon>` or `Record<K, React.ComponentType<...>>` — the linter rewrites
`import {type Icon}` to `import {type IconIcon}` (nonexistent), and `weight?: string` is not assignable to `IconWeight`.
Instead, render conditionally: `{type === 'info' && <InfoIcon ... />}`.

### Phosphor table icons

`RowsPlusBottomIcon`, `RowsPlusTopIcon`, `ColumnsPlusLeftIcon`, `ColumnsPlusRightIcon`, `TrashSimpleIcon` — use these
for table toolbar UIs.

### TipTap table extensions use named exports

`import {Table} from '@tiptap/extension-table'` (same for TableRow, TableCell, TableHeader) — not default exports.
`Table.configure({resizable: false})` disables the column drag-resize handle.

### Backend optional-field updates (pointer pattern)

Repository update methods only apply a field if its pointer is non-nil (`req.Field != nil`). Sending JSON `null` decodes
to nil, meaning "skip this field". To **clear** a nullable field (e.g., `icon`), send an empty string `""` — the pointer
is non-nil and the DB updates to `""`. The frontend uses `!icon` (covers `null`, `undefined`, and `""`) as the "no
value" check.

### Sidebar tree updates (patchTreeNode)

When updating fields shown in the sidebar (title, icon, icon_color), update the tree in-place via `patchTreeNode` in
`pageStore.ts` rather than calling `fetchTree()`. Also add the field to the `if` condition in `updatePage` that gates
tree updates, or changes won't reflect until reload.

### PostgreSQL full-text search on JSONB

Use `jsonb_to_tsvector('english', content, '["string"]')` to extract all string values from TipTap JSONB content for
FTS. Only apply it when `length(query) >= 3` to avoid `plainto_tsquery` errors on very short inputs. GIN indexes on both
title and content live in migration 000007.

### go-semantic-release GitHub Action

The correct version tag is `@v1` (not `@v2`, which doesn't exist). `GITHUB_TOKEN` cannot trigger other workflows, so
release and Docker builds must be in the same workflow file. Use
`enable=${{ needs.release.outputs.released == 'true' }}` on semver tag rules to conditionally apply version tags while
always pushing `latest`.

### GitHub Actions: release asset uploads require `contents: write`

Jobs using `gh release upload` need `permissions: contents: write`. Using `contents: read` produces HTTP 403 "Resource
not accessible by integration" with no other indication of the permissions issue.

### GitHub Actions: Docker image tagging

`GITHUB_TOKEN` cannot trigger other workflow runs — a tag pushed by semantic-release using `GITHUB_TOKEN` will NOT fire
a `push: tags` workflow. Keep Docker builds in the same `release.yml` using `needs.release.outputs.version` with
`type=raw,value=v${{ needs.release.outputs.version }}` tags. Do NOT use a separate tag-triggered workflow.

### ESLint `react-hooks/set-state-in-effect`

Any synchronous `setState` in a `useEffect` body is flagged — including calls *before* a `setTimeout` and inside
`.finally()` chains. Fix: move all setState inside the async callback/setTimeout, or derive state from an existing
value (e.g. `const isLoading = loadedId !== currentId`).

### TipTap `useEditor` stale closures

`editorProps` callbacks capture props at mount and don't update reactively. In this codebase `<Editor key={pageId}>`
remounts the editor on page change, so closures stay fresh. Don't remove the `key` prop.

### TipTap v3 API changes

`BubbleMenu` and `FloatingMenu` are no longer exported from `@tiptap/react` — import from `@tiptap/react/menus`.
Tippy.js is gone; use `options={{ placement: 'top' }}` (floating-ui) instead of `tippyOptions`. `@tiptap/pm` provides
ProseMirror types (`EditorState`, `EditorView`).

### Adding a new TipTap block type

Touch points: (1) create extension in `editor/` with `atom: true, group: 'block', ReactNodeViewRenderer`, (2) add to
`extensions[]` in `Editor.tsx`, (3) add slash command in `slash-commands.ts`, (4) add a case in `handleDrop` in
`Editor.tsx`, (5) add CSS in `editor.css`.

### TypeScript strict imports in editor components

The tsconfig has `verbatimModuleSyntax: true` and `strict: true`. Always use `import type {MouseEvent} from 'react'` (
not `React.MouseEvent`) for type-only React references — using an unimported namespace reference can prevent the module
from loading under strict builds. For file inputs: `accept=""` accepts all files; `accept="*"` is invalid HTML.

### encryptionKey is null after page refresh

`authStore.encryptionKey` is only set during `login`/`register` or explicit `unlockEncryption()` calls —
`loadFromStorage` cannot re-derive it. Never disable UI gated on `encryptionKey`; always provide an inline unlock flow
so the user can re-derive the key without logging out.

### AsciiDoc `[[...]]` in inline code

`[[text]]` inside backtick code spans is parsed as a block anchor and triggers "Block ID pattern invalid". Use
`+[[text]]+` (inline passthrough) instead.

### fetchAuthBlob blob URL cache

`frontend/src/api/fetchFile.ts` caches blob URLs in a module-level `Map` keyed by src URL. Callers never need to
deduplicate fetches or manually revoke the returned URL — `clearBlobCache()` handles bulk cleanup on logout. Don't add
`useEffect` cleanup that revokes individual blob URLs or you'll invalidate the cache for other consumers.

### File upload allowlist (removed)

`backend/internal/service/file_service.go` previously had an `allowedTypes` allowlist that rejected any
non-image/non-PDF with a 400. It has been removed — the service now accepts any content type. If uploads silently fail
with a 400, check this file first.

### Zustand cross-store access

Stores can read and write each other outside React using `useStore.getState()` and `useStore.setState()`. Used in
`tagStore.ts` to patch `pageStore`'s `activePage.tags` after a tag rename, avoiding a round-trip fetch. Import the
target store at the top of the file — no circular dependency issues since Zustand stores are module-level singletons.

### Backend 404 for pages: trashed vs. not found

`GetByID` filters `deleted_at IS NULL`, so a soft-deleted page returns the same nil result as a non-existent one. Use a
separate `IsTrashed` query (checks `deleted_at IS NOT NULL`) in the handler to return a distinct error message (
`"page is in trash"`), allowing the frontend `isTrashed` check to route users correctly.

### React Router navigation state for post-navigate focus

Pass `{state: {focusTitle: true}}` (or similar) in `navigate()`. In the target component, capture the state in a
`useRef` at render time (`const ref = useRef(location.state?.focusTitle)`), then read `ref.current` inside a mount-only
`useEffect`. This avoids ESLint `exhaustive-deps` warnings while ensuring one-time execution.

### golangci-lint vs Go version ceiling

Pre-built golangci-lint binaries refuse to lint projects whose `go.mod` targets a newer Go than the binary was compiled
with (exit code 3, "language version used to build golangci-lint is lower than targeted"). Fix: replace
`golangci-lint-action` with `go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest` +
`golangci-lint run` so the tool is compiled by the project's own Go toolchain.

### OpenShift / non-root container pattern

OpenShift assigns arbitrary UIDs (e.g. `1000700000`) that belong to GID 0. Images must: (1) declare `USER <uid>:0` (
non-root UID, root group), (2) set `chown -R <uid>:0` on all runtime-accessed paths, (3) apply `chmod g+rwX` on writable
dirs and `chmod g+rX` on read-only dirs. For distroless, use `COPY --chown=65532:0`. This satisfies OpenShift's
`restricted` SCC without extra privileges.

### Helm chart subcharts

The `helm/notesbase` chart uses `groundhog2k/postgres` (not Bitnami) and the official `minio` chart from
`charts.min.io`. Bitnami charts were dropped due to recently introduced image pull policy restrictions of the container
images used in those charts.

- **groundhog2k/postgres** `userDatabase` fields use `{value: ...}` objects, not plain strings: `name.value`,
  `user.value`, `password.value`. Condition key is `postgresql.enabled` (via `alias: postgresql` in Chart.yaml).
- **Official MinIO** credentials are `rootUser`/`rootPassword` at top level (no `auth:` wrapper); buckets are a list
  under `buckets:`.
- Use Helm's `lookup` function in templates to validate pre-existing secrets before install:
  `{{ lookup "v1" "Secret" .Release.Namespace "secret-name" }}` returns empty dict if not found. Note: `lookup` is
  silently skipped during `helm template --dry-run` — to skip validation in that case, probe a well-known object first:
  `{{- $live := lookup "v1" "Namespace" "" .Release.Namespace }}` and wrap the `fail` call in `{{- if $live }}`.

### TipTap `[[` mention (pageMention node)

Inline atomic node using `@tiptap/suggestion` with `char: '[['`, `allowSpaces: true`. `items` callback: when
`query.length >= 1` calls `pagesApi.search(query)`; empty query falls back to first 8 nodes from
`usePageStore.getState().tree` (Zustand outside React). `renderHTML` emits `<span data-page-mention="<id>">` for
SSR/copy-paste persistence. `ReactNodeViewRenderer(PageMentionView)` renders the inline chip. tippy.js popup pattern
identical to SlashCommand.

### page_links table (backlinks)

`page_links(source_page_id, target_page_id)` composite PK with `ON DELETE CASCADE`. Updated on every content save via
`UpdateLinks` → `extractMentionIDs` (recursive TipTap JSON walker for `pageMention` nodes) → `ReplaceLinks` (DELETE +
INSERT, skipping target UUIDs where `deleted_at IS NOT NULL` to avoid FK violations from stale content). Backlinks query
JOINs through `page_links` filtered by `user_id`.

### Caddy file capability vs. `allowPrivilegeEscalation: false`

`caddy:2-alpine` sets `CAP_NET_BIND_SERVICE` as a file capability on `/usr/bin/caddy`. With
`allowPrivilegeEscalation: false` (sets `no_new_privs`), the kernel refuses to exec any binary with file capabilities →
`CrashLoopBackOff` with `exec /usr/bin/caddy: operation not permitted`. Fix: add
`RUN apk add --no-cache libcap && setcap -r /usr/bin/caddy && apk del libcap` in `Dockerfile.frontend`. Port 8080
doesn't need the capability anyway.

### GitHub Actions: Docker build cache for multi-platform images

Use `type=registry` cache (not `type=gha`) for multi-platform builds (`linux/amd64,linux/arm64`). The GHA cache has a 10
GB repo limit shared across all caches and is unreliable for multi-platform buildx. Store cache as a manifest in GHCR:
`cache-from: type=registry,ref=ghcr.io/<owner>/notesbase-<component>:buildcache` /
`cache-to: type=registry,ref=...:buildcache,mode=max`. Requires `packages: write` permission.

### Frontend `request()` client: 401 interception masks auth errors

`client.ts` intercepts every 401 to attempt a token refresh, then throws "Session expired" if refresh fails. Auth
endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`) must pass `skipRefresh: true` in options,
otherwise a wrong-password 401 from the backend surfaces as "Session expired" instead of "invalid email or password".

### Caddy needs writable `/data` and `/config` with `readOnlyRootFilesystem: true`

Caddy writes OCSP/auto-HTTPS state to `/data/caddy` and `/config/caddy` at startup. With `readOnlyRootFilesystem: true`
in K8s, mount two `emptyDir` volumes over `/data` and `/config` in the frontend Deployment. Both fixes (file capability
strip + emptyDir mounts) are required together.

### Repository ownership pattern

All `FileRepository` methods scope by `user_id`. `GetByPageID(ctx, userID, pageID)` requires both — passing only
`pageID` is an IDOR. Same scoping applies to any new query methods added to the file repo.

### Last-admin guard: serializable transaction required

`UpdateRoleChecked` in `postgres_user_repository.go` uses a serializable tx +
`SELECT COUNT(*) FROM users WHERE role = 'admin' FOR UPDATE` before the UPDATE. A plain subquery in the UPDATE WHERE
clause is not safe under MVCC — two concurrent reads both see count > 1.

### Import topology: middleware can import model

`middleware` already depends on `repository` which depends on `model` — importing `model` directly in `middleware/` does
not create a cycle. No need for interface indirection to access model structs in middleware.

### Plugin API: API key auth at `/api/v1/plugin/...`

Separate route group authenticated via `middleware.APIKeyAuth` (not JWT). Keys have `nbp_` prefix, stored as SHA-256
hash. `middleware.RequireScope(model.ScopeXxx)` enforces per-route scopes. Key management (create/list/delete) lives at
`/api/api-keys` under normal JWT auth. Plugin keys always resolve to `role=user`.

### JWT revocation: ValidateToken requires context

`authSvc.ValidateToken(ctx, token)` now takes a context (added for DB revocation check). The `revoked_tokens` table
stores `(jti, expires_at)`; a background goroutine in `PostgresRevokedTokenRepository` cleans it up every 15 min.
`Logout` revokes both access and refresh tokens by JTI.

### Renovate: TipTap must be grouped

`renovate.json` groups all `@tiptap/*` packages into a single PR (`automerge: false`). Never split them — TipTap
extension APIs change together across minor versions. Semantic commit type is `chore(deps):` so dependency PRs don't
trigger semantic-release.

<!-- code-review-graph MCP tools -->

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
|-----------------------------|--------------------------------------------------------|
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
