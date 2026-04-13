# Gotchas

Edge cases, lessons learned, and non-obvious behaviours. Grouped by domain.

---

## Frontend

### Phosphor Icons naming

Names don't always match intuition. Verify before using:

```bash
grep 'export \* from.*/<Name>' frontend/node_modules/@phosphor-icons/react/dist/index.d.ts
```

Known substitutions: `Grid→GridFour`, `Wifi→WifiHigh`, `Brackets→BracketsSquare`, `Film→FilmSlate`,
`Speaker→SpeakerHigh`, `Map→MapTrifold`, `Navigation→NavigationArrow`, `Puzzle→PuzzlePiece`. Linter appends `Icon`
suffix to all imports.

### Phosphor icon component maps

Don't store icons in `Record<K, Icon>` or `Record<K, React.ComponentType<...>>` — the linter rewrites
`import {type Icon}` to the nonexistent `IconIcon`. Render conditionally: `{type === 'info' && <InfoIcon />}`.

### Web Crypto API: Uint8Array type narrowing

`crypto.subtle` requires `Uint8Array<ArrayBuffer>` (not `ArrayBufferLike`). Cast explicitly:
`new Uint8Array(n) as Uint8Array<ArrayBuffer>`. Omitting causes TS2769 at build time.

### encryptionKey is null after page refresh

`authStore.encryptionKey` is only set during `login`/`register` or `unlockEncryption()` — `loadFromStorage` cannot
re-derive it. Always provide an inline unlock flow instead of disabling gated UI.

### fetchAuthBlob blob URL cache

`frontend/src/api/fetchFile.ts` caches blob URLs in a module-level `Map`. Don't revoke individual URLs in `useEffect` —
use `clearBlobCache()` on logout only.

### Frontend `request()` client: 401 interception masks auth errors

`client.ts` intercepts every 401 for token refresh. Auth endpoints must pass `skipRefresh: true` or wrong-password 401s
surface as "Session expired".

### ESLint `react-hooks/set-state-in-effect`

Synchronous `setState` in `useEffect` is flagged — including before `setTimeout` and inside `.finally()`. Fix: move
setState inside the async callback, or derive state from existing values.

### TipTap v3 API changes

- `BubbleMenu`/`FloatingMenu`: import from `@tiptap/react/menus`. Use `options={{ placement: 'top' }}`, not
  `tippyOptions`.
- `@tiptap/pm` provides ProseMirror types (`EditorState`, `EditorView`).

### TipTap `useEditor` stale closures

`editorProps` callbacks capture props at mount. `<Editor key={pageId}>` remounts on page change — keeps closures fresh.
Do not remove the `key` prop.

### TipTap table extensions use named exports

`import {Table} from '@tiptap/extension-table'` — not default exports. `Table.configure({resizable: false})` disables
column drag-resize.

### TipTap `[[` mention (pageMention node)

Inline atomic node via `@tiptap/suggestion` with `char: '[['`, `allowSpaces: true`. `renderHTML` emits
`<span data-page-mention="<id>">`. Empty query falls back to first 8 nodes from `usePageStore.getState().tree`.

### Zustand cross-store access

Use `useStore.getState()` / `useStore.setState()` outside React. No circular dependency — Zustand stores are
module-level singletons.

### Sidebar tree updates (patchTreeNode)

When updating title, icon, or icon_color use `patchTreeNode` in `pageStore.ts` — not `fetchTree()`. Also add the field
to the `if` condition in `updatePage` that gates tree updates.

### React Router navigation state for post-navigate focus

Pass `{state: {focusTitle: true}}` in `navigate()`. Capture with `useRef(location.state?.focusTitle)` and read in a
mount-only `useEffect`.

### AsciiDoc `[[...]]` in inline code

`[[text]]` inside backtick spans is parsed as a block anchor. Use `+[[text]]+` (inline passthrough) instead.

---

## Backend

### Backend optional-field updates (pointer pattern)

Update methods only write a field if its pointer is non-nil. JSON `null` → nil → "skip field". Send `""` to clear a
nullable field.

### Backend 404: trashed vs. not found

