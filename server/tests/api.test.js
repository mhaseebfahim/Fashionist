import { start, stop, api, makeUser, makeProduct, address, models } from './setup.js';

beforeAll(start);
afterAll(stop);

describe('auth', () => {
  test('register creates a customer; duplicate email → 409', async () => {
    const body = { name: 'Sana Tariq', email: 'sana@test.pk', phone: '03335556677', password: 'Secret123', role: 'admin' };
    const r1 = await api().post('/api/auth/register').send(body);
    expect(r1.status).toBe(201);
    expect(r1.body.success).toBe(true);
    expect(r1.body.data.user.role).toBe('customer'); // role in body is ignored
    expect(r1.body.data.user.passwordHash).toBeUndefined();
    const r2 = await api().post('/api/auth/register').send(body);
    expect(r2.status).toBe(409);
    expect(r2.body).toMatchObject({ success: false });
  });

  test('invalid registration body → 422 with field errors', async () => {
    const r = await api().post('/api/auth/register').send({ name: 'X', email: 'nope', phone: '123', password: 'weak' });
    expect(r.status).toBe(422);
    expect(r.body.errors.length).toBeGreaterThan(0);
  });

  test('wrong password → 401', async () => {
    const r = await api().post('/api/auth/login').send({ email: 'sana@test.pk', password: 'Wrong1234' });
    expect(r.status).toBe(401);
  });
});

describe('access control', () => {
  test('no token on a protected route → 401', async () => {
    expect((await api().get('/api/orders/my')).status).toBe(401);
    expect((await api().get('/api/admin/dashboard')).status).toBe(401);
  });

  test('customer on /api/admin → 403', async () => {
    const { auth } = await makeUser();
    expect((await api().get('/api/admin/dashboard').set(auth)).status).toBe(403);
  });

  test('customer cannot read another customer’s order → 404', async () => {
    const a = await makeUser();
    const b = await makeUser();
    const { sku } = await makeProduct();
    const o = await api().post('/api/orders').set(a.auth).send({ items: [{ sku, qty: 1 }], shippingAddress: address });
    expect(o.status).toBe(201);
    expect((await api().get(`/api/orders/${o.body.data.order._id}`).set(b.auth)).status).toBe(404);
  });
});

describe('checkout', () => {
  test('two parallel checkouts for the last unit → one 201, one 409, stock 0', async () => {
    const { product, sku } = await makeProduct({ stock: 1 });
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    const results = await Promise.all([a, b].map((u) => api().post('/api/orders').set(u.auth).send({ items: [{ sku, qty: 1 }], shippingAddress: address })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409).body.message).toBe(`Out of stock: ${sku}`);
    const fresh = await models.Product.findById(product._id);
    expect(fresh.variants[0].stock).toBe(0);
  });

  test('tampered client price is ignored; totals computed on the server', async () => {
    const { auth } = await makeUser();
    const { sku } = await makeProduct({ price: 3000 });
    const r = await api().post('/api/orders').set(auth).send({ items: [{ sku, qty: 2, price: 1 }], shippingAddress: address, subtotal: 2, total: 2 });
    expect(r.status).toBe(201);
    const o = r.body.data.order;
    expect(o.items[0].price).toBe(3000);
    expect(o.subtotal).toBe(6000);
    expect(o.shippingFee).toBe(0); // above free-shipping threshold (5000)
    expect(o.total).toBe(6000);
    expect(o.orderNumber).toMatch(/^FN-\d{6}-[0-9A-F]{4}$/);
  });

  test('more than 10 units of one variant → 422', async () => {
    const { auth } = await makeUser();
    const { sku } = await makeProduct({ stock: 50 });
    expect((await api().post('/api/orders').set(auth).send({ items: [{ sku, qty: 11 }], shippingAddress: address })).status).toBe(422);
  });

  test('expired coupon is rejected', async () => {
    const { auth } = await makeUser();
    const { sku } = await makeProduct();
    await models.Coupon.create({ code: 'OLD10', type: 'percent', value: 10, expiresAt: new Date(Date.now() - 86400000) });
    const v = await api().post('/api/orders/validate-coupon').set(auth).send({ code: 'OLD10', subtotal: 5000 });
    expect(v.status).toBe(400);
    expect(v.body.message).toMatch(/expired/);
    const o = await api().post('/api/orders').set(auth).send({ items: [{ sku, qty: 1 }], shippingAddress: address, couponCode: 'OLD10' });
    expect(o.status).toBe(400);
  });

  test('a customer can use a coupon only once', async () => {
    const { auth } = await makeUser();
    const { sku } = await makeProduct({ stock: 10 });
    await models.Coupon.create({ code: 'ONCE', type: 'fixed', value: 100 });
    expect((await api().post('/api/orders').set(auth).send({ items: [{ sku, qty: 1 }], shippingAddress: address, couponCode: 'ONCE' })).status).toBe(201);
    const again = await api().post('/api/orders').set(auth).send({ items: [{ sku, qty: 1 }], shippingAddress: address, couponCode: 'ONCE' });
    expect(again.status).toBe(400);
  });
});

