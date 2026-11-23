import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { Product } from './models/Product.js';
import { Sale } from './models/Sale.js';
import { Category } from './models/Category.js';
import { Customer } from './models/Customer.js';
import { Settings } from './models/Settings.js';
import { Dashboard } from './models/Dashboard.js';
import { Stock } from './models/Stock.js';
import { Purchase } from './models/Purchase.js';
import { SalesPerson } from './models/SalesPerson.js';
import { seedInitialData } from './seed.js';
import { uploadToCloudinary, isCloudinaryConfigured, deleteFromCloudinary } from './config/cloudinary.js';

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load server/.env regardless of where node was started from
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const app = express();
const PORT = process.env.PORT || 5031;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://keralawoods-billing.gemshine.tech,http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI;

// Global process error handlers to prevent silent crashes
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err.message);
});

// Allowed CORS origins (supports comma-separated URLs and wildcards)
const allowedOrigins = FRONTEND_URL.split(',').map((u) => u.trim().replace(/\/$/, ''));

// 1. Explicit Custom CORS & Preflight Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 2. Standard CORS Middleware with dynamic origin reflection
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '');
      if (
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.includes('vercel.app') ||
        cleanOrigin.includes('localhost') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  })
);

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// MongoDB connection
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI, { dbName: 'kerala_wood_billing' })
    .then(async () => {
      console.log('[MongoDB] Connected successfully to database: kerala_wood_billing');
      await seedInitialData();
    })
    .catch((err) => console.warn('[MongoDB] Connection warning (Verify service is running):', err.message));
}

// -------------------------------------------------------------
// Health Check
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend server is running',
    environment: process.env.NODE_ENV || 'development',
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : mongoose.connection.readyState === 2 ? 'connecting' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// CLOUDINARY UPLOAD API
// -------------------------------------------------------------
app.get('/api/cloudinary/status', (req, res) => {
  const configured = isCloudinaryConfigured();
  res.json({
    success: true,
    configured,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  });
});

app.post('/api/upload', async (req, res) => {
  try {
    const { image, folder = 'kerala_wood_billing', filename = '' } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Image data (base64 or URL) is required' });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary credentials are not configured in server/.env',
      });
    }

    const uploadResult = await uploadToCloudinary(image, folder, filename);
    console.log('[Cloudinary] Successfully uploaded image:', uploadResult.secure_url);

    res.json({
      success: true,
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
    });
  } catch (err) {
    console.error('[Cloudinary] Upload error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image to Cloudinary',
      error: err.message,
    });
  }
});

app.delete('/api/upload', async (req, res) => {
  try {
    const { public_id } = req.body;
    if (!public_id) {
      return res.status(400).json({ success: false, message: 'public_id is required' });
    }
    await deleteFromCloudinary(public_id);
    res.json({ success: true, message: 'Deleted from Cloudinary' });
  } catch (err) {
    console.error('[Cloudinary] Delete error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete from Cloudinary', error: err.message });
  }
});

// -------------------------------------------------------------
// CATEGORIES API
// -------------------------------------------------------------
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ success: true, count: categories.length, categories });
  } catch (err) {
    console.error('[API] /api/categories GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: err.message });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const { name, description, hsnCode } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmedName = name.trim();
    const existing = await Category.findOne({ name: new RegExp(`^${trimmedName}$`, 'i') });
    if (existing) {
      return res.json({ success: true, category: existing, message: 'Category already exists' });
    }

    const newCategory = new Category({
      name: trimmedName,
      description: description ? description.trim() : '',
      hsnCode: hsnCode || '9403',
    });

    const saved = await newCategory.save();
    console.log('[API] Created new product category:', saved.name);
    res.status(201).json({ success: true, category: saved });
  } catch (err) {
    console.error('[API] /api/categories POST error:', err);
    res.status(500).json({ success: false, message: 'Failed to create category', error: err.message });
  }
});

