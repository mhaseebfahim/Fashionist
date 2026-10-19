import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Plus, Star, Trash2, Upload, Wand2 } from 'lucide-react';
import { Button, Field, Img, Skeleton } from '../components/ui.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useAsync, useDebounce } from '../hooks/index.js';
import { adminService } from '../services/index.js';
import { pkr, totalStock } from '../utils/format.js';
import { slugify } from '../services/mock/seedData.js';
import { Badge, Card, Empty, Grip, MediaPicker, PageHead, Rows, Table, Tabs, Toggle, downloadText, useDragList } from './common.jsx';

/* ======================= Product list ======================= */
export default function Products() {
  const [f, setF] = useState({ q: '', category: '', status: '', stock: '' });
  const dq = useDebounce(f.q);
  const cats = useAsync(() => adminService.categories(), []);
  const { data, loading, reload, setData } = useAsync(() => adminService.products({ ...f, q: dq || undefined, category: f.category || undefined, status: f.status || undefined, stock: f.stock || undefined }), [dq, f.category, f.status, f.stock]);
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  const [moveTo, setMoveTo] = useState('');
  const products = data?.products || [];
  const allOn = products.length > 0 && sel.length === products.length;

  const toggleActive = async (p) => {
    setData({ products: products.map((x) => (x._id === p._id ? { ...x, isActive: !p.isActive } : x)) });
    try {
      await adminService.patchProduct(p._id, { isActive: !p.isActive });
      toast.success(p.isActive ? 'Hidden from store' : 'Now live');
    } catch (e) {
      toast.error(e.message);
      reload();
    }
  };
  const bulk = async (action) => {
    if (action === 'delete' && !confirm(`Delete ${sel.length} product(s) permanently? Order history keeps its snapshots.`)) return;
    if (action === 'category' && !moveTo) return toast.error('Choose a category first');
    setBusy(true);
    try {
      const r = await adminService.bulkProducts({ ids: sel, action, category: moveTo || undefined });
      toast.success(`${r.modified} product(s) updated`);
      setSel([]);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead title="Products" sub={data && `${products.length} products`} action={<><Link to="/admin/import" className="btn-outline px-4 py-2.5"><Upload className="h-4 w-4" /> Bulk import</Link><Link to="/admin/products/new" className="btn-primary px-4 py-2.5"><Plus className="h-4 w-4" /> Add product</Link></>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search title or SKU…" className="input max-w-xs bg-white" aria-label="Search products" />
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="input w-auto bg-white" aria-label="Category"><option value="">All categories</option>{cats.data?.categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="input w-auto bg-white" aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="hidden">Hidden</option></select>
        <select value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} className="input w-auto bg-white" aria-label="Stock"><option value="">Any stock</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
      </div>
      {sel.length > 0 && (
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 border border-ink bg-ink px-4 py-2.5 text-sm text-ivory">
          <span className="me-2">{sel.length} selected</span>
          <button disabled={busy} onClick={() => bulk('activate')} className="border border-ivory/40 px-3 py-1 hover:bg-ivory hover:text-ink">Activate</button>
          <button disabled={busy} onClick={() => bulk('hide')} className="border border-ivory/40 px-3 py-1 hover:bg-ivory hover:text-ink">Hide</button>
          <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="bg-ink px-2 py-1 text-ivory" aria-label="Move to category"><option value="">Move to category…</option>{cats.data?.categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
          <button disabled={busy} onClick={() => bulk('category')} className="border border-ivory/40 px-3 py-1 hover:bg-ivory hover:text-ink">Apply</button>
          <button disabled={busy} onClick={() => bulk('delete')} className="ms-auto bg-rose px-3 py-1">Delete</button>
        </div>
      )}
      <Table head={[<input key="all" type="checkbox" aria-label="Select all" className="accent-rose" checked={allOn} onChange={() => setSel(allOn ? [] : products.map((p) => p._id))} />, 'Product', 'Category', 'Price', 'Stock', 'Live', '']} empty={!loading && !products.length && <Empty text="No products match" />}>
        {loading ? <Rows cols={7} /> : products.map((p) => {
          const stock = totalStock(p);
          return (
            <tr key={p._id} className="hover:bg-ivory/60">
              <td className="w-10 px-4"><input type="checkbox" aria-label={`Select ${p.title}`} className="accent-rose" checked={sel.includes(p._id)} onChange={() => setSel((s) => (s.includes(p._id) ? s.filter((x) => x !== p._id) : [...s, p._id]))} /></td>
              <td className="px-4 py-2.5">
                <Link to={`/admin/products/${p._id}`} className="flex items-center gap-3">
                  <Img src={p.images[0]} alt="" w={44} h={58} className="h-14 w-11 shrink-0" />
                  <span><span className="font-medium hover:underline">{p.title}</span>{p.isFeatured && <Star className="ms-1.5 inline h-3 w-3 fill-gold text-gold" />}<span className="block text-xs text-stone">{p.variants.length} variants</span></span>
                </Link>
              </td>
              <td className="px-4">{p.category?.name}</td>
              <td className="px-4">{pkr(p.price)}{p.compareAtPrice > p.price && <span className="ms-1 text-xs text-stone line-through">{pkr(p.compareAtPrice)}</span>}</td>
              <td className={`px-4 ${stock === 0 ? 'font-semibold text-rose' : ''}`}>{stock}</td>
              <td className="px-4"><Toggle checked={p.isActive} onChange={() => toggleActive(p)} label={`${p.title} visible`} /></td>
              <td className="px-4 text-end"><Link to={`/admin/products/${p._id}`} className="text-xs underline">Edit</Link></td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}

/* ======================= Product editor ======================= */
const blank = { title: '', titleUr: '', description: '', descriptionUr: '', category: '', price: '', compareAtPrice: '', images: [], attributes: {}, variants: [], tags: [], sizeGuide: '', slug: '', seo: { metaTitle: '', metaDescription: '' }, isActive: true, isFeatured: false };
const PRESET_SIZES = { Women: 'XS, S, M, L, XL', Men: 'S, M, L, XL', Kids: '2Y, 4Y, 6Y, 8Y, 10Y', Footwear: '36, 37, 38, 39, 40', Fabric: '1 metre', 'One size': 'One Size' };
const skuFor = (slug, colour, size) => `${(slug || 'FN').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'FN'}-${String(colour || 'X').slice(0, 3).toUpperCase()}-${String(size || 'OS').replace(/\s+/g, '').toUpperCase()}`;

export function ProductEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const cats = useAsync(() => adminService.categories(), []);
  const [p, setP] = useState(id ? null : blank);
  const [tab, setTab] = useState('basics');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [picker, setPicker] = useState(false);
  const [drag, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [grid, setGrid] = useState({ sizes: 'XS, S, M, L, XL', colours: 'Ivory, Rose', stock: 5 });
  const [slugTouched, setSlugTouched] = useState(!!id);
  useEffect(() => {
    if (id) adminService.product(id).then((r) => setP({ ...blank, ...r.product, seo: { ...blank.seo, ...(r.product.seo || {}) }, category: r.product.category?._id || r.product.category })).catch((e) => toast.error(e.message));
  }, [id]);
  const imgDrag = useDragList(p?.images || [], (images) => setP((x) => ({ ...x, images })));
  const preview = useMemo(() => p && { ...p, _id: p._id || 'preview', slug: p.slug || 'preview', price: +p.price || 0, compareAtPrice: +p.compareAtPrice || 0, images: p.images.length ? p.images : [''], variants: p.variants.length ? p.variants : [{ sku: 'X', size: 'M', colour: 'Ivory', stock: 1 }], category: cats.data?.categories.find((c) => c._id === p.category) || { name: 'Category' }, tags: p._id ? p.tags : [...(p.tags || []), 'new'] }, [p, cats.data]);
  if (!p) return <Skeleton className="h-[70vh]" />;

  const set = (k, v) => setP((x) => ({ ...x, [k]: v, ...(k === 'title' && !slugTouched && { slug: slugify(v) }) }));
  const attrs = Object.entries(p.attributes || {});
  const setAttrs = (list) => set('attributes', Object.fromEntries(list));
  const setVar = (i, k, v) => set('variants', p.variants.map((x, n) => (n === i ? { ...x, [k]: k === 'stock' ? Math.max(0, parseInt(v) || 0) : k === 'sku' ? v.toUpperCase().replace(/[^A-Z0-9-]/g, '') : v } : x)));
  const generate = () => {
    const sizes = grid.sizes.split(',').map((s) => s.trim()).filter(Boolean);
    const colours = grid.colours.split(',').map((s) => s.trim()).filter(Boolean);
    if (!sizes.length || !colours.length) return toast.error('Enter at least one size and one colour');
    const existing = new Map(p.variants.map((v) => [`${v.colour}|${v.size}`, v]));
    const variants = colours.flatMap((c) => sizes.map((s) => existing.get(`${c}|${s}`) || { sku: skuFor(p.slug || slugify(p.title), c, s), size: s, colour: c, stock: +grid.stock || 0 }));
    set('variants', variants);
    toast.success(`${variants.length} variants (${colours.length} colours × ${sizes.length} sizes)`);
  };
  const upload = async (files) => {
    const ok = [...files].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) && f.size <= 5 * 1024 * 1024);
    if (ok.length < files.length) toast.error('Only JPG, PNG or WEBP up to 5 MB');
    if (!ok.length) return;
    setUploading(true);
    try {
      const r = await adminService.uploadMedia(ok, 'products');
      setP((x) => ({ ...x, images: [...x.images, ...r.media.map((m) => m.url)] }));
      toast.success(`${r.media.length} image(s) added`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };
  const validate = () => {
    const e = {};
    if (p.title.trim().length < 2) e.title = 'Title is required';
    if (!p.category) e.category = 'Choose a category';
    if (!(+p.price >= 0) || p.price === '') e.price = 'Enter a price';
    if (p.compareAtPrice && +p.compareAtPrice < +p.price) e.compareAtPrice = 'Compare-at price should be higher than price';
    if (!p.variants.length) e.variants = 'Add at least one variant';
    if (p.variants.some((v) => !v.sku)) e.variants = 'Every variant needs a SKU';
    if (new Set(p.variants.map((v) => v.sku)).size !== p.variants.length) e.variants = 'SKUs must be unique';
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) setTab(first === 'variants' ? 'variants' : 'basics');
    return !first;
  };
  const save = async () => {
    if (!validate()) return toast.error('Please fix the highlighted fields');
    setBusy(true);
    try {
      const body = { ...p, price: +p.price, compareAtPrice: p.compareAtPrice ? +p.compareAtPrice : null, attributes: Object.fromEntries(attrs.filter(([k, v]) => k.trim() && String(v).trim())) };
      ['rating', 'numReviews', 'soldCount', 'createdAt', 'updatedAt', '__v'].forEach((k) => delete body[k]);
      const r = await adminService.saveProduct(body);
      toast.success('Product saved');
      if (!id) nav(`/admin/products/${r.product._id}`, { replace: true });
      else setP({ ...p, ...r.product, category: p.category });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!confirm('Delete this product permanently?')) return;
    await adminService.deleteProduct(id);
    toast.success('Deleted');
    nav('/admin/products');
  };
  const inp = (k, label, props = {}) => (
    <Field label={label} error={errors[k]}>
      <input className={`input bg-white ${errors[k] ? 'input-error' : ''}`} value={p[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...props} />
    </Field>
  );

  return (
    <>
      <PageHead
        title={id ? p.title || 'Edit product' : 'New product'}
        sub={id ? <Link className="underline" to={`/product/${p.slug}`} target="_blank">View on store</Link> : 'Fill in the basics, add photos and generate variants.'}
        action={<>{id && <button onClick={del} className="btn-outline px-4 py-2.5 text-rose"><Trash2 className="h-4 w-4" /></button>}<Button loading={busy} onClick={save} className="px-6 py-2.5">Save product</Button></>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div>
          <Tabs value={tab} onChange={setTab} tabs={[['basics', 'Basics'], ['media', 'Media', p.images.length], ['attributes', 'Attributes', attrs.length], ['variants', 'Variants', p.variants.length], ['seo', 'SEO']]} />

          {tab === 'basics' && (
            <Card>
              <div className="grid gap-4 md:grid-cols-2">
                {inp('title', 'Title (English)')}
                <Field label="Title (Urdu)"><input dir="rtl" className="input bg-white font-urdu" value={p.titleUr || ''} onChange={(e) => set('titleUr', e.target.value)} /></Field>
                <Field label="Description (English)"><textarea rows={5} className="input bg-white" value={p.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
                <Field label="Description (Urdu)"><textarea rows={5} dir="rtl" className="input bg-white font-urdu" value={p.descriptionUr || ''} onChange={(e) => set('descriptionUr', e.target.value)} /></Field>
                <Field label="Category" error={errors.category}>
                  <select className={`input bg-white ${errors.category ? 'input-error' : ''}`} value={p.category} onChange={(e) => set('category', e.target.value)}>
                    <option value="">Select…</option>
                    {cats.data?.categories.filter((c) => !c.parent).map((c) => [
                      <option key={c._id} value={c._id}>{c.name}</option>,
                      ...cats.data.categories.filter((s) => s.parent === c._id).map((s) => <option key={s._id} value={s._id}>— {s.name}</option>),
                    ])}
                  </select>
                </Field>
                <Field label="Tags (comma separated)"><input className="input bg-white" value={(p.tags || []).join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
                {inp('price', 'Price (PKR)', { type: 'number', min: 0, inputMode: 'numeric' })}
                {inp('compareAtPrice', 'Compare-at price (PKR)', { type: 'number', min: 0, inputMode: 'numeric' })}
                {inp('sizeGuide', 'Size guide note')}
                <div className="flex flex-col justify-end gap-3 pb-1 text-sm">
                  <label className="flex items-center gap-3"><Toggle checked={p.isActive} onChange={(v) => set('isActive', v)} label="Active" /> Visible in store</label>
                  <label className="flex items-center gap-3"><Toggle checked={p.isFeatured} onChange={(v) => set('isFeatured', v)} label="Featured" /> Featured (homepage rails)</label>
                </div>
              </div>
            </Card>
          )}

          {tab === 'media' && (
            <Card title="Images — drag to reorder; the first image is the cover">
              <label onDragOver={(e) => (e.preventDefault(), setDragOver(true))} onDragLeave={() => setDragOver(false)} onDrop={(e) => (e.preventDefault(), setDragOver(false), e.dataTransfer.files.length && upload(e.dataTransfer.files))} className={`mb-5 flex cursor-pointer flex-col items-center border border-dashed py-10 text-sm ${drag ? 'border-rose bg-blush/40' : 'border-hairline hover:border-ink'}`}>
                <Upload className="h-5 w-5 text-stone" />
                <span className="mt-2">{uploading ? 'Uploading…' : <>Drop photos here or <u>browse</u></>}</span>
                <span className="text-xs text-stone">JPG / PNG / WEBP · max 5 MB · stored on Cloudinary</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files)} />
              </label>
              <button onClick={() => setPicker(true)} className="mb-5 text-sm underline">…or choose from the Media Library</button>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {p.images.map((src, i) => {
                  const d = imgDrag(i);
                  return (
                    <li key={src + i} {...d} className={`group relative border border-hairline bg-white ${d.className}`}>
                      <Img src={src} alt="" w={160} h={210} className="aspect-[3/4]" />
                      {i === 0 && <span className="label absolute start-1.5 top-1.5 bg-ink px-1.5 py-0.5 text-[9px] text-ivory">Cover</span>}
                      <div className="flex items-center justify-between px-2 py-1.5 text-[11px]">
                        <Grip />
                        {i > 0 && <button onClick={() => set('images', [src, ...p.images.filter((_, n) => n !== i)])} className="underline">Set cover</button>}
                        <button onClick={() => set('images', p.images.filter((_, n) => n !== i))} aria-label="Remove image" className="text-rose"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <MediaPicker multiple open={picker} onClose={() => setPicker(false)} onPick={(urls) => set('images', [...p.images, ...[].concat(urls)])} />
            </Card>
          )}

          {tab === 'attributes' && (
            <Card title="Attributes — any name / value" action={<button onClick={() => setAttrs([...attrs, ['', '']])} className="text-xs underline">+ Add attribute</button>}>
              <p className="mb-4 text-xs text-stone">Examples: fabric = Lawn · pieces = 3 Piece · dupatta = Chiffon · soldBy = metre. Filterable keys on the store: fabric, pieces, dupatta, soldBy, fit, work, material, age.</p>
              <div className="space-y-2">
                {attrs.map(([k, v], i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input className="input bg-white" placeholder="name (e.g. fabric)" aria-label="Attribute name" value={k} onChange={(e) => setAttrs(attrs.map((a, n) => (n === i ? [e.target.value.replace(/[^a-zA-Z0-9]/g, ''), a[1]] : a)))} />
                    <input className="input bg-white" placeholder="value (e.g. Lawn)" aria-label="Attribute value" value={v} onChange={(e) => setAttrs(attrs.map((a, n) => (n === i ? [a[0], e.target.value] : a)))} />
                    <button onClick={() => setAttrs(attrs.filter((_, n) => n !== i))} aria-label="Remove attribute" className="px-2 text-stone hover:text-rose"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {!attrs.length && <p className="text-sm text-stone">No attributes yet.</p>}
              </div>
            </Card>
          )}

          {tab === 'variants' && (
            <div className="space-y-6">
              <Card title="Generate size × colour grid">
                <div className="grid gap-3 md:grid-cols-[2fr_2fr_100px_auto]">
                  <Field label="Sizes" hint={<span className="flex flex-wrap gap-2">{Object.entries(PRESET_SIZES).map(([k, v]) => <button key={k} type="button" className="underline" onClick={() => setGrid({ ...grid, sizes: v })}>{k}</button>)}</span>}>
                    <input className="input bg-white" value={grid.sizes} onChange={(e) => setGrid({ ...grid, sizes: e.target.value })} />
                  </Field>
                  <Field label="Colours"><input className="input bg-white" value={grid.colours} onChange={(e) => setGrid({ ...grid, colours: e.target.value })} /></Field>
                  <Field label="Stock each"><input type="number" min={0} className="input bg-white" value={grid.stock} onChange={(e) => setGrid({ ...grid, stock: e.target.value })} /></Field>
                  <div className="flex items-start pt-6"><Button variant="ink" className="px-4 py-3" onClick={generate}><Wand2 className="h-4 w-4" /> Generate</Button></div>
                </div>
              </Card>
              <Card title="Variants" action={<button onClick={() => set('variants', [...p.variants, { sku: '', size: '', colour: '', stock: 0 }])} className="text-xs underline">+ Add row</button>}>
                {errors.variants && <p className="mb-3 text-sm text-rose">{errors.variants}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead><tr>{['SKU', 'Size', 'Colour', 'Stock', ''].map((h) => <th key={h} className="label pb-2 text-start text-[10px] text-stone">{h}</th>)}</tr></thead>
                    <tbody>
                      {p.variants.map((v, i) => (
                        <tr key={i}>
                          {['sku', 'size', 'colour', 'stock'].map((k) => (
                            <td key={k} className="py-1 pe-2"><input aria-label={`${k} ${i + 1}`} type={k === 'stock' ? 'number' : 'text'} min={0} className={`input bg-white px-2 py-2 ${k === 'sku' ? 'font-mono text-xs' : ''} ${k === 'stock' && v.stock <= 5 ? 'border-gold' : ''}`} value={v[k]} onChange={(e) => setVar(i, k, e.target.value)} /></td>
                          ))}
                          <td><button aria-label="Remove variant" onClick={() => set('variants', p.variants.filter((_, n) => n !== i))} className="px-2 text-stone hover:text-rose"><Trash2 className="h-4 w-4" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!p.variants.length && <p className="py-6 text-center text-sm text-stone">Use “Generate” above or add rows manually.</p>}
                </div>
                <p className="mt-3 text-xs text-stone">Total stock: <b>{p.variants.reduce((s, v) => s + (+v.stock || 0), 0)}</b></p>
              </Card>
            </div>
          )}

          {tab === 'seo' && (
            <Card>
              <div className="space-y-4">
                <Field label="URL slug" hint={`fashionist.store/product/${p.slug || '…'}`}><input className="input bg-white font-mono text-sm" value={p.slug} onChange={(e) => (setSlugTouched(true), set('slug', slugify(e.target.value)))} /></Field>
                <Field label={`Meta title (${(p.seo.metaTitle || '').length}/70)`}><input maxLength={70} className="input bg-white" value={p.seo.metaTitle || ''} placeholder={`${p.title} | Fashionist`} onChange={(e) => set('seo', { ...p.seo, metaTitle: e.target.value })} /></Field>
                <Field label={`Meta description (${(p.seo.metaDescription || '').length}/170)`}><textarea maxLength={170} rows={3} className="input bg-white" value={p.seo.metaDescription || ''} onChange={(e) => set('seo', { ...p.seo, metaDescription: e.target.value })} /></Field>
                <div className="border border-hairline bg-ivory p-4 text-sm">
                  <p className="label mb-2 text-[9px] text-stone">Search preview</p>
                  <p className="text-[#1a0dab]">{p.seo.metaTitle || `${p.title || 'Product'} | Fashionist`}</p>
                  <p className="text-xs text-[#006621]">fashionist.store/product/{p.slug}</p>
                  <p className="text-xs text-stone">{p.seo.metaDescription || p.description?.slice(0, 160)}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <p className="label mb-3 text-[10px] text-stone">Live preview</p>
            <div className="pointer-events-none border border-hairline bg-ivory p-4">{preview && <ProductCard product={preview} />}</div>
          </div>
        </aside>
      </div>
    </>
  );
}

/* ======================= Bulk CSV import ======================= */
const TEMPLATE = `title,titleUr,category,price,compareAtPrice,sku,size,colour,stock,images,description,tags,attributes
Laila Lawn Kurta,لیلیٰ لان کرتا,lawn,5490,6490,LAILA-IVO-S,S,Ivory,10,https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900,Printed lawn kurta,new|lawn,fabric=Lawn;pieces=1 Piece
Laila Lawn Kurta,,lawn,5490,6490,LAILA-IVO-M,M,Ivory,8,,,,
Raw Silk Metre,,unstitched,2490,,RSM-GOL-1M,1 metre,Gold,40,,Pure raw silk,unstitched,fabric=Raw Silk;soldBy=metre
`;

export function BulkImport() {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = async (file) => {
    if (!file) return;
    if (file.size > 900 * 1024) return toast.error('CSV must be under 900 KB — split it into parts');
    const t = await file.text();
    setText(t);
    setName(file.name);
    setResult(null);
    setBusy(true);
    try {
      setPreview(await adminService.importPreview(t));
    } catch (e) {
      toast.error(e.message);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };
  const run = async () => {
    setBusy(true);
    try {
      const r = await adminService.importCsv(text);
      setResult(r);
      toast.success(`Imported: ${r.created} new, ${r.updated} updated`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const cols = ['title', 'category', 'price', 'sku', 'size', 'colour', 'stock'];
  return (
    <>
      <PageHead title="Bulk Import" sub="One row per variant. Rows with the same title become one product." action={<button onClick={() => downloadText('fashionist-products-template.csv', TEMPLATE)} className="btn-outline px-4 py-2.5"><Download className="h-4 w-4" /> Template</button>} />
      <Card>
        <label className="flex cursor-pointer flex-col items-center border border-dashed border-hairline py-10 text-sm hover:border-ink" onDragOver={(e) => e.preventDefault()} onDrop={(e) => (e.preventDefault(), load(e.dataTransfer.files[0]))}>
          <Upload className="h-5 w-5 text-stone" />
          <span className="mt-2">{name || <>Drop a CSV here or <u>browse</u></>}</span>
          <span className="text-xs text-stone">Columns: title, titleUr, category (slug), price, compareAtPrice, sku, size, colour, stock, images (a|b), description, tags (a|b), attributes (k=v;k=v)</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => load(e.target.files[0])} />
        </label>
      </Card>
      {preview && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Badge s="Approved">{preview.valid} valid</Badge>
            {preview.invalid > 0 && <Badge s="Rejected">{preview.invalid} with errors</Badge>}
            <Button className="ms-auto px-5 py-2.5" loading={busy} disabled={!preview.valid} onClick={run}>Import {preview.valid} valid row(s)</Button>
          </div>
          <Table head={['Line', ...cols, 'Status']}>
            {preview.rows.map((r) => (
              <tr key={r.line} className={r.errors.length ? 'bg-blush/40' : ''}>
                <td className="px-4 py-2 text-stone">{r.line}</td>
                {cols.map((c) => <td key={c} className="max-w-48 truncate px-4 font-mono text-xs">{c === 'category' ? r.data.category ? '✓' : '—' : r.data[c]}</td>)}
                <td className="px-4 text-xs">{r.errors.length ? <span className="text-rose-deep">{r.errors.join('; ')}</span> : <span className="text-stone">OK</span>}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
      {result && (
        <Card title="Import result" className="mt-6">
          <p className="text-sm">Created <b>{result.created}</b> · updated <b>{result.updated}</b> · skipped <b>{result.skipped}</b> row(s).</p>
          {result.errors.length > 0 && <ul className="mt-3 max-h-48 space-y-1 overflow-auto bg-blush/50 p-3 text-xs text-rose-deep">{result.errors.map((e, i) => <li key={i}>Line {e.line}: {e.message}</li>)}</ul>}
          <Link to="/admin/products" className="mt-4 inline-block text-sm underline">Go to products →</Link>
        </Card>
      )}
    </>
  );
}
