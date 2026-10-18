import 'dotenv/config';

// Refuse to start without the two secrets the API cannot run safely without.
const missing = ['MONGO_URI', 'JWT_SECRET'].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required env: ${missing.join(', ')} — see server/.env.example`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) console.warn('JWT_SECRET should be at least 32 characters');

const { default: app } = await import('./app.js');
const { connectDB } = await import('./config/db.js');

const port = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(port, () => console.log(`Fashionist API on :${port}`)))
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });
