import { useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Boxes, ClipboardList, FolderTree, History, LogOut, Menu, MessageSquare, Package, RotateCcw, Settings, Store, Tag, Users, X } from 'lucide-react';
import { ErrorPage, Logo, Skeleton } from '../components/ui.jsx';
import { useAsync } from '../hooks/index.js';
import { adminService } from '../services/index.js';
import { logout } from '../features/store.js';
import { pkr } from '../utils/format.js';
import { PageHead } from './common.jsx';
import { Products, ProductEditor, Inventory, Categories } from './AdminCatalog.jsx';
import { Orders, OrderDetail, Returns, Customers, Coupons, Reviews, StoreSettings, Activity } from './AdminSales.jsx';

const NAV = [
  ['', 'Dashboard', BarChart3],
  ['orders', 'Orders', ClipboardList],
  ['returns', 'Returns', RotateCcw],
  ['products', 'Products', Package],
  ['inventory', 'Inventory', Boxes],
  ['categories', 'Categories', FolderTree],
  ['customers', 'Customers', Users],
  ['coupons', 'Coupons', Tag],
  ['reviews', 'Reviews', MessageSquare],
  ['settings', 'Store Settings', Settings],
  ['activity', 'Activity Log', History],
];

const Stat = ({ label, value, hint }) => (
  <div className="border border-line bg-bg p-5">
    <p className="label text-[10px] text-muted">{label}</p>
    <p className="mt-3 font-display text-4xl">{value}</p>
    {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
  </div>
);

function Dashboard() {
  const [days, setDays] = useState(30);
  const { data, loading } = useAsync(() => adminService.dashboard(days), [days]);
  const axis = { fontSize: 11, fill: 'rgb(var(--muted))' };
  return (
    <>
      <PageHead
        title="Sales Analytics"
        sub="Cash on Delivery · all of Pakistan"
        action={<div className="flex gap-1">{[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`chip ${days === d ? 'chip-active' : ''}`}>{d}d</button>)}</div>}
      />
      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <Stat label="Revenue" value={pkr(data.revenue)} hint={`last ${days} days`} />
            <Stat label="Orders" value={data.orders} />
            <Stat label="Avg order" value={pkr(data.aov)} />
            <Stat label="Customers" value={data.customers} />
            <Link to="/admin/inventory?low=true"><Stat label="Low stock" value={data.lowStock} hint="products" /></Link>
            <Link to="/admin/returns"><Stat label="Pending returns" value={data.pendingReturns} /></Link>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="border border-line bg-bg p-5 lg:col-span-2">
              <p className="label mb-4">Revenue (PKR)</p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.daily}>
                  <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E11D48" stopOpacity={0.25} /><stop offset="100%" stopColor="#E11D48" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid stroke="rgb(var(--line))" vertical={false} />
                  <XAxis dataKey="date" tick={axis} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={axis} width={60} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v) => pkr(v)} contentStyle={{ borderRadius: 0, border: '1px solid #E4DCD0' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#E11D48" strokeWidth={2} fill="url(#rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="border border-line bg-bg p-5">
              <p className="label mb-4">Orders by status</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.byStatus} layout="vertical">
                  <XAxis type="number" tick={axis} allowDecimals={false} />
                  <YAxis type="category" dataKey="status" tick={axis} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 0 }} />
                  <Bar dataKey="count" fill="#141414" barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="border border-line bg-bg p-5">
              <p className="label mb-4">Top products</p>
              <table className="w-full text-sm"><tbody>{data.topProducts.map((p) => <tr key={p.title} className="border-b border-line last:border-0"><td className="py-2.5">{p.title}</td><td className="text-end text-muted">{p.qty} sold</td><td className="text-end">{pkr(p.revenue)}</td></tr>)}</tbody></table>
            </div>
            <div className="border border-line bg-bg p-5">
              <p className="label mb-4">Top cities</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byCity}><XAxis dataKey="city" tick={axis} /><YAxis tick={axis} allowDecimals={false} width={30} /><Tooltip contentStyle={{ borderRadius: 0 }} /><Bar dataKey="orders" fill="#B08D57" barSize={24} /></BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function AdminApp() {
  const dispatch = useDispatch();
  const nav = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const side = (
    <nav className="flex h-full flex-col">
      <div className="flex h-[72px] items-center border-b border-line px-6"><Logo size="text-base" /></div>
      <ul className="flex-1 space-y-0.5 overflow-auto p-3">
        {NAV.map(([to, label, I]) => (
          <li key={label}>
            <NavLink to={`/admin/${to}`} end={!to} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm ${isActive ? 'bg-fg text-bg' : 'text-muted hover:bg-surface hover:text-fg'}`}>
              <I className="h-4 w-4" strokeWidth={1.5} /> {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="space-y-1 border-t border-line p-3 text-sm">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 text-muted hover:text-fg"><Store className="h-4 w-4" /> View store</Link>
        <button onClick={() => (dispatch(logout()), nav('/'))} className="flex w-full items-center gap-3 px-3 py-2 text-muted hover:text-rose"><LogOut className="h-4 w-4" /> Log out</button>
      </div>
    </nav>
  );
  return (
    <div className="min-h-screen bg-surface/50 lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-screen border-e border-line bg-bg lg:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-64 bg-bg" onClick={(e) => e.stopPropagation()}>{side}</aside>
        </div>
      )}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-bg px-4 sm:px-8">
          <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          <p className="label hidden text-[10px] text-muted lg:block">Fashionist · Store Owner Console</p>
          <p className="text-sm">{user?.name}</p>
        </header>
        <main className="p-4 sm:p-8">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="returns" element={<Returns />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="categories" element={<Categories />} />
            <Route path="customers" element={<Customers />} />
            <Route path="coupons" element={<Coupons />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="settings" element={<StoreSettings />} />
            <Route path="activity" element={<Activity />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
