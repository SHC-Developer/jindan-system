import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoginForm } from './components/LoginForm';

export function LoginPage() {
  const { user, loading, error, signInWithGoogle, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light">
        <p className="text-gray-500">확인 중…</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-light px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-brand-main rounded-xl flex items-center justify-center text-white font-bold text-lg">
            A
          </div>
          <h1 className="text-xl font-bold text-brand-dark tracking-tight">
            진단 자동화 플랫폼
          </h1>
          <p className="text-sm text-gray-500">구글로 로그인하세요.</p>
        </div>
        <LoginForm
          onGoogleSignIn={signInWithGoogle}
          error={error}
          onDismissError={clearError}
        />
      </div>
    </div>
  );
}
