import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@features/auth/components/login-form';
import type { LoginFormValues } from '@features/auth/schemas/login.schema';
import { useIsAuthenticated, useLogin } from '@shared/auth';
import { ROUTES } from '@shared/config/routes';

export function LoginPage(): JSX.Element {
  const { t } = useTranslation();
  const login = useLogin();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate(ROUTES.DASHBOARD, { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = useCallback(
    async (values: LoginFormValues): Promise<void> => {
      await login(values);
      navigate(ROUTES.DASHBOARD, { replace: true });
    },
    [login, navigate],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm space-y-lg">
        <div className="text-center">
          <h1 className="text-headline-lg text-on-surface">{t('auth.title')}</h1>
          <p className="mt-sm text-body-md text-on-surface-variant">{t('auth.subtitle')}</p>
        </div>
        <LoginForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
