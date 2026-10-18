import { useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard.jsx';
import { CardSkeleton } from './ui.jsx';

/** Horizontal snap rail of large portrait product cards with arrow controls. */
export default function Rail({ products, loading, title }) {
  const ref = useRef(null);
  const rtl = typeof document !== 'undefined' && document.dir === 'rtl';
  const scroll = (d) => ref.current?.scrollBy({ left: d * (rtl ? -1 : 1) * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        {title}
        <div className="flex gap-2">
          <button onClick={() => scroll(-1)} aria-label="Previous" className="grid h-11 w-11 place-items-center border border-line hover:border-fg"><ArrowLeft className="h-4 w-4 rtl:rotate-180" /></button>
          <button onClick={() => scroll(1)} aria-label="Next" className="grid h-11 w-11 place-items-center border border-line hover:border-fg"><ArrowRight className="h-4 w-4 rtl:rotate-180" /></button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        {(loading ? Array.from({ length: 5 }) : products).map((p, i) => (
          <div key={p?._id || i} className="w-[72%] shrink-0 snap-start sm:w-[44%] md:w-[31%] lg:w-[23%]">{loading ? <CardSkeleton /> : <ProductCard product={p} />}</div>
        ))}
      </div>
    </div>
  );
}
