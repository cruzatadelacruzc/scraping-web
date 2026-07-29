import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth, useCurrentUser } from '@/shared/auth';
import { normalizeError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/forms';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { ChangeEmailForm } from '../components/ChangeEmailForm';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-outline-variant bg-surface-container p-5">
      <h2 className="mb-4 text-base font-semibold text-on-surface">{title}</h2>
      {children}
    </section>
  );
}

export default function SecuritySettingsPage() {
  const { t } = useTranslation(['profile', 'auth']);
  const user = useCurrentUser();
  const { resendVerification } = useAuth();
  const [resending, setResending] = useState(false);

  const onResend = async () => {
    setResending(true);
    try {
      await resendVerification();
      toast.success(t('verification.resent'));
    } catch (e) {
      toast.error(normalizeError(e).message || t('auth:errors.generic'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-on-surface">{t('title')}</h1>
        <p className="text-sm text-on-surface-variant">{t('subtitle')}</p>
      </header>

      <Card title={t('changePassword.title')}>
        <ChangePasswordForm />
      </Card>

      <Card title={t('changeEmail.title')}>
        <ChangeEmailForm />
      </Card>

      <Card title={t('verification.title')}>
        {user?.emailVerified ? (
          <p className="text-sm text-success">{t('verification.verified')}</p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-on-surface-variant">{t('verification.unverified')}</p>
            <Button type="button" variant="outline" onClick={onResend} disabled={resending}>
              {t('verification.resend')}
            </Button>
          </div>
        )}
      </Card>

      <Card title={t('providers.title')}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">{t('providers.none')}</p>
          <Button type="button" variant="outline" disabled>
            {t('providers.linkSoon')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
