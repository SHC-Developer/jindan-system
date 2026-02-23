import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getAuthInstance, isFirebaseConfigured } from '../lib/firebase';
import { fetchAppUser, signInWithGoogle as authSignInWithGoogle, signOut as authSignOut } from '../lib/auth';
import type { AppUser } from '../types/user';

interface UseAuthResult {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    let cancelled = false;

    if (!isFirebaseConfigured()) {
      setLoading(false);
      return undefined;
    }

    try {
      const auth = getAuthInstance();
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (cancelled) return;
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }
        try {
          const appUser = await fetchAppUser(firebaseUser);
          if (!cancelled) setUser(appUser);
        } catch (e) {
          const message = e instanceof Error ? e.message : '역할 정보를 불러오지 못했습니다.';
          if (!cancelled) setError(message);
          if (!cancelled) setUser(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      });
      return () => {
        cancelled = true;
        unsubscribe();
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Firebase 설정을 확인해 주세요.';
      setError(message);
      setLoading(false);
      return undefined;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const appUser = await authSignInWithGoogle();
      setUser(appUser);
    } catch (e) {
      const message = e instanceof Error ? e.message : '로그인에 실패했습니다.';
      setError(message);
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await authSignOut();
      setUser(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : '로그아웃에 실패했습니다.';
      setError(message);
    }
  }, []);

  return { user, loading, error, signInWithGoogle, signOut, clearError };
}
