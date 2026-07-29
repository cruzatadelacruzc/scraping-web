import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

interface AuthModalProps {
  mode: 'login' | 'register';
}

/** Lightweight, dependency-free modal hosting login/register over the landing. */
export function AuthModal({ mode }: AuthModalProps) {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);

  // Preserve `state.from` (set by ProtectedRoute) when switching login↔register.
  const state = location.state;
  const close = () => navigate('/', { replace: true });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    cardRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const title = mode === 'login' ? t('login.title') : t('register.title');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t('common:actions.close')}
        onClick={close}
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container p-6 shadow-elevation-3 outline-none"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={t('common:actions.close')}
            className="rounded p-1 text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {mode === 'login' ? (
          <LoginForm
            onSwitchToRegister={() => navigate('/register', { state, replace: true })}
            onForgot={() => navigate('/forgot-password')}
          />
        ) : (
          <RegisterForm onSwitchToLogin={() => navigate('/login', { state, replace: true })} />
        )}
      </div>
    </div>
  );
}
