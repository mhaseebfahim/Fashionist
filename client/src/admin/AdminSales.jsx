import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Printer } from 'lucide-react';
import { Button, EmptyState, Field, Img, Modal, Skeleton, Stars, StatusTracker } from '../components/ui.jsx';
import { useAsync, useDebounce } from '../hooks/index.js';
import { adminService, catalogService } from '../services/index.js';
import { date, pkr } from '../utils/format.js';
import { TRANSITIONS } from '../utils/rules.js';
import { PageHead, Rows, Table } from './common.jsx';

const STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
const COURIERS = ['TCS', 'Leopards', 'M&P', 'PostEx', 'Trax', 'Call Courier'];

export const Badge = ({ s }) => {
  const tone = { Pending: 'bg-sand text-ink', Confirmed: 'bg-ink text-ivory', Shipped: 'border border-gold text-gold', Delivered: 'bg-ink/80 text-ivory', Cancelled: 'bg-blush text-rose-deep', Returned: 'bg-blush text-rose-deep', Requested: 'bg-sand text-ink', Approved: 'bg-ink text-ivory', Rejected: 'bg-blush text-rose-deep', Hidden: 'bg-blush text-rose-deep' }[s];
  return <span className={`label inline-block px-2 py-1 text-[10px] ${tone || 'bg-sand'}`}>{s}</span>;
};

const toCsv = (rows) => rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
const downloadCsv = (name, rows) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv' }));
  a.download = name;
  a.click();
};

