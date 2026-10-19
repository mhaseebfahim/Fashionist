import { useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import ProductCard from '../components/ProductCard.jsx';
import { Button, EmptyState, ErrorPage, Field, Img, Modal, Skeleton, Stars, StatusTracker } from '../components/ui.jsx';
import { useAsync, useSettings } from '../hooks/index.js';
import { authService, catalogService, orderService } from '../services/index.js';
import { logout, setLang, setUser } from '../features/store.js';
import { date, pkr } from '../utils/format.js';
import { CITIES, PHONE_RE, isWithinReturnWindow } from '../utils/rules.js';

function OrderCard({ order, onChange }) {
  const { t, i18n } = useTranslation();
  return (
    <article className="border border-line">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4 text-sm">
        <div>
          <p className="font-display text-xl" dir="ltr">{order.orderNumber}</p>
          <p className="text-xs text-muted">{t('account.placed', { date: date(order.createdAt, i18n.language) })} · {t('account.items', { count: order.items.length })}</p>
        </div>
        <p className="font-semibold">{pkr(order.total)}</p>
      </header>
      <div className="p-5">
        <StatusTracker order={order} />
        <div className="no-scrollbar mt-6 flex gap-3 overflow-x-auto">{order.items.map((i) => <Img key={i.sku} src={i.image} alt={i.title} className="h-24 w-[72px] shrink-0" />)}</div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to={`/account/orders/${order._id}`} className="btn-outline px-5 py-2.5">{t('account.details')}</Link>
          <OrderActions order={order} onChange={onChange} />
        </div>
      </div>
    </article>
  );
}

function OrderActions({ order, onChange }) {
  const { t } = useTranslation();
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const [ret, setRet] = useState(false);
  const [form, setForm] = useState({ type: 'exchange', reason: '' });
  const [review, setReview] = useState(null);
  const [rv, setRv] = useState({ rating: 5, comment: '' });

  const cancel = async () => {
    if (!confirm(t('account.cancel') + '?')) return;
    setBusy(true);
    try {
      onChange((await orderService.cancel(order._id)).order);
      toast.success(t('status.Cancelled'));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const submitReturn = async () => {
    if (form.reason.trim().length < 5) return toast.error(t('errors.required'));
    setBusy(true);
    try {
      onChange((await orderService.requestReturn(order._id, form)).order);
      toast.success(t('account.returnRequested'));
      setRet(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const submitReview = async () => {
    setBusy(true);
    try {
      await catalogService.addReview(review.product, rv);
      toast.success('Thank you for your review');
      setReview(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const canReturn = order.status === 'Delivered' && !order.returnRequest?.status && isWithinReturnWindow(order.deliveredAt, settings?.returnWindowDays);
  return (
    <>
      {order.status === 'Pending' && <Button variant="outline" className="px-5 py-2.5" loading={busy} onClick={cancel}>{t('account.cancel')}</Button>}
      {canReturn && <button className="btn-outline px-5 py-2.5" onClick={() => setRet(true)}>{t('account.return')}</button>}
      {order.returnRequest?.status && <span className="label self-center bg-blush px-3 py-2 text-[10px] text-rose-deep">{t('account.returnRequested')}: {order.returnRequest.status}</span>}
      {order.status === 'Delivered' && order.items.map((i) => <button key={i.sku} className="btn-ghost py-2.5 underline" onClick={() => setReview(i)}>{t('account.review')}: {i.title.split(' ')[0]}</button>)}

      <Modal open={ret} onClose={() => setRet(false)} title={t('account.return')}>
        <div className="space-y-5">
          <div className="flex gap-2">{['exchange', 'return'].map((x) => <button key={x} onClick={() => setForm({ ...form, type: x })} className={`chip capitalize ${form.type === x ? 'chip-active' : ''}`}>{x}</button>)}</div>
          <Field label={t('account.reason')}><textarea rows={4} className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
          <Button loading={busy} onClick={submitReturn} className="w-full">{t('account.submit')}</Button>
        </div>
      </Modal>
      <Modal open={!!review} onClose={() => setReview(null)} title={review?.title}>
        <div className="space-y-5">
          <Stars value={rv.rating} size="h-6 w-6" onChange={(rating) => setRv({ ...rv, rating })} />
          <Field label="Review"><textarea rows={4} className="input" value={rv.comment} onChange={(e) => setRv({ ...rv, comment: e.target.value })} /></Field>
          <Button loading={busy} onClick={submitReview} className="w-full">{t('account.submit')}</Button>
        </div>
      </Modal>
    </>
  );
}

function Orders() {
  const { t } = useTranslation();
  const { data, loading, setData } = useAsync(() => orderService.mine(), []);
  const update = (o) => setData({ orders: data.orders.map((x) => (x._id === o._id ? o : x)) });
  if (loading) return <div className="space-y-4">{[0, 1].map((i) => <Skeleton key={i} className="h-64" />)}</div>;
  if (!data.orders.length) return <EmptyState title={t('account.noOrders')} action={<Link to="/shop" className="btn-ink">{t('cart.continue')}</Link>} />;
  return <div className="space-y-6">{data.orders.map((o) => <OrderCard key={o._id} order={o} onChange={update} />)}</div>;
}

function OrderDetail() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { data, loading, error, setData } = useAsync(() => orderService.get(id), [id]);
  if (error) return <ErrorPage />;
  if (loading) return <Skeleton className="h-96" />;
  const o = data.order;
  return (
    <div>
      <Link to="/account/orders" className="text-xs underline">← {t('account.orders')}</Link>
      <h2 className="mt-4 text-4xl" dir="ltr">{o.orderNumber}</h2>
      <p className="text-sm text-muted">{date(o.createdAt, i18n.language)} · {t('checkout.cod')} · {o.paymentStatus}</p>
      <div className="my-10"><StatusTracker order={o} /></div>
      {o.deliveryMethod === 'same_day' && !o.rider && ['Pending', 'Confirmed'].includes(o.status) && <p className="mb-6 text-sm"><b>{t('checkout.sameDay', { city: o.shippingAddress.city })}</b> · {t(o.sameDayEta === 'tomorrow' ? 'checkout.etaTomorrow' : 'checkout.etaToday')}</p>}
      {o.rider ? (
        <p className="mb-6 text-sm">{t('checkout.rider')}: <b>{o.rider.name}</b> ({o.rider.vehicle}) · <a href={`tel:${o.rider.phone}`} className="font-semibold underline" dir="ltr">{o.rider.phone}</a></p>
      ) : (
        o.trackingNumber && <p className="mb-6 text-sm">Courier: <b>{o.courier}</b> · Tracking: <b>{o.trackingNumber}</b></p>
      )}
      <ul className="divide-y divide-line border-y border-line">
        {o.items.map((i) => (
          <li key={i.sku} className="flex items-center gap-4 py-4 text-sm">
            <Img src={i.image} alt="" className="h-24 w-[72px]" />
            <div className="flex-1"><p className="font-display text-lg">{i.title}</p><p className="text-xs text-muted">{i.colour} · {i.size} · ×{i.qty}</p></div>
            <span>{pkr(i.price * i.qty)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div className="text-sm"><p className="label mb-2 text-gold">Deliver to</p><p>{o.shippingAddress.name} · {o.shippingAddress.phone}</p><p className="text-muted">{o.shippingAddress.street}, {o.shippingAddress.area}, {o.shippingAddress.city}</p></div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span>{t('cart.subtotal')}</span><span>{pkr(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="flex justify-between text-rose"><span>{t('cart.discount')} ({o.coupon?.code})</span><span>− {pkr(o.discount)}</span></div>}
          <div className="flex justify-between"><span>{t('cart.shipping')}</span><span>{o.shippingFee ? pkr(o.shippingFee) : t('cart.free')}</span></div>
          <div className="flex justify-between border-t border-line pt-2 font-semibold"><span>{t('cart.total')}</span><span>{pkr(o.total)}</span></div>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3"><OrderActions order={o} onChange={(order) => setData({ order })} /></div>
      <ol className="mt-10 space-y-2 border-s border-line ps-5 text-xs text-muted">
        {o.statusHistory.map((h, i) => <li key={i}><b className="text-fg">{t(`status.${h.status}`)}</b> — {new Date(h.at).toLocaleString()} {h.note && `· ${h.note}`}</li>)}
      </ol>
    </div>
  );
}

function Wishlist() {
  const { t } = useTranslation();
  const items = useSelector((s) => s.wishlist.items);
  if (!items.length) return <EmptyState title={t('account.wishlist')} text={t('cart.emptySub')} action={<Link to="/shop" className="btn-ink">{t('cart.continue')}</Link>} />;
  return <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">{items.map((p) => <ProductCard key={p._id} product={p} />)}</div>;
}

function Addresses() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn) => {
    setBusy(true);
    try {
      const { addresses } = await fn();
      dispatch(setUser({ ...user, addresses }));
      toast.success(t('common.save'));
      setForm(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const submit = () => {
    if (!form.name || !PHONE_RE.test(form.phone) || !form.street) return toast.error(t('errors.phone'));
    const { _id, label, name, phone, city, area, street, isDefault } = form;
    const body = { label, name, phone, city, area, street, isDefault: !!isDefault };
    run(() => (_id ? authService.updateAddress(_id, body) : authService.addAddress(body)));
  };
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {user.addresses.map((a) => (
          <div key={a._id} className="border border-line p-5 text-sm">
            <p className="label text-[10px] text-gold">{a.label} {a.isDefault && `· ${t('account.default')}`}</p>
            <p className="mt-2 font-semibold">{a.name} · {a.phone}</p>
            <p className="text-muted">{a.street}, {a.area}, {a.city}</p>
            <div className="mt-4 flex gap-4 text-xs underline">
              <button onClick={() => setForm(a)}>Edit</button>
              {!a.isDefault && <button onClick={() => run(() => authService.updateAddress(a._id, { isDefault: true }))}>{t('account.makeDefault')}</button>}
              <button onClick={() => run(() => authService.deleteAddress(a._id))}>{t('account.delete')}</button>
            </div>
          </div>
        ))}
        <button onClick={() => setForm({ label: 'Home', name: user.name, phone: user.phone || '', city: 'Lahore', area: '', street: '', isDefault: !user.addresses.length })} className="grid min-h-40 place-items-center border border-dashed border-line text-sm hover:border-fg">+ {t('account.addAddress')}</button>
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={t('account.addAddress')}>
        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[['label', 'Label'], ['name', t('checkout.name')], ['phone', t('checkout.phone')], ['area', t('checkout.area')]].map(([k, l]) => (
              <Field key={k} label={l} error={k === 'phone' && form.phone && !PHONE_RE.test(form.phone) ? t('errors.phone') : null}><input className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>
            ))}
            <Field label={t('checkout.city')}><select className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label={t('checkout.street')}><input className="input" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="accent-rose" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> {t('account.default')}</label>
            <Button loading={busy} onClick={submit} className="sm:col-span-2">{t('account.save')}</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Profile() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);
  const [f, setF] = useState({ name: user.name, phone: user.phone || '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!PHONE_RE.test(f.phone)) return toast.error(t('errors.phone'));
    setBusy(true);
    try {
      dispatch(setUser((await authService.updateMe(f)).user));
      toast.success(t('common.save'));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-md space-y-5">
      <Field label={t('auth.name')}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label={t('auth.email')}><input className="input opacity-60" value={user.email} disabled /></Field>
      <Field label={t('auth.phone')} error={f.phone && !PHONE_RE.test(f.phone) ? t('errors.phone') : null}><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
      <Button loading={busy} onClick={save}>{t('account.save')}</Button>
    </div>
  );
}

function Language() {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();
  const set = (l) => {
    i18n.changeLanguage(l);
    dispatch(setLang(l));
    authService.updateMe({ language: l }).catch(() => {});
  };
  return (
    <div className="flex gap-3">
      {[['en', 'English'], ['ur', 'اردو']].map(([l, n]) => <button key={l} onClick={() => set(l)} className={`border px-8 py-6 font-display text-2xl ${i18n.language === l ? 'border-fg' : 'border-line'}`}>{n}</button>)}
    </div>
  );
}

function Overview() {
  const { t } = useTranslation();
  const user = useSelector((s) => s.auth.user);
  const { data } = useAsync(() => orderService.mine(), []);
  const wish = useSelector((s) => s.wishlist.items.length);
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[[t('account.orders'), data?.orders.length ?? '—', '/account/orders'], [t('account.wishlist'), wish, '/account/wishlist'], [t('account.addresses'), user.addresses.length, '/account/addresses']].map(([k, v, to]) => (
          <Link key={k} to={to} className="border border-line p-6 hover:border-fg"><p className="label text-muted">{k}</p><p className="mt-3 font-display text-5xl">{v}</p></Link>
        ))}
      </div>
      {data?.orders[0] && <div className="mt-10"><p className="label mb-4 text-gold">Latest order</p><OrderCard order={data.orders[0]} onChange={() => {}} /></div>}
    </div>
  );
}

export default function Account() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const links = [['', 'overview'], ['orders', 'orders'], ['wishlist', 'wishlist'], ['addresses', 'addresses'], ['profile', 'profile'], ['language', 'language']];
  return (
    <div className="container-site py-14">
      <p className="label text-gold">{t('nav.account')}</p>
      <h1 className="mt-3 text-5xl md:text-7xl">{t('account.hello', { name: user.name.split(' ')[0] })}</h1>
      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <nav className="no-scrollbar flex gap-6 overflow-x-auto border-b border-line pb-3 lg:col-span-3 lg:flex-col lg:gap-4 lg:border-b-0 lg:border-e lg:pb-0">
          {links.map(([to, k]) => (
            <NavLink key={k} to={`/account/${to}`} end className={({ isActive }) => `label whitespace-nowrap text-[11px] ${isActive ? 'text-fg' : 'text-muted hover:text-fg'}`}>{t(`account.${k}`)}</NavLink>
          ))}
          {user.role === 'admin' && <Link to="/admin" className="label text-[11px] text-rose">{t('nav.admin')}</Link>}
          <button onClick={() => (dispatch(logout()), nav('/'))} className="label text-start text-[11px] text-muted hover:text-rose">{t('account.logout')}</button>
        </nav>
        <div className="lg:col-span-9">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="addresses" element={<Addresses />} />
            <Route path="profile" element={<Profile />} />
            <Route path="language" element={<Language />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
