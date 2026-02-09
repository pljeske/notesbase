import { create } from 'zustand';
import { pagesApi } from '../api/pages';
import type { Page, PageTreeNode, UpdatePageRequest, JSONContent } from '../types/page';

interface PageState {
  tree: PageTreeNode[];
  isTreeLoading: boolean;
  activePage: Page | null;
  isPageLoading: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';

  fetchTree: () => Promise<void>;
  fetchPage: (id: string) => Promise<void>;
  createPage: (parentId?: string | null) => Promise<Page>;
  updatePage: (id: string, data: UpdatePageRequest) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  setActivePage: (page: Page | null) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  updateActivePageLocal: (title?: string, content?: JSONContent) => void;
}

export const usePageStore = create<PageState>((set, get) => ({
  tree: [],
  isTreeLoading: false,
  activePage: null,
  isPageLoading: false,
  saveStatus: 'idle',

  fetchTree: async () => {
    set({ isTreeLoading: true });
    try {
      const tree = await pagesApi.getTree();
      set({ tree, isTreeLoading: false });
    } catch {
      set({ isTreeLoading: false });
    }
  },

  fetchPage: async (id: string) => {
    set({ isPageLoading: true });
    try {
      const page = await pagesApi.getById(id);
      set({ activePage: page, isPageLoading: false });
    } catch {
      set({ isPageLoading: false });
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
    set({ saveStatus: 'saving' });
    try {
      await pagesApi.update(id, data);
      set({ saveStatus: 'saved' });
      // Refresh tree if title changed
      if (data.title !== undefined) {
        await get().fetchTree();
      }
      setTimeout(() => {
        if (get().saveStatus === 'saved') {
          set({ saveStatus: 'idle' });
        }
      }, 2000);
    } catch {
      set({ saveStatus: 'error' });
    }
  },

  deletePage: async (id: string) => {
    await pagesApi.delete(id);
    const { activePage } = get();
    if (activePage?.id === id) {
      set({ activePage: null });
    }
    await get().fetchTree();
  },

  setActivePage: (page) => set({ activePage: page }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  updateActivePageLocal: (title, content) => {
    const { activePage } = get();
    if (!activePage) return;
    set({
      activePage: {
        ...activePage,
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
      },
    });
  },
}));
