import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Button, Field, Img, Logo, useMeta } from '../components/ui.jsx';
import { login, register, setUser } from '../features/store.js';
import { authService } from '../services/index.js';
import { TOKEN_KEY } from '../services/api.js';
import { IMG } from '../services/mock/seedData.js';
import { PHONE_RE } from '../utils/rules.js';

const PW_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const BASIC_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Auth flags from the API (OTP on/off, Google on/off, allowed domains). Cached for the session. */
let configCache;
function useAuthConfig() {
  const [cfg, setCfg] = useState(configCache || { emailVerification: false, googleEnabled: false, allowedEmailDomains: ['gmail.com', 'outlook.com'] });
  useEffect(() => {
    if (!configCache) authService.config().then((c) => setCfg((configCache = c))).catch(() => {});
  }, []);
  return cfg;
}
/** Mirrors server/config/env.js isAllowedEmail. */
export const isAllowedEmail = (email, domains) => {
  const m = String(email).trim().toLowerCase().match(/^([a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?)@([a-z0-9.-]+)$/);
  return !!m && !m[1].includes('..') && domains.includes(m[2]);
};

function Shell({ title, image, children }) {
  const { t } = useTranslation();
  useMeta(title);
  return (
    <div className="grid min-h-[calc(100vh-110px)] lg:grid-cols-2">
      <div className="relative hidden bg-ink lg:block">
        <Img src={image} alt="" eager w={900} h={1200} className="absolute inset-0 opacity-80" />
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

function PasswordInput({ value, onChange, onBlur, error, label, autoComplete = 'current-password', id }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} onBlur={onBlur} autoComplete={autoComplete} aria-invalid={!!error} className={`input pe-16 ${error ? 'input-error' : ''}`} />
        <button type="button" onClick={() => setShow(!show)} aria-pressed={show} className="label absolute end-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">{show ? t('auth.hide') : t('auth.show')}</button>
      </div>
    </Field>
  );
}

function useForm(initial, rules) {
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState({});
  const errors = Object.fromEntries(Object.entries(rules).map(([k, fn]) => [k, fn(v[k], v)]).filter(([, e]) => e));
  const bind = (k) => ({ value: v[k], onChange: (e) => setV({ ...v, [k]: e.target.value }), onBlur: () => setTouched((x) => ({ ...x, [k]: true })) });
  const err = (k) => (touched[k] || touched._all ? errors[k] : undefined);
  const check = () => (setTouched({ _all: true }), !Object.keys(errors).length);
  return { v, setV, bind, err, check };
}

/** "Continue with Google" — rendered only when the API reports a Google client id. */
function GoogleButton({ clientId, onDone }) {
  const { t, i18n } = useTranslation();
  const ref = useRef(null);
  const dispatch = useDispatch();
  useEffect(() => {
    if (!clientId) return;
    const render = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            const r = await authService.google(credential);
            localStorage.setItem(TOKEN_KEY, r.token);
            dispatch(setUser(r.user));
            onDone(r.user);
          } catch (e) {
            toast.error(e.message);
          }
        },
      });
      window.google?.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', shape: 'rectangular', width: ref.current?.offsetWidth || 360, text: 'continue_with', locale: i18n.language });
    };
    if (window.google?.accounts) return render();
    const s = Object.assign(document.createElement('script'), { src: 'https://accounts.google.com/gsi/client', async: true, defer: true, onload: render });
    document.head.appendChild(s);
  }, [clientId, dispatch, onDone, i18n.language]);
  if (!clientId) return null;
  return (
    <div className="mt-6">
      <div className="mb-6 flex items-center gap-4 text-xs uppercase tracking-label text-muted"><span className="h-px flex-1 bg-line" />{t('auth.or')}<span className="h-px flex-1 bg-line" /></div>
      <div ref={ref} className="flex min-h-[44px] justify-center" aria-label={t('auth.google')} />
    </div>
  );
}

