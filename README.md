# STYLICA — Modern Multi-Vendor Fashion E-Commerce Marketplace

## 1. Architecture & Design System Confirmation

Stylica is architected as an asynchronous, decoupled multi-vendor fashion platform tailored for the Pakistani retail ecosystem (PKR currency, Cash on Delivery logistics, polymorphic fashion attributes, and vendor split wallets).

### Tripartite Console Architecture & Palette Tokens
* **Customer Storefront (`/`, `/shop`, `/checkout`, `/track`)**:
  * **Tokens**: Slate (`#0f172a`, `#1e293b`) & Indigo (`#4f46e5`, `#4338ca`), Accent Rose (`#f43f5e`).
  * **Shell**: Sticky top header with search suggestions, cart mini-drawer, and native mobile bottom tab bar (`IonTabBar` / `MobileTabBar`).
* **Vendor Command Center (`/vendor/*`)**:
  * **Tokens**: Emerald (`#059669`, `#047857`, `#10b981`), Dark Slate (`#064e3b`).
  * **Shell**: Permanent left sidebar navigation on desktop / slide-in drawer on mobile.
* **Central Admin Governance (`/admin/*`)**:
  * **Tokens**: Violet (`#7c3aed`, `#6d28d9`, `#8b5cf6`), Deep Purple (`#4c1d95`).
  * **Shell**: Permanent left sidebar navigation with simulated real-time infrastructure diagnostics and immutable audit log views.

---

## 2. Environment Configuration

| Variable | Default Value | Description |
|---|---|---|
| `VITE_USE_MOCK` | `true` | When `true`, uses the in-browser simulated Deno/MongoDB backend with Web Crypto HS256 JWTs and atomic transactions. When `false`, points to `httpApi`. |
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Base URL for remote production Deno/Oak/MongoDB backend. |
| `JWT_SECRET` | `(32+ char key)` | HMAC-SHA256 signature key for token signing & verification. |
| `JWT_EXPIRES_IN` | `7200` | Token lifetime (2 hours / 7200 seconds). |

---

## 3. Demo Credentials (Available on `/login`)

| Role | Email | Password | Scope / Persona |
|---|---|---|---|
| **Admin** | `admin@stylica.pk` | `Admin@12345` | Platform governance, vendor vetting, category commissions, courier webhook simulation. |
| **Vendor 1 (Approved)** | `vendor1@stylica.pk` | `Vendor@12345` | Ayesha Boutique (Multan) — inventory control, bulk ingest, packing slip with QR, wallet. |
| **Vendor 2 (Approved)** | `vendor2@stylica.pk` | `Vendor@12345` | Karigar Jewels (Lahore) — Kundan & Polki jewelry, Peshawari chappals. |
| **Vendor 3 (Pending)** | `vendor3@stylica.pk` | `Vendor@12345` | Khaas Collection (Faisalabad) — demo queue for vetting approval. |
| **Customer** | `customer@stylica.pk` | `Customer@12345` | Zainab Fatima — COD order placement, persistent cart, wishlist, address book, returns. |

---

## 4. Requirements Traceability Matrix (FR-01 to FR-15 + Extended Features)

