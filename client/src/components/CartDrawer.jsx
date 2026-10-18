import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import { EmptyState, Img } from './ui.jsx';
import { removeItem, setCartOpen, setQty } from '../features/store.js';
import { useSettings } from '../hooks/index.js';
import { pkr, tr } from '../utils/format.js';

export function FreeShippingBar({ subtotal }) {
  const { t } = useTranslation();
  const s = useSettings();
  if (!s) return null;
  const left = s.freeShippingAbove - subtotal;
  return (
    <div>
      <p className="mb-2 text-xs">{left > 0 ? t('cart.freeLeft', { amount: pkr(left) }) : t('cart.freeUnlocked')}</p>
      <div className="h-[3px] bg-line">
        <div className="h-full bg-rose transition-all duration-700" style={{ width: `${Math.min(100, (subtotal / s.freeShippingAbove) * 100)}%` }} />
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, max = 10 }) {
  return (
    <div className="inline-flex items-center border border-line">
      <button className="grid h-8 w-8 place-items-center disabled:opacity-30" onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="Decrease"><Minus className="h-3 w-3" /></button>
      <span className="w-8 text-center text-sm" aria-live="polite">{value}</span>
      <button className="grid h-8 w-8 place-items-center disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase"><Plus className="h-3 w-3" /></button>
    </div>
  );
}

export function CartLines({ compact }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const items = useSelector((s) => s.cart.items);
  return (
    <ul className="divide-y divide-line">
      {items.map((i) => (
        <li key={i.sku} className="flex gap-4 py-5">
          <Link to={`/product/${i.slug}`} className="shrink-0"><Img src={i.image} alt={i.title} className={compact ? 'h-28 w-20' : 'h-36 w-28'} /></Link>
          <div className="flex flex-1 flex-col">
            <div className="flex justify-between gap-3">
              <Link to={`/product/${i.slug}`} className="font-display text-lg leading-tight">{tr(i, 'title', i18n.language)}</Link>
              <button onClick={() => dispatch(removeItem(i.sku))} aria-label={t('cart.remove')} className="text-muted hover:text-fg"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-xs text-muted">{i.colour} · {i.size}</p>
            <div className="mt-auto flex items-center justify-between pt-3">
              <Stepper value={i.qty} max={Math.min(10, i.stock ?? 10)} onChange={(qty) => dispatch(setQty({ sku: i.sku, qty }))} />
              <span className="text-sm font-semibold">{pkr(i.price * i.qty)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function CartDrawer() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.cartOpen);
  const items = useSelector((s) => s.cart.items);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const close = () => dispatch(setCartOpen(false));
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[65] bg-ink/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.aside role="dialog" aria-label={t('cart.title')} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }} onClick={(e) => e.stopPropagation()} className="ms-auto flex h-full w-full max-w-md flex-col bg-bg rtl:me-auto rtl:ms-0">
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="text-2xl">{t('cart.title')}</h2>
              <button onClick={close} aria-label={t('common.close')}><X className="h-5 w-5" /></button>
            </div>
            {items.length ? (
              <>
                <div className="px-6 pt-5"><FreeShippingBar subtotal={subtotal} /></div>
                <div className="flex-1 overflow-auto px-6"><CartLines compact /></div>
                <div className="space-y-3 border-t border-line p-6">
                  <div className="flex justify-between text-sm"><span>{t('cart.subtotal')}</span><span className="font-semibold">{pkr(subtotal)}</span></div>
                  <p className="text-xs text-muted">{t('cart.shipping')}: {t('cart.calcAtCheckout')}</p>
                  <Link to="/checkout" onClick={close} className="btn-primary w-full">{t('cart.checkout')}</Link>
                  <Link to="/cart" onClick={close} className="btn-outline w-full">{t('cart.viewBag')}</Link>
                </div>
              </>
            ) : (
              <EmptyState title={t('cart.empty')} text={t('cart.emptySub')} action={<Link to="/shop" onClick={close} className="btn-ink">{t('cart.continue')}</Link>} />
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
