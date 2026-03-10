import {create} from 'zustand';
import {tagsApi} from '../api/tags';
import type {CreateTagRequest, Tag, UpdateTagRequest} from '../types/tag';

interface TagState {
  tags: Tag[];
  isLoading: boolean;

  fetchTags: () => Promise<void>;
  createTag: (data: CreateTagRequest) => Promise<Tag>;
  updateTag: (id: string, data: UpdateTagRequest) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;
}

export const useTagStore = create<TagState>((set) => ({
  tags: [],
  isLoading: false,

  fetchTags: async () => {
    set({isLoading: true});
    try {
      const tags = await tagsApi.getAll();
      set({tags, isLoading: false});
    } catch {
      set({isLoading: false});
    }
  },

  createTag: async (data: CreateTagRequest) => {
    const tag = await tagsApi.create(data);
    set((state) => ({tags: [...state.tags, tag]}));
    return tag;
  },

  updateTag: async (id: string, data: UpdateTagRequest) => {
    const updated = await tagsApi.update(id, data);
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? updated : t)),
    }));
  },

  deleteTag: async (id: string) => {
    await tagsApi.delete(id);
    set((state) => ({tags: state.tags.filter((t) => t.id !== id)}));
  },
}));
