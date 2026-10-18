import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, MessageCircle, Youtube } from 'lucide-react';
import { Logo } from './ui.jsx';
import { useSettings } from '../hooks/index.js';
import { setLang } from '../features/store.js';

export default function Footer() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const s = useSettings();
  const lang = (l) => (i18n.changeLanguage(l), dispatch(setLang(l)));
  const col = (title, links) => (
    <div>
      <p className="label mb-5 text-gold">{title}</p>
      <ul className="space-y-3 text-sm text-ivory/70">
        {links.map(([label, to]) => (
          <li key={to}><Link to={to} className="link-grow hover:text-ivory">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
  return (
    <footer className="bg-ink text-ivory">
      <div className="container-site py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Logo size="text-2xl" />
            <p className="mt-5 font-display text-3xl italic text-ivory/80">{t('brand.tagline')}</p>
            <span className="label mt-8 inline-flex items-center gap-2 border border-gold/60 px-4 py-2 text-[10px] text-gold">◆ Cash on Delivery</span>
          </div>
          <div className="grid grid-cols-2 gap-10 md:col-span-8 md:grid-cols-4">
            {col(t('footer.shop'), [[t('nav.women'), '/shop/women'], [t('nav.men'), '/shop/men'], [t('nav.kids'), '/shop/kids'], [t('nav.unstitched'), '/shop/unstitched'], [t('nav.accessories'), '/shop/accessories']])}
            {col(t('footer.help'), [[t('footer.shipping'), '/pages/shipping'], [t('footer.returns'), '/pages/returns'], [t('footer.faq'), '/pages/faq'], [t('account.orders'), '/account/orders']])}
            {col(t('footer.company'), [[t('footer.about'), '/pages/about'], [t('footer.contactUs'), '/pages/contact'], [t('footer.privacy'), '/pages/privacy']])}
            <div>
              <p className="label mb-5 text-gold">{t('footer.contact')}</p>
              <ul className="space-y-3 text-sm text-ivory/70">
                <li>{s?.store.phone}</li>
                <li>{s?.store.email}</li>
                <li>{s?.store.address}</li>
                <li>
                  <a href={`https://wa.me/${s?.store.whatsapp || ''}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-ivory link-grow">
                    <MessageCircle className="h-4 w-4" /> {t('footer.whatsapp')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-6 border-t border-ivory/10 pt-8 text-xs text-ivory/50 md:flex-row md:items-center">
          <p>{t('footer.rights')}</p>
          <div className="flex items-center gap-5">
            <button onClick={() => lang('en')} className={i18n.language === 'en' ? 'text-ivory' : ''}>English</button>
            <span>·</span>
            <button onClick={() => lang('ur')} className={i18n.language === 'ur' ? 'text-ivory' : ''}>اردو</button>
          </div>
          <div className="flex gap-4 text-ivory/70">
            {[Instagram, Facebook, Youtube].map((I, i) => (
              <a key={i} href="#" aria-label={I.displayName || 'Social'} className="hover:text-rose"><I className="h-4 w-4" /></a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
