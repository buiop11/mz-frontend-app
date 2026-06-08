import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type TopicsRefreshContextValue = {
  refreshToken: number;
  bumpTopicsRefresh: () => void;
};

const TopicsRefreshContext = createContext<TopicsRefreshContextValue | null>(null);

export function TopicsRefreshProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [refreshToken, setRefreshToken] = useState(0);

  const bumpTopicsRefresh = useCallback(() => {
    setRefreshToken((prev) => prev + 1);
  }, []);

  const value = useMemo(
    () => ({ refreshToken, bumpTopicsRefresh }),
    [refreshToken, bumpTopicsRefresh],
  );

  return <TopicsRefreshContext.Provider value={value}>{children}</TopicsRefreshContext.Provider>;
}

export function useTopicsRefresh() {
  const ctx = useContext(TopicsRefreshContext);
  if (ctx == null) {
    throw new Error('useTopicsRefresh must be used within TopicsRefreshProvider');
  }
  return ctx;
}
