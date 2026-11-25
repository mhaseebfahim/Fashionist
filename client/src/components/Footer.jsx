import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, MessageCircle, Youtube } from 'lucide-react';
import { Logo } from './ui.jsx';
import { useSettings } from '../hooks/index.js';
import { setLang } from '../features/store.js';
import { waHref } from '../utils/format.js';

const L = (o, lang, k) => (lang === 'ur' && o[`${k}Ur`]) || o[k];

export default function Footer() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const s = useSettings();
  const columns = useSelector((st) => st.cms.navigation?.footer || []);
  const lang = (l) => (i18n.changeLanguage(l), dispatch(setLang(l)));
  return (
    <footer className="bg-ink text-ivory">
      <div className="container-site py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo size="text-2xl" />
            <p className="mt-4 font-display text-3xl italic text-ivory/80">{t('brand.tagline')}</p>
            <span className="label mt-8 inline-flex items-center gap-2 border border-gold/60 px-4 py-2 text-[10px] text-gold">◆ Cash on Delivery</span>
          </div>
          <div className="grid grid-cols-2 gap-10 md:col-span-8 md:grid-cols-4">
            {columns.map((c) => (
              <div key={c.title}>
                <p className="label mb-5 text-gold">{L(c, i18n.language, 'title')}</p>
                <ul className="space-y-3 text-sm text-ivory/70">
                  {c.links?.map((l) => <li key={l.link}><Link to={l.link} className="link-grow hover:text-ivory">{L(l, i18n.language, 'label')}</Link></li>)}
                </ul>
              </div>
            ))}
            <div>
              <p className="label mb-5 text-gold">{t('footer.contact')}</p>
              <ul className="space-y-3 text-sm text-ivory/70">
                <li><a href={`tel:${s?.store.phone?.replace(/\s/g, '')}`}>{s?.store.phone}</a></li>
                <li><a href={`mailto:${s?.store.email}`}>{s?.store.email}</a></li>
                <li>{s?.store.address}</li>
                {waHref(s?.store.whatsapp) && (
                  <li>
                    <a href={waHref(s.store.whatsapp, 'Hi Fashionist!')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-ivory link-grow">
                      <MessageCircle className="h-4 w-4" /> {t('footer.whatsapp')}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-ivory/10 pt-8 text-xs text-ivory/60 md:flex-row md:items-center">
          <p>{t('footer.rights')}</p>
          <div className="flex items-center gap-5">
            <button onClick={() => lang('en')} className={i18n.language === 'en' ? 'text-ivory' : ''}>English</button>
            <span aria-hidden="true">·</span>
            <button onClick={() => lang('ur')} className={i18n.language === 'ur' ? 'text-ivory' : ''}>اردو</button>
          </div>
          <div className="flex gap-4 text-ivory/70">
            {[[Instagram, 'Instagram'], [Facebook, 'Facebook'], [Youtube, 'YouTube']].map(([I, n]) => (
              <a key={n} href="#" aria-label={n} className="hover:text-rose"><I className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
