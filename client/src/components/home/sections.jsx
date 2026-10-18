// Homepage sections. Each reads its content from the CMS config (src/cms/homepage.json for now).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, Plus, RotateCcw, ShieldCheck, Truck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Img, Reveal, SectionTitle, Stars, CardSkeleton, Button } from '../ui.jsx';
import ProductCard from '../ProductCard.jsx';
import Rail from '../Rail.jsx';
import { useAsync } from '../../hooks/index.js';
import { catalogService } from '../../services/index.js';
import { IMG, categories, reviewQuotes } from '../../services/mock/seedData.js';
import { pkr, tr } from '../../utils/format.js';

const img = (k) => IMG[k] || k;

export function Hero({ config }) {
  const { t, i18n } = useTranslation();
  const [i, setI] = useState(0);
  const slides = config.slides;
  useEffect(() => {
    const id = setTimeout(() => setI((i + 1) % slides.length), 7000);
    return () => clearTimeout(id);
  }, [i, slides.length]);
  const s = slides[i];
  return (
    <section className="relative grid min-h-[100svh] bg-ink text-ivory lg:grid-cols-12" aria-roledescription="carousel">
      <div className="relative z-10 order-2 flex flex-col justify-end px-4 pb-14 pt-10 sm:px-6 lg:order-1 lg:col-span-6 lg:justify-center lg:px-10 lg:pb-24 lg:pt-28">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <p className="label mb-6 text-gold">{s.eyebrow}</p>
            <h1 className="text-hero font-semibold">{tr(s, 'title', i18n.language)}</h1>
            <p className="mt-6 max-w-md text-base text-ivory/70">{tr(s, 'text', i18n.language)}</p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/shop/women" className="btn-primary">{t('home.shopWomen')}</Link>
              <Link to="/shop/men" className="btn border border-ivory text-ivory hover:bg-ivory hover:text-ink">{t('home.shopMen')}</Link>
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-14 flex gap-3">
          {slides.map((_, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} className="h-[2px] w-16 bg-ivory/20">
              {n === i && <span key={i} className="block h-full animate-progress bg-rose" />}
              {n < i && <span className="block h-full w-full bg-ivory/60" />}
            </button>
          ))}
        </div>
      </div>
      <div className="relative order-1 h-[62svh] overflow-hidden lg:order-2 lg:col-span-6 lg:h-auto">
        <AnimatePresence>
          <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
            <Img src={img(s.image)} alt={s.title} eager className="h-full w-full" imgClass="animate-kenburns" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent lg:bg-gradient-to-r" />
        <p className="label absolute end-5 top-1/2 hidden origin-center -translate-y-1/2 rotate-90 text-[10px] text-ivory/80 lg:block" dir="ltr">{t('home.collection')}</p>
      </div>
    </section>
  );
}