// -------------------------------------------------------------
// PRODUCTS API
// -------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = {};

    if (category && category !== 'All') {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { sku: searchRegex }, { woodSpecies: searchRegex }];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    const allProducts = await Product.find();

    let totalStock = 0;
    let totalValuation = 0;
    let lowStockCount = 0;
    const categoryCounts = { All: allProducts.length, Dining: 0, Beds: 0, Chairs: 0, Storage: 0 };

    for (const p of allProducts) {
      const qty = Number(p.stockQuantity) || 0;
      const price = Number(p.sellingPrice) || 0;
      const threshold = Number(p.lowStockThreshold) || 2;

      totalStock += qty;
      totalValuation += qty * price;
      if (qty <= threshold) {
        lowStockCount++;
      }

      if (categoryCounts[p.category] !== undefined) {
        categoryCounts[p.category]++;
      } else if (p.category) {
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
      }
    }

    const formattedProducts = products.map((p) => {
      const qty = Number(p.stockQuantity) || 0;
      const threshold = Number(p.lowStockThreshold) || 2;
      let stock = `${qty} in stock`;
      let stockType = 'in-stock';
      if (qty <= 1) {
        stock = `${qty} left (Critical)`;
        stockType = 'critical';
      } else if (qty <= threshold) {
        stock = `${qty} in stock (Low)`;
        stockType = 'low';
      }

      const stockOut = Number(p.stockOut) || 0;
      const stockIn = p.stockIn !== undefined ? Number(p.stockIn) : (qty + stockOut);

      return {
        id: p._id.toString(),
        name: p.name,
        sku: p.sku,
        category: p.category,
        woodSpecies: p.woodSpecies,
        finish: p.surfacePolish,
        surfacePolish: p.surfacePolish,
        stock,
        stockType,
        stockQuantity: qty,
        stockIn,
        stockOut,
        lowStockThreshold: threshold,
        price: '₹' + Number(p.sellingPrice || 0).toLocaleString('en-IN'),
        rawPrice: p.sellingPrice,
        unitPrice: p.sellingPrice,
        costPrice: p.costPrice,
        depotLocation: p.depotLocation,
        warehouseBay: p.warehouseBay,
        dimensions: p.dimensions,
        warranty: p.warranty,
      };
    });

    res.json({
      success: true,
      count: formattedProducts.length,
      products: formattedProducts,
      metrics: {
        totalStock: totalStock > 0 ? totalStock.toLocaleString('en-IN') : '3,892',
        totalValuationFormatted:
          totalValuation >= 10000000
            ? `₹${(totalValuation / 10000000).toFixed(2)} Cr`
            : `₹${(totalValuation / 100000).toFixed(2)} L`,
        lowStockCount: `${lowStockCount} SKUs`,
        categoryCounts,
      },
    });
  } catch (err) {
    console.error('[API] /api/products error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const parseNum = (val, defaultVal = 0) => {
      if (typeof val === 'number') return val;
      if (!val) return defaultVal;
      const cleaned = String(val).replace(/[^0-9.]/g, '');
      return cleaned ? Number(cleaned) : defaultVal;
    };

    const updateFields = {};
    if (body.name !== undefined) updateFields.name = body.name;
    if (body.category !== undefined) updateFields.category = body.category;
    if (body.sku !== undefined) updateFields.sku = body.sku;
    if (body.woodSpecies !== undefined) updateFields.woodSpecies = body.woodSpecies;
    if (body.description !== undefined) updateFields.description = body.description;
    if (body.woodGrade !== undefined) updateFields.woodGrade = body.woodGrade;
    if (body.surfacePolish !== undefined) updateFields.surfacePolish = body.surfacePolish;
    if (body.joineryTechnique !== undefined) updateFields.joineryTechnique = body.joineryTechnique;
    if (body.warranty !== undefined) updateFields.warranty = body.warranty;
    if (body.packagingType !== undefined) updateFields.packagingType = body.packagingType;
    if (body.shippingClass !== undefined) updateFields.shippingClass = body.shippingClass;
    if (body.tradeDiscount !== undefined) updateFields.tradeDiscount = body.tradeDiscount;
    if (body.depotLocation !== undefined) updateFields.depotLocation = body.depotLocation;
    if (body.warehouseBay !== undefined) updateFields.warehouseBay = body.warehouseBay;
    if (body.stockQuantity !== undefined) updateFields.stockQuantity = parseNum(body.stockQuantity);
    if (body.stockIn !== undefined) updateFields.stockIn = parseNum(body.stockIn);
    if (body.stockOut !== undefined) updateFields.stockOut = parseNum(body.stockOut);
    if (body.lowStockThreshold !== undefined) updateFields.lowStockThreshold = parseNum(body.lowStockThreshold, 2);
    if (body.sellingPrice !== undefined || body.unitPrice !== undefined) {
      updateFields.sellingPrice = parseNum(body.sellingPrice !== undefined ? body.sellingPrice : body.unitPrice);
    }
    if (body.dimensions !== undefined) {
      updateFields.dimensions = {
        length: parseNum(body.dimensions.length),
        width: parseNum(body.dimensions.width),
        height: parseNum(body.dimensions.height),
        weight: parseNum(body.dimensions.weight),
      };
    }

    let updatedProduct = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updatedProduct = await Product.findByIdAndUpdate(id, updateFields, { new: true });
    }
    if (!updatedProduct) {
      updatedProduct = await Product.findOneAndUpdate(
        { $or: [{ sku: id }, { name: id }] },
        updateFields,
        { new: true }
      );
    }

    console.log('[API] Updated product:', id);
    res.json({ success: true, product: updatedProduct });
  } catch (err) {
    console.error('[API] /api/products/:id PUT error:', err);
    res.status(500).json({ success: false, message: 'Failed to update product', error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let deletedProduct = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      deletedProduct = await Product.findByIdAndDelete(id);
    }
    if (!deletedProduct) {
      deletedProduct = await Product.findOneAndDelete({ $or: [{ sku: id }, { name: id }] });
    }
    console.log('[API] Deleted product:', id);
    res.json({ success: true, message: 'Product deleted successfully', product: deletedProduct });
  } catch (err) {
    console.error('[API] /api/products/:id DELETE error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete product', error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const data = req.body;
    const parseNum = (val, defaultVal = 0) => {
      if (typeof val === 'number') return val;
      if (!val) return defaultVal;
      const cleaned = String(val).replace(/[^0-9.]/g, '');
      return cleaned ? Number(cleaned) : defaultVal;
    };

    const newProduct = new Product({
      name: data.name || '',
      sku: data.sku || String(Math.floor(100000 + Math.random() * 900000)),
      category: data.category || '',
      woodSpecies: data.woodSpecies || '',
      description: data.description || '',
      collectionSeries: data.collectionSeries || '',
      originZone: data.originZone || '',
      searchTags: data.searchTags || '',
      dimensions: {
        length: parseNum(data.length || (data.dimensions && data.dimensions.length), 0),
        width: parseNum(data.width || (data.dimensions && data.dimensions.width), 0),
        height: parseNum(data.height || (data.dimensions && data.dimensions.height), 0),
        weight: parseNum(data.weight || (data.dimensions && data.dimensions.weight), 0),
      },
      woodGrade: data.woodGrade || '',
      surfacePolish: data.surfacePolish || '',
      joineryTechnique: data.joineryTechnique || '',
      warranty: data.warranty || '',
      stockQuantity: parseNum(data.stockQuantity, 0),
      stockIn: parseNum(data.stockIn !== undefined ? data.stockIn : data.stockQuantity, 0),
      stockOut: parseNum(data.stockOut, 0),
      lowStockThreshold: parseNum(data.lowStockThreshold, 0),
      depotLocation: data.depotLocation || '',
      warehouseBay: data.warehouseBay || '',
      leadTime: data.leadTime || '',
      packagingType: data.packagingType || '',
      shippingClass: data.shippingClass || '',
      costPrice: parseNum(data.costPrice, 0),
      sellingPrice: parseNum(data.sellingPrice || data.unitPrice, 0),
      gstSlab: data.gstSlab || '',
      tradeDiscount: data.tradeDiscount || '',
      transitPass: data.transitPass !== undefined ? Boolean(data.transitPass) : false,
    });

    const saved = await newProduct.save();
    console.log('[API] Created new product in MongoDB:', saved.name, saved.sku);
    res.status(201).json({ success: true, product: saved });
  } catch (err) {
    console.error('[API] /api/products POST error:', err);
    res.status(500).json({ success: false, message: 'Failed to create product', error: err.message });
  }
});

