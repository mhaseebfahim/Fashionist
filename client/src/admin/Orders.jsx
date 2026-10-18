import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Check, Download, Printer } from 'lucide-react';
import { Button, Diamond, Field, Img, Modal, Skeleton, Spinner, StatusTracker } from '../components/ui.jsx';
import { useAsync, useDebounce } from '../hooks/index.js';
import { adminService } from '../services/index.js';
import { date, pkr } from '../utils/format.js';
import { CITIES, ORDER_STATUSES, TRANSITIONS } from '../utils/rules.js';
import { Badge, Card, Drawer, Empty, PageHead, Rows, Table, Tabs, downloadText } from './common.jsx';

const COURIERS = ['TCS', 'Leopards', 'M&P', 'PostEx', 'Trax', 'Call Courier', 'BlueEx'];
const ACTION_LABEL = { Confirmed: 'Confirm', Shipped: 'Ship', Delivered: 'Mark delivered', Cancelled: 'Cancel' };

export function OrderPanel({ id, onChanged }) {
  const { data, loading, setData } = useAsync(() => adminService.order(id), [id]);
  const [ship, setShip] = useState(false);
  const [courier, setCourier] = useState({ courier: 'TCS', trackingNumber: '' });
  const [busy, setBusy] = useState('');
  if (loading || !data) return <Skeleton className="h-96" />;
  const o = data.order;
  const move = async (status, extra = {}) => {
    if (status === 'Cancelled' && !confirm('Cancel this order? Items go back into stock.')) return;
    setBusy(status);
    try {
      const r = await adminService.setStatus(o._id, { status, ...extra });
      setData({ order: { ...r.order, user: o.user } });
      onChanged?.(r.order);
      toast.success(`Order ${status.toLowerCase()}`);
      setShip(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };
  const next = TRANSITIONS[o.status].filter((s) => s !== 'Returned');
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge s={o.status} />
        <span className="text-xs text-stone">Placed {new Date(o.createdAt).toLocaleString()} · COD · {o.paymentStatus}</span>
        <span className="ms-auto flex gap-2">
          <Link to={`/admin/print/invoice/${o._id}`} target="_blank" className="btn-outline px-3 py-2"><Printer className="h-3.5 w-3.5" /> Invoice</Link>
          <Link to={`/admin/print/slip/${o._id}`} target="_blank" className="btn-outline px-3 py-2"><Printer className="h-3.5 w-3.5" /> Packing slip</Link>
        </span>
      </div>
      <Card>
        <StatusTracker order={o} />
        {next.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-hairline pt-5">
            {next.map((s) => (
              <Button key={s} variant={s === 'Cancelled' ? 'outline' : 'primary'} loading={busy === s} className="px-4 py-2.5" onClick={() => (s === 'Shipped' ? setShip(true) : move(s))}>{ACTION_LABEL[s]}</Button>
            ))}
          </div>
        )}
        {o.trackingNumber && <p className="mt-4 text-sm">Courier <b>{o.courier}</b> · tracking <b className="font-mono">{o.trackingNumber}</b></p>}
      </Card>
      <Card title="Items" pad={false}>
        <ul className="divide-y divide-hairline">
          {o.items.map((i) => (
            <li key={i.sku} className="flex items-center gap-3 px-5 py-3 text-sm">
              <Img src={i.image} alt="" w={40} h={52} className="h-14 w-11 shrink-0" />
              <div className="min-w-0 flex-1"><p className="truncate">{i.title}</p><p className="font-mono text-[11px] text-stone">{i.sku} · {i.colour} · {i.size}</p></div>
              <span className="whitespace-nowrap">{i.qty} × {pkr(i.price)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-hairline px-5 py-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{pkr(o.subtotal)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between text-rose"><dt>Discount ({o.coupon?.code})</dt><dd>− {pkr(o.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{o.shippingFee ? pkr(o.shippingFee) : 'Free'}</dd></div>
          <div className="flex justify-between font-display text-xl"><dt>Collect on delivery</dt><dd>{pkr(o.paymentStatus === 'Paid' ? 0 : o.total)}</dd></div>
        </dl>
      </Card>
      <div className="grid gap-5 sm:grid-cols-2">
        <Card title="Customer">
          <p className="font-medium">{o.user?.name}</p>
          <p className="text-sm text-stone">{o.user?.email}</p>
          {o.user?._id && <Link to={`/admin/customers?open=${o.user._id}`} className="mt-2 inline-block text-xs underline">Customer profile</Link>}
        </Card>
        <Card title="Ship to">
          <p className="font-medium">{o.shippingAddress.name}</p>
          <p className="text-sm"><a href={`tel:${o.shippingAddress.phone}`}>{o.shippingAddress.phone}</a></p>
          <p className="text-sm text-stone">{o.shippingAddress.street}, {o.shippingAddress.area}, {o.shippingAddress.city}</p>
        </Card>
      </div>
      {o.returnRequest?.status && <ReturnBox order={o} onChange={(order) => (setData({ order: { ...order, user: o.user } }), onChanged?.(order))} />}
      <Card title="Timeline">
        <ol className="relative space-y-3 border-s border-hairline ps-5">
          {o.statusHistory.map((h, i) => (
            <li key={i} className="text-sm">
              <span className="absolute -start-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-rose" />
              <b>{h.status}</b> <span className="text-xs text-stone">· {new Date(h.at).toLocaleString()}</span>
              {h.note && <p className="text-xs text-stone">{h.note}</p>}
            </li>
          ))}
        </ol>
      </Card>
      <Modal open={ship} onClose={() => setShip(false)} title="Ship order">
        <div className="space-y-4">
          <Field label="Courier"><select className="input" value={courier.courier} onChange={(e) => setCourier({ ...courier, courier: e.target.value })}>{COURIERS.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Tracking number"><input className="input font-mono" value={courier.trackingNumber} onChange={(e) => setCourier({ ...courier, trackingNumber: e.target.value.trim() })} /></Field>
          <Button className="w-full" loading={busy === 'Shipped'} disabled={!courier.trackingNumber} onClick={() => move('Shipped', courier)}>Mark shipped</Button>
        </div>
      </Modal>
    </div>
  );
}

function ReturnBox({ order, onChange }) {
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const r = order.returnRequest;
  const decide = async (decision) => {
    setBusy(decision);
    try {
      onChange((await adminService.decideReturn(order._id, decision, note)).order);
      toast.success(decision === 'Approved' ? 'Return approved — stock restored' : 'Return rejected');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };
  return (
    <Card title="Return / exchange request" action={<Badge s={r.status} />}>
      <p className="text-sm capitalize"><b>{r.type}</b> · requested {date(r.requestedAt)}</p>
      <p className="mt-2 font-display text-lg italic text-stone">“{r.reason}”</p>
      {r.note && <p className="mt-2 text-xs">Note: {r.note}</p>}
      {r.status === 'Requested' && (
        <div className="mt-4 space-y-3">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the record (optional)" className="input" aria-label="Decision note" />
          <div className="flex gap-2">
            <Button className="flex-1 px-3 py-2.5" loading={busy === 'Approved'} onClick={() => decide('Approved')}>Approve & restock</Button>
            <Button variant="outline" className="flex-1 px-3 py-2.5" loading={busy === 'Rejected'} onClick={() => decide('Rejected')}>Reject</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Orders() {
  const [sp, setSp] = useSearchParams();
  const status = sp.get('status') || '';
  const [f, setF] = useState({ q: '', city: '', from: '', to: '' });
  const dq = useDebounce(f.q);
  const params = { status: status || undefined, q: dq || undefined, city: f.city || undefined, from: f.from || undefined, to: f.to || undefined, limit: 100 };
  const { data, loading, reload, setData } = useAsync(() => adminService.orders(params), [status, dq, f.city, f.from, f.to]);
  const [sel, setSel] = useState([]);
  const [bulk, setBulk] = useState('Confirmed');
  const [busy, setBusy] = useState(false);
  const open = sp.get('open');
  const orders = data?.orders || [];
  const setParam = (k, v) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    setSp(n, { replace: true });
  };
  useEffect(() => setSel([]), [status]);

  const runBulk = async () => {
    if (!confirm(`Set ${sel.length} order(s) to ${bulk}?`)) return;
    setBusy(true);
    try {
      const r = await adminService.bulkStatus({ ids: sel, status: bulk });
      const failed = r.results.filter((x) => !x.ok);
      toast.success(`${r.updated} updated`);
      if (failed.length) toast.error(`${failed.length} skipped: ${failed.slice(0, 3).map((x) => `${x.orderNumber} (${x.message})`).join(', ')}`, { duration: 6000 });
      setSel([]);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const exportCsv = async () => {
    try {
      downloadText('fashionist-orders.csv', await adminService.ordersCsv(params));
    } catch (e) {
      toast.error(e.message);
    }
  };
  const allOn = orders.length > 0 && sel.length === orders.length;
  return (
    <>
      <PageHead title="Orders" sub="Cash on Delivery · status changes follow the order rules" action={<button onClick={exportCsv} className="btn-outline px-4 py-2.5"><Download className="h-4 w-4" /> Export CSV</button>} />
      <Tabs value={status} onChange={(v) => setParam('status', v)} tabs={[['', 'All', data?.counts?.All], ...ORDER_STATUSES.map((s) => [s, s, data?.counts?.[s] || 0])]} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Order number, phone or name…" className="input max-w-xs bg-white" aria-label="Search orders" />
        <select value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} className="input w-auto bg-white" aria-label="City"><option value="">All cities</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
        <input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="input w-auto bg-white" aria-label="From date" />
        <input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="input w-auto bg-white" aria-label="To date" />
      </div>
      {sel.length > 0 && (
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-3 bg-ink px-4 py-2.5 text-sm text-ivory">
          {sel.length} selected
          <select value={bulk} onChange={(e) => setBulk(e.target.value)} className="bg-ink px-2 py-1" aria-label="New status">{['Confirmed', 'Delivered', 'Cancelled'].map((s) => <option key={s}>{s}</option>)}</select>
          <button onClick={runBulk} disabled={busy} className="bg-rose px-3 py-1">{busy ? <Spinner /> : 'Update status'}</button>
          <span className="text-xs text-ivory/60">Shipping needs tracking numbers — ship orders individually.</span>
        </div>
      )}
      <Table head={[<input key="a" type="checkbox" aria-label="Select all" className="accent-rose" checked={allOn} onChange={() => setSel(allOn ? [] : orders.map((o) => o._id))} />, 'Order', 'Date', 'Customer', 'City', 'Total', 'Status', 'Payment']} empty={!loading && !orders.length && <Empty text="No orders match" />}>
        {loading ? <Rows cols={8} /> : orders.map((o) => (
          <tr key={o._id} className="cursor-pointer hover:bg-ivory/70" onClick={() => setParam('open', o._id)}>
            <td className="w-10 px-4" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${o.orderNumber}`} className="accent-rose" checked={sel.includes(o._id)} onChange={() => setSel((s) => (s.includes(o._id) ? s.filter((x) => x !== o._id) : [...s, o._id]))} /></td>
            <td className="px-4 py-3 font-medium">{o.orderNumber}{o.returnRequest?.status === 'Requested' && <span className="ms-2 inline-block h-2 w-2 rounded-full bg-gold" title="Return requested" />}</td>
            <td className="px-4 text-stone">{date(o.createdAt)}</td>
            <td className="px-4">{o.shippingAddress.name}<span className="block text-xs text-stone">{o.shippingAddress.phone}</span></td>
            <td className="px-4">{o.shippingAddress.city}</td>
            <td className="px-4">{pkr(o.total)}</td>
            <td className="px-4"><Badge s={o.status} /></td>
            <td className="px-4 text-xs">{o.paymentStatus === 'Paid' ? <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Paid</span> : 'Unpaid'}</td>
          </tr>
        ))}
      </Table>
      <Drawer open={!!open} onClose={() => setParam('open', '')} title={orders.find((o) => o._id === open)?.orderNumber || 'Order'}>
        {open && <OrderPanel id={open} onChanged={(u) => setData({ ...data, orders: orders.map((o) => (o._id === u._id ? { ...o, ...u, user: o.user } : o)) })} />}
      </Drawer>
    </>
  );
}

/* ======================= Returns ======================= */
export function Returns() {
  const [status, setStatus] = useState('Requested');
  const { data, loading, reload } = useAsync(() => adminService.returns(status || undefined), [status]);
  const [open, setOpen] = useState(null);
  return (
    <>
      <PageHead title="Returns & Exchanges" sub="Approving restores stock and marks the order Returned." />
      <Tabs value={status} onChange={setStatus} tabs={[['Requested', 'Requested'], ['Approved', 'Approved'], ['Rejected', 'Rejected'], ['', 'All']]} />
      <Table head={['Order', 'Customer', 'Type', 'Reason', 'Requested', 'Status', '']} empty={!loading && !data?.orders.length && <Empty text="No return requests" />}>
        {loading ? <Rows cols={7} /> : data.orders.map((o) => (
          <tr key={o._id}>
            <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
            <td className="px-4">{o.shippingAddress.name}</td>
            <td className="px-4 capitalize">{o.returnRequest.type}</td>
            <td className="max-w-xs truncate px-4 text-stone">{o.returnRequest.reason}</td>
            <td className="px-4">{date(o.returnRequest.requestedAt)}</td>
            <td className="px-4"><Badge s={o.returnRequest.status} /></td>
            <td className="px-4 text-end"><button onClick={() => setOpen(o._id)} className="text-xs underline">{o.returnRequest.status === 'Requested' ? 'Review' : 'View'}</button></td>
          </tr>
        ))}
      </Table>
      <Drawer open={!!open} onClose={() => (setOpen(null), reload())} title="Return request">{open && <OrderPanel id={open} />}</Drawer>
    </>
  );
}

/* ======================= Print: invoice / packing slip ======================= */
export function PrintDoc() {
  const { kind, id } = useParams();
  const { data, loading, error } = useAsync(() => adminService.invoice(id), [id]);
  useEffect(() => {
    if (data) setTimeout(() => window.print(), 400);
  }, [data]);
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner className="h-6 w-6" /></div>;
  if (error) return <p className="p-10">{error.message}</p>;
  const { order: o, store } = data;
  const invoice = kind === 'invoice';
  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-ink print:p-0">
      <style>{'@media print { @page { margin: 14mm } .no-print { display: none } }'}</style>
      <div className="no-print mb-6 flex gap-2"><button onClick={() => window.print()} className="btn-ink px-4 py-2"><Printer className="h-4 w-4" /> Print</button></div>
      <header className="flex items-start justify-between border-b-2 border-ink pb-6">
        <div>
          <p className="flex items-center gap-2 font-display text-2xl font-semibold tracking-brand"><Diamond className="h-3 w-3" /> FASHIONIST</p>
          <p className="mt-1 text-xs text-stone">{store?.address} · {store?.phone} · {store?.email}</p>
        </div>
        <div className="text-end">
          <p className="label text-xs">{invoice ? 'Invoice' : 'Packing slip'}</p>
          <p className="font-display text-2xl">{o.orderNumber}</p>
          <p className="text-xs text-stone">{date(o.createdAt)}</p>
        </div>
      </header>
      <section className="grid grid-cols-2 gap-8 py-6 text-sm">
        <div><p className="label mb-1 text-[10px] text-stone">Ship to</p><p className="font-semibold">{o.shippingAddress.name}</p><p>{o.shippingAddress.phone}</p><p>{o.shippingAddress.street}, {o.shippingAddress.area}</p><p>{o.shippingAddress.city}</p></div>
        <div><p className="label mb-1 text-[10px] text-stone">Payment</p><p>Cash on Delivery — {o.paymentStatus}</p>{o.courier && <p className="mt-2">Courier: {o.courier} · {o.trackingNumber}</p>}</div>
      </section>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-ink text-start">{['Item', 'SKU', 'Qty', ...(invoice ? ['Price', 'Total'] : ['Packed'])].map((h) => <th key={h} className="label py-2 text-start text-[10px]">{h}</th>)}</tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.sku} className="border-b border-hairline">
              <td className="py-2">{i.title}<span className="block text-xs text-stone">{i.colour} · {i.size}</span></td>
              <td className="font-mono text-xs">{i.sku}</td>
              <td>{i.qty}</td>
              {invoice ? <><td>{pkr(i.price)}</td><td>{pkr(i.price * i.qty)}</td></> : <td>☐</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {invoice && (
        <dl className="ms-auto mt-4 w-64 space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{pkr(o.subtotal)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between"><dt>Discount ({o.coupon?.code})</dt><dd>− {pkr(o.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Delivery</dt><dd>{pkr(o.shippingFee)}</dd></div>
          <div className="flex justify-between border-t border-ink pt-1 font-semibold"><dt>Total</dt><dd>{pkr(o.total)}</dd></div>
        </dl>
      )}
      <p className="mt-8 inline-block border-2 border-ink px-4 py-2 font-semibold">COLLECT CASH: {pkr(o.paymentStatus === 'Paid' ? 0 : o.total)}</p>
      <p className="mt-10 font-display text-lg italic text-stone">Thank you for shopping with Fashionist — Wear Your Story.</p>
    </div>
  );
}
