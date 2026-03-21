import {useCallback, useEffect, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {usePageStore} from '../stores/pageStore';
import {useAutoSave} from '../hooks/useAutoSave';
import {Editor} from './editor/Editor';
import {TagPicker} from './editor/TagPicker';
import {ExportDialog} from './ExportDialog';
import {DownloadSimpleIcon} from '@phosphor-icons/react';
import type {JSONContent, SearchResult} from '../types/page';
import {pagesApi} from '../api/pages';

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

  const initialized = initializedPageId === pageId;

  useEffect(() => {
    if (pageId) {
      fetchPage(pageId);
    }
  }, [pageId, fetchPage]);

  useEffect(() => {
    if (!pageId) return;
    pagesApi.getBacklinks(pageId).then(setBacklinks).catch(() => setBacklinks([]));
  }, [pageId]);

  useEffect(() => {
    if (activePage && activePage.id === pageId && initializedPageId !== pageId) {
      setTimeout(() => {
        setTitle(activePage.title);
        setContent(activePage.content);
        setIcon(activePage.icon);
        setIconColor(activePage.icon_color);
        setInitializedPageId(pageId);
      }, 0);
    }
  }, [activePage, pageId, initializedPageId]);

  const save = useCallback(async () => {
    if (!pageId) return;
    await updatePage(pageId, {
      title,
      content: content ?? undefined,
    });
  }, [pageId, title, content, updatePage]);

  const handleIconChange = useCallback(
    async (newIcon: string | null) => {
      setIcon(newIcon);
      if (!newIcon) setIconColor(null);
      if (!pageId) return;
      await updatePage(pageId, {icon: newIcon ?? '', ...(!newIcon && {icon_color: ''})});
    },
    [pageId, updatePage]
  );

  const handleIconColorChange = useCallback(
    async (newColor: string | null) => {
      setIconColor(newColor);
      if (!pageId) return;
      await updatePage(pageId, {icon_color: newColor ?? ''});
    },
    [pageId, updatePage]
  );

  const {debouncedSave} = useAutoSave(save, 1000);

  const handleContentUpdate = useCallback(
    (newContent: JSONContent) => {
      setContent(newContent);
      debouncedSave();
    },
    [debouncedSave]
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      debouncedSave();
    },
    [debouncedSave]
  );

  useEffect(() => {
    if (!initialized) return;
    document.title = title ? `${title} – notesbase` : 'notesbase';
    return () => {
      document.title = 'notesbase';
    };
  }, [title, initialized]);

  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  if (fetchPageError) {
    const isTrashed = fetchPageError.toLowerCase().includes('trash') ||
      fetchPageError.toLowerCase().includes('deleted');
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-gray-500 text-sm">
          {isTrashed ? 'This page is in the Trash.' : 'This page could not be found.'}
        </p>
        {isTrashed && (
          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Go to Trash to restore it
          </Link>
        )}
        {!isTrashed && (
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 underline">
            Go home
          </Link>
        )}
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-4 pb-2 flex items-center justify-between">
        <TagPicker
          pageId={pageId!}
          selectedTags={activePage?.tags ?? []}
        />
        <button
          onClick={() => setExportOpen(true)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
          title="Export page"
        >
          <DownloadSimpleIcon size={15} weight="light"/>
        </button>
      </div>
      {exportOpen && <ExportDialog mode="page" onClose={() => setExportOpen(false)}/>}
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
