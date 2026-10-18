import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { authRoutes, catalogRoutes, shopRoutes, orderRoutes } from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { envelope, errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();
const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: (origin, cb) => cb(null, !origin || origins.includes(origin)), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(mongoSanitize());
app.use(envelope);
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, skip: () => process.env.NODE_ENV === 'test', message: { success: false, message: 'Too many requests, slow down' } }));

app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'Fashionist API', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', shopRoutes);
app.use('/api', catalogRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