// -------------------------------------------------------------
// CUSTOMERS API
// -------------------------------------------------------------
app.get('/api/customers', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query = { $or: [{ name: reg }, { personName: reg }, { phone: reg }, { location: reg }, { gstin: reg }] };
    }
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: customers.length, customers });
  } catch (err) {
    console.error('[API] /api/customers GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch customers', error: err.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    // Check if customer already exists by phone or name
    const existing = await Customer.findOne({
      $or: [
        { name: new RegExp(`^${data.name.trim()}$`, 'i') },
        ...(data.phone && data.phone.trim().length > 5 ? [{ phone: data.phone.trim() }] : []),
      ],
    });

    if (existing) {
      if (data.phone) existing.phone = data.phone;
      if (data.address) existing.address = data.address;
      if (data.deliveryAddress) existing.deliveryAddress = data.deliveryAddress;
      if (data.gstin) existing.gstin = data.gstin;
      const updated = await existing.save();
      console.log('[API] Updated existing customer:', updated.name);
      return res.json({ success: true, customer: updated, message: 'Customer updated' });
    }

    const newCustomer = new Customer({
      name: data.name.trim(),
      personName: data.personName || data.name.trim(),
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      deliveryAddress: data.deliveryAddress || data.address || '',
      location: data.location || (data.address ? data.address.split(',')[0] : 'Sivakasi'),
      gstin: data.gstin || 'Unregistered / Personal',
      type: data.type || 'Residential',
      totalOrders: data.totalOrders || 0,
      lifetimeValue: data.lifetimeValue || '0',
    });

    const saved = await newCustomer.save();
    console.log('[API] Created new customer in MongoDB:', saved.name);
    res.status(201).json({ success: true, customer: saved });
  } catch (err) {
    console.error('[API] /api/customers POST error:', err);
    res.status(500).json({ success: false, message: 'Failed to save customer', error: err.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let updated = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      updated = await Customer.findByIdAndUpdate(id, req.body, { new: true });
    } else {
      updated = await Customer.findOneAndUpdate({ name: id }, req.body, { new: true });
    }
    res.json({ success: true, customer: updated });
  } catch (err) {
    console.error('[API] /api/customers PUT error:', err);
    res.status(500).json({ success: false, message: 'Failed to update customer', error: err.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Customer.findByIdAndDelete(id);
    } else {
      await Customer.findOneAndDelete({ $or: [{ id }, { name: id }] });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('[API] /api/customers DELETE error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete customer', error: err.message });
  }
});

// -------------------------------------------------------------
// SETTINGS API
// -------------------------------------------------------------
app.get('/api/settings', async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[API] /api/settings GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch settings', error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    const updates = req.body;
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings(updates);
    } else {
      Object.assign(settings, updates);
    }
    const saved = await settings.save();
    console.log('[API] Saved settings to MongoDB successfully');
    res.json({ success: true, settings: saved });
  } catch (err) {
    console.error('[API] /api/settings PUT error:', err);
    res.status(500).json({ success: false, message: 'Failed to update settings', error: err.message });
  }
});

// -------------------------------------------------------------
// SALES / BILLING API
// -------------------------------------------------------------
app.get('/api/sales', async (req, res) => {
  try {
    const { year, search } = req.query;
    const query = {};
    if (year && year !== 'All') {
      query.year = year;
    }
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ invoice: reg }, { customer: reg }, { items: reg }, { location: reg }];
    }
    const sales = await Sale.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: sales.length, sales });
  } catch (err) {
    console.error('[API] /api/sales GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch sales', error: err.message });
  }
});

app.delete('/api/sales/:invoice', async (req, res) => {
  try {
    const { invoice } = req.params;
    const sale = await Sale.findOne({
      $or: [{ invoice: invoice }, { _id: invoice.match(/^[0-9a-fA-F]{24}$/) ? invoice : null }]
    });

    if (sale) {
      // 1. Decrement Salesperson ordersClosed if matched
      const spName = sale.salesPerson || sale.billedBy;
      if (spName && spName.trim()) {
        const trimmedSp = spName.trim();
        const sp = await SalesPerson.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${trimmedSp}$`, 'i') } },
            { code: { $regex: new RegExp(`^${trimmedSp}$`, 'i') } }
          ]
        });
        if (sp) {
          sp.ordersClosed = Math.max(0, (Number(sp.ordersClosed) || 1) - 1);
          await sp.save();
        }
      }

      // 2. Check Customer: delete customer if no other sales exist
      const rawCust = sale.customer;
      const custName = typeof rawCust === 'object' && rawCust !== null ? rawCust.name : rawCust;
      if (custName && typeof custName === 'string' && !custName.toLowerCase().includes('walk-in')) {
        const trimmedCust = custName.trim();
        const otherSalesCount = await Sale.countDocuments({
          invoice: { $ne: sale.invoice },
          $or: [
            { customer: trimmedCust },
            { 'customer.name': trimmedCust },
            { customerPhone: sale.customerPhone || '___none___' }
          ]
        });

        if (otherSalesCount === 0) {
          // No other sales: delete customer from Customers directory
          await Customer.deleteMany({
            $or: [
              { name: { $regex: new RegExp(`^${trimmedCust}$`, 'i') } },
              { phone: sale.customerPhone ? sale.customerPhone : '___none___' }
            ]
          });
        } else {
          // Decrement customer total orders
          const cust = await Customer.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${trimmedCust}$`, 'i') } },
              { phone: sale.customerPhone ? sale.customerPhone : '___none___' }
            ]
          });
          if (cust) {
            cust.totalOrders = Math.max(0, (Number(cust.totalOrders) || 1) - 1);
            await cust.save();
          }
        }
      }

      await Sale.deleteMany({
        $or: [{ invoice: invoice }, { _id: invoice.match(/^[0-9a-fA-F]{24}$/) ? invoice : null }]
      });
    }

    res.json({ success: true, message: `Sale ${invoice} deleted successfully` });
  } catch (err) {
    console.error('[API] /api/sales/:invoice DELETE error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const data = req.body;
    const totalSalesCount = await Sale.countDocuments();
    const invNo = data.invoice || data.invoiceNumber || data.id || String(100 + totalSalesCount);
    const rawAmt =
      typeof data.amount === 'number'
        ? data.amount
        : Number(String(data.amount || data.rawAmount || data.grandTotal || 0).replace(/[^0-9.]/g, '')) || 0;

    // Check if items were provided for inventory stock deduction
    const lineItems = Array.isArray(data.itemsList)
      ? data.itemsList
      : Array.isArray(data.items)
      ? data.items
      : [];

    // Deduct stock for each line item in MongoDB Product collection and record in Stock collection
    for (const item of lineItems) {
      const qtyToDeduct = Number(item.quantity) || 1;
      const itemDesc = (item.description || item.name || '').trim();
      const itemSku = (item.sku || '').trim();
      const itemProdId = item.productId || item.id;

      // Find product by SKU, ID, or description/name
      const queryOr = [];
      if (itemSku) queryOr.push({ sku: itemSku });
      if (itemProdId && mongoose.isValidObjectId(itemProdId)) queryOr.push({ _id: itemProdId });
      if (itemDesc) queryOr.push({ name: new RegExp(`^${itemDesc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

      let matchedProduct = null;
      if (queryOr.length > 0) {
        matchedProduct = await Product.findOne({ $or: queryOr });
      }
      if (!matchedProduct && itemDesc) {
        matchedProduct = await Product.findOne({ name: new RegExp(itemDesc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') });
      }

      if (matchedProduct) {
        const prevStock = Number(matchedProduct.stockQuantity) || 0;
        const newStock = Math.max(0, prevStock - qtyToDeduct);
        matchedProduct.stockQuantity = newStock;
        matchedProduct.stockOut = (Number(matchedProduct.stockOut) || 0) + qtyToDeduct;
        if (matchedProduct.stockIn === undefined || matchedProduct.stockIn === 0) {
          matchedProduct.stockIn = prevStock + (Number(matchedProduct.stockOut) || 0);
        }
        await matchedProduct.save();

        // Create Stock audit log in MongoDB Stock collection
        await Stock.create({
          productId: matchedProduct._id?.toString() || matchedProduct.id || '',
          productSku: matchedProduct.sku,
          productName: matchedProduct.name,
          type: 'OUT',
          quantity: qtyToDeduct,
          previousStock: prevStock,
          currentStock: newStock,
          reason: `Bill Order #${invNo}`,
          invoice: invNo,
          customer: data.customer || 'Walk-in Patron',
          notes: `POS Bill allocation for ${qtyToDeduct} unit(s)`,
        });
      }
    }

    // Upsert or create new sale record
    const existing = await Sale.findOne({ invoice: invNo });
    if (existing) {
      existing.customer = data.customer || existing.customer;
      existing.customerPhone = data.customerPhone || existing.customerPhone;
      existing.customerAddress = data.customerAddress || existing.customerAddress;
      existing.customerGstin = data.customerGstin || existing.customerGstin;
      existing.items = typeof data.items === 'string' ? data.items : (data.itemSummary || existing.items);
      existing.itemDetails = lineItems.length > 0 ? lineItems : existing.itemDetails;
      existing.amount = rawAmt || existing.amount;
      existing.subtotal = Number(data.subtotal) || existing.subtotal;
      existing.taxAmount = Number(data.taxAmount) || existing.taxAmount;
      existing.discount = Number(data.discount) || existing.discount;
      existing.deliveryCharge = Number(data.deliveryCharge) || existing.deliveryCharge;
      existing.paymentStatus = data.paymentStatus || existing.paymentStatus;
      existing.paymentMode = data.paymentMode || existing.paymentMode;
      existing.billedBy = data.billedBy || data.salesPerson || existing.billedBy;
      existing.salesPerson = data.salesPerson || data.billedBy || existing.salesPerson;
      existing.amountPaid = Number(data.amountPaid) || existing.amountPaid;
      existing.balanceDue = Number(data.balanceDue) || existing.balanceDue;
      existing.notes = data.notes || existing.notes;
      const updated = await existing.save();
      console.log('[MongoDB] Updated existing invoice in MongoDB:', invNo);
      return res.json({ success: true, sale: updated });
    }

    const currentYear = new Date().getFullYear().toString();
    const newSale = new Sale({
      invoice: invNo,
      customer: data.customer || 'Walk-in Patron',
      customerPhone: data.customerPhone || '',
      customerAddress: data.customerAddress || '',
      customerGstin: data.customerGstin || '',
      location: data.location || data.project || 'Sivakasi Yard Sale',
      project: data.project || 'Timber Order',
      wood: data.wood || 'Artisan Timber',
      items: typeof data.items === 'string' ? data.items : (data.itemSummary || `${lineItems.length} Furniture Items`),
      itemDetails: lineItems,
      subtotal: Number(data.subtotal) || rawAmt,
      taxAmount: Number(data.taxAmount) || 0,
      discount: Number(data.discount) || 0,
      deliveryCharge: Number(data.deliveryCharge) || 0,
      amount: rawAmt,
      paymentStatus: data.paymentStatus || 'Pending',
      paymentMode: data.paymentMode || 'UPI',
      billedBy: data.billedBy || data.salesPerson || '',
      salesPerson: data.salesPerson || data.billedBy || '',
      amountPaid: Number(data.amountPaid) || (data.paymentStatus === 'Paid' ? rawAmt : 0),
      balanceDue: Number(data.balanceDue) || (data.paymentStatus === 'Paid' ? 0 : rawAmt),
      status: data.status || 'Dispatched',
      date: data.date ? new Date(data.date) : new Date(),
      invoiceDate: data.invoiceDate || new Date().toLocaleDateString('en-GB'),
      dueDate: data.dueDate || '',
      notes: data.notes || '',
      year: data.year || currentYear,
      monthYear: data.monthYear || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      volume: Number(data.volume) || 36,
    });

    const saved = await newSale.save();
    console.log('[MongoDB] Stored new sale record in MongoDB:', saved.invoice, 'Amount: ₹' + saved.amount);

    // If customer name is provided, update customer's lifetime value and order count in MongoDB
    if (data.customer && data.customer !== 'Walk-in Patron') {
      const cust = await Customer.findOne({ name: new RegExp(`^${data.customer.trim()}$`, 'i') });
      if (cust) {
        cust.totalOrders = (cust.totalOrders || 0) + 1;
        const currentLtv = Number(String(cust.lifetimeValue || 0).replace(/[^0-9.]/g, '')) || 0;
        cust.lifetimeValue = (currentLtv + rawAmt).toLocaleString('en-IN');
        await cust.save();
      }
    }

    // Increment ordersClosed for salesPerson in MongoDB if matched
    const spIdentifier = (data.billedBy || data.salesPerson || '').trim();
    if (spIdentifier) {
      const sp = await SalesPerson.findOne({
        $or: [
          { name: new RegExp(`^${spIdentifier}$`, 'i') },
          { code: new RegExp(`^${spIdentifier}$`, 'i') }
        ]
      });
      if (sp) {
        sp.ordersClosed = (Number(sp.ordersClosed) || 0) + 1;
        sp.achievedSales = (Number(sp.achievedSales) || 0) + rawAmt;
        await sp.save();
        console.log(`[MongoDB] Incremented ordersClosed for sales person: ${sp.name} (Total: ${sp.ordersClosed})`);
      }
    }

    res.status(201).json({ success: true, sale: saved });
  } catch (err) {
    console.error('[API] /api/sales POST error:', err);
    res.status(500).json({ success: false, message: 'Failed to record sale in MongoDB', error: err.message });
  }
});

