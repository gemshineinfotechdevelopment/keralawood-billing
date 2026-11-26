import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import mongoose from 'mongoose';

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported
}
import { Product } from './models/Product.js';
import { Sale } from './models/Sale.js';
import { Category } from './models/Category.js';
import { Customer } from './models/Customer.js';
import { Settings } from './models/Settings.js';
import { Dashboard } from './models/Dashboard.js';
import { Stock } from './models/Stock.js';

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

  const [products, sales, categories, customers, settings, dashboard, stocks] = await Promise.all([
    Product.find().lean(),
    Sale.find().lean(),
    Category.find().lean(),
    Customer.find().lean(),
    Settings.findOne().lean(),
    Dashboard.findOne().lean(),
    Stock.find().sort({ createdAt: -1 }).limit(20).lean(),
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
  console.log(`👥 CUSTOMERS (${customers.length} patrons in MongoDB):`);
  console.log('====================================================');
  if (customers.length > 0) {
    console.table(
      customers.map((c) => ({
        Name: c.name?.slice(0, 26),
        Phone: c.phone,
        Location: c.location,
        Orders: c.totalOrders,
        LTV: '₹' + c.lifetimeValue,
      }))
    );
  } else {
    console.log('No customers found in MongoDB.');
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
        Status: s.paymentStatus || s.status,
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

  console.log('\n====================================================');
  console.log(`⚙️ SETTINGS in MongoDB:`);
  console.log('====================================================');
  if (settings) {
    console.log(`Depot: ${settings.depotName}`);
    console.log(`GSTIN: ${settings.gstin} | Tax: ${settings.taxRate} (CGST ${settings.cgstRate}% + SGST ${settings.sgstRate}%)`);
    console.log(`System Time: ${settings.systemTime} | Phone: ${settings.contactPhone}`);
  } else {
    console.log('No settings found in MongoDB.');
  }

  console.log('\n====================================================');
  console.log(`📊 DASHBOARD COLLECTION in MongoDB:`);
  console.log('====================================================');
  if (dashboard) {
    console.log(`Today's Sales: ${dashboard.todaySalesFormatted || '₹' + dashboard.todaySales}`);
    console.log(`Orders Today: ${dashboard.ordersTodayText || dashboard.ordersToday}`);
    console.log(`Total Stock: ${dashboard.totalStock} units`);
    console.log(`Low Stock Alerts: ${dashboard.lowStockCount} items`);
    console.log(`Recent Sales Count: ${dashboard.recentSales?.length || 0}`);
  } else {
    console.log('No dashboard record found in MongoDB yet.');
  }

  console.log('\n====================================================');
  console.log(`📦 STOCK COLLECTION (${stocks.length} records in MongoDB):`);
  console.log('====================================================');
  if (stocks.length > 0) {
    console.table(
      stocks.map((s) => ({
        Product: s.productName?.slice(0, 28),
        Type: s.type,
        Qty: s.quantity,
        Prev: s.previousStock,
        Curr: s.currentStock,
        Reason: s.reason?.slice(0, 24),
      }))
    );
  } else {
    console.log('No stock movement records in MongoDB yet.');
  }

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB.');
}

viewData().catch((err) => {
  console.error('Error connecting to MongoDB:', err.message);
  process.exit(1);
});
