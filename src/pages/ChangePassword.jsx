import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { KeyRound, AlertCircle } from 'lucide-react';
import useAuth from '../context/useAuth';
import { errorMessage } from '../lib/errors';
import { homeFor } from '../lib/routes';
import AuthShell from '../components/auth/AuthShell';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/primitives';

const ChangePassword = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading, changePassword, requirePasswordChange } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!authLoading && !user) return <Navigate to="/login" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (next.length < 6) return setError(t('changePassword.tooShort'));
    if (next !== confirm) return setError(t('changePassword.noMatch'));
    if (next === current) return setError(t('changePassword.same'));
    setLoading(true);
    try {
      const u = await changePassword(current, next);
      toast.success(t('changePassword.changed'));
      navigate(homeFor(u ?? user), { replace: true });
    } catch (err) {
      setError(errorMessage(err, t('changePassword.failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <div className="h-11 w-11 rounded-full bg-brand-soft text-brand grid place-items-center mb-4"><KeyRound size={22} aria-hidden /></div>
      <h1 className="text-2xl font-semibold">{requirePasswordChange ? t('changePassword.requiredTitle') : t('account.changePassword')}</h1>
      <p className="text-ink-2 mt-1.5 mb-6">{requirePasswordChange ? t('changePassword.requiredLead') : t('changePassword.lead')}</p>
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-control bg-debit-soft text-debit text-sm px-3 py-2.5">
            <AlertCircle size={18} className="shrink-0 mt-px" aria-hidden /> <span>{error}</span>
          </div>
        )}
        <Field label={requirePasswordChange ? t('changePassword.temporary') : t('changePassword.current')} required>
          {(p) => <Input {...p} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-11" />}
        </Field>
        <Field label={t('changePassword.new')} required hint={t('register.passwordHint')}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" minLength={6} value={next} onChange={(e) => setNext(e.target.value)} className="h-11" />}
        </Field>
        <Field label={t('changePassword.confirm')} required>
          {(p) => <Input {...p} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />}
        </Field>
        <Button type="submit" size="lg" className="w-full justify-center" loading={loading}>{t('changePassword.save')}</Button>
      </form>
      {!requirePasswordChange && user && (
        <Link to={homeFor(user)} className="mt-5 inline-block text-sm text-ink-2 hover:text-ink">{t('common.cancel')}</Link>
      )}
    </AuthShell>
  );
};

export default ChangePassword;
