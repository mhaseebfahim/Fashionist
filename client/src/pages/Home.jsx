import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { HomepageSections } from '../components/home/sections.jsx';
import { useMeta } from '../components/ui.jsx';

export default function Home() {
  const preview = useSelector((s) => s.cms.preview);
  useMeta('', 'Fashionist — menswear in Pakistan. T-shirts, shirts, jeans, chinos, jackets, suits, sneakers and accessories. Cash on Delivery nationwide.');
  // Builder iframe: scroll to the section being edited.
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || typeof e.data !== 'object' || e.data?.type !== 'fashionist:scroll-to') return;
      document.getElementById(`section-${e.data.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return (
    <>
      {preview && <div className="fixed bottom-3 start-3 z-50 bg-rose px-3 py-1.5 text-[10px] font-semibold uppercase tracking-label text-white">Draft preview</div>}
      <HomepageSections />
    </>
  );
}
