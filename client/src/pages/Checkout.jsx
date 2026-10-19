import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Banknote, Check, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { CartLines, FreeShippingBar } from '../components/CartDrawer.jsx';
import { Button, EmptyState, Field, Img, Spinner, StatusTracker, useMeta } from '../components/ui.jsx';
import { useAsync, useSettings } from '../hooks/index.js';
import { orderService } from '../services/index.js';
import { clearCart } from '../features/store.js';
import { pkr } from '../utils/format.js';
import { CITIES, PHONE_RE, deliveryFeeFor, hourLabel, sameDayFor, shippingFeeFor } from '../utils/rules.js';

const COUPON_KEY = 'fashionist:coupon';

function CouponField({ subtotal, city, deliveryMethod, value, onChange }) {
  const { t } = useTranslation();
  const user = useSelector((s) => s.auth.user);
  const [code, setCode] = useState(value?.code || '');
  const [loading, setLoading] = useState(false);
  const apply = async () => {
    if (!user) return toast.error(t('checkout.loginFirst'));
    setLoading(true);
    try {
      const r = await orderService.validateCoupon({ code, subtotal, city, deliveryMethod });
      onChange(r);
      toast.success(`${r.code} applied`);
    } catch (e) {
      onChange(null);
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex gap-2">
      <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('cart.coupon')} className="input" aria-label={t('cart.coupon')} />
      <Button variant="outline" loading={loading} onClick={apply} disabled={!code}>{t('cart.applyCoupon')}</Button>
    </div>
  );
}

function Summary({ subtotal, discount = 0, shipping, children }) {
  const { t } = useTranslation();
  const row = (k, v, cls = '') => <div className={`flex justify-between ${cls}`}><span>{k}</span><span>{v}</span></div>;
  return (
    <div className="space-y-3 text-sm">
      {row(t('cart.subtotal'), pkr(subtotal))}
      {discount > 0 && row(t('cart.discount'), `− ${pkr(discount)}`, 'text-rose')}
      {row(t('cart.shipping'), shipping == null ? t('cart.calcAtCheckout') : shipping === 0 ? t('cart.free') : pkr(shipping))}
      <div className="border-t border-line pt-3">{row(<span className="label">{t('cart.total')}</span>, <span className="font-display text-2xl">{pkr(subtotal - discount + (shipping || 0))}</span>, 'items-center')}</div>
      {children}
    </div>
  );
}

const Step = ({ n, title, children }) => (
  <section className="border-b border-line py-10 first:pt-0">
    <h2 className="flex items-baseline gap-4 text-3xl"><span className="font-display text-xl text-gold">0{n}</span>{title}</h2>
    <div className="mt-6">{children}</div>
  </section>
);

const readCoupon = () => {
  try {
    return JSON.parse(sessionStorage.getItem(COUPON_KEY));
  } catch {
    return null;
  }
};

