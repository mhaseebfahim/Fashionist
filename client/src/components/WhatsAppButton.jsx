import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../hooks/index.js';
import { waHref } from '../utils/format.js';

const WaIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.97 1-3.62-.24-.37a9.8 9.8 0 0 1-1.5-5.22c0-5.42 4.42-9.83 9.84-9.83a9.77 9.77 0 0 1 9.82 9.84c0 5.42-4.41 9.82-9.83 9.82m8.36-18.19A11.75 11.75 0 0 0 12.05.15C5.54.15.25 5.44.25 11.95c0 2.08.54 4.11 1.58 5.9L.15 24l6.3-1.65a11.8 11.8 0 0 0 5.6 1.42h.01c6.5 0 11.8-5.3 11.8-11.8 0-3.15-1.23-6.12-3.45-8.35" />
  </svg>
);

/** Floating "chat on WhatsApp" button; on a product page the message names the product. Hidden until the admin sets a valid number. */
export default function WhatsAppButton() {
  const s = useSettings();
  const { t } = useTranslation();
  const { pathname } = useLocation();
  if (pathname.startsWith('/checkout')) return null;
  const onProduct = pathname.startsWith('/product/');
  const href = waHref(s?.store?.whatsapp, 'Hi Fashionist!');
  if (!href) return null;
  // The product name is read at click time — the page title is only set once the product has loaded.
  const withProduct = (e) => {
    if (onProduct) e.currentTarget.href = waHref(s.store.whatsapp, `Hi Fashionist! I'd like to ask about: ${document.title.replace(/ — Fashionist$/, '')}\n${window.location.href}`);
  };
  return (
    <a href={href} onClick={withProduct} onAuxClick={withProduct} target="_blank" rel="noreferrer" aria-label={t('footer.whatsapp')} title={t('footer.whatsapp')} className={`fixed end-5 z-50 ${onProduct ? 'bottom-24 sm:bottom-5' : 'bottom-5'} grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]`}>
      <WaIcon className="h-7 w-7" />
    </a>
  );
}
