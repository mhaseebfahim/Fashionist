import mongoose from 'mongoose';

export async function connectDB(uri = process.env.MONGO_URI) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 20 });
  // Build indexes (unique slugs/SKUs, text search) — cheap no-op once they exist.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init().catch((e) => console.warn(`Index build ${m.modelName}:`, e.message))));
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
