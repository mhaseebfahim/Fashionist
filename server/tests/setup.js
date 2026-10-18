// Shared test harness: in-memory MongoDB replica set (transactions need one) + seeded users.
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256-signing';

let repl;
export let app;
export let models;

export async function start() {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(repl.getUri());
  app = (await import('../app.js')).default;
  models = {
    User: (await import('../models/User.js')).default,
    Product: (await import('../models/Product.js')).default,
    Category: (await import('../models/Category.js')).default,
    Order: (await import('../models/Order.js')).default,
    Coupon: (await import('../models/Coupon.js')).default,
    Settings: (await import('../models/Settings.js')).default,
  };
  await Promise.all(Object.values(models).map((M) => M.init()));
}

export async function stop() {
  await mongoose.disconnect();
  await repl?.stop();
}

export const api = () => request(app);

export async function makeUser(role = 'customer', email = `u${Math.random().toString(36).slice(2, 8)}@test.pk`) {
  const u = new models.User({ name: 'Test User', email, phone: '03001234567', role });
  await u.setPassword('Secret123');
  await u.save();
  const res = await api().post('/api/auth/login').send({ email, password: 'Secret123' });
  return { user: u, token: res.body.data.token, auth: { Authorization: `Bearer ${res.body.data.token}` } };
}

let skuN = 0;
export async function makeProduct({ stock = 5, price = 2000 } = {}) {
  const cat = (await models.Category.findOne({ slug: 'test' })) || (await models.Category.create({ name: 'Test', slug: 'test' }));
  const sku = `TST-${++skuN}-${Date.now().toString(36).toUpperCase()}`;
  const product = await models.Product.create({ title: `Test Product ${sku}`, slug: sku.toLowerCase(), category: cat._id, price, images: ['https://example.com/a.jpg'], variants: [{ sku, size: 'M', colour: 'Ink', stock }] });
  return { product, sku, category: cat };
}

export const address = { name: 'Ayesha Khan', phone: '03214567890', city: 'Lahore', area: 'DHA', street: 'House 12, Street 4' };
