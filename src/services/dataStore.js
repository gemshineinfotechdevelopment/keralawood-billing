// Centralized Dynamic Data Store with LocalStorage Persistence & MongoDB Backend Sync
// Supports multiple concurrent bills, dynamic products, customers, settings, and reports

const STORAGE_KEYS = {
  PRODUCTS: 'sivakasi_wood_products',
  CUSTOMERS: 'sivakasi_wood_customers',
  BILLS: 'sivakasi_wood_bills',
  ACTIVE_BILL_ID: 'sivakasi_wood_active_bill_id',
  TRANSACTIONS: 'sivakasi_wood_transactions',
  SETTINGS: 'sivakasi_wood_settings',
  PURCHASES: 'sivakasi_wood_purchases',
  SALES_PERSONS: 'sivakasi_wood_sales_persons',
}

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || ''

// One-time cache clear to remove old hardcoded seed data
const DATA_VERSION_KEY = 'sivakasi_wood_data_version'
const CURRENT_DATA_VERSION = '7'
;(function clearOldSeedData() {
  try {
    const storedVersion = localStorage.getItem(DATA_VERSION_KEY)
    if (storedVersion !== CURRENT_DATA_VERSION) {
      localStorage.removeItem('sivakasi_wood_customers')
      localStorage.removeItem('sivakasi_wood_transactions')
      localStorage.removeItem('sivakasi_wood_products')
      localStorage.removeItem('sivakasi_wood_bills')
      localStorage.removeItem('sivakasi_wood_purchases')
      localStorage.removeItem('sivakasi_wood_sales_persons')
      localStorage.setItem('sivakasi_wood_customers', JSON.stringify([]))
      localStorage.setItem('sivakasi_wood_transactions', JSON.stringify([]))
      localStorage.setItem('sivakasi_wood_products', JSON.stringify([]))
      localStorage.setItem('sivakasi_wood_purchases', JSON.stringify([]))
      localStorage.setItem('sivakasi_wood_sales_persons', JSON.stringify([]))
      localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION)
    }
  } catch (e) { /* ignore */ }
})()

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
  disclaimer: 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct',
  logoUrl: '',
  systemTime: '10:30 AM',
  systemDate: '',
}

// Products Catalog - Empty by default (Populated from backend/user input)
const INITIAL_PRODUCTS = []

const INITIAL_CUSTOMERS = []

const INITIAL_TRANSACTIONS = []

const INITIAL_PURCHASES = []

