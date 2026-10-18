import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, ExternalLink, Eye, EyeOff, Monitor, Plus, RotateCcw, Smartphone, Tablet, Trash2, UploadCloud } from 'lucide-react';
import { Button, Modal, Skeleton } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/index.js';
import { adminService } from '../../services/index.js';
import { loadCms } from '../../features/store.js';
import { Badge, Grip, useDragList } from '../common.jsx';
import SchemaForm from './SchemaForm.jsx';

const cta = [{ key: 'ctaText', label: 'Button text', type: 'bi' }, { key: 'ctaLink', label: 'Button link', placeholder: '/shop/women' }];
export const SECTION_META = {
  hero: { label: 'Hero slider', desc: 'Full-height editorial slides', content: [{ key: 'label', label: 'Vertical label', placeholder: 'SS 2026 Collection' }, { key: 'slides', label: 'Slides', type: 'list', itemName: 'slide', max: 6, itemLabel: (s) => s.title, newItem: { title: 'New slide', image: '', ctaLink: '/shop' }, fields: [{ key: 'eyebrow', label: 'Eyebrow', type: 'bi' }, { key: 'title', label: 'Headline', type: 'bi' }, { key: 'text', label: 'Text', type: 'biArea' }, { key: 'image', label: 'Image', type: 'image' }, ...cta, { key: 'cta2Text', label: 'Second button', type: 'bi' }, { key: 'cta2Link', label: 'Second link' }] }] },
  categoryMosaic: { label: 'Category mosaic', desc: '1 tall + 4 small tiles', content: [{ key: 'items', label: 'Tiles', type: 'list', itemName: 'tile', max: 7, itemLabel: (t) => t.category, newItem: { category: '', image: '', tall: false }, fields: [{ key: 'category', label: 'Category', type: 'category' }, { key: 'image', label: 'Image (optional)', type: 'image' }, { key: 'tall', label: 'Tall tile', type: 'bool' }] }] },
  productRail: { label: 'Product rail', desc: 'Horizontal snap carousel', content: [{ key: 'source', label: 'Products', type: 'select', options: [['new', 'Newest'], ['featured', 'Featured'], ['category', 'From a category'], ['manual', 'Hand-picked']] }, { key: 'category', label: 'Category', type: 'category', show: (c) => c.source === 'category' }, { key: 'productIds', label: 'Products', type: 'products', show: (c) => c.source === 'manual' }, { key: 'limit', label: 'How many', type: 'number', min: 2, max: 24 }] },
  shopTheLook: { label: 'Shop the look', desc: 'Image with product hotspots', content: [{ key: 'image', label: 'Look image', type: 'image' }, { key: 'hotspots', label: 'Hotspots', type: 'hotspots' }] },
  spotlight: { label: 'Spotlight', desc: 'Image + story + button', content: [{ key: 'image', label: 'Image', type: 'image' }, { key: 'eyebrow', label: 'Eyebrow', type: 'bi' }, { key: 'text', label: 'Story', type: 'biArea' }, ...cta, { key: 'dark', label: 'Dark (ink) background', type: 'bool' }] },
  mostLoved: { label: 'Most loved', desc: '4-column grid with tabs', content: [{ key: 'tabs', label: 'Category tabs', type: 'categories' }, { key: 'limit', label: 'Products per tab', type: 'number', min: 2, max: 12 }] },
  promiseStrip: { label: 'Promise strip', desc: '4 icons (COD, delivery…)', content: [{ key: 'items', label: 'Promises', type: 'list', itemName: 'promise', max: 6, itemLabel: (p) => p.title, newItem: { icon: 'shield', title: 'New promise' }, fields: [{ key: 'icon', label: 'Icon', type: 'select', options: [['cod', 'Cash'], ['truck', 'Truck'], ['returns', 'Returns'], ['shield', 'Shield']] }, { key: 'title', label: 'Title', type: 'bi' }, { key: 'text', label: 'Text', type: 'bi' }] }] },
  testimonials: { label: 'Testimonials', desc: 'Serif quote carousel', content: [{ key: 'items', label: 'Quotes', type: 'list', itemName: 'quote', itemLabel: (q) => q.name, newItem: { name: 'Customer, City', rating: 5, text: '' }, fields: [{ key: 'name', label: 'Name & city' }, { key: 'rating', label: 'Stars (1–5)', type: 'number', min: 1, max: 5 }, { key: 'text', label: 'Quote', type: 'biArea' }] }] },
  lookbookGrid: { label: 'Lookbook grid', desc: '6-image Instagram grid', content: [{ key: 'handle', label: 'Handle', placeholder: '@fashionist.pk' }, { key: 'images', label: 'Images', type: 'images' }] },
  newsletter: { label: 'Newsletter', desc: 'Email signup block', content: [{ key: 'text', label: 'Text', type: 'biArea' }] },
  richText: { label: 'Rich text', desc: 'Formatted paragraph', content: [{ key: 'html', label: 'HTML (p, strong, em, a, ul, h2, h3)', type: 'html' }] },
  banner: { label: 'Banner', desc: 'Wide campaign image', content: [{ key: 'image', label: 'Image', type: 'image' }, ...cta.slice(0, 1), { key: 'link', label: 'Link' }, { key: 'align', label: 'Text alignment', type: 'select', options: [['left', 'Left'], ['center', 'Centre']] }] },
};
const NEW_CONTENT = { hero: { slides: [{ title: 'New season', image: '', ctaText: 'Shop now', ctaLink: '/shop' }] }, productRail: { source: 'new', limit: 10 }, mostLoved: { tabs: ['women', 'men'], limit: 4 }, shopTheLook: { image: '', hotspots: [] }, spotlight: { dark: true }, categoryMosaic: { items: [] }, promiseStrip: { items: [] }, testimonials: { items: [] }, lookbookGrid: { images: [] }, richText: { html: '<p>Write something lovely.</p>' }, banner: { align: 'left' } };

