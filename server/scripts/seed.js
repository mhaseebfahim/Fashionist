// Seeds Fashionist. Re-runnable: without flags it only fills empty collections;
// `npm run seed -- --reset` wipes and recreates all demo data (the admin is always upserted).
import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Coupon from '../models/Coupon.js';
import Settings from '../models/Settings.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import ActivityLog from '../models/ActivityLog.js';
import { SiteTheme, Navigation, AnnouncementBar, HomepageSection, Page, Media } from '../models/Cms.js';
import * as data from '../../client/src/services/mock/seedData.js';
import { cmsDefaults } from '../../client/src/cms/defaults.js';
import { ensureAdmin } from '../utils/bootstrap.js';

/** `demo: false` (used on a fresh production deploy) skips the sample customers, orders and reviews. */
export async function seed({ reset = false, demo = true, log = console.log } = {}) {
  const { ADMIN_EMAIL = 'admin.fashionist@gmail.com', ADMIN_PASSWORD } = process.env;
  if (!ADMIN_PASSWORD) throw new Error('Set ADMIN_PASSWORD in server/.env');

  if (reset) {
    await Promise.all([Category, Product, Order, Review, Coupon, Settings, Cart, Wishlist, ActivityLog, SiteTheme, Navigation, AnnouncementBar, HomepageSection, Page, Media].map((M) => M.deleteMany({})));
    await User.deleteMany({ role: 'customer' });
    log('Reset: cleared demo collections');
  }

  await ensureAdmin({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

  const customers = [];
  for (const c of demo ? data.customers : []) {
    let u = await User.findOne({ email: c.email });
    if (!u) {
      u = new User({ ...c, role: 'customer', isEmailVerified: true });
      await u.setPassword(data.CUSTOMER_PASSWORD);
      await u.save();
    }
    customers.push(u);
  }

  if (!(await Category.countDocuments())) {
    const bySlug = {};
    for (const c of data.categories) bySlug[c.slug] = await Category.create({ ...c, parent: c.parent ? bySlug[c.parent]._id : null });
    log(`Categories: ${data.categories.length}`);
  }
  if (!(await Product.countDocuments())) {
    const cats = Object.fromEntries((await Category.find()).map((c) => [c.slug, c._id]));
    // Staggered dates so 'newest' lists the catalogue in its intended order.
    const products = await Product.insertMany(data.products.map((p, i) => ({ ...p, category: cats[p.category], createdAt: new Date(Date.now() - i * 3600000) })));
    log(`Products: ${products.length}`);
  }
  if (demo && !(await Order.countDocuments())) {
    const products = await Product.find().sort({ _id: 1 }).lean();
    const orders = await Order.insertMany(data.makeOrders(products, customers.map((c) => c.toObject())));
    const reviews = await Review.insertMany(data.makeReviews(orders.map((o) => o.toObject())));
    for (const pid of new Set(reviews.map((r) => String(r.product)))) {
      const rs = reviews.filter((r) => String(r.product) === pid);
      await Product.updateOne({ _id: pid }, { rating: Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10, numReviews: rs.length });
    }
    log(`Orders: ${orders.length}, reviews: ${reviews.length}`);
  }
  if (!(await Coupon.countDocuments())) await Coupon.insertMany(data.coupons);
  // Real stores start without the demo riders — the admin adds their own in Settings.
  if (!(await Settings.countDocuments())) await Settings.create(demo ? data.settings : { ...data.settings, sameDay: { ...data.settings.sameDay, riders: [] } });

  // CMS defaults
  if (!(await SiteTheme.countDocuments())) await SiteTheme.create(cmsDefaults.theme);
  if (!(await Navigation.countDocuments())) await Navigation.create(cmsDefaults.navigation);
  if (!(await AnnouncementBar.countDocuments())) await AnnouncementBar.create(cmsDefaults.announcement);
  if (!(await Page.countDocuments())) await Page.insertMany(cmsDefaults.pages);
  if (!(await HomepageSection.countDocuments())) {
    const bySlug = Object.fromEntries((await Product.find().select('slug').lean()).map((p) => [p.slug, String(p._id)]));
    const at = new Date();
    await HomepageSection.insertMany(
      cmsDefaults.sections.map((s) => {
        const content = s.type === 'shopTheLook' ? { ...s.content, hotspots: s.content.hotspots.map((h) => ({ ...h, productId: bySlug[h.productSlug] })) } : s.content;
        const fields = { ...s, content };
        return { ...fields, status: 'published', published: { ...fields, at } };
      })
    );
    log(`Homepage sections: ${cmsDefaults.sections.length}`);
  }
  // Never print the admin password — it lives in server/.env.
  log(`Done. Admin: ${ADMIN_EMAIL} (password = ADMIN_PASSWORD in server/.env) · customers: ${data.customers.map((c) => c.email).join(', ')} (password ${data.CUSTOMER_PASSWORD})`);
}

// Run directly: node scripts/seed.js [--reset]
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/seed.js')) {
  await connectDB();
  try {
    await seed({ reset: process.argv.includes('--reset') });
  } finally {
    await mongoose.disconnect();
  }
}
