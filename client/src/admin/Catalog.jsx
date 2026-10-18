import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Download, Plus, Trash2 } from 'lucide-react';
import { Button, Field, Img, Modal } from '../components/ui.jsx';
import { useAsync, useDebounce } from '../hooks/index.js';
import { adminService } from '../services/index.js';
import { Card, Empty, Grip, ImageField, PageHead, Rows, Table, Toggle, downloadText, useDragList } from './common.jsx';

/* ======================= Categories (tree + drag to reorder) ======================= */
function Level({ items, all, onReorder, onEdit, onToggle, depth = 0 }) {
  const drag = useDragList(items, onReorder);
  return (
    <ul className={depth ? 'ms-8 border-s border-hairline' : ''}>
      {items.map((c, i) => {
        const d = drag(i);
        const kids = all.filter((x) => x.parent === c._id).sort((a, b) => a.sortOrder - b.sortOrder);
        return (
          <li key={c._id}>
            <div {...d} className={`flex items-center gap-3 border-b border-hairline bg-white px-4 py-2.5 ${d.className}`}>
              <Grip />
              <Img src={c.image} alt="" w={40} h={40} className="h-10 w-10 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.name} <span className="font-urdu text-sm text-stone">{c.nameUr}</span></p>
                <p className="font-mono text-[11px] text-stone">/shop/{c.slug}</p>
              </div>
              <Toggle checked={c.isActive} onChange={() => onToggle(c)} label={`${c.name} active`} />
              <button onClick={() => onEdit(c)} className="text-xs underline">Edit</button>
            </div>
            {kids.length > 0 && <Level items={kids} all={all} onReorder={onReorder} onEdit={onEdit} onToggle={onToggle} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

export default function Categories() {
  const { data, loading, setData, reload } = useAsync(() => adminService.categories(), []);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const all = data?.categories || [];
  const roots = all.filter((c) => !c.parent).sort((a, b) => a.sortOrder - b.sortOrder);

  const reorder = async (list) => {
    const items = list.map((c, i) => ({ id: c._id, sortOrder: i, parent: c.parent || null }));
    setData({ categories: all.map((c) => ({ ...c, sortOrder: items.find((x) => x.id === c._id)?.sortOrder ?? c.sortOrder })) });
    try {
      await adminService.reorderCategories(items);
      toast.success('Order saved');
    } catch (e) {
      toast.error(e.message);
      reload();
    }
  };
  const toggle = async (c) => {
    try {
      const { _id, name, nameUr, slug, image, parent } = c;
      await adminService.saveCategory({ _id, name, nameUr, slug, image, parent: parent || null, isActive: !c.isActive });
      setData({ categories: all.map((x) => (x._id === c._id ? { ...x, isActive: !c.isActive } : x)) });
    } catch (e) {
      toast.error(e.message);
    }
  };
  const save = async () => {
    if (!edit.name || edit.name.trim().length < 2) return toast.error('Name is required');
    setBusy(true);
    try {
      const { _id, name, nameUr, slug, image, isActive, parent } = edit;
      await adminService.saveCategory({ _id, name, nameUr, slug, image, isActive, parent: parent || null, ...(!_id && { sortOrder: all.filter((c) => (c.parent || '') === (parent || '')).length }) });
      toast.success('Category saved');
      setEdit(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!confirm(`Delete ${edit.name}?`)) return;
    try {
      await adminService.deleteCategory(edit._id);
      toast.success('Deleted');
      setEdit(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <>
      <PageHead title="Categories" sub="Drag to reorder within a level. Sub-categories appear under their parent in the store menu." action={<button onClick={() => setEdit({ name: '', nameUr: '', slug: '', image: '', isActive: true, parent: '' })} className="btn-primary px-4 py-2.5"><Plus className="h-4 w-4" /> Add category</button>} />
      <Card pad={false}>{loading ? <table className="w-full"><tbody><Rows cols={1} /></tbody></table> : roots.length ? <Level items={roots} all={all} onReorder={reorder} onEdit={setEdit} onToggle={toggle} /> : <Empty />}</Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?._id ? 'Edit category' : 'New category'}>
        {edit && (
          <div className="space-y-4">
            <Field label="Name (English)"><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Name (Urdu)"><input dir="rtl" className="input font-urdu" value={edit.nameUr || ''} onChange={(e) => setEdit({ ...edit, nameUr: e.target.value })} /></Field>
            <Field label="Slug (auto from name if empty)"><input className="input font-mono text-sm" value={edit.slug || ''} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></Field>
            <Field label="Parent">
              <select className="input" value={edit.parent || ''} onChange={(e) => setEdit({ ...edit, parent: e.target.value })}>
                <option value="">— Top level —</option>
                {roots.filter((c) => c._id !== edit._id).map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </Field>
            <ImageField value={edit.image} onChange={(image) => setEdit({ ...edit, image })} aspect="aspect-square" />
            <label className="flex items-center gap-3 text-sm"><Toggle checked={edit.isActive} onChange={(v) => setEdit({ ...edit, isActive: v })} label="Active" /> Active</label>
            <div className="flex gap-2">
              {edit._id && <button onClick={del} className="btn-outline px-4 text-rose"><Trash2 className="h-4 w-4" /></button>}
              <Button className="flex-1" loading={busy} onClick={save}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/* ======================= Inventory ======================= */
function StockCell({ row, onSaved }) {
  const [v, setV] = useState(row.stock);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setV(row.stock);
  }, [row.stock]);
  const save = async () => {
    const n = parseInt(v);
    if (n === row.stock) return;
    if (!(n >= 0)) return setV(row.stock), toast.error('Stock must be 0 or more');
    setBusy(true);
    try {
      await adminService.setStock(row.sku, n);
      toast.success(`${row.sku} → ${n}`);
      onSaved(row.sku, n);
    } catch (e) {
      toast.error(e.message);
      setV(row.stock);
    } finally {
      setBusy(false);
    }
  };
  return <input type="number" min={0} value={v} disabled={busy} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className="input w-24 bg-white px-2 py-1.5" aria-label={`Stock for ${row.sku}`} />;
}

export function Inventory() {
  const [sp, setSp] = useSearchParams();
  const low = sp.get('low') === 'true';
  const [q, setQ] = useState('');
  const dq = useDebounce(q).toLowerCase();
  const { data, loading, setData } = useAsync(() => adminService.inventory(low), [low]);
  const rows = (data?.rows || []).filter((r) => !dq || r.title.toLowerCase().includes(dq) || r.sku.toLowerCase().includes(dq));
  const saved = (sku, stock) => setData({ ...data, rows: data.rows.map((r) => (r.sku === sku ? { ...r, stock, low: stock <= data.lowStockLevel } : r)) });
  const exportCsv = async () => {
    try {
      downloadText('fashionist-inventory.csv', await adminService.inventoryCsv());
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <>
      <PageHead title="Inventory" sub={data && `${rows.length} variants · low-stock level ${data.lowStockLevel}`} action={<button onClick={exportCsv} className="btn-outline px-4 py-2.5"><Download className="h-4 w-4" /> Export CSV</button>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by product or SKU…" className="input max-w-xs bg-white" aria-label="Filter inventory" />
        <label className="flex items-center gap-2 text-sm"><Toggle checked={low} onChange={(v) => setSp(v ? { low: 'true' } : {})} label="Low stock only" /> Low stock only</label>
      </div>
      <Table head={['Product', 'SKU', 'Size', 'Colour', 'Stock', '']} empty={!loading && !rows.length && <Empty text="All stocked up ◆" />}>
        {loading ? <Rows cols={6} /> : rows.map((r) => (
          <tr key={r.sku} className={r.stock === 0 ? 'bg-blush/40' : r.low ? 'bg-sand/60' : ''}>
            <td className="px-4 py-2"><Link to={`/admin/products/${r.productId}`} className="flex items-center gap-3 hover:underline"><Img src={r.image} alt="" w={32} h={42} className="h-10 w-8 shrink-0" />{r.title}</Link></td>
            <td className="px-4 font-mono text-xs">{r.sku}</td>
            <td className="px-4">{r.size}</td>
            <td className="px-4">{r.colour}</td>
            <td className="px-4"><StockCell row={r} onSaved={saved} /></td>
            <td className="px-4">{r.stock === 0 ? <span className="label text-[10px] text-rose-deep">Out of stock</span> : r.low && <span className="label text-[10px] text-gold">Low</span>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
