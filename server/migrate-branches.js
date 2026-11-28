import mongoose from 'mongoose';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

const URI = 'mongodb+srv://shaesan77_db_user:sF1xwgXWVYMIlVrM@cluster0.yydl1xu.mongodb.net/kerala_wood_billing';

async function migrate() {
  console.log('[Migration] Connecting to Atlas...');
  await mongoose.connect(URI);
  const db = mongoose.connection.db;

  const collections = ['products', 'customers', 'purchases', 'sales', 'salespeople', 'stocks'];
  for (const col of collections) {
    const res = await db.collection(col).updateMany(
      { $or: [{ branch: { $exists: false } }, { branch: null }] },
      { $set: { branch: 'sivakasi' } }
    );
    console.log(`[Migration] ${col}: updated ${res.modifiedCount} records to sivakasi`);
  }

  console.log('[Migration] All existing records assigned to Sivakasi branch.');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
