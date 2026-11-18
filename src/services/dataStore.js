// Centralized Dynamic Data Store with LocalStorage Persistence & MongoDB Backend Sync
// Supports multiple concurrent bills, dynamic products, customers, settings, and reports

const STORAGE_KEYS = {
  PRODUCTS: 'sivakasi_wood_products',
  CUSTOMERS: 'sivakasi_wood_customers',
  BILLS: 'sivakasi_wood_bills',
  ACTIVE_BILL_ID: 'sivakasi_wood_active_bill_id',
  TRANSACTIONS: 'sivakasi_wood_transactions',
  SETTINGS: 'sivakasi_wood_settings',
}

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''

// System Settings (Company: Kerala Wood Furniture, Location: Sivakasi)
const INITIAL_SETTINGS = {
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
  printFormat: 'A4 Ledger', // 'A4 Ledger' | 'Thermal Slip'
  paymentTerms: 'Immediate / POS',
  signatoryName: 'Rajesh Sivan',
  signatoryDesignation: 'Depot Lead & Store Manager',
  disclaimer: 'Natural variations in teak & rosewood grain are organic characteristics. Claims accepted within 7 days of yard delivery.',
  systemTime: '10:30 AM',
  systemDate: '',
}

// Products Catalog (24 items to support minimum 20 items per ledger page)
const INITIAL_PRODUCTS = [
  { id: 'prod-1', sku: 'KWF-TB-NT-06', name: 'Nilambur Teak 6-Seater Dining Set', finish: 'Grade-A Matte Walnut Finish', category: 'Dining Sets', unitPrice: 54000, stockQuantity: 4, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-2', sku: 'KWF-DC-TK-02', name: 'Teakwood Dining Chairs with Cane Weave', finish: 'Handcrafted Rattan Back', category: 'Chairs', unitPrice: 6500, stockQuantity: 18, lowStockThreshold: 4, woodSpecies: 'Teak' },
  { id: 'prod-3', sku: 'KWF-CR-TK-01', name: 'Solid Teak Side Server Credenza', finish: 'Brass Pull Inlays', category: 'Storage', unitPrice: 24000, stockQuantity: 3, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-4', sku: 'KWF-BD-RW-K01', name: 'Solid Rosewood Royal King Bed', finish: 'Hand-Carved Headboard & Natural Beeswax', category: 'Beds', unitPrice: 78000, stockQuantity: 2, lowStockThreshold: 1, woodSpecies: 'Rosewood' },
  { id: 'prod-5', sku: 'KWF-SF-LV-08', name: 'Teak Frame 3-Seater Artisan Sofa', finish: 'Raw Organic Cotton & Walnut Polish', category: 'Living', unitPrice: 42000, stockQuantity: 5, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-6', sku: 'KWF-SH-CN-03', name: 'Handcrafted Cane Bookcase', finish: 'Bamboo & Mahogany 5-Tier', category: 'Storage', unitPrice: 18500, stockQuantity: 4, lowStockThreshold: 2, woodSpecies: 'Mahogany' },
  { id: 'prod-7', sku: 'KWF-CT-AN-14', name: 'Anjili Heritage Brass Chest', finish: 'Antique Brass Studded', category: 'Storage', unitPrice: 22500, stockQuantity: 7, lowStockThreshold: 2, woodSpecies: 'Anjili' },
  { id: 'prod-8', sku: 'KWF-DK-JK-02', name: 'Jackfruit Live-Edge Boardroom Desk', finish: 'Natural Plavu Oil Polish', category: 'Tables', unitPrice: 95000, stockQuantity: 4, lowStockThreshold: 1, woodSpecies: 'Jackfruit' },
  { id: 'prod-9', sku: 'KWF-WD-RW-03', name: 'Rosewood 3-Door Master Wardrobe', finish: 'Hand-Polished Rosewood Finish', category: 'Storage', unitPrice: 68000, stockQuantity: 3, lowStockThreshold: 1, woodSpecies: 'Rosewood' },
  { id: 'prod-10', sku: 'KWF-CT-TK-08', name: 'Solid Teak Coffee Table Glass Top', finish: 'Tempered Glass with Teak Base', category: 'Tables', unitPrice: 16500, stockQuantity: 6, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-11', sku: 'KWF-BD-TK-Q02', name: 'Teakwood Queen Hydraulic Storage Bed', finish: 'Warm Honey Teak Polish', category: 'Beds', unitPrice: 62000, stockQuantity: 4, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-12', sku: 'KWF-RC-TK-01', name: 'Traditional Hand-Carved Rocking Chair', finish: 'Ergonomic Curved Slats', category: 'Chairs', unitPrice: 12800, stockQuantity: 9, lowStockThreshold: 3, woodSpecies: 'Teak' },
  { id: 'prod-13', sku: 'KWF-PJ-TK-05', name: 'Kerala Traditional Mandapam Pooja Unit', finish: 'Carved Gopuram & Brass Bells', category: 'Living', unitPrice: 34000, stockQuantity: 3, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-14', sku: 'KWF-DT-RW-02', name: 'Solid Rosewood Dressing Table with Mirror', finish: 'Beveled Belgian Mirror & Velvet Drawers', category: 'Beds', unitPrice: 29500, stockQuantity: 4, lowStockThreshold: 1, woodSpecies: 'Rosewood' },
  { id: 'prod-15', sku: 'KWF-SH-MH-06', name: 'Mahogany 6-Shelf Library Display Rack', finish: 'Gloss Mahogany Polish', category: 'Storage', unitPrice: 21000, stockQuantity: 5, lowStockThreshold: 2, woodSpecies: 'Mahogany' },
  { id: 'prod-16', sku: 'KWF-TV-TK-04', name: 'Teakwood TV Media Entertainment Console', finish: 'Cable Ports & Louvered Slats', category: 'Living', unitPrice: 26500, stockQuantity: 7, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-17', sku: 'KWF-SW-TK-01', name: 'Handcrafted Wooden Oonjal Swing with Brass Chains', finish: 'Heavy Cast Brass Carved Chains', category: 'Living', unitPrice: 48000, stockQuantity: 2, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-18', sku: 'KWF-TB-TK-04', name: 'Teakwood 4-Seater Compact Dining Set', finish: 'Space-Saving Tuck-in Chairs', category: 'Dining Sets', unitPrice: 36000, stockQuantity: 8, lowStockThreshold: 2, woodSpecies: 'Teak' },
  { id: 'prod-19', sku: 'KWF-SR-WD-03', name: 'Solid Wood 3-Tier Louvered Shoe Rack', finish: 'Ventilated Louver Doors', category: 'Storage', unitPrice: 9500, stockQuantity: 12, lowStockThreshold: 3, woodSpecies: 'Hardwood' },
  { id: 'prod-20', sku: 'KWF-SC-TK-07', name: 'High-Back Ergonomic Teak Study Chair', finish: 'Cushioned Leatherette Seat', category: 'Chairs', unitPrice: 8500, stockQuantity: 10, lowStockThreshold: 3, woodSpecies: 'Teak' },
  { id: 'prod-21', sku: 'KWF-NS-RW-02', name: 'Rosewood Dual-Drawer Bedside Nightstand', finish: 'Brass Knob Hardware', category: 'Beds', unitPrice: 7200, stockQuantity: 11, lowStockThreshold: 3, woodSpecies: 'Rosewood' },
  { id: 'prod-22', sku: 'KWF-CN-TK-03', name: 'Live-Edge Teak Entryway Console Table', finish: 'Natural Edge Black Hairpin Legs', category: 'Tables', unitPrice: 19800, stockQuantity: 4, lowStockThreshold: 1, woodSpecies: 'Teak' },
  { id: 'prod-23', sku: 'KWF-CT-RW-05', name: 'Vintage 5-Drawer Wooden Chest', finish: 'Antiqued Hand-Waxed Rosewood', category: 'Storage', unitPrice: 31000, stockQuantity: 3, lowStockThreshold: 1, woodSpecies: 'Rosewood' },
  { id: 'prod-24', sku: 'KWF-BN-TK-02', name: 'Teakwood Solid Dining Bench', finish: 'Chamfered Edge Minimalist Legs', category: 'Dining Sets', unitPrice: 11500, stockQuantity: 6, lowStockThreshold: 2, woodSpecies: 'Teak' },
]

const INITIAL_CUSTOMERS = []

const INITIAL_TRANSACTIONS = [
  { id: 'INV-1024', date: 'Nov 17, 2026, 05:45 PM', monthYear: 'November 2026', year: '2026', customer: 'Suresh Kumar & Sons', project: 'Sivakasi Town', wood: 'Nilambur Teak', item: '1x Teak Dining Table, 6x Chairs', volume: 42, amount: '60,500', rawAmount: 60500, status: 'Paid' },
  { id: 'INV-1023', date: 'Nov 17, 2026, 04:15 PM', monthYear: 'November 2026', year: '2026', customer: 'Dr. Thomas Varghese', project: 'Sivakasi Division', wood: 'Rosewood Timber', item: '1x Solid Rosewood King Bed, 2x Nightstands', volume: 54, amount: '85,200', rawAmount: 85200, status: 'Paid' },
  { id: 'INV-1022', date: 'Nov 16, 2026, 03:30 PM', monthYear: 'November 2026', year: '2026', customer: 'Priya Lakshmi Textiles', project: 'Kamaraj Road, Sivakasi', wood: 'Nilambur Teak', item: '1x Teakwood 3-Seater Sofa, 1x Coffee Table', volume: 38, amount: '58,500', rawAmount: 58500, status: 'Paid' },
  { id: 'INV-1021', date: 'Nov 16, 2026, 01:20 PM', monthYear: 'November 2026', year: '2026', customer: 'Deepak Kurian & Architects', project: 'Sivakasi Guild', wood: 'Jackfruit Plavu', item: '1x Jackfruit Live-Edge Boardroom Desk', volume: 68, amount: '95,000', rawAmount: 95000, status: 'Paid' },
  { id: 'INV-1020', date: 'Nov 15, 2026, 05:10 PM', monthYear: 'November 2026', year: '2026', customer: 'Rajeshwari Ammal', project: 'Main Bazaar, Sivakasi', wood: 'Nilambur Teak', item: '1x Kerala Traditional Mandapam Pooja Unit', volume: 32, amount: '34,000', rawAmount: 34000, status: 'Paid' },
  { id: 'INV-1019', date: 'Nov 15, 2026, 02:45 PM', monthYear: 'November 2026', year: '2026', customer: 'Anoop Menon', project: 'Sivakasi Colony', wood: 'Nilambur Teak', item: '1x Teakwood Queen Hydraulic Storage Bed', volume: 46, amount: '62,000', rawAmount: 62000, status: 'Paid' },
  { id: 'INV-1018', date: 'Nov 14, 2026, 04:00 PM', monthYear: 'November 2026', year: '2026', customer: 'Sri Meenakshi Printers', project: 'Industrial Area, Sivakasi', wood: 'Rosewood Timber', item: '1x Rosewood 3-Door Master Wardrobe', volume: 58, amount: '68,000', rawAmount: 68000, status: 'Paid' },
  { id: 'INV-1017', date: 'Nov 14, 2026, 11:30 AM', monthYear: 'November 2026', year: '2026', customer: 'Murugan Modern Furnishings', project: 'Bypass Road, Sivakasi', wood: 'Nilambur Teak', item: '4x High-Back Ergonomic Teak Study Chairs', volume: 24, amount: '34,000', rawAmount: 34000, status: 'Paid' },
  { id: 'INV-1016', date: 'Nov 13, 2026, 03:15 PM', monthYear: 'November 2026', year: '2026', customer: 'Senthil Nathan', project: 'Police Station Rd, Sivakasi', wood: 'Nilambur Teak', item: '1x Handcrafted Wooden Oonjal Swing', volume: 40, amount: '48,000', rawAmount: 48000, status: 'Paid' },
  { id: 'INV-1015', date: 'Nov 13, 2026, 10:45 AM', monthYear: 'November 2026', year: '2026', customer: 'Dr. K. Radhakrishnan', project: 'Gandhi Nagar, Sivakasi', wood: 'Rosewood Timber', item: '1x Solid Rosewood Dressing Table with Mirror', volume: 28, amount: '29,500', rawAmount: 29500, status: 'Paid' },
  { id: 'INV-1014', date: 'Nov 12, 2026, 04:30 PM', monthYear: 'November 2026', year: '2026', customer: 'Anandha Bhavan Residency', project: 'Station Rd, Sivakasi', wood: 'Nilambur Teak', item: '1x Teakwood 4-Seater Dining Set', volume: 34, amount: '36,000', rawAmount: 36000, status: 'Paid' },
  { id: 'INV-1013', date: 'Nov 12, 2026, 01:15 PM', monthYear: 'November 2026', year: '2026', customer: 'Vignesh Construction Co.', project: 'Ring Road, Sivakasi', wood: 'Mahogany', item: '1x Mahogany 6-Shelf Library Display Rack', volume: 36, amount: '21,000', rawAmount: 21000, status: 'Paid' },
  { id: 'INV-1012', date: 'Nov 11, 2026, 05:00 PM', monthYear: 'November 2026', year: '2026', customer: 'Karthik Raja', project: 'Teachers Colony, Sivakasi', wood: 'Nilambur Teak', item: '1x Teakwood TV Media Entertainment Console', volume: 26, amount: '26,500', rawAmount: 26500, status: 'Paid' },
  { id: 'INV-1011', date: 'Nov 11, 2026, 11:20 AM', monthYear: 'November 2026', year: '2026', customer: 'Selvi Thirumalai', project: 'Sankarankovil Rd, Sivakasi', wood: 'Nilambur Teak', item: '1x Traditional Hand-Carved Rocking Chair', volume: 18, amount: '12,800', rawAmount: 12800, status: 'Paid' },
  { id: 'INV-1010', date: 'Nov 10, 2026, 03:45 PM', monthYear: 'November 2026', year: '2026', customer: 'Vijayalakshmi Sweets', project: 'South Car Street, Sivakasi', wood: 'Nilambur Teak', item: '2x Teak Ergonomic Armchairs', volume: 22, amount: '29,000', rawAmount: 29000, status: 'Paid' },
  { id: 'INV-1009', date: 'Nov 10, 2026, 10:30 AM', monthYear: 'November 2026', year: '2026', customer: 'Jayaram Brothers', project: 'Thirutangal Rd, Sivakasi', wood: 'Mahogany', item: '1x Handcrafted Cane Bookcase', volume: 25, amount: '18,500', rawAmount: 18500, status: 'Paid' },
  { id: 'INV-1008', date: 'Nov 09, 2026, 04:15 PM', monthYear: 'November 2026', year: '2026', customer: 'Dr. N. Soundararajan', project: 'Hospital Road, Sivakasi', wood: 'Wild Anjili', item: '1x Anjili Heritage Brass Chest', volume: 30, amount: '22,500', rawAmount: 22500, status: 'Paid' },
  { id: 'INV-1007', date: 'Nov 09, 2026, 11:00 AM', monthYear: 'November 2026', year: '2026', customer: 'Malarvizhi Interiors', project: 'North Car Street, Sivakasi', wood: 'Nilambur Teak', item: '1x Live-Edge Teak Entryway Console Table', volume: 24, amount: '19,800', rawAmount: 19800, status: 'Paid' },
  { id: 'INV-1006', date: 'Nov 08, 2026, 03:00 PM', monthYear: 'November 2026', year: '2026', customer: 'Balaji Agency', project: 'Sattur Road, Sivakasi', wood: 'Hardwood', item: '1x Solid Wood 3-Tier Louvered Shoe Rack', volume: 16, amount: '9,500', rawAmount: 9500, status: 'Paid' },
  { id: 'INV-1005', date: 'Nov 08, 2026, 09:45 AM', monthYear: 'November 2026', year: '2026', customer: 'Manickam & Sons Traders', project: 'Market Yard, Sivakasi', wood: 'Rosewood Timber', item: '1x Vintage 5-Drawer Wooden Chest', volume: 35, amount: '31,000', rawAmount: 31000, status: 'Paid' },
  { id: 'INV-1004', date: 'Nov 07, 2026, 04:30 PM', monthYear: 'November 2026', year: '2026', customer: 'Sree Saravana Match Works', project: 'Sivakasi Depot', wood: 'Nilambur Teak', item: '2x Teakwood Solid Dining Benches', volume: 28, amount: '23,000', rawAmount: 23000, status: 'Paid' },
  { id: 'INV-1003', date: 'Nov 07, 2026, 01:15 PM', monthYear: 'November 2026', year: '2026', customer: 'K. Vasanth Kumar', project: 'Velayutham Colony, Sivakasi', wood: 'Nilambur Teak', item: '2x Wooden Bar Stools with Swivel Top', volume: 15, amount: '13,600', rawAmount: 13600, status: 'Paid' },
  { id: 'INV-1002', date: 'Nov 06, 2026, 03:50 PM', monthYear: 'November 2026', year: '2026', customer: 'Gowri Shankar Mills', project: 'Vembakottai Rd, Sivakasi', wood: 'Nilambur Teak', item: '1x Solid Teak Side Server Credenza', volume: 29, amount: '24,000', rawAmount: 24000, status: 'Paid' },
  { id: 'INV-1001', date: 'Nov 05, 2026, 11:30 AM', monthYear: 'November 2026', year: '2026', customer: 'Shanmuga Priya', project: 'Alagappan Nagar, Sivakasi', wood: 'Rosewood Timber', item: '2x Rosewood Dual-Drawer Bedside Nightstands', volume: 20, amount: '14,400', rawAmount: 14400, status: 'Paid' },
]

const EMPTY_INITIAL_CUSTOMER = {
  id: 'cust-empty-1',
  name: '',
  phone: '',
  address: '',
  deliveryAddress: '',
  location: '',
  gstin: '',
  totalOrders: 0,
  lifetimeValue: 0,
}

const INITIAL_BILLS = [
  {
    id: 'bill-1',
    invoiceNumber: 'INV-1003',
    invoiceDate: '2026-11-17',
    dueDate: '2026-12-02',
    name: 'Bill #1',
    status: 'active',
    customer: EMPTY_INITIAL_CUSTOMER,
    items: [],
    paymentStatus: 'Pending',
    paymentMode: 'UPI',
    packagingNote: '',
    deliveryApplied: true,
  },
]

// Dispatch store changes to notify components
function notifyStoreUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('timber_store_updated'))
  }
}

// Helpers for localStorage
function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (err) {
    console.warn(`[dataStore] load ${key} error:`, err)
    return fallback
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`[dataStore] save ${key} error:`, err)
  }
}

