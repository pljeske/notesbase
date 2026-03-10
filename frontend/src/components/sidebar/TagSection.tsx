import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTagStore} from '../../stores/tagStore';
import {TagManager} from '../TagManager';

export function TagSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const {tags, fetchTags} = useTagStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return (
    <div className="border-t border-gray-200 mt-2 pt-2">
      <div className="flex items-center px-3">
        <button
          className="flex-1 flex items-center gap-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          onClick={() => setIsOpen((o) => !o)}
        >
          <span>{isOpen ? '\u25BE' : '\u25B8'}</span>
          <span>Tags</span>
        </button>
        <button
          className="text-xs text-gray-400 hover:text-gray-600 px-1"
          onClick={() => setShowManager(true)}
          title="Manage tags"
        >
          Manage
        </button>
      </div>
      {isOpen && (
        <div className="px-2 pb-2">
          {tags.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-1">No tags yet</p>
          ) : (
            tags.map((tag) => (
              <button
                key={tag.id}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded text-left"
                onClick={() => navigate(`/tag/${tag.id}`)}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{backgroundColor: tag.color}}
                />
                <span className="truncate">{tag.name}</span>
              </button>
            ))
          )}
        </div>
      )}
      {showManager && <TagManager onClose={() => setShowManager(false)}/>}
    </div>
  );
}