describe('order status rules', () => {
  let admin;
  beforeAll(async () => {
    admin = await makeUser('admin');
  });
  const place = async (stock = 5) => {
    const c = await makeUser();
    const p = await makeProduct({ stock });
    const r = await api().post('/api/orders').set(c.auth).send({ items: [{ sku: p.sku, qty: 2 }], shippingAddress: address });
    return { ...p, customer: c, order: r.body.data.order };
  };

  test('Pending → Delivered is rejected with 400', async () => {
    const { order } = await place();
    const r = await api().patch(`/api/admin/orders/${order._id}/status`).set(admin.auth).send({ status: 'Delivered' });
    expect(r.status).toBe(400);
  });

  test('Shipped requires courier + tracking; Delivered marks Paid', async () => {
    const { order } = await place();
    const s = (body) => api().patch(`/api/admin/orders/${order._id}/status`).set(admin.auth).send(body);
    expect((await s({ status: 'Confirmed' })).status).toBe(200);
    expect((await s({ status: 'Shipped' })).status).toBe(400);
    expect((await s({ status: 'Shipped', courier: 'TCS', trackingNumber: 'TCS123' })).status).toBe(200);
    const d = await s({ status: 'Delivered' });
    expect(d.body.data.order.paymentStatus).toBe('Paid');
  });

  test('customer cancel restores stock', async () => {
    const { order, product, customer } = await place(5);
    expect((await models.Product.findById(product._id)).variants[0].stock).toBe(3);
    const r = await api().post(`/api/orders/${order._id}/cancel`).set(customer.auth);
    expect(r.status).toBe(200);
    expect((await models.Product.findById(product._id)).variants[0].stock).toBe(5);
  });

  test('return after 7 days → 400; within window → request created and approval restocks', async () => {
    const { order, product, customer } = await place(5);
    await models.Order.updateOne({ _id: order._id }, { status: 'Delivered', deliveredAt: new Date(Date.now() - 8 * 86400000) });
    const late = await api().post(`/api/orders/${order._id}/return`).set(customer.auth).send({ type: 'return', reason: 'Too small for me' });
    expect(late.status).toBe(400);

    await models.Order.updateOne({ _id: order._id }, { deliveredAt: new Date() });
    const ok = await api().post(`/api/orders/${order._id}/return`).set(customer.auth).send({ type: 'exchange', reason: 'Too small for me' });
    expect(ok.status).toBe(200);
    const decide = await api().patch(`/api/admin/returns/${order._id}`).set(admin.auth).send({ decision: 'Approved', note: 'OK' });
    expect(decide.status).toBe(200);
    expect(decide.body.data.order.status).toBe('Returned');
    expect((await models.Product.findById(product._id)).variants[0].stock).toBe(5);
  });
});

describe('admin catalogue & CMS', () => {
  let admin;
  beforeAll(async () => {
    admin = await makeUser('admin');
  });

  test('product with a brand-new attribute is saved and filterable', async () => {
    const { category } = await makeProduct();
    const r = await api()
      .post('/api/admin/products')
      .set(admin.auth)
      .send({ title: 'Tilla Shawl', category: category._id, price: 4990, images: ['https://example.com/s.jpg'], attributes: { embroideryStyle: 'Tilla', fabric: 'Pashmina' }, variants: [{ sku: 'SHAWL-1', size: 'One Size', colour: 'Gold', stock: 4 }] });
    expect(r.status).toBe(201);
    expect(r.body.data.product.attributes.embroideryStyle).toBe('Tilla');
    const list = await api().get('/api/products').query({ 'attr[fabric]': 'Pashmina' });
    expect(list.body.data.products.map((p) => p.slug)).toContain('tilla-shawl');
    expect(list.body.meta.total).toBe(1);
  });

  test('duplicate SKU → 409', async () => {
    const { category, sku } = await makeProduct();
    const r = await api().post('/api/admin/products').set(admin.auth).send({ title: 'Dup', category: category._id, price: 100, variants: [{ sku, stock: 1 }] });
    expect(r.status).toBe(409);
  });

  test('CMS publish changes /api/cms output (drafts stay private, script stripped)', async () => {
    const created = await api().post('/api/admin/cms/sections').set(admin.auth).send({ type: 'richText', title: 'Eid Note', content: { html: '<p>Eid Mubarak</p><script>alert(1)</script>' } });
    expect(created.status).toBe(201);
    let pub = await api().get('/api/cms');
    expect(pub.body.data.sections.find((s) => s.title === 'Eid Note')).toBeUndefined();

    expect((await api().post('/api/admin/cms/sections/publish').set(admin.auth)).status).toBe(200);
    pub = await api().get('/api/cms');
    const s = pub.body.data.sections.find((x) => x.title === 'Eid Note');
    expect(s).toBeDefined();
    expect(s.content.html).toBe('<p>Eid Mubarak</p>');

    await api().put(`/api/admin/cms/sections/${created.body.data.section._id}`).set(admin.auth).send({ title: 'Changed' });
    pub = await api().get('/api/cms');
    expect(pub.body.data.sections.find((x) => x.title === 'Eid Note')).toBeDefined(); // draft not yet live
  });

  test('every admin change writes ActivityLog', async () => {
    const r = await api().get('/api/admin/activity').set(admin.auth);
    const actions = r.body.data.logs.map((l) => l.action);
    expect(actions).toEqual(expect.arrayContaining(['product.create', 'cms.section.create', 'cms.homepage.publish', 'order.status', 'order.return']));
  });

  test('unknown route → 404 envelope; health ok', async () => {
    expect((await api().get('/api/nope')).body).toMatchObject({ success: false });
    expect((await api().get('/api/health')).body.data.ok).toBe(true);
  });
});
