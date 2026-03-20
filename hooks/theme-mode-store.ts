import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_THEME_MODE_KEY } from '@/constants/settings';

export type ThemeMode = 'system' | 'light' | 'dark';

type Listener = () => void;

const listeners = new Set<Listener>();

let themeMode: ThemeMode = 'system';
let initialized = false;
let initializing: Promise<void> | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

function parseThemeMode(raw: string | null): ThemeMode {
  if (raw === 'light' || raw === 'dark' || raw === 'system') {
    return raw;
  }
  return 'system';
}

export async function initThemeMode() {
  if (initialized) return;
  if (initializing) {
    await initializing;
    return;
  }

  initializing = AsyncStorage.getItem(APP_THEME_MODE_KEY)
    .then((raw) => {
      themeMode = parseThemeMode(raw);
      initialized = true;
      emit();
    })
    .catch(() => {
      initialized = true;
      emit();
    })
    .finally(() => {
      initializing = null;
    });

  await initializing;
}

export function getThemeMode() {
  return themeMode;
}

export function subscribeThemeMode(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function setThemeMode(nextMode: ThemeMode) {
  themeMode = nextMode;
  initialized = true;
  emit();

  try {
    if (nextMode === 'system') {
      await AsyncStorage.removeItem(APP_THEME_MODE_KEY);
      return;
    }
    await AsyncStorage.setItem(APP_THEME_MODE_KEY, nextMode);
  } catch {
    // Keep in-memory preference if persistence fails.
  }
}
