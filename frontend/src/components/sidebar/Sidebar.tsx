import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import { PageTreeItem } from './PageTreeItem';

export function Sidebar() {
  const { tree, isTreeLoading, fetchTree, createPage } = usePageStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleCreatePage = async () => {
    const page = await createPage(null);
    navigate(`/page/${page.id}`);
  };

  return (
    <aside className="w-64 h-screen bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-sm font-semibold text-gray-700 tracking-wide">
          Notes
        </h1>
        <button
          onClick={handleCreatePage}
          className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
          title="New page"
        >
          +
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {isTreeLoading ? (
          <div className="px-3 py-2 text-sm text-gray-400">Loading...</div>
        ) : tree.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-gray-400 mb-3">No pages yet</p>
            <button
              onClick={handleCreatePage}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Create your first page
            </button>
          </div>
        ) : (
          tree.map((node) => (
            <PageTreeItem key={node.id} node={node} depth={0} />
          ))
        )}
      </nav>
    </aside>
  );
}
