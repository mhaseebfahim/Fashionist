// Fashionist Atelier — shared admin building blocks.
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Check, Copy, GripVertical, ImagePlus, Search, Trash2, Upload, X } from 'lucide-react';
import { Button, Img, Modal, Skeleton, Spinner } from '../components/ui.jsx';
import { adminService } from '../services/index.js';
import { useAsync, useDebounce } from '../hooks/index.js';
import { pkr } from '../utils/format.js';

export function PageHead({ title, sub, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-semibold md:text-5xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-stone">{sub}</p>}
        <div className="mt-4 h-px w-12 bg-gold" />
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

export const Card = ({ title, action, children, className = '', pad = true }) => (
  <section className={`border border-hairline bg-white ${className}`}>
    {(title || action) && (
      <header className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
        <p className="label text-[10px] text-stone">{title}</p>
        {action}
      </header>
    )}
    <div className={pad ? 'p-5' : ''}>{children}</div>
  </section>
);

export const Table = ({ head, children, empty }) => (
  <div className="overflow-x-auto border border-hairline bg-white">
    <table className="w-full min-w-[680px] text-sm">
      <thead className="border-b border-hairline bg-ivory">
        <tr>{head.map((h, i) => <th key={i} scope="col" className="label px-4 py-3 text-start text-[10px] text-stone">{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-hairline">{children}</tbody>
    </table>
    {empty}
  </div>
);

export const Rows = ({ n = 6, cols }) => Array.from({ length: n }).map((_, i) => <tr key={i}><td colSpan={cols} className="p-3"><Skeleton className="h-8" /></td></tr>);
export const Empty = ({ text = 'Nothing here yet' }) => <p className="px-6 py-14 text-center font-display text-2xl text-stone">{text}</p>;

const TONE = {
  Pending: 'bg-sand text-ink', Confirmed: 'bg-ink text-ivory', Shipped: 'border border-gold text-gold', Delivered: 'bg-ink/80 text-ivory', Cancelled: 'bg-blush text-rose-deep', Returned: 'bg-blush text-rose-deep',
  Requested: 'bg-sand text-ink', Approved: 'bg-ink text-ivory', Rejected: 'bg-blush text-rose-deep', Hidden: 'bg-blush text-rose-deep', Active: 'bg-ink text-ivory', Draft: 'bg-sand text-ink', draft: 'bg-sand text-ink', published: 'bg-ink text-ivory',
};
export const Badge = ({ s, children }) => <span className={`label inline-block whitespace-nowrap px-2 py-1 text-[10px] ${TONE[s] || 'bg-sand text-ink'}`}>{children || s}</span>;

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={!!checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-40 ${checked ? 'bg-rose' : 'bg-hairline'}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'start-[18px]' : 'start-0.5'}`} />
    </button>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b border-hairline" role="tablist">
      {tabs.map(([k, label, count]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)} className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition ${value === k ? 'border-rose font-semibold text-ink' : 'border-transparent text-stone hover:text-ink'}`}>
          {label}
          {count !== undefined && <span className="ms-2 text-xs text-stone">{count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Drawer({ open, onClose, title, children, width = 'max-w-2xl', footer }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.aside role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : 'Details'} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.45 }} onClick={(e) => e.stopPropagation()} className={`ms-auto flex h-full w-full ${width} flex-col bg-ivory`}>
            <header className="flex items-center justify-between border-b border-hairline bg-white px-6 py-4">
              <h2 className="font-display text-2xl">{title}</h2>
              <button onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
            </header>
            <div className="flex-1 overflow-auto p-6">{children}</div>
            {footer && <footer className="border-t border-hairline bg-white px-6 py-4">{footer}</footer>}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const iso = (d) => d.toISOString().slice(0, 10);
export const presetRange = (days) => ({ from: iso(new Date(Date.now() - (days - 1) * 86400000)), to: iso(new Date()) });
export function DateRange({ value, onChange }) {
  const presets = [[1, 'Today'], [7, '7d'], [30, '30d'], [90, '90d']];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map(([d, l]) => {
        const r = presetRange(d);
        const on = r.from === value.from && r.to === value.to;
        return <button key={d} onClick={() => onChange(r)} className={`chip ${on ? 'chip-active' : 'bg-white'}`}>{l}</button>;
      })}
      <input type="date" aria-label="From" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} className="input w-auto bg-white px-2 py-1.5 text-xs" />
      <span className="text-stone">–</span>
      <input type="date" aria-label="To" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} className="input w-auto bg-white px-2 py-1.5 text-xs" />
    </div>
  );
}

