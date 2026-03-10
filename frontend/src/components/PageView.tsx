import {useCallback, useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {usePageStore} from '../stores/pageStore';
import {useAutoSave} from '../hooks/useAutoSave';
import {Editor} from './editor/Editor';
import {TagPicker} from './editor/TagPicker';
import type {JSONContent} from '../types/page';

export function PageView() {
  const {pageId} = useParams<{ pageId: string }>();
  const {activePage, isPageLoading, fetchPage, updatePage} = usePageStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<JSONContent | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (pageId) {
      setInitialized(false);
      fetchPage(pageId);
    }
  }, [pageId, fetchPage]);

  useEffect(() => {
    if (activePage && activePage.id === pageId && !initialized) {
      setTitle(activePage.title);
      setContent(activePage.content);
      setInitialized(true);
    }
  }, [activePage, pageId, initialized]);

  const save = useCallback(async () => {
    if (!pageId) return;
    await updatePage(pageId, {
      title,
      content: content ?? undefined,
    });
  }, [pageId, title, content, updatePage]);

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

  if (isPageLoading || !initialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-8 pt-4 pb-2">
        <TagPicker
          pageId={pageId!}
          selectedTags={activePage?.tags ?? []}
        />
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          key={pageId}
          content={content}
          onUpdate={handleContentUpdate}
          pageTitle={title}
          onTitleChange={handleTitleChange}
          pageId={pageId!}
        />
      </div>
    </div>
  );
}
