import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Mic, Search, X } from 'lucide-react';
import { Img, Skeleton } from './ui.jsx';
import { addRecent, clearRecent, setSearchOpen } from '../features/store.js';
import { useDebounce, useSpeech } from '../hooks/index.js';
import { catalogService } from '../services/index.js';
import { pkr, tr } from '../utils/format.js';

const TRENDING = ['Eid', 'Lawn', 'Silk', 'Kurta', 'Unstitched', 'Jhumka'];

export default function SearchOverlay() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const nav = useNavigate();
  const { searchOpen, recent } = useSelector((s) => s.ui);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const dq = useDebounce(q.trim(), 250);
  const input = useRef(null);
  const close = () => dispatch(setSearchOpen(false));
  const go = (term) => {
    if (!term.trim()) return;
    dispatch(addRecent(term.trim()));
    close();
    nav(`/search?q=${encodeURIComponent(term.trim())}`);
  };
  const speech = useSpeech((text) => {
    setQ(text);
    go(text);
  });

  useEffect(() => {
    if (searchOpen) setTimeout(() => input.current?.focus(), 50);
    else setQ('');
  }, [searchOpen]);
  useEffect(() => {
    if (!dq) return setResults(null);
    let alive = true;
    setResults('loading');
    catalogService.products({ q: dq, limit: 6 }).then((r) => alive && setResults(r.products));
    return () => (alive = false);
  }, [dq]);
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && close();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div role="dialog" aria-label={t('nav.search')} className="fixed inset-0 z-[70] overflow-auto bg-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="container-site py-6">
            <div className="flex justify-end">
              <button onClick={close} aria-label={t('common.close')} className="grid h-10 w-10 place-items-center"><X className="h-6 w-6" /></button>
            </div>
            <form onSubmit={(e) => (e.preventDefault(), go(q))} className="mx-auto mt-8 flex max-w-4xl items-center gap-4 border-b border-fg pb-4">
              <Search className="h-6 w-6 shrink-0 text-muted" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={speech.listening ? t('search.listening') : t('search.placeholder')} className="w-full bg-transparent font-display text-3xl outline-none placeholder:text-muted md:text-5xl" aria-label={t('nav.search')} />
              {speech.supported && (
                <button type="button" onClick={speech.listening ? speech.stop : speech.start} aria-label="Voice search" className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full ${speech.listening ? 'bg-rose text-white' : 'border border-line'}`}>
                  {speech.listening && <span className="absolute inset-0 animate-ping rounded-full bg-rose/40" />}
                  <Mic className="relative h-5 w-5" />
                </button>
              )}
            </form>
            <div className="mx-auto mt-12 grid max-w-4xl gap-12 md:grid-cols-3">
              <div className="space-y-10">
                {recent.length > 0 && (
                  <div>
                    <div className="mb-4 flex justify-between"><p className="label text-muted">{t('search.recent')}</p><button className="text-xs underline" onClick={() => dispatch(clearRecent())}>{t('search.clear')}</button></div>
                    <ul className="space-y-2">{recent.map((r) => <li key={r}><button onClick={() => go(r)} className="link-grow text-sm">{r}</button></li>)}</ul>
                  </div>
                )}
                <div>
                  <p className="label mb-4 text-muted">{t('search.trending')}</p>
                  <div className="flex flex-wrap gap-2">{TRENDING.map((x) => <button key={x} onClick={() => go(x)} className="chip">{x}</button>)}</div>
                </div>
              </div>
              <div className="md:col-span-2">
                {results && <p className="label mb-4 text-muted">{t('search.suggestions')}</p>}
                {results === 'loading' ? (
                  <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[3/4]" />)}</div>
                ) : results?.length === 0 ? (
                  <p className="text-muted">{t('search.noResults', { q: dq })}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {results?.map((p) => (
                      <Link key={p._id} to={`/product/${p.slug}`} onClick={() => (dispatch(addRecent(dq)), close())} className="group">
                        <Img src={p.images[0]} alt={p.title} className="card-img aspect-[3/4]" />
                        <p className="mt-2 font-display text-lg leading-tight">{tr(p, 'title', i18n.language)}</p>
                        <p className="text-xs">{pkr(p.price)}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
