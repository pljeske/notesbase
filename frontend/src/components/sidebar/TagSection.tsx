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
    <div className="nb-section-divider">
      <div className="nb-section-header-row">
        <button
          className="nb-section-toggle"
          onClick={() => setIsOpen((o) => !o)}
        >
          <span style={{fontSize: '0.5rem'}}>{isOpen ? '▾' : '▸'}</span>
          <span>Tags</span>
        </button>
        <button
          className="nb-section-action"
          onClick={() => setShowManager(true)}
          title="Manage tags"
        >
          Manage
        </button>
      </div>
      {isOpen && (
        <div className="px-1 pb-1">
          {tags.length === 0 ? (
            <p className="nb-search-meta">No tags yet</p>
          ) : (
            tags.map((tag) => (
              <button
                key={tag.id}
                className="nb-section-item"
                onClick={() => navigate(`/tag/${tag.id}`)}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
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
