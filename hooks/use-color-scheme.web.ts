import { useEffect, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { getThemeMode, initThemeMode, subscribeThemeMode } from '@/hooks/theme-mode-store';

type Scheme = 'light' | 'dark';

function resolveScheme(systemScheme: Scheme): Scheme {
  const mode = getThemeMode();
  if (mode === 'system') {
    return systemScheme;
  }
  return mode;
}

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>(getThemeMode());

  useEffect(() => {
    setHasHydrated(true);
    initThemeMode().catch(() => {});
    return subscribeThemeMode(() => setMode(getThemeMode()));
  }, []);

  const systemScheme = (useRNColorScheme() ?? 'light') as Scheme;

  if (!hasHydrated) {
    return 'light';
  }

  return useMemo(() => {
    if (mode === 'system') {
      return systemScheme;
    }
    return mode;
  }, [systemScheme, mode]);
}
