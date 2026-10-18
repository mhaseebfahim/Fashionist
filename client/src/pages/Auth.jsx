import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button, Field, Img, Logo } from '../components/ui.jsx';
import { login, register, setUser } from '../features/store.js';
import { authService } from '../services/index.js';
import { TOKEN_KEY } from '../services/api.js';
import { IMG } from '../services/mock/seedData.js';
import { PHONE_RE } from '../utils/rules.js';

const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PW_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

function Shell({ title, image, children }) {
  const { t } = useTranslation();
  return (
    <div className="grid min-h-[calc(100vh-110px)] lg:grid-cols-2">
      <div className="relative hidden bg-ink lg:block">
        <Img src={image} alt="" eager className="absolute inset-0 opacity-80" />
        <div className="absolute inset-x-10 bottom-12 text-ivory">
          <p className="label text-gold">Fashionist</p>
          <p className="mt-3 font-display text-6xl italic">{t('brand.tagline')}</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-16 sm:px-10">
        <div className="w-full max-w-md">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-5xl">{title}</h1>
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, error, label, autoComplete = 'current-password' }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} className={`input pe-16 ${error ? 'input-error' : ''}`} />
        <button type="button" onClick={() => setShow(!show)} className="label absolute end-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">{show ? t('auth.hide') : t('auth.show')}</button>
      </div>
    </Field>
  );
}

function useForm(initial, rules) {
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState({});
  const errors = Object.fromEntries(Object.entries(rules).map(([k, fn]) => [k, fn(v[k], v)]).filter(([, e]) => e));
  const bind = (k) => ({ value: v[k], onChange: (e) => setV({ ...v, [k]: e.target.value }), onBlur: () => setTouched({ ...touched, [k]: true }) });
  const err = (k) => (touched[k] || touched._all ? errors[k] : undefined);
  const check = () => (setTouched({ _all: true }), !Object.keys(errors).length);
  return { v, bind, err, check };
}

export function Login() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const f = useForm({ email: '', password: '' }, { email: (x) => !EMAIL_RE.test(x) && t('errors.email'), password: (x) => !x && t('errors.required') });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.check()) return;
    setLoading(true);
    try {
      const { user } = await dispatch(login(f.v)).unwrap();
      toast.success(t('account.hello', { name: user.name.split(' ')[0] }));
      nav(sp.get('next') || (user.role === 'admin' ? '/admin' : '/account'), { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell title={t('auth.welcome')} image={IMG.w2}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label={t('auth.email')} error={f.err('email')}><input type="email" autoComplete="email" className="input" {...f.bind('email')} /></Field>
        <PasswordInput label={t('auth.password')} error={f.err('password')} {...f.bind('password')} />
        <div className="text-end"><Link to="/forgot-password" className="text-xs underline">{t('auth.forgot')}</Link></div>
        <Button type="submit" loading={loading} className="w-full">{t('auth.login')}</Button>
      </form>
      <p className="mt-8 text-sm text-muted">{t('auth.noAccount')} <Link to="/register" className="text-fg underline">{t('auth.register')}</Link></p>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{t('auth.demo')}</p>
    </Shell>
  );
}

export function Register() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const f = useForm(
    { name: '', email: '', phone: '', password: '' },
    { name: (x) => x.trim().length < 2 && t('errors.required'), email: (x) => !EMAIL_RE.test(x) && t('errors.email'), phone: (x) => !PHONE_RE.test(x) && t('errors.phone'), password: (x) => !PW_RE.test(x) && t('errors.password') }
  );
  const submit = async (e) => {
    e.preventDefault();
    if (!f.check()) return;
    setLoading(true);
    try {
      await dispatch(register(f.v)).unwrap();
      toast.success('Welcome to Fashionist ◆');
      nav('/account', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell title={t('auth.join')} image={IMG.m1}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label={t('auth.name')} error={f.err('name')}><input className="input" autoComplete="name" {...f.bind('name')} /></Field>
        <Field label={t('auth.email')} error={f.err('email')}><input type="email" className="input" autoComplete="email" {...f.bind('email')} /></Field>
        <Field label={t('auth.phone')} error={f.err('phone')}><input inputMode="numeric" maxLength={11} placeholder="03XXXXXXXXX" className="input" autoComplete="tel" {...f.bind('phone')} /></Field>
        <PasswordInput label={t('auth.password')} error={f.err('password')} autoComplete="new-password" {...f.bind('password')} />
        <Button type="submit" loading={loading} className="w-full">{t('auth.register')}</Button>
      </form>
      <p className="mt-8 text-sm text-muted">{t('auth.haveAccount')} <Link to="/login" className="text-fg underline">{t('auth.login')}</Link></p>
    </Shell>
  );
}

export function ForgotPassword() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(null);
  const f = useForm({ email: '' }, { email: (x) => !EMAIL_RE.test(x) && t('errors.email') });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.check()) return;
    setLoading(true);
    try {
      const r = await authService.forgot(f.v.email);
      setSent(r);
      toast.success(r.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell title={t('auth.reset')} image={IMG.w3}>
      {sent ? (
        <div className="space-y-4 text-sm">
          <p>{sent.message}</p>
          {sent.devToken && <Link to={`/reset-password/${sent.devToken}`} className="underline">Open demo reset link →</Link>}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Field label={t('auth.email')} error={f.err('email')}><input type="email" className="input" {...f.bind('email')} /></Field>
          <Button type="submit" loading={loading} className="w-full">{t('auth.sendLink')}</Button>
        </form>
      )}
    </Shell>
  );
}

export function ResetPassword() {
  const { token } = useParams();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const f = useForm({ password: '' }, { password: (x) => !PW_RE.test(x) && t('errors.password') });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.check()) return;
    setLoading(true);
    try {
      const r = await authService.reset(token, f.v.password);
      localStorage.setItem(TOKEN_KEY, r.token);
      dispatch(setUser(r.user));
      toast.success('Password updated');
      nav('/account', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell title={t('auth.reset')} image={IMG.w3}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <PasswordInput label={t('auth.newPassword')} error={f.err('password')} autoComplete="new-password" {...f.bind('password')} />
        <Button type="submit" loading={loading} className="w-full">{t('auth.reset')}</Button>
      </form>
    </Shell>
  );
}
