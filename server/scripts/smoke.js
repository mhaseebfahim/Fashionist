// End-to-end smoke test: seeds an in-memory MongoDB replica set and calls every endpoint group.
// Run: npm run smoke   (uses mongodb-memory-server; no real database needed)
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.EMAIL_VERIFICATION_ENABLED = 'false'; // deterministic: ignore the local .env
process.env.JWT_SECRET ||= 'smoke-test-secret-long-enough-0123456789abcdef';
process.env.ADMIN_EMAIL = 'admin.fashionist@gmail.com';
process.env.ADMIN_PASSWORD = 'Admin@12345';

const repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
await mongoose.connect(repl.getUri());
const { seed } = await import('./seed.js');
await seed({ reset: true, log: () => {} });
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
const app = (await import('../app.js')).default;

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!cond) failures++;
};
const api = () => request(app);
const login = async (email, password) => (await api().post('/api/auth/login').send({ email, password })).body.data?.token;

try {
  // ---- storefront ----
  const cms = (await api().get('/api/cms')).body.data;
  check('CMS bundle', cms.sections.length === 11 && cms.navigation.header.length === 6 && cms.announcement.messages.length === 3, `${cms.sections.length} sections`);
  const prods = await api().get('/api/products').query({ category: 'bottomwear', sort: 'priceAsc', limit: 48 });
  check('Bottomwear subtree (jeans+trousers+shorts)', prods.body.meta.total === 15, `${prods.body.meta.total} products`);
  const p = prods.body.data.products;
  check('priceAsc sort', p.every((x, i) => !i || p[i - 1].price <= x.price));
  for (const q of ['jeans', 'pent', 'shert', 'tshirt', 'leather jacket', 'shir']) check(`search "${q}"`, (await api().get('/api/products').query({ q })).body.meta.total > 0);
  check('attr filter fit=Slim', (await api().get('/api/products').query({ 'attr[fit]': 'Slim' })).body.meta.total > 0);
  check('size/colour filter', (await api().get('/api/products').query({ size: 'L', colour: 'Black' })).body.meta.total > 0);
  check('new arrivals + sale', (await api().get('/api/products').query({ tag: 'new' })).body.meta.total > 0 && (await api().get('/api/products').query({ sale: 'true' })).body.data.products.every((x) => x.compareAtPrice > x.price));
  check('facets', (await api().get('/api/products/facets').query({ category: 'jeans' })).body.data.facets.sizes.length === 5);
  const slug = p[0].slug;
  const detail = (await api().get(`/api/products/${slug}`)).body.data;
  check('product detail', detail.product.slug === slug && Array.isArray(detail.related));
  check('product reviews', (await api().get(`/api/products/${detail.product._id}/reviews`)).body.data.summary !== undefined);
  check('public settings', (await api().get('/api/settings/public')).body.data.settings.freeShippingAbove === 5000);
  check('CMS page /pages/faq', (await api().get('/api/cms/pages/faq')).body.data.page.blocks.length > 0);
  check('auth config', (await api().get('/api/auth/config')).body.data.emailVerification === false);

  // ---- customer journey ----
  const reg = await api().post('/api/auth/register').send({ name: 'Zainab Ali', email: 'zainab.ali@gmail.com', phone: '03001239876', password: 'Secret123' });
  check('register @gmail.com', reg.status === 201);
  check('register @yahoo.com blocked', (await api().post('/api/auth/register').send({ name: 'X Y', email: 'x@yahoo.com', phone: '03001239876', password: 'Secret123' })).status === 422);
  const ctoken = await login('ayesha.fashionist@gmail.com', 'Customer@123');
  check('seeded customer login', !!ctoken);
  const C = { Authorization: `Bearer ${ctoken}` };
  const addr = await api().post('/api/auth/addresses').set(C).send({ label: 'Office', name: 'Ayesha Khan', phone: '03214567890', city: 'Multan', area: 'Cantt', street: 'Office 4, Mall Road', isDefault: true });
  check('add address', addr.status === 201 && addr.body.data.addresses.find((a) => a.isDefault).label === 'Office');
  const v = p.flatMap((x) => x.variants).find((x) => x.stock >= 2);
  check('wishlist toggle', (await api().post(`/api/wishlist/${p[0]._id}`).set(C)).body.data.added === true);
  check('cart save', (await api().put('/api/cart').set(C).send({ items: [{ product: p[0]._id, sku: v.sku, qty: 1 }] })).status === 200);
  const coupon = await api().post('/api/orders/validate-coupon').set(C).send({ code: 'WELCOME10', subtotal: 20000, city: 'Multan' });
  check('WELCOME10 capped at 1000', coupon.body.data?.discount === 1000);
  const fs = await api().post('/api/orders/validate-coupon').set(C).send({ code: 'FREESHIP', subtotal: 3000, city: 'Quetta' });
  check('FREESHIP zero delivery', fs.body.data?.shippingFee === 0);
  const order = await api().post('/api/orders').set(C).send({ items: [{ sku: v.sku, qty: 2 }], shippingAddress: { name: 'Ayesha', phone: '03214567890', city: 'Multan', street: 'House 12' }, couponCode: 'FREESHIP' });
  check('checkout', order.status === 201 && /^FN-\d{6}-[0-9A-F]{4}$/.test(order.body.data.order.orderNumber), order.body.message || order.body.data.order.orderNumber);
  const oid = order.body.data.order._id;
  check('my orders', (await api().get('/api/orders/my').set(C)).body.data.orders.some((o) => o._id === oid));
  check('order by number', (await api().get(`/api/orders/${order.body.data.order.orderNumber}`).set(C)).status === 200);
  const delivered = (await api().get('/api/orders/my').set(C)).body.data.orders.find((o) => o.status === 'Delivered' && !o.returnRequest?.status);
  if (delivered) {
    const fresh = Date.now() - new Date(delivered.deliveredAt).getTime() <= 7 * 864e5;
    const r = await api().post(`/api/orders/${delivered._id}/return`).set(C).send({ type: 'exchange', reason: 'Need a bigger size' });
    check(fresh ? 'return within 7 days accepted' : 'return after 7 days rejected', r.status === (fresh ? 200 : 400), r.body.message);
  }

  // ---- admin ----
  const atoken = await login('admin.fashionist@gmail.com', 'Admin@12345');
  const A = { Authorization: `Bearer ${atoken}` };
  check('admin login', !!atoken);
  const dash = (await api().get('/api/admin/dashboard').set(A)).body.data;
  check('dashboard', dash.kpis && dash.recentOrders.length > 0 && Array.isArray(dash.daily), `revenue ${dash.kpis?.revenue}`);
  check('notifications', (await api().get('/api/admin/notifications').set(A)).body.data.items.length > 0);
  check('global search', (await api().get('/api/admin/search').query({ q: 'oxford' }).set(A)).body.data.products.length > 0);
  for (const s of ['Confirmed']) check(`status → ${s}`, (await api().patch(`/api/admin/orders/${oid}/status`).set(A).send({ status: s })).status === 200);
  check('ship needs tracking', (await api().patch(`/api/admin/orders/${oid}/status`).set(A).send({ status: 'Shipped' })).status === 400);
  check('ship', (await api().patch(`/api/admin/orders/${oid}/status`).set(A).send({ status: 'Shipped', courier: 'TCS', trackingNumber: 'TCS1' })).status === 200);
  check('invoice', (await api().get(`/api/admin/orders/${oid}/invoice`).set(A)).body.data.store.name === 'Fashionist');
  const counts = (await api().get('/api/admin/orders').set(A)).body.data.counts;
  check('order tab counts', counts.All >= 13, JSON.stringify(counts));
  const pend = (await api().get('/api/admin/orders').query({ status: 'Pending' }).set(A)).body.data.orders.map((o) => o._id);
  const bulk = await api().post('/api/admin/orders/bulk-status').set(A).send({ ids: pend, status: 'Confirmed' });
  check('bulk status', bulk.body.data.updated === pend.length, `${bulk.body.data.updated}/${pend.length}`);
  check('orders CSV', (await api().get('/api/admin/orders/export').set(A)).text.startsWith('"orderNumber"'));
  const rets = (await api().get('/api/admin/returns').query({ status: 'Requested' }).set(A)).body.data.orders;
  check('returns list', rets.length >= 1);
  check('approve return', (await api().patch(`/api/admin/returns/${rets[0]._id}`).set(A).send({ decision: 'Approved', note: 'ok' })).body.data?.order.status === 'Returned');
  const cats = (await api().get('/api/admin/categories').set(A)).body.data.categories;
  check('23 categories', cats.length === 23);
  const newP = await api().post('/api/admin/products').set(A).send({ title: 'Smoke Test Tee', category: cats[0]._id, price: 3990, images: ['https://example.com/a.jpg'], attributes: { fabric: 'Cotton', newThing: 'yes' }, variants: [{ sku: 'SMOKE-1', size: 'M', colour: 'Ink', stock: 3 }], seo: { metaTitle: 'Smoke' } });
  check('create product', newP.status === 201, newP.body.message);
  check('bulk hide', (await api().post('/api/admin/products/bulk').set(A).send({ ids: [newP.body.data.product._id], action: 'hide' })).body.data.modified === 1);
  const csv = 'title,category,price,sku,size,colour,stock\nCSV Shirt,t-shirts,2990,CSV-1,M,Black,5\nBad Row,nowhere,0,,,,x\n';
  const prev = (await api().post('/api/admin/bulk-import/preview').set(A).send({ csv })).body.data;
  check('import preview', prev.valid === 1 && prev.invalid === 1);
  check('import', (await api().post('/api/admin/bulk-import').set(A).send({ csv })).body.data.created === 1);
  check('inventory + CSV', (await api().get('/api/admin/inventory').set(A)).body.data.rows.length > 100 && (await api().get('/api/admin/inventory/export').set(A)).status === 200);
  check('stock update', (await api().patch('/api/admin/inventory').set(A).send({ sku: 'SMOKE-1', stock: 9 })).status === 200);
  check('reorder categories', (await api().patch('/api/admin/categories/reorder').set(A).send({ items: [{ id: cats[1]._id, sortOrder: 0 }, { id: cats[0]._id, sortOrder: 1 }] })).status === 200);
  const cust = (await api().get('/api/admin/customers').set(A)).body.data.customers;
  check('customers', cust.length >= 4);
  check('customer profile', (await api().get(`/api/admin/customers/${cust[0]._id}`).set(A)).body.data.orders !== undefined);
  check('coupons with stats', (await api().get('/api/admin/coupons').set(A)).body.data.coupons.find((c) => c.code === 'FREESHIP').stats.orders >= 1);
  check('new coupon', (await api().post('/api/admin/coupons').set(A).send({ code: 'EID2026', type: 'percent', value: 15, maxDiscount: 2000 })).status === 201);
  check('reviews filter', (await api().get('/api/admin/reviews').query({ rating: 5 }).set(A)).body.data.reviews.every((r) => r.rating === 5));
  const rep = (await api().get('/api/admin/reports').set(A)).body.data;
  check('reports', rep.byDay.length > 0 && rep.byCategory.length > 0 && rep.byProduct.length > 0);
  check('report CSV', (await api().get('/api/admin/reports/export').query({ type: 'category' }).set(A)).text.includes('category'));
  check('settings', (await api().put('/api/admin/settings').set(A).send({ shippingRates: { Multan: 150, Lahore: 180 }, emailNotifications: { lowStock: false } })).body.data.settings.shippingRates.Lahore === 180);
  check('media add URL', (await api().post('/api/admin/media').set(A).send({ url: 'https://example.com/x.jpg', alt: 'x' })).status === 201);
  check('upload w/o Cloudinary → 400', (await api().post('/api/admin/media/upload').set(A)).status === 400);
  check('theme save', (await api().put('/api/admin/cms/theme').set(A).send({ primaryColor: '#9F1239', buttonStyle: 'pill' })).body.data.theme.buttonStyle === 'pill');
  check('theme bad colour → 422', (await api().put('/api/admin/cms/theme').set(A).send({ primaryColor: 'red' })).status === 422);
  check('theme reset', (await api().post('/api/admin/cms/theme/reset').set(A)).body.data.theme.primaryColor === '#E11D48');
  check('navigation save', (await api().put('/api/admin/cms/navigation').set(A).send({ header: cms.navigation.header.slice(0, 3), footer: cms.navigation.footer })).body.data.navigation.header.length === 3);
  check('announcement save', (await api().put('/api/admin/cms/announcement').set(A).send({ enabled: false, messages: [{ text: 'Eid sale' }], background: '#141414' })).status === 200);
  const secs = (await api().get('/api/admin/cms/sections').set(A)).body.data.sections;
  const banner = (await api().post('/api/admin/cms/sections').set(A).send({ type: 'banner', title: 'Eid Campaign', content: { image: 'https://example.com/b.jpg', link: '/shop' }, endAt: new Date(Date.now() + 864e5).toISOString() })).body.data.section;
  check('reorder sections', (await api().patch('/api/admin/cms/sections/reorder').set(A).send({ ids: [banner._id, ...secs.map((s) => s._id)] })).status === 200);
  check('draft hidden publicly', !(await api().get('/api/cms')).body.data.sections.some((s) => s._id === banner._id));
  check('preview shows draft', (await api().get('/api/admin/cms/preview').set(A)).body.data.sections[0]._id === banner._id);
  check('duplicate', (await api().post(`/api/admin/cms/sections/${secs[0]._id}/duplicate`).set(A)).status === 201);
  check('publish', (await api().post('/api/admin/cms/sections/publish').set(A)).status === 200);
  check('published live first', (await api().get('/api/cms')).body.data.sections[0]._id === banner._id);
  await api().put(`/api/admin/cms/sections/${banner._id}`).set(A).send({ title: 'Changed' });
  check('revert', (await api().post('/api/admin/cms/sections/revert').set(A)).body.data.sections.find((s) => s._id === banner._id).title === 'Eid Campaign');
  const page = await api().post('/api/admin/cms/pages').set(A).send({ title: 'Size Guide', blocks: [{ type: 'paragraph', text: '<script>x</script>Measure chest' }], isPublished: true });
  check('page create (sanitised)', page.status === 201 && page.body.data.page.blocks[0].text === 'xMeasure chest');
  check('activity log', (await api().get('/api/admin/activity').set(A)).body.data.logs.length > 20);
  check('customer → admin 403', (await api().get('/api/admin/products').set(C)).status === 403);
} catch (e) {
  failures++;
  console.error(e);
} finally {
  await mongoose.disconnect();
  await repl.stop();
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
