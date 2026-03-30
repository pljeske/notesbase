import {useState} from 'react';
import {usePageStore} from '../../stores/pageStore';
import {PageIcon} from '../../utils/icons';

export function TrashSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const {trash, isTrashLoading, fetchTrash, restorePage, permanentDeletePage} = usePageStore();

  const handleToggle = () => {
    if (!isOpen && trash.length === 0) {
      fetchTrash();
    }
    setIsOpen((o) => !o);
  };

  const handleRestore = async (id: string) => {
    await restorePage(id);
  };

  const handlePermanentDelete = async (id: string) => {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
      return;
    }
    await permanentDeletePage(id);
    setConfirmId(null);
  };

  return (
    <div className="nb-section-divider" style={{marginBottom: '0.5rem'}}>
      <div className="nb-section-header-row">
        <button className="nb-section-toggle" onClick={handleToggle}>
          <span style={{fontSize: '0.5rem'}}>{isOpen ? '▾' : '▸'}</span>
          <span>Trash</span>
        </button>
      </div>
      {isOpen && (
        <div className="px-1 pb-1">
          {isTrashLoading ? (
            <p className="nb-search-meta">Loading…</p>
          ) : trash.length === 0 ? (
            <p className="nb-search-meta">Trash is empty</p>
          ) : (
            trash.map((page) => (
              <div key={page.id} className="nb-section-item group">
                <span className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  <span className="shrink-0" style={{color: 'var(--sidebar-text)'}}>
                    <PageIcon icon={page.icon} color={page.icon_color} size={13} weight="light"/>
                  </span>
                  <span className="truncate">{page.title || 'Untitled'}</span>
                </span>
                <div className="nb-section-item-actions">
                  <button
                    className="nb-restore-btn"
                    onClick={() => handleRestore(page.id)}
                    title="Restore"
                  >
                    Restore
                  </button>
                  <button
                    className={`nb-delete-btn${confirmId === page.id ? ' nb-confirm' : ''}`}
                    onClick={() => handlePermanentDelete(page.id)}
                    title={confirmId === page.id ? 'Click again to confirm' : 'Delete permanently'}
                  >
                    {confirmId === page.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
