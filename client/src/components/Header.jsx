import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Menu, Moon, Search, ShoppingBag, Sun, User, X } from 'lucide-react';
import { Img, Logo } from './ui.jsx';
import { useScrolled } from '../hooks/index.js';
import { setCartOpen, setLang, setMenuOpen, setSearchOpen, toggleDark } from '../features/store.js';
import { IMG } from '../services/mock/seedData.js';

const MENU = [
  { key: 'women', image: IMG.w3, links: [['Lawn', 'lawn'], ['Silk', 'silk'], ['Chiffon', 'chiffon'], ['Co-ords', 'casual']] },
  { key: 'men', image: IMG.m3, links: [['Kurtas', 'kurta'], ['Shalwar Kameez', 'classic'], ['Waistcoats', 'festive']] },
  { key: 'kids', image: IMG.k2, links: [['Girls', 'frock'], ['Boys', 'kurta']] },
  { key: 'unstitched', image: IMG.f1, links: [['Jacquard', 'jacquard'], ['Raw Silk', 'silk']] },
  { key: 'accessories', image: IMG.a2, links: [['Jewellery', 'jewellery'], ['Bags', 'bags']] },
];

export function AnnouncementBar() {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(() => sessionStorage.getItem('fashionist:announce') === '0');
  if (hidden) return null;
  const items = t('announce');
  const row = [...items, ...items, ...items];
  return (
    <div className="relative z-50 overflow-hidden bg-ink text-ivory">
      <div className="flex w-max animate-marquee py-2 hover:[animation-play-state:paused]" dir="ltr">
        {[...row, ...row].map((s, i) => (
          <span key={i} className="label mx-6 whitespace-nowrap text-[10px]">
            {s} <span className="ms-6 text-rose">◆</span>
          </span>
        ))}
      </div>
      <button aria-label="Dismiss announcement" onClick={() => (sessionStorage.setItem('fashionist:announce', '0'), setHidden(true))} className="absolute end-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center bg-ink">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function Header() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const scrolled = useScrolled(30);
  const [mega, setMega] = useState(null);
  const count = useSelector((s) => s.cart.items.reduce((n, i) => n + i.qty, 0));
  const wish = useSelector((s) => s.wishlist.items.length);
  const { user } = useSelector((s) => s.auth);
  const { menuOpen, dark } = useSelector((s) => s.ui);
  const overHero = pathname === '/' && !scrolled && !mega;
  const switchLang = () => {
    const l = i18n.language === 'ur' ? 'en' : 'ur';
    i18n.changeLanguage(l);
    dispatch(setLang(l));
  };
  useEffect(() => {
    dispatch(setMenuOpen(false));
    setMega(null);
  }, [pathname, dispatch]);

  const iconBtn = 'grid h-10 w-10 place-items-center relative transition-opacity hover:opacity-70';
  return (
    <header className={`sticky top-0 z-40 transition-colors duration-500 ${overHero ? 'bg-transparent text-ivory' : 'border-b border-line bg-bg text-fg'} ${pathname === '/' ? '-mb-[72px]' : ''}`} onMouseLeave={() => setMega(null)}>
      <div className="container-site grid h-[72px] grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center gap-6">
          <button className={`${iconBtn} lg:hidden`} aria-label={t('nav.menu')} onClick={() => dispatch(setMenuOpen(true))}>
            <Menu className="h-5 w-5" />
          </button>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
            {MENU.map((m) => (
              <NavLink key={m.key} to={`/shop/${m.key}`} onMouseEnter={() => setMega(m.key)} onFocus={() => setMega(m.key)} className="label link-grow text-[11px]">
                {t(`nav.${m.key}`)}
              </NavLink>
            ))}
          </nav>
        </div>
        <Logo size="text-lg sm:text-xl" />
        <div className="flex items-center justify-end">
          <button className={iconBtn} aria-label={t('nav.search')} onClick={() => dispatch(setSearchOpen(true))}><Search className="h-[18px] w-[18px]" /></button>
          <button className={`${iconBtn} hidden sm:grid text-xs font-semibold`} onClick={switchLang} aria-label="Switch language">{i18n.language === 'ur' ? 'EN' : 'اردو'}</button>
          <button className={`${iconBtn} hidden md:grid`} onClick={() => dispatch(toggleDark())} aria-label="Toggle dark mode">{dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}</button>
          <Link to={user ? (user.role === 'admin' ? '/admin' : '/account') : '/login'} className={`${iconBtn} hidden sm:grid`} aria-label={t('nav.account')}><User className="h-[18px] w-[18px]" /></Link>
          <Link to="/account/wishlist" className={`${iconBtn} hidden sm:grid`} aria-label={t('nav.wishlist')}>
            <Heart className="h-[18px] w-[18px]" />
            {wish > 0 && <span className="absolute end-1 top-1.5 h-1.5 w-1.5 rounded-full bg-rose" />}
          </Link>
          <button className={iconBtn} aria-label={`${t('nav.cart')} (${count})`} onClick={() => dispatch(setCartOpen(true))}>
            <ShoppingBag className="h-[18px] w-[18px]" />
            {count > 0 && <span className="absolute end-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold text-white">{count}</span>}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mega && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-x-0 top-full hidden border-b border-line bg-bg text-fg lg:block">
            {MENU.filter((m) => m.key === mega).map((m) => (
              <div key={m.key} className="container-site grid grid-cols-12 gap-10 py-10">
                <div className="col-span-3">
                  <p className="label mb-5 text-gold">{t(`nav.${m.key}`)}</p>
                  <ul className="space-y-3 font-display text-2xl">
                    <li><Link className="link-grow" to={`/shop/${m.key}`}>{t('shop.all')}</Link></li>
                    {m.links.map(([label, q]) => (
                      <li key={label}><Link className="link-grow" to={`/search?q=${q}`}>{label}</Link></li>
                    ))}
                  </ul>
                </div>
                <div className="col-span-3">
                  <p className="label mb-5 text-gold">{t('nav.newIn')}</p>
                  <ul className="space-y-3 text-sm">
                    <li><Link className="link-grow" to="/search?q=eid">The Eid Edit</Link></li>
                    <li><Link className="link-grow" to="/search?q=new">Just landed</Link></li>
                    <li><Link className="link-grow" to="/shop?sort=popular">Best sellers</Link></li>
                  </ul>
                </div>
                <Link to={`/shop/${m.key}`} className="group col-span-6 grid grid-cols-2 gap-6">
                  <Img src={m.image} alt="" className="card-img aspect-[4/5]" />
                  <div className="self-end">
                    <p className="label text-gold">SS 2026</p>
                    <p className="mt-2 font-display text-4xl">{t(`nav.${m.key}`)} — the new edit</p>
                    <span className="label link-grow mt-4 inline-block">{t('home.viewAll')}</span>
                  </div>
                </Link>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {menuOpen && (
          <motion.div className="fixed inset-0 z-[60] bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dispatch(setMenuOpen(false))}>
            <motion.nav initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }} className="h-full w-[86%] max-w-sm overflow-auto bg-bg p-6 text-fg rtl:ms-auto" onClick={(e) => e.stopPropagation()}>
              <div className="mb-10 flex items-center justify-between">
                <Logo size="text-base" />
                <button onClick={() => dispatch(setMenuOpen(false))} aria-label={t('common.close')}><X className="h-5 w-5" /></button>
              </div>
              <ul className="space-y-5 font-display text-4xl">
                {MENU.map((m) => <li key={m.key}><Link to={`/shop/${m.key}`}>{t(`nav.${m.key}`)}</Link></li>)}
              </ul>
              <div className="mt-10 space-y-4 border-t border-line pt-8 text-sm">
                <Link to={user ? '/account' : '/login'} className="flex items-center gap-3"><User className="h-4 w-4" />{t('nav.account')}</Link>
                <Link to="/account/wishlist" className="flex items-center gap-3"><Heart className="h-4 w-4" />{t('nav.wishlist')}</Link>
                <button onClick={switchLang} className="flex items-center gap-3">{i18n.language === 'ur' ? 'English' : 'اردو'}</button>
                <button onClick={() => dispatch(toggleDark())} className="flex items-center gap-3">{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} Theme</button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
