import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePageStore } from '../../stores/pageStore';
import type { PageTreeNode } from '../../types/page';

interface PageTreeItemProps {
  node: PageTreeNode;
  depth: number;
}

export function PageTreeItem({ node, depth }: PageTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { pageId } = useParams();
  const { createPage, deletePage } = usePageStore();
  const isActive = pageId === node.id;

  const handleCreateSubpage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const page = await createPage(node.id);
    setIsExpanded(true);
    navigate(`/page/${page.id}`);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showConfirm) {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
      return;
    }
    await deletePage(node.id);
    if (isActive) {
      navigate('/');
    }
    setShowConfirm(false);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 rounded cursor-pointer group text-sm ${
          isActive
            ? 'bg-gray-200 text-gray-900'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: '8px' }}
        onClick={() => navigate(`/page/${node.id}`)}
      >
        {node.children.length > 0 ? (
          <button
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '\u25BE' : '\u25B8'}
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}
        <span className="truncate flex-1">
          {node.icon || '\uD83D\uDCC4'} {node.title || 'Untitled'}
        </span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
          <button
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
            onClick={handleCreateSubpage}
            title="Add subpage"
          >
            +
          </button>
          <button
            className={`w-5 h-5 flex items-center justify-center rounded ${
              showConfirm
                ? 'text-red-500 bg-red-50 hover:bg-red-100'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
            }`}
            onClick={handleDelete}
            title={showConfirm ? 'Click again to confirm' : 'Delete'}
          >
            {showConfirm ? '!' : '\u00D7'}
          </button>
        </div>
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <PageTreeItem key={child.id} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}
