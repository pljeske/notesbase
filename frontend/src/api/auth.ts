import {request} from './client';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface AppConfig {
  registration_enabled: boolean;
}

export const authApi = {
  getConfig: async (): Promise<AppConfig> => {
    const res = await fetch(`${BASE_URL}/api/config`);
    return res.json();
  },


  register: (data: RegisterData) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: LoginData) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({refresh_token: refreshToken}),
    }),
};
