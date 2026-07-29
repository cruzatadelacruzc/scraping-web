import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth';
import { normalizeError } from '@/shared/api/errors';
import { Button, Form, FormInputField } from '@/shared/ui/forms';
import { changePasswordSchema, type ChangePasswordDTO } from '../validation/auth-schemas';

export function ChangePasswordForm() {
  const { t } = useTranslation(['profile', 'auth']);
  const { changePassword } = useAuth();
  const form = useForm<ChangePasswordDTO>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onBlur',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast.success(t('changePassword.success'));
      form.reset();
    } catch (e) {
      toast.error(normalizeError(e).message || t('auth:errors.generic'));
    }
  });

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormInputField
        form={form}
        name="currentPassword"
        label={t('changePassword.current')}
        type="password"
        autoComplete="current-password"
        required
      />
      <FormInputField
        form={form}
        name="newPassword"
        label={t('changePassword.new')}
        type="password"
        autoComplete="new-password"
        required
      />
      <FormInputField
        form={form}
        name="confirmPassword"
        label={t('changePassword.confirm')}
        type="password"
        autoComplete="new-password"
        required
      />
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {t('changePassword.submit')}
      </Button>
    </Form>
  );
}
