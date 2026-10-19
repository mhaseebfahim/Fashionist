import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '../components/ProductCard.jsx';
import { Button, CardSkeleton, EmptyState, Img, useMeta } from '../components/ui.jsx';
import { useAsync } from '../hooks/index.js';
import { catalogService } from '../services/index.js';
import { colourHex, pkr, tr } from '../utils/format.js';
import { ATTR_FILTERS } from '../utils/rules.js';

const LIMIT = 12;
const MULTI = ['size', 'colour', ...ATTR_FILTERS];
const FLAGS = { tag: 'new', sale: 'true', inStock: 'true' }; // one-click toggles

export default function Shop({ search }) {
  const { t, i18n } = useTranslation();
  const { categorySlug } = useParams();
  const [sp, setSp] = useSearchParams();
  const [cols, setCols] = useState(() => +localStorage.getItem('fashionist:cols') || 3);
  const [sheet, setSheet] = useState(false);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  const category = categorySlug || sp.get('category') || '';
  const page = +sp.get('page') || 1;
  const filterKey = [...sp.entries()].filter(([k]) => k !== 'page').map((e) => e.join('=')).join('&') + category;
  const query = useMemo(() => {
    const { page: _p, ...rest } = Object.fromEntries(sp.entries());
    const attr = Object.fromEntries(ATTR_FILTERS.filter((k) => rest[k]).map((k) => [k, rest[k]]));
    ATTR_FILTERS.forEach((k) => delete rest[k]);
    return { ...rest, ...(Object.keys(attr).length && { attr }), category, limit: LIMIT };
  }, [filterKey]); // eslint-disable-line

  const cats = useAsync(() => catalogService.categories(), []);
  // Options (with counts) come from the server for this category / search / collection.
  const facetsSrc = useAsync(() => catalogService.facets({ category, q: sp.get('q') || undefined, tag: sp.get('tag') || undefined, sale: sp.get('sale') || undefined }), [category, sp.get('q'), sp.get('tag'), sp.get('sale')]);
  const facets = useMemo(() => {
    const f = facetsSrc.data?.facets;
    return { sizes: f?.sizes || [], colours: f?.colours || [], attributes: f?.attributes || {}, max: Math.max(1000, Math.ceil((f?.price?.max || 0) / 500) * 500) };
  }, [facetsSrc.data]);
  const catObj = cats.data?.categories.find((c) => c.slug === category);
  // Sub-categories of the open category (or top-level ones on /shop) for quick chips.
  const subCats = (cats.data?.categories || []).filter((c) => (catObj ? String(c.parent) === String(catObj._id) : !c.parent));
  const collection = sp.get('tag') === 'new' ? t('shop.newArrivals') : sp.get('sale') === 'true' ? t('shop.sale') : '';

  useEffect(() => {
    let alive = true;
    setLoading(true);
    catalogService.products({ ...query, page }).then((r) => {
      if (!alive) return;
      setItems(r.products);
      setMeta(r.meta || r);
      setLoading(false);
    });
    return () => (alive = false);
  }, [query, page]);

  const loadMore = async () => {
    setMore(true);
    const next = meta.page + 1;
    const r = await catalogService.products({ ...query, page: next });
    setItems((x) => [...x, ...r.products]);
    setMeta(r.meta || r);
    setMore(false);
  };

  const set = (k, v) => {
    const n = new URLSearchParams(sp);
    v === '' || v == null ? n.delete(k) : n.set(k, v);
    n.delete('page');
    setSp(n, { replace: true });
  };
  const toggle = (k, v) => {
    const cur = (sp.get(k) || '').split(',').filter(Boolean);
    set(k, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(','));
  };
  const active = [...sp.entries()].filter(([k]) => !['sort', 'page', 'q', 'category'].includes(k)).flatMap(([k, v]) => (MULTI.includes(k) ? v.split(',').map((x) => [k, x]) : [[k, v]]));
  const clearAll = () => setSp(sp.get('q') ? { q: sp.get('q') } : {}, { replace: true });
  const setColsSaved = (n) => (setCols(n), localStorage.setItem('fashionist:cols', n));
  const chipLabel = (k, v) => (k === 'maxPrice' ? `≤ ${pkr(v)}` : k === 'minPrice' ? `≥ ${pkr(v)}` : k === 'inStock' ? t('shop.inStock') : k === 'tag' ? t('shop.newArrivals') : k === 'sale' ? t('shop.sale') : v);

  const title = search ? `“${sp.get('q') || ''}”` : catObj ? tr(catObj, 'name', i18n.language) : collection || t('nav.shop');
  useMeta(search ? `Search: ${sp.get('q') || ''}` : catObj?.name || collection || 'Shop', catObj ? `Shop ${catObj.name} for men at Fashionist — Cash on Delivery across Pakistan.` : 'Shop Fashionist menswear — shirts, jeans, jackets, suits, sneakers and accessories.', catObj?.image);
  const gridCls = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-3 xl:grid-cols-4' }[cols];

  const Filters = (
    <div className="space-y-9">
      {!search && (
        <div>
          <p className="label mb-4">{t('shop.category')}</p>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/shop" className={!category ? 'font-semibold' : 'text-muted hover:text-fg'}>{t('shop.all')}</Link></li>
            {(cats.data?.categories || []).filter((c) => !c.parent).map((top) => {
              const kids = cats.data.categories.filter((c) => String(c.parent) === String(top._id));
              const keep = `?${new URLSearchParams(Object.fromEntries([...sp.entries()].filter(([k]) => k === 'sort')))}`;
              const open = category === top.slug || kids.some((k) => k.slug === category);
              return (
                <li key={top._id}>
                  <Link to={`/shop/${top.slug}${keep}`} className={category === top.slug ? 'font-semibold' : 'text-muted hover:text-fg'}>{tr(top, 'name', i18n.language)}</Link>
                  {open && kids.length > 0 && (
                    <ul className="ms-3 mt-2 space-y-2 border-s border-line ps-3">
                      {kids.map((c) => <li key={c._id}><Link to={`/shop/${c.slug}${keep}`} className={category === c.slug ? 'font-semibold' : 'text-muted hover:text-fg'}>{tr(c, 'name', i18n.language)}</Link></li>)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="space-y-2.5">
        <p className="label mb-4">{t('shop.quick')}</p>
        {[['tag', t('shop.newOnly')], ['sale', t('shop.onSale')], ['inStock', t('shop.inStock')]].map(([k, label]) => (
          <label key={k} className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-rose" checked={sp.get(k) === FLAGS[k]} onChange={(e) => set(k, e.target.checked ? FLAGS[k] : '')} /> {label}
          </label>
        ))}
      </div>
      <div>
        <p className="label mb-4">{t('shop.price')}</p>
        <input type="range" min="0" max={facets.max} step="500" value={Math.min(+sp.get('maxPrice') || facets.max, facets.max)} onChange={(e) => set('maxPrice', +e.target.value >= facets.max ? '' : e.target.value)} className="w-full accent-rose" aria-label="Maximum price" />
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{pkr(0)}</span><span>{pkr(sp.get('maxPrice') || facets.max)}</span></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[[0, 2000], [2000, 5000], [5000, 10000], [10000, 0]].filter(([lo]) => lo < facets.max).map(([lo, hi]) => {
            const on = (+sp.get('minPrice') || 0) === lo && (+sp.get('maxPrice') || 0) === hi;
            return (
              <button key={lo} onClick={() => { const n = new URLSearchParams(sp); on || !lo ? n.delete('minPrice') : n.set('minPrice', lo); on || !hi ? n.delete('maxPrice') : n.set('maxPrice', hi); n.delete('page'); setSp(n, { replace: true }); }} className={`chip text-[11px] ${on ? 'chip-active' : ''}`}>
                {hi ? (lo ? `${lo / 1000}k–${hi / 1000}k` : `< ${hi / 1000}k`) : `${lo / 1000}k+`}
              </button>
            );
          })}
        </div>
      </div>
      {facets.sizes.length > 0 && (
        <div>
          <p className="label mb-4">{t('shop.size')}</p>
          <div className="flex flex-wrap gap-2">{facets.sizes.map(({ value: s, count }) => <button key={s} onClick={() => toggle('size', s)} title={`${count}`} className={`chip ${sp.get('size')?.split(',').includes(s) ? 'chip-active' : ''}`}>{s}</button>)}</div>
        </div>
      )}
      {facets.colours.length > 0 && (
        <div>
          <p className="label mb-4">{t('shop.colour')}</p>
          <div className="flex flex-wrap gap-3">
            {facets.colours.map(({ value: c, count }) => {
              const on = sp.get('colour')?.split(',').includes(c);
              return <button key={c} onClick={() => toggle('colour', c)} title={`${c} (${count})`} aria-label={c} aria-pressed={on} className={`h-8 w-8 rounded-full border ${on ? 'ring-2 ring-fg ring-offset-2 ring-offset-bg' : 'border-line'}`} style={{ background: colourHex[c] || '#ccc' }} />;
            })}
          </div>
        </div>
      )}
      {ATTR_FILTERS.filter((k) => facets.attributes[k]?.length).map((k) => (
        <div key={k}>
          <p className="label mb-4">{t(`shop.${k}`)}</p>
          <div className="max-h-56 space-y-2 overflow-auto">
            {facets.attributes[k].map(({ value: f, count }) => (
              <label key={f} className="flex cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-rose" checked={!!sp.get(k)?.split(',').includes(f)} onChange={() => toggle(k, f)} /> <span className="flex-1">{f}</span> <span className="text-xs text-muted">{count}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <section className="relative">
        {catObj?.image && !search ? (
          <div className="relative h-[42vh] min-h-[280px] overflow-hidden bg-ink text-ivory">
            <Img src={catObj.image} alt="" eager className="absolute inset-0 opacity-60" />
            <div className="container-site relative flex h-full flex-col justify-end pb-10">
              <p className="label text-gold">Fashionist · Menswear</p>
              <h1 className="mt-3 text-6xl md:text-8xl">{title}</h1>
            </div>
          </div>
        ) : (
          <div className="container-site border-b border-line pb-10 pt-16">
            <p className="label text-gold">{search ? t('nav.search') : 'Fashionist'}</p>
            <h1 className="mt-3 text-6xl md:text-8xl">{title}</h1>
          </div>
        )}
      </section>

      <div className="sticky top-[72px] z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="container-site flex h-14 items-center justify-between gap-4">
          <button onClick={() => setSheet(true)} className="label flex items-center gap-2 lg:hidden"><SlidersHorizontal className="h-4 w-4" /> {t('shop.filters')}</button>
          <p className="hidden text-xs text-muted lg:block" aria-live="polite">{t('shop.results', { count: meta.total })}</p>
          <div className="flex items-center gap-5">
            <select value={sp.get('sort') || (sp.get('q') ? '' : 'newest')} onChange={(e) => set('sort', e.target.value)} className="border-0 bg-transparent text-xs font-semibold uppercase tracking-label focus:outline-none" aria-label={t('shop.sort')}>
              {[...(sp.get('q') ? [['', 'relevance']] : []), ['newest', 'newest'], ['priceAsc', 'priceAsc'], ['priceDesc', 'priceDesc'], ['popular', 'popular'], ['rating', 'rating']].map(([v, k]) => <option key={v} value={v}>{t(`shop.${k}`)}</option>)}
            </select>
            <div className="hidden items-center gap-1 md:flex" role="group" aria-label="Grid density">
              {[2, 3, 4].map((n) => (
                <button key={n} onClick={() => setColsSaved(n)} aria-pressed={cols === n} className={`grid h-8 w-8 place-items-center text-xs ${cols === n ? 'bg-fg text-bg' : 'text-muted'}`}>{n === 3 ? <LayoutGrid className="h-3.5 w-3.5" /> : n}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container-site grid gap-10 py-10 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block xl:col-span-2"><div className="sticky top-40">{Filters}</div></aside>
        <div className="lg:col-span-9 xl:col-span-10">
          {!search && subCats.length > 0 && (
            <div className="-mx-1 mb-8 flex gap-2 overflow-x-auto px-1 pb-1">
              {subCats.map((c) => <Link key={c._id} to={`/shop/${c.slug}`} className="chip shrink-0 whitespace-nowrap">{tr(c, 'name', i18n.language)}</Link>)}
            </div>
          )}
          {active.length > 0 && (
            <div className="mb-8 flex flex-wrap items-center gap-2">
              {active.map(([k, v]) => (
                <button key={k + v} onClick={() => (MULTI.includes(k) ? toggle(k, v) : set(k, ''))} className="chip chip-active inline-flex items-center gap-1.5">
                  {chipLabel(k, v)} <X className="h-3 w-3" />
                </button>
              ))}
              <button onClick={clearAll} className="ms-2 text-xs underline">{t('shop.clear')}</button>
            </div>
          )}
          {loading ? (
            <div className={`grid grid-cols-2 gap-x-4 gap-y-10 ${gridCls}`}>{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>
          ) : items.length === 0 ? (
            <EmptyState title={search ? t('search.noResults', { q: sp.get('q') }) : t('shop.empty')} text={t('shop.emptySub')} action={<button onClick={clearAll} className="btn-outline">{t('shop.clear')}</button>} />
          ) : (
            <>
              <motion.div layout className={`grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 ${gridCls}`}>
                {items.map((p, i) => <ProductCard key={p._id} product={p} eager={i < 3} />)}
              </motion.div>
              {meta.page < meta.pages && (
                <div className="mt-16 text-center">
                  <p className="mb-4 text-xs text-muted">{items.length} / {meta.total}</p>
                  <Button variant="outline" loading={more} onClick={loadMore}>{t('shop.loadMore')}</Button>
                </div>
              )}
              {meta.pages > 1 && (
                <nav className="mt-10 flex justify-center gap-1" aria-label="Pagination">
                  {Array.from({ length: meta.pages }, (_, n) => n + 1).map((n) => (
                    <button key={n} onClick={() => { const x = new URLSearchParams(sp); x.set('page', n); setSp(x); }} aria-current={n === meta.page} className={`h-9 w-9 text-sm ${n === meta.page ? 'bg-fg text-bg' : 'border border-line'}`}>{n}</button>
                  ))}
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {sheet && (
          <motion.div className="fixed inset-0 z-[65] bg-ink/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.45 }} onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col bg-bg">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <p className="font-display text-2xl">{t('shop.filters')}</p>
                <button onClick={() => setSheet(false)} aria-label={t('common.close')}><X className="h-5 w-5" /></button>
              </div>
              <div className="flex-1 overflow-auto p-5">{Filters}</div>
              <div className="grid grid-cols-2 gap-3 border-t border-line p-4">
                <button onClick={clearAll} className="btn-outline">{t('shop.clear')}</button>
                <button onClick={() => setSheet(false)} className="btn-primary">{t('shop.apply')} ({meta.total})</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
