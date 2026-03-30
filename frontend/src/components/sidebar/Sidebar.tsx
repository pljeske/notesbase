import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import type {DragEndEvent} from '@dnd-kit/core';
import {DndContext, PointerSensor, useSensor, useSensors} from '@dnd-kit/core';
import {SortableContext, verticalListSortingStrategy} from '@dnd-kit/sortable';
import {usePageStore} from '../../stores/pageStore';
import {PageTreeItem} from './PageTreeItem';
import {TagSection} from './TagSection';
import {TrashSection} from './TrashSection';
import {ExportDialog} from '../ExportDialog';
import {SearchBar} from './SearchBar';
import {DownloadSimpleIcon} from '@phosphor-icons/react';

export function Sidebar() {
  const {tree, isTreeLoading, fetchTree, createPage, movePage} = usePageStore();
  const navigate = useNavigate();
  const [exportOpen, setExportOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {activationConstraint: {distance: 8}}),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    const activeParentId =
      (active.data.current as { parentId: string | null } | undefined)?.parentId ?? null;
    const overParentId =
      (over.data.current as { parentId: string | null } | undefined)?.parentId ?? null;
    if (activeParentId !== overParentId) return;
    void movePage(String(active.id), String(over.id), activeParentId);
  };

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleCreatePage = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    (e?.currentTarget as HTMLButtonElement | undefined)?.blur();
    const page = await createPage(null);
    navigate(`/page/${page.id}`, {state: {focusTitle: true}});
  };

  return (
    <aside className="w-64 h-screen flex flex-col shrink-0 nb-sidebar">
      <div className="px-3 py-2.5 flex items-center justify-between nb-sidebar-header">
        <img src="/favicon/favicon.svg" alt="notesbase logo" className="w-6 h-6"/>
        <span className="nb-brand select-none">notesbase</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setExportOpen(true)}
            className="nb-icon-btn"
            title="Export all pages"
          >
            <DownloadSimpleIcon size={14} weight="light"/>
          </button>
          <button
            onClick={(e) => handleCreatePage(e)}
            className="nb-icon-btn"
            title="New page"
            style={{fontSize: '1.1rem', fontWeight: 300, letterSpacing: '-0.5px'}}
          >
            +
          </button>
        </div>
      </div>
      {exportOpen && <ExportDialog mode="all" onClose={() => setExportOpen(false)}/>}
      <SearchBar/>
      <nav className="flex-1 overflow-y-auto py-1 px-1.5 flex flex-col">
        <div className="flex-1">
          {isTreeLoading ? (
            <div className="nb-empty" style={{paddingTop: '1rem'}}>Loading…</div>
          ) : tree.length === 0 ? (
            <div className="nb-empty">
              <p>No pages yet</p>
              <button className="nb-empty-action" onClick={handleCreatePage}>
                Create your first page
              </button>
            </div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={tree.map((n) => n.id)}
                strategy={verticalListSortingStrategy}
              >
                {tree.map((node) => (
                  <PageTreeItem key={node.id} node={node} depth={0} parentId={null}/>
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
        <TagSection/>
        <TrashSection/>
      </nav>
    </aside>
  );
}
