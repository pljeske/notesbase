import {useEffect, useState} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useTagStore} from '../stores/tagStore';
import {tagsApi} from '../api/tags';
import {PageIcon} from '../utils/icons';
import type {Page} from '../types/page';

export function TagView() {
  const {tagId} = useParams<{tagId: string}>();
  const navigate = useNavigate();
  const {tags} = useTagStore();
  const [pages, setPages] = useState<Page[]>([]);
  const [loadedForTag, setLoadedForTag] = useState<string | null>(null);
  const isLoading = !!tagId && loadedForTag !== tagId;

  const tag = tags.find((t) => t.id === tagId);

  useEffect(() => {
    if (!tagId) return;
    tagsApi.getPagesByTag(tagId)
      .then((p) => setPages(p))
      .catch(() => setPages([]))
      .finally(() => setLoadedForTag(tagId));
  }, [tagId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <div className="flex items-center gap-3 mb-6">
        {tag && (
          <span className="w-4 h-4 rounded-full shrink-0" style={{backgroundColor: tag.color}}/>
        )}
        <h1 className="text-2xl font-bold text-gray-900">{tag?.name ?? 'Tag'}</h1>
        <span className="text-sm text-gray-400">{pages.length} page{pages.length !== 1 ? 's' : ''}</span>
      </div>
      {pages.length === 0 ? (
        <p className="text-gray-400 text-sm">No pages with this tag.</p>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <button
              key={page.id}
              className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 border border-gray-100"
              onClick={() => navigate(`/page/${page.id}`)}
            >
              <span className="text-lg text-gray-500">
                <PageIcon icon={page.icon} color={page.icon_color} size={20} weight="light"/>
              </span>
              <div>
                <p className="text-sm font-medium text-gray-800">{page.title || 'Untitled'}</p>
                <p className="text-xs text-gray-400">
                  Updated {new Date(page.updated_at).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
