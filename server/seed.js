import { Category } from './models/Category.js';
import { Settings } from './models/Settings.js';
import { Dashboard } from './models/Dashboard.js';

export async function seedInitialData() {
  try {
    // 1. Settings - Only seed default if no settings exist in MongoDB
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

    // 2. Categories - Only seed default if none exist
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

    // 3. Dashboard Collection Initialization
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
  } catch (error) {
    console.error('[Seed] Error seeding initial data:', error.message);
  }
}
