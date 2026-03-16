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
    <div className="border-t border-gray-200 mt-2 pt-2">
      <button
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded"
        onClick={handleToggle}
      >
        <span>{isOpen ? '\u25BE' : '\u25B8'}</span>
        <span>Trash</span>
      </button>
      {isOpen && (
        <div className="px-2 pb-2">
          {isTrashLoading ? (
            <p className="text-xs text-gray-400 px-3 py-1">Loading...</p>
          ) : trash.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-1">Trash is empty</p>
          ) : (
            trash.map((page) => (
              <div
                key={page.id}
                className="flex items-center gap-1 py-1 px-2 rounded group text-sm text-gray-600 hover:bg-gray-100"
              >
                <span className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                  <span className="shrink-0 text-gray-500">
                    <PageIcon icon={page.icon} color={page.icon_color} size={14} weight="light"/>
                  </span>
                  <span className="truncate">{page.title || 'Untitled'}</span>
                </span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
                  <button
                    className="px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded"
                    onClick={() => handleRestore(page.id)}
                    title="Restore"
                  >
                    Restore
                  </button>
                  <button
                    className={`px-1.5 py-0.5 text-xs rounded ${
                      confirmId === page.id
                        ? 'text-red-600 bg-red-50 hover:bg-red-100'
                        : 'text-gray-500 hover:bg-gray-200'
                    }`}
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
