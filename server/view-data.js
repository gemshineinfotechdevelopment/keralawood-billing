import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Product } from './models/Product.js';
import { Sale } from './models/Sale.js';
import { Category } from './models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function viewData() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in server/.env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { dbName: 'kerala_wood_billing' });
  console.log('✓ Connected to Database: kerala_wood_billing\n');

  const [products, sales, categories] = await Promise.all([
    Product.find().lean(),
    Sale.find().lean(),
    Category.find().lean(),
  ]);

  console.log('====================================================');
  console.log(`📦 PRODUCTS (${products.length} items in MongoDB):`);
  console.log('====================================================');
  if (products.length > 0) {
    console.table(
      products.map((p) => ({
        Name: p.name?.slice(0, 32),
        SKU: p.sku?.slice(0, 20),
        Category: p.category,
        Stock: p.stockQuantity,
        Price: '₹' + p.sellingPrice,
      }))
    );
  } else {
    console.log('No products found in MongoDB.');
  }

  console.log('\n====================================================');
  console.log(`🧾 SALES / INVOICES (${sales.length} orders in MongoDB):`);
  console.log('====================================================');
  if (sales.length > 0) {
    console.table(
      sales.map((s) => ({
        Invoice: s.invoice,
        Customer: s.customer,
        Amount: '₹' + s.amount,
        Status: s.status,
        Items: s.items?.slice(0, 32),
      }))
    );
  } else {
    console.log('No sales recorded yet.');
  }

  console.log('\n====================================================');
  console.log(`🏷️ CATEGORIES (${categories.length} categories in MongoDB):`);
  console.log('====================================================');
  if (categories.length > 0) {
    console.table(categories.map((c) => ({ Name: c.name, HSN: c.hsnCode })));
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB.');
}

viewData().catch((err) => {
  console.error('Error connecting to MongoDB:', err.message);
  process.exit(1);
});
