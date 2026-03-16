import {request} from './client';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  disabled: boolean;
  created_at: string;
}

export interface AdminSettings {
  registration_enabled: boolean;
}

export const adminApi = {
  listUsers: () => request<AdminUser[]>('/api/admin/users'),

  updateUserRole: (id: string, role: string) =>
    request<{message: string}>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({role}),
    }),

  setUserDisabled: (id: string, disabled: boolean) =>
    request<{message: string}>(`/api/admin/users/${id}/disabled`, {
      method: 'PUT',
      body: JSON.stringify({disabled}),
    }),

  getSettings: () => request<AdminSettings>('/api/admin/settings'),

  updateSettings: (settings: AdminSettings) =>
    request<AdminSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};