`GetByID` filters `deleted_at IS NULL`. Use a separate `IsTrashed` query for a distinct error message (
`"page is in trash"`).

### Repository ownership pattern

All `FileRepository` methods scope by `user_id`. `GetByPageID(ctx, userID, pageID)` requires both — passing only
`pageID` is an IDOR.

### Last-admin guard: serializable transaction required

`UpdateRoleChecked` uses a serializable tx + `SELECT ... FOR UPDATE`. A plain subquery is not MVCC-safe.

### Import topology: middleware can import model

`middleware → repository → model` is already in the graph — importing `model` in `middleware/` doesn't create a cycle.

### JWT revocation: ValidateToken requires context

`authSvc.ValidateToken(ctx, token)` takes a context (DB revocation check via `revoked_tokens`). Background goroutine
cleans it every 15 min.

### PostgreSQL full-text search on JSONB

Use `jsonb_to_tsvector('english', content, '["string"]')`. Only apply when `length(query) >= 3` — shorter inputs error
in `plainto_tsquery`.

### page_links table (backlinks)

`page_links(source_page_id, target_page_id)` composite PK with `ON DELETE CASCADE`. Skip target UUIDs where
`deleted_at IS NOT NULL` to avoid FK violations from stale content.

### File upload allowlist (removed)

`backend/internal/service/file_service.go` previously had an `allowedTypes` allowlist. It's been removed — the service
accepts any content type. If uploads fail with 400, check this file first.

### golangci-lint vs Go version ceiling

Pre-built binaries fail if `go.mod` targets a newer Go (exit code 3). Use `go install` so it's compiled by the project's
own toolchain.

---

## CI/CD & Deployment

### go-semantic-release GitHub Action

Correct tag is `@v1` (not `@v2`). `GITHUB_TOKEN` cannot trigger other workflows — keep Docker builds in the same
`release.yml`.

### GitHub Actions: release asset uploads require `contents: write`

Using `contents: read` produces HTTP 403 with no clear indication.

### GitHub Actions: Docker image tagging

`GITHUB_TOKEN` cannot trigger `push: tags` workflows. Use `needs.release.outputs.version` with
`type=raw,value=v${{ needs.release.outputs.version }}` tags in the same workflow.

### GitHub Actions: Docker build cache for multi-platform images

Use `type=registry` cache (not `type=gha`) for `linux/amd64,linux/arm64` builds. Store in GHCR with `mode=max`. Requires
`packages: write`.

### Helm chart subcharts

- **groundhog2k/postgres**: `userDatabase` fields are `{value: ...}` objects (`name.value`, `user.value`,
  `password.value`). Condition key: `postgresql.enabled`.
- **Official MinIO**: credentials at top level (`rootUser`/`rootPassword`, no `auth:` wrapper); buckets under
  `buckets:`.
- **Helm `lookup`** is silently skipped during `--dry-run`. Probe `"v1" "Namespace"` first and wrap `fail` in
  `{{- if $live }}`.

### OpenShift / non-root container pattern

OpenShift assigns arbitrary UIDs in GID 0. Declare `USER <uid>:0`, `chown -R <uid>:0`, `chmod g+rwX` writable /
`chmod g+rX` read-only. For distroless: `COPY --chown=65532:0`.

### Caddy file capability vs. `allowPrivilegeEscalation: false`

`caddy:2-alpine` sets `CAP_NET_BIND_SERVICE` as a file capability. With `no_new_privs`, the kernel refuses to exec →
`CrashLoopBackOff`. Strip it in `Dockerfile.frontend`:

```dockerfile
RUN apk add --no-cache libcap && setcap -r /usr/bin/caddy && apk del libcap
```

### Caddy needs writable `/data` and `/config` with `readOnlyRootFilesystem: true`

Mount `emptyDir` volumes over `/data` and `/config`. Both the capability strip and emptyDir mounts are required
together.

### Renovate: TipTap must be grouped

All `@tiptap/*` packages in a single PR (`automerge: false`). Semantic commit type `chore(deps):` so it doesn't trigger
semantic-release.
