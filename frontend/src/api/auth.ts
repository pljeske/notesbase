import {request} from './client';

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
    encryption_salt: string;
  };
}

export interface AppConfig {
  registration_enabled: boolean;
}

export const authApi = {
  getConfig: (): Promise<AppConfig> =>
    request<AppConfig>('/api/config'),


  register: (data: RegisterData) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      skipRefresh: true,
    }),

  login: (data: LoginData) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      skipRefresh: true,
    }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({refresh_token: refreshToken}),
      skipRefresh: true,
    }),

  forgotPassword: (email: string) =>
    request<{message: string}>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({email}),
    }),

  resetPassword: (token: string, password: string) =>
    request<{message: string}>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({token, password}),
    }),

  logout: (refreshToken: string) =>
    request<void>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({refresh_token: refreshToken}),
      skipRefresh: true,
    }),
};