const INITIAL_SALES_PERSONS = []

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
    invoiceNumber: 'INV-1001',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
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
        if (data && Array.isArray(data.products)) {
          saveToStorage(STORAGE_KEYS.PRODUCTS, data.products)
        }
      }

      // 3. Sync Customers
      const resCustomers = await fetch(`${API_BASE}/api/customers`).catch(() => null)
      if (resCustomers && resCustomers.ok) {
        const data = await resCustomers.json()
        if (data && Array.isArray(data.customers)) {
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
        if (data && Array.isArray(data.sales)) {
          const formatted = data.sales.map((s) => ({
            id: s.invoice || s._id,
            invoice: s.invoice,
            date: s.date ? new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
            rawDate: s.createdAt ? s.createdAt.split('T')[0] : (s.date ? String(s.date).split('T')[0] : new Date().toISOString().split('T')[0]),
            createdAt: s.createdAt || s.date || new Date().toISOString(),
            year: s.year || '2026',
            monthYear: s.monthYear || '',
            customer: s.customer,
            location: s.location || s.project || 'Sivakasi Yard Sale',
            project: s.location || s.project || 'Sivakasi Yard Sale',
            wood: s.wood || 'Artisan Timber',
            item: s.items,
            items: s.items,
            itemDetails: s.itemDetails || [],
            amount: Number(s.amount || 0).toLocaleString('en-IN'),
            rawAmount: Number(s.amount || 0),
            status: s.paymentStatus || s.status || 'Paid',
          }))
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, formatted)
        }
      }

      // 5. Sync Purchases from Backend MongoDB
      const resPurchases = await fetch(`${API_BASE}/api/purchases`).catch(() => null)
      if (resPurchases && resPurchases.ok) {
        const data = await resPurchases.json()
        if (data && Array.isArray(data.purchases) && data.purchases.length > 0) {
          const formatted = data.purchases.map((p) => ({
            id: p._id || p.invoiceNumber,
            invoiceNumber: p.invoiceNumber,
            supplier: p.supplier,
            supplierPhone: p.supplierPhone || '',
            date: p.date,
            item: p.item,
            category: p.category,
            quantity: p.quantity,
            amount: p.amount,
            gstAmount: p.gstAmount,
            paymentMode: p.paymentMode,
            notes: p.notes,
          }))
          saveToStorage(STORAGE_KEYS.PURCHASES, formatted)
        }
      }

      // 6. Sync Sales Persons from Backend MongoDB
      const resSalesPersons = await fetch(`${API_BASE}/api/sales-persons`).catch(() => null)
      if (resSalesPersons && resSalesPersons.ok) {
        const data = await resSalesPersons.json()
        if (data && Array.isArray(data.salesPersons) && data.salesPersons.length > 0) {
          const formatted = data.salesPersons.map((sp) => ({
            id: sp._id || sp.code,
            code: sp.code,
            name: sp.name,
            phone: sp.phone || '',
            email: sp.email || '',
            role: sp.role,
            territory: sp.territory,
            target: sp.target,
            achievedSales: sp.achievedSales,
            commissionRate: sp.commissionRate,
            paymentMode: sp.paymentMode,
            ordersClosed: sp.ordersClosed,
            joiningDate: sp.joiningDate,
            notes: sp.notes,
          }))
          saveToStorage(STORAGE_KEYS.SALES_PERSONS, formatted)
        }
      }

      notifyStoreUpdate()
    } catch (err) {
      console.warn('[dataStore] Background sync failed, using offline cache:', err.message)
    }
  },

  // SETTINGS
  getSettings() {
    const s = loadFromStorage(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS)
    if (!s.disclaimer || s.disclaimer.includes('Natural variations in teak')) {
      s.disclaimer = 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct'
      saveToStorage(STORAGE_KEYS.SETTINGS, s)
    }
    return s
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

  // PURCHASES
  getPurchases() {
    return loadFromStorage(STORAGE_KEYS.PURCHASES, INITIAL_PURCHASES)
  },
  savePurchases(list) {
    saveToStorage(STORAGE_KEYS.PURCHASES, list)
    notifyStoreUpdate()
  },
  addPurchase(purchase) {
    const list = this.getPurchases()
    const id = purchase.id || `PUR-${Date.now().toString().slice(-4)}`
    const item = { ...purchase, id, invoiceNumber: purchase.invoiceNumber || id }
    const updated = [item, ...list]
    this.savePurchases(updated)

    // Sync to backend MongoDB
    fetch(`${API_BASE}/api/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch((err) => {
      console.warn('[dataStore] Offline purchase saved locally:', err.message)
    })

    return item
  },
  updatePurchase(purchase) {
    const list = this.getPurchases()
    const updated = list.map((p) =>
      p.id === purchase.id || p.invoiceNumber === purchase.invoiceNumber ? { ...p, ...purchase } : p
    )
    this.savePurchases(updated)

    const key = purchase._id || purchase.id || purchase.invoiceNumber
    fetch(`${API_BASE}/api/purchases/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchase),
    }).catch((err) => {
      console.warn('[dataStore] Offline purchase update saved locally:', err.message)
    })
  },
  deletePurchase(id) {
    const list = this.getPurchases().filter((p) => p.id !== id && p.invoiceNumber !== id)
    this.savePurchases(list)

    // Sync deletion to backend MongoDB
    fetch(`${API_BASE}/api/purchases/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch((err) => {
      console.warn('[dataStore] Offline purchase delete saved locally:', err.message)
    })
  },

  // SALES PERSONS
  getSalesPersons() {
    const raw = loadFromStorage(STORAGE_KEYS.SALES_PERSONS, INITIAL_SALES_PERSONS)
    const txs = this.getTransactions()
    // Calculate exact ordersClosed from real sales records (1 bill = 1 count)
    return (Array.isArray(raw) ? raw : []).map((sp) => {
      const spName = (sp.name || '').trim().toLowerCase()
      const spCode = (sp.code || '').trim().toLowerCase()
      const realOrderCount = txs.filter((t) => {
        const b = (t.billedBy || '').trim().toLowerCase()
        const s = (t.salesPerson || '').trim().toLowerCase()
        return (spName && (b === spName || s === spName)) || (spCode && (b === spCode || s === spCode))
      }).length

      return {
        ...sp,
        ordersClosed: realOrderCount,
      }
    })
  },
  saveSalesPersons(list) {
    saveToStorage(STORAGE_KEYS.SALES_PERSONS, list)
    notifyStoreUpdate()
  },
  addSalesPerson(sp) {
    const list = this.getSalesPersons()
    const id = sp.id || `SP-${100 + list.length + 1}`
    const item = { ...sp, id, code: sp.code || id }
    const updated = [item, ...list]
    this.saveSalesPersons(updated)

    // Sync to backend MongoDB
    fetch(`${API_BASE}/api/sales-persons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch((err) => {
      console.warn('[dataStore] Offline sales person saved locally:', err.message)
    })

    return item
  },
  updateSalesPerson(sp) {
    const list = this.getSalesPersons()
    const updated = list.map((s) => (s.id === sp.id || s.code === sp.code ? { ...s, ...sp } : s))
    this.saveSalesPersons(updated)

    const key = sp._id || sp.id || sp.code
    fetch(`${API_BASE}/api/sales-persons/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sp),
    }).catch((err) => {
      console.warn('[dataStore] Offline sales person update saved locally:', err.message)
    })
  },
  deleteSalesPerson(id) {
    const list = this.getSalesPersons().filter((s) => s.id !== id && s.code !== id)
    this.saveSalesPersons(list)

    // Sync deletion to backend MongoDB
    fetch(`${API_BASE}/api/sales-persons/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).catch((err) => {
      console.warn('[dataStore] Offline sales person delete saved locally:', err.message)
    })
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
      const newInwardQty = Math.max(1, Number(qtyToAdd) || 1)
      // Reset stock in to the new lot quantity and reset stock out to 0
      target.stockIn = newInwardQty
      target.stockOut = 0
      target.stockQuantity = newInwardQty

      let stockType = 'in-stock'
      let stockLabel = `${newInwardQty} in stock`
      const threshold = Number(target.lowStockThreshold || 2)
      if (newInwardQty <= 1) {
        stockType = 'critical'
        stockLabel = `${newInwardQty} left (Critical)`
      } else if (newInwardQty <= threshold) {
        stockType = 'low'
        stockLabel = `${newInwardQty} left (Low)`
      }
      target.stockType = stockType
      target.stockLabel = stockLabel

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
      costPrice: Number(item.costPrice) || 0,
      imageUrl: item.imageUrl || '',
      imagePublicId: item.imagePublicId || '',
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
          costPrice: item.costPrice !== undefined ? Number(item.costPrice) : (p.costPrice || 0),
          imageUrl: item.imageUrl !== undefined ? item.imageUrl : (p.imageUrl || ''),
          imagePublicId: item.imagePublicId !== undefined ? item.imagePublicId : (p.imagePublicId || ''),
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
    const raw = loadFromStorage(STORAGE_KEYS.CUSTOMERS, [])
    const DUMMY_NAMES = new Set([
      'Mathew Philip', 'Deepak Kurian & Architects', 'Anoop Menon', 'Dr. Thomas Varghese',
      'Lakshmi Nair', 'Suresh Kumar & Sons', 'Rajesh Packaging Ind.', 'Dr. K. Radhakrishnan',
      'Murugan Modern Furnishings', 'Senthil Nathan', 'Anandha Bhavan Residency',
      'Vignesh Construction Co.', 'Karthik Raja', 'Selvi Thirumalai', 'Vijayalakshmi Sweets',
      'Jayaram Brothers', 'Dr. N. Soundararajan', 'Malarvizhi Interiors', 'Balaji Agency',
      'Manickam & Sons Traders', 'Sree Saravana Match Works', 'K. Vasanth Kumar', 'Gowri Shankar Mills', 'Shanmuga Priya'
    ])
    const list = (Array.isArray(raw) ? raw : []).filter(c => !DUMMY_NAMES.has(c.name))
    const txs = this.getTransactions()

    return list.map((c) => {
      const cName = String(c.name || '').trim().toLowerCase()
      const cPhone = String(c.phone || '').trim()

      const custTxs = txs.filter((t) => {
        const tCust = typeof t.customer === 'object' && t.customer !== null ? t.customer.name : t.customer
        const nameMatch = cName && tCust && String(tCust).trim().toLowerCase() === cName
        const phoneMatch = cPhone && t.customerPhone && String(t.customerPhone).trim() === cPhone
        return nameMatch || (cPhone && phoneMatch)
      })

      const totalOrders = custTxs.length > 0 ? custTxs.length : (Number(c.totalOrders) || 0)
      const rawTotalBilled = custTxs.reduce((sum, t) => {
        const amt = t.rawAmount !== undefined
          ? Number(t.rawAmount)
          : Number(String(t.amount || 0).replace(/[^0-9.]/g, '')) || 0
        return sum + amt
      }, 0)

      const lifetimeValue = rawTotalBilled > 0
        ? rawTotalBilled.toLocaleString('en-IN')
        : (c.lifetimeValue && c.lifetimeValue !== '0' ? c.lifetimeValue : '0')

      const recentTx = custTxs.length > 0
        ? custTxs.slice(0, 5).map((t) => ({
            id: t.invoice || t.id,
            dateItem: `${t.date || t.rawDate || ''} • ₹${(t.rawAmount || t.amount || 0).toLocaleString('en-IN')}`,
            status: t.paymentStatus || t.status || 'Paid',
          }))
        : (c.recentTx || [])

      return {
        ...c,
        totalOrders,
        lifetimeValue,
        recentTx,
      }
    })
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
  getNextInvoiceNumber(excludeBillId = null, includeDrafts = false) {
    const txs = this.getTransactions()
    const existingInvoices = txs.map((t) => t.invoice || t.id || '')

    if (includeDrafts) {
      const bills = this.getBills().filter((b) => !excludeBillId || b.id !== excludeBillId)
      existingInvoices.push(...bills.map((b) => b.invoiceNumber || ''))
    }

    const allNums = []
    existingInvoices.forEach((inv) => {
      const m = String(inv).match(/INV-(\d+)/i)
      if (m) {
        const n = parseInt(m[1], 10)
        if (!isNaN(n) && n > 0) {
          allNums.push(n)
        }
      }
    })

    // Take the highest existing invoice number and increment by 1 (e.g. 1003 -> 1004)
    const maxNum = allNums.length > 0 ? Math.max(...allNums) : 1000
    const nextSeq = Math.max(1001, maxNum + 1)
    return `INV-${nextSeq}`
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

    // Only consider other open drafts if active drafts already exist (multiple concurrent tabs)
    const autoInv = this.getNextInvoiceNumber(null, bills.length > 0)

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
      shipping: {
        name: '',
        phone: '',
        address: '',
      },
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
  saveBill(bill) {
    const bills = this.getBills()
    const idx = bills.findIndex((b) => b.id === bill.id || (b.invoiceNumber && b.invoiceNumber === bill.invoiceNumber))
    if (idx >= 0) {
      bills[idx] = { ...bills[idx], ...bill }
    } else {
      bills.push(bill)
    }
    this.saveBills(bills)
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
  deleteBill(billId) {
    return this.removeBill(billId)
  },

  // TRANSACTIONS / SALES
  getTransactions() {
    const raw = loadFromStorage(STORAGE_KEYS.TRANSACTIONS, [])
    // Deduplicate by invoice number / id
    const seen = new Set()
    const unique = []
    for (const t of (Array.isArray(raw) ? raw : [])) {
      if (!t) continue
      const key = t.invoice || t.id
      if (key && !seen.has(key)) {
        seen.add(key)
        unique.push(t)
      }
    }
    return unique
  },
  saveTransactions(txs) {
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs)
    notifyStoreUpdate()
  },
  deleteTransaction(invoiceOrId) {
    const txs = this.getTransactions()
    const targetTx = txs.find((t) => t.invoice === invoiceOrId || t.id === invoiceOrId)
    const filtered = txs.filter((t) => t.invoice !== invoiceOrId && t.id !== invoiceOrId)
    this.saveTransactions(filtered)

    if (targetTx) {
      // 1. Decrement Salesperson ordersClosed
      const spName = (targetTx.billedBy || targetTx.salesPerson || '').trim().toLowerCase()
      if (spName) {
        const spList = this.getSalesPersons()
        const sp = spList.find((s) => s.name?.toLowerCase() === spName || s.code?.toLowerCase() === spName)
        if (sp) {
          sp.ordersClosed = Math.max(0, (Number(sp.ordersClosed) || 1) - 1)
          this.saveSalesPersons(spList)

          const key = sp._id || sp.id || sp.code
          fetch(`${API_BASE}/api/sales-persons/${encodeURIComponent(key)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sp),
          }).catch(() => {})
        }
      }

      // 2. Check Customer: delete customer if no other remaining bills exist
      const rawCust = targetTx.customer
      const custName = typeof rawCust === 'object' && rawCust !== null ? (rawCust.name || '') : String(rawCust || '').trim()
      const custPhone = targetTx.customerPhone || (typeof rawCust === 'object' && rawCust ? rawCust.phone : '')

      if (custName && !custName.toLowerCase().includes('walk-in')) {
        // Check if customer has any other bills left in filtered
        const otherBills = filtered.filter((t) => {
          const tCust = typeof t.customer === 'object' && t.customer !== null ? t.customer.name : t.customer
          const nameMatch = tCust && String(tCust).trim().toLowerCase() === custName.toLowerCase()
          const phoneMatch = custPhone && t.customerPhone && String(t.customerPhone).trim() === String(custPhone).trim()
          return nameMatch || phoneMatch
        })

        const custList = this.getCustomers()
        const cust = custList.find((c) => {
          const nameMatch = c.name && c.name.trim().toLowerCase() === custName.toLowerCase()
          const phoneMatch = custPhone && c.phone && c.phone.trim() === custPhone.trim()
          return nameMatch || phoneMatch
        })

        if (cust) {
          if (otherBills.length === 0) {
            // No other bills left: remove customer from directory
            this.deleteCustomer(cust.id || cust._id)
          } else {
            // Decrement customer total orders
            cust.totalOrders = Math.max(0, (Number(cust.totalOrders) || 1) - 1)
            this.updateCustomer(cust)
          }
        }
      }

      // 3. Restore product stock if items were sold
      const items = Array.isArray(targetTx.itemDetails) && targetTx.itemDetails.length > 0
        ? targetTx.itemDetails
        : (Array.isArray(targetTx.items) && typeof targetTx.items[0] === 'object' ? targetTx.items : [])

      if (items.length > 0) {
        const products = this.getProducts()
        items.forEach((item) => {
          const itemDesc = String(item.description || item.name || '').trim().toLowerCase()
          const itemSku = String(item.sku || '').trim().toLowerCase()
          const itemProdId = String(item.productId || item.id || '').trim().toLowerCase()

          const p = products.find((prod) => {
            const prodSku = String(prod.sku || '').trim().toLowerCase()
            const prodName = String(prod.name || '').trim().toLowerCase()
            const prodId = String(prod.id || prod._id || '').trim().toLowerCase()
            return (
              (itemSku && prodSku === itemSku) ||
              (itemProdId && prodId === itemProdId) ||
              (itemDesc && prodName === itemDesc) ||
              (itemDesc && prodName.includes(itemDesc)) ||
              (prodName && itemDesc.includes(prodName)) ||
              (prodSku && itemDesc.includes(prodSku))
            )
          })

          if (p) {
            const qtySold = Number(item.quantity) || 1
            p.stockQuantity = (Number(p.stockQuantity) || 0) + qtySold
            p.stockOut = Math.max(0, (Number(p.stockOut) || 0) - qtySold)
          }
        })
        this.saveProducts(products)
      }
    }

    // Sync deletion to MongoDB backend
    fetch(`${API_BASE}/api/sales/${encodeURIComponent(invoiceOrId)}`, {
      method: 'DELETE',
    }).catch(() => {})

    notifyStoreUpdate()
    return filtered
  },
  recordSaleFromBill(bill) {
    const txs = this.getTransactions()
    const items = bill.items || []
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price || item.unitPrice || 0) * Number(item.quantity || 1)), 0)
    const totalGst = items.reduce((sum, item) => {
      const lineCost = Number(item.price || item.unitPrice || 0) * Number(item.quantity || 1)
      const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : 18
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

    const txTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

    const itemNames = items.map((i) => `${i.quantity || 1}x ${i.description || i.name || 'Furniture'}`).join(', ')
    const taxType = bill.taxType || 'intra'
    const cgstAmount = taxType === 'intra' ? totalGst / 2 : 0
    const sgstAmount = taxType === 'intra' ? totalGst / 2 : 0
    const igstAmount = taxType === 'inter' ? totalGst : 0
    const invDate = bill.invoiceDate || new Date().toISOString().split('T')[0]

    const newTx = {
      id: bill.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      invoice: bill.invoiceNumber || `INV-${Date.now().toString().slice(-4)}`,
      date: `${txDateStr}, ${txTimeStr}`,
      rawDate: invDate,
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
      taxType,
      cgstAmount,
      sgstAmount,
      igstAmount,
      amount: grandTotal.toLocaleString('en-IN'),
      rawAmount: grandTotal,
      subtotal,
      taxAmount: totalGst,
      discount,
      deliveryCharge: delivery,
      status: bill.paymentStatus || 'Paid',
      paymentStatus: bill.paymentStatus || 'Paid',
      paymentMode: bill.paymentMode || 'UPI',
      billedBy: bill.billedBy || bill.salesPerson || '',
      salesPerson: bill.salesPerson || bill.billedBy || '',
    }

    const existingIdx = txs.findIndex(
      (t) => (t.invoice && t.invoice === newTx.invoice) || (t.id && t.id === newTx.id)
    )
    if (existingIdx !== -1) {
      txs[existingIdx] = { ...txs[existingIdx], ...newTx }
    } else {
      txs.unshift(newTx)
    }
    this.saveTransactions(txs)

    // Deduct stock locally and increment stockOut
    const products = this.getProducts()
    items.forEach((item) => {
      const itemDesc = String(item.description || item.name || '').trim().toLowerCase()
      const itemSku = String(item.sku || '').trim().toLowerCase()
      const itemProdId = String(item.productId || item.id || '').trim().toLowerCase()

      const p = products.find((prod) => {
        const prodSku = String(prod.sku || '').trim().toLowerCase()
        const prodName = String(prod.name || '').trim().toLowerCase()
        const prodId = String(prod.id || prod._id || '').trim().toLowerCase()

        return (
          (itemSku && prodSku === itemSku) ||
          (itemProdId && prodId === itemProdId) ||
          (itemDesc && prodName === itemDesc) ||
          (itemDesc && prodName.includes(itemDesc)) ||
          (prodName && itemDesc.includes(prodName)) ||
          (prodSku && itemDesc.includes(prodSku))
        )
      })

      if (p) {
        const qtySold = Number(item.quantity) || 1
        const prevQty = Number(p.stockQuantity) || 0
        p.stockQuantity = Math.max(0, prevQty - qtySold)
        p.stockOut = (Number(p.stockOut) || 0) + qtySold
        if (p.stockIn === undefined || p.stockIn === 0) {
          p.stockIn = prevQty + (Number(p.stockOut) || 0)
        }
      }
    })
    this.saveProducts(products)

    // Increment ordersClosed for salesPerson if matched
    if (newTx.billedBy || newTx.salesPerson) {
      const spName = (newTx.billedBy || newTx.salesPerson).trim().toLowerCase()
      const spList = this.getSalesPersons()
      const sp = spList.find((s) => s.name?.toLowerCase() === spName || s.code?.toLowerCase() === spName)
      if (sp) {
        sp.ordersClosed = (Number(sp.ordersClosed) || 0) + 1
        this.saveSalesPersons(spList)

        // Sync update to backend
        const key = sp._id || sp.id || sp.code
        fetch(`${API_BASE}/api/sales-persons/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sp),
        }).catch(() => {})
      }
    }

    // Increment customer totalOrders if customer exists in directory
    const rawCustForOrder = bill.customer
    const custNameForOrder = typeof rawCustForOrder === 'object' && rawCustForOrder !== null ? (rawCustForOrder.name || '') : String(rawCustForOrder || '').trim()
    const custPhoneForOrder = (typeof rawCustForOrder === 'object' && rawCustForOrder !== null ? rawCustForOrder.phone : null) || bill.customerPhone || ''
    if (custNameForOrder && !custNameForOrder.toLowerCase().includes('walk-in')) {
      const custList = this.getCustomers()
      const cust = custList.find((c) => {
        const nameMatch = c.name && c.name.trim().toLowerCase() === custNameForOrder.toLowerCase()
        const phoneMatch = custPhoneForOrder && c.phone && c.phone.trim() === custPhoneForOrder.trim()
        return nameMatch || phoneMatch
      })
      if (cust) {
        cust.totalOrders = (Number(cust.totalOrders) || 0) + 1
        this.updateCustomer(cust)
      }
    }

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
        billedBy: newTx.billedBy,
        salesPerson: newTx.salesPerson,
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
