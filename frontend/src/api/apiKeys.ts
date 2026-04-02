import {request} from './client';

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
}

export interface CreateAPIKeyResponse extends APIKey {
  key: string;
}

export const VALID_SCOPES = [
  'pages:read',
  'pages:write',
  'tags:read',
  'tags:write',
  'files:read',
  'files:write',
] as const;

export const apiKeysApi = {
  list: () => request<APIKey[]>('/api/api-keys'),

  create: (name: string, scopes: string[]) =>
    request<CreateAPIKeyResponse>('/api/api-keys', {
      method: 'POST',
      body: JSON.stringify({name, scopes}),
    }),

  delete: (id: string) =>
    request<void>(`/api/api-keys/${id}`, {method: 'DELETE'}),
};
