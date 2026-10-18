import { useState } from 'react';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Trash2 } from 'lucide-react';
import { Button, Field, Skeleton } from '../components/ui.jsx';
import { useAsync } from '../hooks/index.js';
import { adminService } from '../services/index.js';
import { pkr } from '../utils/format.js';
import { CITIES } from '../utils/rules.js';
import { Card, DateRange, ImageField, PageHead, Tabs, Toggle, downloadText, presetRange } from './common.jsx';
import { axis, tooltipStyle } from './Overview.jsx';

/* ======================= Reports ======================= */
export default function Reports() {
  const [range, setRange] = useState(presetRange(30));
  const [view, setView] = useState('day');
  const { data, loading } = useAsync(() => adminService.reports(range), [range.from, range.to]);
  const exportCsv = async () => {
    try {
      downloadText(`fashionist-sales-by-${view}-${range.from}_${range.to}.csv`, await adminService.reportCsv({ ...range, type: view }));
    } catch (e) {
      toast.error(e.message);
    }
  };
  const rows = data && { day: data.byDay, category: data.byCategory, product: data.byProduct }[view];
  const key = { day: 'date', category: 'category', product: 'product' }[view];
  return (
    <>
      <PageHead title="Reports" sub="Sales excluding cancelled and returned orders" action={<><DateRange value={range} onChange={setRange} /><button onClick={exportCsv} className="btn-outline px-4 py-2.5"><Download className="h-4 w-4" /> CSV</button></>} />
      {loading ? <Skeleton className="h-96" /> : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
            {[['Revenue', pkr(data.totals.revenue)], ['Orders', data.totals.orders], ['Units sold', data.totals.units], ['Discounts', pkr(data.totals.discount)], ['Delivery fees', pkr(data.totals.shipping)]].map(([l, v]) => (
              <div key={l} className="border border-hairline bg-white p-4"><p className="label text-[10px] text-stone">{l}</p><p className="mt-2 font-display text-3xl">{v}</p></div>
            ))}
          </div>
          <Tabs value={view} onChange={setView} tabs={[['day', 'By day'], ['category', 'By category'], ['product', 'By product']]} />
          <Card>
            {rows.length === 0 ? <p className="py-16 text-center text-stone">No sales in this range</p> : (
              <ResponsiveContainer width="100%" height={300}>
                {view === 'day' ? (
                  <LineChart data={rows}>
                    <CartesianGrid stroke="#E4DCD0" vertical={false} />
                    <XAxis dataKey="date" tick={axis} tickFormatter={(d) => d.slice(5)} tickLine={false} axisLine={false} />
                    <YAxis tick={axis} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v, n) => (n === 'revenue' ? pkr(v) : v)} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="revenue" stroke="#E11D48" strokeWidth={2} dot={false} />
                  </LineChart>
                ) : (
                  <BarChart data={rows.slice(0, 12)} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid stroke="#E4DCD0" horizontal={false} />
                    <XAxis type="number" tick={axis} tickFormatter={(v) => `${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey={key} tick={axis} width={view === 'product' ? 180 : 110} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => pkr(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="revenue" fill="#141414" barSize={14} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            )}
          </Card>
          <div className="mt-6 overflow-x-auto border border-hairline bg-white">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b border-hairline bg-ivory"><tr>{[key, view === 'day' ? 'orders' : 'qty', 'revenue'].map((h) => <th key={h} className="label px-4 py-3 text-start text-[10px] capitalize text-stone">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-hairline">{rows.map((r) => <tr key={r[key]}><td className="px-4 py-2">{r[key]}</td><td className="px-4">{view === 'day' ? r.orders : r.qty}</td><td className="px-4">{pkr(r.revenue)}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ======================= Settings ======================= */
export function StoreSettings() {
  const { data, loading } = useAsync(() => adminService.settings(), []);
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const cur = s || data?.settings;
  if (loading || !cur) return <Skeleton className="h-96" />;
  const rates = Object.entries(cur.shippingRates || {});
  const store = (k, v) => setS({ ...cur, store: { ...cur.store, [k]: v } });
  const setRates = (list) => setS({ ...cur, shippingRates: Object.fromEntries(list) });
  const notif = cur.emailNotifications || {};
  const save = async () => {
    if (cur.store.email && !/^\S+@\S+\.\S+$/.test(cur.store.email)) return toast.error('Store email is not valid');
    if (rates.some(([c]) => !c.trim())) return toast.error('Every delivery rate needs a city');
    setBusy(true);
    try {
      const n = (k) => Math.max(0, +cur[k] || 0);
      const { store: st, emailNotifications } = cur;
      const r = await adminService.saveSettings({ store: st, emailNotifications, shippingRates: Object.fromEntries(rates.map(([c, f]) => [c.trim(), Math.max(0, +f || 0)])), defaultShippingFee: n('defaultShippingFee'), freeShippingAbove: n('freeShippingAbove'), lowStockLevel: n('lowStockLevel'), returnWindowDays: n('returnWindowDays') });
      setS(r.settings);
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead title="Settings" sub="Store details, delivery fees, stock and returns" action={<Button loading={busy} onClick={save} className="px-6 py-2.5">Save settings</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Store information">
          <div className="space-y-4">
            <ImageField label="Logo" value={cur.store.logo} onChange={(v) => store('logo', v)} aspect="aspect-[3/1]" />
            {[['name', 'Store name'], ['phone', 'Phone'], ['email', 'Email'], ['whatsapp', 'WhatsApp (92XXXXXXXXXX)'], ['address', 'Address']].map(([k, l]) => (
              <Field key={k} label={l}><input className="input bg-white" value={cur.store[k] || ''} onChange={(e) => store(k, e.target.value)} /></Field>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Delivery (PKR)">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Default fee"><input type="number" min={0} className="input bg-white" value={cur.defaultShippingFee} onChange={(e) => setS({ ...cur, defaultShippingFee: e.target.value })} /></Field>
              <Field label="Free delivery above"><input type="number" min={0} className="input bg-white" value={cur.freeShippingAbove} onChange={(e) => setS({ ...cur, freeShippingAbove: e.target.value })} /></Field>
            </div>
            <p className="label mb-2 mt-5 text-[10px] text-stone">Fee per city</p>
            <div className="space-y-2">
              {rates.map(([c, f], i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2">
                  <input list="pk-cities" className="input bg-white px-3 py-2" value={c} aria-label="City" onChange={(e) => setRates(rates.map((r, n) => (n === i ? [e.target.value, r[1]] : r)))} />
                  <input type="number" min={0} className="input bg-white px-3 py-2" value={f} aria-label={`Fee for ${c}`} onChange={(e) => setRates(rates.map((r, n) => (n === i ? [r[0], e.target.value] : r)))} />
                  <button onClick={() => setRates(rates.filter((_, n) => n !== i))} aria-label="Remove city" className="px-2 text-stone hover:text-rose"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
              <datalist id="pk-cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <button onClick={() => setRates([...rates, [CITIES.find((c) => !cur.shippingRates?.[c]) || '', cur.defaultShippingFee]])} className="mt-3 text-xs underline">+ Add city</button>
          </Card>
          <Card title="Stock & returns">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Low-stock level (units)"><input type="number" min={0} className="input bg-white" value={cur.lowStockLevel} onChange={(e) => setS({ ...cur, lowStockLevel: e.target.value })} /></Field>
              <Field label="Return window (days)"><input type="number" min={0} max={60} className="input bg-white" value={cur.returnWindowDays} onChange={(e) => setS({ ...cur, returnWindowDays: e.target.value })} /></Field>
            </div>
          </Card>
          <Card title="Email notifications">
            <div className="space-y-3 text-sm">
              {[['orderPlaced', 'Order confirmation to customer'], ['statusChanged', 'Status updates to customer (shipped, delivered…)'], ['lowStock', 'Low-stock alerts to the store email']].map(([k, l]) => (
                <label key={k} className="flex items-center gap-3"><Toggle checked={notif[k] !== false} onChange={(v) => setS({ ...cur, emailNotifications: { ...notif, [k]: v } })} label={l} /> {l}</label>
              ))}
              <p className="text-xs text-stone">Emails are sent through the SMTP server configured in server/.env.</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