// Tiny schematic thumbnails for the "Add section" picker.
const Thumb = ({ type }) => {
  const r = (x, y, w, h, f = '#E4DCD0') => <rect x={x} y={y} width={w} height={h} fill={f} />;
  const shapes = {
    hero: [r(0, 0, 60, 40, '#141414'), r(34, 4, 22, 32, '#8A8178'), r(6, 14, 20, 4, '#FAF7F2'), r(6, 26, 10, 4, '#E11D48')],
    categoryMosaic: [r(2, 2, 26, 36), r(31, 2, 12, 17), r(46, 2, 12, 17), r(31, 21, 12, 17), r(46, 21, 12, 17)],
    productRail: [r(2, 8, 12, 22), r(17, 8, 12, 22), r(32, 8, 12, 22), r(47, 8, 11, 22)],
    shopTheLook: [r(2, 2, 56, 36), <circle key="a" cx="20" cy="16" r="3" fill="#E11D48" />, <circle key="b" cx="40" cy="26" r="3" fill="#E11D48" />],
    spotlight: [r(0, 0, 60, 40, '#141414'), r(4, 6, 28, 28, '#8A8178'), r(36, 14, 18, 3, '#FAF7F2'), r(36, 24, 10, 4, '#E11D48')],
    mostLoved: [r(16, 3, 8, 3, '#141414'), r(26, 3, 8, 3), r(2, 10, 12, 26), r(17, 10, 12, 26), r(32, 10, 12, 26), r(47, 10, 11, 26)],
    promiseStrip: [r(0, 12, 60, 16), ...[8, 22, 36, 50].map((x) => <circle key={x} cx={x} cy="20" r="3" fill="#B08D57" />)],
    testimonials: [r(10, 12, 40, 3, '#141414'), r(14, 19, 32, 3, '#141414'), r(22, 28, 16, 2)],
    lookbookGrid: [0, 1, 2, 3, 4, 5].map((i) => r(2 + (i % 6) * 9.6, 14, 8, 12)),
    newsletter: [r(4, 6, 52, 28, '#FAF7F2'), r(14, 12, 32, 3, '#141414'), r(12, 22, 26, 6), r(39, 22, 9, 6, '#141414')],
    richText: [r(8, 8, 44, 3, '#141414'), r(8, 15, 44, 2), r(8, 20, 40, 2), r(8, 25, 42, 2), r(8, 30, 30, 2)],
    banner: [r(2, 6, 56, 28, '#8A8178'), r(6, 22, 22, 4, '#FAF7F2'), r(6, 28, 10, 3, '#E11D48')],
  };
  return <svg viewBox="0 0 60 40" className="aspect-[3/2] w-full border border-hairline bg-ivory" aria-hidden="true">{shapes[type]}</svg>;
};

const common = [{ key: 'title', label: 'Title', type: 'bi' }, { key: 'subtitle', label: 'Subtitle / eyebrow', type: 'bi' }];
const schedule = [{ key: 'isVisible', label: 'Visible on the website', type: 'bool' }, { key: 'startAt', label: 'Show from (optional)', type: 'date' }, { key: 'endAt', label: 'Hide after (optional)', type: 'date' }];

