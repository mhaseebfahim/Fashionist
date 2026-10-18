import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import StoreLayout from './layouts/StoreLayout.jsx';
import { ErrorPage, RequireAuth, Spinner } from './components/ui.jsx';
import { fetchMe, loadCms, loadWishlist } from './features/store.js';
import { TOKEN_KEY } from './services/api.js';
import { applyTheme } from './utils/theme.js';
import Home from './pages/Home.jsx';

// Code-split every route except the homepage so first paint ships the minimum JS.
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })));
const Shop = lazy(() => import('./pages/Shop.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const CartPage = named(() => import('./pages/Checkout.jsx'), 'CartPage');
const Checkout = named(() => import('./pages/Checkout.jsx'), 'Checkout');
const OrderSuccess = named(() => import('./pages/Checkout.jsx'), 'OrderSuccess');
const Login = named(() => import('./pages/Auth.jsx'), 'Login');
const Register = named(() => import('./pages/Auth.jsx'), 'Register');
const VerifyEmail = named(() => import('./pages/Auth.jsx'), 'VerifyEmail');
const ForgotPassword = named(() => import('./pages/Auth.jsx'), 'ForgotPassword');
const ResetPassword = named(() => import('./pages/Auth.jsx'), 'ResetPassword');
const StaticPage = lazy(() => import('./pages/StaticPage.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Admin = lazy(() => import('./admin/AdminApp.jsx'));

const Loading = () => <div className="grid min-h-[60vh] place-items-center"><Spinner className="h-6 w-6" /></div>;

export default function App() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const { user, ready } = useSelector((s) => s.auth);
  const dark = useSelector((s) => s.ui.dark);
  const theme = useSelector((s) => s.cms.theme);

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) dispatch(fetchMe());
  }, [dispatch]);
  // CMS loads once auth is known (admins may request draft preview inside the builder iframe).
  useEffect(() => {
    if (ready) dispatch(loadCms());
  }, [ready, dispatch]);
  useEffect(() => {
    const onMsg = (e) => e.origin === window.location.origin && e.data === 'fashionist:cms-refresh' && dispatch(loadCms());
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [dispatch]);
  useEffect(() => {
    if (user?.role === 'customer') dispatch(loadWishlist());
  }, [user, dispatch]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark && theme.darkModeEnabled !== false && !pathname.startsWith('/admin'));
  }, [dark, theme, pathname]);

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/admin/*" element={<RequireAuth role="admin"><Admin /></RequireAuth>} />
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="shop/:categorySlug" element={<Shop />} />
          <Route path="search" element={<Shop search />} />
          <Route path="product/:slug" element={<Product />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="order/success/:orderNumber" element={<RequireAuth><OrderSuccess /></RequireAuth>} />
          <Route path="account/*" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password/:token" element={<ResetPassword />} />
          <Route path="pages/:slug" element={<StaticPage />} />
          <Route path="403" element={<ErrorPage code="403" />} />
          <Route path="*" element={<ErrorPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
