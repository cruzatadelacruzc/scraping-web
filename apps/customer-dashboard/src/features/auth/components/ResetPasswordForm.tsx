import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth';
import { normalizeError } from '@/shared/api/errors';
import { Button, Form, FormInputField } from '@/shared/ui/forms';
import { resetPasswordSchema, type ResetPasswordDTO } from '../validation/auth-schemas';

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const { t } = useTranslation(['auth', 'common']);
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const form = useForm<ResetPasswordDTO>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await resetPassword(token, values.password);
      toast.success(t('reset.success'));
      navigate('/login', { replace: true });
    } catch (e) {
      toast.error(normalizeError(e).message || t('reset.invalidToken'));
    }
  });

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormInputField
        form={form}
        name="password"
        label={t('reset.passwordLabel')}
        type="password"
        autoComplete="new-password"
        required
      />
      <FormInputField
        form={form}
        name="confirmPassword"
        label={t('reset.confirmLabel')}
        type="password"
        autoComplete="new-password"
        required
      />
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {t('reset.submit')}
      </Button>
    </Form>
  );
}
