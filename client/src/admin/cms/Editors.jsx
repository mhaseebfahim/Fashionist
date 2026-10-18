import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { ExternalLink, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button, Diamond, Skeleton } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/index.js';
import { adminService } from '../../services/index.js';
import { loadCms } from '../../features/store.js';
import { FONT_PAIRS } from '../../cms/defaults.js';
import { applyTheme, loadFonts } from '../../utils/theme.js';
import { Block } from '../../pages/StaticPage.jsx';
import { Badge, Card, ImageField, MediaGrid, PageHead } from '../common.jsx';
import SchemaForm from './SchemaForm.jsx';

/** Loads a CMS singleton (theme / navigation / announcement) and saves it back. */
function useSingleton(key) {
  const dispatch = useDispatch();
  const { data, loading } = useAsync(() => adminService.cms.get(key), [key]);
  const [value, setValue] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) setValue(data[key]);
  }, [data, key]);
  const save = async (body = value) => {
    setBusy(true);
    try {
      const r = await adminService.cms.put(key, body);
      setValue(r[key]);
      dispatch(loadCms());
      toast.success('Saved — live on the website');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return { value, setValue, loading: loading || !value, busy, save };
}
const strip = ({ _id, __v, createdAt, updatedAt, ...rest }) => rest;

/* ======================= Theme ======================= */
export function ThemeEditor() {
  const dispatch = useDispatch();
  const { value: t, setValue, loading, busy, save } = useSingleton('theme');
  const preview = useRef(null);
  useEffect(() => {
    if (!t || !preview.current) return;
    applyTheme(t, preview.current);
    loadFonts(FONT_PAIRS[t.fontPair] || FONT_PAIRS.classic);
  }, [t]);
  if (loading) return <Skeleton className="h-96" />;
  const set = (k, v) => setValue({ ...t, [k]: v });
  const reset = async () => {
    if (!confirm('Reset colours, fonts and buttons to the Fashionist defaults?')) return;
    const r = await adminService.cms.resetTheme();
    setValue(r.theme);
    dispatch(loadCms());
    toast.success('Theme reset to Fashionist defaults');
  };
  const valid = (c) => /^#[0-9a-fA-F]{6}$/.test(c);
  return (
    <>
      <PageHead title="Theme" sub="Colours, fonts and buttons for the storefront" action={<><button onClick={reset} className="btn-outline px-4 py-2.5"><RotateCcw className="h-4 w-4" /> Reset</button><Button loading={busy} disabled={!valid(t.primaryColor) || !valid(t.accentColor)} onClick={() => save(strip({ ...t, headingFont: FONT_PAIRS[t.fontPair].heading, bodyFont: FONT_PAIRS[t.fontPair].body }))} className="px-6 py-2.5">Save theme</Button></>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card title="Colours">
            <SchemaForm schema={[{ key: 'primaryColor', label: 'Primary (buttons, sale prices)', type: 'color' }, { key: 'accentColor', label: 'Accent (thin lines, labels)', type: 'color' }]} value={t} onChange={setValue} />
            <p className="mt-3 text-xs text-stone">Keep enough contrast with white text (WCAG AA). The Fashionist rose is #E11D48 and gold #B08D57.</p>
          </Card>
          <Card title="Fonts — approved pairs">
            <div className="space-y-2">
              {Object.entries(FONT_PAIRS).map(([k, p]) => (
                <label key={k} className={`flex cursor-pointer items-center gap-4 border p-3 ${t.fontPair === k ? 'border-ink' : 'border-hairline'}`}>
                  <input type="radio" name="font" className="accent-rose" checked={t.fontPair === k} onChange={() => set('fontPair', k)} />
                  <span style={{ fontFamily: `"${p.heading}", serif` }} className="text-2xl">Aa</span>
                  <span className="text-sm">{p.label}</span>
                </label>
              ))}
            </div>
          </Card>
          <Card title="Buttons, logo & dark mode">
            <div className="space-y-4">
              <div className="flex gap-2">{['sharp', 'pill'].map((b) => <button key={b} onClick={() => set('buttonStyle', b)} className={`flex-1 border px-4 py-3 text-sm capitalize ${t.buttonStyle === b ? 'border-ink' : 'border-hairline'}`}>{b}</button>)}</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ImageField label="Logo (leave empty for the wordmark)" value={t.logo} onChange={(v) => set('logo', v)} aspect="aspect-[3/1]" />
                <ImageField label="Favicon" value={t.favicon} onChange={(v) => set('favicon', v)} aspect="aspect-square" />
              </div>
              <SchemaForm schema={[{ key: 'darkModeEnabled', label: 'Let shoppers switch to dark mode', type: 'bool' }]} value={t} onChange={setValue} />
            </div>
          </Card>
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="label mb-3 text-[10px] text-stone">Live preview</p>
          <div ref={preview} className="border border-hairline bg-ivory p-8">
            <p className="flex items-center gap-2"><Diamond className="h-2.5 w-2.5" /><span className="font-display text-lg font-semibold tracking-brand">FASHIONIST</span></p>
            <p className="label mt-8 text-gold">Eid 2026</p>
            <h2 className="mt-2 font-display text-6xl font-semibold leading-none">The Eid Edit</h2>
            <div className="my-5 h-px w-16 bg-gold" />
            <p className="max-w-sm text-sm text-stone">Hand-embroidered lawn, organza and silk — made for the moments you will retell for years.</p>
            <div className="mt-6 flex flex-wrap gap-3"><span className="btn-primary">Shop Women</span><span className="btn-outline">Shop Men</span></div>
            <p className="mt-6 text-sm">PKR 6,490 <span className="ms-2 font-semibold text-rose">PKR 5,190</span> <span className="label ms-2 bg-blush px-2 py-1 text-[10px] text-rose-deep">-20%</span></p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ======================= Navigation ======================= */
const linkFields = [{ key: 'label', label: 'Label', type: 'bi' }, { key: 'link', label: 'Link', placeholder: '/shop/lawn' }];
const NAV_SCHEMA = [
  { key: 'header', label: 'Header menu', type: 'list', itemName: 'menu item', max: 8, itemLabel: (i) => i.label, newItem: { label: 'New', link: '/shop', children: [] }, fields: [...linkFields, { key: 'image', label: 'Mega-menu image', type: 'image' }, { key: 'children', label: 'Sub-links', type: 'list', itemName: 'link', itemLabel: (c) => c.label, newItem: { label: 'Link', link: '/shop' }, fields: linkFields }] },
  { key: 'footer', label: 'Footer columns', type: 'list', itemName: 'column', max: 4, itemLabel: (c) => c.title, newItem: { title: 'Column', links: [] }, fields: [{ key: 'title', label: 'Column title', type: 'bi' }, { key: 'links', label: 'Links', type: 'list', itemName: 'link', itemLabel: (c) => c.label, newItem: { label: 'Link', link: '/' }, fields: linkFields }] },
];
export function NavigationEditor() {
  const { value, setValue, loading, busy, save } = useSingleton('navigation');
  if (loading) return <Skeleton className="h-96" />;
  const invalid = [...value.header, ...value.header.flatMap((h) => h.children || []), ...value.footer.flatMap((c) => c.links || [])].find((l) => !l.label?.trim() || !/^(\/|https?:\/\/)/.test(l.link || ''));
  return (
    <>
      <PageHead title="Navigation" sub="Drag to reorder. Header items with an image or sub-links open a mega-menu." action={<Button loading={busy} onClick={() => (invalid ? toast.error(`“${invalid.label || 'Untitled'}” needs a label and a link starting with / or https://`) : save(strip(value)))} className="px-6 py-2.5">Save navigation</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><SchemaForm schema={NAV_SCHEMA.slice(0, 1)} value={value} onChange={setValue} /></Card>
        <Card><SchemaForm schema={NAV_SCHEMA.slice(1)} value={value} onChange={setValue} /></Card>
      </div>
    </>
  );
}

/* ======================= Announcement bar ======================= */
export function AnnouncementEditor() {
  const { value, setValue, loading, busy, save } = useSingleton('announcement');
  if (loading) return <Skeleton className="h-96" />;
  return (
    <>
      <PageHead title="Announcement Bar" sub="The scrolling strip above the header" action={<Button loading={busy} onClick={() => save(strip({ ...value, messages: value.messages.filter((m) => m.text?.trim()) }))} className="px-6 py-2.5">Save</Button>} />
      <div className="mb-6 overflow-hidden text-ivory" style={{ background: value.background, opacity: value.enabled ? 1 : 0.4 }}>
        <div className="flex gap-10 whitespace-nowrap px-4 py-2" dir="ltr">{value.messages.map((m, i) => <span key={i} className="label text-[10px]">{m.text} <span className="ms-8 text-rose">◆</span></span>)}</div>
      </div>
      <Card>
        <SchemaForm
          schema={[
            { key: 'enabled', label: 'Show the announcement bar', type: 'bool' },
            { key: 'background', label: 'Background colour', type: 'color' },
            { key: 'link', label: 'Link (optional)', placeholder: '/shop' },
            { key: 'messages', label: 'Messages', type: 'list', itemName: 'message', max: 10, itemLabel: (m) => m.text, newItem: { text: '', textUr: '' }, fields: [{ key: 'text', label: 'Message', type: 'bi' }] },
          ]}
          value={value}
          onChange={setValue}
        />
      </Card>
    </>
  );
}

/* ======================= Pages (block builder) ======================= */
const BLOCK_FIELDS = (b) => {
  const type = { key: 'type', label: 'Block type', type: 'select', options: [['heading', 'Heading'], ['paragraph', 'Paragraph'], ['image', 'Image'], ['twoColumn', 'Two columns'], ['faq', 'FAQ accordion']] };
  return {
    heading: [type, { key: 'text', label: 'Heading', type: 'bi' }],
    paragraph: [type, { key: 'text', label: 'Text', type: 'biArea' }],
    image: [type, { key: 'image', label: 'Image', type: 'image' }, { key: 'alt', label: 'Alt text (accessibility)' }],
    twoColumn: [type, { key: 'left', label: 'Left column', type: 'biArea' }, { key: 'right', label: 'Right column', type: 'biArea' }],
    faq: [type, { key: 'items', label: 'Questions', type: 'list', itemName: 'question', itemLabel: (q) => q.q, newItem: { q: '', a: '' }, fields: [{ key: 'q', label: 'Question', type: 'bi' }, { key: 'a', label: 'Answer', type: 'biArea' }] }],
  }[b.type || 'paragraph'];
};
const PAGE_SCHEMA = [
  { key: 'title', label: 'Title', type: 'bi' },
  { key: 'slug', label: 'URL slug', hint: 'Shown at /pages/<slug>' },
  { key: 'isPublished', label: 'Published', type: 'bool' },
  { key: 'blocks', label: 'Content blocks', type: 'list', itemName: 'block', itemLabel: (b) => `${b.type} — ${(b.text || b.left || b.alt || b.items?.[0]?.q || '').slice(0, 40)}`, newItem: { type: 'paragraph', text: '' }, fields: BLOCK_FIELDS },
  { key: 'metaTitle', label: 'SEO title' },
  { key: 'metaDescription', label: 'SEO description', type: 'textarea' },
];
export function PagesEditor() {
  const { data, loading, reload } = useAsync(() => adminService.cms.pages(), []);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!edit.title?.trim()) return toast.error('Title is required');
    setBusy(true);
    try {
      const r = await adminService.cms.savePage({ ...strip(edit), ...(edit._id && { _id: edit._id }) });
      setEdit(r.page);
      reload();
      toast.success(edit.isPublished ? 'Page saved and live' : 'Page saved (unpublished)');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!confirm(`Delete /pages/${edit.slug}?`)) return;
    await adminService.cms.deletePage(edit._id);
    setEdit(null);
    reload();
    toast.success('Page deleted');
  };
  if (loading) return <Skeleton className="h-96" />;
  if (!edit)
    return (
      <>
        <PageHead title="Pages" sub="About, Contact, FAQ and policy pages" action={<button onClick={() => setEdit({ title: '', slug: '', blocks: [{ type: 'paragraph', text: '' }], isPublished: false })} className="btn-primary px-4 py-2.5"><Plus className="h-4 w-4" /> New page</button>} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.pages.map((p) => (
            <button key={p._id} onClick={() => setEdit(structuredClone(p))} className="border border-hairline bg-white p-5 text-start hover:border-ink">
              <div className="flex items-center justify-between"><p className="font-display text-2xl">{p.title}</p>{p.isPublished ? <Badge s="published">Live</Badge> : <Badge s="draft">Hidden</Badge>}</div>
              <p className="mt-1 font-mono text-xs text-stone">/pages/{p.slug}</p>
              <p className="mt-3 text-xs text-stone">{p.blocks?.length || 0} blocks</p>
            </button>
          ))}
        </div>
      </>
    );
  return (
    <>
      <PageHead
        title={edit.title || 'New page'}
        sub={<button onClick={() => setEdit(null)} className="underline">← All pages</button>}
        action={<>{edit._id && <><a href={`/pages/${edit.slug}`} target="_blank" rel="noreferrer" className="btn-outline px-4 py-2.5"><ExternalLink className="h-4 w-4" /> View</a><button onClick={del} className="btn-outline px-4 py-2.5 text-rose" aria-label="Delete page"><Trash2 className="h-4 w-4" /></button></>}<Button loading={busy} onClick={save} className="px-6 py-2.5">Save page</Button></>}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card><SchemaForm schema={PAGE_SCHEMA} value={edit} onChange={setEdit} /></Card>
        <div className="xl:sticky xl:top-24 xl:self-start">
          <p className="label mb-3 text-[10px] text-stone">Preview</p>
          <article className="max-h-[75vh] space-y-5 overflow-auto border border-hairline bg-ivory p-8">
            <h1 className="font-display text-5xl">{edit.title}</h1>
            {(edit.blocks || []).map((b, i) => <Block key={i} b={b} lang="en" />)}
          </article>
        </div>
      </div>
    </>
  );
}

/* ======================= Media library ======================= */
export function MediaLibrary() {
  return (
    <>
      <PageHead title="Media Library" sub="Images uploaded to Cloudinary — reusable in products, homepage sections and pages." />
      <MediaGrid selectable={false} />
    </>
  );
}
