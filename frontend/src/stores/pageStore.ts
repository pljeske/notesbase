import {create} from 'zustand';
import {arrayMove} from '@dnd-kit/sortable';
import {pagesApi} from '../api/pages';
import type {JSONContent, Page, PageTreeNode, TrashedPage, UpdatePageRequest} from '../types/page';

interface PageState {
  tree: PageTreeNode[];
  isTreeLoading: boolean;
  activePage: Page | null;
  isPageLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  trash: TrashedPage[];
  isTrashLoading: boolean;

  fetchTree: () => Promise<void>;
  fetchPage: (id: string) => Promise<void>;
  fetchPageError: string | null;
  createPage: (parentId?: string | null) => Promise<Page>;
  updatePage: (id: string, data: UpdatePageRequest) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  duplicatePage: (id: string, deep?: boolean) => Promise<Page>;
  fetchTrash: () => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  permanentDeletePage: (id: string) => Promise<void>;
  movePage: (activeId: string, overId: string, parentId: string | null) => Promise<void>;
  setActivePage: (page: Page | null) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  updateActivePageLocal: (title?: string, content?: JSONContent) => void;
}

// Tracks the most recently requested page ID to discard stale responses.
let currentPageRequestId = '';
// Tracks the save-status reset timers keyed by page ID so rapid page switches
// don't cancel the wrong page's indicator.
const saveStatusTimers = new Map<string, ReturnType<typeof setTimeout>>();

function findChildren(nodes: PageTreeNode[], parentId: string): PageTreeNode[] | null {
  for (const node of nodes) {
    if (node.id === parentId) return node.children;
    const found = findChildren(node.children, parentId);
    if (found) return found;
  }
  return null;
}

function setChildrenInTree(
  nodes: PageTreeNode[],
  parentId: string | null,
  newChildren: PageTreeNode[],
): PageTreeNode[] {
  if (parentId === null) return newChildren;
  return nodes.map((node) => {
    if (node.id === parentId) return {...node, children: newChildren};
    if (node.children.length > 0) {
      return {...node, children: setChildrenInTree(node.children, parentId, newChildren)};
    }
    return node;
  });
}

function patchTreeNode(
  nodes: PageTreeNode[],
  id: string,
  patch: Partial<PageTreeNode>,
): PageTreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) return {...node, ...patch};
    if (node.children.length > 0) {
      return {...node, children: patchTreeNode(node.children, id, patch)};
    }
    return node;
  });
}

export const usePageStore = create<PageState>((set, get) => ({
  tree: [],
  isTreeLoading: false,
  activePage: null,
  isPageLoading: false,
  fetchPageError: null,
  saveStatus: 'idle',
  trash: [],
  isTrashLoading: false,

  fetchTree: async () => {
    set({isTreeLoading: true});
    try {
      const tree = await pagesApi.getTree();
      set({tree, isTreeLoading: false});
    } catch {
      set({isTreeLoading: false});
    }
  },

  fetchPage: async (id: string) => {
    currentPageRequestId = id;
    set({isPageLoading: true, fetchPageError: null});
    try {
      const page = await pagesApi.getById(id);
      if (currentPageRequestId === id) {
        set({activePage: page, isPageLoading: false});
      }
    } catch (err) {
      if (currentPageRequestId === id) {
        set({
          isPageLoading: false,
          fetchPageError: err instanceof Error ? err.message : 'Failed to load page',
        });
      }
    }
  },

  createPage: async (parentId?: string | null) => {
    const page = await pagesApi.create({
      parent_id: parentId ?? null,
    });
    await get().fetchTree();
    return page;
  },

  updatePage: async (id: string, data: UpdatePageRequest) => {
    const existing = saveStatusTimers.get(id);
    if (existing) {
      clearTimeout(existing);
      saveStatusTimers.delete(id);
    }
    set({saveStatus: 'saving'});
    try {
      const updatedPage = await pagesApi.update(id, data);
      const {activePage} = get();
      if (activePage?.id === id) {
        set({activePage: updatedPage});
      }
      set({saveStatus: 'saved'});
      if (data.title !== undefined || data.icon !== undefined || data.icon_color !== undefined || data.is_encrypted !== undefined) {
        // Update the affected tree node in-place rather than re-fetching the whole tree
        set((state) => ({
          tree: patchTreeNode(state.tree, id, {
            ...(data.title !== undefined && {title: data.title}),
            ...(data.icon !== undefined && {icon: updatedPage.icon}),
            ...(data.icon_color !== undefined && {icon_color: updatedPage.icon_color}),
            ...(data.is_encrypted !== undefined && {is_encrypted: updatedPage.is_encrypted}),
          }),
        }));
      }
      const timer = setTimeout(() => {
        saveStatusTimers.delete(id);
        set({saveStatus: 'idle'});
      }, 2000);
      saveStatusTimers.set(id, timer);
    } catch {
      set({saveStatus: 'error'});
    }
  },

  deletePage: async (id: string) => {
    await pagesApi.delete(id);
    const {activePage} = get();
    if (activePage?.id === id) {
      set({activePage: null});
    }
    await get().fetchTree();
    await get().fetchTrash();
  },

  duplicatePage: async (id: string, deep = false) => {
    const page = await pagesApi.duplicate(id, {deep});
    await get().fetchTree();
    return page;
  },

  fetchTrash: async () => {
    set({isTrashLoading: true});
    try {
      const trash = await pagesApi.getTrash();
      set({trash, isTrashLoading: false});
    } catch {
      set({isTrashLoading: false});
    }
  },

  restorePage: async (id: string) => {
    await pagesApi.restore(id);
    set((state) => ({trash: state.trash.filter((p) => p.id !== id)}));
    await get().fetchTree();
  },

  permanentDeletePage: async (id: string) => {
    await pagesApi.permanentDelete(id);
    set((state) => ({trash: state.trash.filter((p) => p.id !== id)}));
  },

  movePage: async (activeId, overId, parentId) => {
    const {tree} = get();
    const siblings = parentId === null ? tree : findChildren(tree, parentId);
    if (!siblings) return;

    const oldIndex = siblings.findIndex((n) => n.id === activeId);
    const newIndex = siblings.findIndex((n) => n.id === overId);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const newSiblings = arrayMove([...siblings], oldIndex, newIndex);
    set({tree: setChildrenInTree(tree, parentId, newSiblings)});

    try {
      await pagesApi.move(activeId, {parent_id: parentId, position: newIndex});
    } catch {
      await get().fetchTree();
    }
  },

  setActivePage: (page) => set({activePage: page}),

  setSaveStatus: (status) => set({saveStatus: status}),

  updateActivePageLocal: (title, content) => {
    const {activePage} = get();
    if (!activePage) return;
    set({
      activePage: {
        ...activePage,
        ...(title !== undefined ? {title} : {}),
        ...(content !== undefined ? {content} : {}),
      },
    });
  },
}));