| Req ID | Description | Primary Code Implementation | Test Case |
|---|---|---|---|
| **FR-01** | User Registration & Auth (JWT HS256 + bcrypt) | `src/api/mock/jwt.ts`, `src/stores/authStore.ts`, `src/pages/auth/LoginPage.tsx` | TC-01, TC-02, TC-10, TC-13 |
| **FR-02** | Dynamic Product Discovery (polymorphic facets, <500ms) | `src/domain/productFilter.ts`, `src/pages/storefront/ShopPage.tsx`, `src/components/storefront/FilterDrawer.tsx` | TC-03 |
| **FR-03** | Persistent Multi-Item Cart (localStorage sync) | `src/stores/cartStore.ts`, `src/components/storefront/MiniCartDrawer.tsx` | TC-04 |
| **FR-04** | 4-Step COD Checkout (server money recalculation) | `src/pages/storefront/CheckoutPage.tsx`, `src/api/mock/db.ts` (`createOrder`) | TC-05, TC-15 |
| **FR-05** | Vendor Application & Vetting | `src/pages/admin/AdminVendorsPage.tsx`, `src/api/mock/db.ts` | TC-09, TC-18 |
| **FR-06** | Real-Time Inventory Control & Inline Stock Sync | `src/pages/vendor/VendorInventoryPage.tsx`, `src/api/mock/events.ts` | TC-15 |
| **FR-07** | Bulk CSV / JSON Catalog Ingestion | `src/domain/bulkIngest.ts`, `src/pages/vendor/VendorBulkIngestPage.tsx` | TC-06 |
| **FR-08** | Order Pipeline Tracking (5 states + Cancelled) | `src/domain/orderPipeline.ts`, `src/pages/vendor/VendorOrdersPage.tsx`, `src/pages/storefront/TrackOrderPage.tsx` | TC-08 |
| **FR-09** | Vendor Real-Time Sales & Revenue Analytics | `src/pages/vendor/VendorDashboardPage.tsx` (Recharts integration) | TC-20 |
| **FR-10** | Digital Wallet, Split Commissions & Append-Only Ledger | `src/domain/commission.ts`, `src/pages/vendor/VendorWalletPage.tsx`, `src/api/mock/db.ts` (`settleOrder`) | TC-07, TC-16 |
| **FR-11** | Administrative Merchant Review with Mandatory Note | `src/pages/admin/AdminVendorsPage.tsx`, `src/pages/admin/AdminAuditLogsPage.tsx` | TC-09, TC-18 |
| **FR-12** | Category Taxonomy & Commission Sliders (non-retroactive) | `src/pages/admin/AdminCategoriesPage.tsx`, `src/domain/commission.ts` | TC-17 |
| **FR-13** | Content & Review Moderation | `src/pages/admin/AdminModerationPage.tsx`, `src/components/storefront/ProductDetailPage.tsx` | TC-10 |
| **FR-14** | Progressive Web App & Offline Fallback | `src/native/index.ts`, `capacitor.config.ts`, `public/manifest.webmanifest` | TC-11, TC-19 |
| **FR-15** | Cross-Platform Native Bridge (Capacitor) | `capacitor.config.ts`, `src/native/index.ts` | TC-12 |
| **BR-09** | Server-Side Promo Coupons (`WELCOME10`, `STYLICA500`) | `src/domain/discount.ts`, `src/components/storefront/MiniCartDrawer.tsx` | TC-05 |
| **BR-11** | Apparel Size & Color Variants per SKU | `src/pages/storefront/ProductDetailPage.tsx`, `src/api/mock/db.ts` | TC-15 |
| **BR-12** | 7-Day Returns & Non-Mutating Ledger Adjustments | `src/domain/returns.ts`, `src/pages/vendor/VendorReturnsPage.tsx` | TC-07 |
| **BR-13** | Digital Payout Requests & Approvals | `src/domain/payouts.ts`, `src/pages/admin/AdminPayoutsPage.tsx`, `src/pages/vendor/VendorWalletPage.tsx` | TC-07 |
| **Urdu** | English + Urdu Static Translation with RTL Layout | `src/i18n/index.ts`, `src/stores/settingsStore.ts`, `src/theme/variables.css` | Smoke test |

---

## 5. Capacitor Native Permissions Checklist

When packaging Stylica for Android (`npx cap add android`) and iOS (`npx cap add ios`), ensure the following permission strings are included:

### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### iOS (`ios/App/App/Info.plist`)
```xml
<key>NSCameraUsageDescription</key>
<string>Stylica requires camera access for vendors to take product photos and scan order QR codes.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Stylica requires photo library access to upload proof documents and catalog photos.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Stylica uses your location to suggest your delivery city and calculate accurate shipping rates.</string>
```

---

## 6. Deno / Oak / MongoDB Backend Migration Notes

To transition from the in-browser `mockApi` to the production backend:
1. Port the pure business logic modules without modification (`src/domain/orderPipeline.ts`, `src/domain/commission.ts`, `src/domain/discount.ts`, `src/domain/returns.ts`, `src/domain/payouts.ts`, `src/domain/bulkIngest.ts`).
2. Run MongoDB collection initialization with the indexes specified in Chapter 4.1.2 of the SRS:
   ```ts
   db.collection("users").createIndex({ email: 1 }, { unique: true });
   db.collection("orders").createIndex({ orderNumber: 1 }, { unique: true });
   db.collection("walletTransactions").createIndex({ orderId: 1, vendorId: 1 }, { unique: true });
   db.collection("wishlists").createIndex({ userId: 1, productId: 1 }, { unique: true });
   db.collection("products").createIndexes([
     { key: { categoryId: 1, price: 1 } },
     { key: { "productAttributes.fabric": 1, price: 1 } },
     { key: { productName: "text" } }
   ]);
   ```
3. Set `VITE_USE_MOCK=false` in the frontend environment.
# fashionistpro
