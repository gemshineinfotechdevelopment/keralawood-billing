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

// Products Catalog
const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    sku: 'KWF-TB-NT-06',
    name: 'Nilambur Teak 6-Seater Dining Table',
    finish: 'Grade-A Matte Walnut Finish',
    category: 'Dining Sets',
    unitPrice: 54000,
    stockQuantity: 4,
    lowStockThreshold: 2,
    woodSpecies: 'Teak',
  },
  {
    id: 'prod-2',
    sku: 'KWF-DC-TK-02',
    name: 'Teakwood Dining Chairs with Cane Weave',
    finish: 'Handcrafted Rattan Back',
    category: 'Chairs',
    unitPrice: 6500,
    stockQuantity: 18,
    lowStockThreshold: 4,
    woodSpecies: 'Teak',
  },
  {
    id: 'prod-3',
    sku: 'KWF-CR-TK-01',
    name: 'Solid Teak Side Server Credenza',
    finish: 'Brass Pull Inlays',
    category: 'Storage',
    unitPrice: 24000,
    stockQuantity: 3,
    lowStockThreshold: 1,
    woodSpecies: 'Teak',
  },
  {
    id: 'prod-4',
    sku: 'KWF-BD-RW-K01',
    name: 'Solid Rosewood Royal King Bed',
    finish: 'Hand-Carved Headboard & Natural Beeswax',
    category: 'Beds',
    unitPrice: 78000,
    stockQuantity: 2,
    lowStockThreshold: 1,
    woodSpecies: 'Rosewood',
  },
  {
    id: 'prod-5',
    sku: 'KWF-SF-LV-08',
    name: 'Teak Frame 3-Seater Artisan Sofa',
    finish: 'Raw Organic Cotton & Walnut Polish',
    category: 'Living',
    unitPrice: 42000,
    stockQuantity: 5,
    lowStockThreshold: 2,
    woodSpecies: 'Teak',
  },
  {
    id: 'prod-6',
    sku: 'KWF-SH-CN-03',
    name: 'Handcrafted Cane Bookcase',
    finish: 'Bamboo & Mahogany 5-Tier',
    category: 'Storage',
    unitPrice: 18500,
    stockQuantity: 4,
    lowStockThreshold: 2,
    woodSpecies: 'Mahogany',
  },
]

const INITIAL_CUSTOMERS = [
  {
    id: 1,
    initials: 'MP',
    avatarBg: '#5C3A21',
    name: 'Mathew Philip',
    personName: 'Mathew Philip',
    type: 'Residential',
    fullTypeLabel: 'Mathew Philip • Residential Client',
    phone: '+91 98470 12345',
    location: 'Sivakasi Town Center',
    address: 'Bazaar Street, Sivakasi',
    deliveryAddress: 'Bazaar Street, Sivakasi',
    gstin: '32AABCP9821K1ZK',
    totalOrders: 3,
    lifetimeValue: '1,38,060',
    outstandingBalance: '0',
    creditUsed: '1,38,060',
    creditTotal: '3,00,000',
    creditProgress: 46,
    recentTx: [
      { id: '#KWF-2026-0982', dateItem: 'Today • 6-Seater Table & Chairs', amount: '1,38,060' },
      { id: '#KWF-2026-0850', dateItem: '15 Oct • Teak Coffee Table', amount: '24,000' },
    ],
  },
  {
    id: 2,
    initials: 'DK',
    avatarBg: '#4A2E18',
    name: 'Deepak Kurian & Architects',
    personName: 'Deepak Kurian',
    type: 'B2B Studio',
    fullTypeLabel: 'Deepak Kurian & Architects • B2B',
    phone: '+91 97455 11029',
    location: 'Sivakasi Architecture Guild',
    address: 'Bazaar Rd, Sivakasi',
    deliveryAddress: 'Bazaar Rd, Sivakasi',
    gstin: '32AABCK9902Q1Z',
    totalOrders: 18,
    lifetimeValue: '18,40,000',
    outstandingBalance: '22,600',
    creditUsed: '1,20,000',
    creditTotal: '5,00,000',
    creditProgress: 24,
    recentTx: [
      { id: '#KWF-2026-0888', dateItem: 'Today • Cane Bookcase', amount: '22,600' },
      { id: '#KWF-2026-0792', dateItem: '14 Oct • Boardroom Desk', amount: '95,000' },
    ],
  },
  {
    id: 3,
    initials: 'AM',
    avatarBg: '#EFE3DC',
    avatarColor: '#5C3A21',
    name: 'Anoop Menon',
    personName: 'Anoop Menon',
    type: 'Residential',
    fullTypeLabel: 'Anoop Menon • Residential Client',
    phone: '+91 98471 20984',
    location: 'Sivakasi Colony',
    address: 'Plot 42, Sivakasi Colony',
    deliveryAddress: 'Plot 42, Sivakasi Colony',
    gstin: 'Unregistered / Personal',
    totalOrders: 4,
    lifetimeValue: '3,42,000',
    outstandingBalance: '0',
    creditUsed: '0',
    creditTotal: '1,00,000',
    creditProgress: 0,
    recentTx: [
      { id: '#KWF-2026-0854', dateItem: '18 Oct • Nilambur Teak Bed', amount: '1,45,000' },
    ],
  },
  {
    id: 4,
    initials: 'TV',
    avatarBg: '#EFE3DC',
    avatarColor: '#5C3A21',
    name: 'Dr. Thomas Varghese',
    personName: 'Dr. Thomas Varghese',
    type: 'Residential',
    fullTypeLabel: 'Dr. Thomas Varghese • Private Villa',
    phone: '+91 97455 11029',
    location: 'Sivakasi Division',
    address: 'Riverside Bungalow, Sivakasi',
    deliveryAddress: 'Riverside Bungalow, Sivakasi',
    gstin: 'Unregistered / Personal',
    totalOrders: 6,
    lifetimeValue: '5,80,000',
    outstandingBalance: '45,000',
    creditUsed: '45,000',
    creditTotal: '2,50,000',
    creditProgress: 18,
    recentTx: [
      { id: '#KWF-2026-0870', dateItem: '22 Oct • Dining Suite 8-Seater', amount: '2,80,000' },
    ],
  },
  {
    id: 5,
    initials: 'LN',
    avatarBg: '#EFE3DC',
    avatarColor: '#5C3A21',
    name: 'Lakshmi Nair',
    personName: 'Lakshmi Nair',
    type: 'Residential',
    fullTypeLabel: 'Lakshmi Nair • Residential Client',
    phone: '+91 91944 60882',
    location: 'Sivakasi East Yard',
    address: 'Main Road, Sivakasi',
    deliveryAddress: 'Main Road, Sivakasi',
    gstin: 'Unregistered / Personal',
    totalOrders: 2,
    lifetimeValue: '85,000',
    outstandingBalance: '0',
    creditUsed: '0',
    creditTotal: '1,50,000',
    creditProgress: 0,
    recentTx: [],
  },
]

