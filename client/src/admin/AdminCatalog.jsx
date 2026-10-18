import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import { Button, EmptyState, Field, Img, Modal, Skeleton } from '../components/ui.jsx';
import { useAsync, useDebounce } from '../hooks/index.js';
import { adminService, catalogService } from '../services/index.js';
import { pkr, totalStock } from '../utils/format.js';
import { PageHead, Rows, Table } from './common.jsx';

const CSV_TEMPLATE = `title,category,price,compareAtPrice,sku,size,colour,stock,images,description,tags,attributes
Laila Lawn Kurta,women,5490,6490,LAILA-IVO-S,S,Ivory,10,https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900,Printed lawn kurta,new|lawn,fabric=Lawn;pieces=1 Piece
Laila Lawn Kurta,women,5490,6490,LAILA-IVO-M,M,Ivory,8,,,,
`;

function CsvImport({ onDone }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const run = async () => {
    setBusy(true);
    try {
      const r = await adminService.importCsv(file, await file.text());
      setResult(r);
      toast.success(`Imported: ${r.created} new, ${r.updated} updated`);
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }));
    a.download = 'fashionist-products-template.csv';
    a.click();
  };
  return (
    <>
      <button onClick={() => (setOpen(true), setResult(null))} className="btn-outline px-5 py-3"><Upload className="h-4 w-4" /> Bulk CSV</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Bulk product import">
        <p className="text-sm text-muted">One row per variant. Rows with the same title are grouped into one product. Images and tags use “|”, attributes use “key=value;key=value”.</p>
        <button onClick={download} className="mt-3 inline-flex items-center gap-2 text-xs underline"><Download className="h-3 w-3" /> Download template</button>
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files[0])} className="mt-6 block w-full text-sm file:me-4 file:border-0 file:bg-fg file:px-4 file:py-2 file:text-bg" />
        <Button className="mt-6 w-full" loading={busy} disabled={!file} onClick={run}>Import</Button>
        {result?.errors?.length > 0 && (
          <ul className="mt-6 max-h-40 space-y-1 overflow-auto bg-blush p-3 text-xs text-rose-deep">{result.errors.map((e, i) => <li key={i}>Line {e.line}: {e.message}</li>)}</ul>
        )}
      </Modal>
    </>
  );
}

