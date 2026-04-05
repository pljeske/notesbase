import {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {usePageStore} from '../stores/pageStore';
import {useAuthStore} from '../stores/authStore';
import {useAutoSave} from '../hooks/useAutoSave';
import {Editor} from './editor/Editor';
import {TagPicker} from './editor/TagPicker';
import {ExportDialog} from './ExportDialog';
import {Breadcrumbs} from './Breadcrumbs';
import {DownloadSimpleIcon, LockSimpleIcon, LockSimpleOpenIcon} from '@phosphor-icons/react';
import type {JSONContent, SearchResult} from '../types/page';
import {pagesApi} from '../api/pages';
import type {EncryptedPayload} from '../utils/crypto';
import {decryptLegacy, decryptWithKey, encryptWithKey, isEncryptedPayload, isLegacyPayload} from '../utils/crypto';

export function PageView() {
  const {pageId} = useParams<{ pageId: string }>();
  const {activePage, isPageLoading, fetchPageError, fetchPage, updatePage} = usePageStore();
  const {encryptionKey, unlockEncryption} = useAuthStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<JSONContent | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState<string | null>(null);
  const [initializedPageId, setInitializedPageId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [backlinks, setBacklinks] = useState<SearchResult[]>([]);

  // ── Encryption state ───────────────────────────────────────────
  const [lockState, setLockState] = useState<'locked' | 'unlocked'>('unlocked');
  // Raw encrypted payload from server (needed for legacy salt on fallback saves)
  const rawPayloadRef = useRef<EncryptedPayload | null>(null);
  // Key for legacy pages unlocked with their old per-page password
  const legacyKeyRef = useRef<CryptoKey | null>(null);

  // Lock-screen password input (account password or legacy page password)
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockWorking, setLockWorking] = useState(false);

  // Unlock-to-encrypt modal (shown when user clicks encrypt but session key is missing)
  const [showEncryptUnlock, setShowEncryptUnlock] = useState(false);
  const [encryptUnlockPassword, setEncryptUnlockPassword] = useState('');
  const [encryptUnlockError, setEncryptUnlockError] = useState<string | null>(null);
  const [encryptUnlockWorking, setEncryptUnlockWorking] = useState(false);

  // Two-click confirm for removing encryption
  const [decryptConfirm, setDecryptConfirm] = useState(false);
  const decryptConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialized = initializedPageId === pageId;
  const isEncrypted = activePage?.is_encrypted ?? false;
  useEffect(() => {
    if (pageId) fetchPage(pageId);
  }, [pageId, fetchPage]);

  useEffect(() => {
    if (!pageId) return;
    pagesApi.getBacklinks(pageId).then(setBacklinks).catch(() => setBacklinks([]));
  }, [pageId]);

  // ── Initialize page data ───────────────────────────────────────
  useEffect(() => {
    if (!activePage || activePage.id !== pageId || initializedPageId === pageId) return;

    const payload =
      activePage.is_encrypted && isEncryptedPayload(activePage.content)
        ? (activePage.content as unknown as EncryptedPayload)
        : null;

    rawPayloadRef.current = payload;
    legacyKeyRef.current = null;

    if (payload && !isLegacyPayload(payload) && encryptionKey) {
      // New format + key available: auto-decrypt
      decryptWithKey(payload, encryptionKey)
        .then(data => {
          setTitle(activePage.title);
          setIcon(activePage.icon);
          setIconColor(activePage.icon_color);
          setContent(data as JSONContent);
          setLockState('unlocked');
          setLockPassword('');
          setLockError(null);
          setInitializedPageId(pageId!);
        })
        .catch(() => {
          setTitle(activePage.title);
          setIcon(activePage.icon);
          setIconColor(activePage.icon_color);
          setContent(null);
          setLockState('locked');
          setLockPassword('');
          setLockError(null);
          setInitializedPageId(pageId!);
        });
    } else {
      setTimeout(() => {
        setTitle(activePage.title);
        setIcon(activePage.icon);
        setIconColor(activePage.icon_color);
        setContent(payload ? null : activePage.content);
        setLockState(payload ? 'locked' : 'unlocked');
        setLockPassword('');
        setLockError(null);
        setInitializedPageId(pageId!);
      }, 0);
    }
  }, [activePage, pageId, initializedPageId, encryptionKey]);

  // Re-lock the current page when the session key is cleared
  useEffect(() => {
    if (encryptionKey || !isEncrypted || !initialized || lockState !== 'unlocked') return;
    if (legacyKeyRef.current) return; // Legacy pages are keyed independently
    legacyKeyRef.current = null;
    setContent(null);
    setLockState('locked');
    setLockPassword('');
    setLockError(null);
  }, [encryptionKey, isEncrypted, initialized, lockState]);

  // Auto-decrypt new-format pages when the session key becomes available
  useEffect(() => {
    if (!encryptionKey || lockState !== 'locked' || !rawPayloadRef.current) return;
    if (isLegacyPayload(rawPayloadRef.current)) return; // Legacy pages need per-page password
    decryptWithKey(rawPayloadRef.current, encryptionKey)
      .then(data => {
        setContent(data as JSONContent);
        setLockState('unlocked');
        setLockPassword('');
        setLockError(null);
      })
      .catch(() => {/* ignore — wrong key, stay locked */
      });
  }, [encryptionKey, lockState]);

  // ── Save ───────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!pageId || !content) return;
    let contentToSave: JSONContent | undefined = content;

    if (isEncrypted) {
      // Prefer the user key (new format, migrates legacy pages automatically).
      // Fall back to the legacy key + salt if the user key isn't available yet.
      const key = encryptionKey ?? legacyKeyRef.current;
      if (!key) return;
      const legacySalt =
        !encryptionKey && rawPayloadRef.current?.salt ? rawPayloadRef.current.salt : undefined;
      try {
        const payload = await encryptWithKey(content, key, legacySalt);
        contentToSave = payload as unknown as JSONContent;
      } catch {
        return;
      }
    }

    await updatePage(pageId, {title, content: contentToSave});
  }, [pageId, title, content, isEncrypted, encryptionKey, updatePage]);

  const handleIconChange = useCallback(
    async (newIcon: string | null) => {
      setIcon(newIcon);
      if (!newIcon) setIconColor(null);
      if (!pageId) return;
      await updatePage(pageId, {icon: newIcon ?? '', ...(!newIcon && {icon_color: ''})});
    },
    [pageId, updatePage],
  );

  const handleIconColorChange = useCallback(
    async (newColor: string | null) => {
      setIconColor(newColor);
      if (!pageId) return;
      await updatePage(pageId, {icon_color: newColor ?? ''});
    },
    [pageId, updatePage],
  );

  const {debouncedSave} = useAutoSave(save, 1000);

  const handleContentUpdate = useCallback(
    (newContent: JSONContent) => {
      setContent(newContent);
      debouncedSave();
    },
    [debouncedSave],
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      debouncedSave();
    },
    [debouncedSave],
  );

  useEffect(() => {
    if (!initialized) return;
    document.title = title ? `${title} – notesbase` : 'notesbase';
    return () => {
      document.title = 'notesbase';
    };
  }, [title, initialized]);

  // ── Unlock handlers ────────────────────────────────────────────
  const handleUnlock = async () => {
    if (!lockPassword || !rawPayloadRef.current) return;
    setLockWorking(true);
    setLockError(null);
    try {
      if (isLegacyPayload(rawPayloadRef.current)) {
        // Old per-page password format
        const {data, key} = await decryptLegacy(rawPayloadRef.current, lockPassword);
        legacyKeyRef.current = key;
        setContent(data as JSONContent);
      } else {
        // New format: use password to unlock the session key
        await unlockEncryption(lockPassword);
        // The encryptionKey effect above will auto-decrypt once the key is set
        setLockPassword('');
        setLockWorking(false);
        return;
      }
      setLockState('unlocked');
      setLockPassword('');
    } catch {
      setLockError('Incorrect password. Please try again.');
    } finally {
      setLockWorking(false);
    }
  };

  const handleEncryptPage = async (key?: CryptoKey) => {
    const keyToUse = key ?? encryptionKey;
    if (!pageId || !content || !keyToUse) return;
    try {
      const payload = await encryptWithKey(content, keyToUse);
      await updatePage(pageId, {
        title,
        content: payload as unknown as JSONContent,
        is_encrypted: true,
      });
      rawPayloadRef.current = payload;
      legacyKeyRef.current = null;
    } catch {
      // Ignore — encryption failure is silent (rare, key is always available here)
    }
  };

  const handleEncryptUnlockSubmit = async () => {
    if (!encryptUnlockPassword) return;
    setEncryptUnlockWorking(true);
    setEncryptUnlockError(null);
    try {
      await unlockEncryption(encryptUnlockPassword);
      // unlockEncryption sets the key in the store; read it back to pass directly
      const key = useAuthStore.getState().encryptionKey!;
      setShowEncryptUnlock(false);
      setEncryptUnlockPassword('');
      await handleEncryptPage(key);
    } catch {
      setEncryptUnlockError('Incorrect password. Please try again.');
    } finally {
      setEncryptUnlockWorking(false);
    }
  };

  const handleRemoveEncryption = async () => {
    if (!pageId || !content) return;
    if (!decryptConfirm) {
      setDecryptConfirm(true);
      decryptConfirmTimerRef.current = setTimeout(() => setDecryptConfirm(false), 3000);
      return;
    }
    if (decryptConfirmTimerRef.current) clearTimeout(decryptConfirmTimerRef.current);
    await updatePage(pageId, {title, content, is_encrypted: false});
    rawPayloadRef.current = null;
    legacyKeyRef.current = null;
    setDecryptConfirm(false);
  };

  // ── Render guards ──────────────────────────────────────────────
  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{color: '#9ca3af'}}>Loading…</span>
      </div>
    );
  }

  if (fetchPageError) {
    const isTrashed =
      fetchPageError.toLowerCase().includes('trash') ||
      fetchPageError.toLowerCase().includes('deleted');
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-sm" style={{color: '#9ca3af'}}>
          {isTrashed ? 'This page is in the Trash.' : 'This page could not be found.'}
        </p>
        {isTrashed && (
          <Link to="/" className="text-xs underline" style={{color: '#9ca3af'}}>
            Go to Trash to restore it
          </Link>
        )}
        {!isTrashed && (
          <Link to="/" className="text-xs underline" style={{color: '#9ca3af'}}>
            Go home
          </Link>
        )}
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm" style={{color: '#9ca3af'}}>Loading…</span>
      </div>
    );
  }

  // ── Lock screen ────────────────────────────────────────────────
  if (lockState === 'locked') {
    const isSessionLock = rawPayloadRef.current && !isLegacyPayload(rawPayloadRef.current);
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-xs">
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
                style={{background: '#f3f4f6'}}
              >
                <LockSimpleIcon size={22} weight="fill" style={{color: '#6b7280'}}/>
              </div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                {title || 'Encrypted page'}
              </h2>
              <p className="text-sm text-gray-500">
                {isSessionLock
                  ? 'Enter your account password to unlock encrypted pages.'
                  : 'This page uses a legacy format. Enter its password to unlock and migrate it.'}
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                placeholder={isSessionLock ? 'Account password' : 'Page password'}
                value={lockPassword}
                onChange={(e) => setLockPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleUnlock();
                }}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
                style={{fontFamily: 'inherit'}}
              />
              {lockError && <p className="text-xs text-red-500">{lockError}</p>}
              <button
                onClick={handleUnlock}
                disabled={!lockPassword || lockWorking}
                className="w-full py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: lockPassword && !lockWorking ? '#1a1d18' : '#e5e7eb',
                  color: lockPassword && !lockWorking ? '#fff' : '#9ca3af',
                  cursor: lockPassword && !lockWorking ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {lockWorking ? 'Unlocking…' : 'Unlock'}
              </button>
            </div>

            <p className="text-xs text-center mt-5" style={{color: '#9ca3af'}}>
              {isSessionLock
                ? 'Unlocking here applies to all encrypted pages for this session.'
                : 'Encrypted pages are not searchable. After unlocking, the page will be migrated to use your account password.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal view (unlocked) ────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumbs */}
      <Breadcrumbs pageId={pageId!}/>

      {/* Toolbar row */}
      <div className="px-8 pt-4 pb-2 flex items-center justify-between gap-3">
        <TagPicker pageId={pageId!} selectedTags={activePage?.tags ?? []}/>

        <div className="flex items-center gap-2 shrink-0">
          {/* Encryption status & controls */}
          {isEncrypted ? (
            <div className="flex items-center gap-2">
              <span
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
                style={{background: '#f3f4f6', color: '#6b7280'}}
              >
                <LockSimpleIcon size={11} weight="fill"/>
                Encrypted · not searchable
              </span>
              <button
                onClick={handleRemoveEncryption}
                className="text-xs px-2 py-1 rounded transition-colors"
                style={{
                  color: decryptConfirm ? '#ef4444' : '#9ca3af',
                  background: decryptConfirm ? '#fef2f2' : 'transparent',
                  fontFamily: 'inherit',
                }}
                title={decryptConfirm ? 'Click again to confirm' : 'Remove encryption'}
              >
                {decryptConfirm ? 'Confirm remove' : 'Remove encryption'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => encryptionKey ? void handleEncryptPage() : setShowEncryptUnlock(true)}
              className="p-1 rounded transition-colors hover:bg-gray-100"
              style={{color: '#9ca3af'}}
              title="Encrypt this page"
            >
              <LockSimpleOpenIcon size={15} weight="light"/>
            </button>
          )}

          <button
            onClick={() => setExportOpen(true)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            style={{color: '#9ca3af'}}
            title="Export page"
          >
            <DownloadSimpleIcon size={15} weight="light"/>
          </button>
        </div>
      </div>

      {exportOpen && <ExportDialog mode="page" onClose={() => setExportOpen(false)}/>}

      {/* Unlock-to-encrypt modal */}
      {showEncryptUnlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background: 'rgba(0,0,0,0.35)'}}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowEncryptUnlock(false);
              setEncryptUnlockPassword('');
              setEncryptUnlockError(null);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{background: '#f3f4f6'}}
              >
                <LockSimpleIcon size={17} weight="fill" style={{color: '#374151'}}/>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Encrypt this page</h2>
                <p className="text-xs text-gray-500">Enter your account password to continue.</p>
              </div>
            </div>
            <input
              type="password"
              placeholder="Account password"
              value={encryptUnlockPassword}
              onChange={(e) => setEncryptUnlockPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleEncryptUnlockSubmit();
              }}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 mb-3"
              style={{fontFamily: 'inherit'}}
            />
            {encryptUnlockError && (
              <p className="text-xs text-red-500 mb-3">{encryptUnlockError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowEncryptUnlock(false);
                  setEncryptUnlockPassword('');
                  setEncryptUnlockError(null);
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                style={{fontFamily: 'inherit'}}
              >
                Cancel
              </button>
              <button
                onClick={handleEncryptUnlockSubmit}
                disabled={!encryptUnlockPassword || encryptUnlockWorking}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: encryptUnlockPassword && !encryptUnlockWorking ? '#1a1d18' : '#e5e7eb',
                  color: encryptUnlockPassword && !encryptUnlockWorking ? '#fff' : '#9ca3af',
                  cursor: encryptUnlockPassword && !encryptUnlockWorking ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {encryptUnlockWorking ? 'Encrypting…' : 'Encrypt page'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Editor
          key={pageId}
          content={content}
          onUpdate={handleContentUpdate}
          pageTitle={title}
          onTitleChange={handleTitleChange}
          pageId={pageId!}
          pageIcon={icon}
          pageIconColor={iconColor}
          onIconChange={handleIconChange}
          onIconColorChange={handleIconColorChange}
        />

        {backlinks.length > 0 && (
          <div className="max-w-3xl mx-auto px-8 pb-12">
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                Linked from
              </h3>
              <div className="flex flex-col gap-1">
                {backlinks.map((bl) => (
                  <Link
                    key={bl.id}
                    to={`/page/${bl.id}`}
                    className="text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-2 py-1 rounded -mx-2 transition-colors"
                  >
                    {bl.title || 'Untitled'}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
