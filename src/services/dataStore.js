// Centralized Dynamic Data Store with LocalStorage Persistence
// Supports multiple concurrent bills, dynamic products, customers, and reports

const STORAGE_KEYS = {
  PRODUCTS: 'sivakasi_wood_products',
  CUSTOMERS: 'sivakasi_wood_customers',
  BILLS: 'sivakasi_wood_bills',
  ACTIVE_BILL_ID: 'sivakasi_wood_active_bill_id',
  TRANSACTIONS: 'sivakasi_wood_transactions',
}

// Initial Seed Data (Sivakasi Branded)
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
    location: 'Panampilly Nagar, Kochi',
    address: 'Panampilly Nagar, Kochi',
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
    location: 'Fort Kochi, Sivakasi Hub',
    address: 'Bazaar Rd, Fort Kochi',
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
    location: 'Panampilly Nagar, Kochi',
    address: 'Plot 42, Panampilly Nagar, Kochi',
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
    location: 'Kottayam, Sivakasi Division',
    address: 'Riverside Bungalow, Kumaranalloor, Kottayam',
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
    location: 'Aluva, Sivakasi Depot',
    address: 'Riverbank Enclave, Aluva, Ernakulam',
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
  {
    id: 6,
    initials: 'KR',
    avatarBg: '#0B3B24',
    avatarColor: '#FFFFFF',
    name: 'Kumarakom Lake Resort',
    personName: 'Kumarakom Lake Resort',
    type: 'B2B Studio',
    fullTypeLabel: 'Kumarakom Lake Resort • Hospitality B2B',
    phone: '+91 94471 88390',
    location: 'Kottayam Waters, Sivakasi Node',
    address: 'Kumarakom North P.O, Kottayam, Sivakasi',
    gstin: '32AAACK4918N1Z1',
    totalOrders: 12,
    lifetimeValue: '24,80,000',
    outstandingBalance: '85,000',
    creditUsed: '2,85,000',
    creditTotal: '10,00,000',
    creditProgress: 28,
    recentTx: [
      { id: '#KWF-2024-0892', dateItem: '28 Oct • 12 Teak Sun Loungers', amount: '4,85,000' },
      { id: '#KWF-2024-0750', dateItem: '19 Sep • Veranda Pillars & Railing', amount: '3,20,000' },
      { id: '#KWF-2024-0688', dateItem: '20 Jul • Heritage Suite Wardrobes', amount: '5,40,000' },
    ],
  },
]

