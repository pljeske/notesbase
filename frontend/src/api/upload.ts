const BASE_URL = import.meta.env.VITE_API_URL || '';

export interface UploadResponse {
  id: string;
  url: string;
  filename: string;
  content_type: string;
  size: number;
}

export async function uploadFile(
  file: File,
  pageId: string
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('page_id', pageId);

  const response = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Upload failed: HTTP ${response.status}`);
  }

  return response.json();
}
