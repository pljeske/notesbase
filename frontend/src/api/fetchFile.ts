import {useAuthStore} from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const blobCache = new Map<string, string>();

export async function fetchAuthBlob(url: string): Promise<string> {
  const cached = blobCache.get(url);
  if (cached) return cached;

  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${url}`, {headers});
  if (!response.ok) {
    throw new Error(`Failed to fetch file: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  blobCache.set(url, blobUrl);
  return blobUrl;
}

export function clearBlobCache() {
  for (const blobUrl of blobCache.values()) {
    URL.revokeObjectURL(blobUrl);
  }
  blobCache.clear();
}
