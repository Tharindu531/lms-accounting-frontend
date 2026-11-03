import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import useAuth from '../context/useAuth';
import { authAPI } from '../services/api';
import PhoneInput from '../components/PhoneInput';
import AuthShell from '../components/auth/AuthShell';
import OtpInput from '../components/auth/OtpInput';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/primitives';
import { errorMessage } from '../lib/errors';
import { cn } from '../lib/cn';
import { homeFor } from '../lib/routes';

const useCooldown = () => {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, () => setLeft(60)];
};

const Login = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState('login');
  const [method, setMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [cooldown, startCooldown] = useCooldown();

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const goOn = (result) => {
    if (result.requirePasswordChange) return navigate('/change-password');
    const from = location.state?.from;
    navigate(from && from !== '/login' && result.user?.userType === 'STUDENT' ? from : homeFor(result.user), { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(method === 'email' ? { email, password } : { phone, password });
      if (result.phoneVerificationRequired) {
        setStep('otp');
        startCooldown();
      } else {
        goOn(result);
      }
    } catch (err) {
      setError(errorMessage(err, t('auth.signInFailed')));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (otp.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      await authAPI.verifyPhone({ phone, otp });
      goOn(await login({ phone, password }));
    } catch (err) {
      setError(errorMessage(err, t('auth.codeFailed')));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await authAPI.resendPhoneOtp(phone);
      startCooldown();
      toast.success(t('auth.codeSent'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const ErrorLine = error ? (
    <div role="alert" className="flex items-start gap-2 rounded-control bg-debit-soft text-debit text-sm px-3 py-2.5">
      <AlertCircle size={18} className="shrink-0 mt-px" aria-hidden /> <span>{error}</span>
    </div>
  ) : null;

  if (step === 'otp') {
    return (
      <AuthShell>
        <div className="h-11 w-11 rounded-full bg-brand-soft text-brand grid place-items-center mb-4"><ShieldCheck size={22} aria-hidden /></div>
        <h1 className="text-2xl font-semibold">{t('auth.verifyTitle')}</h1>
        <p className="text-ink-2 mt-1.5 mb-6">{t('auth.verifySent')} <span className="text-ink font-medium tabular">{phone}</span></p>
        <form onSubmit={verify} className="space-y-5">
          {ErrorLine}
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          <Button type="submit" size="lg" className="w-full justify-center" loading={loading} disabled={otp.length !== 6}>
            {t('auth.verifyAndSignIn')}
          </Button>
        </form>
        <div className="flex items-center justify-between mt-5 text-sm">
          <button type="button" onClick={() => { setStep('login'); setOtp(''); setError(''); }} className="text-ink-2 hover:text-ink">
            {t('auth.backToSignIn')}
          </button>
          <button type="button" onClick={resend} disabled={cooldown > 0} className="text-brand font-medium disabled:text-ink-3">
            {cooldown > 0 ? t('auth.resendIn', { s: cooldown }) : t('auth.resendCode')}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold">{t('auth.signInTitle')}</h1>
      <p className="text-ink-2 mt-1.5 mb-6">{t('auth.signInLead')}</p>

      <div role="tablist" aria-label={t('auth.signInWith')} className="grid grid-cols-2 p-1 rounded-control bg-sunken mb-5">
        {[['email', Mail, t('auth.email')], ['phone', Phone, t('auth.phone')]].map(([m, Icon, label]) => (
          <button key={m} role="tab" type="button" aria-selected={method === m}
            onClick={() => { setMethod(m); setError(''); }}
            className={cn('h-9 rounded-[8px] inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors',
              method === m ? 'bg-surface text-ink shadow-panel' : 'text-ink-2 hover:text-ink')}>
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {ErrorLine}
        {method === 'email' ? (
          <Field label={t('auth.email')}>
            {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-11" />}
          </Field>
        ) : (
          <Field label={t('auth.phoneNumber')}>
            {(p) => <PhoneInput id={p.id} onChange={setPhone} required />}
          </Field>
        )}
        <Field label={t('auth.password')}>
          {(p) => (
            <div className="relative">
              <Input {...p} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
                onChange={(e) => setPassword(e.target.value)} required className="h-11 pr-11" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center text-ink-3 hover:text-ink rounded-[8px]">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full justify-center" loading={loading}>{t('auth.signIn')}</Button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="text-brand font-medium hover:underline underline-offset-4">{t('auth.createAccount')}</Link>
      </p>
    </AuthShell>
  );
};

export default Login;
