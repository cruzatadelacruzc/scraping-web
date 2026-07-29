import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth';
import { normalizeError } from '@/shared/api/errors';
import { Button, Form, FormInputField } from '@/shared/ui/forms';
import { loginSchema, type LoginDTO } from '../validation/auth-schemas';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
  onForgot?: () => void;
}

export function LoginForm({ onSwitchToRegister, onForgot }: LoginFormProps) {
  const { t } = useTranslation(['auth', 'common']);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginDTO>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.username, values.password);
      toast.success(t('login.success'));
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/dashboard', { replace: true });
    } catch (e) {
      toast.error(normalizeError(e).message || t('errors.generic'));
    }
  });

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormInputField
        form={form}
        name="username"
        label={t('login.usernameLabel')}
        type="text"
        autoComplete="username"
        required
      />
      <FormInputField
        form={form}
        name="password"
        label={t('login.passwordLabel')}
        type="password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {t('login.submit')}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onForgot}
          className="text-on-surface-variant transition-colors hover:text-on-surface"
        >
          {t('login.forgot')}
        </button>
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-on-surface-variant transition-colors hover:text-on-surface"
        >
          {t('login.noAccount')} {t('common:actions.register')}
        </button>
      </div>
    </Form>
  );
}
