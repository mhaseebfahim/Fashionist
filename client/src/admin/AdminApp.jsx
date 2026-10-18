// Fashionist Atelier — the single store owner's console.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell, BarChart3, Boxes, ClipboardList, Command, Upload, FolderTree, History, Home, Image, LayoutTemplate, LogOut, Megaphone, Menu, MessageSquare,
  Navigation as NavIcon, Package, Palette, FileText, RotateCcw, Search, Settings, Store, Tag, TrendingUp, Users,
} from 'lucide-react';
import { Diamond, ErrorPage, Spinner, useMeta } from '../components/ui.jsx';
import { useDebounce } from '../hooks/index.js';
import { adminService } from '../services/index.js';
import { logout } from '../features/store.js';
import { pkr } from '../utils/format.js';

const Overview = lazy(() => import('./Overview.jsx'));
const Products = lazy(() => import('./Products.jsx'));
const ProductEditor = lazy(() => import('./Products.jsx').then((m) => ({ default: m.ProductEditor })));
const BulkImport = lazy(() => import('./Products.jsx').then((m) => ({ default: m.BulkImport })));
const Categories = lazy(() => import('./Catalog.jsx'));
const Inventory = lazy(() => import('./Catalog.jsx').then((m) => ({ default: m.Inventory })));
const Orders = lazy(() => import('./Orders.jsx'));
const Returns = lazy(() => import('./Orders.jsx').then((m) => ({ default: m.Returns })));
const PrintDoc = lazy(() => import('./Orders.jsx').then((m) => ({ default: m.PrintDoc })));
const Customers = lazy(() => import('./People.jsx'));
const Coupons = lazy(() => import('./People.jsx').then((m) => ({ default: m.Coupons })));
const Reviews = lazy(() => import('./People.jsx').then((m) => ({ default: m.Reviews })));
const Activity = lazy(() => import('./People.jsx').then((m) => ({ default: m.Activity })));
const Reports = lazy(() => import('./Reports.jsx'));
const StoreSettings = lazy(() => import('./Reports.jsx').then((m) => ({ default: m.StoreSettings })));
const Builder = lazy(() => import('./cms/Builder.jsx'));
const ThemeEditor = lazy(() => import('./cms/Editors.jsx').then((m) => ({ default: m.ThemeEditor })));
const NavigationEditor = lazy(() => import('./cms/Editors.jsx').then((m) => ({ default: m.NavigationEditor })));
const AnnouncementEditor = lazy(() => import('./cms/Editors.jsx').then((m) => ({ default: m.AnnouncementEditor })));
const PagesEditor = lazy(() => import('./cms/Editors.jsx').then((m) => ({ default: m.PagesEditor })));
const MediaLibrary = lazy(() => import('./cms/Editors.jsx').then((m) => ({ default: m.MediaLibrary })));

export const NAV = [
  { group: 'Store', items: [['', 'Overview', Home], ['orders', 'Orders', ClipboardList], ['returns', 'Returns', RotateCcw], ['products', 'Products', Package], ['import', 'Bulk Import', Upload], ['categories', 'Categories', FolderTree], ['inventory', 'Inventory', Boxes]] },
  { group: 'People', items: [['customers', 'Customers', Users], ['coupons', 'Coupons', Tag], ['reviews', 'Reviews', MessageSquare]] },
  { group: 'Insights', items: [['reports', 'Reports', TrendingUp], ['activity', 'Activity Log', History]] },
  { group: 'Website', items: [['cms/homepage', 'Homepage Builder', LayoutTemplate], ['cms/theme', 'Theme', Palette], ['cms/navigation', 'Navigation', NavIcon], ['cms/announcement', 'Announcement Bar', Megaphone], ['cms/pages', 'Pages', FileText], ['cms/media', 'Media Library', Image]] },
  { group: 'System', items: [['settings', 'Settings', Settings]] },
];
const FLAT = NAV.flatMap((g) => g.items);
const ACTIONS = [
  ['New product', '/admin/products/new', Package],
  ['Import products from CSV', '/admin/import', Upload],
  ['New coupon', '/admin/coupons?new=1', Tag],
  ['Pending orders', '/admin/orders?status=Pending', ClipboardList],
  ['Low-stock variants', '/admin/inventory?low=true', Boxes],
  ['Edit homepage', '/admin/cms/homepage', LayoutTemplate],
  ['Sales report (30 days)', '/admin/reports', BarChart3],
  ['View store', '/', Store],
];

