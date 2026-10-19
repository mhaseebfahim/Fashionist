import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Loader2, Star, X } from 'lucide-react';
import { ORDER_FLOW } from '../utils/rules.js';

export function Diamond({ className = 'h-2.5 w-2.5' }) {
  return (
    <svg viewBox="0 0 10 10" className={className} aria-hidden="true">
      <path d="M5 0 10 5 5 10 0 5Z" fill="rgb(var(--rose))" />
    </svg>
  );
}

export function Logo({ className = '', size = 'text-xl', to = '/' }) {
  const logo = useSelector((s) => s.cms?.theme?.logo);
  return (
    <Link to={to} aria-label="Fashionist home" className={`inline-flex items-center gap-2.5 ${className}`}>
      {logo ? (
        <img src={cdn(logo, 320)} alt="Fashionist" className="h-8 w-auto" width="160" height="32" />
      ) : (
        <>
          <Diamond />
          <span dir="ltr" className={`font-display font-semibold tracking-brand ${size}`}>FASHIONIST</span>
        </>
      )}
    </Link>
  );
}

/** Adds Cloudinary f_auto,q_auto (+ width) to Cloudinary URLs; other URLs pass through. */
export const cdn = (url, w) => (typeof url === 'string' && url.includes('res.cloudinary.com') && !url.includes('/f_auto') ? url.replace('/upload/', `/upload/f_auto,q_auto${w ? `,w_${w}` : ''}/`) : url);

/** Sets <title>, description and Open Graph tags for the current page. */
export function useMeta(title, description, image) {
  useEffect(() => {
    const full = title ? `${title} — Fashionist` : 'Fashionist — Wear Your Story';
    document.title = full;
    const set = (attr, key, value) => {
      if (!value) return;
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) document.head.appendChild((el = document.createElement('meta')));
      el.setAttribute(attr, key);
      el.setAttribute('content', value);
    };
    set('name', 'description', description);
    set('property', 'og:title', full);
    set('property', 'og:description', description);
    set('property', 'og:image', image);
    const href = window.location.origin + window.location.pathname;
    set('property', 'og:url', href);
    document.head.querySelector('link[rel="canonical"]')?.setAttribute('href', href);
  }, [title, description, image]);
}

/** Lazy image with blur-up fade and a branded fallback when the source fails. */
export function Img({ src, alt = '', className = '', imgClass = '', eager = false, w = 600, h = 800, ...rest }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative overflow-hidden bg-surface ${className}`}>
      {failed || !src ? (
        <div className="absolute inset-0 grid place-items-center">
          <Diamond className="h-6 w-6 opacity-40" />
        </div>
      ) : (
        <img
          src={cdn(src, w * 2)}
          alt={alt}
          width={w}
          height={h}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-[filter,opacity,transform] duration-700 ${loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md'} ${imgClass}`}
          {...rest}
        />
      )}
    </div>
  );
}

export function Reveal({ children, delay = 0, className = '', as = 'div' }) {
  const reduce = useReducedMotion();
  const M = motion[as];
  return (
    <M className={className} initial={reduce ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  );
}

export const Spinner = ({ className = 'h-4 w-4' }) => <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;

export function Button({ loading, children, variant = 'primary', className = '', ...rest }) {
  return (
    <button className={`btn-${variant} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

export function CardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[3/4] w-full" />
      <Skeleton className="mt-4 h-3 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <svg viewBox="0 0 120 120" className="mb-6 h-28 w-28 text-line" aria-hidden="true">
        <rect x="30" y="38" width="60" height="62" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M45 38c0-10 7-17 15-17s15 7 15 17" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M60 58 70 68 60 78 50 68Z" fill="rgb(var(--rose))" />
      </svg>
      <h3 className="text-3xl">{title}</h3>
      {text && <p className="mt-2 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Stars({ value = 0, size = 'h-3.5 w-3.5', onChange }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} className={onChange ? 'cursor-pointer' : 'cursor-default'} aria-label={onChange ? `${n} stars` : undefined}>
          <Star className={`${size} ${n <= Math.round(value) ? 'fill-gold text-gold' : 'text-line'}`} />
        </button>
      ))}
    </div>
  );
}

export function Accordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line">
      <button className="flex w-full items-center justify-between py-5 text-start" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="label">{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pb-6 text-sm leading-relaxed text-muted">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[90vh] w-full overflow-auto bg-bg p-6 sm:p-8 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`} initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl">{title}</h3>
              <button onClick={onClose} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, error, children, hint }) {
  return (
    <label className="block">
      <span className="label mb-2 block text-muted">{label}</span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-rose">{error}</span> : hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function StatusTracker({ order }) {
  const { t } = useTranslation();
  if (['Cancelled', 'Returned'].includes(order.status))
    return <span className="label inline-block bg-blush px-3 py-1.5 text-rose-deep">{t(`status.${order.status}`)}</span>;
  const idx = ORDER_FLOW.indexOf(order.status);
  return (
    <ol className="flex w-full items-start">
      {ORDER_FLOW.map((s, i) => (
        <li key={s} className="relative flex flex-1 flex-col items-center text-center">
          {i > 0 && <span className={`absolute end-1/2 top-3 h-px w-full ${i <= idx ? 'bg-fg' : 'bg-line'}`} />}
          <span className={`relative z-10 grid h-6 w-6 place-items-center rounded-full border ${i <= idx ? 'border-fg bg-fg text-bg' : 'border-line bg-bg'}`}>{i <= idx && <Check className="h-3 w-3" />}</span>
          <span className={`mt-2 text-[10px] uppercase tracking-label ${i <= idx ? 'text-fg' : 'text-muted'}`}>{t(`status.${s}`)}</span>
        </li>
      ))}
    </ol>
  );
}

export function SectionTitle({ eyebrow, title, action, className = '' }) {
  return (
    <div className={`mb-10 flex items-end justify-between gap-6 ${className}`}>
      <div>
        {eyebrow && <p className="label mb-3 text-gold">{eyebrow}</p>}
        <h2 className="text-4xl md:text-6xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function RequireAuth({ children, role }) {
  const { user, ready } = useSelector((s) => s.auth);
  const loc = useLocation();
  if (!ready) return <div className="grid min-h-[60vh] place-items-center"><Spinner className="h-6 w-6" /></div>;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (role && user.role !== role) return <ErrorPage code="403" />;
  return children;
}

export function ErrorPage({ code = '404' }) {
  const { t } = useTranslation();
  return (
    <section className="container-site grid min-h-[70vh] place-items-center py-20 text-center">
      <div>
        <p className="font-display text-[clamp(7rem,22vw,16rem)] font-semibold leading-none text-line">{code}</p>
        <div className="mx-auto -mt-6 mb-6 flex justify-center"><Diamond className="h-4 w-4" /></div>
        <h1 className="text-4xl md:text-5xl">{code === '403' ? t('common.forbidden') : t('common.notFound')}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">{code === '403' ? t('common.forbiddenSub') : t('common.notFoundSub')}</p>
        <Link to="/" className="btn-ink mt-8">{t('common.home')}</Link>
      </div>
    </section>
  );
}
