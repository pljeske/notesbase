import {create} from 'zustand';
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
  createPage: (parentId?: string | null) => Promise<Page>;
  updatePage: (id: string, data: UpdatePageRequest) => Promise<void>;
  deletePage: (id: string) => Promise<void>;
  duplicatePage: (id: string, deep?: boolean) => Promise<Page>;
  fetchTrash: () => Promise<void>;
  restorePage: (id: string) => Promise<void>;
  permanentDeletePage: (id: string) => Promise<void>;
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
    set({isPageLoading: true});
    try {
      const page = await pagesApi.getById(id);
      set({activePage: page, isPageLoading: false});
    } catch {
      set({isPageLoading: false});
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
    set({saveStatus: 'saving'});
    try {
      const updatedPage = await pagesApi.update(id, data);
      const {activePage} = get();
      if (activePage?.id === id) {
        set({activePage: updatedPage});
      }
      set({saveStatus: 'saved'});
      if (data.title !== undefined || data.icon !== undefined) {
        await get().fetchTree();
      }
      setTimeout(() => {
        if (get().saveStatus === 'saved') {
          set({saveStatus: 'idle'});
        }
      }, 2000);
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
