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

export function useColorScheme(): Scheme {
	const systemScheme = useRNColorScheme() ?? 'light';
	const [themeVersion, setThemeVersion] = useState(0);

	useEffect(() => {
		initThemeMode().catch(() => {});
		return subscribeThemeMode(() => setThemeVersion((v) => v + 1));
	}, []);

	return useMemo(() => resolveScheme(systemScheme), [systemScheme, themeVersion]);
}
