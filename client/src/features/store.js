import { configureStore, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import { authService, cmsService, wishlistService } from '../services/index.js';
import { cmsDefaults } from '../cms/defaults.js';
import { TOKEN_KEY } from '../services/api.js';
import { MAX_QTY } from '../utils/rules.js';

const read = (k, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fallback;
  } catch {
    return fallback;
  }
};

/* ---------------- auth ---------------- */
export const fetchMe = createAsyncThunk('auth/me', () => authService.me().then((r) => r.user));
export const login = createAsyncThunk('auth/login', (body) => authService.login(body));
export const register = createAsyncThunk('auth/register', (body) => authService.register(body));

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, ready: !localStorage.getItem(TOKEN_KEY) },
  reducers: {
    logout: (s) => {
      localStorage.removeItem(TOKEN_KEY);
      s.user = null;
    },
    setUser: (s, a) => {
      s.user = a.payload;
    },
  },
  extraReducers: (b) => {
    const onAuth = (s, a) => {
      if (!a.payload.token) return; // e.g. registration waiting for email OTP
      localStorage.setItem(TOKEN_KEY, a.payload.token);
      s.user = a.payload.user;
      s.ready = true;
    };
    b.addCase(login.fulfilled, onAuth)
      .addCase(register.fulfilled, onAuth)
      .addCase(fetchMe.fulfilled, (s, a) => {
        s.user = a.payload;
        s.ready = true;
      })
      .addCase(fetchMe.rejected, (s) => {
        s.ready = true;
      });
  },
});

/* ---------------- cart (kept client-side; server recomputes prices) ---------------- */
const CART_KEY = 'fashionist:cart';
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: read(CART_KEY, []) },
  reducers: {
    addItem: (s, { payload }) => {
      const ex = s.items.find((i) => i.sku === payload.sku);
      const max = Math.min(MAX_QTY, payload.stock ?? MAX_QTY);
      if (ex) ex.qty = Math.min(ex.qty + (payload.qty || 1), max);
      else s.items.push({ ...payload, qty: Math.min(payload.qty || 1, max) });
    },
    setQty: (s, { payload: { sku, qty } }) => {
      const it = s.items.find((i) => i.sku === sku);
      if (it) it.qty = Math.max(1, Math.min(qty, MAX_QTY, it.stock ?? MAX_QTY));
    },
    removeItem: (s, { payload }) => {
      s.items = s.items.filter((i) => i.sku !== payload);
    },
    clearCart: (s) => {
      s.items = [];
    },
  },
});

/* ---------------- wishlist ---------------- */
const WISH_KEY = 'fashionist:wishlist';
export const toggleWishlist = createAsyncThunk('wishlist/toggle', async (product, { getState }) => {
  if (getState().auth.user) await wishlistService.toggle(product._id);
  return product;
});
export const loadWishlist = createAsyncThunk('wishlist/load', () => wishlistService.get().then((r) => r.products));

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { items: read(WISH_KEY, []) },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(toggleWishlist.fulfilled, (s, { payload }) => {
      const i = s.items.findIndex((p) => p._id === payload._id);
      if (i >= 0) {
        s.items.splice(i, 1);
        toast('Removed from wishlist');
      } else {
        s.items.push(payload);
        toast.success('Saved to wishlist');
      }
    }).addCase(loadWishlist.fulfilled, (s, { payload }) => {
      s.items = payload;
    });
  },
});

/* ---------------- cms (theme, navigation, announcement, homepage) ---------------- */
// Seed defaults render instantly; the live (or preview) bundle replaces them once loaded.
const isPreview = () => new URLSearchParams(window.location.search).has('preview');
export const loadCms = createAsyncThunk('cms/load', async (_, { getState }) => {
  const preview = isPreview() && getState().auth.user?.role === 'admin';
  return { ...(await cmsService.get(preview)), preview };
});
const cmsSlice = createSlice({
  name: 'cms',
  initialState: { ...cmsDefaults, sections: cmsDefaults.sections.map((s, i) => ({ _id: `default-${i}`, ...s })), loaded: false, preview: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(loadCms.fulfilled, (s, { payload }) => ({ ...s, ...payload, loaded: true })).addCase(loadCms.rejected, (s) => {
      s.loaded = true; // keep seed fallback
    });
  },
});

/* ---------------- ui ---------------- */
const uiSlice = createSlice({
  name: 'ui',
  initialState: { cartOpen: false, searchOpen: false, menuOpen: false, lang: localStorage.getItem('fashionist:lang') || 'en', dark: read('fashionist:dark', false), recent: read('fashionist:recent', []) },
  reducers: {
    setCartOpen: (s, a) => void (s.cartOpen = a.payload),
    setSearchOpen: (s, a) => void (s.searchOpen = a.payload),
    setMenuOpen: (s, a) => void (s.menuOpen = a.payload),
    setLang: (s, a) => void (s.lang = a.payload),
    toggleDark: (s) => void (s.dark = !s.dark),
    addRecent: (s, a) => void (s.recent = [a.payload, ...s.recent.filter((q) => q !== a.payload)].slice(0, 6)),
    clearRecent: (s) => void (s.recent = []),
  },
});

export const { logout, setUser } = authSlice.actions;
export const { addItem, setQty, removeItem, clearCart } = cartSlice.actions;
export const { setCartOpen, setSearchOpen, setMenuOpen, setLang, toggleDark, addRecent, clearRecent } = uiSlice.actions;

export const store = configureStore({
  reducer: { cms: cmsSlice.reducer, auth: authSlice.reducer, cart: cartSlice.reducer, wishlist: wishlistSlice.reducer, ui: uiSlice.reducer },
});

store.subscribe(() => {
  const { cart, wishlist, ui } = store.getState();
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart.items));
    localStorage.setItem(WISH_KEY, JSON.stringify(wishlist.items));
    localStorage.setItem('fashionist:lang', ui.lang);
    localStorage.setItem('fashionist:dark', JSON.stringify(ui.dark));
    localStorage.setItem('fashionist:recent', JSON.stringify(ui.recent));
  } catch {
    /* ignore storage errors */
  }
});

window.addEventListener('fashionist:logout', () => store.dispatch(logout()));
