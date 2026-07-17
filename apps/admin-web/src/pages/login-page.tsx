import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from '@features/auth/components/login-form';
import type { LoginFormValues } from '@features/auth/schemas/login.schema';
import { useIsAuthenticated, useLogin } from '@shared/auth';
import { ROUTES } from '@shared/config/routes';
import { Shield } from 'lucide-react';

interface LocationState {
  from?: string;
}

export function LoginPage(): JSX.Element {
  const login = useLogin();
  const isAuthenticated = useIsAuthenticated();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as LocationState | null)?.from ?? ROUTES.DASHBOARD;

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = useCallback(
    async (values: LoginFormValues): Promise<void> => {
      await login(values);
      navigate(from, { replace: true });
    },
    [login, navigate, from],
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="w-full max-w-sm space-y-lg">
        <div className="text-center">
          <div className="mb-md flex items-center justify-center gap-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded bg-primary-container text-on-primary-container">
              <Shield size={22} />
            </div>
            <div className="text-left">
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile leading-none tracking-tighter text-primary">
                BazaarSentinel
              </h1>
            </div>
          </div>
        </div>
        <LoginForm onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
