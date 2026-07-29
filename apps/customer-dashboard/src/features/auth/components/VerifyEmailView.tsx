import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '@/shared/auth';
import { normalizeError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/forms';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface VerifyEmailViewProps {
  token?: string;
}

export function VerifyEmailView({ token }: VerifyEmailViewProps) {
  const { t } = useTranslation(['auth', 'common']);
  const { verifyEmail, resendVerification } = useAuth();
  const [status, setStatus] = useState<Status>(token ? 'loading' : 'idle');
  const [resending, setResending] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token, verifyEmail]);

  const onResend = async () => {
    setResending(true);
    try {
      await resendVerification();
      toast.success(t('verify.resent'));
    } catch (e) {
      toast.error(normalizeError(e).message || t('errors.generic'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-4 text-sm text-on-surface-variant" role="status" aria-live="polite">
      {status === 'loading' && <p>{t('verify.verifying')}</p>}
      {status === 'success' && <p className="text-success">{t('verify.success')}</p>}
      {status === 'error' && <p className="text-destructive">{t('verify.error')}</p>}
      {(status === 'idle' || status === 'error') && (
        <>
          <p>{t('verify.checkInbox')}</p>
          <Button type="button" variant="outline" onClick={onResend} disabled={resending}>
            {t('verify.resend')}
          </Button>
        </>
      )}
    </div>
  );
}
