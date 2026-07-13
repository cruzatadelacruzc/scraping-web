import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import type { LoginFormValues } from '../schemas/login.schema';
import { loginSchema } from '../schemas/login.schema';

interface Props {
  onSubmit: (values: LoginFormValues) => Promise<void>;
}

export function LoginForm({ onSubmit }: Props): JSX.Element {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const submit = async (values: LoginFormValues): Promise<void> => {
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.loginFailed'));
    }
  };

  const onFormSubmit = handleSubmit(submit);

  return (
    <form onSubmit={(e) => void onFormSubmit(e)} className="w-full max-w-sm space-y-md">
      {error && (
        <div className="rounded-md border border-danger bg-danger-muted p-sm text-sm text-danger">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="username" className="mb-xs block text-label-md font-mono text-on-surface-variant">
          {t('auth.emailOrUsername')}
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          {...register('username')}
          className="w-full rounded-md border border-outline-variant bg-surface-container-low p-sm text-sm text-on-surface placeholder:text-muted focus:border-primary focus:outline-none"
          placeholder={t('auth.emailPlaceholder')}
        />
        {errors.username && <p className="mt-xs text-body-sm text-danger">{errors.username.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="mb-xs block text-label-md font-mono text-on-surface-variant">
          {t('auth.password')}
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="w-full rounded-md border border-outline-variant bg-surface-container-low p-sm text-sm text-on-surface placeholder:text-muted focus:border-primary focus:outline-none"
          placeholder={t('auth.passwordPlaceholder')}
        />
        {errors.password && (
          <p className="mt-xs text-body-sm text-danger">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary-container p-sm text-sm font-semibold text-on-primary-container transition-colors hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
      </button>
    </form>
  );
}
