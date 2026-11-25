# ◆ FASHIONIST — *Wear Your Story*

**Fashionist** is a single-store fashion e-commerce website for Pakistan. One store owner (the **admin**) runs everything from the **Fashionist Atelier** console; customers browse in **English or Urdu (RTL)** and pay **Cash on Delivery (PKR)** anywhere in Pakistan.

It is a MERN monorepo:

| Part | Stack | Deploy target |
| --- | --- | --- |
| `client/` – storefront + Atelier admin + CMS | React 18 · Vite 6 · React Router 6 · Redux Toolkit · Axios · Tailwind CSS 3 · react-i18next · framer-motion · Recharts · lucide-react · react-hot-toast | **Vercel** |
| `server/` – REST API | Node 20 · Express 4 · Mongoose 8 · JWT (HS256) · bcryptjs · helmet · cors · express-rate-limit · express-validator · express-mongo-sanitize · compression · multer + Cloudinary · Nodemailer / Resend · sanitize-html · json2csv | **Render** or **Railway** |
| Database | MongoDB 7+ (**replica set** — Atlas works out of the box) | **MongoDB Atlas** |

---

## Contents
1. [What is inside](#1-what-is-inside)
2. [Requirements](#2-requirements)
3. [Run it locally (3 ways)](#3-run-it-locally)
4. [Commands](#4-commands)
5. [Environment variables](#5-environment-variables)
6. [MongoDB Atlas setup](#6-mongodb-atlas-setup)
7. [Email: OTP verification, Resend or SMTP](#7-email-otp-verification-resend-or-smtp)
8. [Google sign-in (optional)](#8-google-sign-in-optional)
9. [Cloudinary (image uploads)](#9-cloudinary-image-uploads)
10. [Deploy: backend on Render / Railway](#10-deploy-backend-render-or-railway)
11. [Deploy: frontend on Vercel](#11-deploy-frontend-on-vercel)
12. [Backup & restore (mongodump / mongorestore)](#12-backup--restore)
13. [Demo accounts](#13-demo-accounts)
14. [Business rules](#14-business-rules-enforced-on-the-server)
15. [Admin routes & API reference](#15-admin-routes--api-reference)
16. [Security, performance & quality](#16-security-performance--quality)
17. [Tests](#17-tests)
18. [Project history](#18-project-history)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. What is inside

**Storefront** (`/`): editorial homepage built entirely from CMS sections (hero slider, category mosaic, product rails, shop-the-look hotspots, spotlight, most-loved tabs, promise strip, testimonials, lookbook, newsletter, rich text, banner) · mega-menu · full-screen search with voice input (en-PK / ur-PK) · shop/category pages with URL-synced filters (category subtree, price, size, colour, fabric, in-stock), sort, 2/3/4 grid, load-more + pagination · product page with zoom, lightbox, variant stock, delivery estimate by city, size guide, reviews · cart drawer + page · one-page checkout (saved addresses, Pakistani cities, 03XX validation, coupons, live delivery fee) · order success · account (orders + tracker, cancel, return/exchange within 7 days, reviews after delivery, wishlist, address book, profile, language) · auth (login, register, **email OTP verification**, forgot/reset password, optional Google) · CMS pages (About, Contact, FAQ, Shipping, Returns, Privacy) · 404/403 · dark mode · Urdu RTL with Noto Nastaliq.

**Fashionist Atelier** (`/admin`, admin only): light ivory workspace, slim icon rail (expands on hover; drawer on mobile), top bar with page title, **Ctrl/⌘ + K command palette** (pages, actions, live search of orders/products/customers), notifications bell (new orders, low stock, return requests), View store, avatar menu.

| Module | What it does |
| --- | --- |
| Overview | Greeting, KPIs (today, month, orders, AOV, new customers, low stock), revenue area chart, status donut, top products, recent orders, low-stock list, date-range picker |
| Orders | Status tabs with counts, filters (date, city, order no./phone/name), detail drawer (items, customer, address, timeline), rule-based actions (Confirm → Ship with courier + tracking → Deliver, Cancel), invoice & packing slip print pages, bulk status, CSV export |
| Returns | Requested / Approved / Rejected tabs, approve (restocks) or reject with a note |
| Products | Table with search + filters, live toggle, bulk activate / hide / delete / change category. Editor tabs: Basics (EN/UR), Media (drag-drop upload to Cloudinary, reorder, cover), Attributes (any key/value), Variants (size × colour grid generator, auto-SKU), SEO — with live product-card preview |
| Bulk Import | CSV template, preview with per-row errors, import valid rows |
| Categories | Tree with drag-to-reorder, EN/UR names, image, parent, active toggle |
| Inventory | Per-variant stock with inline editing, low/out highlights, CSV export |
| Customers | Search, profile drawer (orders, total spend, addresses), block/unblock |
| Coupons | Percent / fixed / free-delivery, max discount, min order, expiry, usage limit, usage stats |
| Reviews | Approve / hide, filter by rating and status |
| Reports | Sales by day / category / product, charts, date range, CSV export |
| Settings | Store info & logo, delivery fee per city + default + free-delivery threshold, low-stock level, return window, email notification switches |
| Activity Log | Who did what and when, filter by area and date (every admin change is logged) |
| **CMS** | **Homepage Builder** (drag-drop sections, show/hide, duplicate, delete, add-section picker with thumbnails, live preview iframe with Desktop/Tablet/Mobile, per-type forms with EN/UR text, media-library images, product picker, click-to-place hotspot editor, schedule start/end, Save draft · Preview · Publish · Revert) · **Theme** (colours, 3 approved font pairs, sharp/pill buttons, logo, favicon, dark-mode switch, reset) · **Navigation** (header with mega-menu images, footer columns) · **Announcement Bar** · **Pages** (block builder: heading, paragraph, image, two-column, FAQ) · **Media Library** |

The storefront reads theme, navigation, announcement and homepage from `GET /api/cms` (cached in Redux, with built-in defaults as fallback), so anything the admin publishes appears **immediately, without a code change**.

---

## 2. Requirements

- **Node.js 20+** and npm 10+ (`node -v`)
- **MongoDB 7+ as a replica set** — checkout and cancellations use transactions. MongoDB **Atlas** (free M0 is fine) is already a replica set. *Not needed* for the mock mode or the in-memory mode below.
- Optional: Cloudinary account (image uploads), Resend or SMTP account (emails), Google Cloud OAuth client (Google sign-in).
- Chrome or Edge only if you run the automated browser check.

---

## 3. Run it locally

```bash
git clone <your-repo-url> fashionist && cd fashionist
npm run install:all          # installs server/ and client/
```

### A) Storefront only — demo data in the browser (no backend, no database)
```bash
cp client/.env.example client/.env      # VITE_USE_MOCK=true
npm run dev:client                      # http://localhost:5173
```
Everything works (cart, checkout, account, the whole Atelier and CMS) against a realistic in-browser mock of the API. Data is saved in the browser's localStorage.

### B) Full stack, no Atlas yet — real API on an in-memory MongoDB
```bash
npm run dev:server:memory               # terminal 1 → http://localhost:5000/api (fresh seed every start)
# client/.env:  VITE_USE_MOCK=false   VITE_API_URL=http://localhost:5000/api
npm run dev:client                      # terminal 2 → http://localhost:5173
```
The first start downloads a MongoDB binary (~600 MB, once). Data is lost when you stop it.

### C) Full stack with MongoDB Atlas (production-like)
```bash
cp server/.env.example server/.env      # fill MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD …
npm run seed                            # creates the admin + demo catalogue + CMS (safe to re-run)
npm run dev:server                      # http://localhost:5000/api
# client/.env:  VITE_USE_MOCK=false   VITE_API_URL=http://localhost:5000/api
npm run dev:client
```

> **Mock vs real data.** The project currently ships with demo products. When Atlas is attached and you add products from **Atelier → Products** (or Bulk Import), they appear on the store immediately. To start with an empty catalogue, delete the demo products in the admin (bulk delete) — or seed once and edit.

---

## 4. Commands

| Where | Command | What it does |
| --- | --- | --- |
| root | `npm run install:all` | Install server + client dependencies |
| root | `npm run dev:server` | API with nodemon-style watch (needs `server/.env`) |
| root | `npm run dev:server:memory` | API on an in-memory, auto-seeded MongoDB |
| root | `npm run dev:client` | Vite dev server on :5173 |
| root | `npm run seed` | Seed admin, demo catalogue, orders, coupons, CMS (`npm --prefix server run seed -- --reset` wipes demo data first) |
| root | `npm test` | Server unit + API tests (Jest) and the 69-check end-to-end smoke test |
| root | `npm run check` | Build the client and run the headless-browser check of every page |
| server | `npm start` | **Production start** (`node server.js`) |
| client | `npm run build` / `npm run preview` | Production build to `client/dist` / serve it on :4173 |

**Run backend:** `cd server && npm run dev` (local) · `npm start` (production)
**Run frontend:** `cd client && npm run dev` (local) · `npm run build` (production)

---

## 5. Environment variables

### Server — `server/.env` (template: `server/.env.example`)
| Key | Required | Example / notes |
| --- | --- | --- |
| `PORT` | – | `5000` (Render/Railway set this automatically) |
| `NODE_ENV` | ✓ in prod | `production` |
| `MONGO_URI` | ✓ | `mongodb+srv://user:pass@cluster0.xxxx.mongodb.net/fashionist?retryWrites=true&w=majority` |
| `JWT_SECRET` | ✓ | 32+ random chars: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | – | `7d` |
| `CLIENT_URL` | ✓ | Allowed storefront origins, comma-separated, no trailing slash: `http://localhost:5173,https://fashionist.store,https://www.fashionist.store` |
| `SITE_URL` | ✓ in prod | `https://fashionist.store` — used in password-reset links and `sitemap.xml` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | ✓ for seed | The single store admin, e.g. `admin.fashionist@gmail.com` + a 12+ character password. Seed creates/updates it. For safety the admin can **not** use "Forgot password" or Google sign-in — change the password in env and run `npm run seed` |
| `EMAIL_VERIFICATION_ENABLED` | – | `false` now. Set `true` once email delivery works (see §7) |
| `ALLOWED_EMAIL_DOMAINS` | – | `gmail.com,outlook.com` — only these may register |
| `EMAIL_PROVIDER` | – | `console` (log only) · `resend` · `smtp` |
| `MAIL_FROM` | with email | `Fashionist <no-reply@yourdomain.com>` (Resend needs a verified domain) |
| `RESEND_API_KEY` | resend | `re_...` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` | smtp | e.g. `smtp.gmail.com`, `587`, Gmail address, Gmail **App Password** |
| `CLOUDINARY_CLOUD_NAME` `CLOUDINARY_API_KEY` `CLOUDINARY_API_SECRET` | for uploads | From the Cloudinary dashboard |
| `GOOGLE_CLIENT_ID` | – | Shows the "Continue with Google" button when set |

The server **refuses to start** without `MONGO_URI` or `JWT_SECRET`.

### Client — `client/.env` (template: `client/.env.example`)
| Key | Example / notes |
| --- | --- |
| `VITE_USE_MOCK` | `true` = demo data in the browser, no backend · `false` = real API |
| `VITE_API_URL` | `http://localhost:5000/api` or `https://fashionist-api.onrender.com/api` (include `/api`) |
| `VITE_MOCK_EMAIL_VERIFICATION` | `true` to try the OTP sign-up in mock mode (code shown in a toast) |

Vite bakes `VITE_*` values in at **build time** — after changing them on Vercel, redeploy.

---

## 6. MongoDB Atlas setup

1. Create a free account at <https://www.mongodb.com/cloud/atlas> → **Build a Database** → **M0 Free** → choose a region close to your API (e.g. *Mumbai* or *Singapore*).
2. **Database Access** → *Add New Database User* → username + strong password (role: *Read and write to any database*).
3. **Network Access** → *Add IP Address* → `0.0.0.0/0` (Render/Railway use changing IPs). Restrict later if you use static egress IPs.
4. **Connect → Drivers** → copy the `mongodb+srv://` string, replace `<password>`, and add the database name: `.../fashionist?retryWrites=true&w=majority`.
5. Put it in `server/.env` as `MONGO_URI`, then run `npm run seed` once from your computer.

Atlas clusters are replica sets, so transactions (checkout, cancel, returns) work without any extra setup.

---

## 7. Email: OTP verification, Resend or SMTP

**Current setup:** `EMAIL_PROVIDER=resend` and `EMAIL_VERIFICATION_ENABLED=true`. **Safety switch:** in production OTP only turns on once `RESEND_API_KEY` (or `SMTP_HOST`) is present — until then sign-ups work without a code and the API logs a warning. In development without a key, emails (including the OTP code in the subject) are printed in the API console. Sign-up is still restricted to **@gmail.com** and **@outlook.com** (strict match, lower-cased, dots kept). Change the list with `ALLOWED_EMAIL_DOMAINS`.

**When you are ready:**

*Option 1 — Resend (recommended):* create an account at <https://resend.com>, verify your domain (DNS records), create an API key, then set:
```
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM=Fashionist <no-reply@yourdomain.com>
EMAIL_VERIFICATION_ENABLED=true
```
*Option 2 — Nodemailer SMTP (e.g. Gmail):* enable 2-Step Verification on the Gmail account → create an **App Password** → set:
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourstore@gmail.com
SMTP_PASS=<16-char app password>
MAIL_FROM=Fashionist <yourstore@gmail.com>
EMAIL_VERIFICATION_ENABLED=true
```
Restart/redeploy the API. The flow then becomes: Register → a **6-digit code** is emailed (valid 10 min, 5 attempts, resend after 60 s) → `/verify-email` page → verified + logged in. Unverified users who try to log in are sent to the verification page with a fresh code. Only a hash of the code is stored. The same provider sends order confirmations, status updates, password resets and low-stock alerts (each switchable in Atelier → Settings).

---

## 8. Google sign-in (optional)

1. <https://console.cloud.google.com> → APIs & Services → **Credentials** → *Create OAuth client ID* → **Web application**.
2. **Authorised JavaScript origins:** `http://localhost:5173`, `https://<your-vercel-domain>`.
3. Copy the client ID into the API env as `GOOGLE_CLIENT_ID` and redeploy. The button appears automatically on Login/Register (the client reads `/api/auth/config`). Google accounts still have to match the allowed domains, and they skip OTP because Google has already verified the email.

---

## 9. Cloudinary (image uploads)

Create a free account at <https://cloudinary.com> → **Settings → API Keys** → copy **Cloud name, API key, API secret** (click the 👁 icon — never copy the masked `*****`) into the API env as `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. *Or* use one variable `CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>` (value only — do not repeat `CLOUDINARY_URL=` inside it). The API log shows `Cloudinary: ready` at start-up when it is configured. Uploads (product media, CMS images, logo) go to `fashionist/<folder>` and are served with `f_auto,q_auto` (automatic WebP/AVIF + quality). Without Cloudinary you can still add images by URL in the Media Library.

---

## 10. Deploy backend: Render or Railway

### Render (blueprint already included: `render.yaml`)
1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo. It creates **fashionist-api** (root `server/`, build `npm ci --omit=dev`, start `npm start`, health check `/api/health`, `JWT_SECRET` auto-generated).
3. Fill the secret env vars it asks for: `MONGO_URI`, `CLIENT_URL` (your Vercel URL), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and Cloudinary/email/Google keys if you have them.
4. Deploy → open `https://<service>.onrender.com/api/health` → `{"success":true,...}`.
5. Seed once **from your computer** (with the same `MONGO_URI` in `server/.env`): `npm run seed`. Alternatively, use the Render **Shell**: `npm run seed`.

*Manual alternative:* New → Web Service → Root Directory `server` → Build `npm ci --omit=dev` → Start `npm start` → add the env vars from §5.
*Free plan note:* the instance sleeps after ~15 min idle, so the first request then takes ~30–50 s. Use a paid instance for a live shop.

### Railway (`server/railway.json` included)
1. Railway → **New Project → Deploy from GitHub repo** → pick the repo.
2. Service **Settings → Root Directory = `server`**. Build and start commands come from `railway.json` (`npm ci --omit=dev`, `npm start`, health check `/api/health`).
3. **Variables:** add everything from §5 (`NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, …).
4. **Settings → Networking → Generate Domain** → `https://<app>.up.railway.app/api/health`.
5. Seed from your computer with `npm run seed` (the seeder reads demo data from `client/`, so run it from the full repo).

---

## 11. Deploy frontend on Vercel

`client/vercel.json` is included (SPA rewrites so deep links like `/product/...` work on refresh, immutable caching for `/assets/*`, security headers).

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory: `client`** · Framework: *Vite* (auto) · Build `npm run build` · Output `dist`.
3. **Environment Variables:**
   - Demo mode now: `VITE_USE_MOCK=true`
   - Real API later: `VITE_USE_MOCK=false` and `VITE_API_URL=https://<your-api-domain>/api`
4. Deploy. Then put the Vercel URL (and your custom domain) into the API's `CLIENT_URL` and redeploy the API, otherwise the browser blocks requests (CORS).

**Go-live order:** Atlas → API (Render/Railway) → `npm run seed` → Vercel with `VITE_USE_MOCK=false` → add the Vercel URL to `CLIENT_URL` → log in at `/login` with `ADMIN_EMAIL` → **change the admin password** → replace demo products/CMS content.

---

## 11b. Domain: fashionist.store

| Host | Points to | Where to set it |
| --- | --- | --- |
| `fashionist.store` and `www.fashionist.store` | Vercel (storefront) | Vercel → Project → Settings → Domains (follow the A / CNAME records Vercel shows) |
| `api.fashionist.store` | Render or Railway (API) | Render → Service → Settings → Custom Domains → add `api.fashionist.store`, then at your domain registrar add **CNAME `api` → `<service>.onrender.com`** (Railway: Settings → Networking → Custom Domain, CNAME to the value it shows) |

Then set on the **API**: `CLIENT_URL=https://fashionist.store,https://www.fashionist.store` and `SITE_URL=https://fashionist.store`; on **Vercel**: `VITE_USE_MOCK=false`, `VITE_API_URL=https://api.fashionist.store/api` → Redeploy. (If `VITE_API_URL` is missing, the site automatically uses `https://api.fashionist.store/api` when it runs on fashionist.store.) `https://fashionist.store/sitemap.xml` is proxied by Vercel to the API's live sitemap, and `robots.txt` already points to it. For email, verify **fashionist.store** in Resend and use `MAIL_FROM=Fashionist <no-reply@fashionist.store>`.

---

## 12. Backup & restore

Install the [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools).
```bash
# Backup (creates ./backup/fashionist/*.bson)
mongodump --uri="mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net/fashionist" --out=./backup

# Restore into the same or a new cluster (--drop replaces existing collections)
mongorestore --uri="mongodb+srv://USER:PASS@cluster0.xxxx.mongodb.net" --drop ./backup
# Restore only one collection
mongorestore --uri="..." --nsInclude="fashionist.products" ./backup
```
Atlas paid tiers also have automatic cloud backups.

---

## 13. Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin (mock mode & `dev:memory`) | `admin.fashionist@gmail.com` | `Admin@123` (with a real DB: whatever `ADMIN_EMAIL` / `ADMIN_PASSWORD` are in `server/.env`) |
| Customer | `ayesha.fashionist@gmail.com` | `Customer@123` |
| Customer | `hamza.fashionist@gmail.com` | `Customer@123` |
| Customer | `sana.fashionist@outlook.com` | `Customer@123` |

Coupons: **WELCOME10** (10%, max PKR 1,000) · **EID500** (PKR 500 off over 5,000) · **FREESHIP** (free delivery over 2,000).
Seed: 12 categories (5 + 7 sub-categories), 40 products (EN + UR, PKR 1,990–24,990), 12 orders across every status, reviews, settings, and all CMS content.

---

## 14. Business rules (enforced on the server)

- Exactly **one admin**, created by `scripts/seed.js`; registration can only create customers. The role is always read from the database, never from the token or the request body.
- **Checkout in one Mongoose transaction:** per line, a conditional `findOneAndUpdate` on `variants.$elemMatch { sku, stock ≥ qty }` with `$inc -qty` → on failure abort with **409 `Out of stock: <sku>`**. Prices, coupons, delivery fee and totals are always computed on the server (client prices are ignored). Max **10 units per variant**.
- **Order flow:** Pending → Confirmed | Cancelled · Confirmed → Shipped | Cancelled · Shipped → Delivered · Delivered → Returned; anything else → **400**. Shipping requires courier + tracking number. Delivered marks payment *Paid*. Cancellation and approved returns **restore stock in a transaction**.
- Returns within **7 days** of delivery (configurable). Reviews only after delivery (one per product per customer). **One coupon per order, once per customer.**
- Delivery fee: per-city rate → default fee; free above the threshold (PKR 5,000 by default).
- Order numbers: `FN-YYMMDD-XXXX`.

---

## 15. Admin routes & API reference

**Atelier routes:** `/admin` (Overview) · `/admin/orders` (`?status=` `?open=<id>`) · `/admin/returns` · `/admin/products` · `/admin/products/new` · `/admin/products/:id` · `/admin/import` · `/admin/categories` · `/admin/inventory` · `/admin/customers` · `/admin/coupons` · `/admin/reviews` · `/admin/reports` · `/admin/activity` · `/admin/settings` · `/admin/cms/homepage` · `/admin/cms/theme` · `/admin/cms/navigation` · `/admin/cms/announcement` · `/admin/cms/pages` · `/admin/cms/media` · `/admin/print/invoice/:id` · `/admin/print/slip/:id`

**Response envelope:** `{ success: true, data, meta? }` / `{ success: false, message, code?, errors? }` · Status codes: 400 invalid operation · 401 not logged in · 403 forbidden / blocked / email not verified · 404 · 409 duplicate or out of stock · 413 body > 1 MB · 422 validation · 429 rate limited.

| Area | Endpoints |
| --- | --- |
| Health | `GET /api/health` |
| Auth `/api/auth` | `GET /config` · `POST /register` · `POST /verify-email` · `POST /resend-otp` · `POST /login` · `POST /google` · `POST /forgot-password` · `POST /reset-password/:token` · `GET/PATCH /me` · `GET/POST /addresses` · `PUT/DELETE /addresses/:id` |
| Catalogue | `GET /api/products` (`q` $text, `category` subtree, `minPrice`, `maxPrice`, `size`, `colour`, `attr[fabric|pieces|dupatta|soldBy|fit|work|material|age]`, `inStock`, `featured`, `ids`, `sort=newest|priceAsc|priceDesc|popular|rating`, `page`, `limit≤48`) · `GET /api/products/:slug` · `GET/POST /api/products/:id/reviews` · `GET /api/categories` · `GET /api/settings/public` |
| CMS (public) | `GET /api/cms` (theme, navigation, announcement, published sections) · `GET /api/cms/pages/:slug` |
| Customer | `GET/PUT /api/cart` · `GET /api/wishlist` · `POST /api/wishlist/:productId` · `POST /api/orders` · `GET /api/orders/my` · `POST /api/orders/validate-coupon` · `GET /api/orders/:id` · `POST /api/orders/:id/cancel` · `POST /api/orders/:id/return` |
| Admin `/api/admin` | `GET /dashboard` · `GET /notifications` · `GET /search` · products: `GET/POST /products`, `GET/PUT/DELETE /products/:id`, `POST /products/bulk` · `POST /bulk-import/preview`, `POST /bulk-import` · categories: `GET/POST /categories`, `PUT/DELETE /categories/:id`, `PATCH /categories/reorder` · inventory: `GET/PATCH /inventory`, `GET /inventory/export` · orders: `GET /orders`, `GET /orders/export`, `POST /orders/bulk-status`, `GET /orders/:id`, `GET /orders/:id/invoice`, `PATCH /orders/:id/status` · returns: `GET /returns`, `PATCH /returns/:id` · customers: `GET /customers`, `GET/PATCH /customers/:id` · coupons: `GET/POST /coupons`, `PUT/DELETE /coupons/:id` · reviews: `GET /reviews`, `PATCH /reviews/:id` · `GET /reports`, `GET /reports/export` · `GET/PUT /settings` · `GET /activity` · media: `GET /media`, `POST /media/upload` (multipart `images`), `POST /media` (by URL), `DELETE /media/:id` |
| Admin CMS `/api/admin/cms` | `GET /preview` · `GET/PUT /theme`, `POST /theme/reset` · `GET/PUT /navigation` · `GET/PUT /announcement` · sections: `GET/POST /sections`, `PUT/DELETE /sections/:id`, `POST /sections/:id/duplicate`, `PATCH /sections/reorder`, `POST /sections/publish`, `POST /sections/revert` · pages: `GET/POST /pages`, `PUT/DELETE /pages/:id` |

**Models:** User · Category · Product (variants, `attributes` Map, SEO) · Order (item snapshots, status history, return request) · Cart · Wishlist · Review · Coupon · Settings · ActivityLog · SiteTheme · Navigation · AnnouncementBar · HomepageSection (working copy + published snapshot, schedule) · Page · Media.

---

## 16. Security, performance & quality

**Security:** helmet · CORS limited to `CLIENT_URL` · express-mongo-sanitize · express-validator on every body · rate limits (login/OTP/reset 10 per 15 min, API 300/min) · JSON limit 1 MB · JWT HS256, 7 days, secret from env · bcrypt cost 12 · password hashes, OTP hashes and reset tokens are never returned · customers can only read their own orders · uploads: JPG/PNG/WEBP only, ≤ 5 MB · CMS input sanitised (sanitize-html for rich text; tags and `javascript:` stripped elsewhere) · OTPs stored hashed with expiry, attempt limit and resend cooldown · password reset doesn't reveal whether an email exists · graceful shutdown.

**Performance:** every route except the homepage is lazy-loaded; the admin and charts download only for the admin; the mock API is a separate chunk that real-API builds never load · gzip/brotli via `compression` · public catalogue responses cached 60 s (`stale-while-revalidate`) · immutable caching of hashed assets on Vercel · lazy images with width/height and blur-up · Cloudinary `f_auto,q_auto,w_*` · preconnect to image/font CDNs; the Urdu font loads without blocking render · skeletons everywhere · `prefers-reduced-motion` respected.

**Design system:** ink `#141414`, ivory `#FAF7F2`, sand `#EFE8DD`, stone `#8A8178`, hairline `#E4DCD0`, rose `#E11D48`, rose-deep `#9F1239`, blush `#FFE4E6`, gold `#B08D57` (tokens in `client/src/styles/tokens.css`) · Cormorant Garamond + Manrope + Noto Nastaliq Urdu · sharp 0–2 px corners, hairline borders, pill shapes only for chips.

---

## 17. Tests

```bash
cd server
npm test          # Jest + Supertest + mongodb-memory-server (replica set)
npm run smoke     # 69 end-to-end checks across every endpoint group, on a seeded in-memory DB
cd ../client
npm run build && npm run check    # headless Chrome/Edge: every page + flows, fails on any console error
```
30 tests (23 API + 7 rule unit tests): register + duplicate 409 · Gmail/Outlook-only sign-up · invalid body 422 · wrong password 401 · no token 401 · customer on admin 403 · another customer's order 404 · **two parallel checkouts for the last unit → one 201 + one 409, stock 0** · tampered price ignored · >10 units 422 · expired coupon rejected · coupon once per customer · Pending→Delivered 400 · Shipped needs tracking, Delivered marks Paid · cancel restores stock · return after 7 days 400, approval restocks · new attribute saved and filterable · duplicate SKU 409 · CMS publish changes `/api/cms` (drafts private, scripts stripped) · ActivityLog written · 404 envelope · **OTP flow** (no token before verify, login blocked with `EMAIL_NOT_VERIFIED`, wrong code 400, correct code logs in) · auth config flags · plus pure-rule unit tests (transitions, return window, totals, coupons, order number, sanitiser, CSV parser).

> The first `npm test` downloads a MongoDB binary (~600 MB). On a slow connection, pre-fetch it with `npm run test:prepare`.

---

## 18. Project history

1. **Restructure:** the old multi-vendor codebase was replaced by this single-store MERN monorepo. Removed for good: vendor role/console/registration/vetting/store pages, commission, settlement, payouts, disputes, multi-vendor order splitting, Ionic/Capacitor/native, mobile tab bar, 3D/Three.js, the AI stylist button, and all old branding and colours. The old code is archived outside the repo (`../Fashionist-legacy-backup`).
2. **Re-homed into the admin:** products (+ bulk CSV), inventory & low stock, orders, packing slips & invoices, returns, sales analytics, and store profile (now Store Settings).
3. **New identity:** the editorial-luxury Fashionist brand system, with every storefront page redesigned and bilingual (EN/UR with RTL).
4. **Fashionist Atelier + CMS:** a light icon-rail admin with command palette and notifications; Homepage Builder, Theme, Navigation, Announcement, Pages, Media Library.
5. **Production hardening:** response envelope, validators on every route, security middleware, 40-product seed with `--reset`, Jest/Supertest test suite, end-to-end smoke test and headless browser check, deploy configs (Render, Railway, Vercel).
6. **Accounts:** Gmail/Outlook-only sign-up, email OTP verification (built in, switched off until an email provider is connected), Resend or SMTP delivery, optional Google sign-in.

---

## 19. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Browser console: *blocked by CORS policy* | Add the exact site origin (scheme + host, no trailing `/`) to `CLIENT_URL` on the API and redeploy |
| `Transaction numbers are only allowed on a replica set member` | Your local MongoDB is standalone — use Atlas, `npm run dev:server:memory`, or start mongod with `--replSet rs0` and run `rs.initiate()` |
| API exits with `Missing required env` | Set `MONGO_URI` and `JWT_SECRET` |
| Vercel shows old API URL / still in demo mode | `VITE_*` vars are build-time: change them, then **Redeploy** |
| Refreshing `/product/...` on Vercel gives 404 | Make sure Root Directory is `client` so `client/vercel.json` is used |
| First request on Render takes ~40 s | Free instance waking up — use a paid instance for a live shop |
| Image upload says Cloudinary not configured | Add the three `CLOUDINARY_*` vars to the API |
| No OTP email arrives | Check `EMAIL_PROVIDER` and its keys; on Resend use a verified `MAIL_FROM` domain; check the API logs (`Email failed: …`) |
| Locked out of admin | Set a new `ADMIN_PASSWORD` in `server/.env` and run `npm run seed` (it resets the admin password; data is kept unless you pass `--reset`) |
| `bad auth : authentication failed` | Atlas user/password in `MONGO_URI` is wrong — Atlas → Database Access → Edit user → set a new password (letters + numbers avoid URL-encoding issues) |
| Cloudinary `api_secret mismatch` | The secret was copied while masked (`*****`). Cloudinary → Settings → API Keys → click the eye icon and copy the real secret |

© 2026 Fashionist
# fashionist
# fashionist
# fashionist
# haseeb
