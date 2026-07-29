import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VerifyEmailView } from '../components/VerifyEmailView';

export default function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const resolvedToken = token ?? searchParams.get('token') ?? undefined;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold text-on-surface">{t('verify.title')}</h1>
      <VerifyEmailView token={resolvedToken} />
      <Link
        to="/login"
        className="block text-center text-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        {t('forgot.backToLogin')}
      </Link>
    </div>
  );
}