export default function Builder() {
  const dispatch = useDispatch();
  const { data, loading, setData, reload } = useAsync(() => adminService.cms.sections(), []);
  const [editing, setEditing] = useState(null); // working copy of one section
  const [dirty, setDirty] = useState(false);
  const [device, setDevice] = useState('desktop');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');
  const frame = useRef(null);
  const sections = data?.sections || [];
  const drafts = sections.filter((s) => s.status !== 'published').length;

  const refreshPreview = (scrollTo) => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    w.postMessage('fashionist:cms-refresh', window.location.origin);
    if (scrollTo) setTimeout(() => w.postMessage({ type: 'fashionist:scroll-to', id: scrollTo }, window.location.origin), 700);
  };
  useEffect(() => {
    const warn = (e) => dirty && (e.preventDefault(), (e.returnValue = ''));
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const persistOrder = async (list) => {
    setData({ sections: list.map((s, i) => ({ ...s, order: i, status: 'draft' })) });
    try {
      await adminService.cms.reorderSections(list.map((s) => s._id));
      refreshPreview();
    } catch (e) {
      toast.error(e.message);
      reload();
    }
  };
  const drag = useDragList(sections, persistOrder);
  const patch = async (s, body, msg) => {
    try {
      const r = await adminService.cms.updateSection(s._id, body);
      setData({ sections: sections.map((x) => (x._id === s._id ? r.section : x)) });
      refreshPreview();
      msg && toast.success(msg);
    } catch (e) {
      toast.error(e.message);
    }
  };
  const saveDraft = async () => {
    setBusy('save');
    const { _id, title, titleUr, subtitle, subtitleUr, content, isVisible, startAt, endAt } = editing;
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) return setBusy(''), toast.error('“Hide after” must be later than “Show from”');
    await patch(editing, { title, titleUr, subtitle, subtitleUr, content, isVisible, startAt: startAt || null, endAt: endAt || null }, 'Draft saved — preview updated');
    setDirty(false);
    setBusy('');
    refreshPreview(_id);
  };
  const add = async (type) => {
    setAdding(false);
    try {
      const r = await adminService.cms.createSection({ type, title: SECTION_META[type].label, content: NEW_CONTENT[type] || {} });
      setData({ sections: [...sections, r.section] });
      setEditing(r.section);
      refreshPreview(r.section._id);
      toast.success('Section added as a draft');
    } catch (e) {
      toast.error(e.message);
    }
  };
  const duplicate = async (s) => {
    await adminService.cms.duplicateSection(s._id);
    reload();
    refreshPreview();
    toast.success('Duplicated');
  };
  const remove = async (s) => {
    if (!confirm(`Delete “${s.title || SECTION_META[s.type].label}”? This also removes it from the live site.`)) return;
    await adminService.cms.deleteSection(s._id);
    setData({ sections: sections.filter((x) => x._id !== s._id) });
    refreshPreview();
    toast.success('Section deleted');
  };
  const publish = async () => {
    if (dirty && !confirm('You have unsaved changes in the open section. Publish without them?')) return;
    setBusy('publish');
    try {
      const r = await adminService.cms.publish();
      setData({ sections: r.sections });
      dispatch(loadCms());
      toast.success('Published — the homepage is live');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };
  const revert = async () => {
    if (!confirm('Discard all drafts and go back to the last published homepage?')) return;
    setBusy('revert');
    try {
      const r = await adminService.cms.revert();
      setData({ sections: r.sections });
      setEditing(null);
      setDirty(false);
      refreshPreview();
      toast.success('Reverted to last published');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy('');
    }
  };

  const width = { desktop: '100%', tablet: '820px', mobile: '390px' }[device];
  const meta = editing && SECTION_META[editing.type];
  return (
    <div className="-m-4 flex min-h-[calc(100vh-4rem)] flex-col sm:-m-8 lg:flex-row">
      {/* left panel */}
      <div className="flex w-full flex-col border-e border-hairline bg-white lg:w-[440px] lg:shrink-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3">
          <p className="font-display text-2xl">Homepage</p>
          {drafts > 0 ? <Badge s="draft">{drafts} unpublished</Badge> : <Badge s="published">Live</Badge>}
          <div className="ms-auto flex gap-1.5">
            <button onClick={revert} disabled={!!busy} title="Revert to last published" aria-label="Revert to last published" className="grid h-9 w-9 place-items-center border border-hairline hover:border-ink"><RotateCcw className="h-4 w-4" /></button>
            <Button loading={busy === 'publish'} onClick={publish} className="px-4 py-2"><UploadCloud className="h-4 w-4" /> Publish</Button>
          </div>
        </div>

        {loading ? <div className="p-4"><Skeleton className="h-96" /></div> : editing ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
              <button onClick={() => (!dirty || confirm('Discard unsaved changes?')) && (setEditing(null), setDirty(false))} className="flex items-center gap-1 text-sm"><ArrowLeft className="h-4 w-4" /> Sections</button>
              <span className="ms-auto label text-[10px] text-gold">{meta.label}</span>
            </div>
            <div className="flex-1 space-y-6 overflow-auto p-4">
              <SchemaForm schema={common} value={editing} onChange={(v) => (setEditing(v), setDirty(true))} />
              <div className="border-t border-hairline pt-5">
                <SchemaForm schema={meta.content} value={editing.content || {}} onChange={(content) => (setEditing({ ...editing, content }), setDirty(true))} />
              </div>
              <div className="border-t border-hairline pt-5"><SchemaForm schema={schedule} value={editing} onChange={(v) => (setEditing(v), setDirty(true))} /></div>
            </div>
            <div className="flex gap-2 border-t border-hairline p-3">
              <Button variant="outline" className="flex-1 px-3 py-2.5" onClick={() => window.open('/?preview=1', '_blank')}><ExternalLink className="h-4 w-4" /> Preview</Button>
              <Button className="flex-1 px-3 py-2.5" loading={busy === 'save'} disabled={!dirty} onClick={saveDraft}>Save draft</Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-3">
            <ul className="space-y-1.5">
              {sections.map((s, i) => {
                const d = drag(i);
                return (
                  <li key={s._id} {...d} className={`group flex items-center gap-2 border border-hairline bg-white px-2 py-2 hover:border-ink ${s.isVisible ? '' : 'opacity-50'} ${d.className}`}>
                    <Grip />
                    <button className="min-w-0 flex-1 text-start" onClick={() => (setEditing(structuredClone(s)), refreshPreview(s._id))}>
                      <span className="block truncate text-sm font-medium">{s.title || SECTION_META[s.type]?.label}</span>
                      <span className="flex items-center gap-2 text-[11px] text-stone">{SECTION_META[s.type]?.label}{s.status !== 'published' && <span className="text-gold">· draft</span>}{(s.startAt || s.endAt) && <span>· scheduled</span>}</span>
                    </button>
                    <button onClick={() => patch(s, { isVisible: !s.isVisible }, s.isVisible ? 'Hidden (draft)' : 'Shown (draft)')} aria-label={s.isVisible ? 'Hide section' : 'Show section'} className="p-1 text-stone hover:text-ink">{s.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                    <button onClick={() => duplicate(s)} aria-label="Duplicate section" className="p-1 text-stone hover:text-ink"><Copy className="h-4 w-4" /></button>
                    <button onClick={() => remove(s)} aria-label="Delete section" className="p-1 text-stone hover:text-rose"><Trash2 className="h-4 w-4" /></button>
                  </li>
                );
              })}
            </ul>
            <button onClick={() => setAdding(true)} className="mt-3 flex w-full items-center justify-center gap-2 border border-dashed border-hairline py-3 text-sm hover:border-ink"><Plus className="h-4 w-4" /> Add section</button>
            <p className="mt-4 text-xs text-stone">Drag to reorder. Changes are drafts until you press <b>Publish</b>. Drafts show only in this preview.</p>
          </div>
        )}
      </div>

      {/* right: live preview */}
      <div className="flex min-h-[70vh] flex-1 flex-col bg-sand/60">
        <div className="flex items-center justify-center gap-1 border-b border-hairline bg-white py-2">
          {[['desktop', Monitor], ['tablet', Tablet], ['mobile', Smartphone]].map(([k, I]) => (
            <button key={k} onClick={() => setDevice(k)} aria-pressed={device === k} aria-label={k} className={`grid h-8 w-10 place-items-center ${device === k ? 'bg-ink text-ivory' : 'text-stone hover:text-ink'}`}><I className="h-4 w-4" /></button>
          ))}
        </div>
        <div className="flex flex-1 justify-center overflow-auto p-4">
          <iframe ref={frame} title="Homepage preview" src="/?preview=1" style={{ width, maxWidth: '100%' }} className="h-[calc(100vh-10rem)] border border-hairline bg-white shadow-sm transition-[width] duration-300" />
        </div>
      </div>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add a section" wide>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(SECTION_META).map(([type, m]) => (
            <button key={type} onClick={() => add(type)} className="group border border-hairline p-2 text-start hover:border-rose">
              <Thumb type={type} />
              <p className="mt-2 text-sm font-medium">{m.label}</p>
              <p className="text-[11px] text-stone">{m.desc}</p>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
