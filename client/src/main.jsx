import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { MotionConfig } from 'framer-motion';
import './i18n/index.js';
import './styles/index.css';
import { store } from './features/store.js';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <MotionConfig reducedMotion="user">
          <App />
          <Toaster position="bottom-center" toastOptions={{ style: { borderRadius: 0, background: '#141414', color: '#FAF7F2', fontSize: 13 }, success: { iconTheme: { primary: '#E11D48', secondary: '#FAF7F2' } } }} />
        </MotionConfig>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
