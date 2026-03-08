import mongoose from 'mongoose';

let gfsBucket = null;

/** Returns the GridFSBucket instance (available after connectDB resolves). */
export function getGFS() {
  return gfsBucket;
}

export default async function connectDB() {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  gfsBucket = new mongoose.mongo.GridFSBucket(conn.connection.db, { bucketName: 'audio' });
  console.log('MongoDB connected:', conn.connection.host);
}