// -------------------------------------------------------------
// STOCK MOVEMENTS & AUDIT API
// -------------------------------------------------------------
app.get('/api/stocks', async (req, res) => {
  try {
    const { type, search } = req.query;
    const query = {};
    if (type && type !== 'All') {
      query.type = type.toUpperCase();
    }
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [{ productName: reg }, { productSku: reg }, { invoice: reg }, { reason: reg }];
    }
    const stocks = await Stock.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: stocks.length, stocks });
  } catch (err) {
    console.error('[API] /api/stocks GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch stock records', error: err.message });
  }
});

app.post('/api/stocks', async (req, res) => {
  try {
    const { productId, productSku, productName, type, quantity, reason, invoice, customer, notes } = req.body;
    const qty = Math.max(1, Number(quantity) || 1);
    const movType = (type || 'IN').toUpperCase();

    // Find and update Product
    let product = null;
    if (productId && mongoose.isValidObjectId(productId)) {
      product = await Product.findById(productId);
    }
    if (!product && (productSku || productName)) {
      product = await Product.findOne({ $or: [{ sku: productSku }, { name: productName }] });
    }

    let prevStock = 0;
    let newStock = 0;

    if (product) {
      prevStock = Number(product.stockQuantity) || 0;
      if (movType === 'IN') {
        newStock = prevStock + qty;
        product.stockQuantity = newStock;
        product.stockIn = (Number(product.stockIn) || 0) + qty;
      } else {
        newStock = Math.max(0, prevStock - qty);
        product.stockQuantity = newStock;
        product.stockOut = (Number(product.stockOut) || 0) + qty;
      }
      await product.save();
    }

    const stockRecord = await Stock.create({
      productId: product?._id?.toString() || productId || '',
      productSku: product?.sku || productSku || '',
      productName: product?.name || productName || 'Artisan Furniture Item',
      type: movType,
      quantity: qty,
      previousStock: prevStock,
      currentStock: newStock,
      reason: reason || (movType === 'IN' ? 'Mill Yard Inflow' : 'POS Stock Out'),
      invoice: invoice || '',
      customer: customer || '',
      notes: notes || '',
    });

    res.status(201).json({ success: true, stock: stockRecord, product });
  } catch (err) {
    console.error('[API] /api/stocks POST error:', err);
    res.status(500).json({ success: false, message: 'Failed to record stock movement', error: err.message });
  }
});