export function Login() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const cfg = useAuthConfig();
  const [loading, setLoading] = useState(false);
  const f = useForm({ email: '', password: '' }, { email: (x) => !BASIC_EMAIL.test(x.trim()) && t('errors.email'), password: (x) => !x && t('errors.required') });
  const done = (user) => {
    toast.success(t('account.hello', { name: user.name.split(' ')[0] }));
    nav(sp.get('next') || (user.role === 'admin' ? '/admin' : '/account'), { replace: true });
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!f.check()) return;
    setLoading(true);
    try {
      const { user } = await dispatch(login({ email: f.v.email.trim().toLowerCase(), password: f.v.password })).unwrap();
      done(user);
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        toast(err.message);
        return nav(`/verify-email?email=${encodeURIComponent(f.v.email.trim().toLowerCase())}`);
      }
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell title={t('auth.welcome')} image={IMG.suitMan}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label={t('auth.email')} error={f.err('email')}><input type="email" inputMode="email" autoComplete="email" className="input" {...f.bind('email')} /></Field>
        <PasswordInput label={t('auth.password')} error={f.err('password')} {...f.bind('password')} />
        <div className="text-end"><Link to="/forgot-password" className="text-xs underline">{t('auth.forgot')}</Link></div>
        <Button type="submit" loading={loading} className="w-full">{t('auth.login')}</Button>
      </form>
      <GoogleButton clientId={cfg.googleClientId} onDone={done} />
      <p className="mt-8 text-sm text-muted">{t('auth.noAccount')} <Link to="/register" className="text-fg underline">{t('auth.register')}</Link></p>
      <p className="mt-6 border-t border-line pt-4 text-xs text-muted">{t('auth.demo')}</p>
    </Shell>
  );
}

