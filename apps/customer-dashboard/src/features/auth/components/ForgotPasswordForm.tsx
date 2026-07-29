import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth';
import { normalizeError } from '@/shared/api/errors';
import { Button, Form, FormInputField } from '@/shared/ui/forms';
import { forgotPasswordSchema, type ForgotPasswordDTO } from '../validation/auth-schemas';

export function ForgotPasswordForm() {
  const { t } = useTranslation(['auth', 'common']);
  const { forgotPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordDTO>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await forgotPassword(values.email);
      // Always show the neutral success state (no account enumeration).
      setSent(true);
    } catch (e) {
      toast.error(normalizeError(e).message || t('errors.generic'));
    }
  });

  if (sent) {
    return (
      <p className="text-sm text-on-surface-variant" role="status">
        {t('forgot.sent')}
      </p>
    );
  }

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormInputField
        form={form}
        name="email"
        label={t('forgot.emailLabel')}
        type="email"
        autoComplete="email"
        required
      />
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {t('forgot.submit')}
      </Button>
    </Form>
  );
}
