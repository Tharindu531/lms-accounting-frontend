import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Mail, Phone, AlertCircle, CheckCircle2, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import useAuth from '../context/useAuth';
import { batchAPI, authAPI } from '../services/api';
import { unwrap } from '../lib/queryClient';
import { errorMessage } from '../lib/errors';
import PhoneInput from '../components/PhoneInput';
import AuthShell from '../components/auth/AuthShell';
import OtpInput from '../components/auth/OtpInput';
import Button from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/primitives';
import { cn } from '../lib/cn';

const Register = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const batches = useQuery({ queryKey: ['batches', 'active'], queryFn: () => batchAPI.getActive().then(unwrap), staleTime: 10 * 60_000 });

  const [method, setMethod] = useState('email');
  const [form, setForm] = useState({ email: '', phone: '', password: '', firstName: '', lastName: '', batch: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form');   // form | otp | done
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), password: form.password, batch: parseInt(form.batch, 10) };
      if (method === 'email') data.email = form.email.trim(); else data.phone = form.phone;
      await register(data);
      if (method === 'phone') { setStep('otp'); setCooldown(60); } else setStep('done');
    } catch (err) {
      setError(errorMessage(err, t('register.failed')));
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.verifyPhone({ phone: form.phone, otp });
      setStep('done');
    } catch (err) {
      setError(errorMessage(err, t('auth.codeFailed')));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try { await authAPI.resendPhoneOtp(form.phone); setCooldown(60); setOtp(''); toast.success(t('auth.codeSent')); }
    catch (err) { toast.error(errorMessage(err)); }
  };

  const ErrorLine = error ? (
    <div role="alert" className="flex items-start gap-2 rounded-control bg-debit-soft text-debit text-sm px-3 py-2.5">
      <AlertCircle size={18} className="shrink-0 mt-px" aria-hidden /> <span>{error}</span>
    </div>
  ) : null;

  if (step === 'done') {
    return (
      <AuthShell hero="register">
        <div className="h-11 w-11 rounded-full bg-credit-soft text-credit grid place-items-center mb-4"><CheckCircle2 size={22} aria-hidden /></div>
        <h1 className="text-2xl font-semibold">{t('register.doneTitle')}</h1>
        <p className="text-ink-2 mt-2">
          {method === 'email' ? <>{t('register.doneEmail')} <span className="text-ink font-medium">{form.email}</span>.</> : t('register.donePhone')}
        </p>
        {method === 'email' && <p className="text-sm text-ink-3 mt-3">{t('register.doneEmailHint')}</p>}
        <Link to="/login" className="mt-7 inline-flex w-full justify-center items-center h-12 rounded-control bg-brand text-on-brand font-medium hover:bg-brand-strong">
          {t('register.goToSignIn')}
        </Link>
      </AuthShell>
    );
  }

  if (step === 'otp') {
    return (
      <AuthShell hero="register">
        <div className="h-11 w-11 rounded-full bg-brand-soft text-brand grid place-items-center mb-4"><ShieldCheck size={22} aria-hidden /></div>
        <h1 className="text-2xl font-semibold">{t('auth.verifyTitle')}</h1>
        <p className="text-ink-2 mt-1.5 mb-6">{t('auth.verifySent')} <span className="text-ink font-medium tabular">{form.phone}</span></p>
        <form onSubmit={verify} className="space-y-5">
          {ErrorLine}
          <OtpInput value={otp} onChange={setOtp} disabled={loading} />
          <Button type="submit" size="lg" className="w-full justify-center" loading={loading} disabled={otp.length !== 6}>{t('register.verify')}</Button>
        </form>
        <div className="flex items-center justify-between mt-5 text-sm">
          <span className="text-ink-3">{t('register.codeExpires')}</span>
          <button type="button" onClick={resend} disabled={cooldown > 0} className="text-brand font-medium disabled:text-ink-3">
            {cooldown > 0 ? t('auth.resendIn', { s: cooldown }) : t('auth.resendCode')}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell hero="register" wide>
      <h1 className="text-2xl font-semibold">{t('register.title')}</h1>
      <p className="text-ink-2 mt-1.5 mb-6">{t('register.lead')}</p>

      <div role="tablist" aria-label={t('register.with')} className="grid grid-cols-2 p-1 rounded-control bg-sunken mb-5">
        {[['email', Mail, t('auth.email')], ['phone', Phone, t('auth.phone')]].map(([m, Icon, label]) => (
          <button key={m} role="tab" type="button" aria-selected={method === m} onClick={() => { setMethod(m); setError(''); }}
            className={cn('h-9 rounded-[8px] inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors',
              method === m ? 'bg-surface text-ink shadow-panel' : 'text-ink-2 hover:text-ink')}>
            <Icon size={16} aria-hidden /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {ErrorLine}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('register.firstName')} required>{(p) => <Input {...p} autoComplete="given-name" value={form.firstName} onChange={set('firstName')} className="h-11" />}</Field>
          <Field label={t('register.lastName')} required>{(p) => <Input {...p} autoComplete="family-name" value={form.lastName} onChange={set('lastName')} className="h-11" />}</Field>
        </div>
        {method === 'email' ? (
          <Field label={t('auth.email')} required>{(p) => <Input {...p} type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" className="h-11" />}</Field>
        ) : (
          <Field label={t('auth.phoneNumber')} required hint={t('register.phoneHint')}>{(p) => <PhoneInput id={p.id} required onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />}</Field>
        )}
        <Field label={t('auth.password')} required hint={t('register.passwordHint')}>
          {(p) => (
            <div className="relative">
              <Input {...p} type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={6} value={form.password} onChange={set('password')} className="h-11 pr-11" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 grid place-items-center text-ink-3 hover:text-ink rounded-[8px]">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}
        </Field>
        <Field label={t('register.batch')} required hint={t('register.batchHint')}>
          {(p) => (
            <Select {...p} value={form.batch} onChange={set('batch')} disabled={batches.isPending} className="h-11">
              <option value="">{batches.isPending ? t('common.loading') : t('register.chooseBatch')}</option>
              {(batches.data ?? []).map((b) => <option key={b.id} value={b.batchNumber}>{b.name}</option>)}
            </Select>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full justify-center" loading={loading}>{t('register.create')}</Button>
      </form>

      <p className="mt-6 text-sm text-ink-2">
        {t('register.haveAccount')}{' '}
        <Link to="/login" className="text-brand font-medium hover:underline underline-offset-4">{t('auth.signIn')}</Link>
      </p>
    </AuthShell>
  );
};

export default Register;
