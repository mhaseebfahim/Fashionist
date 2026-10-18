// Schema-driven form used by every CMS editor. A schema is an array of field descriptors:
// { key, label, type, show?(obj), options?, fields? | fields(item)?, newItem?, itemLabel?(item) }
import { useState } from 'react';
import { ChevronDown, Copy, Plus, Trash2, X } from 'lucide-react';
import { Field, Img } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/index.js';
import { adminService } from '../../services/index.js';
import { Grip, ImageField, MediaPicker, ProductPicker, Toggle, useDragList } from '../common.jsx';

const inputCls = 'input bg-white px-3 py-2';

function Bilingual({ f, obj, set, area }) {
  const C = area ? 'textarea' : 'input';
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label={`${f.label} · EN`}><C rows={area ? 3 : undefined} className={inputCls} value={obj[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} /></Field>
      <Field label={`${f.label} · اردو`}><C rows={area ? 3 : undefined} dir="rtl" className={`${inputCls} font-urdu`} value={obj[`${f.key}Ur`] ?? ''} onChange={(e) => set(`${f.key}Ur`, e.target.value)} /></Field>
    </div>
  );
}

function CategorySelect({ value, onChange, multiple }) {
  const { data } = useAsync(() => adminService.categories(), []);
  const cats = data?.categories || [];
  if (!multiple)
    return (
      <select className={inputCls} value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {cats.map((c) => <option key={c._id} value={c.slug}>{c.parent ? '— ' : ''}{c.name}</option>)}
      </select>
    );
  const list = value || [];
  return (
    <div className="flex flex-wrap gap-1.5">
      {cats.map((c) => {
        const on = list.includes(c.slug);
        return <button type="button" key={c._id} onClick={() => onChange(on ? list.filter((x) => x !== c.slug) : [...list, c.slug])} className={`chip ${on ? 'chip-active' : 'bg-white'}`}>{c.name}</button>;
      })}
    </div>
  );
}

function ProductsField({ value, onChange, single }) {
  const [open, setOpen] = useState(false);
  const ids = single ? (value?.productId ? [value.productId] : []) : value || [];
  const { data } = useAsync(() => (ids.length ? adminService.products({}) : Promise.resolve({ products: [] })), [ids.join(',')]);
  const byId = Object.fromEntries((data?.products || []).map((p) => [p._id, p]));
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <span key={id} className="flex items-center gap-2 border border-hairline bg-white py-1 pe-2 ps-1 text-xs">
            <Img src={byId[id]?.images?.[0]} alt="" w={24} h={32} className="h-8 w-6" />
            {byId[id]?.title || 'Product'}
            <button type="button" aria-label="Remove" onClick={() => onChange(single ? { productId: '', productSlug: '' } : ids.filter((x) => x !== id))}><X className="h-3 w-3" /></button>
          </span>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="border border-dashed border-hairline px-3 py-1.5 text-xs hover:border-ink">{single ? (ids.length ? 'Change product' : 'Choose product') : '+ Choose products'}</button>
      </div>
      <ProductPicker open={open} onClose={() => setOpen(false)} multiple={!single} selected={ids} onPick={(v) => onChange(single ? { productId: v._id, productSlug: v.slug } : v)} />
    </div>
  );
}

function ImagesField({ value = [], onChange }) {
  const [open, setOpen] = useState(false);
  const drag = useDragList(value, onChange);
  return (
    <div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {value.map((src, i) => {
          const d = drag(i);
          return (
            <li key={src + i} {...d} className={`relative border border-hairline bg-white ${d.className}`}>
              <Img src={src} alt="" w={100} h={100} className="aspect-square" />
              <button type="button" aria-label="Remove image" onClick={() => onChange(value.filter((_, n) => n !== i))} className="absolute end-1 top-1 grid h-5 w-5 place-items-center bg-white/90"><X className="h-3 w-3" /></button>
            </li>
          );
        })}
        <li><button type="button" onClick={() => setOpen(true)} className="grid aspect-square w-full place-items-center border border-dashed border-hairline text-stone hover:border-ink" aria-label="Add images"><Plus className="h-4 w-4" /></button></li>
      </ul>
      <MediaPicker multiple open={open} onClose={() => setOpen(false)} onPick={(urls) => onChange([...value, ...[].concat(urls)])} />
    </div>
  );
}

