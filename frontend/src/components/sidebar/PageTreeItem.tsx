import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {SortableContext, useSortable, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {usePageStore} from '../../stores/pageStore';
import {PageIcon} from '../../utils/icons';
import type {PageTreeNode} from '../../types/page';

interface PageTreeItemProps {
  node: PageTreeNode;
  depth: number;
  parentId: string | null;
}

export function PageTreeItem({node, depth, parentId}: PageTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {pageId} = useParams();
  const {createPage, deletePage, duplicatePage} = usePageStore();
  const isActive = pageId === node.id;

  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({
    id: node.id,
    data: {parentId},
  });

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleCreateSubpage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    const page = await createPage(node.id);
    setIsExpanded(true);
    navigate(`/page/${page.id}`);
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    const page = await duplicatePage(node.id, false);
    navigate(`/page/${page.id}`);
  };

  const handleMoveToTrash = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    await deletePage(node.id);
    if (isActive) {
      navigate('/');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{transform: CSS.Transform.toString(transform), transition}}
    >
      <div
        className={`flex items-center gap-1 py-1 rounded cursor-pointer group text-sm ${
          isDragging
            ? 'opacity-40'
            : isActive
              ? 'bg-gray-200 text-gray-900'
              : 'text-gray-600 hover:bg-gray-100'
        }`}
        style={{paddingLeft: `${depth * 16 + 8}px`, paddingRight: '8px'}}
        onClick={() => navigate(`/page/${node.id}`)}
      >
        <span
          className="w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-300 shrink-0"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="3" cy="3" r="1.5"/>
            <circle cx="7" cy="3" r="1.5"/>
            <circle cx="3" cy="7" r="1.5"/>
            <circle cx="7" cy="7" r="1.5"/>
            <circle cx="3" cy="11" r="1.5"/>
            <circle cx="7" cy="11" r="1.5"/>
          </svg>
        </span>
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
          <span className="w-5 h-5 shrink-0"/>
        )}
        <span className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          <span className="shrink-0 text-gray-500">
            <PageIcon icon={node.icon} color={node.icon_color} size={14} weight="light"/>
          </span>
          <span className="truncate">{node.title || 'Untitled'}</span>
        </span>
        <div
          className="relative opacity-0 group-hover:opacity-100 shrink-0"
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
            onClick={() => setMenuOpen((o) => !o)}
            title="More actions"
          >
            ···
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-50 bg-white border border-gray-200 rounded shadow-lg py-1 w-40">
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={handleCreateSubpage}
              >
                Add subpage
              </button>
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                onClick={handleDuplicate}
              >
                Duplicate
              </button>
              <hr className="my-1 border-gray-100"/>
              <button
                className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                onClick={handleMoveToTrash}
              >
                Move to Trash
              </button>
            </div>
          )}
        </div>
      </div>
      {isExpanded && node.children.length > 0 && (
        <SortableContext
          items={node.children.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {node.children.map((child) => (
            <PageTreeItem key={child.id} node={child} depth={depth + 1} parentId={node.id}/>
          ))}
        </SortableContext>
      )}
    </div>
  );
}
