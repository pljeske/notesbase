import {request} from './client';
import type {CreatePageRequest, MovePageRequest, Page, PageTreeNode, TrashedPage, UpdatePageRequest,} from '../types/page';

export const pagesApi = {
  getTree: () => request<PageTreeNode[]>('/api/pages'),

  getById: (id: string) => request<Page>(`/api/pages/${id}`),

  create: (data: CreatePageRequest) =>
    request<Page>('/api/pages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdatePageRequest) =>
    request<Page>(`/api/pages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/api/pages/${id}`, {method: 'DELETE'}),

  move: (id: string, data: MovePageRequest) =>
    request<void>(`/api/pages/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  restore: (id: string) =>
    request<void>(`/api/pages/${id}/restore`, {method: 'POST'}),

  duplicate: (id: string, data: {deep: boolean}) =>
    request<Page>(`/api/pages/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTrash: () => request<TrashedPage[]>('/api/trash'),

  permanentDelete: (id: string) =>
    request<void>(`/api/trash/${id}`, {method: 'DELETE'}),
};