const INITIAL_TRANSACTIONS = [
  {
    id: 'INV-892',
    date: 'Oct 28, 2024',
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
    date: 'Oct 26, 2024',
    customer: 'Dr. Ananya Verma',
    project: 'Private Residence, Sivakasi',
    wood: 'Sivakasi Rosewood',
    item: 'Bed Suite',
    volume: 32,
    amount: '2,45,000',
    rawAmount: 245000,
    status: 'Paid',
  },
  {
    id: 'INV-885',
    date: 'Oct 24, 2024',
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
    date: 'Oct 21, 2024',
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
    date: 'Oct 18, 2024',
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

// Initial Two Concurrent Draft Bills
const INITIAL_BILLS = [
  {
    id: 'bill-1',
    invoiceNumber: 'TAX-INV #2024-SK-982',
    name: 'Bill #1 • Mathew Philip',
    status: 'active', // 'active' | 'draft' | 'completed'
    customer: INITIAL_CUSTOMERS[0],
    items: [
      {
        id: 1,
        sku: 'KWF-TB-NT-06',
        name: 'Nilambur Teak 6-Seater Dining Table',
        finish: 'Grade-A Matte Walnut Finish',
        unitPrice: 54000,
        quantity: 1,
        category: 'Dining Sets',
      },
      {
        id: 2,
        sku: 'KWF-DC-TK-02',
        name: 'Teakwood Dining Chairs with Cane Weave',
        finish: 'Handcrafted Rattan Back',
        unitPrice: 6500,
        quantity: 6,
        category: 'Chairs',
      },
      {
        id: 3,
        sku: 'KWF-CR-TK-01',
        name: 'Solid Teak Side Server Credenza',
        finish: 'Brass Pull Inlays',
        unitPrice: 24000,
        quantity: 1,
        category: 'Storage',
      },
    ],
    paymentMode: 'UPI',
    packagingNote: '',
    deliveryApplied: true,
  },
  {
    id: 'bill-2',
    invoiceNumber: 'TAX-INV #2024-SK-983',
    name: 'Bill #2 • Deepak Kurian',
    status: 'draft',
    customer: INITIAL_CUSTOMERS[1],
    items: [
      {
        id: 4,
        sku: 'KWF-BD-RW-K01',
        name: 'Solid Rosewood Royal King Bed',
        finish: 'Hand-Carved Headboard & Natural Beeswax',
        unitPrice: 78000,
        quantity: 1,
        category: 'Beds',
      },
      {
        id: 6,
        sku: 'KWF-SH-CN-03',
        name: 'Handcrafted Cane Bookcase',
        finish: 'Bamboo & Mahogany 5-Tier',
        unitPrice: 18500,
        quantity: 2,
        category: 'Storage',
      },
    ],
    paymentMode: 'Bank',
    packagingNote: 'Architect site delivery with foam padding',
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
    const newProduct = {
      id: `prod-${Date.now()}`,
      sku: item.sku || `KWF-${Date.now().toString().slice(-4)}`,
      name: item.name || 'Artisan Timber Furniture',
      finish: item.surfacePolish || 'Matte Natural Wax Finish',
      category: item.category || 'Dining Sets',
      unitPrice: Number(item.sellingPrice) || 45000,
      stockQuantity: Number(item.stockQuantity) || 4,
      lowStockThreshold: Number(item.lowStockThreshold) || 2,
      woodSpecies: item.woodSpecies || 'Teak',
    }
    list.unshift(newProduct)
    this.saveProducts(list)
    return newProduct
  },
  updateStock(productId, newQty) {
    const list = this.getProducts()
    const updated = list.map((p) => (p.id === productId ? { ...p, stockQuantity: Math.max(0, newQty) } : p))
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
    const defaultCust = preselectedCustomer || this.getCustomers()[0]
    const seq = bills.length + 1
    const newId = `bill-${Date.now()}`
    const invNum = `TAX-INV #2024-SK-${Math.floor(900 + Math.random() * 100)}`

    const newBill = {
      id: newId,
      invoiceNumber: invNum,
      name: `Bill #${seq} • ${defaultCust.name}`,
      status: 'active',
      customer: defaultCust,
      items: [],
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
  removeBill(billId) {
    const bills = this.getBills()
    const remaining = bills.filter((b) => b.id !== billId)
    if (remaining.length === 0) {
      // Keep at least one fresh bill
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
    return loadFromStorage(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS)
  },
  saveTransactions(txs) {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs)
    notifyStoreUpdate()
  },
  recordSaleFromBill(bill) {
    const txs = this.getTransactions()
    const subtotal = bill.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const gst = Math.round(subtotal * 0.18)
    const grandTotal = subtotal + gst
    const totalVolume = bill.items.reduce((sum, item) => sum + (item.quantity * 12), 0)

    const newTx = {
      id: bill.invoiceNumber.replace(/[^0-9]/g, '').slice(-3) ? `INV-${bill.invoiceNumber.replace(/[^0-9]/g, '').slice(-3)}` : `INV-${Date.now().toString().slice(-3)}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      customer: bill.customer ? bill.customer.name : 'Walk-in Patron',
      project: bill.customer ? bill.customer.location || 'Direct Yard Sale' : 'Direct Yard Sale',
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
    bill.items.forEach((item) => {
      const p = products.find((prod) => prod.sku === item.sku || prod.name === item.name)
      if (p) {
        p.stockQuantity = Math.max(0, p.stockQuantity - item.quantity)
      }
    })
    this.saveProducts(products)

    // Update customer stats if matched
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
