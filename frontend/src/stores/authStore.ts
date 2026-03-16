import {create} from 'zustand';
import {authApi} from '../api/auth';
import type {LoginData, RegisterData} from '../api/auth';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  setError: (error: string | null) => void;
  tryRefreshToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (data: LoginData) => {
    set({isLoading: true, error: null});
    try {
      const resp = await authApi.login(data);
      localStorage.setItem('access_token', resp.access_token);
      localStorage.setItem('refresh_token', resp.refresh_token);
      localStorage.setItem('user', JSON.stringify(resp.user));
      set({
        token: resp.access_token,
        refreshToken: resp.refresh_token,
        user: resp.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed',
      });
      throw err;
    }
  },

  register: async (data: RegisterData) => {
    set({isLoading: true, error: null});
    try {
      const resp = await authApi.register(data);
      localStorage.setItem('access_token', resp.access_token);
      localStorage.setItem('refresh_token', resp.refresh_token);
      localStorage.setItem('user', JSON.stringify(resp.user));
      set({
        token: resp.access_token,
        refreshToken: resp.refresh_token,
        user: resp.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Registration failed',
      });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const userStr = localStorage.getItem('user');
    if (token && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr) as UserInfo;
        set({token, refreshToken, user, isAuthenticated: true});
      } catch {
        // Invalid data, clear
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    }
  },

  setError: (error) => set({error}),

  tryRefreshToken: async () => {
    const {refreshToken} = get();
    if (!refreshToken) return false;
    try {
      const resp = await authApi.refresh(refreshToken);
      localStorage.setItem('access_token', resp.access_token);
      localStorage.setItem('refresh_token', resp.refresh_token);
      localStorage.setItem('user', JSON.stringify(resp.user));
      set({
        token: resp.access_token,
        refreshToken: resp.refresh_token,
        user: resp.user,
        isAuthenticated: true,
      });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },
}));
