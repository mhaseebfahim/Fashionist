import { SiteTheme, Navigation, AnnouncementBar, HomepageSection, Page } from '../models/Cms.js';
import { AppError, asyncHandler } from '../utils/AppError.js';
import { cleanCms, logActivity, slugify } from '../utils/helpers.js';

const FIELDS = ['title', 'titleUr', 'subtitle', 'subtitleUr', 'content', 'order', 'isVisible', 'startAt', 'endAt'];
const pick = (src) => Object.fromEntries(FIELDS.filter((k) => src[k] !== undefined).map((k) => [k, src[k]]));
const live = (s, now = new Date()) => s.isVisible && (!s.startAt || new Date(s.startAt) <= now) && (!s.endAt || new Date(s.endAt) >= now);
const shape = (doc, snapshot) => ({ _id: doc._id, type: doc.type, ...snapshot });

async function bundle(preview) {
  const [theme, navigation, announcement, docs] = await Promise.all([SiteTheme.current(), Navigation.current(), AnnouncementBar.current(), HomepageSection.find().lean()]);
  const sections = docs
    .map((d) => (preview ? shape(d, pick(d)) : d.published && shape(d, d.published)))
    .filter((s) => s && live(s))
    .sort((a, b) => a.order - b.order);
  return { theme, navigation, announcement, sections };
}

/* ---- public ---- */
export const publicCms = asyncHandler(async (_req, res) => res.json(await bundle(false)));
export const previewCms = asyncHandler(async (_req, res) => res.json(await bundle(true)));
export const publicPage = asyncHandler(async (req, res) => {
  const page = await Page.findOne({ slug: req.params.slug, isPublished: true });
  if (!page) throw new AppError('Page not found', 404);
  res.json({ page });
});

/* ---- singletons: theme / navigation / announcement ---- */
const singleton = (Model, name) => ({
  get: asyncHandler(async (_req, res) => res.json({ [name]: await Model.current() })),
  put: asyncHandler(async (req, res) => {
    const doc = await Model.current();
    const body = cleanCms(req.body);
    delete body._id;
    doc.set(body);
    await doc.save();
    logActivity(req, `cms.${name}.update`, name, doc._id);
    res.json({ [name]: doc });
  }),
});
export const theme = singleton(SiteTheme, 'theme');
export const navigation = singleton(Navigation, 'navigation');
export const announcement = singleton(AnnouncementBar, 'announcement');

export const resetTheme = asyncHandler(async (req, res) => {
  await SiteTheme.deleteMany({});
  const doc = await SiteTheme.current();
  logActivity(req, 'cms.theme.reset', 'theme', doc._id);
  res.json({ theme: doc });
});

/* ---- homepage sections ---- */
export const listSections = asyncHandler(async (_req, res) => res.json({ sections: await HomepageSection.find().sort('order') }));

export const createSection = asyncHandler(async (req, res) => {
  const order = (await HomepageSection.countDocuments()) || 0;
  const section = await HomepageSection.create({ order, ...cleanCms(pick(req.body)), type: req.body.type, status: 'draft' });
  logActivity(req, 'cms.section.create', 'HomepageSection', section._id, { type: section.type });
  res.status(201).json({ section });
});

export const updateSection = asyncHandler(async (req, res) => {
  const section = await HomepageSection.findById(req.params.id);
  if (!section) throw new AppError('Section not found', 404);
  section.set({ ...cleanCms(pick(req.body)), status: 'draft' });
  section.markModified('content');
  await section.save();
  logActivity(req, 'cms.section.update', 'HomepageSection', section._id, { type: section.type });
  res.json({ section });
});

export const duplicateSection = asyncHandler(async (req, res) => {
  const src = await HomepageSection.findById(req.params.id).lean();
  if (!src) throw new AppError('Section not found', 404);
  await HomepageSection.updateMany({ order: { $gt: src.order } }, { $inc: { order: 1 } });
  const section = await HomepageSection.create({ ...pick(src), type: src.type, order: src.order + 1, title: `${src.title || ''} (copy)`, status: 'draft' });
  logActivity(req, 'cms.section.duplicate', 'HomepageSection', section._id);
  res.status(201).json({ section });
});

export const deleteSection = asyncHandler(async (req, res) => {
  await HomepageSection.findByIdAndDelete(req.params.id);
  logActivity(req, 'cms.section.delete', 'HomepageSection', req.params.id);
  res.json({ ok: true });
});

export const reorderSections = asyncHandler(async (req, res) => {
  await HomepageSection.bulkWrite(req.body.ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { order, status: 'draft' } } })));
  logActivity(req, 'cms.section.reorder', 'HomepageSection', null);
  res.json({ sections: await HomepageSection.find().sort('order') });
});

export const publishSections = asyncHandler(async (req, res) => {
  const docs = await HomepageSection.find();
  const at = new Date();
  await Promise.all(docs.map((d) => ((d.published = { ...pick(d.toObject()), at }), (d.status = 'published'), d.save())));
  logActivity(req, 'cms.homepage.publish', 'HomepageSection', null, { sections: docs.length });
  res.json({ sections: docs.sort((a, b) => a.order - b.order) });
});

export const revertSections = asyncHandler(async (req, res) => {
  const docs = await HomepageSection.find();
  await Promise.all(docs.map((d) => (d.published ? (d.set({ ...pick(d.published.toObject?.() || d.published), status: 'published' }), d.markModified('content'), d.save()) : d.deleteOne())));
  logActivity(req, 'cms.homepage.revert', 'HomepageSection', null);
  res.json({ sections: await HomepageSection.find().sort('order') });
});

/* ---- pages ---- */
export const listPages = asyncHandler(async (_req, res) => res.json({ pages: await Page.find().sort('slug') }));
export const savePage = asyncHandler(async (req, res) => {
  const body = cleanCms(req.body);
  delete body._id;
  body.slug = slugify(body.slug || body.title);
  const page = req.params.id ? await Page.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true }) : await Page.create(body);
  if (!page) throw new AppError('Page not found', 404);
  logActivity(req, req.params.id ? 'cms.page.update' : 'cms.page.create', 'Page', page._id, { slug: page.slug });
  res.status(req.params.id ? 200 : 201).json({ page });
});
export const deletePage = asyncHandler(async (req, res) => {
  await Page.findByIdAndDelete(req.params.id);
  logActivity(req, 'cms.page.delete', 'Page', req.params.id);
  res.json({ ok: true });
});
