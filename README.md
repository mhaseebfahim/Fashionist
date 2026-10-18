# ◆ FASHIONIST — Wear Your Story

Single-store fashion e-commerce website for Pakistan (MERN). One store owner (admin) manages everything; customers shop with **Cash on Delivery** in PKR, nationwide.

```
fashionist/
  client/   React 18 · Vite · React Router 6 · Redux Toolkit · Axios · Tailwind · react-i18next (en/ur, RTL) · Recharts · framer-motion
  server/   Node 20 · Express 4 · Mongoose 8 · JWT · bcrypt(12) · helmet · rate-limit · express-validator · mongo-sanitize · multer/cloudinary · nodemailer · json2csv
```

## Quick start

```bash
# client only (mock API in the browser, no server needed)
cd client && cp .env.example .env && npm install && npm run dev

# full stack — MongoDB must run as a replica set (transactions)
cd server && cp .env.example .env && npm install
npm run seed      # creates THE admin (ADMIN_EMAIL / ADMIN_PASSWORD) + catalogue
npm run dev       # http://localhost:5000/api
npm test          # business-rule unit tests
# then in client/.env: VITE_USE_MOCK=false, VITE_API_URL=http://localhost:5000/api
```

Mock demo logins: `ayesha@example.com / Customer@123` · `admin@fashionist.pk / Admin@123`.

## Business rules (enforced on the server)

- Register only creates customers; the single admin is created by `scripts/seed.js`.
- Checkout runs in one Mongoose transaction: conditional `findOneAndUpdate` on `variants.$elemMatch {sku, stock >= qty}` → `409 Out of stock: <sku>`. Prices, coupon, shipping and totals are always computed on the server.
- Status flow: Pending→Confirmed|Cancelled, Confirmed→Shipped|Cancelled, Shipped→Delivered, Delivered→Returned. Shipping requires courier + tracking. Delivered marks the order Paid. Cancel / approved return restock in a transaction.
- Max 10 units per variant, returns within 7 days of delivery, reviews only after delivery, one coupon per order and once per customer.

## API

| Area | Routes |
| --- | --- |
| Auth | `POST /api/auth/register · login · forgot-password · reset-password/:token`, `GET/PATCH /api/auth/me` |
| Catalogue | `GET /api/categories · /api/products · /api/products/:slug · /api/settings`, `POST /api/reviews · /api/coupons/validate` |
| Customer | `/api/me/cart · /api/me/wishlist · /api/me/orders(/:id/cancel · /:id/return)` |
| Admin | `/api/admin/dashboard · products (+ /upload, /import CSV) · inventory · orders (+ /export, /:id/status, /:id/return) · categories · customers · coupons · reviews · settings · activity` |