export const DataStore = {
  // SYNC WITH BACKEND
  async syncFromBackend() {
    try {
      // 1. Sync Settings
      const resSettings = await fetch(`${API_BASE}/api/settings`).catch(() => null)
      if (resSettings && resSettings.ok) {
        const data = await resSettings.json()
        if (data.settings) {
          saveToStorage(STORAGE_KEYS.SETTINGS, data.settings)
        }
      }

      // 2. Sync Products
      const resProducts = await fetch(`${API_BASE}/api/products`).catch(() => null)
      if (resProducts && resProducts.ok) {
        const data = await resProducts.json()
        if (data.products && data.products.length > 0) {
          saveToStorage(STORAGE_KEYS.PRODUCTS, data.products)
        }
      }

      // 3. Sync Customers
      const resCustomers = await fetch(`${API_BASE}/api/customers`).catch(() => null)
      if (resCustomers && resCustomers.ok) {
        const data = await resCustomers.json()
        if (data.customers && data.customers.length > 0) {
          const formatted = data.customers.map((c) => ({
            id: c._id || c.id || Date.now(),
            name: c.name,
            personName: c.personName || c.name,
            phone: c.phone || '',
            email: c.email || '',
            location: c.location || '',
            address: c.address || '',
            deliveryAddress: c.deliveryAddress || c.address || '',
            gstin: c.gstin || 'Unregistered / Personal',
            type: c.type || 'Residential',
            totalOrders: c.totalOrders || 0,
            lifetimeValue: c.lifetimeValue || '0',
            outstandingBalance: c.outstandingBalance || '0',
            creditUsed: c.creditUsed || '0',
            creditTotal: c.creditTotal || '2,00,000',
            recentTx: c.recentTx || [],
          }))
          saveToStorage(STORAGE_KEYS.CUSTOMERS, formatted)
        }
      }

      // 4. Sync Sales / Transactions
      const resSales = await fetch(`${API_BASE}/api/sales`).catch(() => null)
      if (resSales && resSales.ok) {
        const data = await resSales.json()
        if (data.sales && data.sales.length > 0) {
          const formatted = data.sales.map((s) => ({
            id: s.invoice,
            invoice: s.invoice,
            date: s.date ? new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Nov 17, 2026',
            year: s.year || '2026',
            monthYear: s.monthYear || 'November 2026',
            customer: s.customer,
            project: s.location || 'Sivakasi Yard Sale',
            wood: s.wood || 'Artisan Timber',
            item: s.items,
            amount: Number(s.amount || 0).toLocaleString('en-IN'),
            rawAmount: Number(s.amount || 0),
            status: s.paymentStatus || s.status || 'Paid',
          }))
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, formatted)
        }
      }

      notifyStoreUpdate()
    } catch (err) {
      console.warn('[dataStore] Background sync failed, using offline cache:', err.message)
    }
  },

  // SETTINGS
  getSettings() {
    return loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
  },
  saveSettings(settings) {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings)
    notifyStoreUpdate()

    // Sync to backend MongoDB
    fetch(`${API_BASE}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    }).catch(() => {})
  },

  // PRODUCTS
  getProducts() {
    const raw = loadFromStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS)
    return (raw || []).map((p) => {
      const stockQuantity = Number(p.stockQuantity) || 0
      const stockOut = Number(p.stockOut) || 0
      const stockIn = p.stockIn !== undefined ? Number(p.stockIn) : (stockQuantity + stockOut)
      return {
        ...p,
        stockQuantity,
        stockIn,
        stockOut,
      }
    })
  },
  saveProducts(list) {
    saveToStorage(STORAGE_KEYS.PRODUCTS, list)
    notifyStoreUpdate()
  },
  recordStockIn(productId, qtyToAdd) {
    const list = this.getProducts()
    const target = list.find((p) => p.id === productId || p.sku === productId || p.name === productId)
    if (target) {
      const add = Math.max(1, Number(qtyToAdd) || 1)
      target.stockIn = (Number(target.stockIn) || 0) + add
      target.stockQuantity = (Number(target.stockQuantity) || 0) + add
      this.saveProducts(list)
    }
  },
  recordStockOut(productId, qtyToDeduct) {
    const list = this.getProducts()
    const target = list.find((p) => p.id === productId || p.sku === productId || p.name === productId)
    if (target) {
      const deduct = Math.max(1, Number(qtyToDeduct) || 1)
      target.stockOut = (Number(target.stockOut) || 0) + deduct
      target.stockQuantity = Math.max(0, (Number(target.stockQuantity) || 0) - deduct)
      this.saveProducts(list)
    }
  },
  addProduct(item) {
    const list = this.getProducts()
    const qty = Number(item.stockQuantity) || 4
    const threshold = Number(item.lowStockThreshold) || 2
    const numPrice = Number(item.sellingPrice) || 45000

    const existingIndex = list.findIndex(
      (p) => (item.sku && p.sku === item.sku) || (item.name && p.name.toLowerCase() === item.name.toLowerCase())
    )

    if (existingIndex >= 0) {
      const existing = list[existingIndex]
      const newQty = (Number(existing.stockQuantity) || 0) + qty
      const newStockIn = (Number(existing.stockIn) || Number(existing.stockQuantity) || 0) + qty
      let stockType = 'in-stock'
      let stockLabel = `${newQty} in stock`
      if (newQty <= 1) {
        stockType = 'critical'
        stockLabel = `${newQty} left (Critical)`
      } else if (newQty <= (existing.lowStockThreshold || threshold)) {
        stockType = 'low'
        stockLabel = `${newQty} in stock (Low)`
      }
      list[existingIndex] = {
        ...existing,
        stockQuantity: newQty,
        stockIn: newStockIn,
        stock: stockLabel,
        stockType,
        unitPrice: numPrice || existing.unitPrice,
        price: '₹' + (numPrice || existing.unitPrice).toLocaleString('en-IN'),
      }
      this.saveProducts(list)

      // Sync stock update to MongoDB
      fetch(`${API_BASE}/api/products/${encodeURIComponent(existing.sku || existing.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: newQty, stockIn: newStockIn, sellingPrice: numPrice || existing.unitPrice }),
      }).catch(() => {})

      return list[existingIndex]
    }

    let stockType = 'in-stock'
    let stockLabel = `${qty} in stock`
    if (qty <= 1) {
      stockType = 'critical'
      stockLabel = `${qty} left (Critical)`
    } else if (qty <= threshold) {
      stockType = 'low'
      stockLabel = `${qty} in stock (Low)`
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      sku: item.sku || `KWF-${Date.now().toString().slice(-4)}`,
      name: item.name || 'Artisan Timber Furniture',
      finish: item.surfacePolish || item.finish || 'Matte Natural Wax Finish',
      category: item.category || 'Dining Sets',
      unitPrice: numPrice,
      price: '₹' + numPrice.toLocaleString('en-IN'),
      sellingPrice: numPrice,
      stockQuantity: qty,
      stockIn: qty,
      stockOut: 0,
      stock: stockLabel,
      stockType,
      lowStockThreshold: threshold,
      woodSpecies: item.woodSpecies || 'Teak',
      description: item.description || '',
      dimensions: item.dimensions || { length: 0, width: 0, height: 0, weight: 0 },
      woodGrade: item.woodGrade || '',
      surfacePolish: item.surfacePolish || '',
      joineryTechnique: item.joineryTechnique || '',
      warranty: item.warranty || '',
      depotLocation: item.depotLocation || '',
      packagingType: item.packagingType || '',
      shippingClass: item.shippingClass || '',
      tradeDiscount: item.tradeDiscount || '',
    }
    list.unshift(newProduct)
    this.saveProducts(list)

    // Sync create to MongoDB
    fetch(`${API_BASE}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    }).catch(() => {})

    return newProduct
  },
  updateProduct(item) {
    const list = this.getProducts()
    const targetId = item.id || item._id || item.sku
    const numPrice = Number(item.sellingPrice || item.unitPrice || 0) || 45000
    const qty = Number(item.stockQuantity !== undefined ? item.stockQuantity : 4)
    const threshold = Number(item.lowStockThreshold || 2)

    let stockType = 'in-stock'
    let stockLabel = `${qty} in stock`
    if (qty <= 1) {
      stockType = 'critical'
      stockLabel = `${qty} left (Critical)`
    } else if (qty <= threshold) {
      stockType = 'low'
      stockLabel = `${qty} in stock (Low)`
    }

    let updatedItem = null
    const updated = list.map((p) => {
      if (p.id === targetId || p._id === targetId || p.sku === item.sku || p.name === item.name) {
        const existingStockOut = Number(p.stockOut || 0)
        const computedStockIn = item.stockIn !== undefined
          ? Number(item.stockIn)
          : (p.stockIn !== undefined ? Number(p.stockIn) : (qty + existingStockOut))
        const computedStockOut = item.stockOut !== undefined ? Number(item.stockOut) : existingStockOut

        updatedItem = {
          ...p,
          ...item,
          id: p.id || targetId,
          sku: item.sku || p.sku,
          name: item.name || p.name,
          category: item.category || p.category,
          woodSpecies: item.woodSpecies || p.woodSpecies,
          finish: item.surfacePolish || item.finish || p.finish,
          unitPrice: numPrice,
          price: '₹' + numPrice.toLocaleString('en-IN'),
          sellingPrice: numPrice,
          stockQuantity: qty,
          stockIn: computedStockIn,
          stockOut: computedStockOut,
          stock: stockLabel,
          stockType,
          lowStockThreshold: threshold,
          description: item.description !== undefined ? item.description : p.description,
          dimensions: item.dimensions || p.dimensions,
          woodGrade: item.woodGrade || p.woodGrade,
          surfacePolish: item.surfacePolish || p.surfacePolish,
          joineryTechnique: item.joineryTechnique || p.joineryTechnique,
          warranty: item.warranty || p.warranty,
          depotLocation: item.depotLocation || p.depotLocation,
          packagingType: item.packagingType || p.packagingType,
          shippingClass: item.shippingClass || p.shippingClass,
          tradeDiscount: item.tradeDiscount || p.tradeDiscount,
        }
        return updatedItem
      }
      return p
    })

    if (!updatedItem) {
      updatedItem = { ...item, id: targetId, price: '₹' + numPrice.toLocaleString('en-IN'), stock: stockLabel, stockType }
      updated.unshift(updatedItem)
    }

    this.saveProducts(updated)

    // Sync update to MongoDB
    fetch(`${API_BASE}/api/products/${encodeURIComponent(item._id || item.id || item.sku || item.name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedItem),
    }).catch(() => {})

    return updatedItem
  },
  deleteProduct(productId) {
    const list = this.getProducts()
    const target = list.find((p) => p.id === productId || p._id === productId || p.sku === productId)
    const filtered = list.filter((p) => p.id !== productId && p._id !== productId && p.sku !== productId)
    this.saveProducts(filtered)

    // Sync delete to MongoDB
    const idToSync = (target && (target._id || target.id || target.sku)) || productId
    fetch(`${API_BASE}/api/products/${encodeURIComponent(idToSync)}`, {
      method: 'DELETE',
    }).catch(() => {})

    return filtered
  },
  updateStock(productId, newQty) {
    const list = this.getProducts()
    let target = null
    const updated = list.map((p) => {
      if (p.id === productId || p.sku === productId || p.name === productId) {
        const qty = Math.max(0, newQty)
        const threshold = p.lowStockThreshold || 2
        let stockType = 'in-stock'
        let stockLabel = `${qty} in stock`
        if (qty <= 1) {
          stockType = 'critical'
          stockLabel = `${qty} left (Critical)`
        } else if (qty <= threshold) {
          stockType = 'low'
          stockLabel = `${qty} in stock (Low)`
        }
        target = { ...p, stockQuantity: qty, stock: stockLabel, stockType }
        return target
      }
      return p
    })
    this.saveProducts(updated)

    if (target) {
      fetch(`${API_BASE}/api/products/${encodeURIComponent(target.sku || target.name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQuantity: target.stockQuantity }),
      }).catch(() => {})
    }
  },

  // CUSTOMERS
  getCustomers() {
    return loadFromStorage(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS)
  },
  saveCustomers(list) {
    saveToStorage(STORAGE_KEYS.CUSTOMERS, list)
    notifyStoreUpdate()
  },
  addCustomer(c) {
    const list = this.getCustomers()
    const nameParts = (c.name || 'New Patron').split(' ')
    const initials = nameParts.length > 1 ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase() : nameParts[0].slice(0, 2).toUpperCase()
    const newCustomer = {
      id: Date.now(),
      initials,
      avatarBg: '#5C3A21',
      avatarColor: '#FFFFFF',
      name: c.name || 'New Patron',
      personName: c.personName || c.name,
      type: c.type || 'Residential',
      fullTypeLabel: `${c.name} • ${c.type || 'Client'}`,
      phone: c.phone || '',
      email: c.email || '',
      location: c.location || 'Sivakasi Yard Division',
      address: c.address || '',
      deliveryAddress: c.deliveryAddress || c.address || '',
      gstin: c.gstin || 'Unregistered / Personal',
      totalOrders: 0,
      lifetimeValue: '0',
      outstandingBalance: '0',
      creditUsed: '0',
      creditTotal: '2,00,000',
      creditProgress: 0,
      recentTx: [],
    }
    list.unshift(newCustomer)
    this.saveCustomers(list)

    // Sync to backend MongoDB
    fetch(`${API_BASE}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCustomer),
    }).catch(() => {})

    return newCustomer
  },
  updateCustomer(updatedCust) {
    const list = this.getCustomers()
    const targetId = updatedCust.id || updatedCust._id
    const updatedList = list.map((c) => {
      if (c.id === targetId || c._id === targetId || (updatedCust.name && c.name.toLowerCase() === updatedCust.name.toLowerCase())) {
        return { ...c, ...updatedCust }
      }
      return c
    })
    this.saveCustomers(updatedList)

    fetch(`${API_BASE}/api/customers/${encodeURIComponent(targetId || updatedCust.name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCust),
    }).catch(() => {})

    return updatedCust
  },
  deleteCustomer(customerId) {
    const list = this.getCustomers()
    const target = list.find((c) => c.id === customerId || c._id === customerId)
    const filtered = list.filter((c) => c.id !== customerId && c._id !== customerId)
    this.saveCustomers(filtered)

    const idToSync = (target && (target._id || target.id)) || customerId
    fetch(`${API_BASE}/api/customers/${encodeURIComponent(idToSync)}`, {
      method: 'DELETE',
    }).catch(() => {})

    return filtered
  },

  // BILLS & DRAFTS
  getBills() {
    return loadFromStorage(STORAGE_KEYS.BILLS, INITIAL_BILLS)
  },
  saveBills(bills) {
    saveToStorage(STORAGE_KEYS.BILLS, bills)
    notifyStoreUpdate()
  },
  getActiveBillId() {
    return loadFromStorage(STORAGE_KEYS.ACTIVE_BILL_ID, 'bill-1')
  },
  setActiveBillId(id) {
    saveToStorage(STORAGE_KEYS.ACTIVE_BILL_ID, id)
    notifyStoreUpdate()
  },
  getActiveBill() {
    const bills = this.getBills()
    const activeId = this.getActiveBillId()
    return bills.find((b) => b.id === activeId) || bills[0] || null
  },
  createNewDraft(preselectedCustomer = null) {
    const bills = this.getBills()
    const emptyCustomer = {
      id: `cust-${Date.now()}`,
      name: '',
      phone: '',
      address: '',
      deliveryAddress: '',
      location: '',
      gstin: '',
      totalOrders: 0,
      lifetimeValue: 0,
    }
    const targetCust = preselectedCustomer || emptyCustomer
    const seq = bills.length + 1
    const newId = `bill-${Date.now()}`

    // Auto-generate next sequential invoice number like INV-1004, INV-1005
    const existingInvoices = [
      ...bills.map((b) => b.invoiceNumber || ''),
      ...this.getTransactions().map((t) => t.invoice || t.id || ''),
    ]
    const extractedNums = existingInvoices
      .map((inv) => {
        const m = String(inv).match(/INV-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => !isNaN(n) && n > 0)
    const nextSeq = extractedNums.length > 0 ? Math.max(...extractedNums) + 1 : 1001
    const autoInv = `INV-${nextSeq}`

    // Today's date formatted as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]
    // Due date +15 days
    const due = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const newBill = {
      id: newId,
      invoiceNumber: autoInv,
      invoiceDate: today,
      dueDate: due,
      name: targetCust.name ? `Bill #${seq} • ${targetCust.name}` : `Bill #${seq}`,
      status: 'active',
      customer: targetCust,
      items: [], // Completely clean empty items
      paymentStatus: 'Pending',
      paymentMode: 'UPI',
      amountPaid: 0,
      discount: 0,
      deliveryCharge: 0,
      notes: '',
    }

    bills.push(newBill)
    this.saveBills(bills)
    this.setActiveBillId(newId)
    return newBill
  },
  updateBill(billId, updates) {
    const bills = this.getBills()
    const updated = bills.map((b) => (b.id === billId ? { ...b, ...updates } : b))
    this.saveBills(updated)
  },
  holdCurrentBill(billId) {
    this.updateBill(billId, { status: 'draft' })
  },
  clearBillCart(billId) {
    this.updateBill(billId, { items: [] })
  },
  removeBill(billId) {
    const bills = this.getBills()
    const remaining = bills.filter((b) => b.id !== billId)
    if (remaining.length === 0) {
      const fresh = this.createNewDraft()
      return fresh
    }
    this.saveBills(remaining)
    if (this.getActiveBillId() === billId) {
      this.setActiveBillId(remaining[0].id)
    }
    return remaining[0]
  },

  // TRANSACTIONS / SALES
  getTransactions() {
    const raw = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, null)
    if (raw && Array.isArray(raw)) {
      return raw
    }
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS)
    return INITIAL_TRANSACTIONS
  },
  saveTransactions(txs) {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs)
    notifyStoreUpdate()
  },
  recordSaleFromBill(bill) {
    const txs = this.getTransactions()
    const items = bill.items || []
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price || item.unitPrice || 0) * Number(item.quantity || 1)), 0)
    const totalGst = items.reduce((sum, item) => {
      const lineCost = Number(item.price || item.unitPrice || 0) * Number(item.quantity || 1)
      const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : 0
      return sum + (lineCost * gstRate) / 100
    }, 0)
    const discount = Number(bill.discount) || 0
    const delivery = Number(bill.deliveryCharge) || 0
    const grandTotal = Math.max(0, Math.round(subtotal + totalGst + delivery - discount))
    const totalVolume = items.reduce((sum, item) => sum + (Number(item.quantity || 1) * 12), 0)

    const settings = this.getSettings()
    let txDateStr
    let txYear
    if (settings.systemDate) {
      const d = new Date(settings.systemDate)
      txDateStr = !isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      txYear = !isNaN(d.getTime()) ? d.getFullYear().toString() : new Date().getFullYear().toString()
    } else {
      const d = new Date()
      txDateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      txYear = d.getFullYear().toString()
    }

    const txTimeStr = settings.systemTime?.trim()
      ? settings.systemTime.trim()
      : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    const itemNames = items.map((i) => `${i.quantity || 1}x ${i.description || i.name || 'Furniture'}`).join(', ')

    const newTx = {
      id: bill.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      invoice: bill.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      date: `${txDateStr}, ${txTimeStr}`,
      year: txYear,
      createdAt: new Date().toISOString(),
      monthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      customer: bill.customer?.name || 'Walk-in Patron',
      customerPhone: bill.customer?.phone || '',
      customerAddress: bill.customer?.address || '',
      customerGstin: bill.customer?.gstin || '',
      project: bill.customer?.location || bill.customer?.address || 'Sivakasi Yard Sale',
      location: bill.customer?.location || bill.customer?.address || 'Sivakasi Yard Sale',
      wood: items[0]?.woodSpecies || 'Teak Wood',
      item: itemNames || 'Artisan Furniture Order',
      items: itemNames || 'Artisan Furniture Order',
      itemDetails: items,
      volume: totalVolume || 36,
      amount: grandTotal.toLocaleString('en-IN'),
      rawAmount: grandTotal,
      subtotal,
      taxAmount: totalGst,
      discount,
      deliveryCharge: delivery,
      status: bill.paymentStatus || 'Paid',
      paymentStatus: bill.paymentStatus || 'Paid',
      paymentMode: bill.paymentMode || 'UPI',
    }

    txs.unshift(newTx)
    this.saveTransactions(txs)

    // Deduct stock locally and increment stockOut
    const products = this.getProducts()
    items.forEach((item) => {
      const p = products.find((prod) => (item.sku && prod.sku === item.sku) || prod.name === (item.description || item.name))
      if (p) {
        const qtySold = Number(item.quantity) || 1
        p.stockQuantity = Math.max(0, (Number(p.stockQuantity) || 0) - qtySold)
        p.stockOut = (Number(p.stockOut) || 0) + qtySold
        if (p.stockIn === undefined) {
          p.stockIn = p.stockQuantity + p.stockOut
        }
      }
    })
    this.saveProducts(products)

    // Sync sale to MongoDB Backend
    fetch(`${API_BASE}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice: newTx.invoice,
        customer: newTx.customer,
        customerPhone: newTx.customerPhone,
        customerAddress: newTx.customerAddress,
        customerGstin: newTx.customerGstin,
        location: newTx.project,
        items: newTx.item,
        itemsList: items,
        subtotal,
        taxAmount: totalGst,
        discount,
        deliveryCharge: delivery,
        amount: grandTotal,
        paymentStatus: bill.paymentStatus || 'Pending',
        paymentMode: bill.paymentMode || 'UPI',
        invoiceDate: bill.invoiceDate,
        dueDate: bill.dueDate,
        notes: bill.notes,
        date: new Date().toISOString(),
      }),
    }).catch((err) => {
      console.warn('[dataStore] Offline sale saved locally:', err.message)
    })

    return newTx
  },
}

// Automatically trigger background sync on store load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    DataStore.syncFromBackend()
  }, 100)
}
