import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE } from '@/constants/api';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

const CACHE_PREFIX = 'api_cache:v1:';

type CacheRecord<T> = {
  data: T;
  savedAt: number;
};

function getCacheKey(path: string, userId?: number | null) {
  return `${CACHE_PREFIX}${userId ?? 'guest'}:${path}`;
}

function isReachabilityError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed')
  );
}

async function readCache<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as CacheRecord<T>;
    return parsed.data;
  } catch {
    await AsyncStorage.removeItem(key).catch(() => {});
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  const record: CacheRecord<T> = {
    data,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(key, JSON.stringify(record));
}

export async function apiFetch<T = unknown>(
  path: string,
  options: { method?: Method; userId?: number | null; body?: unknown } = {}
): Promise<T> {
  const { method = 'GET', userId, body } = options;
  const isReadRequest = method === 'GET';
  const cacheKey = isReadRequest ? getCacheKey(path, userId) : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (userId != null) {
    headers['X-User-Id'] = String(userId);
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    const payload = (await res.json()) as T;

    if (isReadRequest && cacheKey) {
      writeCache(cacheKey, payload).catch(() => {});
    }

    return payload;
  } catch (error: unknown) {
    if (isReadRequest && cacheKey) {
      const cached = await readCache<T>(cacheKey).catch(() => null);
      if (cached != null) {
        return cached;
      }
    }

    if (isReachabilityError(error)) {
      if (isReadRequest) {
        throw new Error('Cannot reach server and no cached data is available yet.');
      }
      throw new Error('Cannot reach server. This action requires an internet connection.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Unexpected network error.');
  }
}