export const downloadText = (name, text, type = 'text/csv') => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/** Native HTML5 drag-to-reorder for any list. Returns props to spread on each item. */
export function useDragList(items, onReorder) {
  const from = useRef(null);
  const [over, setOver] = useState(null);
  return (index) => ({
    draggable: true,
    onDragStart: (e) => {
      from.current = index;
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e) => {
      e.preventDefault();
      setOver(index);
    },
    onDragLeave: () => setOver((o) => (o === index ? null : o)),
    onDrop: (e) => {
      e.preventDefault();
      setOver(null);
      const f = from.current;
      if (f === null || f === index) return;
      const next = [...items];
      const [moved] = next.splice(f, 1);
      next.splice(index, 0, moved);
      onReorder(next);
    },
    onDragEnd: () => (from.current = null, setOver(null)),
    'data-over': over === index || undefined,
    className: over === index ? 'outline outline-2 outline-rose/50' : '',
  });
}
export const Grip = () => <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-stone" aria-hidden="true" />;

/* ---------- Media library picker ---------- */
export function MediaGrid({ onPick, selectable = true, multiple = false }) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { data, loading, reload } = useAsync(() => adminService.media({ q: dq || undefined }), [dq]);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [picked, setPicked] = useState([]);
  const [url, setUrl] = useState('');
  const upload = async (files) => {
    const ok = [...files].filter((f) => /^image\/(jpeg|png|webp)$/.test(f.type) && f.size <= 5 * 1024 * 1024);
    if (ok.length < files.length) toast.error('Only JPG, PNG or WEBP up to 5 MB');
    if (!ok.length) return;
    setBusy(true);
    try {
      const r = await adminService.uploadMedia(ok);
      toast.success(`${r.media.length} image(s) uploaded`);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const addUrl = async () => {
    try {
      await adminService.addMediaUrl({ url });
      setUrl('');
      reload();
      toast.success('Added to library');
    } catch (e) {
      toast.error(e.message);
    }
  };
  const remove = async (m) => {
    if (!confirm('Delete this image from the library?')) return;
    await adminService.deleteMedia(m._id);
    toast.success('Deleted');
    reload();
  };
  const toggle = (m) => (multiple ? setPicked((p) => (p.includes(m.url) ? p.filter((x) => x !== m.url) : [...p, m.url])) : onPick?.(m.url));
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search images…" className="input bg-white ps-9" />
        </div>
        <div className="flex min-w-64 flex-1 gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or paste an image URL" className="input bg-white" />
          <Button variant="outline" className="px-4" disabled={!/^https?:\/\//.test(url)} onClick={addUrl}>Add</Button>
        </div>
      </div>
      <label
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => (e.preventDefault(), setDrag(false), upload(e.dataTransfer.files))}
        className={`mb-5 flex cursor-pointer flex-col items-center justify-center border border-dashed px-6 py-8 text-center text-sm transition ${drag ? 'border-rose bg-blush/40' : 'border-hairline bg-white hover:border-ink'}`}
      >
        {busy ? <Spinner className="h-5 w-5" /> : <Upload className="h-5 w-5 text-stone" />}
        <span className="mt-2">Drag & drop images here, or <u>browse</u></span>
        <span className="text-xs text-stone">JPG, PNG, WEBP · max 5 MB each · uploads to Cloudinary</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files)} />
      </label>
      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {data.media.map((m) => {
            const on = picked.includes(m.url);
            return (
              <figure key={m._id} className={`group relative border bg-white ${on ? 'border-rose' : 'border-hairline'}`}>
                <button type="button" className="block w-full" onClick={() => selectable && toggle(m)} aria-label={`Select ${m.alt || 'image'}`}>
                  <Img src={m.url} alt={m.alt} w={200} h={200} className="aspect-square" />
                </button>
                {on && <span className="absolute start-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose text-white"><Check className="h-3 w-3" /></span>}
                <figcaption className="flex items-center justify-between gap-1 px-2 py-1.5 text-[10px] text-stone">
                  <span className="truncate">{m.alt || m.folder}</span>
                  <span className="flex gap-1.5 opacity-60 group-hover:opacity-100">
                    <button type="button" aria-label="Copy URL" onClick={() => (navigator.clipboard?.writeText(m.url), toast.success('URL copied'))}><Copy className="h-3 w-3" /></button>
                    <button type="button" aria-label="Delete" onClick={() => remove(m)}><Trash2 className="h-3 w-3" /></button>
                  </span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      )}
      {multiple && picked.length > 0 && (
        <div className="sticky bottom-0 mt-4 flex items-center justify-between border-t border-hairline bg-ivory py-3">
          <span className="text-sm">{picked.length} selected</span>
          <Button onClick={() => onPick(picked)}>Use {picked.length} image(s)</Button>
        </div>
      )}
    </div>
  );
}

