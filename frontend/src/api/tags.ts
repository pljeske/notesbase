import {request} from './client';
import type {CreateTagRequest, Tag, UpdateTagRequest} from '../types/tag';
import type {Page} from '../types/page';

export const tagsApi = {
  getAll: () => request<Tag[]>('/api/tags'),

  create: (data: CreateTagRequest) =>
    request<Tag>('/api/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateTagRequest) =>
    request<Tag>(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/tags/${id}`, {method: 'DELETE'}),

  getPagesByTag: (id: string) => request<Page[]>(`/api/tags/${id}/pages`),
};
