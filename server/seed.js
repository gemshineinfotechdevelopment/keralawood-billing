import { Product } from './models/Product.js';
import { Sale } from './models/Sale.js';
import { Category } from './models/Category.js';
import { Customer } from './models/Customer.js';
import { Settings } from './models/Settings.js';
import { Dashboard } from './models/Dashboard.js';
import { Stock } from './models/Stock.js';
import { Purchase } from './models/Purchase.js';
import { SalesPerson } from './models/SalesPerson.js';

export async function seedInitialData() {
  try {
    // 1. Products - No dummy seed data (Only user/backend data)
    const DUMMY_SKUS = [
      'KWF-TB-NT-06 • Nilambur Teak', 'KWF-BD-RW-K01 • Kerala Rosewood', 'KWF-AC-TK-09 • Nilambur Teak',
      'KWF-SH-CN-03 • Bamboo & Mahogany', 'KWF-CT-AN-14 • Anjili Wild Timber', 'KWF-DK-JK-02 • Old-Growth Plavu',
      'KWF-WD-RW-03 • Rosewood', 'KWF-SF-TK-03 • Teak', 'KWF-CT-TK-08 • Teak', 'KWF-BD-TK-Q02 • Teak',
      'KWF-RC-TK-01 • Teak', 'KWF-PJ-TK-05 • Teak Brass', 'KWF-DT-RW-02 • Rosewood', 'KWF-SH-MH-06 • Mahogany',
      'KWF-TV-TK-04 • Teak', 'KWF-SW-TK-01 • Teak Brass', 'KWF-TB-TK-04 • Teak', 'KWF-SR-WD-03 • Hardwood',
      'KWF-SC-TK-07 • Teak', 'KWF-NS-RW-02 • Rosewood', 'KWF-CN-TK-03 • Live Teak', 'KWF-CT-RW-05 • Rosewood',
      'KWF-BN-TK-02 • Teak', 'KWF-BS-WD-01 • Teak',
      'KWF-TB-NT-06', 'KWF-BD-RW-K01', 'KWF-AC-TK-09', 'KWF-SH-CN-03', 'KWF-CT-AN-14', 'KWF-DK-JK-02',
      'KWF-WD-RW-03', 'KWF-SF-TK-03', 'KWF-CT-TK-08', 'KWF-BD-TK-Q02', 'KWF-RC-TK-01', 'KWF-PJ-TK-05',
      'KWF-DT-RW-02', 'KWF-SH-MH-06', 'KWF-TV-TK-04', 'KWF-SW-TK-01', 'KWF-TB-TK-04', 'KWF-SR-WD-03',
      'KWF-SC-TK-07', 'KWF-NS-RW-02', 'KWF-CN-TK-03', 'KWF-CT-RW-05', 'KWF-BN-TK-02', 'KWF-BS-WD-01',
      'KWF-DC-TK-02', 'KWF-CR-TK-01', 'KWF-SF-LV-08'
    ];
    await Product.deleteMany({ sku: { $in: DUMMY_SKUS } });

    // 2. Customers - No dummy seed data
    await Customer.deleteMany({});

    // 3. Settings
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      console.log('[Seed] Seeding initial settings in MongoDB...');
      await Settings.create({
        depotName: 'Kerala Wood Furniture - Sivakasi Depot',
        contactPhone: '+91 484 289 1204',
        contactEmail: 'depot@keralawood.in',
        address: 'Sivakasi Central Depot & Mill Yard, Sivakasi',
        dealerLicense: 'SFD/SVK/TMR/2023-884',
        operatingHours: 'Mon - Sat: 08:30 AM - 06:30 PM (Sun: Closed)',
        gstin: '32AABCP9821K1ZK',
        hsnCode: '9403',
        taxRate: '18% (Standard GST)',
        cgstRate: 9,
        sgstRate: 9,
        bankName: 'State Bank of India - Sivakasi Branch',
        accountNumber: '4092817290192',
        ifscCode: 'SBIN0008839',
        upiId: 'keralawood.depot@sbi',
        minStockThreshold: '5',
        moistureTarget: '10% - 12%',
        emailAlerts: true,
        smsNotifications: true,
        printFormat: 'A4 Ledger',
        paymentTerms: 'Immediate / POS',
        signatoryName: 'Rajesh Sivan',
        signatoryDesignation: 'Depot Lead & Store Manager',
        disclaimer:
          'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct',
        systemTime: '10:30 AM',
        systemDate: '',
      });
      console.log('[Seed] Seeded settings successfully.');
    }

    // 4. Sales / Invoices - No dummy seed data (real sales appear dynamically when billing)
    await Sale.deleteMany({
      invoice: {
        $in: [
          'INV-1001', 'INV-1002', 'INV-1003', 'INV-1004', 'INV-1005', 'INV-1006',
          'INV-1007', 'INV-1008', 'INV-1009', 'INV-1010', 'INV-1011', 'INV-1012',
          'INV-1013', 'INV-1014', 'INV-1015', 'INV-1016', 'INV-1017', 'INV-1018',
          'INV-1019', 'INV-1020', 'INV-1021', 'INV-1022', 'INV-1023', 'INV-1024'
        ]
      }
    });

    // 5. Categories
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log('[Seed] Seeding initial product categories...');
      await Category.insertMany([
        { name: 'Dining Sets & Tables', description: 'Handcrafted solid dining sets, refectory tables & benches' },
        { name: 'Beds & Bedroom', description: 'Four-poster, king & queen heritage beds and bedside chests' },
        { name: 'Armchairs & Seating', description: 'Artisan armchairs, colonial plantation chairs & planters' },
        { name: 'Storage & Bookcases', description: '5-tier architectural bookcases, credenzas & wardrobes' },
        { name: 'Executive Desks & Tables', description: 'Live-edge executive desks, boardroom tables & consoles' },
      ]);
      console.log('[Seed] Seeded 5 product categories successfully.');
    }

    // 6. Dashboard Collection Initialization
    const dashboardDoc = await Dashboard.findOne({ key: 'main_dashboard' });
    if (!dashboardDoc) {
      console.log('[Seed] Initializing Dashboard collection in MongoDB...');
      await Dashboard.create({
        key: 'main_dashboard',
        title: 'Kerala Wood Furniture - Central Depot Dashboard',
        todaySales: 0,
        todaySalesFormatted: '₹0',
        ordersToday: 0,
        ordersTodayText: '0 orders processed today',
        totalStock: 0,
        stockLocationNote: 'Across Sivakasi master timber yards',
        lowStockCount: 0,
        lowStockAlerts: [],
        recentSales: [],
        lastUpdated: new Date(),
      });
      console.log('[Seed] Dashboard collection initialized successfully.');
    }

    // 7. Stock Collection Initialization
    const stockCount = await Stock.countDocuments();
    if (stockCount === 0) {
      console.log('[Seed] Stock collection is initialized and ready for inward/outward timber logging.');
    }

    // 8. Purchases Collection Initialization
    const purchaseCount = await Purchase.countDocuments();
    if (purchaseCount === 0) {
      console.log('[Seed] Seeding initial timber purchases into MongoDB...');
      await Purchase.insertMany([
        {
          invoiceNumber: 'PUR-101',
          supplier: 'Wayanad Teak Forest Mills',
          supplierPhone: '+91 94471 28910',
          date: '2026-11-18',
          item: 'Grade-A Nilambur Teak Planks (6x4)',
          category: 'Timber Logs',
          quantity: '60 Pcs',
          amount: 145000,
          gstAmount: 26100,
          paymentMode: 'Bank Wire',
          notes: 'High grain density timber logs delivered from Wayanad forest depot.',
        },
        {
          invoiceNumber: 'PUR-102',
          supplier: 'Kallai Rosewood Consortium',
          supplierPhone: '+91 98492 41102',
          date: '2026-11-15',
          item: 'Seasoned Rosewood Sawn Timber',
          category: 'Hardwood Timber',
          quantity: '35 Pcs',
          amount: 182000,
          gstAmount: 32760,
          paymentMode: 'UPI',
          notes: 'Pre-seasoned timber for artisanal cabinet making.',
        },
        {
          invoiceNumber: 'PUR-103',
          supplier: 'Malabar Timber Imports & Depot',
          supplierPhone: '+91 97451 88320',
          date: '2026-11-10',
          item: 'Sal Wood Structural Beams',
          category: 'Structural Lumber',
          quantity: '80 Pcs',
          amount: 98000,
          gstAmount: 17640,
          paymentMode: 'Cheque',
          notes: 'Structural grade beams for framing and architectural joinery.',
        },
        {
          invoiceNumber: 'PUR-104',
          supplier: 'Godavari Hardwoods Ltd',
          supplierPhone: '+91 88921 77310',
          date: '2026-11-04',
          item: 'Acacia Furniture Blocks & Billets',
          category: 'Sawn Wood',
          quantity: '110 Pcs',
          amount: 76000,
          gstAmount: 13680,
          paymentMode: 'Cash',
          notes: 'Kiln dried billets ready for lathe processing.',
        },
      ]);
      console.log('[Seed] Seeded initial purchases successfully.');
    }

    // 9. Sales Person Collection Initialization
    const salesPersonCount = await SalesPerson.countDocuments();
    if (salesPersonCount === 0) {
      console.log('[Seed] Seeding initial sales executives into MongoDB...');
      await SalesPerson.insertMany([
        {
          code: 'SP-101',
          name: 'Anand Kumar',
          phone: '+91 98421 55670',
          ordersClosed: 26,
        },
        {
          code: 'SP-102',
          name: 'Meenakshi Sundaram',
          phone: '+91 97892 44102',
          ordersClosed: 32,
        },
        {
          code: 'SP-103',
          name: 'Karthik Raja',
          phone: '+91 99433 11890',
          ordersClosed: 41,
        },
        {
          code: 'SP-104',
          name: 'Divya Prakash',
          phone: '+91 94420 88210',
          ordersClosed: 19,
        },
      ]);
      console.log('[Seed] Seeded initial sales persons successfully.');
    }
  } catch (error) {
    console.error('[Seed] Error seeding initial data:', error.message);
  }
}
