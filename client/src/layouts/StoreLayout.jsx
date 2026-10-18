import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../components/ui.jsx';
import { AnimatePresence, motion } from 'framer-motion';
import Header, { AnnouncementBar } from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import CartDrawer from '../components/CartDrawer.jsx';
import SearchOverlay from '../components/SearchOverlay.jsx';

export default function StoreLayout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:bg-fg focus:p-3 focus:text-bg">Skip to content</a>
      <AnnouncementBar />
      <Header />
      <AnimatePresence mode="wait">
        <motion.main id="main" key={pathname} className="flex-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
          <Suspense fallback={<div className="grid min-h-[60vh] place-items-center"><Spinner className="h-6 w-6" /></div>}>
            <Outlet />
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
    </div>
  );
}
