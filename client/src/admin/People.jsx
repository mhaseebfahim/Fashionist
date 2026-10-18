import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { Button, Field, Img, Modal, Skeleton, Stars } from '../components/ui.jsx';
import { useAsync, useDebounce } from '../hooks/index.js';
import { adminService } from '../services/index.js';
import { date, pkr } from '../utils/format.js';
import { Badge, Card, Drawer, Empty, PageHead, Rows, Table, Tabs, Toggle } from './common.jsx';

/* ======================= Customers ======================= */
function CustomerProfile({ id, onBlocked }) {
  const { data, loading, setData } = useAsync(() => adminService.customer(id), [id]);
  if (loading || !data) return <Skeleton className="h-80" />;
  const c = data.customer;
  const toggle = async () => {
    if (!confirm(`${c.isBlocked ? 'Unblock' : 'Block'} ${c.name}? ${c.isBlocked ? '' : 'They will not be able to log in or order.'}`)) return;
    try {
      const r = await adminService.setBlocked(c._id, !c.isBlocked);
      setData({ ...data, customer: { ...c, isBlocked: r.user.isBlocked } });
      onBlocked(c._id, r.user.isBlocked);
      toast.success(r.user.isBlocked ? 'Customer blocked' : 'Customer unblocked');
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-3xl">{c.name}</p>
            <p className="text-sm text-stone">{c.email} · {c.phone}</p>
            <p className="mt-1 text-xs text-stone">Customer since {date(c.createdAt)} · prefers {c.language === 'ur' ? 'Urdu' : 'English'}</p>
          </div>
          <Button variant={c.isBlocked ? 'ink' : 'outline'} className="px-4 py-2.5" onClick={toggle}>{c.isBlocked ? 'Unblock' : 'Block customer'}</Button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-hairline pt-5 text-center">
          <div><p className="font-display text-3xl">{data.orders.length}</p><p className="label text-[9px] text-stone">Orders</p></div>
          <div><p className="font-display text-3xl">{pkr(data.totalSpend)}</p><p className="label text-[9px] text-stone">Total spend</p></div>
          <div><p className="font-display text-3xl">{data.orders.length ? pkr(Math.round(data.totalSpend / Math.max(1, data.orders.filter((o) => !['Cancelled', 'Returned'].includes(o.status)).length))) : '—'}</p><p className="label text-[9px] text-stone">Avg order</p></div>
        </div>
      </Card>
      {c.addresses?.length > 0 && (
        <Card title="Addresses">
          <ul className="space-y-2 text-sm">{c.addresses.map((a) => <li key={a._id}><b>{a.label}</b>{a.isDefault && ' · default'} — {a.street}, {a.area}, {a.city} · {a.phone}</li>)}</ul>
        </Card>
      )}
      <Card title="Order history" pad={false}>
        <ul className="divide-y divide-hairline">
          {data.orders.length === 0 && <li className="p-5 text-sm text-stone">No orders yet</li>}
          {data.orders.map((o) => (
            <li key={o._id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <Link to={`/admin/orders?open=${o._id}`} className="font-medium hover:underline">{o.orderNumber}</Link>
              <span className="text-stone">{date(o.createdAt)}</span>
              <span className="ms-auto">{pkr(o.total)}</span>
              <Badge s={o.status} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default function Customers() {
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { data, loading, setData } = useAsync(() => adminService.customers(dq || undefined), [dq]);
  const open = sp.get('open');
  const rows = data?.customers || [];
  return (
    <>
      <PageHead title="Customers" sub={data && `${rows.length} customers`} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone…" className="input mb-4 max-w-sm bg-white" aria-label="Search customers" />
      <Table head={['Customer', 'Phone', 'Orders', 'Total spend', 'Joined', 'Status']} empty={!loading && !rows.length && <Empty text="No customers match" />}>
        {loading ? <Rows cols={6} /> : rows.map((u) => (
          <tr key={u._id} className="cursor-pointer hover:bg-ivory/70" onClick={() => setSp({ open: u._id })}>
            <td className="px-4 py-3"><span className="font-medium">{u.name}</span><span className="block text-xs text-stone">{u.email}</span></td>
            <td className="px-4">{u.phone}</td>
            <td className="px-4">{u.orders}</td>
            <td className="px-4">{pkr(u.spent)}</td>
            <td className="px-4 text-stone">{date(u.createdAt)}</td>
            <td className="px-4">{u.isBlocked ? <Badge s="Rejected">Blocked</Badge> : <Badge s="Active">Active</Badge>}</td>
          </tr>
        ))}
      </Table>
      <Drawer open={!!open} onClose={() => setSp({})} title="Customer profile">
        {open && <CustomerProfile id={open} onBlocked={(id, isBlocked) => setData({ customers: rows.map((u) => (u._id === id ? { ...u, isBlocked } : u)) })} />}
      </Drawer>
    </>
  );
}

/* ======================= Coupons ======================= */
const blankCoupon = { code: '', type: 'percent', value: 10, maxDiscount: '', minOrder: 0, usageLimit: '', expiresAt: '', isActive: true };
export function Coupons() {
  const [sp, setSp] = useSearchParams();
  const { data, loading, reload } = useAsync(() => adminService.coupons(), []);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (sp.get('new')) setEdit(blankCoupon), setSp({}, { replace: true });
  }, [sp, setSp]);
  const save = async () => {
    if (!/^[A-Z0-9]{3,20}$/.test(edit.code)) return toast.error('Code must be 3–20 letters or numbers');
    if (edit.type === 'percent' && !(+edit.value > 0 && +edit.value <= 100)) return toast.error('Percent must be 1–100');
    setBusy(true);
    try {
      const n = (v) => (v === '' || v == null ? null : +v);
      const { _id, code, type, value, maxDiscount, minOrder, usageLimit, expiresAt, isActive } = edit;
      await adminService.saveCoupon({ _id, code, type, value: type === 'freeship' ? 0 : +value, maxDiscount: n(maxDiscount), minOrder: +minOrder || 0, usageLimit: n(usageLimit), expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null, isActive });
      toast.success('Coupon saved');
      setEdit(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const del = async (c) => {
    if (!confirm(`Delete ${c.code}?`)) return;
    await adminService.deleteCoupon(c._id);
    toast.success('Deleted');
    reload();
  };
  const describe = (c) => (c.type === 'percent' ? `${c.value}%${c.maxDiscount ? ` (max ${pkr(c.maxDiscount)})` : ''}` : c.type === 'fixed' ? `${pkr(c.value)} off` : 'Free delivery');
  return (
    <>
      <PageHead title="Coupons" sub="One coupon per order · each customer can use a coupon once" action={<button onClick={() => setEdit(blankCoupon)} className="btn-primary px-4 py-2.5"><Plus className="h-4 w-4" /> New coupon</button>} />
      <Table head={['Code', 'Offer', 'Min order', 'Used', 'Discount given', 'Revenue', 'Expires', 'Active', '']} empty={!loading && !data?.coupons.length && <Empty />}>
        {loading ? <Rows cols={9} /> : data.coupons.map((c) => {
          const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
          return (
            <tr key={c._id} className={expired || !c.isActive ? 'text-stone' : ''}>
              <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
              <td className="px-4">{describe(c)}</td>
              <td className="px-4">{pkr(c.minOrder)}</td>
              <td className="px-4">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
              <td className="px-4">{pkr(c.stats?.discountGiven)}</td>
              <td className="px-4">{pkr(c.stats?.revenue)}</td>
              <td className="px-4">{c.expiresAt ? <span className={expired ? 'text-rose' : ''}>{date(c.expiresAt)}</span> : '—'}</td>
              <td className="px-4">{c.isActive ? 'Yes' : 'No'}</td>
              <td className="space-x-3 whitespace-nowrap px-4 text-end text-xs underline"><button onClick={() => setEdit({ ...blankCoupon, ...c, maxDiscount: c.maxDiscount ?? '', usageLimit: c.usageLimit ?? '', expiresAt: c.expiresAt?.slice(0, 10) || '' })}>Edit</button><button onClick={() => del(c)} className="text-rose">Delete</button></td>
            </tr>
          );
        })}
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? `Edit ${edit.code}` : 'New coupon'}>
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code"><input className="input font-mono uppercase" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} /></Field>
            <Field label="Type"><select className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}><option value="percent">Percent off</option><option value="fixed">Fixed PKR off</option><option value="freeship">Free delivery</option></select></Field>
            {edit.type !== 'freeship' && <Field label={edit.type === 'percent' ? 'Percent' : 'Amount (PKR)'}><input type="number" min={0} className="input" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} /></Field>}
            {edit.type === 'percent' && <Field label="Max discount (PKR)"><input type="number" min={0} className="input" value={edit.maxDiscount} onChange={(e) => setEdit({ ...edit, maxDiscount: e.target.value })} /></Field>}
            <Field label="Minimum order (PKR)"><input type="number" min={0} className="input" value={edit.minOrder} onChange={(e) => setEdit({ ...edit, minOrder: e.target.value })} /></Field>
            <Field label="Total usage limit"><input type="number" min={1} className="input" placeholder="Unlimited" value={edit.usageLimit} onChange={(e) => setEdit({ ...edit, usageLimit: e.target.value })} /></Field>
            <Field label="Expires on"><input type="date" className="input" value={edit.expiresAt} onChange={(e) => setEdit({ ...edit, expiresAt: e.target.value })} /></Field>
            <label className="flex items-center gap-3 self-end pb-3 text-sm"><Toggle checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="Active" /> Active</label>
            <Button className="sm:col-span-2" loading={busy} onClick={save}>Save coupon</Button>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ======================= Reviews ======================= */
export function Reviews() {
  const [f, setF] = useState({ rating: '', status: '' });
  const { data, loading, setData } = useAsync(() => adminService.reviews({ rating: f.rating || undefined, status: f.status || undefined }), [f.rating, f.status]);
  const set = async (r, status) => {
    try {
      await adminService.setReviewStatus(r._id, status);
      setData({ reviews: data.reviews.map((x) => (x._id === r._id ? { ...x, status } : x)) });
      toast.success(status === 'Hidden' ? 'Review hidden' : 'Review approved');
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <>
      <PageHead title="Reviews" sub="Only customers with a delivered order can review." />
      <Tabs value={f.status} onChange={(status) => setF({ ...f, status })} tabs={[['', 'All'], ['Approved', 'Approved'], ['Hidden', 'Hidden']]} />
      <div className="mb-4 flex gap-1">{['', '5', '4', '3', '2', '1'].map((r) => <button key={r} onClick={() => setF({ ...f, rating: r })} className={`chip ${f.rating === r ? 'chip-active' : 'bg-white'}`}>{r ? `${r} ★` : 'Any rating'}</button>)}</div>
      <div className="space-y-3">
        {loading ? <Skeleton className="h-40" /> : !data.reviews.length ? <Card><Empty text="No reviews match" /></Card> : data.reviews.map((r) => (
          <article key={r._id} className={`flex gap-4 border border-hairline bg-white p-4 ${r.status === 'Hidden' ? 'opacity-60' : ''}`}>
            <Img src={r.product?.images?.[0]} alt="" w={48} h={64} className="h-16 w-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3"><Stars value={r.rating} /><span className="text-sm font-medium">{r.product?.title}</span><span className="text-xs text-stone">by {r.user?.name} · {date(r.createdAt)}</span></div>
              <p className="mt-2 font-display text-lg leading-snug">“{r.comment || '—'}”</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge s={r.status} />
              <button onClick={() => set(r, r.status === 'Approved' ? 'Hidden' : 'Approved')} className="text-xs underline">{r.status === 'Approved' ? 'Hide' : 'Approve'}</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

/* ======================= Activity log ======================= */
const AREAS = [['', 'Everything'], ['order', 'Orders'], ['product', 'Products'], ['inventory', 'Inventory'], ['category', 'Categories'], ['customer', 'Customers'], ['coupon', 'Coupons'], ['review', 'Reviews'], ['settings', 'Settings'], ['cms', 'Website / CMS'], ['media', 'Media']];
export function Activity() {
  const [f, setF] = useState({ q: '', from: '', to: '' });
  const { data, loading } = useAsync(() => adminService.activity({ q: f.q || undefined, from: f.from || undefined, to: f.to || undefined }), [f.q, f.from, f.to]);
  return (
    <>
      <PageHead title="Activity Log" sub="Every change made in the Atelier — who, what and when." />
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} className="input w-auto bg-white" aria-label="Area">{AREAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="input w-auto bg-white" aria-label="From" />
        <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="input w-auto bg-white" aria-label="To" />
      </div>
      <Table head={['When', 'Who', 'Action', 'Target', 'Details']} empty={!loading && !data?.logs.length && <Empty text="No activity yet" />}>
        {loading ? <Rows cols={5} /> : data.logs.map((l) => (
          <tr key={l._id}>
            <td className="whitespace-nowrap px-4 py-2.5 text-stone">{new Date(l.createdAt).toLocaleString()}</td>
            <td className="px-4">{l.admin?.name || 'Admin'}</td>
            <td className="px-4 font-mono text-xs">{l.action}</td>
            <td className="px-4 text-xs">{l.targetType} <span className="text-stone">{l.targetId}</span></td>
            <td className="max-w-md truncate px-4 font-mono text-[11px] text-stone" title={l.details ? JSON.stringify(l.details) : ''}>{l.details ? JSON.stringify(l.details) : ''}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
