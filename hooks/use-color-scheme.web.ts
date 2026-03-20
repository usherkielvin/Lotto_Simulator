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
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    setHasHydrated(true);
    initThemeMode().catch(() => {});
    return subscribeThemeMode(() => setThemeVersion((v) => v + 1));
  }, []);

  const colorScheme = (useRNColorScheme() ?? 'light') as Scheme;

  if (!hasHydrated) {
    return 'light';
  }

  return useMemo(() => resolveScheme(colorScheme), [colorScheme, themeVersion]);
}
