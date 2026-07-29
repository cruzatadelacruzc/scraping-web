import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth';
import { normalizeError } from '@/shared/api/errors';
import { Button, Form, FormInputField } from '@/shared/ui/forms';
import { changeEmailSchema, type ChangeEmailDTO } from '../validation/auth-schemas';

export function ChangeEmailForm() {
  const { t } = useTranslation(['profile', 'auth']);
  const { changeEmail } = useAuth();
  const form = useForm<ChangeEmailDTO>({
    resolver: zodResolver(changeEmailSchema),
    mode: 'onBlur',
    defaultValues: { newEmail: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await changeEmail(values.newEmail, values.password);
      toast.success(t('changeEmail.success'));
      form.reset();
    } catch (e) {
      toast.error(normalizeError(e).message || t('auth:errors.generic'));
    }
  });

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormInputField
        form={form}
        name="newEmail"
        label={t('changeEmail.new')}
        type="email"
        autoComplete="email"
        required
      />
      <FormInputField
        form={form}
        name="password"
        label={t('changeEmail.password')}
        type="password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {t('changeEmail.submit')}
      </Button>
    </Form>
  );
}
