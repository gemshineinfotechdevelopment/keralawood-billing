// Centralized Dynamic Data Store with LocalStorage Persistence
// Supports multiple concurrent bills, dynamic products, customers, settings, and reports

const STORAGE_KEYS = {
  PRODUCTS: 'sivakasi_wood_products',
  CUSTOMERS: 'sivakasi_wood_customers',
  BILLS: 'sivakasi_wood_bills',
  ACTIVE_BILL_ID: 'sivakasi_wood_active_bill_id',
  TRANSACTIONS: 'sivakasi_wood_transactions',
  SETTINGS: 'sivakasi_wood_settings',
}

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
  // System Date & Time (POS Billing Clock)
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
      { id: '#KWF-2024-0982', dateItem: 'Today • 6-Seater Table & Chairs', amount: '1,38,060' },
      { id: '#KWF-2024-0850', dateItem: '15 Oct • Teak Coffee Table', amount: '24,000' },
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
    gstin: '32AABCK9902Q1Z',
    totalOrders: 18,
    lifetimeValue: '18,40,000',
    outstandingBalance: '22,600',
    creditUsed: '1,20,000',
    creditTotal: '5,00,000',
    creditProgress: 24,
    recentTx: [
      { id: '#KWF-2024-0888', dateItem: 'Today • Cane Bookcase', amount: '22,600' },
      { id: '#KWF-2024-0792', dateItem: '14 Oct • Boardroom Desk', amount: '95,000' },
      { id: '#KWF-2024-0710', dateItem: '28 Sep • Armchair Suites', amount: '1,16,000' },
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
    gstin: 'Unregistered / Personal',
    totalOrders: 4,
    lifetimeValue: '3,42,000',
    outstandingBalance: '0',
    creditUsed: '0',
    creditTotal: '1,00,000',
    creditProgress: 0,
    recentTx: [
      { id: '#KWF-2024-0854', dateItem: '18 Oct • Nilambur Teak Bed', amount: '1,45,000' },
      { id: '#KWF-2024-0711', dateItem: '02 Sep • Rosewood Armchair', amount: '48,000' },
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
    gstin: 'Unregistered / Personal',
    totalOrders: 6,
    lifetimeValue: '5,80,000',
    outstandingBalance: '45,000',
    creditUsed: '45,000',
    creditTotal: '2,50,000',
    creditProgress: 18,
    recentTx: [
      { id: '#KWF-2024-0870', dateItem: '22 Oct • Dining Suite 8-Seater', amount: '2,80,000' },
      { id: '#KWF-2024-0744', dateItem: '11 Sep • Teak Wall Paneling', amount: '1,10,000' },
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
    location: 'Sivakasi Depot Enclave',
    address: 'Riverbank Enclave, Sivakasi',
    gstin: 'Unregistered / Personal',
    totalOrders: 2,
    lifetimeValue: '1,12,000',
    outstandingBalance: '0',
    creditUsed: '0',
    creditTotal: '1,00,000',
    creditProgress: 0,
    recentTx: [
      { id: '#KWF-2024-0812', dateItem: '05 Oct • Solid Teak Study Desk', amount: '64,000' },
      { id: '#KWF-2024-0690', dateItem: '15 Aug • Anjili Coffee Table', amount: '48,000' },
    ],
  },
]

const INITIAL_TRANSACTIONS = [
  {
    id: 'INV-892',
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
  {
    id: 'INV-881',
    date: 'Nov 08, 2026, 05:10 PM',
    monthYear: 'November 2026',
    year: '2026',
    customer: 'Brunton Boatyard',
    project: 'Heritage Suite 204',
    wood: 'Teak Wardrobe',
    item: 'Armoire',
    volume: 28,
    amount: '1,95,000',
    rawAmount: 195000,
    status: 'Paid',
  },
  {
    id: 'INV-878',
    date: 'Nov 04, 2026, 10:20 AM',
    monthYear: 'November 2026',
    year: '2026',
    customer: 'The Leela Kovalam',
    project: 'Deck Renovation',
    wood: '12 Teak Sun Loungers',
    item: 'Weather-Treated',
    volume: 52,
    amount: '3,80,000',
    rawAmount: 380000,
    status: 'Paid',
  },
]

// Initial Two Concurrent Draft Bills - Content cleared (Requirement 5)
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
    invoiceNumber: 'TAX-INV #2026-SK-982',
    name: 'Bill #1',
    status: 'active',
    customer: EMPTY_INITIAL_CUSTOMER,
    items: [], // Clean empty cart
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
  // SETTINGS (Derived for Invoice Bills - Requirement 2)
  getSettings() {
    return loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
  },
  saveSettings(settings) {
    saveToStorage(STORAGE_KEYS.SETTINGS, settings)
    notifyStoreUpdate()
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

    // Check if product with same SKU or same name already exists
    const existingIndex = list.findIndex(
      (p) => (item.sku && p.sku === item.sku) || (item.name && p.name.toLowerCase() === item.name.toLowerCase())
    )

    if (existingIndex >= 0) {
      // Increase existing stock
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
    return newProduct
  },
  updateStock(productId, newQty) {
    const list = this.getProducts()
    const updated = list.map((p) => {
      if (p.id === productId) {
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
        return { ...p, stockQuantity: qty, stock: stockLabel, stockType }
      }
      return p
    })
    this.saveProducts(updated)
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
      phone: c.phone || '+91 98470 00000',
      location: c.location || 'Sivakasi Yard Division',
      address: c.address || 'Sivakasi, Tamil Nadu',
      deliveryAddress: c.deliveryAddress || c.address || 'Sivakasi, Tamil Nadu',
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
    return newCustomer
  },

  // BILLS & CONCURRENT DRAFTS (Feature 1)
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
    const activeYr = new Date().getFullYear()
    const invNum = `TAX-INV #${activeYr}-SK-${Math.floor(900 + Math.random() * 100)}`

    const newBill = {
      id: newId,
      invoiceNumber: invNum,
      name: targetCust.name ? `Bill #${seq} • ${targetCust.name}` : `Bill #${seq}`,
      status: 'active',
      customer: targetCust,
      items: [], // Clean empty cart
      paymentMode: 'UPI',
      packagingNote: '',
      deliveryApplied: true,
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
    // Filter out any 2024 records to ensure 2024 is completely removed
    const cleaned = (raw || []).filter((tx) => {
      const yr = String(tx.year || '')
      const dt = String(tx.date || '')
      return yr !== '2024' && !dt.includes('2024')
    })
    if (cleaned.length !== (raw || []).length) {
      saveToStorage(STORAGE_KEYS.TRANSACTIONS, cleaned.length > 0 ? cleaned : INITIAL_TRANSACTIONS)
    }
    return cleaned.length > 0 ? cleaned : INITIAL_TRANSACTIONS
  },
  saveTransactions(txs) {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs)
    notifyStoreUpdate()
  },
  recordSaleFromBill(bill) {
    const txs = this.getTransactions()
    const subtotal = (bill.items || []).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const settings = this.getSettings()
    const cgstRate = Number(settings.cgstRate) || 9
    const sgstRate = Number(settings.sgstRate) || 9
    const gst = Math.round((subtotal * (cgstRate + sgstRate)) / 100)
    const grandTotal = subtotal + gst
    const totalVolume = (bill.items || []).reduce((sum, item) => sum + (item.quantity * 12), 0)

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

    const newTx = {
      id: bill.invoiceNumber.replace(/[^0-9]/g, '').slice(-3) ? `INV-${bill.invoiceNumber.replace(/[^0-9]/g, '').slice(-3)}` : `INV-${Date.now().toString().slice(-3)}`,
      date: `${txDateStr}, ${txTimeStr}`,
      year: txYear,
      createdAt: new Date().toISOString(),
      monthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      customer: bill.customer ? bill.customer.name : 'Walk-in Patron',
      project: bill.customer ? bill.customer.location || 'Sivakasi Yard Sale' : 'Sivakasi Yard Sale',
      wood: bill.items[0]?.name?.split(' ')[0] ? `${bill.items[0].name.split(' ')[0]} Artisan Wood` : 'Teak Wood',
      item: bill.items[0]?.name ? `${bill.items[0].name}${bill.items.length > 1 ? ` + ${bill.items.length - 1} more` : ''}` : 'Artisan Timber Order',
      volume: totalVolume || 36,
      amount: grandTotal.toLocaleString('en-IN'),
      rawAmount: grandTotal,
      status: 'Paid',
    }

    txs.unshift(newTx)
    this.saveTransactions(txs)

    // Deduct stock
    const products = this.getProducts()
    const billItems = bill.items || []
    billItems.forEach((item) => {
      const p = products.find((prod) => prod.sku === item.sku || prod.name === item.name)
      if (p) {
        p.stockQuantity = Math.max(0, p.stockQuantity - item.quantity)
        const threshold = p.lowStockThreshold || 2
        if (p.stockQuantity <= 1) {
          p.stockType = 'critical'
          p.stock = `${p.stockQuantity} left (Critical)`
        } else if (p.stockQuantity <= threshold) {
          p.stockType = 'low'
          p.stock = `${p.stockQuantity} in stock (Low)`
        } else {
          p.stockType = 'in-stock'
          p.stock = `${p.stockQuantity} in stock`
        }
      }
    })
    this.saveProducts(products)

    // Update customer stats
    if (bill.customer) {
      const customers = this.getCustomers()
      const c = customers.find((cust) => cust.id === bill.customer.id || cust.name === bill.customer.name)
      if (c) {
        c.totalOrders += 1
        const currentLifetime = Number(String(c.lifetimeValue).replace(/[^0-9]/g, '')) || 0
        c.lifetimeValue = (currentLifetime + grandTotal).toLocaleString('en-IN')
        c.recentTx.unshift({
          id: `#KWF-2024-${newTx.id.replace('INV-', '')}`,
          dateItem: `Today • ${newTx.item}`,
          amount: grandTotal.toLocaleString('en-IN'),
        })
        this.saveCustomers(customers)
      }
    }

    return newTx
  },
}
