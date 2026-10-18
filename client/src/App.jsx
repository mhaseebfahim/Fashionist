import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import StoreLayout from './layouts/StoreLayout.jsx';
import { ErrorPage, RequireAuth, Spinner } from './components/ui.jsx';
import { fetchMe, loadWishlist } from './features/store.js';
import { TOKEN_KEY } from './services/api.js';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import Product from './pages/Product.jsx';
import { CartPage, Checkout, OrderSuccess } from './pages/Checkout.jsx';
import { Login, Register, ForgotPassword, ResetPassword } from './pages/Auth.jsx';
import StaticPage from './pages/StaticPage.jsx';

const Account = lazy(() => import('./pages/Account.jsx'));
const Admin = lazy(() => import('./admin/AdminApp.jsx'));

const Loading = () => <div className="grid min-h-[60vh] place-items-center"><Spinner className="h-6 w-6" /></div>;

export default function App() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const user = useSelector((s) => s.auth.user);
  const dark = useSelector((s) => s.ui.dark);

  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY)) dispatch(fetchMe());
  }, [dispatch]);
  useEffect(() => {
    if (user?.role === 'customer') dispatch(loadWishlist());
  }, [user, dispatch]);
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  useEffect(() => document.documentElement.classList.toggle('dark', dark), [dark]);

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
