import { API_BASE } from '@/constants/api';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: Method; userId?: number | null; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', userId, body } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (userId != null) {
    headers['X-User-Id'] = String(userId);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}
