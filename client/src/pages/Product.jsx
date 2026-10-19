import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, ChevronLeft, ChevronRight, Heart, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { Accordion, ErrorPage, Img, Modal, Skeleton, Stars, useMeta } from '../components/ui.jsx';
import { Stepper } from '../components/CartDrawer.jsx';
import Rail from '../components/Rail.jsx';
import { cartLine } from '../components/ProductCard.jsx';
import { useAsync, useSettings } from '../hooks/index.js';
import { catalogService } from '../services/index.js';
import { addItem, setCartOpen, toggleWishlist } from '../features/store.js';
import { colourHex, pct, pkr, tr } from '../utils/format.js';
import { CITIES, hourLabel, sameDayFor, shippingFeeFor } from '../utils/rules.js';

function Gallery({ images, title }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(null);
  const [lightbox, setLightbox] = useState(false);
  return (
    <div className="flex flex-col-reverse gap-4 md:flex-row">
      <div className="no-scrollbar flex gap-3 overflow-x-auto md:w-20 md:flex-col">
        {images.map((src, n) => (
          <button key={src} onClick={() => setI(n)} aria-label={`Image ${n + 1}`} className={`shrink-0 border ${n === i ? 'border-fg' : 'border-transparent'}`}>
            <Img src={src} alt="" className="h-24 w-[72px] md:h-[104px] md:w-full" />
          </button>
        ))}
      </div>
      <div
        className="relative flex-1 cursor-zoom-in overflow-hidden bg-surface"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setLightbox(true)}
      >
        <Img src={images[i]} alt={title} eager className="aspect-[3/4] w-full" imgClass="transition-transform duration-300" style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
      </div>
      <AnimatePresence>
        {lightbox && (
          <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={() => setLightbox(false)} aria-label="Close" className="absolute end-5 top-5 text-ivory"><X className="h-7 w-7" /></button>
            <button onClick={() => setI((i - 1 + images.length) % images.length)} aria-label="Previous" className="absolute start-4 text-ivory"><ChevronLeft className="h-8 w-8 rtl:rotate-180" /></button>
            <img src={images[i]} alt={title} className="max-h-[90vh] max-w-[90vw] object-contain" />
            <button onClick={() => setI((i + 1) % images.length)} aria-label="Next" className="absolute end-4 text-ivory"><ChevronRight className="h-8 w-8 rtl:rotate-180" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReviewSummary({ product }) {
  const { data } = useAsync(() => catalogService.reviews(product._id), [product._id]);
  const reviews = data?.reviews || [];
  const { t } = useTranslation();
  const dist = [5, 4, 3, 2, 1].map((n) => [n, reviews.filter((r) => r.rating === n).length]);
  return (
    <section className="container-site border-t border-line py-20" id="reviews">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="text-4xl">{t('product.reviews')}</h2>
          <p className="mt-6 font-display text-7xl">{product.rating?.toFixed(1) || '—'}</p>
          <Stars value={product.rating} size="h-4 w-4" />
          <p className="mt-2 text-xs text-muted">{product.numReviews} reviews</p>
          <div className="mt-6 space-y-2">
            {dist.map(([n, c]) => (
              <div key={n} className="flex items-center gap-3 text-xs">
                <span className="w-3">{n}</span>
                <div className="h-1 flex-1 bg-line"><div className="h-full bg-gold" style={{ width: `${reviews.length ? (c / reviews.length) * 100 : 0}%` }} /></div>
                <span className="w-5 text-end text-muted">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-line lg:col-span-8">
          {reviews.length === 0 && <p className="text-muted">{t('product.noReviews')}</p>}
          {reviews.map((r) => (
            <article key={r._id} className="py-6 first:pt-0">
              <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</span></div>
              <p className="mt-3 font-display text-xl leading-snug">“{r.comment}”</p>
              <p className="label mt-3 text-[10px] text-muted">{r.user?.name}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Product() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const settings = useSettings();
  const { data, loading, error } = useAsync(() => catalogService.product(slug), [slug]);
  const look = useAsync(() => catalogService.products({ category: 'accessories', limit: 6 }), []);
  const [colour, setColour] = useState(null);
  const [size, setSize] = useState(null);
  const [qty, setQty] = useState(1);
  const [guide, setGuide] = useState(false);
  const homeCity = useSelector((s) => { const a = s.auth.user?.addresses || []; return (a.find((x) => x.isDefault) || a[0])?.city; });
  const [city, setCity] = useState(homeCity || 'Lahore');
  useEffect(() => {
    if (homeCity) setCity(homeCity); // the profile (with addresses) may arrive after the first render
  }, [homeCity]);
  const p = data?.product;
  useMeta(p?.seo?.metaTitle?.replace(/ \| Fashionist$/, '') || p?.title, p?.seo?.metaDescription || p?.description, p?.images?.[0]);
  const wished = useSelector((s) => p && s.wishlist.items.some((w) => w._id === p._id));

  useEffect(() => {
    if (p) (setColour(p.variants[0]?.colour), setSize(null), setQty(1));
  }, [p]);
  const colours = useMemo(() => [...new Set(p?.variants.map((v) => v.colour))], [p]);
  const sizes = useMemo(() => p?.variants.filter((v) => v.colour === colour) || [], [p, colour]);
  const variant = sizes.find((v) => v.size === size);

  if (error) return <ErrorPage />;
  if (loading || !p)
    return (
      <div className="container-site grid gap-10 py-10 lg:grid-cols-12">
        <Skeleton className="aspect-[3/4] lg:col-span-7" />
        <div className="space-y-4 lg:col-span-5"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-12 w-3/4" /><Skeleton className="h-6 w-1/4" /><Skeleton className="h-40 w-full" /></div>
      </div>
    );

  const off = pct(p.price, p.compareAtPrice);
  const fee = settings ? shippingFeeFor(city, settings, p.price * qty) : 0;
  const add = () => {
    if (!variant) return toast.error(t('product.selectSize'));
    if (variant.stock < 1) return toast.error(t('product.soldOut'));
    dispatch(addItem(cartLine(p, variant, qty)));
    dispatch(setCartOpen(true));
    toast.success(t('product.added'));
  };

  return (
    <>
      <div className="container-site grid gap-10 py-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7"><Gallery images={p.images} title={p.title} /></div>
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <nav className="text-xs text-muted" aria-label="Breadcrumb">
              <Link to="/" className="link-grow">{t('product.home')}</Link> / <Link to={`/shop/${p.category.slug}`} className="link-grow">{tr(p.category, 'name', i18n.language)}</Link>
            </nav>
            <h1 className="mt-4 text-4xl leading-tight md:text-5xl">{tr(p, 'title', i18n.language)}</h1>
            <a href="#reviews" className="mt-3 flex items-center gap-2 text-xs text-muted"><Stars value={p.rating} /> {p.numReviews} reviews</a>
            <p className="mt-5 font-display text-3xl">
              <span className={off ? 'text-rose' : ''}>{pkr(p.price)}</span>
              {off > 0 && <><span className="ms-3 text-xl text-muted line-through">{pkr(p.compareAtPrice)}</span><span className="label ms-3 bg-blush px-2 py-1 align-middle text-[10px] text-rose-deep">-{off}%</span></>}
            </p>

            <div className="mt-8">
              <p className="label mb-3">{t('product.colour')}: <span className="text-muted">{colour}</span></p>
              <div className="flex gap-3">
                {colours.map((c) => <button key={c} onClick={() => (setColour(c), setSize(null))} aria-label={c} aria-pressed={c === colour} className={`h-9 w-9 rounded-full border ${c === colour ? 'ring-2 ring-fg ring-offset-2 ring-offset-bg' : 'border-line'}`} style={{ background: colourHex[c] || '#ccc' }} />)}
              </div>
            </div>
            <div className="mt-7">
              <div className="mb-3 flex justify-between">
                <p className="label">{t('product.size')}</p>
                <button onClick={() => setGuide(true)} className="text-xs underline">{t('product.sizeGuide')}</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((v) => (
                  <button key={v.sku} disabled={v.stock < 1} onClick={() => (setSize(v.size), setQty(1))} aria-pressed={size === v.size} className={`min-w-12 border px-3 py-2.5 text-sm transition ${size === v.size ? 'border-fg bg-fg text-bg' : 'border-line hover:border-fg'} disabled:cursor-not-allowed disabled:text-muted disabled:line-through`}>{v.size}</button>
                ))}
              </div>
              {variant && variant.stock > 0 && variant.stock <= 3 && <p className="mt-3 text-xs font-semibold text-rose">{t('product.onlyLeft', { count: variant.stock })}</p>}
            </div>
            <div className="mt-7 flex items-center gap-4">
              <Stepper value={qty} onChange={setQty} max={Math.min(10, variant?.stock || 10)} />
            </div>
            <div className="mt-6 hidden gap-3 sm:flex">
              <button onClick={add} className="btn-primary flex-1">{t('product.addToBag')}</button>
              <button onClick={() => dispatch(toggleWishlist(p))} aria-label={t('product.wishlist')} aria-pressed={wished} className="btn-outline px-4"><Heart className={`h-4 w-4 ${wished ? 'fill-rose text-rose' : ''}`} /></button>
            </div>

            <div className="mt-8 border border-line p-5">
              <p className="label flex items-center gap-2 text-[10px]"><Banknote className="h-4 w-4 text-gold" /> {t('product.cod')}</p>
              <div className="mt-4 flex items-center gap-3 text-sm">
                <span className="text-muted">{t('product.estimate')}</span>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="border-b border-line bg-transparent py-1 text-sm focus:outline-none" aria-label={t('checkout.city')}>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <p className="mt-2 text-xs text-muted">{t('product.estimateTo', { city, days: ['Lahore', 'Multan', 'Karachi', 'Islamabad'].includes(city) ? '2–3' : '3–5', fee: fee ? pkr(fee) : t('cart.free') })}</p>
              {sameDayFor(city, settings).available && (
                <p className="mt-3 flex items-start gap-2 bg-surface p-3 text-xs">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span><b className="block text-sm">{t('product.sameDay', { city: settings.sameDay.city })}</b>{t('product.sameDaySub', { time: hourLabel(settings.sameDay.cutoffHour), fee: pkr(settings.sameDay.fee) })}</span>
                </p>
              )}
            </div>

            <div className="mt-6">
              <Accordion title={t('product.details')} defaultOpen>
                <p className="mb-4">{tr(p, 'description', i18n.language)}</p>
                <dl className="grid grid-cols-2 gap-y-2">
                  {Object.entries(p.attributes || {}).map(([k, v]) => <div key={k} className="contents"><dt className="capitalize text-fg">{k === 'soldBy' ? 'Sold by' : k}</dt><dd>{v}</dd></div>)}
                </dl>
              </Accordion>
              <Accordion title={t('product.delivery')}>{t('product.deliveryText')}</Accordion>
            </div>
          </div>
        </div>
      </div>

      <ReviewSummary product={p} />
      <section className="container-site py-16"><Rail loading={look.loading} products={look.data?.products.filter((x) => x._id !== p._id) || []} title={<h2 className="text-4xl md:text-5xl">{t('product.completeLook')}</h2>} /></section>
      {data.related.length > 0 && <section className="container-site pb-24"><Rail products={data.related} title={<h2 className="text-4xl md:text-5xl">{t('product.alsoLike')}</h2>} /></section>}

      <Modal open={guide} onClose={() => setGuide(false)} title={t('product.sizeGuide')}>
        <p className="text-sm text-muted">{p.sizeGuide}</p>
        <table className="mt-6 w-full text-sm">
          <thead><tr className="border-b border-line text-start">{['Size', 'Chest', 'Length', 'Hip'].map((h) => <th key={h} className="label py-2 text-start text-[10px]">{h}</th>)}</tr></thead>
          <tbody>{[['XS', 32, 40, 36], ['S', 34, 41, 38], ['M', 36, 42, 40], ['L', 38, 43, 42], ['XL', 40, 44, 44]].map((r) => <tr key={r[0]} className="border-b border-line">{r.map((c, i) => <td key={i} className="py-2">{i ? `${c}"` : c}</td>)}</tr>)}</tbody>
        </table>
      </Modal>

      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-bg p-3 sm:hidden">
        <div className="flex-1">
          <p className="truncate text-xs">{tr(p, 'title', i18n.language)}</p>
          <p className="text-sm font-semibold">{pkr(p.price)}</p>
        </div>
        <button onClick={() => dispatch(toggleWishlist(p))} aria-label={t('product.wishlist')} className="btn-outline px-3"><Heart className={`h-4 w-4 ${wished ? 'fill-rose text-rose' : ''}`} /></button>
        <button onClick={add} className="btn-primary px-5">{t('product.addToBag')}</button>
      </div>
    </>
  );
}