const INITIAL_TRANSACTIONS = [
  {
    id: 'INV-891',
    date: 'Nov 17, 2026, 05:45 PM',
    monthYear: 'November 2026',
    year: '2026',
    customer: 'Dr. Thomas Varghese',
    project: 'Sivakasi Villa',
    wood: 'Wild Anjili',
    item: 'Heritage Brass Chest',
    volume: 38,
    amount: '1,45,000',
    rawAmount: 145000,
    status: 'Paid',
  },
  {
    id: 'INV-890',
    date: 'Nov 15, 2026, 04:30 PM',
    monthYear: 'November 2026',
    year: '2026',
    customer: 'Kumarakom Lake Resort',
    project: 'Heritage Suites Wing B',
    wood: 'Nilambur Teak',
    item: '8-Seater Suite',
    volume: 48,
    amount: '4,85,000',
    rawAmount: 485000,
    status: 'Paid',
  },
  {
    id: 'INV-889',
    date: 'Nov 12, 2026, 02:15 PM',
    monthYear: 'November 2026',
    year: '2026',
    customer: 'Dr. Ananya Verma',
    project: 'Private Residence, Sivakasi',
    wood: 'Rosewood Timber',
    item: 'Bed Suite',
    volume: 32,
    amount: '2,45,000',
    rawAmount: 245000,
    status: 'Paid',
  },
  {
    id: 'INV-885',
    date: 'Nov 10, 2026, 11:45 AM',
    monthYear: 'November 2026',
    year: '2026',
    customer: 'Malabar Heritage Club',
    project: 'Clubhouse Dining Hall',
    wood: 'Wild Anjili Dining',
    item: '16 Sets',
    volume: 64,
    amount: '5,20,000',
    rawAmount: 520000,
    status: 'Paid',
  },
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
    return loadFromStorage(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS)
  },
  saveProducts(list) {
    saveToStorage(STORAGE_KEYS.PRODUCTS, list)
    notifyStoreUpdate()
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
        body: JSON.stringify({ stockQuantity: newQty, sellingPrice: numPrice || existing.unitPrice }),
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
      finish: item.surfacePolish || 'Matte Natural Wax Finish',
      category: item.category || 'Dining Sets',
      unitPrice: numPrice,
      price: '₹' + numPrice.toLocaleString('en-IN'),
      stockQuantity: qty,
      stock: stockLabel,
      stockType,
      lowStockThreshold: threshold,
      woodSpecies: item.woodSpecies || 'Teak',
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
    const randomInv = `INV-${Math.floor(1000 + Math.random() * 9000)}`

    // Today's date formatted as YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0]
    // Due date +15 days
    const due = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const newBill = {
      id: newId,
      invoiceNumber: randomInv,
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
    const raw = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS)
    const cleaned = (raw || []).filter((tx) => {
      const yr = String(tx.year || '')
      const dt = String(tx.date || '')
      return yr !== '2024' && !dt.includes('2024')
    })
    return cleaned.length > 0 ? cleaned : INITIAL_TRANSACTIONS
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
      project: bill.customer?.location || 'Sivakasi Yard Sale',
      wood: items[0]?.woodSpecies || 'Teak Wood',
      item: itemNames || 'Artisan Furniture Order',
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

    // Deduct stock locally
    const products = this.getProducts()
    items.forEach((item) => {
      const p = products.find((prod) => prod.sku === item.sku || prod.name === (item.description || item.name))
      if (p) {
        p.stockQuantity = Math.max(0, (p.stockQuantity || 0) - (Number(item.quantity) || 1))
        this.updateStock(p.id, p.stockQuantity)
      }
    })

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
