import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { authAPI } from '../services/api';
import { errorMessage } from '../lib/errors';
import AuthShell from '../components/auth/AuthShell';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : t('verifyEmail.noToken'));

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    authAPI.verifyEmail(token)
      .then(() => { if (!cancelled) setStatus('success'); })
      .catch((err) => { if (!cancelled) { setStatus('error'); setMessage(errorMessage(err, t('verifyEmail.failed'))); } });
    return () => { cancelled = true; };
  }, [token, t]);

  return (
    <AuthShell>
      <div role="status" aria-live="polite">
        {status === 'loading' && (
          <>
            <Loader2 size={28} className="animate-spin text-brand mb-4" aria-hidden />
            <h1 className="text-2xl font-semibold">{t('verifyEmail.checking')}</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="h-11 w-11 rounded-full bg-credit-soft text-credit grid place-items-center mb-4"><CheckCircle2 size={22} aria-hidden /></div>
            <h1 className="text-2xl font-semibold">{t('verifyEmail.doneTitle')}</h1>
            <p className="text-ink-2 mt-2">{t('verifyEmail.doneHint')}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="h-11 w-11 rounded-full bg-debit-soft text-debit grid place-items-center mb-4"><XCircle size={22} aria-hidden /></div>
            <h1 className="text-2xl font-semibold">{t('verifyEmail.failedTitle')}</h1>
            <p className="text-ink-2 mt-2">{message}</p>
          </>
        )}
      </div>
      {status !== 'loading' && (
        <Link to="/login" className="mt-7 inline-flex w-full justify-center items-center h-12 rounded-control bg-brand text-on-brand font-medium hover:bg-brand-strong">
          {t('register.goToSignIn')}
        </Link>
      )}
    </AuthShell>
  );
};

export default VerifyEmail;
