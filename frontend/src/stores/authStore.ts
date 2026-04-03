import {create} from 'zustand';
import type {LoginData, RegisterData} from '../api/auth';
import {authApi} from '../api/auth';
import {clearBlobCache} from '../api/fetchFile';
import {deriveUserKey} from '../utils/crypto';

interface UserInfo {
  id: string;
  email: string;
  name: string;
  role: string;
  encryption_salt: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Derived AES-GCM key for encrypted pages. In-memory only — never persisted. */
  encryptionKey: CryptoKey | null;

  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loadFromStorage: () => void;
  setError: (error: string | null) => void;
  tryRefreshToken: () => Promise<boolean>;
  /** Derive and store the encryption key from the user's account password. */
  unlockEncryption: (password: string) => Promise<void>;
  /** Clear the in-memory encryption key, re-locking all encrypted pages. */
  lockEncryption: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  encryptionKey: null,

  login: async (data: LoginData) => {
    set({isLoading: true, error: null});
    try {
      const resp = await authApi.login(data);
      localStorage.setItem('access_token', resp.access_token);
      localStorage.setItem('refresh_token', resp.refresh_token);
      localStorage.setItem('user', JSON.stringify(resp.user));
      const encryptionKey = await deriveUserKey(data.password, resp.user.encryption_salt);
      set({
        token: resp.access_token,
        refreshToken: resp.refresh_token,
        user: resp.user,
        isAuthenticated: true,
        isLoading: false,
        encryptionKey,
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
      const encryptionKey = await deriveUserKey(data.password, resp.user.encryption_salt);
      set({
        token: resp.access_token,
        refreshToken: resp.refresh_token,
        user: resp.user,
        isAuthenticated: true,
        isLoading: false,
        encryptionKey,
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
    // Revoke tokens server-side (fire-and-forget — UI clears immediately).
    const {refreshToken} = get();
    if (refreshToken) {
      void authApi.logout(refreshToken).catch(() => {/* best-effort */
      });
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    clearBlobCache();
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      error: null,
      encryptionKey: null,
    });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    const userStr = localStorage.getItem('user');
    if (token && refreshToken && userStr) {
      try {
        const user = JSON.parse(userStr) as UserInfo;
        // encryptionKey is not persisted — user must re-enter password to unlock encrypted pages
        set({token, refreshToken, user, isAuthenticated: true});
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
    }
  },

  setError: (error) => set({error}),

  unlockEncryption: async (password: string) => {
    const {user} = get();
    if (!user) return;
    const encryptionKey = await deriveUserKey(password, user.encryption_salt);
    set({encryptionKey});
  },

  lockEncryption: () => set({encryptionKey: null}),

  tryRefreshToken: async () => {
    const {refreshToken} = get();
    if (!refreshToken) return false;
    try {
      const resp = await authApi.refresh(refreshToken);
      localStorage.setItem('access_token', resp.access_token);
      localStorage.setItem('refresh_token', resp.refresh_token);
      localStorage.setItem('user', JSON.stringify(resp.user));
      // Key is not re-derived on token refresh — user must explicitly unlock if needed
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