export function Register() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const cfg = useAuthConfig();
  const domains = cfg.allowedEmailDomains;
  const domainText = domains.map((d) => `@${d}`).join(' / ');
  const [loading, setLoading] = useState(false);
  const f = useForm(
    { name: '', email: '', phone: '', password: '' },
    {
      name: (x) => x.trim().length < 2 && t('errors.required'),
      email: (x) => (!BASIC_EMAIL.test(x.trim()) ? t('errors.email') : !isAllowedEmail(x, domains) && t('auth.domainOnly', { domains: domainText })),
      phone: (x) => !PHONE_RE.test(x) && t('errors.phone'),
      password: (x) => !PW_RE.test(x) && t('errors.password'),
    }
  );
  const submit = async (e) => {
    e.preventDefault();
    if (!f.check()) return;
    setLoading(true);
    try {
      const body = { ...f.v, name: f.v.name.trim(), email: f.v.email.trim().toLowerCase() };
      const r = await dispatch(register(body)).unwrap();
      if (r.verificationRequired) {
        toast.success(r.message);
        return nav(`/verify-email?email=${encodeURIComponent(r.email)}`, { replace: true });
      }
      toast.success('Welcome to Fashionist ◆');
      nav('/account', { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell title={t('auth.join')} image={IMG.leatherMan}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label={t('auth.name')} error={f.err('name')}><input className="input" autoComplete="name" {...f.bind('name')} /></Field>
        <Field label={t('auth.email')} error={f.err('email')} hint={t('auth.domainOnly', { domains: domainText })}><input type="email" inputMode="email" className="input" autoComplete="email" placeholder={`you${'@' + domains[0]}`} {...f.bind('email')} /></Field>
        <Field label={t('auth.phone')} error={f.err('phone')}><input inputMode="numeric" maxLength={11} placeholder="03XXXXXXXXX" className="input" autoComplete="tel" {...f.bind('phone')} /></Field>
        <PasswordInput label={t('auth.password')} error={f.err('password')} autoComplete="new-password" {...f.bind('password')} />
        <Button type="submit" loading={loading} className="w-full">{t('auth.register')}</Button>
      </form>
      <GoogleButton clientId={cfg.googleClientId} onDone={() => nav('/account', { replace: true })} />
      <p className="mt-8 text-sm text-muted">{t('auth.haveAccount')} <Link to="/login" className="text-fg underline">{t('auth.login')}</Link></p>
    </Shell>
  );
}

/** 6-digit OTP entry with paste support and a resend cooldown. */
export function VerifyEmail() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const email = sp.get('email') || '';
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const refs = useRef([]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);
  const code = digits.join('');
  const setAt = (i, val) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split('');
      setDigits([...next, ...Array(6 - next.length).fill('')]);
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, n) => (n === i ? clean : x)));
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };
  const submit = async (e) => {
    e?.preventDefault();
    if (code.length !== 6) return toast.error(t('auth.verifySub', { email }));
    setLoading(true);
    try {
      const r = await authService.verifyEmail(email, code);
      localStorage.setItem(TOKEN_KEY, r.token);
      dispatch(setUser(r.user));
      toast.success('Email verified — welcome to Fashionist ◆');
      nav('/account', { replace: true });
    } catch (err) {
      toast.error(err.message);
      if (err.code === 'OTP_EXPIRED' || err.code === 'OTP_LOCKED') setCooldown(0);
    } finally {
      setLoading(false);
    }
  };
  const resend = async () => {
    try {
      const r = await authService.resendOtp(email);
      toast.success(r.devOtp ? `${r.message} (demo code: ${r.devOtp})` : r.message);
      setCooldown(60);
    } catch (err) {
      toast.error(err.message);
    }
  };
  if (!email) return <Shell title={t('auth.verifyTitle')} image={IMG.crew}><Link to="/register" className="underline">{t('auth.register')}</Link></Shell>;
  return (
    <Shell title={t('auth.verifyTitle')} image={IMG.crew}>
      <p className="text-sm text-muted">{t('auth.verifySub', { email })}</p>
      <form onSubmit={submit} className="mt-8">
        <div className="flex justify-between gap-2" dir="ltr">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Backspace' && !d && i > 0 && refs.current[i - 1]?.focus()}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={6}
              aria-label={`Digit ${i + 1}`}
              className="input h-14 w-12 px-0 text-center font-display text-2xl sm:w-14"
            />
          ))}
        </div>
        <Button type="submit" loading={loading} disabled={code.length !== 6} className="mt-8 w-full">{t('auth.verify')}</Button>
      </form>
      <button onClick={resend} disabled={cooldown > 0} className="mt-6 text-sm underline disabled:text-muted disabled:no-underline">{cooldown > 0 ? t('auth.resendIn', { s: cooldown }) : t('auth.resend')}</button>
    </Shell>
  );
}

export function ForgotPassword() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(null);
  const f = useForm({ email: '' }, { email: (x) => !BASIC_EMAIL.test(x.trim()) && t('errors.email') });
  const submit = async (e) => {
    e.preventDefault();
    if (!f.check()) return;
    setLoading(true);
    try {
      const r = await authService.forgot(f.v.email.trim().toLowerCase());
      setSent(r);
      toast.success(r.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Shell title={t('auth.reset')} image={IMG.crew}>
      {sent ? (
        <div className="space-y-4 text-sm">
          <p>{sent.message}</p>
          {sent.devToken && <Link to={`/reset-password/${sent.devToken}`} className="underline">Open demo reset link →</Link>}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <Field label={t('auth.email')} error={f.err('email')}><input type="email" inputMode="email" className="input" {...f.bind('email')} /></Field>
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
    <Shell title={t('auth.reset')} image={IMG.crew}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <PasswordInput label={t('auth.newPassword')} error={f.err('password')} autoComplete="new-password" {...f.bind('password')} />
        <Button type="submit" loading={loading} className="w-full">{t('auth.reset')}</Button>
      </form>
    </Shell>
  );
}
