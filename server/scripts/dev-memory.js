// Runs the REAL API on a throw-away in-memory MongoDB replica set, freshly seeded.
// Perfect for trying the full stack before MongoDB Atlas is set up:   npm run dev:memory
// Data is lost when the process stops.
import 'dotenv/config';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

process.env.JWT_SECRET ||= 'dev-memory-secret-0123456789abcdef0123456789abcdef';
process.env.ADMIN_EMAIL ||= 'admin.fashionist@gmail.com';
process.env.ADMIN_PASSWORD ||= 'Admin@123';
process.env.CLIENT_URL ||= 'http://localhost:5173,http://localhost:4173';

const repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
process.env.MONGO_URI = repl.getUri('fashionist');
await mongoose.connect(process.env.MONGO_URI);
const { seed } = await import('./seed.js');
await seed({ reset: true });
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
const { default: app } = await import('../app.js');
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`\nFashionist API (in-memory DB) → http://localhost:${port}/api   admin: ${process.env.ADMIN_EMAIL} / ${process.env.ADMIN_PASSWORD}`));
const stop = async () => (await mongoose.disconnect(), await repl.stop(), process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
