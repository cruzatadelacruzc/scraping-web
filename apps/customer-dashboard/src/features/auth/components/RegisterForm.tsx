import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth';
import { normalizeError } from '@/shared/api/errors';
import { Button, Form, FormInputField } from '@/shared/ui/forms';
import { registerSchema, type RegisterDTO } from '../validation/auth-schemas';

interface RegisterFormProps {
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSwitchToLogin }: RegisterFormProps) {
  const { t } = useTranslation(['auth', 'common']);
  const { register } = useAuth();
  const navigate = useNavigate();
  const form = useForm<RegisterDTO>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: { displayName: '', email: '', username: '', password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await register({
        email: values.email,
        username: values.username,
        password: values.password,
        displayName: values.displayName || undefined,
      });
      toast.success(t('register.success'));
      navigate('/dashboard', { replace: true });
    } catch (e) {
      toast.error(normalizeError(e).message || t('errors.generic'));
    }
  });

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormInputField
        form={form}
        name="displayName"
        label={t('register.displayNameLabel')}
        type="text"
        autoComplete="name"
      />
      <FormInputField
        form={form}
        name="email"
        label={t('register.emailLabel')}
        type="email"
        autoComplete="email"
        required
      />
      <FormInputField
        form={form}
        name="username"
        label={t('register.usernameLabel')}
        type="text"
        autoComplete="username"
        required
      />
      <FormInputField
        form={form}
        name="password"
        label={t('register.passwordLabel')}
        type="password"
        autoComplete="new-password"
        description={t('common:validation.passwordStrength')}
        required
      />
      <FormInputField
        form={form}
        name="confirmPassword"
        label={t('register.confirmLabel')}
        type="password"
        autoComplete="new-password"
        required
      />
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {t('register.submit')}
      </Button>
      <div className="text-center text-sm">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-on-surface-variant transition-colors hover:text-on-surface"
        >
          {t('register.hasAccount')} {t('common:actions.enter')}
        </button>
      </div>
    </Form>
  );
}