function Rail({ onNavigate, expanded }) {
  return (
    <nav aria-label="Atelier" className="flex h-full flex-col">
      <Link to="/admin" className="flex h-16 shrink-0 items-center gap-3 border-b border-hairline px-5" onClick={onNavigate}>
        <Diamond className="h-3 w-3 shrink-0" />
        <span className={`whitespace-nowrap font-display text-lg font-semibold tracking-[0.2em] transition-opacity ${expanded ? 'opacity-100' : 'opacity-0 lg:group-hover/rail:opacity-100'}`}>ATELIER</span>
      </Link>
      <div className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-3">
        {NAV.map((g) => (
          <div key={g.group} className="mb-3">
            <p className={`label px-5 pb-1 pt-2 text-[9px] text-gold transition-opacity ${expanded ? 'opacity-100' : 'opacity-0 lg:group-hover/rail:opacity-100'}`}>{g.group}</p>
            {g.items.map(([to, label, I]) => (
              <NavLink key={to} to={`/admin/${to}`} end={!to} onClick={onNavigate} title={label} className={({ isActive }) => `relative mx-2 flex items-center gap-3 px-3 py-2 text-sm transition ${isActive ? 'bg-ivory text-ink before:absolute before:inset-y-1 before:start-0 before:w-0.5 before:bg-rose' : 'text-stone hover:bg-ivory hover:text-ink'}`}>
                <I className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                <span className={`whitespace-nowrap transition-opacity ${expanded ? 'opacity-100' : 'opacity-0 lg:group-hover/rail:opacity-100'}`}>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}

function CommandPalette({ open, onClose }) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const [remote, setRemote] = useState({ orders: [], products: [], customers: [] });
  const dq = useDebounce(q, 200);
  const input = useRef(null);
  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 30), setQ(''), setI(0);
  }, [open]);
  useEffect(() => {
    if (dq.length < 2) return setRemote({ orders: [], products: [], customers: [] });
    let alive = true;
    adminService.search(dq).then((r) => alive && setRemote(r)).catch(() => {});
    return () => (alive = false);
  }, [dq]);
  const items = useMemo(() => {
    const s = q.toLowerCase();
    const match = (l) => !s || l.toLowerCase().includes(s);
    return [
      ...FLAT.filter(([, l]) => match(l)).map(([to, label, I]) => ({ group: 'Go to', label, to: `/admin/${to}`, I })),
      ...ACTIONS.filter(([l]) => match(l)).map(([label, to, I]) => ({ group: 'Actions', label, to, I })),
      ...remote.orders.map((o) => ({ group: 'Orders', label: `${o.orderNumber} · ${o.shippingAddress?.name} · ${pkr(o.total)}`, to: `/admin/orders?open=${o._id}`, I: ClipboardList })),
      ...remote.products.map((p) => ({ group: 'Products', label: p.title, to: `/admin/products/${p._id}`, I: Package })),
      ...remote.customers.map((c) => ({ group: 'Customers', label: `${c.name} · ${c.email}`, to: `/admin/customers?open=${c._id}`, I: Users })),
    ];
  }, [q, remote]);
  const go = (it) => it && (nav(it.to), onClose());
  const onKey = (e) => {
    if (e.key === 'ArrowDown') e.preventDefault(), setI((x) => Math.min(x + 1, items.length - 1));
    if (e.key === 'ArrowUp') e.preventDefault(), setI((x) => Math.max(x - 1, 0));
    if (e.key === 'Enter') go(items[i]);
    if (e.key === 'Escape') onClose();
  };
  let last = '';
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/30 px-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div role="dialog" aria-label="Command palette" initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-xl border border-hairline bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-hairline px-4">
              <Command className="h-4 w-4 text-stone" />
              <input ref={input} value={q} onChange={(e) => (setQ(e.target.value), setI(0))} onKeyDown={onKey} placeholder="Jump to a page, action, order, product or customer…" className="h-14 w-full bg-transparent text-sm outline-none" aria-label="Command" role="combobox" aria-expanded="true" aria-controls="cmdk-list" />
              <kbd className="border border-hairline px-1.5 py-0.5 text-[10px] text-stone">ESC</kbd>
            </div>
            <ul id="cmdk-list" role="listbox" className="max-h-[55vh] overflow-auto py-2">
              {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-stone">No matches</li>}
              {items.map((it, n) => {
                const header = it.group !== last ? ((last = it.group), <li key={`h-${it.group}`} className="label px-4 pb-1 pt-3 text-[9px] text-gold">{it.group}</li>) : null;
                return [
                  header,
                  <li key={`${it.group}-${it.to}-${n}`} role="option" aria-selected={n === i}>
                    <button onMouseEnter={() => setI(n)} onClick={() => go(it)} className={`flex w-full items-center gap-3 px-4 py-2 text-start text-sm ${n === i ? 'bg-ivory text-ink' : 'text-stone'}`}>
                      <it.I className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{it.label}</span>
                    </button>
                  </li>,
                ];
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Notifications() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [], counts: {} });
  useEffect(() => {
    const load = () => adminService.notifications().then(setData).catch(() => {});
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);
  const total = (data.counts.orders || 0) + (data.counts.returns || 0) + (data.counts.lowStock || 0);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-label={`Notifications (${total})`} aria-expanded={open} className="relative grid h-9 w-9 place-items-center hover:bg-ivory">
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.5} />
        {total > 0 && <span className="absolute end-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold text-white">{total > 99 ? '99+' : total}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-11 z-50 w-80 border border-hairline bg-white shadow-xl">
            <p className="label border-b border-hairline px-4 py-3 text-[10px] text-stone">Notifications</p>
            <ul className="max-h-96 divide-y divide-hairline overflow-auto">
              {data.items.length === 0 && <li className="px-4 py-6 text-center text-sm text-stone">You are all caught up ◆</li>}
              {data.items.map((n, i) => (
                <li key={i}>
                  <button onClick={() => (nav(n.link), setOpen(false))} className="flex w-full gap-3 px-4 py-3 text-start hover:bg-ivory">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.type === 'order' ? 'bg-rose' : n.type === 'return' ? 'bg-gold' : 'bg-stone'}`} />
                    <span className="min-w-0">
                      <span className="block text-sm">{n.title}</span>
                      <span className="block truncate text-xs text-stone">{n.text}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function AvatarMenu() {
  const user = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const initials = (user?.name || 'A').split(' ').map((w) => w[0]).slice(0, 2).join('');
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Account menu" aria-expanded={open} className="grid h-9 w-9 place-items-center rounded-full bg-ink font-display text-sm text-ivory">{initials}</button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-11 z-50 w-56 border border-hairline bg-white py-2 text-sm shadow-xl">
            <p className="px-4 pb-2 pt-1"><span className="block font-semibold">{user?.name}</span><span className="text-xs text-stone">{user?.email}</span></p>
            <Link to="/admin/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-ivory"><Settings className="h-4 w-4" /> Settings</Link>
            <Link to="/" className="flex items-center gap-2 px-4 py-2 hover:bg-ivory"><Store className="h-4 w-4" /> View store</Link>
            <button onClick={() => (dispatch(logout()), nav('/'))} className="flex w-full items-center gap-2 px-4 py-2 text-rose hover:bg-ivory"><LogOut className="h-4 w-4" /> Log out</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminApp() {
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const current = [...FLAT].sort((a, b) => b[0].length - a[0].length).find(([to]) => pathname.startsWith(`/admin/${to}`.replace(/\/$/, '')) || (!to && pathname === '/admin'));
  useMeta(`${current?.[1] || 'Atelier'} · Atelier`);
  useEffect(() => {
    const k = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') e.preventDefault(), setPalette((p) => !p);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => setDrawer(false), [pathname]);

  if (pathname.startsWith('/admin/print/'))
    return (
      <Suspense fallback={<Spinner />}>
        <Routes><Route path="print/:kind/:id" element={<PrintDoc />} /></Routes>
      </Suspense>
    );

  return (
    <div className="min-h-screen bg-ivory text-ink">
      {/* desktop: slim icon rail that expands over content on hover */}
      <aside className="group/rail fixed inset-y-0 start-0 z-40 hidden w-16 overflow-hidden border-e border-hairline bg-white transition-[width] duration-300 hover:w-60 hover:shadow-xl lg:block">
        <Rail />
      </aside>
      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-50 bg-ink/30 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)}>
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.35 }} className="h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>
              <Rail expanded onNavigate={() => setDrawer(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="lg:ps-16">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-white/95 px-4 backdrop-blur sm:px-6">
          <button className="grid h-9 w-9 place-items-center lg:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0">
            <p className="label text-[9px] text-gold">Fashionist Atelier</p>
            <p className="truncate font-display text-xl leading-tight">{current?.[1] || 'Atelier'}</p>
          </div>
          <button onClick={() => setPalette(true)} className="ms-auto hidden h-9 w-full max-w-sm items-center gap-2 border border-hairline bg-ivory px-3 text-sm text-stone hover:border-ink md:flex" aria-label="Search (Ctrl K)">
            <Search className="h-4 w-4" /> Search orders, products, customers…
            <kbd className="ms-auto border border-hairline bg-white px-1.5 text-[10px]">Ctrl K</kbd>
          </button>
          <div className="ms-auto flex items-center gap-1 md:ms-2">
            <button onClick={() => setPalette(true)} className="grid h-9 w-9 place-items-center md:hidden" aria-label="Search"><Search className="h-[18px] w-[18px]" /></button>
            <Notifications />
            <Link to="/" target="_blank" className="hidden h-9 items-center gap-2 border border-ink px-3 text-xs font-semibold uppercase tracking-label hover:bg-ink hover:text-ivory sm:flex"><Store className="h-3.5 w-3.5" /> View store</Link>
            <AvatarMenu />
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 sm:p-8">
          <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Spinner className="h-6 w-6" /></div>}>
            <Routes>
              <Route index element={<Overview />} />
              <Route path="orders" element={<Orders />} />
              <Route path="returns" element={<Returns />} />
              <Route path="products" element={<Products />} />
              <Route path="products/new" element={<ProductEditor />} />
              <Route path="products/:id" element={<ProductEditor />} />
              <Route path="import" element={<BulkImport />} />
              <Route path="categories" element={<Categories />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="customers" element={<Customers />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="reports" element={<Reports />} />
              <Route path="activity" element={<Activity />} />
              <Route path="settings" element={<StoreSettings />} />
              <Route path="cms/homepage" element={<Builder />} />
              <Route path="cms/theme" element={<ThemeEditor />} />
              <Route path="cms/navigation" element={<NavigationEditor />} />
              <Route path="cms/announcement" element={<AnnouncementEditor />} />
              <Route path="cms/pages" element={<PagesEditor />} />
              <Route path="cms/media" element={<MediaLibrary />} />
              <Route path="*" element={<ErrorPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