// -------------------------------------------------------------
// PURCHASES API
// -------------------------------------------------------------
app.get('/api/purchases', async (req, res) => {
  try {
    const { search, paymentMode } = req.query;
    const query = {};

    if (paymentMode && paymentMode !== 'all') {
      query.paymentMode = new RegExp(`^${paymentMode.trim()}$`, 'i');
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [
        { invoiceNumber: reg },
        { supplier: reg },
        { item: reg },
        { category: reg },
      ];
    }

    const purchases = await Purchase.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: purchases.length, purchases });
  } catch (err) {
    console.error('[API] /api/purchases GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch purchases', error: err.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const data = req.body;
    if (!data.supplier || !data.supplier.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const totalCount = await Purchase.countDocuments();
    const invoiceNumber = data.invoiceNumber?.trim() || String(100 + totalCount);

    const newPurchase = new Purchase({
      invoiceNumber,
      supplier: data.supplier.trim(),
      supplierPhone: data.supplierPhone || '',
      date: data.date || new Date().toISOString().split('T')[0],
      item: data.item?.trim() || 'Artisan Timber Consignment',
      category: data.category || 'Timber Logs',
      quantity: data.quantity || '',
      amount: Number(data.amount) || 0,
      gstAmount: Number(data.gstAmount) || 0,
      paymentMode: data.paymentMode || 'Bank Wire',
      notes: data.notes || '',
    });

    const saved = await newPurchase.save();
    console.log('[API] Created new purchase consignment in MongoDB:', saved.invoiceNumber, saved.supplier);
    res.status(201).json({ success: true, purchase: saved });
  } catch (err) {
    console.error('[API] /api/purchases POST error:', err);
    res.status(500).json({ success: false, message: 'Failed to create purchase record', error: err.message });
  }
});

