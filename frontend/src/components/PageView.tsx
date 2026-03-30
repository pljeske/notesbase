import {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {usePageStore} from '../stores/pageStore';
import {useAutoSave} from '../hooks/useAutoSave';
import {Editor} from './editor/Editor';
import {TagPicker} from './editor/TagPicker';
import {ExportDialog} from './ExportDialog';
import {DownloadSimpleIcon, LockSimpleIcon, LockSimpleOpenIcon} from '@phosphor-icons/react';
import type {JSONContent, SearchResult} from '../types/page';
import {pagesApi} from '../api/pages';
import type {EncryptedPayload} from '../utils/crypto';
import {decryptContent, encryptContent, encryptWithKey, isEncryptedPayload,} from '../utils/crypto';

export function PageView() {
  const {pageId} = useParams<{ pageId: string }>();
  const {activePage, isPageLoading, fetchPageError, fetchPage, updatePage} = usePageStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<JSONContent | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [iconColor, setIconColor] = useState<string | null>(null);
  const [initializedPageId, setInitializedPageId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [backlinks, setBacklinks] = useState<SearchResult[]>([]);

  // ── Encryption state ───────────────────────────────────────────
  const [lockState, setLockState] = useState<'locked' | 'unlocked'>('unlocked');
  // Raw encrypted payload from the server (needed for salt reuse on re-encrypt)
  const rawPayloadRef = useRef<EncryptedPayload | null>(null);
  // Derived CryptoKey held in memory only — never serialized
  const derivedKeyRef = useRef<CryptoKey | null>(null);

  // Lock-screen inputs
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockWorking, setLockWorking] = useState(false);

  // "Encrypt this page" modal
  const [showEncryptModal, setShowEncryptModal] = useState(false);
  const [encryptPassword, setEncryptPassword] = useState('');
  const [encryptError, setEncryptError] = useState<string | null>(null);
  const [encryptWorking, setEncryptWorking] = useState(false);

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

  useEffect(() => {
    if (activePage && activePage.id === pageId && initializedPageId !== pageId) {
      setTimeout(() => {
        setTitle(activePage.title);
        setIcon(activePage.icon);
        setIconColor(activePage.icon_color);

        if (activePage.is_encrypted && isEncryptedPayload(activePage.content)) {
          // Encrypted page: keep content null, show lock screen
          rawPayloadRef.current = activePage.content as unknown as EncryptedPayload;
          derivedKeyRef.current = null;
          setContent(null);
          setLockState('locked');
          setLockPassword('');
          setLockError(null);
        } else {
          // Unencrypted page: initialize editor normally
          rawPayloadRef.current = null;
          derivedKeyRef.current = null;
          setContent(activePage.content);
          setLockState('unlocked');
        }
        setInitializedPageId(pageId);
      }, 0);
    }
  }, [activePage, pageId, initializedPageId]);

  // ── Save ───────────────────────────────────────────────────────
  const save = useCallback(async () => {
    if (!pageId) return;
    let contentToSave: JSONContent | undefined = content ?? undefined;

    if (isEncrypted && derivedKeyRef.current && rawPayloadRef.current && content) {
      try {
        const payload = await encryptWithKey(
          content,
          derivedKeyRef.current,
          rawPayloadRef.current.salt,
        );
        contentToSave = payload as unknown as JSONContent;
      } catch {
        return; // Don't save if encryption fails
      }
    }

    await updatePage(pageId, {title, content: contentToSave});
  }, [pageId, title, content, isEncrypted, updatePage]);

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

  // ── Encryption handlers ────────────────────────────────────────
  const handleUnlock = async () => {
    if (!lockPassword || !rawPayloadRef.current) return;
    setLockWorking(true);
    setLockError(null);
    try {
      const {data, key} = await decryptContent(rawPayloadRef.current, lockPassword);
      derivedKeyRef.current = key;
      setContent(data as JSONContent);
      setLockState('unlocked');
      setLockPassword('');
    } catch {
      setLockError('Incorrect password. Please try again.');
    } finally {
      setLockWorking(false);
    }
  };

  const handleEncryptPage = async () => {
    if (!encryptPassword || !pageId || !content) return;
    setEncryptWorking(true);
    setEncryptError(null);
    try {
      const {payload, key} = await encryptContent(content, encryptPassword);
      await updatePage(pageId, {
        title,
        content: payload as unknown as JSONContent,
        is_encrypted: true,
      });
      derivedKeyRef.current = key;
      rawPayloadRef.current = payload;
      setShowEncryptModal(false);
      setEncryptPassword('');
    } catch {
      setEncryptError('Encryption failed. Please try again.');
    } finally {
      setEncryptWorking(false);
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
    await updatePage(pageId, {
      title,
      content: content,
      is_encrypted: false,
    });
    rawPayloadRef.current = null;
    derivedKeyRef.current = null;
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
                Enter your password to view this page.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                placeholder="Password"
                value={lockPassword}
                onChange={(e) => setLockPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleUnlock();
                }}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 bg-white"
                style={{fontFamily: 'inherit'}}
              />
              {lockError && (
                <p className="text-xs text-red-500">{lockError}</p>
              )}
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
              Encrypted pages are not searchable. If you've forgotten your password, you'll need to delete this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal view (unlocked) ────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
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
              onClick={() => {
                setEncryptPassword('');
                setEncryptError(null);
                setShowEncryptModal(true);
              }}
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

      {/* "Encrypt this page" modal */}
      {showEncryptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background: 'rgba(0,0,0,0.35)'}}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEncryptModal(false);
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
                <p className="text-xs text-gray-500">Content is encrypted in your browser only.</p>
              </div>
            </div>

            <div
              className="text-xs rounded-lg px-3 py-2.5 mb-4"
              style={{background: '#fffbeb', color: '#92400e'}}
            >
              Use a password you won't forget — encrypted pages cannot be recovered without it. Admins cannot read the
              content.
            </div>

            <input
              type="password"
              placeholder="Choose a password"
              value={encryptPassword}
              onChange={(e) => setEncryptPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleEncryptPage();
              }}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-gray-400 mb-3"
              style={{fontFamily: 'inherit'}}
            />
            {encryptError && (
              <p className="text-xs text-red-500 mb-3">{encryptError}</p>
            )}

            <p className="text-xs text-gray-400 mb-4">
              Encrypted pages are not searchable and won't appear in search results.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowEncryptModal(false)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                style={{fontFamily: 'inherit'}}
              >
                Cancel
              </button>
              <button
                onClick={handleEncryptPage}
                disabled={!encryptPassword || encryptWorking}
                className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
                style={{
                  background: encryptPassword && !encryptWorking ? '#1a1d18' : '#e5e7eb',
                  color: encryptPassword && !encryptWorking ? '#fff' : '#9ca3af',
                  cursor: encryptPassword && !encryptWorking ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                {encryptWorking ? 'Encrypting…' : 'Encrypt page'}
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
