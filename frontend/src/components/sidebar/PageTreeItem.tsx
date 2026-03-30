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
        className={`nb-tree-item${isActive ? ' nb-active' : ''}${isDragging ? ' nb-dragging' : ''}`}
        style={{paddingLeft: `${depth * 14 + 6}px`}}
        onClick={() => navigate(`/page/${node.id}`)}
      >
        {/* drag handle */}
        <span
          className="nb-drag-handle w-4 h-4 flex items-center justify-center cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
            <circle cx="2" cy="2" r="1.25"/>
            <circle cx="6" cy="2" r="1.25"/>
            <circle cx="2" cy="6" r="1.25"/>
            <circle cx="6" cy="6" r="1.25"/>
            <circle cx="2" cy="10" r="1.25"/>
            <circle cx="6" cy="10" r="1.25"/>
          </svg>
        </span>

        {/* expand toggle */}
        {node.children.length > 0 ? (
          <button
            className="nb-expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        ) : (
          <span style={{width: '1.125rem', flexShrink: 0}}/>
        )}

        {/* icon + title */}
        <span className="flex items-center gap-1.5 truncate flex-1 min-w-0">
          <span className="shrink-0" style={{color: 'var(--sidebar-text)'}}>
            <PageIcon icon={node.icon} color={node.icon_color} size={13} weight="light"/>
          </span>
          <span className="truncate">{node.title || 'Untitled'}</span>
        </span>

        {/* context menu */}
        <div
          className="nb-tree-menu-wrap"
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="nb-tree-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            title="More actions"
          >
            ···
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-6 z-50 nb-dropdown w-40">
              <button className="nb-dropdown-item" onClick={handleCreateSubpage}>
                Add subpage
              </button>
              <button className="nb-dropdown-item" onClick={handleDuplicate}>
                Duplicate
              </button>
              <div className="nb-dropdown-divider"/>
              <button className="nb-dropdown-item nb-danger" onClick={handleMoveToTrash}>
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
