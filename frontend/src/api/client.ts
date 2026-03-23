import {useAuthStore} from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

interface RequestOptions extends RequestInit {
  skipRefresh?: boolean;
}

export async function request<T>(
  path: string,
  options?: RequestOptions
): Promise<T> {
  const {skipRefresh, ...fetchOptions} = options ?? {};
  const headers = {
    ...getAuthHeaders(),
    ...fetchOptions.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401 && !skipRefresh) {
    // Try to refresh the token
    const refreshed = await useAuthStore.getState().tryRefreshToken();
    if (refreshed) {
      // Retry with new token
      const retryHeaders = {
        ...getAuthHeaders(),
        ...options?.headers,
      };
      const retryResponse = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: retryHeaders,
      });
      if (retryResponse.ok) {
        if (retryResponse.status === 204) return undefined as T;
        return retryResponse.json();
      }
    }
    // Refresh failed — clear auth state; AuthGuard will redirect to /login.
    useAuthStore.getState().logout();
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