export function CartPage() {
  useMeta('Your Bag');
  const { t } = useTranslation();
  const items = useSelector((s) => s.cart.items);
  const [coupon, setCoupon] = useState(readCoupon);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  useEffect(() => {
    sessionStorage.setItem(COUPON_KEY, JSON.stringify(coupon));
  }, [coupon]);
  if (!items.length) return <EmptyState title={t('cart.empty')} text={t('cart.emptySub')} action={<Link to="/shop" className="btn-ink">{t('cart.continue')}</Link>} />;
  return (
    <div className="container-site py-14">
      <h1 className="text-6xl md:text-7xl">{t('cart.title')}</h1>
      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <FreeShippingBar subtotal={subtotal} />
          <CartLines />
        </div>
        <aside className="lg:col-span-4">
          <div className="sticky top-28 space-y-6 bg-surface p-6">
            <h2 className="text-2xl">{t('cart.summary')}</h2>
            <CouponField subtotal={subtotal} value={coupon} onChange={setCoupon} />
            <Summary subtotal={subtotal} discount={coupon?.discount}>
              <Link to="/checkout" className="btn-primary mt-4 w-full">{t('cart.checkout')}</Link>
            </Summary>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function Checkout() {
  useMeta('Checkout');
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const settings = useSettings();
  const items = useSelector((s) => s.cart.items);
  const user = useSelector((s) => s.auth.user);
  const saved = user?.addresses || [];
  const [selected, setSelected] = useState(saved.find((a) => a.isDefault)?._id || saved[0]?._id || 'new');
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', city: 'Lahore', area: '', street: '' });
  const [errors, setErrors] = useState({});
  const [coupon, setCoupon] = useState(readCoupon);
  const [placing, setPlacing] = useState(false);

  const address = selected === 'new' ? form : saved.find((a) => a._id === selected);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = coupon?.discount || 0;
  const sameDay = sameDayFor(address?.city, settings);
  // Customers in the same-day city get it picked automatically; they can still switch to standard.
  const [method, setMethod] = useState('standard');
  useEffect(() => setMethod(sameDay.available ? 'same_day' : 'standard'), [sameDay.available]);
  const deliveryMethod = sameDay.available ? method : 'standard';
  const shipping = coupon?.freeShipping ? 0 : settings ? deliveryFeeFor(address?.city, settings, subtotal - discount, deliveryMethod) : null;
  const cutoff = hourLabel(settings?.sameDay?.cutoffHour);

  if (!items.length) return <EmptyState title={t('cart.empty')} action={<Link to="/shop" className="btn-ink">{t('cart.continue')}</Link>} />;

  const validate = () => {
    const e = {};
    if (selected === 'new') {
      if (form.name.trim().length < 2) e.name = t('errors.required');
      if (!PHONE_RE.test(form.phone)) e.phone = t('errors.phone');
      if (!form.street.trim()) e.street = t('errors.required');
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const place = async () => {
    if (!validate()) return toast.error(t('errors.required'));
    setPlacing(true);
    try {
      const { name, phone, city, area, street } = address;
      const { order } = await orderService.create({ items: items.map(({ productId, sku, qty }) => ({ product: productId, sku, qty })), shippingAddress: { name, phone, city, area, street }, couponCode: coupon?.code, deliveryMethod });
      dispatch(clearCart());
      sessionStorage.removeItem(COUPON_KEY);
      nav(`/order/success/${order.orderNumber}`, { replace: true });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPlacing(false);
    }
  };
  const input = (k, label, props = {}) => (
    <Field label={label} error={errors[k]}>
      <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} onBlur={validate} className={`input ${errors[k] ? 'input-error' : ''}`} {...props} />
    </Field>
  );
  return (
    <div className="container-site py-14">
      <h1 className="text-6xl md:text-7xl">{t('checkout.title')}</h1>
      <div className="mt-12 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Step n={1} title={t('checkout.contact')}>
            {saved.length > 0 && (
              <div className="mb-6 grid gap-3 sm:grid-cols-2">
                {saved.map((a) => (
                  <button key={a._id} onClick={() => setSelected(a._id)} className={`border p-4 text-start text-sm ${selected === a._id ? 'border-fg' : 'border-line'}`}>
                    <p className="label text-[10px] text-gold">{a.label}</p>
                    <p className="mt-2 font-semibold">{a.name}</p>
                    <p className="text-muted">{a.street}, {a.area}, {a.city}</p>
                    <p className="text-muted">{a.phone}</p>
                  </button>
                ))}
                <button onClick={() => setSelected('new')} className={`border border-dashed p-4 text-sm ${selected === 'new' ? 'border-fg' : 'border-line'}`}>+ {t('checkout.newAddress')}</button>
              </div>
            )}
            {selected === 'new' && (
              <div className="grid gap-5 sm:grid-cols-2">
                {input('name', t('checkout.name'), { autoComplete: 'name' })}
                {input('phone', t('checkout.phone'), { inputMode: 'numeric', maxLength: 11, placeholder: '03XXXXXXXXX', autoComplete: 'tel' })}
                <Field label={t('checkout.city')}>
                  <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input">{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
                </Field>
                {input('area', t('checkout.area'))}
                <div className="sm:col-span-2">{input('street', t('checkout.street'), { autoComplete: 'street-address' })}</div>
              </div>
            )}
          </Step>
          <Step n={2} title={t('checkout.delivery')}>
            {sameDay.available ? (
              <div className="space-y-3" role="radiogroup" aria-label={t('checkout.delivery')}>
                {[
                  ['same_day', <><Zap className="h-4 w-4 text-gold" />{t('checkout.sameDay', { city: settings.sameDay.city })}</>, t(sameDay.eta === 'today' ? 'checkout.sameDayToday' : 'checkout.sameDayTomorrow', { time: cutoff }), deliveryFeeFor(address.city, settings, subtotal - discount, 'same_day')],
                  ['standard', t('checkout.standard'), address.city, shippingFeeFor(address.city, settings, subtotal - discount)],
                ].map(([k, title, sub, fee]) => (
                  <button key={k} type="button" role="radio" aria-checked={method === k} onClick={() => setMethod(k)} className={`flex w-full items-start gap-4 border p-5 text-start text-sm ${method === k ? 'border-fg bg-surface' : 'border-line'}`}>
                    <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${method === k ? 'border-fg bg-fg text-bg' : 'border-line'}`}>{method === k && <Check className="h-3 w-3" />}</span>
                    <span className="flex-1"><span className="flex items-center gap-2 font-semibold">{title}</span><span className="mt-1 block text-muted">{sub}</span></span>
                    <span className="font-semibold">{coupon?.freeShipping || fee === 0 ? t('cart.free') : pkr(fee)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border border-fg p-5 text-sm">
                  <span>{t('checkout.standard')} — {address?.city}</span>
                  <span className="font-semibold">{shipping === 0 ? t('cart.free') : pkr(shipping)}</span>
                </div>
                {settings?.sameDay?.enabled && <p className="mt-2 flex items-center gap-2 text-xs text-muted"><Zap className="h-3.5 w-3.5 text-gold" />{t('checkout.sameDayHint', { city: settings.sameDay.city })}</p>}
              </>
            )}
            <div className="mt-4 flex items-start gap-4 border border-fg bg-surface p-5" role="radio" aria-checked="true">
              <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-fg text-bg"><Check className="h-3 w-3" /></span>
              <div>
                <p className="flex items-center gap-2 font-semibold"><Banknote className="h-4 w-4 text-gold" />{t('checkout.cod')}</p>
                <p className="text-sm text-muted">{t('checkout.codSub')}</p>
              </div>
            </div>
          </Step>
          <Step n={3} title={t('checkout.review')}>
            <ul className="space-y-4">
              {items.map((i) => (
                <li key={i.sku} className="flex items-center gap-4 text-sm">
                  <Img src={i.image} alt="" className="h-20 w-16" />
                  <div className="flex-1"><p className="font-display text-lg">{i.title}</p><p className="text-xs text-muted">{i.colour} · {i.size} · ×{i.qty}</p></div>
                  <span>{pkr(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-8 w-full" loading={placing} onClick={place}>{placing ? t('checkout.placing') : `${t('checkout.place')} · ${pkr(subtotal - discount + (shipping || 0))}`}</Button>
          </Step>
        </div>
        <aside className="lg:col-span-5">
          <div className="sticky top-28 space-y-6 bg-surface p-6 lg:p-8">
            <h2 className="text-2xl">{t('cart.summary')}</h2>
            <CouponField subtotal={subtotal} city={address?.city} deliveryMethod={deliveryMethod} value={coupon} onChange={setCoupon} />
            <Summary subtotal={subtotal} discount={discount} shipping={shipping} />
          </div>
        </aside>
      </div>
    </div>
  );
}

export function OrderSuccess() {
  const { orderNumber } = useParams();
  const { t } = useTranslation();
  const { data, loading } = useAsync(() => orderService.get(orderNumber), [orderNumber]);
  return (
    <section className="container-site max-w-3xl py-20 text-center">
      <motion.svg viewBox="0 0 80 80" className="mx-auto h-24 w-24" initial="h" animate="v">
        <motion.circle cx="40" cy="40" r="36" fill="none" stroke="rgb(var(--rose))" strokeWidth="2" variants={{ h: { pathLength: 0 }, v: { pathLength: 1, transition: { duration: 0.8 } } }} />
        <motion.path d="M25 41 36 52 56 30" fill="none" stroke="rgb(var(--rose))" strokeWidth="3" strokeLinecap="round" variants={{ h: { pathLength: 0 }, v: { pathLength: 1, transition: { delay: 0.7, duration: 0.5 } } }} />
      </motion.svg>
      <h1 className="mt-8 text-5xl md:text-6xl">{t('success.title')}</h1>
      <p className="mt-4 text-muted">{t('success.sub')}</p>
      <p className="label mt-10 text-muted">{t('success.number')}</p>
      <p className="mt-2 font-display text-4xl tracking-wider" dir="ltr">{orderNumber}</p>
      <div className="mx-auto mt-12 max-w-md">{loading ? <Spinner /> : data && <StatusTracker order={data.order} />}</div>
      {data && <p className="mt-8 text-sm">{t('cart.total')}: <b>{pkr(data.order.total)}</b> · {t('checkout.cod')}</p>}
      <div className="mt-12 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className="btn-primary">{t('cart.continue')}</Link>
        {data && <Link to={`/account/orders/${data.order._id}`} className="btn-outline">{t('success.track')}</Link>}
      </div>
    </section>
  );
}
