import {useEffect, useState} from 'react';
import {CopyIcon, TrashIcon} from '@phosphor-icons/react';
import {type APIKey, apiKeysApi, VALID_SCOPES} from '../../api/apiKeys';

export function ApiKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newScopes, setNewScopes] = useState<string[]>(['pages:read']);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    setLoading(true);
    setError(null);
    try {
      setKeys(await apiKeysApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newName.trim() || newScopes.length === 0) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await apiKeysApi.create(newName.trim(), newScopes);
      setRevealedKey(result.key);
      setKeys((prev) => [...prev, result]);
      setNewName('');
      setNewScopes(['pages:read']);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    try {
      await apiKeysApi.delete(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setConfirmDeleteId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete key');
    }
  }

  function toggleScope(scope: string) {
    setNewScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  async function handleCopy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-lg font-semibold text-gray-900 mb-1">API Keys</h1>
      <p className="text-sm text-gray-500 mb-8">
        Create keys to access your notes via the plugin API. Each key is shown only once.
      </p>

      {/* Revealed key banner */}
      {revealedKey && (
        <div
          className="mb-6 rounded-xl border p-4"
          style={{background: '#f0fdf4', borderColor: '#86efac'}}
        >
          <p className="text-xs font-medium text-green-800 mb-2">
            Key created — copy it now, it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 text-xs bg-white rounded-lg px-3 py-2 border border-green-200 font-mono truncate select-all"
              style={{color: '#166534'}}
            >
              {revealedKey}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors shrink-0"
              style={{
                background: copied ? '#16a34a' : '#1a1d18',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            >
              <CopyIcon size={12} weight="bold"/>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setRevealedKey(null)}
            className="mt-3 text-xs text-green-700 hover:underline"
            style={{fontFamily: 'inherit'}}
          >
            I've saved it, dismiss
          </button>
        </div>
      )}

      {/* Create form */}
      <div
        className="rounded-xl border p-5 mb-8"
        style={{borderColor: 'var(--sidebar-border)', background: 'var(--sidebar-bg)'}}
      >
        <h2 className="text-sm font-semibold text-gray-800 mb-4">New API key</h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Key name (e.g. Obsidian sync)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
            }}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400"
            style={{fontFamily: 'inherit'}}
          />
          <div>
            <p className="text-xs text-gray-500 mb-2">Scopes</p>
            <div className="flex flex-wrap gap-2">
              {VALID_SCOPES.map((scope) => (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope)}
                  className="px-2.5 py-1 text-xs rounded-lg border transition-colors"
                  style={{
                    fontFamily: 'inherit',
                    background: newScopes.includes(scope) ? '#1a1d18' : 'transparent',
                    color: newScopes.includes(scope) ? '#fff' : 'var(--sidebar-text)',
                    borderColor: newScopes.includes(scope) ? '#1a1d18' : 'var(--sidebar-border)',
                  }}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
          {createError && (
            <p className="text-xs text-red-500">{createError}</p>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || newScopes.length === 0 || creating}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                fontFamily: 'inherit',
                background: newName.trim() && newScopes.length > 0 && !creating ? '#1a1d18' : '#e5e7eb',
                color: newName.trim() && newScopes.length > 0 && !creating ? '#fff' : '#9ca3af',
                cursor: newName.trim() && newScopes.length > 0 && !creating ? 'pointer' : 'default',
              }}
            >
              {creating ? 'Creating…' : 'Create key'}
            </button>
          </div>
        </div>
      </div>

      {/* Key list */}
      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-gray-400">No API keys yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-start justify-between rounded-xl border px-4 py-3 gap-4"
              style={{borderColor: 'var(--sidebar-border)'}}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">{key.name}</span>
                  <code
                    className="text-xs text-gray-400 font-mono shrink-0"
                  >
                    {key.key_prefix}…
                  </code>
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {key.scopes.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{background: '#f3f4f6', color: '#6b7280'}}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400">
                  Created {formatDate(key.created_at)}
                  {key.last_used_at && ` · Last used ${formatDate(key.last_used_at)}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(key.id)}
                title={confirmDeleteId === key.id ? 'Click again to confirm' : 'Delete key'}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border transition-colors mt-0.5"
                style={{
                  fontFamily: 'inherit',
                  background: confirmDeleteId === key.id ? '#fef2f2' : 'transparent',
                  color: confirmDeleteId === key.id ? '#dc2626' : '#9ca3af',
                  borderColor: confirmDeleteId === key.id ? '#fca5a5' : '#e5e7eb',
                }}
              >
                <TrashIcon size={12}/>
                {confirmDeleteId === key.id ? 'Confirm' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