export function Orders() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { data, loading } = useAsync(() => adminService.orders({ status: status || undefined, q: dq || undefined }), [status, dq]);
  const exportCsv = () =>
    downloadCsv('fashionist-orders.csv', [['Order', 'Date', 'Customer', 'Phone', 'City', 'Status', 'Payment', 'Subtotal', 'Discount', 'Shipping', 'Total'], ...data.orders.map((o) => [o.orderNumber, o.createdAt.slice(0, 10), o.shippingAddress.name, o.shippingAddress.phone, o.shippingAddress.city, o.status, o.paymentStatus, o.subtotal, o.discount, o.shippingFee, o.total])]);
  return (
    <>
      <PageHead title="Orders" sub={data && `${data.orders.length} orders`} action={<button onClick={exportCsv} disabled={!data} className="btn-outline px-5 py-3"><Download className="h-4 w-4" /> Export CSV</button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order # or phone…" className="input max-w-xs" />
        {['', ...STATUSES].map((s) => <button key={s} onClick={() => setStatus(s)} className={`chip ${status === s ? 'chip-active' : ''}`}>{s || 'All'}</button>)}
      </div>
      <Table head={['Order', 'Date', 'Customer', 'City', 'Total', 'Status', 'Payment']}>
        {loading ? <Rows cols={7} /> : data.orders.length === 0 ? <tr><td colSpan={7}><EmptyState title="No orders" /></td></tr> : data.orders.map((o) => (
          <tr key={o._id} className="hover:bg-surface/60">
            <td className="px-4 py-3"><Link to={`/admin/orders/${o._id}`} className="font-medium underline-offset-4 hover:underline">{o.orderNumber}</Link></td>
            <td className="px-4 text-muted">{date(o.createdAt)}</td>
            <td className="px-4">{o.shippingAddress.name}<br /><span className="text-xs text-muted">{o.shippingAddress.phone}</span></td>
            <td className="px-4">{o.shippingAddress.city}</td>
            <td className="px-4">{pkr(o.total)}</td>
            <td className="px-4"><Badge s={o.status} /></td>
            <td className="px-4 text-xs">{o.paymentStatus}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

function printDoc(order, store, kind) {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return toast.error('Allow pop-ups to print');
  const rows = order.items.map((i) => `<tr><td>${i.title}<br><small>${i.sku} · ${i.colour} · ${i.size}</small></td><td>${i.qty}</td>${kind === 'invoice' ? `<td>${pkr(i.price)}</td><td>${pkr(i.price * i.qty)}</td>` : '<td>☐</td>'}</tr>`).join('');
  w.document.write(`<!doctype html><html><head><title>${kind} ${order.orderNumber}</title><style>
    body{font-family:Arial,sans-serif;color:#141414;padding:32px;font-size:13px}h1{font-family:Georgia,serif;letter-spacing:.32em;font-weight:600;margin:0}
    .r{color:#E11D48}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border-bottom:1px solid #E4DCD0;padding:8px;text-align:left}
    .g{display:flex;justify-content:space-between;margin-top:24px}.b{border:2px solid #141414;padding:8px 12px;display:inline-block;font-weight:bold;margin-top:16px}</style></head><body>
    <h1><span class="r">◆</span> FASHIONIST</h1><p>${store?.address || ''} · ${store?.phone || ''}</p>
    <h2 style="text-transform:uppercase;letter-spacing:.2em;font-size:14px">${kind === 'invoice' ? 'Invoice' : 'Packing slip'} — ${order.orderNumber}</h2>
    <div class="g"><div><b>Ship to</b><br>${order.shippingAddress.name}<br>${order.shippingAddress.phone}<br>${order.shippingAddress.street}, ${order.shippingAddress.area || ''}<br>${order.shippingAddress.city}</div>
    <div><b>Date</b> ${date(order.createdAt)}<br><b>Payment</b> Cash on Delivery<br>${order.courier ? `<b>Courier</b> ${order.courier} ${order.trackingNumber}` : ''}</div></div>
    <table><thead><tr><th>Item</th><th>Qty</th>${kind === 'invoice' ? '<th>Price</th><th>Total</th>' : '<th>Packed</th>'}</tr></thead><tbody>${rows}</tbody></table>
    ${kind === 'invoice' ? `<p style="text-align:right">Subtotal ${pkr(order.subtotal)}<br>${order.discount ? `Discount −${pkr(order.discount)}<br>` : ''}Delivery ${pkr(order.shippingFee)}<br><b style="font-size:16px">Total ${pkr(order.total)}</b></p>` : ''}
    <div class="b">COLLECT CASH: ${pkr(order.paymentStatus === 'Paid' ? 0 : order.total)}</div>
    <p style="margin-top:32px;color:#8A8178">Thank you for shopping with Fashionist — Wear Your Story.</p>
    <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}

export function OrderDetail() {
  const { id } = useParams();
  const { data, loading, setData } = useAsync(() => adminService.order(id), [id]);
  const settings = useAsync(() => catalogService.settings(), []);
  const [ship, setShip] = useState(false);
  const [courier, setCourier] = useState({ courier: 'TCS', trackingNumber: '' });
  const [busy, setBusy] = useState('');
  if (loading) return <Skeleton className="h-96" />;
  const o = data.order;
  const move = async (status, extra = {}) => {
    if (status === 'Cancelled' && !confirm('Cancel this order and restock items?')) return;
    setBusy(status);
    try {
      const r = await adminService.setStatus(o._id, { status, ...extra });
      setData({ order: { ...r.order, user: o.user } });
      toast.success(`Order ${status}`);
      setShip(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };
  const next = TRANSITIONS[o.status].filter((s) => s !== 'Returned');
  return (
    <>
      <PageHead
        title={o.orderNumber}
        sub={`${date(o.createdAt)} · ${o.user?.name || ''} · ${o.user?.email || ''}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => printDoc(o, settings.data?.settings.store, 'slip')} className="btn-outline px-4 py-3"><Printer className="h-4 w-4" /> Packing slip</button>
            <button onClick={() => printDoc(o, settings.data?.settings.store, 'invoice')} className="btn-outline px-4 py-3"><Printer className="h-4 w-4" /> Invoice</button>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="border border-line bg-bg p-6">
            <div className="mb-6 flex items-center justify-between"><Badge s={o.status} /><span className="text-xs">Payment: <b>{o.paymentStatus}</b> (COD)</span></div>
            <StatusTracker order={o} />
            {next.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-line pt-6">
                {next.map((s) => (
                  <Button key={s} variant={s === 'Cancelled' ? 'outline' : 'ink'} loading={busy === s} className="px-5 py-3" onClick={() => (s === 'Shipped' ? setShip(true) : move(s))}>
                    {s === 'Cancelled' ? 'Cancel order' : `Mark ${s}`}
                  </Button>
                ))}
              </div>
            )}
            {o.trackingNumber && <p className="mt-4 text-sm">Courier: <b>{o.courier}</b> · Tracking: <b>{o.trackingNumber}</b></p>}
          </section>
          <section className="border border-line bg-bg">
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.sku} className="flex items-center gap-4 p-4 text-sm">
                  <Img src={i.image} alt="" className="h-16 w-12" />
                  <div className="flex-1"><p className="font-medium">{i.title}</p><p className="font-mono text-xs text-muted">{i.sku} · {i.colour} · {i.size}</p></div>
                  <span>{i.qty} × {pkr(i.price)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-line p-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{pkr(o.subtotal)}</span></div>
              {o.discount > 0 && <div className="flex justify-between text-rose"><span>Discount ({o.coupon?.code})</span><span>− {pkr(o.discount)}</span></div>}
              <div className="flex justify-between"><span>Delivery</span><span>{pkr(o.shippingFee)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total (collect)</span><span>{pkr(o.total)}</span></div>
            </div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="border border-line bg-bg p-5 text-sm">
            <p className="label mb-3 text-gold">Ship to</p>
            <p className="font-medium">{o.shippingAddress.name}</p>
            <p>{o.shippingAddress.phone}</p>
            <p className="text-muted">{o.shippingAddress.street}, {o.shippingAddress.area}, {o.shippingAddress.city}</p>
          </section>
          {o.returnRequest?.status && <ReturnBox order={o} onChange={(order) => setData({ order: { ...order, user: o.user } })} />}
          <section className="border border-line bg-bg p-5">
            <p className="label mb-3 text-gold">History</p>
            <ol className="space-y-2 text-xs">{o.statusHistory.map((h, i) => <li key={i}><b>{h.status}</b> · {new Date(h.at).toLocaleString()} {h.note && <span className="text-muted">— {h.note}</span>}</li>)}</ol>
          </section>
        </div>
      </div>
      <Modal open={ship} onClose={() => setShip(false)} title="Ship order">
        <div className="space-y-4">
          <Field label="Courier"><select className="input" value={courier.courier} onChange={(e) => setCourier({ ...courier, courier: e.target.value })}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Tracking number"><input className="input" value={courier.trackingNumber} onChange={(e) => setCourier({ ...courier, trackingNumber: e.target.value })} /></Field>
          <Button className="w-full" loading={busy === 'Shipped'} disabled={!courier.trackingNumber.trim()} onClick={() => move('Shipped', courier)}>Mark shipped</Button>
        </div>
      </Modal>
    </>
  );
}

function ReturnBox({ order, onChange }) {
  const [busy, setBusy] = useState('');
  const r = order.returnRequest;
  const decide = async (decision) => {
    setBusy(decision);
    try {
      onChange((await adminService.decideReturn(order._id, decision)).order);
      toast.success(`Return ${decision.toLowerCase()}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };
  return (
    <section className="border border-line bg-bg p-5 text-sm">
      <div className="mb-3 flex items-center justify-between"><p className="label text-gold">Return request</p><Badge s={r.status} /></div>
      <p className="capitalize"><b>{r.type}</b> · {date(r.requestedAt)}</p>
      <p className="mt-2 text-muted">“{r.reason}”</p>
      {r.status === 'Requested' && (
        <div className="mt-4 flex gap-2">
          <Button variant="ink" className="flex-1 px-3 py-2.5" loading={busy === 'Approved'} onClick={() => decide('Approved')}>Approve</Button>
          <Button variant="outline" className="flex-1 px-3 py-2.5" loading={busy === 'Rejected'} onClick={() => decide('Rejected')}>Reject</Button>
        </div>
      )}
    </section>
  );
}

export function Returns() {
  const { data, loading } = useAsync(() => adminService.orders({ returns: 'true' }), []);
  return (
    <>
      <PageHead title="Returns & Exchanges" sub="Approving a return restocks items and marks the order Returned." />
      <Table head={['Order', 'Customer', 'Type', 'Reason', 'Requested', 'Status']}>
        {loading ? <Rows cols={6} /> : data.orders.length === 0 ? <tr><td colSpan={6}><EmptyState title="No return requests" /></td></tr> : data.orders.map((o) => (
          <tr key={o._id}>
            <td className="px-4 py-3"><Link to={`/admin/orders/${o._id}`} className="font-medium hover:underline">{o.orderNumber}</Link></td>
            <td className="px-4">{o.shippingAddress.name}</td>
            <td className="px-4 capitalize">{o.returnRequest.type}</td>
            <td className="max-w-xs truncate px-4 text-muted">{o.returnRequest.reason}</td>
            <td className="px-4">{date(o.returnRequest.requestedAt)}</td>
            <td className="px-4"><Badge s={o.returnRequest.status} /></td>
          </tr>
        ))}
      </Table>
    </>
  );
}

export function Customers() {
  const { data, loading, reload } = useAsync(() => adminService.customers(), []);
  const toggle = async (u) => {
    if (!confirm(`${u.isBlocked ? 'Unblock' : 'Block'} ${u.name}?`)) return;
    await adminService.setBlocked(u._id, !u.isBlocked);
    toast.success(u.isBlocked ? 'Unblocked' : 'Blocked');
    reload();
  };
  return (
    <>
      <PageHead title="Customers" sub={data && `${data.customers.length} customers`} />
      <Table head={['Name', 'Email', 'Phone', 'Orders', 'Spent', 'Joined', '']}>
        {loading ? <Rows cols={7} /> : data.customers.map((u) => (
          <tr key={u._id} className={u.isBlocked ? 'opacity-50' : ''}>
            <td className="px-4 py-3 font-medium">{u.name}</td>
            <td className="px-4">{u.email}</td>
            <td className="px-4">{u.phone}</td>
            <td className="px-4">{u.orders}</td>
            <td className="px-4">{pkr(u.spent)}</td>
            <td className="px-4 text-muted">{date(u.createdAt)}</td>
            <td className="px-4 text-end"><button onClick={() => toggle(u)} className={`text-xs underline ${u.isBlocked ? '' : 'text-rose'}`}>{u.isBlocked ? 'Unblock' : 'Block'}</button></td>
          </tr>
        ))}
      </Table>
    </>
  );
}

export function Coupons() {
  const { data, loading, reload } = useAsync(() => adminService.coupons(), []);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const num = (v) => (v === '' || v == null ? undefined : +v);
      await adminService.saveCoupon({ ...edit, value: +edit.value, maxDiscount: num(edit.maxDiscount), minOrder: num(edit.minOrder) || 0, usageLimit: num(edit.usageLimit), expiresAt: edit.expiresAt || undefined });
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
  return (
    <>
      <PageHead title="Coupons" sub="One coupon per order · each customer can use a coupon once" action={<button onClick={() => setEdit({ code: '', type: 'percent', value: 10, maxDiscount: '', minOrder: 0, usageLimit: '', expiresAt: '', isActive: true })} className="btn-primary px-5 py-3">New coupon</button>} />
      <Table head={['Code', 'Discount', 'Min order', 'Used', 'Expires', 'Active', '']}>
        {loading ? <Rows cols={7} /> : data.coupons.map((c) => (
          <tr key={c._id}>
            <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
            <td className="px-4">{c.type === 'percent' ? `${c.value}%${c.maxDiscount ? ` (max ${pkr(c.maxDiscount)})` : ''}` : pkr(c.value)}</td>
            <td className="px-4">{pkr(c.minOrder)}</td>
            <td className="px-4">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
            <td className="px-4">{c.expiresAt ? date(c.expiresAt) : '—'}</td>
            <td className="px-4">{c.isActive ? 'Yes' : 'No'}</td>
            <td className="space-x-3 px-4 text-end text-xs underline"><button onClick={() => setEdit({ ...c, expiresAt: c.expiresAt?.slice(0, 10) || '' })}>Edit</button><button onClick={() => del(c)} className="text-rose">Delete</button></td>
          </tr>
        ))}
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Coupon">
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code"><input className="input uppercase" value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} /></Field>
            <Field label="Type"><select className="input" value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed (PKR)</option></select></Field>
            {[['value', 'Value'], ['maxDiscount', 'Max discount (PKR)'], ['minOrder', 'Min order (PKR)'], ['usageLimit', 'Usage limit']].map(([k, l]) => (
              <Field key={k} label={l}><input type="number" min={0} className="input" value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></Field>
            ))}
            <Field label="Expires"><input type="date" className="input" value={edit.expiresAt} onChange={(e) => setEdit({ ...edit, expiresAt: e.target.value })} /></Field>
            <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" className="accent-rose" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active</label>
            <Button className="sm:col-span-2" loading={busy} onClick={save} disabled={!edit.code}>Save coupon</Button>
          </div>
        )}
      </Modal>
    </>
  );
}

export function Reviews() {
  const { data, loading, reload } = useAsync(() => adminService.reviews(), []);
  const set = async (r, status) => {
    await adminService.setReviewStatus(r._id, status);
    toast.success(`Review ${status.toLowerCase()}`);
    reload();
  };
  return (
    <>
      <PageHead title="Reviews" sub="Only customers with a delivered order can review." />
      <Table head={['Product', 'Customer', 'Rating', 'Comment', 'Status', '']}>
        {loading ? <Rows cols={6} /> : data.reviews.map((r) => (
          <tr key={r._id}>
            <td className="px-4 py-3">{r.product?.title}</td>
            <td className="px-4">{r.user?.name}</td>
            <td className="px-4"><Stars value={r.rating} /></td>
            <td className="max-w-sm px-4 text-muted">{r.comment}</td>
            <td className="px-4"><Badge s={r.status} /></td>
            <td className="px-4 text-end"><button className="text-xs underline" onClick={() => set(r, r.status === 'Approved' ? 'Hidden' : 'Approved')}>{r.status === 'Approved' ? 'Hide' : 'Approve'}</button></td>
          </tr>
        ))}
      </Table>
    </>
  );
}

export function StoreSettings() {
  const { data, loading } = useAsync(() => catalogService.settings(), []);
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const cur = s || data?.settings;
  if (loading || !cur) return <Skeleton className="h-96" />;
  const store = (k, v) => setS({ ...cur, store: { ...cur.store, [k]: v } });
  const rates = Object.entries(cur.shippingRates || {});
  const setRates = (list) => setS({ ...cur, shippingRates: Object.fromEntries(list.filter(([c]) => c)) });
  const save = async () => {
    setBusy(true);
    try {
      const n = (k) => +cur[k];
      setS((await adminService.saveSettings({ ...cur, defaultShippingFee: n('defaultShippingFee'), freeShippingAbove: n('freeShippingAbove'), lowStockLevel: n('lowStockLevel'), returnWindowDays: n('returnWindowDays'), shippingRates: Object.fromEntries(rates.map(([c, f]) => [c, +f])) })).settings);
      toast.success('Store settings saved');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead title="Store Settings" action={<Button loading={busy} onClick={save}>Save settings</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 border border-line bg-bg p-6">
          <p className="label text-gold">Store profile</p>
          {[['name', 'Store name'], ['logo', 'Logo URL'], ['phone', 'Phone'], ['email', 'Email'], ['whatsapp', 'WhatsApp (92XXXXXXXXXX)'], ['address', 'Address']].map(([k, l]) => (
            <Field key={k} label={l}><input className="input" value={cur.store[k] || ''} onChange={(e) => store(k, e.target.value)} /></Field>
          ))}
        </section>
        <section className="space-y-4 border border-line bg-bg p-6">
          <p className="label text-gold">Delivery, stock & returns</p>
          {[['defaultShippingFee', 'Default delivery fee (PKR)'], ['freeShippingAbove', 'Free delivery above (PKR)'], ['lowStockLevel', 'Low-stock level (units)'], ['returnWindowDays', 'Return window (days)']].map(([k, l]) => (
            <Field key={k} label={l}><input type="number" min={0} className="input" value={cur[k]} onChange={(e) => setS({ ...cur, [k]: e.target.value })} /></Field>
          ))}
          <div>
            <p className="label mb-2 text-muted">City delivery rates</p>
            <div className="space-y-2">
              {rates.map(([c, f], i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2">
                  <input className="input px-2 py-2" value={c} onChange={(e) => setRates(rates.map((r, n) => (n === i ? [e.target.value, r[1]] : r)))} />
                  <input type="number" className="input px-2 py-2" value={f} onChange={(e) => setRates(rates.map((r, n) => (n === i ? [r[0], e.target.value] : r)))} />
                  <button onClick={() => setRates(rates.filter((_, n) => n !== i))} className="px-2 text-xs text-rose underline">Remove</button>
                </div>
              ))}
            </div>
            <button onClick={() => setS({ ...cur, shippingRates: { ...cur.shippingRates, 'New city': cur.defaultShippingFee } })} className="mt-2 text-xs underline">+ Add city</button>
          </div>
        </section>
      </div>
    </>
  );
}

export function Activity() {
  const { data, loading } = useAsync(() => adminService.activity(), []);
  return (
    <>
      <PageHead title="Activity Log" />
      <Table head={['When', 'Admin', 'Action', 'Target', 'Details']}>
        {loading ? <Rows cols={5} /> : data.logs.length === 0 ? <tr><td colSpan={5}><EmptyState title="No activity yet" /></td></tr> : data.logs.map((l) => (
          <tr key={l._id}>
            <td className="px-4 py-3 text-muted">{new Date(l.createdAt).toLocaleString()}</td>
            <td className="px-4">{l.admin?.name}</td>
            <td className="px-4 font-mono text-xs">{l.action}</td>
            <td className="px-4">{l.targetType} {l.targetId}</td>
            <td className="px-4 font-mono text-xs text-muted">{l.details ? JSON.stringify(l.details) : ''}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
