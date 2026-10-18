import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Img } from './ui.jsx';
import { addItem, setCartOpen, toggleWishlist } from '../features/store.js';
import { isNew, pct, pkr, tr } from '../utils/format.js';

export const cartLine = (p, v, qty = 1) => ({ productId: p._id, slug: p.slug, title: p.title, titleUr: p.titleUr, image: p.images[0], price: p.price, sku: v.sku, size: v.size, colour: v.colour, stock: v.stock, qty });

export default function ProductCard({ product: p, eager }) {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const wished = useSelector((s) => s.wishlist.items.some((w) => w._id === p._id));
  const [hover, setHover] = useState(false);
  const off = pct(p.price, p.compareAtPrice);
  const sizes = [...new Map(p.variants.map((v) => [v.size, v])).values()];

  const quickAdd = (size) => {
    const v = p.variants.find((x) => x.size === size && x.stock > 0);
    if (!v) return toast.error(t('product.soldOut'));
    dispatch(addItem(cartLine(p, v)));
    dispatch(setCartOpen(true));
    toast.success(t('product.added'));
  };

  return (
    <article className="group" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="card-img relative aspect-[3/4]">
        <Link to={`/product/${p.slug}`} aria-label={p.title}>
          <Img src={p.images[0]} alt={p.title} eager={eager} className="absolute inset-0" />
          {p.images[1] && <Img src={p.images[1]} alt="" className={`absolute inset-0 transition-opacity duration-700 ${hover ? 'opacity-100' : 'opacity-0'}`} />}
        </Link>
        <div className="pointer-events-none absolute start-3 top-3 flex flex-col gap-1.5">
          {isNew(p) && <span className="label bg-blush px-2 py-1 text-[10px] text-rose-deep">{t('product.new')}</span>}
          {off > 0 && <span className="label bg-blush px-2 py-1 text-[10px] text-rose-deep">-{off}%</span>}
        </div>
        <button onClick={() => dispatch(toggleWishlist(p))} aria-label={t('product.wishlist')} aria-pressed={wished} className="absolute end-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ivory/90 text-ink transition hover:bg-ivory">
          <Heart className={`h-4 w-4 ${wished ? 'fill-rose text-rose' : ''}`} />
        </button>
        <div className="absolute inset-x-0 bottom-0 hidden translate-y-full bg-ivory/95 p-3 text-ink transition-transform duration-500 group-hover:translate-y-0 md:block">
          <p className="label mb-2 text-center text-[10px] text-stone">{t('product.quickAdd')}</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {sizes.map((v) => {
              const any = p.variants.some((x) => x.size === v.size && x.stock > 0);
              return (
                <button key={v.size} disabled={!any} onClick={() => quickAdd(v.size)} className="min-w-9 border border-hairline px-2 py-1 text-xs hover:border-ink disabled:text-stone disabled:line-through">
                  {v.size}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pt-4">
        <p className="label text-[10px] text-muted">{tr(p.category, 'name', i18n.language)}</p>
        <Link to={`/product/${p.slug}`} className="mt-1 block font-display text-xl leading-tight link-grow">{tr(p, 'title', i18n.language)}</Link>
        <p className="mt-1.5 text-sm">
          <span className={off ? 'font-semibold text-rose' : 'font-semibold'}>{pkr(p.price)}</span>
          {off > 0 && <span className="ms-2 text-muted line-through">{pkr(p.compareAtPrice)}</span>}
        </p>
      </div>
    </article>
  );
}
