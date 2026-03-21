const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => {
    const hasBody = body !== undefined;
    return apiFetch<T>(path, {
      method: 'POST',
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  },
  put: <T>(path: string, body?: unknown) => {
    const hasBody = body !== undefined;
    return apiFetch<T>(path, {
      method: 'PUT',
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  },
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
