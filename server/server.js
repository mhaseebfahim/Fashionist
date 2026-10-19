import 'dotenv/config';
import mongoose from 'mongoose';

// Refuse to start without the secrets the API cannot run safely without.
const missing = ['MONGO_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env: ${missing.join(', ')} — see server/.env.example`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) console.warn('⚠ JWT_SECRET should be at least 32 random characters');

// The Cloudinary SDK throws on import if CLOUDINARY_URL is malformed — ignore a bad value instead of crashing.
if (process.env.CLOUDINARY_URL && !/^cloudinary:\/\/[^:]+:[^@]+@.+/.test(process.env.CLOUDINARY_URL.trim())) {
  console.warn('⚠ CLOUDINARY_URL is not in the form cloudinary://<key>:<secret>@<cloud_name> — ignoring it');
  delete process.env.CLOUDINARY_URL;
}

const { default: app } = await import('./app.js');
const { connectDB } = await import('./config/db.js');
const { env } = await import('./config/env.js');
const { cloudinaryReady } = await import('./middleware/upload.js');

const port = process.env.PORT || 5000;
try {
  await connectDB();
} catch (err) {
  console.error('DB connection failed:', err.message);
  if (/auth/i.test(err.message)) console.error('→ MongoDB rejected the username/password in MONGO_URI. Reset it in Atlas → Database Access and update MONGO_URI.');
  if (/whitelist|ENOTFOUND|timed out|Server selection/i.test(err.message)) console.error('→ Check Atlas → Network Access allows this server (0.0.0.0/0 for Render) and that MONGO_URI is correct.');
  process.exit(1);
}
const { bootstrap } = await import('./utils/bootstrap.js');
await bootstrap().catch((e) => console.error('Startup setup failed:', e.message));
const server = app.listen(port, () => {
  console.log(`Fashionist API on :${port} (${env.nodeEnv}) · CORS: ${env.clientUrls.join(', ')} · email: ${env.emailProvider} · OTP verification: ${env.emailVerification ? 'ON' : 'off'} · Cloudinary: ${cloudinaryReady() ? 'ready' : 'NOT configured'}`);
  if (process.env.EMAIL_VERIFICATION_ENABLED === 'true' && !env.emailVerification) console.warn('⚠ EMAIL_VERIFICATION_ENABLED=true but no working email provider (RESEND_API_KEY / SMTP_HOST missing) — OTP stays OFF so sign-ups keep working');
});

// Graceful shutdown for Render / Railway deploys.
const shutdown = (signal) => {
  console.log(`${signal} received — closing`);
  server.close(() => mongoose.connection.close(false).then(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10000).unref();
};
['SIGTERM', 'SIGINT'].forEach((s) => process.on(s, () => shutdown(s)));
process.on('unhandledRejection', (e) => console.error('Unhandled rejection:', e));
