import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { apiFetch } from '@/hooks/use-api';
import { useSession } from '@/hooks/use-session';

type BalanceCtx = {
  balance: number | null;
  refreshBalance: () => Promise<void>;
  setBalanceValue: (value: number | null) => void;
  applyDelta: (delta: number) => void; // instant optimistic update
};

const Ctx = createContext<BalanceCtx>({
  balance: null,
  refreshBalance: async () => {},
  setBalanceValue: () => {},
  applyDelta: () => {},
});

export function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const userId = session?.userId ?? null;

  const [balance, setBalance] = useState<number | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!userId) { setBalance(null); return; }
    try {
      const res = await apiFetch<{ balance: number }>('/bets/balance', { userId });
      setBalance(Number(res.balance));
    } catch {
      // keep stale value
    }
  }, [userId]);

  // fetch on mount / user change
  useEffect(() => {
    setBalance(null);
    refreshBalance();
  }, [refreshBalance]);

  const applyDelta = useCallback((delta: number) => {
    setBalance((prev) => (prev !== null ? prev + delta : prev));
  }, []);

  const setBalanceValue = useCallback((value: number | null) => {
    setBalance(value);
  }, []);

  return <Ctx.Provider value={{ balance, refreshBalance, setBalanceValue, applyDelta }}>{children}</Ctx.Provider>;
}

export function useBalance() {
  return useContext(Ctx);
}