export function CategoryMosaic({ items }) {
  const { t, i18n } = useTranslation();
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  return (
    <section className="container-site py-24">
      <Reveal><SectionTitle eyebrow="Fashionist" title={t('home.categories')} /></Reveal>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:grid-rows-2 md:gap-6">
        {items.map((it, n) => (
          <Reveal key={it.slug} delay={n * 0.08} className={it.tall ? 'col-span-2 md:col-span-2 md:row-span-2' : ''}>
            <Link to={`/shop/${it.slug}`} className="group block h-full">
              <Img src={img(it.image)} alt={bySlug[it.slug]?.name} className={`card-img ${it.tall ? 'aspect-[4/5] md:aspect-auto md:h-[calc(100%-3rem)]' : 'aspect-[4/5]'}`} />
              <p className="mt-3 flex items-baseline justify-between font-display text-2xl md:text-3xl">
                <span className="link-grow">{tr(bySlug[it.slug], 'name', i18n.language)}</span>
                <span className="label text-[10px] text-muted">{t('home.viewAll')}</span>
              </p>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function NewInRail() {
  const { t } = useTranslation();
  const { data, loading } = useAsync(() => catalogService.products({ sort: 'newest', limit: 10 }), []);
  return (
    <section className="container-site py-16">
      <Rail loading={loading} products={data?.products || []} title={<div><p className="label mb-3 text-gold">{t('home.newInSub')}</p><h2 className="text-4xl md:text-6xl">{t('home.newIn')}</h2></div>} />
    </section>
  );
}

export function ShopTheLook({ config }) {
  const { t, i18n } = useTranslation();
  const [active, setActive] = useState(null);
  const { data } = useAsync(() => catalogService.products({ limit: 48 }), []);
  const find = (slug) => data?.products.find((p) => p.slug === slug);
  return (
    <section className="container-site py-24">
      <Reveal><SectionTitle eyebrow="Styled by Fashionist" title={t('home.shopLook')} /></Reveal>
      <div className="relative">
        <Img src={img(config.image)} alt="Styled look" className="aspect-[4/5] w-full sm:aspect-[16/9]" />
        {config.hotspots.map((h, n) => (
          <button key={h.slug} style={{ left: `${h.x}%`, top: `${h.y}%` }} onClick={() => setActive(active === n ? null : n)} aria-label={`View product ${n + 1}`} className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ivory text-ink shadow-lg">
            <span className="absolute inset-0 animate-ping rounded-full bg-ivory/60" />
            {active === n ? <X className="relative h-4 w-4" /> : <Plus className="relative h-4 w-4" />}
          </button>
        ))}
        <AnimatePresence>
          {active !== null && find(config.hotspots[active].slug) && (() => {
            const p = find(config.hotspots[active].slug);
            const h = config.hotspots[active];
            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ left: `min(max(${h.x}%, 8rem), calc(100% - 8rem))`, top: `${Math.min(h.y + 6, 70)}%` }} className="absolute w-60 -translate-x-1/2 bg-ivory p-3 text-ink shadow-xl">
                <Link to={`/product/${p.slug}`} className="flex gap-3">
                  <Img src={p.images[0]} alt={p.title} className="h-24 w-[72px] shrink-0" />
                  <div>
                    <p className="font-display text-lg leading-tight">{tr(p, 'title', i18n.language)}</p>
                    <p className="mt-1 text-sm font-semibold">{pkr(p.price)}</p>
                    <span className="label link-grow mt-2 inline-block text-[10px]">Shop now</span>
                  </div>
                </Link>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </section>
  );
}

export function UnstitchedSpotlight({ config }) {
  const { t } = useTranslation();
  return (
    <section className="bg-ink text-ivory">
      <div className="container-site grid items-center gap-12 py-24 lg:grid-cols-12">
        <Reveal className="lg:col-span-7"><Img src={img(config.image)} alt="Fabric close-up" className="aspect-[4/3]" /></Reveal>
        <Reveal delay={0.15} className="lg:col-span-5">
          <p className="label mb-5 text-gold">{t('nav.unstitched')}</p>
          <h2 className="text-5xl md:text-7xl">{t('home.unstitchedTitle')}</h2>
          <div className="my-8 h-px w-20 bg-gold" />
          <p className="max-w-md text-ivory/70">{t('home.unstitchedText')}</p>
          <Link to="/shop/unstitched" className="btn-primary mt-10">{t('home.shopFabric')}</Link>
        </Reveal>
      </div>
    </section>
  );
}

export function BestSellers({ tabs }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(tabs[0]);
  const { data, loading } = useAsync(() => catalogService.products({ category: tab, sort: 'popular', limit: 4 }), [tab]);
  return (
    <section className="container-site py-24">
      <Reveal>
        <SectionTitle
          title={t('home.bestSellers')}
          action={
            <div className="flex gap-2" role="tablist">
              {tabs.map((x) => (
                <button key={x} role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={`chip ${tab === x ? 'chip-active' : ''}`}>{t(`nav.${x}`)}</button>
              ))}
            </div>
          }
          className="flex-col items-start md:flex-row md:items-end"
        />
      </Reveal>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {loading ? [0, 1, 2, 3].map((i) => <CardSkeleton key={i} />) : data.products.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>
    </section>
  );
}

export function BrandPromise() {
  const { t } = useTranslation();
  const items = [[Banknote, 'cod'], [Truck, 'delivery'], [RotateCcw, 'returns'], [ShieldCheck, 'fabric']];
  return (
    <section className="border-y border-line bg-surface">
      <div className="container-site grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
        {items.map(([I, k]) => (
          <div key={k} className="flex flex-col items-center text-center">
            <I className="h-6 w-6 text-gold" strokeWidth={1.25} />
            <p className="label mt-4">{t(`promise.${k}`)}</p>
            <p className="mt-1 text-xs text-muted">{t(`promise.${k}Sub`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReviewsCarousel() {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % reviewQuotes.length), 6000);
    return () => clearInterval(id);
  }, []);
  const r = reviewQuotes[i];
  return (
    <section className="container-site py-24 text-center">
      <p className="label mb-10 text-gold">{t('home.reviews')}</p>
      <AnimatePresence mode="wait">
        <motion.blockquote key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-4xl">
          <div className="mb-6 flex justify-center"><Stars value={r.rating} size="h-4 w-4" /></div>
          <p className="font-display text-3xl italic leading-snug md:text-5xl">“{r.text}”</p>
          <footer className="label mt-8 text-muted">{r.name}</footer>
        </motion.blockquote>
      </AnimatePresence>
      <div className="mt-10 flex justify-center gap-2">
        {reviewQuotes.map((_, n) => <button key={n} onClick={() => setI(n)} aria-label={`Review ${n + 1}`} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-8 bg-fg' : 'w-1.5 bg-line'}`} />)}
      </div>
    </section>
  );
}

export function Lookbook({ images }) {
  const { t } = useTranslation();
  return (
    <section className="container-site py-16">
      <Reveal><SectionTitle eyebrow="@fashionist.pk" title={t('home.lookbook')} /></Reveal>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-4">
        {images.map((k, n) => (
          <Reveal key={k} delay={n * 0.05}>
            <a href="#" className="group block"><Img src={img(k)} alt={`Lookbook ${n + 1}`} className="card-img aspect-square" /></a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Newsletter() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error(t('errors.email'));
    setLoading(true);
    setTimeout(() => (setLoading(false), setEmail(''), toast.success('Welcome to the circle ◆')), 600);
  };
  return (
    <section className="container-site py-24">
      <div className="border border-line px-6 py-16 text-center md:px-20">
        <h2 className="text-4xl md:text-6xl">{t('home.newsletter')}</h2>
        <p className="mx-auto mt-4 max-w-md text-muted">{t('home.newsletterSub')}</p>
        <form onSubmit={submit} className="mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('home.email')} className="input" aria-label={t('home.email')} />
          <Button loading={loading} variant="ink" type="submit">{t('home.subscribe')}</Button>
        </form>
      </div>
    </section>
  );
}