app.put('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let updated = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      updated = await Purchase.findByIdAndUpdate(id, req.body, { new: true });
    } else {
      updated = await Purchase.findOneAndUpdate({ invoiceNumber: id }, req.body, { new: true });
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    console.log('[API] Updated purchase consignment in MongoDB:', updated.invoiceNumber);
    res.json({ success: true, purchase: updated });
  } catch (err) {
    console.error('[API] /api/purchases PUT error:', err);
    res.status(500).json({ success: false, message: 'Failed to update purchase record', error: err.message });
  }
});

app.delete('/api/purchases', async (req, res) => {
  try {
    const result = await Purchase.deleteMany({});
    console.log('[API] Cleared all purchase records from MongoDB. Count:', result.deletedCount);
    res.json({ success: true, message: 'All purchase records cleared successfully', count: result.deletedCount });
  } catch (err) {
    console.error('[API] /api/purchases clear error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear purchases', error: err.message });
  }
});

app.delete('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await Purchase.findByIdAndDelete(id);
    } else {
      await Purchase.deleteMany({ $or: [{ invoiceNumber: id }, { id }] });
    }

    console.log('[API] Deleted purchase record:', id);
    res.json({ success: true, message: 'Purchase record deleted successfully' });
  } catch (err) {
    console.error('[API] /api/purchases DELETE error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete purchase record', error: err.message });
  }
});

// -------------------------------------------------------------
// SALES PERSONS API
// -------------------------------------------------------------
app.get('/api/sales-persons', async (req, res) => {
  try {
    const { search, paymentMode } = req.query;
    const query = {};

    if (paymentMode && paymentMode !== 'all') {
      query.paymentMode = new RegExp(`^${paymentMode.trim()}$`, 'i');
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      query.$or = [
        { code: reg },
        { name: reg },
        { phone: reg },
        { email: reg },
        { role: reg },
        { territory: reg },
      ];
    }

    const salesPersons = await SalesPerson.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: salesPersons.length, salesPersons });
  } catch (err) {
    console.error('[API] /api/sales-persons GET error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch sales persons', error: err.message });
  }
});

app.post('/api/sales-persons', async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return res.status(400).json({ success: false, message: 'Sales Person name is required' });
    }

    const totalCount = await SalesPerson.countDocuments();
    const code = data.code?.trim() || String(100 + totalCount);

    const newPerson = new SalesPerson({
      code,
      name: data.name.trim(),
      phone: data.phone || '',
      email: data.email || '',
      role: data.role || 'Sales Executive',
      territory: data.territory || 'Sivakasi & Virudhunagar',
      target: Number(data.target) || 0,
      achievedSales: Number(data.achievedSales) || 0,
      commissionRate: Number(data.commissionRate) || 3.0,
      paymentMode: data.paymentMode || 'Bank Wire',
      ordersClosed: Number(data.ordersClosed) || 0,
      joiningDate: data.joiningDate || new Date().toISOString().split('T')[0],
      notes: data.notes || '',
    });

    const saved = await newPerson.save();
    console.log('[API] Created new sales executive in MongoDB:', saved.code, saved.name);
    res.status(201).json({ success: true, salesPerson: saved });
  } catch (err) {
    console.error('[API] /api/sales-persons POST error:', err);
    res.status(500).json({ success: false, message: 'Failed to create sales person', error: err.message });
  }
});

