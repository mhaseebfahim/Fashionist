import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Accordion, ErrorPage, Img, Reveal, Skeleton, useMeta } from '../components/ui.jsx';
import { useAsync, useSettings } from '../hooks/index.js';
import { cmsService } from '../services/index.js';
import { tr, waHref } from '../utils/format.js';

/** Renders one CMS page block (heading | paragraph | image | twoColumn | faq). */
export function Block({ b, lang }) {
  const L = (k) => tr(b, k, lang);
  if (b.type === 'heading') return <h2 className="pt-6 text-3xl md:text-4xl">{L('text')}</h2>;
  if (b.type === 'paragraph') return <p className="leading-relaxed text-muted">{L('text')}</p>;
  if (b.type === 'image') return b.image ? <Img src={b.image} alt={b.alt || ''} w={1200} h={700} className="aspect-[16/9]" /> : null;
  if (b.type === 'twoColumn')
    return (
      <div className="grid gap-8 border-y border-line py-8 md:grid-cols-2">
        <p className="leading-relaxed text-muted">{L('left')}</p>
        <p className="leading-relaxed text-muted">{L('right')}</p>
      </div>
    );
  if (b.type === 'faq')
    return (
      <div className="border-t border-line">
        {(b.items || []).map((it, i) => <Accordion key={i} title={tr(it, 'q', lang)}>{tr(it, 'a', lang)}</Accordion>)}
      </div>
    );
  return null;
}

export default function StaticPage() {
  const { slug } = useParams();
  const { i18n } = useTranslation();
  const s = useSettings();
  const fallback = useSelector((st) => st.cms.pages?.find((p) => p.slug === slug));
  const { data, loading, error } = useAsync(() => cmsService.page(slug), [slug]);
  const page = data?.page || (error && error.status !== 404 ? fallback : null);
  useMeta(page?.metaTitle?.replace(/ \| Fashionist$/, '') || page?.title, page?.metaDescription);
  if (loading) return <div className="container-site space-y-4 py-16"><Skeleton className="h-16 w-1/2" /><Skeleton className="h-40" /></div>;
  if (!page) return <ErrorPage />;
  const [intro, ...rest] = page.blocks || [];
  const hasIntro = intro?.type === 'paragraph';
  return (
    <article>
      <header className="container-site border-b border-line py-16">
        <p className="label text-gold">Fashionist</p>
        <h1 className="mt-4 text-6xl md:text-8xl">{tr(page, 'title', i18n.language)}</h1>
        {hasIntro && <p className="mt-8 max-w-2xl font-display text-2xl italic text-muted">{tr(intro, 'text', i18n.language)}</p>}
      </header>
      <div className="container-site max-w-3xl space-y-6 py-16">
        {(hasIntro ? rest : page.blocks).map((b, i) => (
          <Reveal key={i} delay={Math.min(i, 6) * 0.04}><Block b={b} lang={i18n.language} /></Reveal>
        ))}
        {slug === 'contact' && s && (
          <dl className="grid gap-8 pt-6 sm:grid-cols-2">
            {[['Phone', <a key="p" href={`tel:${s.store.phone?.replace(/\s/g, '')}`}>{s.store.phone}</a>], ['Email', <a key="e" href={`mailto:${s.store.email}`}>{s.store.email}</a>], ...(waHref(s.store.whatsapp) ? [['WhatsApp', <a key="w" className="underline" target="_blank" rel="noreferrer" href={waHref(s.store.whatsapp, 'Hi Fashionist!')}>Chat with us</a>]] : []),['Studio', s.store.address]].map(([k, v]) => (
              <div key={k}><dt className="label text-gold">{k}</dt><dd className="mt-2 font-display text-2xl">{v}</dd></div>
            ))}
          </dl>
        )}
      </div>
    </article>
  );
}
