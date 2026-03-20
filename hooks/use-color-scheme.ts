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
	const [mode, setMode] = useState<'light' | 'dark' | 'system'>(getThemeMode());

	useEffect(() => {
		initThemeMode().catch(() => {});
		return subscribeThemeMode(() => setMode(getThemeMode()));
	}, []);

	return useMemo(() => {
		if (mode === 'system') {
			return systemScheme;
		}
		return mode;
	}, [systemScheme, mode]);
}
