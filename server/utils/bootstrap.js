// Runs on every API start so a fresh deploy (Render/Railway, no shell access) is usable right away:
// the store admin always matches ADMIN_EMAIL / ADMIN_PASSWORD, and an empty database gets the catalogue.
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

/** Exactly one admin: anyone else is demoted, the owner from the environment is created or updated. */
export async function ensureAdmin({ email = process.env.ADMIN_EMAIL || 'admin.fashionist@gmail.com', password = process.env.ADMIN_PASSWORD } = {}) {
  if (!password) return null;
  email = String(email).trim().toLowerCase();
  await User.updateMany({ role: 'admin', email: { $ne: email } }, { role: 'customer' });
  let admin = await User.findOne({ email });
  if (!admin) admin = new User({ name: 'Store Owner', email, phone: '03001234567' });
  admin.role = 'admin';
  admin.isEmailVerified = true;
  admin.isBlocked = false;
  await admin.setPassword(password);
  await admin.save();
  return admin;
}

export async function bootstrap({ log = console.log, warn = console.warn } = {}) {
  if (process.env.ADMIN_PASSWORD) {
    const admin = await ensureAdmin();
    log(`Admin ready: ${admin.email} (password = ADMIN_PASSWORD)`);
  } else warn('⚠ ADMIN_PASSWORD is not set — no admin account was created/updated');

  if (process.env.SEED_ON_EMPTY === 'false') return;
  const [products, categories] = await Promise.all([Product.estimatedDocumentCount(), Category.estimatedDocumentCount()]);
  if (products || categories) return;
  try {
    const { seed } = await import('../scripts/seed.js');
    await seed({ demo: false, log }); // catalogue, settings and CMS only — no demo customers or orders
    log('Empty database: catalogue and website content created');
  } catch (e) {
    warn(`⚠ Could not seed the empty database: ${e.message}`);
  }
}
