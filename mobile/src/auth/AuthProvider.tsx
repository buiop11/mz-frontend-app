import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { loginWithGoogle as requestGoogleLogin } from '@/src/api/client';
import { setUnauthorizedHandler } from '@/src/api/fetch';
import { clearSession, loadSession, saveSession, StoredUser } from '@/src/auth/storage';

type StoredSession = {
  token: string;
  user: StoredUser;
};

type AuthContextValue = {
  bootstrapping: boolean;
  session: StoredSession | null;
  user: StoredUser | null;
  loginWithGoogleIdToken: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<StoredSession | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const stored = await loadSession();
      if (mounted) {
        setSession(stored);
        setBootstrapping(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      console.warn('[auth] 401 수신 → 세션을 비우고 로그인 화면으로 복귀합니다.');
      setSession(null);
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  const loginWithGoogleIdToken = useCallback(async (idToken: string) => {
    const nextSession = await requestGoogleLogin(idToken);
    const storedSession = { token: nextSession.token, user: nextSession.user };
    await saveSession(storedSession.token, storedSession.user);
    setSession(storedSession);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      bootstrapping,
      session,
      user: session?.user ?? null,
      loginWithGoogleIdToken,
      logout,
    }),
    [bootstrapping, loginWithGoogleIdToken, logout, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return value;
}
