import mongoose from 'mongoose';

const { Mixed } = mongoose.Schema.Types;
const opts = { timestamps: true };

export const SECTION_TYPES = ['hero', 'categoryMosaic', 'productRail', 'shopTheLook', 'spotlight', 'bestSellers', 'promiseStrip', 'testimonials', 'lookbookGrid', 'newsletter', 'richText', 'banner'];

/** Single-document collections get a `current()` helper that creates the doc on first use. */
const singleton = (schema) => {
  schema.statics.current = async function () {
    return (await this.findOne()) || this.create({});
  };
  return schema;
};

export const SiteTheme = mongoose.model(
  'SiteTheme',
  singleton(
    new mongoose.Schema(
      {
        primaryColor: { type: String, default: '#E11D48', match: /^#[0-9a-fA-F]{6}$/ },
        accentColor: { type: String, default: '#B08D57', match: /^#[0-9a-fA-F]{6}$/ },
        fontPair: { type: String, enum: ['classic', 'bodoni', 'soft'], default: 'classic' },
        headingFont: { type: String, default: 'Cormorant Garamond' },
        bodyFont: { type: String, default: 'Manrope' },
        buttonStyle: { type: String, enum: ['sharp', 'pill'], default: 'sharp' },
        logo: String,
        favicon: String,
        darkModeEnabled: { type: Boolean, default: true },
      },
      opts
    )
  )
);

const link = { label: String, labelUr: String, link: String };
export const Navigation = mongoose.model(
  'Navigation',
  singleton(
    new mongoose.Schema(
      {
        header: [{ ...link, image: String, children: [link] }],
        footer: [{ title: String, titleUr: String, links: [link] }],
      },
      opts
    )
  )
);

export const AnnouncementBar = mongoose.model(
  'AnnouncementBar',
  singleton(
    new mongoose.Schema(
      {
        enabled: { type: Boolean, default: true },
        messages: [{ text: String, textUr: String }],
        background: { type: String, default: '#141414' },
        link: String,
      },
      opts
    )
  )
);

// Working copy lives on the document; `published` is the snapshot the storefront reads.
const sectionFields = {
  title: String,
  titleUr: String,
  subtitle: String,
  subtitleUr: String,
  content: { type: Mixed, default: {} },
  order: { type: Number, default: 0 },
  isVisible: { type: Boolean, default: true },
  startAt: Date,
  endAt: Date,
};
export const HomepageSection = mongoose.model(
  'HomepageSection',
  new mongoose.Schema(
    {
      type: { type: String, enum: SECTION_TYPES, required: true },
      ...sectionFields,
      status: { type: String, enum: ['draft', 'published'], default: 'draft' },
      published: { type: new mongoose.Schema({ ...sectionFields, at: Date }, { _id: false }), default: null },
    },
    { ...opts, minimize: false }
  )
);

export const Page = mongoose.model(
  'Page',
  new mongoose.Schema(
    {
      slug: { type: String, required: true, unique: true, lowercase: true, match: /^[a-z0-9-]+$/ },
      title: { type: String, required: true },
      titleUr: String,
      blocks: [{ type: Mixed }],
      metaTitle: String,
      metaDescription: String,
      isPublished: { type: Boolean, default: false },
    },
    opts
  )
);

export const Media = mongoose.model(
  'Media',
  new mongoose.Schema({ url: { type: String, required: true }, publicId: String, alt: String, folder: { type: String, default: 'general' } }, opts)
);
