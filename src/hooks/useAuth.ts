import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getAuthInstance, getAuthDomain, isFirebaseConfigured } from '../lib/firebase';
import { fetchAppUser, subscribeAppUser, signInWithGoogle as authSignInWithGoogle, signOut as authSignOut, updateAuthProfilePhoto, updateUserPhotoURLInFirestore } from '../lib/auth';
import { clearNotifiedIds } from './useNotifications';
import { deleteProfilePhoto } from '../lib/storage';
import type { AppUser } from '../types/user';

interface UseAuthResult {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: (rememberMe?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  updateProfilePhotoUrl: (url: string | null) => void;
  deleteProfilePhotoAndUpdate: () => Promise<void>;
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
      let unsubFirestore: (() => void) | null = null;
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (cancelled) return;
        unsubFirestore?.();
        unsubFirestore = null;
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }
        setLoading(true);
        setError(null);
        unsubFirestore = subscribeAppUser(
          firebaseUser,
          (appUser) => {
            if (!cancelled) setUser(appUser);
            if (!cancelled) setLoading(false);
          },
          (msg) => {
            if (!cancelled) setError(msg);
            if (!cancelled) setLoading(false);
          }
        );
      });
      return () => {
        cancelled = true;
        unsubFirestore?.();
        unsubscribe();
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Firebase 설정을 확인해 주세요.';
      setError(message);
      setLoading(false);
      return undefined;
    }
  }, []);

  const signInWithGoogle = useCallback(async (rememberMe = true) => {
    setError(null);
    try {
      const appUser = await authSignInWithGoogle(rememberMe);
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
      clearNotifiedIds();
      setUser(null);
      // Electron: 다음 로그인 시 계정 선택이 되도록 Google/Firebase 쿠키 삭제
      if (typeof window !== 'undefined' && window.electronAPI?.clearAuthCookies) {
        await window.electronAPI.clearAuthCookies(getAuthDomain()).catch(() => {});
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : '로그아웃에 실패했습니다.';
      setError(message);
    }
  }, []);

  const updateProfilePhotoUrl = useCallback((url: string | null) => {
    setUser((prev) => (prev ? { ...prev, photoURL: url } : null));
  }, []);

  const deleteProfilePhotoAndUpdate = useCallback(async () => {
    const u = user;
    if (!u) return;
    setError(null);
    try {
      await deleteProfilePhoto(u.uid);
      await updateAuthProfilePhoto(null);
      await updateUserPhotoURLInFirestore(u.uid, null);
      setUser((prev) => (prev ? { ...prev, photoURL: null } : null));
    } catch (e) {
      const message = e instanceof Error ? e.message : '프로필 사진 삭제에 실패했습니다.';
      setError(message);
    }
  }, [user]);

  return { user, loading, error, signInWithGoogle, signOut, clearError, updateProfilePhotoUrl, deleteProfilePhotoAndUpdate };
}
