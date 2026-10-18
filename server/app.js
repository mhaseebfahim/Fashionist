import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { authRoutes, catalogRoutes, shopRoutes, orderRoutes } from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { envelope, errorHandler, notFound } from './middleware/errorHandler.js';
import { env } from './config/env.js';

const app = express();

app.set('trust proxy', 1); // Render / Railway sit behind a proxy — needed for rate limiting by client IP
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    // Only the configured storefront origin(s). Requests without Origin (curl, health checks) are allowed.
    origin: (origin, cb) => cb(null, !origin || env.clientUrls.includes(origin.toLowerCase().replace(/\/$/, ''))),
    credentials: true,
    maxAge: 86400,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());
app.use(envelope);
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, skip: () => env.nodeEnv === 'test', message: { success: false, message: 'Too many requests, slow down' } }));

// Public catalogue responses can be cached briefly by browsers/CDNs.
app.use(['/api/products', '/api/categories', '/api/cms', '/api/settings/public'], (req, res, next) => {
  if (req.method === 'GET') res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  next();
});

app.get('/', (_req, res) => res.json({ ok: true, name: 'Fashionist API', docs: '/api/health' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'Fashionist API', env: env.nodeEnv, time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', shopRoutes);
app.use('/api', catalogRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