app.put('/api/sales-persons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let updated = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      updated = await SalesPerson.findByIdAndUpdate(id, req.body, { new: true });
    } else {
      updated = await SalesPerson.findOneAndUpdate({ code: id }, req.body, { new: true });
    }

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Sales person not found' });
    }

    console.log('[API] Updated sales person in MongoDB:', updated.code, updated.name);
    res.json({ success: true, salesPerson: updated });
  } catch (err) {
    console.error('[API] /api/sales-persons PUT error:', err);
    res.status(500).json({ success: false, message: 'Failed to update sales person', error: err.message });
  }
});

app.delete('/api/sales-persons/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (mongoose.Types.ObjectId.isValid(id)) {
      await SalesPerson.findByIdAndDelete(id);
    } else {
      await SalesPerson.deleteMany({ $or: [{ code: id }, { id }] });
    }

    console.log('[API] Deleted sales person:', id);
    res.json({ success: true, message: 'Sales Person record deleted successfully' });
  } catch (err) {
    console.error('[API] /api/sales-persons DELETE error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete sales person', error: err.message });
  }
});

// -------------------------------------------------------------
// DASHBOARD API
// -------------------------------------------------------------
app.get('/api/dashboard', async (req, res) => {
  try {
    const [sales, products] = await Promise.all([
      Sale.find().sort({ createdAt: -1 }),
      Product.find(),
    ]);

    // Exact Today's boundaries
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Filter sales created today only
    const todaySales = sales.filter((s) => {
      const d = s.createdAt ? new Date(s.createdAt) : s.date ? new Date(s.date) : null;
      if (!d || isNaN(d.getTime())) return false;
      return d >= startOfToday && d <= endOfToday;
    });

    let todaySalesAmt = 0;
    for (const s of todaySales) {
      todaySalesAmt += Number(s.amount) || 0;
    }

    let totalStock = 0;
    const lowStockItems = [];
    for (const p of products) {
      const qty = Number(p.stockQuantity) || 0;
      const threshold = Number(p.lowStockThreshold || 2);
      totalStock += qty;

      if (qty <= threshold) {
        lowStockItems.push({
          name: p.name,
          category: p.category ? `${p.category} • ${p.woodSpecies || 'Timber'}` : 'Artisanal Timber',
          count: `${qty} left`,
        });
      }
    }

    const formattedTodaySales = todaySales.map((s) => ({
      id: s._id || s.invoice,
      invoice: s.invoice,
      customer: s.customer,
      location: s.location || s.project || s.customerAddress || 'Sivakasi Yard',
      items: s.items || (Array.isArray(s.itemDetails) && s.itemDetails.length > 0 ? s.itemDetails.map(i => `${i.quantity}x ${i.description || i.name}`).join(', ') : 'Artisan Timber Order'),
      amount: '₹' + Number(s.amount || 0).toLocaleString('en-IN'),
      rawAmount: Number(s.amount || 0),
      status: s.paymentStatus || s.status || 'Paid',
      paymentStatus: s.paymentStatus || 'Paid',
      createdAt: s.createdAt,
      date: s.date,
    }));

    // Persist live state to MongoDB Dashboard collection
    const dashboardDoc = await Dashboard.findOneAndUpdate(
      { key: 'main_dashboard' },
      {
        $set: {
          todaySales: todaySalesAmt,
          todaySalesFormatted: '₹' + todaySalesAmt.toLocaleString('en-IN'),
          ordersToday: todaySales.length,
          ordersTodayText: `${todaySales.length} orders processed today`,
          totalStock,
          stockLocationNote: 'Across Sivakasi master timber yards',
          lowStockCount: lowStockItems.length,
          lowStockAlerts: lowStockItems,
          recentSales: formattedTodaySales,
          lastUpdated: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      stats: {
        todaySales: '₹' + todaySalesAmt.toLocaleString('en-IN'),
        ordersToday: `${todaySales.length} orders processed today`,
        totalStock: totalStock.toLocaleString('en-IN'),
        stockLocationNote: 'Across Sivakasi master timber yards',
        lowStockCount: `${lowStockItems.length} items`,
      },
      lowStockItems: lowStockItems,
      recentSales: formattedTodaySales,
      dashboard: dashboardDoc,
    });
  } catch (err) {
    console.error('[API] /api/dashboard error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: err.message });
  }
});

// Serve static frontend in production if dist directory exists
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// Fallback for React Single Page Application (SPA)
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.json({
        status: 'ok',
        message: 'Kerala Wood Billing API is online',
        backendEnv: process.env.NODE_ENV || 'development',
      });
    }
  });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] Allowed CORS origin: ${FRONTEND_URL}`);
  if (MONGODB_URI) {
    console.log(`[Server] MongoDB URI configured`);
  }
});
