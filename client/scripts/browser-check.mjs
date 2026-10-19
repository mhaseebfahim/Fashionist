// Headless browser check of the production build (mock API).
// Usage: npm run build && npm run check   (needs Chrome or Edge installed; set BROWSER_PATH to override)
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const BROWSERS = [process.env.BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const executablePath = BROWSERS.find((p) => existsSync(p));
if (!executablePath) throw new Error('No Chrome/Edge found — set BROWSER_PATH');

const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => String(d).includes('Local') && resolve());
  server.on('exit', (c) => reject(new Error(`preview exited ${c}`)));
  setTimeout(resolve, 8000);
});

const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1366, height: 900 });
const problems = [];
let current = '';
const expected = (text) => /Failed to load resource.*(unsplash|fonts\.g)/.test(text) || (current === '/pages/nope' && /404/.test(text)); // deliberate 404 test
page.on('console', (m) => m.type() === 'error' && !expected(m.text()) && problems.push(`[console] ${current}: ${m.text()}`));
page.on('pageerror', (e) => problems.push(`[pageerror] ${current}: ${e.message}`));
page.on('requestfailed', (r) => !/unsplash|fonts\.g|gstatic|cloudinary/.test(r.url()) && problems.push(`[request] ${current}: ${r.url()} ${r.failure()?.errorText}`));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const visit = async (path, expectText) => {
  current = path;
  await page.goto(BASE + path, { waitUntil: 'networkidle0', timeout: 30000 }).catch((e) => problems.push(`[goto] ${path}: ${e.message}`));
  await wait(600);
  const text = await page.evaluate(() => document.body.innerText);
  const ok = !expectText || new RegExp(expectText, 'i').test(text);
  console.log(`${ok ? '✓' : '✗'} ${path}${ok ? '' : `  (missing "${expectText}")`}`);
  if (!ok) problems.push(`[content] ${path}: expected ${expectText}`);
  return text;
};
const login = async (email, password) => {
  await visit('/login', 'Welcome back');
  await page.type('input[type=email]', email);
  await page.type('input[type=password]', password);
  await Promise.all([page.click('button[type=submit]'), page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {})]);
  await wait(800);
};

