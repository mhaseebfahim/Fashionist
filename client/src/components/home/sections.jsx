// Homepage sections — one component per CMS section type. Each receives the section document
// ({ title, titleUr, subtitle, content, ... }) published from the Homepage Builder.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, Plus, RotateCcw, ShieldCheck, Truck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Img, Reveal, SectionTitle, Stars, CardSkeleton, Button } from '../ui.jsx';
import ProductCard from '../ProductCard.jsx';
import Rail from '../Rail.jsx';
import { useAsync } from '../../hooks/index.js';
import { catalogService } from '../../services/index.js';
import { pkr, tr } from '../../utils/format.js';

const useL = () => {
  const { i18n } = useTranslation();
  return (o, k) => tr(o, k, i18n.language);
};
const Head = ({ s, action, className }) => {
  const L = useL();
  return L(s, 'title') ? <Reveal><SectionTitle eyebrow={L(s, 'subtitle')} title={L(s, 'title')} action={action} className={className} /></Reveal> : null;
};

export function Hero({ section }) {
  const L = useL();
  const slides = section.content?.slides?.length ? section.content.slides : [];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setTimeout(() => setI((i + 1) % slides.length), 7000);
    return () => clearTimeout(id);
  }, [i, slides.length]);
  if (!slides.length) return null;
  const s = slides[i % slides.length];
  return (
    <section className="relative grid min-h-[100svh] bg-ink text-ivory lg:grid-cols-12" aria-roledescription="carousel" aria-label={L(section, 'title') || 'Featured collections'}>
      <div className="relative z-10 order-2 flex flex-col justify-end px-4 pb-14 pt-10 sm:px-6 lg:order-1 lg:col-span-6 lg:justify-center lg:px-10 lg:pb-24 lg:pt-28">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            {L(s, 'eyebrow') && <p className="label mb-6 text-gold">{L(s, 'eyebrow')}</p>}
            <h1 className="text-hero font-semibold">{L(s, 'title')}</h1>
            {L(s, 'text') && <p className="mt-6 max-w-md text-base text-ivory/75">{L(s, 'text')}</p>}
            <div className="mt-10 flex flex-wrap gap-3">
              {s.ctaLink && <Link to={s.ctaLink} className="btn-primary">{L(s, 'ctaText')}</Link>}
              {s.cta2Link && <Link to={s.cta2Link} className="btn border border-ivory text-ivory hover:bg-ivory hover:text-ink">{L(s, 'cta2Text')}</Link>}
            </div>
          </motion.div>
        </AnimatePresence>
        {slides.length > 1 && (
          <div className="mt-14 flex gap-3">
            {slides.map((_, n) => (
              <button key={n} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} aria-current={n === i} className="h-[2px] w-16 bg-ivory/20">
                {n === i && <span key={i} className="block h-full animate-progress bg-rose" />}
                {n < i && <span className="block h-full w-full bg-ivory/60" />}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative order-1 h-[62svh] overflow-hidden lg:order-2 lg:col-span-6 lg:h-auto">
        <AnimatePresence>
          <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }}>
            <Img src={s.image} alt={L(s, 'title')} eager w={900} h={1200} className="h-full w-full" imgClass="animate-kenburns" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent lg:bg-gradient-to-r" />
        {section.content?.label && <p className="label absolute end-5 top-1/2 hidden -translate-y-1/2 rotate-90 text-[10px] text-ivory/80 lg:block" dir="ltr">{section.content.label}</p>}
      </div>
    </section>
  );
}

export function CategoryMosaic({ section }) {
  const L = useL();
  const { t } = useTranslation();
  const { data } = useAsync(() => catalogService.categories(), []);
  const bySlug = Object.fromEntries((data?.categories || []).map((c) => [c.slug, c]));
  const items = section.content?.items || [];
  return (
    <section className="container-site py-24">
      <Head s={section} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:grid-rows-2 md:gap-6">
        {items.map((it, n) => {
          const c = bySlug[it.category] || { name: it.category, slug: it.category };
          return (
            <Reveal key={it.category + n} delay={n * 0.08} className={it.tall ? 'col-span-2 md:row-span-2' : ''}>
              <Link to={`/shop/${c.slug}`} className="group block h-full">
                <Img src={it.image || c.image} alt={c.name} className={`card-img ${it.tall ? 'aspect-[4/5] md:aspect-auto md:h-[calc(100%-3rem)]' : 'aspect-[4/5]'}`} />
                <p className="mt-3 flex items-baseline justify-between font-display text-2xl md:text-3xl">
                  <span className="link-grow">{L(c, 'name')}</span>
                  <span className="label text-[10px] text-muted">{t('home.viewAll')}</span>
                </p>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function productQuery(c = {}) {
  const limit = c.limit || 10;
  if (c.source === 'featured') return { featured: 'true', limit };
  if (c.source === 'category') return { category: c.category, sort: 'popular', limit };
  if (c.source === 'manual') return { ids: (c.productIds || []).join(','), limit: Math.max(limit, c.productIds?.length || 0) };
  return { sort: 'newest', limit };
}

export function ProductRail({ section }) {
  const L = useL();
  const c = section.content || {};
  const { data, loading } = useAsync(() => (c.source === 'manual' && !c.productIds?.length ? Promise.resolve({ products: [] }) : catalogService.products(productQuery(c))), [JSON.stringify(c)]);
  if (!loading && !data?.products.length) return null;
  return (
    <section className="container-site py-16">
      <Rail loading={loading} products={data?.products || []} title={<div>{L(section, 'subtitle') && <p className="label mb-3 text-gold">{L(section, 'subtitle')}</p>}<h2 className="text-4xl md:text-6xl">{L(section, 'title')}</h2></div>} />
    </section>
  );
}

export function ShopTheLook({ section }) {
  const L = useL();
  const c = section.content || {};
  const hotspots = c.hotspots || [];
  const [active, setActive] = useState(null);
  const ids = hotspots.map((h) => h.productId).filter(Boolean);
  const { data } = useAsync(() => (ids.length ? catalogService.products({ ids: ids.join(','), limit: 48 }) : catalogService.products({ limit: 48 })), [ids.join(',')]);
  const find = (h) => data?.products.find((p) => p._id === h.productId || p.slug === h.productSlug);
  const h = active !== null && hotspots[active];
  const p = h && find(h);
  return (
    <section className="container-site py-24">
      <Head s={section} />
      <div className="relative">
        <Img src={c.image} alt={L(section, 'title') || 'Styled look'} w={1600} h={900} className="aspect-[4/5] w-full sm:aspect-[16/9]" />
        {hotspots.map((hs, n) => (
          <button key={n} style={{ left: `${hs.x}%`, top: `${hs.y}%` }} onClick={() => setActive(active === n ? null : n)} aria-label={`View product ${n + 1}`} aria-expanded={active === n} className="absolute grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ivory text-ink shadow-lg">
            <span className="absolute inset-0 animate-ping rounded-full bg-ivory/60" />
            {active === n ? <X className="relative h-4 w-4" /> : <Plus className="relative h-4 w-4" />}
          </button>
        ))}
        <AnimatePresence>
          {p && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ left: `min(max(${h.x}%, 8rem), calc(100% - 8rem))`, top: `${Math.min(h.y + 6, 70)}%` }} className="absolute w-60 -translate-x-1/2 bg-ivory p-3 text-ink shadow-xl">
              <Link to={`/product/${p.slug}`} className="flex gap-3">
                <Img src={p.images[0]} alt={p.title} w={72} h={96} className="h-24 w-[72px] shrink-0" />
                <div>
                  <p className="font-display text-lg leading-tight">{L(p, 'title')}</p>
                  <p className="mt-1 text-sm font-semibold">{pkr(p.price)}</p>
                  <span className="label link-grow mt-2 inline-block text-[10px]">Shop now</span>
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

export function Spotlight({ section }) {
  const L = useL();
  const c = section.content || {};
  const dark = c.dark !== false;
  return (
    <section className={dark ? 'bg-ink text-ivory' : 'bg-surface'}>
      <div className="container-site grid items-center gap-12 py-24 lg:grid-cols-12">
        <Reveal className="lg:col-span-7"><Img src={c.image} alt={L(section, 'title')} w={1000} h={750} className="aspect-[4/3]" /></Reveal>
        <Reveal delay={0.15} className="lg:col-span-5">
          {L(c, 'eyebrow') && <p className="label mb-5 text-gold">{L(c, 'eyebrow')}</p>}
          <h2 className="text-5xl md:text-7xl">{L(section, 'title')}</h2>
          <div className="my-8 h-px w-20 bg-gold" />
          <p className={`max-w-md ${dark ? 'text-ivory/75' : 'text-muted'}`}>{L(c, 'text')}</p>
          {c.ctaLink && <Link to={c.ctaLink} className="btn-primary mt-10">{L(c, 'ctaText')}</Link>}
        </Reveal>
      </div>
    </section>
  );
}

export function BestSellers({ section }) {
  const { t } = useTranslation();
  const L = useL();
  const tabs = section.content?.tabs?.length ? section.content.tabs : ['women'];
  const [tab, setTab] = useState(tabs[0]);
  const cats = useAsync(() => catalogService.categories(), []);
  const name = (slug) => {
    const c = cats.data?.categories.find((x) => x.slug === slug);
    return c ? L(c, 'name') : t(`nav.${slug}`, slug);
  };
  const { data, loading } = useAsync(() => catalogService.products({ category: tab, sort: 'popular', limit: section.content?.limit || 4 }), [tab]);
  return (
    <section className="container-site py-24">
      <Head
        s={section}
        className="flex-col items-start md:flex-row md:items-end"
        action={
          <div className="flex flex-wrap gap-2" role="tablist">
            {tabs.map((x) => <button key={x} role="tab" aria-selected={tab === x} onClick={() => setTab(x)} className={`chip ${tab === x ? 'chip-active' : ''}`}>{name(x)}</button>)}
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {loading ? [0, 1, 2, 3].map((i) => <CardSkeleton key={i} />) : data.products.map((p) => <ProductCard key={p._id} product={p} />)}
      </div>
    </section>
  );
}

const ICONS = { cod: Banknote, truck: Truck, returns: RotateCcw, shield: ShieldCheck };
export function PromiseStrip({ section }) {
  const L = useL();
  return (
    <section className="border-y border-line bg-surface" aria-label={L(section, 'title')}>
      <div className="container-site grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
        {(section.content?.items || []).map((it, n) => {
          const I = ICONS[it.icon] || ShieldCheck;
          return (
            <div key={n} className="flex flex-col items-center text-center">
              <I className="h-6 w-6 text-gold" strokeWidth={1.25} aria-hidden="true" />
              <p className="label mt-4">{L(it, 'title')}</p>
              <p className="mt-1 text-xs text-muted">{L(it, 'text')}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Testimonials({ section }) {
  const L = useL();
  const items = section.content?.items || [];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [items.length]);
  if (!items.length) return null;
  const r = items[i % items.length];
  return (
    <section className="container-site py-24 text-center">
      <p className="label mb-10 text-gold">{L(section, 'title')}</p>
      <AnimatePresence mode="wait">
        <motion.blockquote key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-4xl">
          <div className="mb-6 flex justify-center"><Stars value={r.rating || 5} size="h-4 w-4" /></div>
          <p className="font-display text-3xl italic leading-snug md:text-5xl">“{L(r, 'text')}”</p>
          <footer className="label mt-8 text-muted">{r.name}</footer>
        </motion.blockquote>
      </AnimatePresence>
      <div className="mt-10 flex justify-center gap-2">
        {items.map((_, n) => <button key={n} onClick={() => setI(n)} aria-label={`Review ${n + 1}`} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-8 bg-fg' : 'w-1.5 bg-line'}`} />)}
      </div>
    </section>
  );
}

export function LookbookGrid({ section }) {
  const L = useL();
  const images = section.content?.images || [];
  return (
    <section className="container-site py-16">
      <Reveal><SectionTitle eyebrow={section.content?.handle} title={L(section, 'title')} /></Reveal>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-4">
        {images.map((src, n) => (
          <Reveal key={src + n} delay={n * 0.05}>
            <div className="group block"><Img src={src} alt={`Lookbook ${n + 1}`} w={400} h={400} className="card-img aspect-square" /></div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Newsletter({ section }) {
  const { t } = useTranslation();
  const L = useL();
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
        <h2 className="text-4xl md:text-6xl">{L(section, 'title') || t('home.newsletter')}</h2>
        <p className="mx-auto mt-4 max-w-md text-muted">{L(section.content || {}, 'text') || t('home.newsletterSub')}</p>
        <form onSubmit={submit} className="mx-auto mt-10 flex max-w-lg flex-col gap-3 sm:flex-row" noValidate>
          <label className="sr-only" htmlFor="nl-email">{t('home.email')}</label>
          <input id="nl-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('home.email')} className="input" />
          <Button loading={loading} variant="ink" type="submit">{t('home.subscribe')}</Button>
        </form>
      </div>
    </section>
  );
}

export function RichText({ section }) {
  const L = useL();
  // HTML is sanitised on the server (sanitize-html) before it is stored.
  const html = L(section.content || {}, 'html');
  return (
    <section className="container-site max-w-3xl py-16">
      {L(section, 'title') && <h2 className="mb-6 text-4xl">{L(section, 'title')}</h2>}
      <div className="prose-fashionist space-y-4 leading-relaxed text-muted" dangerouslySetInnerHTML={{ __html: html || '' }} />
    </section>
  );
}

export function Banner({ section }) {
  const L = useL();
  const c = section.content || {};
  const Wrap = c.link ? Link : 'div';
  return (
    <section className="container-site py-12">
      <Wrap to={c.link} className="group relative block overflow-hidden bg-ink text-ivory">
        <Img src={c.image} alt={L(section, 'title')} w={1600} h={600} className="card-img aspect-[16/9] opacity-80 sm:aspect-[21/8]" />
        <div className={`absolute inset-0 flex flex-col justify-end p-6 sm:p-12 ${c.align === 'center' ? 'items-center text-center' : ''}`}>
          {L(section, 'subtitle') && <p className="label text-gold">{L(section, 'subtitle')}</p>}
          <h2 className="mt-2 text-4xl md:text-6xl">{L(section, 'title')}</h2>
          {L(c, 'ctaText') && <span className="btn-primary mt-6 w-fit">{L(c, 'ctaText')}</span>}
        </div>
      </Wrap>
    </section>
  );
}

export const SECTION_COMPONENTS = { hero: Hero, categoryMosaic: CategoryMosaic, productRail: ProductRail, shopTheLook: ShopTheLook, spotlight: Spotlight, bestSellers: BestSellers, promiseStrip: PromiseStrip, testimonials: Testimonials, lookbookGrid: LookbookGrid, newsletter: Newsletter, richText: RichText, banner: Banner };

/** Renders the published (or preview) homepage sections from the CMS store. */
export function HomepageSections() {
  const sections = useSelector((s) => s.cms.sections);
  const ordered = useMemo(() => [...sections].sort((a, b) => a.order - b.order), [sections]);
  return ordered.map((s) => {
    const C = SECTION_COMPONENTS[s.type];
    return C ? <div key={s._id} id={`section-${s._id}`} data-section-type={s.type}><C section={s} /></div> : null;
  });
}
