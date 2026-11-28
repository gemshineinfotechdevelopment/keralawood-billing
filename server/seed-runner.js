import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import { seedInitialData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {}

// Load server/.env and root .env fallback
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const MONGODB_URI = process.env.MONGODB_URI;

async function runSeed() {
  if (!MONGODB_URI) {
    console.error('[Seed Runner] Error: MONGODB_URI environment variable is not defined.');
    console.error('[Seed Runner] Please check server/.env or root .env and configure MONGODB_URI.');
    process.exit(1);
  }

  console.log('[Seed Runner] Connecting to MongoDB...');
  try {
    await mongoose.connect(MONGODB_URI, { dbName: 'kerala_wood_billing' });
    console.log('[Seed Runner] Connected successfully. Running seedInitialData()...');
    await seedInitialData();
    console.log('[Seed Runner] Seeding completed successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Runner] Seeding failed:', err.message);
    process.exit(1);
  }
}

runSeed();