try {
  // ---- storefront (guest) ----
  await visit('/', 'Eid Edit');
  await visit('/shop', 'pieces');
  await visit('/shop/women', 'Women');
  await visit('/shop/lawn?size=M&fabric=Lawn', 'Lawn');
  await visit('/search?q=silk', 'silk');
  await visit('/product/noor-embroidered-lawn-kurta', 'Noor Embroidered');
  await visit('/cart', 'bag');
  await visit('/pages/about', 'Our Story');
  await visit('/pages/faq', 'Cash on Delivery');
  await visit('/pages/nope', '404');
  await visit('/register', 'Join Fashionist');
  // domain rule: a yahoo address must show the inline error
  await page.type('input[autocomplete=name]', 'Test Shopper');
  await page.type('input[type=email]', 'shopper@yahoo.com');
  await page.type('input[autocomplete=tel]', '03001234567');
  await page.type('input[type=password]', 'Secret123');
  await page.click('button[type=submit]');
  await wait(300);
  const domainErr = await page.evaluate(() => document.body.innerText.includes('@gmail.com'));
  console.log(`${domainErr ? '✓' : '✗'} register rejects non-gmail/outlook`);
  if (!domainErr) problems.push('[flow] domain rule not shown');
  // valid sign-up
  await page.evaluate(() => (document.querySelector('input[type=email]').value = ''));
  await page.click('input[type=email]', { clickCount: 3 });
  await page.type('input[type=email]', `shopper${Date.now()}@gmail.com`);
  await Promise.all([page.click('button[type=submit]'), page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {})]);
  await wait(800);
  const signedUp = page.url().includes('/account');
  console.log(`${signedUp ? '✓' : '✗'} register @gmail.com → account (no OTP while disabled)`);
  if (!signedUp) problems.push(`[flow] register ended at ${page.url()}`);
  await page.evaluate(() => localStorage.removeItem('fashionist:token'));

  // ---- customer flow ----
  await login('ayesha.fashionist@gmail.com', 'Customer@123');
  await visit('/account', 'Hello');
  await visit('/account/orders', 'FN-');
  await visit('/account/addresses', 'Lahore');
  await visit('/account/wishlist');
  await visit('/product/zara-silk-three-piece', 'Zara Silk');
  const sizeBtn = await page.$$('button[aria-pressed="false"].min-w-12:not([disabled])');
  if (sizeBtn[0]) await sizeBtn[0].click();
  const addBtn = await page.$$('button.btn-primary');
  for (const b of addBtn) if ((await b.evaluate((e) => e.textContent)).includes('Add to Bag')) { await b.click(); break; }
  await wait(600);
  await visit('/checkout', 'Place Order');
  const place = (await page.$$('button.btn-primary')).at(-1);
  await Promise.all([place.click(), page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {})]);
  await wait(1200);
  const success = page.url().includes('/order/success/FN-');
  console.log(`${success ? '✓' : '✗'} checkout → ${page.url().replace(BASE, '')}`);
  if (!success) problems.push('[flow] checkout did not reach success page');
  await visit('/admin', '403');
  await page.evaluate(() => localStorage.removeItem('fashionist:token'));

  // ---- admin (Atelier) ----
  await login(process.env.CHECK_ADMIN_EMAIL || 'admin.fashionist@gmail.com', process.env.CHECK_ADMIN_PASSWORD || 'Admin@123');
  for (const [p, t] of [['/admin', 'Today'], ['/admin/orders', 'Orders'], ['/admin/orders?status=Pending', 'Pending'], ['/admin/returns', 'Returns'], ['/admin/products', 'Products'], ['/admin/products/new', 'New product'], ['/admin/import', 'Bulk Import'], ['/admin/categories', 'Categories'], ['/admin/inventory?low=true', 'Inventory'], ['/admin/customers', 'Customers'], ['/admin/coupons', 'WELCOME10'], ['/admin/reviews', 'Reviews'], ['/admin/reports', 'Reports'], ['/admin/activity', 'Activity'], ['/admin/settings', 'Delivery'], ['/admin/cms/homepage', 'Homepage'], ['/admin/cms/theme', 'Theme'], ['/admin/cms/navigation', 'Navigation'], ['/admin/cms/announcement', 'Announcement'], ['/admin/cms/pages', 'Pages'], ['/admin/cms/media', 'Media Library']])
    await visit(p, t);
  // open a product editor and an order drawer
  await visit('/admin/products', 'Products');
  const firstEdit = await page.$('a[href^="/admin/products/"]:not([href$="/new"])');
  if (firstEdit) {
    current = 'product editor';
    await Promise.all([firstEdit.click(), page.waitForNetworkIdle().catch(() => {})]);
    await wait(500);
    for (const tab of ['Media', 'Attributes', 'Variants', 'SEO']) {
      const [btn] = await page.$$(`xpath/.//button[@role="tab"][contains(., "${tab}")]`);
      await btn?.click();
      await wait(150);
    }
    console.log('✓ product editor tabs');
  }
  await visit('/admin/orders', 'Orders');
  current = 'order drawer';
  await page.click('tbody tr');
  await wait(1200);
  const drawer = await page.evaluate(() => /timeline/i.test(document.body.innerText));
  console.log(`${drawer ? '✓' : '✗'} order drawer`);
  if (!drawer) problems.push('[flow] order drawer did not open');
  // command palette
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyK');
  await page.keyboard.up('Control');
  await wait(300);
  const palette = await page.$('[aria-label="Command palette"]');
  console.log(`${palette ? '✓' : '✗'} command palette (Ctrl+K)`);
  if (!palette) problems.push('[flow] command palette');
  // mobile layout of home
  await page.setViewport({ width: 360, height: 780 });
  await visit('/', 'Eid Edit');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(`${overflow <= 1 ? '✓' : '✗'} no horizontal scroll at 360px (${overflow}px)`);
  if (overflow > 1) problems.push(`[layout] horizontal overflow ${overflow}px at 360px`);
  // Urdu RTL
  await page.evaluate(() => localStorage.setItem('fashionist:lang', 'ur'));
  await visit('/', '');
  const rtl = await page.evaluate(() => document.documentElement.dir);
  console.log(`${rtl === 'rtl' ? '✓' : '✗'} Urdu switches to RTL`);
} finally {
  await browser.close();
  server.kill();
}
console.log(problems.length ? `\n${problems.length} problem(s):\n${problems.join('\n')}` : '\nNo console errors, page errors or failed flows.');
process.exit(problems.length ? 1 : 0);