/** Click on the image to drop a hotspot; each hotspot links to a product. */
function HotspotEditor({ image, value = [], onChange }) {
  const [active, setActive] = useState(null);
  const add = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 100);
    const y = Math.round(((e.clientY - r.top) / r.height) * 100);
    onChange([...value, { x, y, productId: '', productSlug: '' }]);
    setActive(value.length);
  };
  if (!image) return <p className="text-xs text-stone">Choose the look image first, then click on it to place hotspots.</p>;
  return (
    <div>
      <div className="relative cursor-crosshair select-none" onClick={add} role="button" tabIndex={0} aria-label="Click to add a hotspot">
        <Img src={image} alt="" w={600} h={340} className="aspect-[16/9] w-full" />
        {value.map((h, i) => (
          <span key={i} style={{ left: `${h.x}%`, top: `${h.y}%` }} onClick={(e) => (e.stopPropagation(), setActive(i))} className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xs font-bold shadow ${active === i ? 'bg-rose text-white' : 'bg-white text-ink'}`}>{i + 1}</span>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-stone">Click the image to add a hotspot. Click a number to select it.</p>
      <ul className="mt-3 space-y-2">
        {value.map((h, i) => (
          <li key={i} className={`flex flex-wrap items-center gap-2 border p-2 text-xs ${active === i ? 'border-rose' : 'border-hairline'} bg-white`}>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-ivory">{i + 1}</span>
            <span className="text-stone">x {h.x}% · y {h.y}%</span>
            <div className="flex-1"><ProductsField single value={h} onChange={(p) => onChange(value.map((x, n) => (n === i ? { ...x, ...p } : x)))} /></div>
            <button type="button" aria-label="Remove hotspot" onClick={() => onChange(value.filter((_, n) => n !== i))} className="text-stone hover:text-rose"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListField({ f, value = [], onChange, root }) {
  const [open, setOpen] = useState(value.length <= 3 ? value.map((_, i) => i) : []);
  const drag = useDragList(value, onChange);
  const fieldsFor = (item) => (typeof f.fields === 'function' ? f.fields(item) : f.fields);
  const add = () => (onChange([...value, typeof f.newItem === 'function' ? f.newItem() : structuredClone(f.newItem || {})]), setOpen((o) => [...o, value.length]));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="label text-[10px] text-stone">{f.label} ({value.length})</span>
        {(!f.max || value.length < f.max) && <button type="button" onClick={add} className="text-xs underline">+ Add {f.itemName || 'item'}</button>}
      </div>
      <ul className="space-y-2">
        {value.map((item, i) => {
          const d = drag(i);
          const expanded = open.includes(i);
          return (
            <li key={i} {...d} className={`border border-hairline bg-ivory/50 ${d.className}`}>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Grip />
                <button type="button" className="flex flex-1 items-center gap-2 text-start text-sm" onClick={() => setOpen((o) => (expanded ? o.filter((x) => x !== i) : [...o, i]))} aria-expanded={expanded}>
                  <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} />
                  <span className="truncate">{f.itemLabel?.(item, i) || `${f.itemName || 'Item'} ${i + 1}`}</span>
                </button>
                <button type="button" aria-label="Duplicate" onClick={() => onChange([...value.slice(0, i + 1), structuredClone(item), ...value.slice(i + 1)])} className="text-stone hover:text-ink"><Copy className="h-3.5 w-3.5" /></button>
                <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, n) => n !== i))} className="text-stone hover:text-rose"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
              {expanded && (
                <div className="border-t border-hairline bg-white p-3" draggable={false} onDragStart={(e) => e.stopPropagation()}>
                  <SchemaForm schema={fieldsFor(item)} value={item} onChange={(v) => onChange(value.map((x, n) => (n === i ? v : x)))} root={root} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SchemaForm({ schema, value = {}, onChange, root }) {
  const obj = value || {};
  const set = (k, v) => onChange({ ...obj, [k]: v });
  return (
    <div className="space-y-4">
      {schema.filter((f) => !f.show || f.show(obj, root)).map((f) => {
        const v = obj[f.key];
        const key = f.key || f.label;
        switch (f.type) {
          case 'bi':
            return <Bilingual key={key} f={f} obj={obj} set={set} />;
          case 'biArea':
          case 'html':
            return <Bilingual key={key} f={f} obj={obj} set={set} area />;
          case 'textarea':
            return <Field key={key} label={f.label}><textarea rows={3} className={inputCls} value={v ?? ''} onChange={(e) => set(f.key, e.target.value)} /></Field>;
          case 'number':
            return <Field key={key} label={f.label}><input type="number" min={f.min ?? 0} max={f.max} className={inputCls} value={v ?? ''} onChange={(e) => set(f.key, e.target.value === '' ? '' : +e.target.value)} /></Field>;
          case 'bool':
            return <label key={key} className="flex items-center gap-3 text-sm"><Toggle checked={!!v} onChange={(b) => set(f.key, b)} label={f.label} /> {f.label}</label>;
          case 'select':
            return <Field key={key} label={f.label}><select className={inputCls} value={v ?? ''} onChange={(e) => set(f.key, e.target.value)}>{f.options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}</select></Field>;
          case 'color':
            return (
              <Field key={key} label={f.label}>
                <div className="flex items-center gap-2"><input type="color" value={v || '#141414'} onChange={(e) => set(f.key, e.target.value.toUpperCase())} className="h-10 w-14 cursor-pointer border border-hairline bg-white" aria-label={f.label} /><input className={`${inputCls} font-mono`} value={v || ''} onChange={(e) => set(f.key, e.target.value)} /></div>
              </Field>
            );
          case 'date':
            return <Field key={key} label={f.label}><input type="datetime-local" className={inputCls} value={v ? new Date(new Date(v).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''} onChange={(e) => set(f.key, e.target.value ? new Date(e.target.value).toISOString() : null)} /></Field>;
          case 'image':
            return <ImageField key={key} label={f.label} value={v} onChange={(url) => set(f.key, url)} />;
          case 'images':
            return <div key={key}><span className="label mb-2 block text-[10px] text-stone">{f.label}</span><ImagesField value={v} onChange={(x) => set(f.key, x)} /></div>;
          case 'category':
            return <Field key={key} label={f.label}><CategorySelect value={v} onChange={(x) => set(f.key, x)} /></Field>;
          case 'categories':
            return <div key={key}><span className="label mb-2 block text-[10px] text-stone">{f.label}</span><CategorySelect multiple value={v} onChange={(x) => set(f.key, x)} /></div>;
          case 'products':
            return <div key={key}><span className="label mb-2 block text-[10px] text-stone">{f.label}</span><ProductsField value={v} onChange={(x) => set(f.key, x)} /></div>;
          case 'hotspots':
            return <div key={key}><span className="label mb-2 block text-[10px] text-stone">{f.label}</span><HotspotEditor image={obj[f.imageKey || 'image']} value={v} onChange={(x) => set(f.key, x)} /></div>;
          case 'list':
            return <ListField key={key} f={f} value={v} onChange={(x) => set(f.key, x)} root={root || obj} />;
          default:
            return <Field key={key} label={f.label} hint={f.hint}><input className={inputCls} placeholder={f.placeholder} value={v ?? ''} onChange={(e) => set(f.key, e.target.value)} /></Field>;
        }
      })}
    </div>
  );
}
