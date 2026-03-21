import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Session = {
  userId: number;
  username: string;
  displayName: string;
  role: string;
  demo: boolean;
};

type SessionCtx = {
  session: Session | null;
  loading: boolean;
  signIn: (s: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionCtx>({
  session: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

const KEY = 'lotto_session';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSession(JSON.parse(raw) as Session);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (s: Session) => {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear session + all API cache + all app settings in one sweep
      const allKeys = await AsyncStorage.getAllKeys();
      const appKeys = allKeys.filter(
        (k) => k === KEY || k.startsWith('api_cache:') || k.startsWith('lotto_settings_')
      );
      if (appKeys.length > 0) await AsyncStorage.multiRemove(appKeys);
    } catch {
      // Fallback: at minimum remove the session key
      await AsyncStorage.removeItem(KEY).catch(() => {});
    }
    setSession(null);
  }, []);

  return <Ctx.Provider value={{ session, loading, signIn, signOut }}>{children}</Ctx.Provider>;
}

export function useSession() {
  return useContext(Ctx);
}