export function Products() {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { data, loading, reload } = useAsync(() => adminService.products(dq), [dq]);
  const archive = async (p) => {
    if (!confirm(`Archive “${p.title}”? It will be hidden from the store.`)) return;
    await adminService.archiveProduct(p._id);
    toast.success('Product archived');
    reload();
  };
  return (
    <>
      <PageHead title="Products" sub={data && `${data.products.length} products`} action={<div className="flex gap-2"><CsvImport onDone={reload} /><Link to="/admin/products/new" className="btn-primary px-5 py-3"><Plus className="h-4 w-4" /> Add product</Link></div>} />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or exact SKU…" className="input mb-4 max-w-sm" />
      <Table head={['Product', 'Category', 'Price', 'Stock', 'Status', '']}>
        {loading ? <Rows cols={6} /> : data.products.map((p) => (
          <tr key={p._id} className={p.isActive ? '' : 'opacity-50'}>
            <td className="px-4 py-3"><Link to={`/admin/products/${p._id}`} className="flex items-center gap-3"><Img src={p.images[0]} alt="" className="h-14 w-11 shrink-0" /><span className="font-medium hover:underline">{p.title}</span></Link></td>
            <td className="px-4">{p.category?.name}</td>
            <td className="px-4">{pkr(p.price)}</td>
            <td className="px-4">{totalStock(p)}</td>
            <td className="px-4">{p.isActive ? (p.isFeatured ? 'Featured' : 'Active') : 'Archived'}</td>
            <td className="px-4 text-end">{p.isActive && <button onClick={() => archive(p)} aria-label="Archive" className="text-muted hover:text-rose"><Trash2 className="h-4 w-4" /></button>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

const blank = { title: '', titleUr: '', description: '', descriptionUr: '', category: '', price: '', compareAtPrice: '', images: [''], attributes: { fabric: '' }, variants: [{ sku: '', size: '', colour: '', stock: 0 }], tags: [], sizeGuide: '', isActive: true, isFeatured: false };

export function ProductEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const cats = useAsync(() => catalogService.categories(), []);
  const [p, setP] = useState(id ? null : blank);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (id) adminService.product(id).then((r) => setP({ ...blank, ...r.product, category: r.product.category?._id || r.product.category }));
  }, [id]);
  if (!p) return <Skeleton className="h-96" />;
  const set = (k, v) => setP({ ...p, [k]: v });
  const setVar = (i, k, v) => set('variants', p.variants.map((x, n) => (n === i ? { ...x, [k]: k === 'stock' ? Math.max(0, parseInt(v) || 0) : k === 'sku' ? v.toUpperCase() : v } : x)));
  const attrs = Object.entries(p.attributes || {});
  const save = async () => {
    if (!p.title || !p.category || !(+p.price >= 0) || !p.variants.every((v) => v.sku)) return toast.error('Title, category, price and every variant SKU are required');
    setBusy(true);
    try {
      const body = { ...p, price: +p.price, compareAtPrice: p.compareAtPrice ? +p.compareAtPrice : undefined, images: p.images.filter(Boolean), attributes: Object.fromEntries(attrs.filter(([k]) => k)) };
      await adminService.saveProduct(body);
      toast.success('Product saved');
      nav('/admin/products');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const inp = (k, label, props) => <Field label={label}><input className="input" value={p[k] ?? ''} onChange={(e) => set(k, e.target.value)} {...props} /></Field>;
  return (
    <>
      <PageHead title={id ? 'Edit product' : 'Add product'} action={<Button loading={busy} onClick={save}>Save product</Button>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-4 border border-line bg-bg p-5">
            {inp('title', 'Title')}
            {inp('titleUr', 'Title (Urdu)', { dir: 'rtl' })}
            <Field label="Description"><textarea rows={4} className="input" value={p.description} onChange={(e) => set('description', e.target.value)} /></Field>
            <Field label="Description (Urdu)"><textarea rows={3} dir="rtl" className="input" value={p.descriptionUr} onChange={(e) => set('descriptionUr', e.target.value)} /></Field>
          </section>
          <section className="border border-line bg-bg p-5">
            <div className="mb-4 flex justify-between"><p className="label">Variants (SKU · size · colour · stock)</p><button onClick={() => set('variants', [...p.variants, { sku: '', size: '', colour: '', stock: 0 }])} className="text-xs underline">+ Add variant</button></div>
            <div className="space-y-2">
              {p.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
                  {['sku', 'size', 'colour', 'stock'].map((k) => <input key={k} aria-label={k} placeholder={k} type={k === 'stock' ? 'number' : 'text'} min={0} className="input px-2 py-2" value={v[k]} onChange={(e) => setVar(i, k, e.target.value)} />)}
                  <button aria-label="Remove variant" disabled={p.variants.length === 1} onClick={() => set('variants', p.variants.filter((_, n) => n !== i))} className="px-2 text-muted hover:text-rose disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </section>
          <section className="border border-line bg-bg p-5">
            <div className="mb-4 flex justify-between"><p className="label">Attributes (any key, e.g. fabric, pieces, soldBy=metre)</p><button onClick={() => set('attributes', { ...p.attributes, '': '' })} className="text-xs underline">+ Add</button></div>
            <div className="space-y-2">
              {attrs.map(([k, v], i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <input className="input px-2 py-2" placeholder="key" value={k} onChange={(e) => set('attributes', Object.fromEntries(attrs.map(([a, b], n) => (n === i ? [e.target.value, b] : [a, b]))))} />
                  <input className="input px-2 py-2" placeholder="value" value={v} onChange={(e) => set('attributes', Object.fromEntries(attrs.map(([a, b], n) => (n === i ? [a, e.target.value] : [a, b]))))} />
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="space-y-4 border border-line bg-bg p-5">
            <Field label="Category"><select className="input" value={p.category} onChange={(e) => set('category', e.target.value)}><option value="">Select…</option>{cats.data?.categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select></Field>
            {inp('price', 'Price (PKR)', { type: 'number', min: 0 })}
            {inp('compareAtPrice', 'Compare-at price (PKR)', { type: 'number', min: 0 })}
            <Field label="Tags (comma separated)"><input className="input" value={(p.tags || []).join(', ')} onChange={(e) => set('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} /></Field>
            {inp('sizeGuide', 'Size guide note')}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-rose" checked={p.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active (visible in store)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-rose" checked={p.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} /> Featured</label>
          </section>
          <section className="border border-line bg-bg p-5">
            <p className="label mb-3">Images (URLs)</p>
            <div className="space-y-2">
              {p.images.map((src, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Img src={src} alt="" className="h-12 w-9 shrink-0" />
                  <input className="input px-2 py-2" value={src} onChange={(e) => set('images', p.images.map((x, n) => (n === i ? e.target.value : x)))} placeholder="https://…" />
                </div>
              ))}
            </div>
            <button onClick={() => set('images', [...p.images, ''])} className="mt-3 text-xs underline">+ Add image</button>
          </section>
        </div>
      </div>
    </>
  );
}

function StockCell({ row, onSaved }) {
  const [v, setV] = useState(row.stock);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (+v === row.stock) return;
    setBusy(true);
    try {
      await adminService.setStock(row.sku, parseInt(v) || 0);
      toast.success(`${row.sku} → ${v}`);
      onSaved();
    } catch (e) {
      toast.error(e.message);
      setV(row.stock);
    } finally {
      setBusy(false);
    }
  };
  return <input type="number" min={0} value={v} disabled={busy} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} className="input w-24 px-2 py-1.5" aria-label={`Stock for ${row.sku}`} />;
}

export function Inventory() {
  const [sp, setSp] = useSearchParams();
  const low = sp.get('low') === 'true';
  const { data, loading, reload } = useAsync(() => adminService.inventory(low), [low]);
  return (
    <>
      <PageHead title="Inventory" sub={data && `Low-stock threshold: ${data.lowStockLevel} units`} action={<label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-rose" checked={low} onChange={(e) => setSp(e.target.checked ? { low: 'true' } : {})} /> Low stock only</label>} />
      <Table head={['Product', 'SKU', 'Size', 'Colour', 'Stock', '']}>
        {loading ? <Rows cols={6} /> : data.rows.length === 0 ? <tr><td colSpan={6}><EmptyState title="All stocked up" /></td></tr> : data.rows.map((r) => (
          <tr key={r.sku}>
            <td className="px-4 py-2"><Link to={`/admin/products/${r.productId}`} className="hover:underline">{r.title}</Link></td>
            <td className="px-4 font-mono text-xs">{r.sku}</td>
            <td className="px-4">{r.size}</td>
            <td className="px-4">{r.colour}</td>
            <td className="px-4"><StockCell row={r} onSaved={reload} /></td>
            <td className="px-4">{r.stock === 0 ? <span className="label bg-blush px-2 py-1 text-[10px] text-rose-deep">Out</span> : r.low && <span className="label bg-sand px-2 py-1 text-[10px] text-ink">Low</span>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}

export function Categories() {
  const { data, loading, reload } = useAsync(() => catalogService.categories(), []);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef();
  const save = async () => {
    setBusy(true);
    try {
      await adminService.saveCategory({ ...edit, sortOrder: +edit.sortOrder || 0 });
      toast.success('Category saved');
      setEdit(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const del = async (c) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await adminService.deleteCategory(c._id);
      toast.success('Deleted');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <>
      <PageHead title="Categories" action={<button onClick={() => setEdit({ name: '', nameUr: '', slug: '', image: '', sortOrder: 0, isActive: true })} className="btn-primary px-5 py-3"><Plus className="h-4 w-4" /> Add category</button>} />
      <Table head={['Image', 'Name', 'Urdu', 'Slug', 'Order', '']}>
        {loading ? <Rows cols={6} /> : data.categories.map((c) => (
          <tr key={c._id}>
            <td className="px-4 py-2"><Img src={c.image} alt="" className="h-12 w-10" /></td>
            <td className="px-4 font-medium">{c.name}</td>
            <td className="px-4 font-ur">{c.nameUr}</td>
            <td className="px-4 text-muted">{c.slug}</td>
            <td className="px-4">{c.sortOrder}</td>
            <td className="space-x-3 px-4 text-end text-xs underline"><button onClick={() => setEdit(c)}>Edit</button><button onClick={() => del(c)} className="text-rose">Delete</button></td>
          </tr>
        ))}
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Category">
        {edit && (
          <div ref={ref} className="space-y-4">
            {[['name', 'Name'], ['nameUr', 'Name (Urdu)'], ['slug', 'Slug (auto if empty)'], ['image', 'Image URL'], ['sortOrder', 'Sort order']].map(([k, l]) => (
              <Field key={k} label={l}><input className="input" value={edit[k] ?? ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></Field>
            ))}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-rose" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Active</label>
            <Button className="w-full" loading={busy} onClick={save}>Save</Button>
          </div>
        )}
      </Modal>
    </>
  );
}
