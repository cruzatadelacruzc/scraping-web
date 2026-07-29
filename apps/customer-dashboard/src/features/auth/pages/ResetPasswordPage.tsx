import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ResetPasswordForm } from '../components/ResetPasswordForm';

export default function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const resolvedToken = token ?? searchParams.get('token') ?? '';

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-on-surface">{t('reset.title')}</h1>
      {resolvedToken ? (
        <ResetPasswordForm token={resolvedToken} />
      ) : (
        <p className="text-sm text-destructive">{t('reset.invalidToken')}</p>
      )}
    </div>
  );
}
