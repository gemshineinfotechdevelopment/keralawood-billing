import { Product } from './models/Product.js';
import { Sale } from './models/Sale.js';
import { Category } from './models/Category.js';
import { Customer } from './models/Customer.js';
import { Settings } from './models/Settings.js';
import { Dashboard } from './models/Dashboard.js';
import { Stock } from './models/Stock.js';

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
  } catch (error) {
    console.error('[Seed] Error seeding initial data:', error.message);
  }
}