export function MediaPicker({ open, onClose, onPick, multiple }) {
  return (
    <Modal open={open} onClose={onClose} title="Media Library" wide>
      <MediaGrid multiple={multiple} onPick={(v) => (onPick(v), onClose())} />
    </Modal>
  );
}

/** Image field: preview + "Choose" (media library) + clear. */
export function ImageField({ value, onChange, label = 'Image', aspect = 'aspect-[4/3]' }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <span className="label mb-2 block text-[10px] text-stone">{label}</span>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className={`relative w-24 shrink-0 overflow-hidden border border-hairline bg-ivory ${aspect}`} aria-label={`Choose ${label}`}>
          {value ? <Img src={value} alt="" w={120} h={90} className="absolute inset-0" /> : <ImagePlus className="absolute inset-0 m-auto h-5 w-5 text-stone" />}
        </button>
        <div className="flex flex-col gap-1 text-xs">
          <button type="button" className="text-start underline" onClick={() => setOpen(true)}>Choose from library</button>
          {value && <button type="button" className="text-start text-rose underline" onClick={() => onChange('')}>Remove</button>}
        </div>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} onPick={onChange} />
    </div>
  );
}

/* ---------- Product picker ---------- */
export function ProductPicker({ open, onClose, onPick, multiple, selected = [] }) {
  const [q, setQ] = useState('');
  const dq = useDebounce(q);
  const { data, loading } = useAsync(() => (open ? adminService.products({ q: dq || undefined, status: 'active' }) : Promise.resolve(null)), [dq, open]);
  const [picked, setPicked] = useState(selected);
  useEffect(() => {
    if (open) setPicked(selected);
  }, [open]); // eslint-disable-line
  return (
    <Modal open={open} onClose={onClose} title={multiple ? 'Choose products' : 'Choose a product'} wide>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or SKU…" className="input mb-4 bg-white" />
      <ul className="max-h-[50vh] divide-y divide-hairline overflow-auto border border-hairline bg-white">
        {loading || !data ? <li className="p-4"><Spinner /></li> : data.products.map((p) => {
          const on = picked.includes(p._id);
          return (
            <li key={p._id}>
              <button type="button" onClick={() => (multiple ? setPicked((x) => (on ? x.filter((i) => i !== p._id) : [...x, p._id])) : (onPick(p), onClose()))} className={`flex w-full items-center gap-3 px-3 py-2 text-start text-sm hover:bg-ivory ${on ? 'bg-blush/40' : ''}`}>
                <Img src={p.images[0]} alt="" w={40} h={52} className="h-12 w-9 shrink-0" />
                <span className="flex-1">{p.title}</span>
                <span className="text-stone">{pkr(p.price)}</span>
                {on && <Check className="h-4 w-4 text-rose" />}
              </button>
            </li>
          );
        })}
      </ul>
      {multiple && <Button className="mt-4 w-full" onClick={() => (onPick(picked), onClose())}>Use {picked.length} product(s)</Button>}
    </Modal>
  );
}
