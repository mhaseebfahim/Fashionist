import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Img, Skeleton } from '../components/ui.jsx';
import { useAsync } from '../hooks/index.js';
import { adminService } from '../services/index.js';
import { date, pkr } from '../utils/format.js';
import { Badge, Card, DateRange, PageHead, presetRange } from './common.jsx';

// Brand-only palette for status slices (ink → stone → gold → rose).
export const STATUS_COLOURS = { Pending: '#B08D57', Confirmed: '#141414', Shipped: '#8A8178', Delivered: '#3D3A36', Cancelled: '#E11D48', Returned: '#9F1239' };
export const axis = { fontSize: 11, fill: '#8A8178' };
export const tooltipStyle = { borderRadius: 0, border: '1px solid #E4DCD0', fontSize: 12 };

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

function Kpi({ label, value, hint, to }) {
  const body = (
    <div className="h-full border border-hairline bg-white p-5 transition hover:border-ink">
      <p className="label text-[10px] text-stone">{label}</p>
      <p className="mt-3 font-display text-3xl font-semibold xl:text-4xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone">{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export default function Overview() {
  const user = useSelector((s) => s.auth.user);
  const [range, setRange] = useState(presetRange(30));
  const { data, loading } = useAsync(() => adminService.dashboard(range), [range.from, range.to]);
  const k = data?.kpis;
  return (
    <>
      <PageHead title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`} sub="Here is how Fashionist is doing." action={<DateRange value={range} onChange={setRange} />} />
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <Kpi label="Today's sales" value={pkr(k.todaySales)} hint={`${k.todayOrders} orders today`} />
            <Kpi label="This month" value={pkr(k.monthRevenue)} hint="revenue, excl. cancelled" />
            <Kpi label="Orders in range" value={k.orders} hint={pkr(k.revenue)} to="/admin/orders" />
            <Kpi label="Average order" value={pkr(k.aov)} />
            <Kpi label="New customers" value={k.newCustomers} to="/admin/customers" />
            <Kpi label="Low stock" value={k.lowStock} hint={`${k.pendingReturns} return requests`} to="/admin/inventory?low=true" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card title="Revenue (PKR)" className="lg:col-span-2">
              {data.daily.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.daily} margin={{ left: 0, right: 8, top: 8 }}>
                    <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E11D48" stopOpacity={0.22} /><stop offset="100%" stopColor="#E11D48" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke="#E4DCD0" vertical={false} />
                    <XAxis dataKey="date" tick={axis} tickFormatter={(d) => d.slice(5)} tickLine={false} axisLine={false} />
                    <YAxis tick={axis} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v) => pkr(v)} contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="revenue" stroke="#E11D48" strokeWidth={2} fill="url(#rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="py-20 text-center text-stone">No sales in this range</p>}
            </Card>
            <Card title="Orders by status">
              {data.byStatus.length ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.byStatus} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                        {data.byStatus.map((s) => <Cell key={s.status} fill={STATUS_COLOURS[s.status]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
                    {data.byStatus.map((s) => (
                      <li key={s.status}><Link to={`/admin/orders?status=${s.status}`} className="flex items-center gap-2 hover:underline"><span className="h-2 w-2" style={{ background: STATUS_COLOURS[s.status] }} />{s.status}<span className="ms-auto text-stone">{s.count}</span></Link></li>
                    ))}
                  </ul>
                </>
              ) : <p className="py-20 text-center text-stone">No orders</p>}
            </Card>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card title="Recent orders" className="lg:col-span-2" pad={false} action={<Link to="/admin/orders" className="text-xs underline">All orders</Link>}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <tbody className="divide-y divide-hairline">
                    {data.recentOrders.map((o) => (
                      <tr key={o._id} className="hover:bg-ivory">
                        <td className="px-5 py-3"><Link to={`/admin/orders?open=${o._id}`} className="font-medium hover:underline">{o.orderNumber}</Link></td>
                        <td className="px-3">{o.shippingAddress?.name}</td>
                        <td className="px-3 text-stone">{date(o.createdAt)}</td>
                        <td className="px-3">{pkr(o.total)}</td>
                        <td className="px-5 text-end"><Badge s={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card title="Top products" pad={false}>
              <ul className="divide-y divide-hairline">
                {data.topProducts.length === 0 && <li className="p-5 text-sm text-stone">No sales yet</li>}
                {data.topProducts.map((p, i) => (
                  <li key={p.title} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="w-4 font-display text-lg text-gold">{i + 1}</span>
                    <Img src={p.image} alt="" w={36} h={48} className="h-12 w-9 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{p.title}</span>
                    <span className="text-end text-xs"><b className="block text-sm">{pkr(p.revenue)}</b>{p.qty} sold</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card title="Low stock" className="mt-6" pad={false} action={<Link to="/admin/inventory?low=true" className="text-xs underline">Inventory</Link>}>
            <ul className="grid divide-y divide-hairline sm:grid-cols-2 sm:divide-y-0">
              {data.lowStockList.length === 0 && <li className="p-5 text-sm text-stone">Everything is well stocked ◆</li>}
              {data.lowStockList.map((r) => (
                <li key={r.sku} className="flex items-center gap-3 border-hairline px-5 py-3 text-sm sm:border-b">
                  <Img src={r.image} alt="" w={32} h={42} className="h-10 w-8 shrink-0" />
                  <span className="min-w-0 flex-1"><span className="block truncate">{r.title}</span><span className="font-mono text-[11px] text-stone">{r.sku}</span></span>
                  <span className={`font-display text-2xl ${r.stock === 0 ? 'text-rose' : ''}`}>{r.stock}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
