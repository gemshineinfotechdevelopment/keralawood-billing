import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import './BillingPOS.css'

// Accurate Indian Number-to-Words converter (e.g. 1,500 -> One Thousand Five Hundred Rupees Only)
function numberToWordsINR(num) {
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only'
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertTwoDigits = (n) => {
    if (n === 0) return ''
    if (n < 20) return a[n] + ' '
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' '
  }

  const convertThreeDigits = (n) => {
    let str = ''
    if (Math.floor(n / 100) > 0) {
      str += a[Math.floor(n / 100)] + ' Hundred '
    }
    const rem = n % 100
    if (rem > 0) {
      str += convertTwoDigits(rem)
    }
    return str
  }

  let amount = Math.floor(num)
  let result = ''

  const crore = Math.floor(amount / 10000000)
  amount %= 10000000
  if (crore > 0) {
    result += convertThreeDigits(crore) + 'Crore '
  }

  const lakh = Math.floor(amount / 100000)
  amount %= 100000
  if (lakh > 0) {
    result += convertThreeDigits(lakh) + 'Lakh '
  }

  const thousand = Math.floor(amount / 1000)
  amount %= 1000
  if (thousand > 0) {
    result += convertThreeDigits(thousand) + 'Thousand '
  }

  if (amount > 0) {
    result += convertThreeDigits(amount)
  }

  result = result.trim()
  return result ? `${result} Rupees Only` : 'Zero Rupees Only'
}

const getCustomerInitials = (name) => {
  if (!name) return 'WC'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return String(name).trim().slice(0, 2).toUpperCase() || 'WC'
}

export default function BillingPOS({ onNavigateToProducts, initialViewMode = 'list' }) {
  const [viewMode, setViewMode] = useState(initialViewMode) // 'list' | 'editor'
  const [billsSearch, setBillsSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [savedBills, setSavedBills] = useState(() => DataStore.getTransactions())
  const [previewBill, setPreviewBill] = useState(null)
  const [deleteModalBill, setDeleteModalBill] = useState(null)

  const [bills, setBills] = useState(() => DataStore.getBills())
  const [activeBillId, setActiveBillId] = useState(() => DataStore.getActiveBillId())
  const [customers, setCustomers] = useState(() => DataStore.getCustomers())
  const [products, setProducts] = useState(() => DataStore.getProducts())
  const [settings, setSettings] = useState(() => DataStore.getSettings())

  // Modal, Dossier & Toast States
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [billDossierOpen, setBillDossierOpen] = useState(false)
  const [printSuccessToast, setPrintSuccessToast] = useState('')
  const [saveCustomerToDirectory, setSaveCustomerToDirectory] = useState(false)
  const [additionalOptionsOpen, setAdditionalOptionsOpen] = useState(false)
  const [expandedItemDetails, setExpandedItemDetails] = useState({}) // { [itemId]: boolean }

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode)
    }
  }, [initialViewMode])

  // Listen to store updates
  useEffect(() => {
    const handleUpdate = () => {
      setBills(DataStore.getBills())
      setActiveBillId(DataStore.getActiveBillId())
      setCustomers(DataStore.getCustomers())
      setProducts(DataStore.getProducts())
      setSettings(DataStore.getSettings())
      setSavedBills(DataStore.getTransactions())
    }
    window.addEventListener('timber_store_updated', handleUpdate)

    // Pull live sales from MongoDB Atlas on mount
    fetch('/api/sales')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.sales)) {
          setSavedBills(data.sales)
          DataStore.saveTransactions(data.sales)
        }
      })
      .catch(() => {})

    // Pull live data from MongoDB Atlas on mount
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products)
          DataStore.saveProducts(data.products)
        }
      })
      .catch(() => {})

    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.customers) && data.customers.length > 0) {
          const formatted = data.customers.map((c) => ({
            id: c._id || c.id,
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
          }))
          setCustomers(formatted)
          DataStore.saveCustomers(formatted)
        }
      })
      .catch(() => {})

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.settings) {
          setSettings(data.settings)
          DataStore.saveSettings(data.settings)
        }
      })
      .catch(() => {})

    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  // Close drawer or modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setBillDossierOpen(false)
        setInvoiceModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Find or create active bill
  const currentBill = useMemo(() => {
    return bills.find((b) => b.id === activeBillId) || bills[0] || DataStore.createNewDraft()
  }, [bills, activeBillId])

  // Top fields: Invoice Number (Auto-generated), Invoice Date, Due Date
  const autoGeneratedInvoiceNumber = useMemo(() => {
    if (currentBill.invoiceNumber && currentBill.invoiceNumber !== '') {
      return currentBill.invoiceNumber
    }
    const allNums = bills
      .map((b) => {
        const m = String(b.invoiceNumber || '').match(/INV-(\d+)/i)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => !isNaN(n) && n > 0)
    const nextSeq = allNums.length > 0 ? Math.max(...allNums) + 1 : 1001
    return `INV-${nextSeq}`
  }, [currentBill.invoiceNumber, bills])

  const invoiceNumber = currentBill.invoiceNumber || autoGeneratedInvoiceNumber
  const invoiceDate = currentBill.invoiceDate || new Date().toISOString().split('T')[0]
  const dueDate = currentBill.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Customer state
  const customer = currentBill.customer || { name: '', phone: '', address: '', gstin: '' }

  // Items in active bill (fallback to 1 empty row if items array is empty)
  const items = currentBill.items && currentBill.items.length > 0
    ? currentBill.items
    : [
        {
          id: 'item-initial-1',
          description: '',
          quantity: 1,
          unit: 'Pieces (Nos)',
          price: 0,
          gstRate: 0,
          length: '',
          width: '',
          height: '',
          weight: '',
          woodSpecies: 'Teak',
          finish: 'Natural Beeswax',
        },
      ]

  // Payment status & modes
  const paymentStatus = currentBill.paymentStatus || 'Pending' // 'Pending' | 'Partial' | 'Paid'
  const paymentMode = currentBill.paymentMode || 'UPI'
  const amountPaid = Number(currentBill.amountPaid) || 0
  const discount = Number(currentBill.discount) || 0
  const deliveryCharge = Number(currentBill.deliveryCharge) || 0
  const notes = currentBill.notes || ''

  // Calculations
  const itemsSubtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const prc = Number(item.price) || 0
    return sum + qty * prc
  }, 0)

  const totalGst = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const prc = Number(item.price) || 0
    const gstRate = Number(item.gstRate) || 0
    return sum + (qty * prc * gstRate) / 100
  }, 0)

  const grandTotal = Math.max(0, Math.round(itemsSubtotal + totalGst + deliveryCharge - discount))
  const balanceDue = paymentStatus === 'Paid' ? 0 : Math.max(0, grandTotal - amountPaid)

  // -------------------------------------------------------------
  // Bill State Updaters
  // -------------------------------------------------------------
  const updateCurrentBill = (updates) => {
    DataStore.updateBill(currentBill.id, updates)
    setBills(DataStore.getBills())
  }

  // Handle Switch or Create Bill
  const handleSwitchBill = (id) => {
    setActiveBillId(id)
    DataStore.setActiveBillId(id)
  }

  const handleCreateNewBill = () => {
    const newBill = DataStore.createNewDraft()
    setBills(DataStore.getBills())
    setActiveBillId(newBill.id)
    setSaveCustomerToDirectory(false)
    setPrintSuccessToast('✓ Created fresh empty bill!')
    setTimeout(() => setPrintSuccessToast(''), 2000)
  }

  const handleRemoveBill = (e, id) => {
    e.stopPropagation()
    const nextBill = DataStore.removeBill(id)
    setBills(DataStore.getBills())
    if (nextBill) setActiveBillId(nextBill.id)
  }

  // Customer Field Changes
  const handleCustomerChange = (field, val) => {
    const updated = { ...customer, [field]: val }
    updateCurrentBill({
      customer: updated,
      name: updated.name ? `${currentBill.name.split('•')[0].trim()} • ${updated.name}` : currentBill.name,
    })
  }

  // Autofill Customer from Dropdown
  const handleAutofillCustomer = (e) => {
    const selectedId = e.target.value
    if (!selectedId || selectedId === 'clear') {
      updateCurrentBill({
        customer: { name: '', phone: '', address: '', deliveryAddress: '', gstin: '' },
      })
      return
    }
    const found = customers.find((c) => String(c.id) === String(selectedId) || c.name === selectedId)
    if (found) {
      updateCurrentBill({
        customer: {
          id: found.id,
          name: found.name,
          phone: found.phone || '',
          address: found.address || found.location || '',
          deliveryAddress: found.deliveryAddress || found.address || '',
          gstin: found.gstin || '',
        },
        name: `${currentBill.name.split('•')[0].trim()} • ${found.name}`,
      })
    }
  }

  // -------------------------------------------------------------
  // Items Operations
  // -------------------------------------------------------------
  // Add Blank Row
  const handleAddBlankRow = () => {
    const newRow = {
      id: `item-${Date.now()}-${items.length + 1}`,
      description: '',
      quantity: 1,
      unit: 'Pieces (Nos)',
      price: 0,
      gstRate: 0,
      length: '',
      width: '',
      height: '',
      weight: '',
      woodSpecies: 'Teak',
      finish: 'Natural Beeswax',
    }
    updateCurrentBill({ items: [...items, newRow] })
  }

  // Pick from Products Catalog Dropdown
  const handlePickFromCatalog = (e) => {
    const prodIdOrSku = e.target.value
    if (!prodIdOrSku) return

    const prod = products.find((p) => p.id === prodIdOrSku || p.sku === prodIdOrSku || p.name === prodIdOrSku)
    if (!prod) return

    const newRow = {
      id: `item-${Date.now()}-${items.length + 1}`,
      productId: prod.id || prod._id,
      sku: prod.sku,
      name: prod.name,
      description: prod.name,
      quantity: 1,
      unit: 'Pieces (Nos)',
      price: Number(prod.sellingPrice || prod.unitPrice || prod.rawPrice || 0),
      gstRate: 18,
      length: prod.dimensions?.length || '',
      width: prod.dimensions?.width || '',
      height: prod.dimensions?.height || '',
      weight: prod.dimensions?.weight || '',
      woodSpecies: prod.woodSpecies || 'Teak',
      finish: prod.surfacePolish || prod.finish || 'Natural Protective Beeswax',
    }

    // If first row is blank and untouched, replace it; else append
    if (items.length === 1 && !items[0].description && Number(items[0].price) === 0) {
      updateCurrentBill({ items: [newRow] })
    } else {
      updateCurrentBill({ items: [...items, newRow] })
    }

    // Reset dropdown selector back to default
    e.target.value = ''
  }

  // Update item field
  const handleItemChange = (index, field, value) => {
    const updated = items.map((item, idx) => {
      if (idx === index) {
        const nextItem = { ...item, [field]: value }
        if (field === 'description' && typeof value === 'string' && value.trim()) {
          const valTrim = value.trim().toLowerCase()
          const matched = products.find(
            (p) =>
              (p.name && p.name.toLowerCase() === valTrim) ||
              (p.sku && p.sku.toLowerCase() === valTrim)
          )
          if (matched) {
            nextItem.productId = matched.id || matched._id
            nextItem.sku = matched.sku
            nextItem.name = matched.name
            if (!nextItem.price || Number(nextItem.price) === 0) {
              nextItem.price = Number(matched.sellingPrice || matched.unitPrice || 0)
            }
            if (matched.woodSpecies) nextItem.woodSpecies = matched.woodSpecies
            if (matched.surfacePolish || matched.finish) nextItem.finish = matched.surfacePolish || matched.finish
          }
        }
        return nextItem
      }
      return item
    })
    updateCurrentBill({ items: updated })
  }

  // Duplicate Row
  const handleDuplicateRow = (index) => {
    const target = items[index]
    const clone = {
      ...target,
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    }
    const updated = [...items.slice(0, index + 1), clone, ...items.slice(index + 1)]
    updateCurrentBill({ items: updated })
  }

  // Delete Row
  const handleDeleteRow = (index) => {
    if (items.length <= 1) {
      // Keep at least one empty row
      updateCurrentBill({
        items: [
          {
            id: `item-${Date.now()}`,
            description: '',
            quantity: 1,
            unit: 'Pieces (Nos)',
            price: 0,
            gstRate: 0,
          },
        ],
      })
      return
    }
    const updated = items.filter((_, idx) => idx !== index)
    updateCurrentBill({ items: updated })
  }

  // Toggle item details expansion
  const toggleItemExpansion = (itemId) => {
    setExpandedItemDetails((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  // -------------------------------------------------------------
  // Filtered Saved Bills & List Actions
  // -------------------------------------------------------------
  const filteredSavedBills = useMemo(() => {
    return savedBills.filter((bill) => {
      const q = billsSearch.toLowerCase().trim()
      const invMatch = !q || (bill.invoice && bill.invoice.toLowerCase().includes(q))
      const custMatch = !q || (bill.customer && bill.customer.toLowerCase().includes(q))
      const itemMatch =
        !q ||
        (bill.items && bill.items.toLowerCase().includes(q)) ||
        (bill.item && bill.item.toLowerCase().includes(q))
      const matchesSearch = invMatch || custMatch || itemMatch

      if (!matchesSearch) return false

      if (statusFilter === 'All') return true
      const s = (bill.status || bill.paymentStatus || '').toLowerCase()
      return s.includes(statusFilter.toLowerCase())
    })
  }, [savedBills, billsSearch, statusFilter])

  const handleStartNewBill = () => {
    const fresh = DataStore.createNewDraft()
    setBills(DataStore.getBills())
    setActiveBillId(fresh.id)
    setSaveCustomerToDirectory(false)
    setViewMode('editor')
  }

  const handleBackToList = () => {
    setViewMode('list')
  }

  const handleViewBill = (bill) => {
    setPreviewBill(bill)
    setInvoiceModalOpen(true)
  }

  const handlePrintBill = (bill) => {
    setPreviewBill(bill)
    setInvoiceModalOpen(true)
    setTimeout(() => {
      window.print()
    }, 350)
  }

  const handleDeleteBillClick = (bill) => {
    setDeleteModalBill(bill)
  }

  const handleConfirmDeleteBill = () => {
    if (!deleteModalBill) return
    const inv = deleteModalBill.invoice || deleteModalBill.id
    DataStore.deleteTransaction(inv)
    setSavedBills((prev) => prev.filter((b) => b.invoice !== inv && b.id !== inv))
    setPrintSuccessToast(`✓ Deleted Bill ${inv} successfully!`)
    setDeleteModalBill(null)
    setTimeout(() => setPrintSuccessToast(''), 3000)
  }

  const handleCloseInvoiceModal = () => {
    setInvoiceModalOpen(false)
    setPreviewBill(null)
  }

  // Values to display in invoice modal: use previewBill if set, else current editor bill
  const modalBillData = useMemo(() => {
    if (!previewBill) {
      return {
        invoiceNumber,
        invoiceDate,
        dueDate,
        paymentStatus,
        paymentMode,
        customer,
        items,
        notes,
        itemsSubtotal,
        discount,
        deliveryCharge,
        totalGst,
        grandTotal,
        balanceDue,
      }
    }
    const inv = previewBill.invoice || previewBill.invoiceNumber || previewBill.id || 'INV-000'
    const dt = previewBill.date || new Date().toLocaleDateString('en-GB')
    const due = previewBill.dueDate || '15 Days Net'
    const st = previewBill.paymentStatus || previewBill.status || 'Paid'
    const md = previewBill.paymentMode || 'UPI'
    const cust = {
      name: previewBill.customer || 'Walk-in Patron',
      phone: previewBill.customerPhone || previewBill.phone || 'N/A',
      address: previewBill.customerAddress || previewBill.address || previewBill.location || 'Sivakasi Yard Sale',
      gstin: previewBill.customerGstin || previewBill.gstin || 'Unregistered / Personal',
    }
    const itms =
      Array.isArray(previewBill.itemDetails) && previewBill.itemDetails.length > 0
        ? previewBill.itemDetails
        : [
            {
              id: 'item-prev-1',
              description: previewBill.items || previewBill.item || 'Timber Furniture Order',
              quantity: 1,
              price:
                previewBill.rawAmount ||
                Number(String(previewBill.amount || 0).replace(/[^0-9.]/g, '')) ||
                0,
              gstRate: 0,
              woodSpecies: previewBill.wood || 'Artisan Timber',
            },
          ]
    const gTotal =
      previewBill.rawAmount !== undefined
        ? previewBill.rawAmount
        : Number(String(previewBill.amount || 0).replace(/[^0-9.]/g, '')) || 0
    const sub = previewBill.subtotal !== undefined ? previewBill.subtotal : gTotal
    const disc = previewBill.discount || 0
    const deliv = previewBill.deliveryCharge || 0
    const gstAmt = previewBill.taxAmount || 0
    const bal = st === 'Paid' ? 0 : previewBill.balanceDue || 0
    const nt = previewBill.notes || ''

    return {
      invoiceNumber: inv,
      invoiceDate: dt,
      dueDate: due,
      paymentStatus: st,
      paymentMode: md,
      customer: cust,
      items: itms,
      notes: nt,
      itemsSubtotal: sub,
      discount: disc,
      deliveryCharge: deliv,
      totalGst: gstAmt,
      grandTotal: gTotal,
      balanceDue: bal,
    }
  }, [
    previewBill,
    invoiceNumber,
    invoiceDate,
    dueDate,
    paymentStatus,
    paymentMode,
    customer,
    items,
    notes,
    itemsSubtotal,
    discount,
    deliveryCharge,
    totalGst,
    grandTotal,
    balanceDue,
  ])

  // -------------------------------------------------------------
  // Save & Print Actions
  // -------------------------------------------------------------
  const handleSaveBill = (showModalAfter = false) => {
    if (itemsSubtotal <= 0 && items.filter((i) => i.description.trim()).length === 0) {
      setPrintSuccessToast('⚠️ Please add at least one item before saving.')
      setTimeout(() => setPrintSuccessToast(''), 2500)
      return
    }

    // 1. If "Save customer to directory" is checked, save customer to MongoDB & store
    if (saveCustomerToDirectory && customer.name.trim()) {
      DataStore.addCustomer({
        name: customer.name.trim(),
        phone: customer.phone?.trim() || '',
        address: customer.address?.trim() || '',
        deliveryAddress: customer.address?.trim() || '',
        gstin: customer.gstin?.trim() || 'Unregistered / Personal',
        location: customer.address?.trim() ? customer.address.trim().split(',')[0] : 'Sivakasi',
      })
    }

    // 2. Record sale into MongoDB & local dataStore
    const billToRecord = {
      ...currentBill,
      invoiceNumber,
      invoiceDate,
      dueDate,
      customer,
      items,
      discount,
      deliveryCharge,
      paymentStatus,
      paymentMode,
      amountPaid: paymentStatus === 'Paid' ? grandTotal : amountPaid,
      notes,
    }

    DataStore.recordSaleFromBill(billToRecord)
    setBills(DataStore.getBills())
    setSavedBills(DataStore.getTransactions())

    if (showModalAfter) {
      setPreviewBill(billToRecord)
      setInvoiceModalOpen(true)
    } else {
      setPrintSuccessToast(`✓ Bill ${invoiceNumber} saved successfully to MongoDB!`)
      setViewMode('list')
      setTimeout(() => setPrintSuccessToast(''), 3000)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="pos-concept-page">
      {/* Toast Notification */}
      {printSuccessToast && <div className="pos-floating-toast">{printSuccessToast}</div>}

      {/* Conditional View: Bills Ledger List vs Bill Editor */}
      {viewMode === 'list' ? (
        <div className="pos-bills-list-container">
          {/* List Header */}
          <div className="pos-bills-list-header">
            <div>
              <h2 className="pos-bills-list-title">Billing & POS Invoices</h2>
              <p className="pos-bills-list-subtitle">
                Official billing ledger • {savedBills.length} recorded invoices & customer receipts
              </p>
            </div>
            <button
              type="button"
              className="pos-btn-new-bill-primary"
              onClick={handleStartNewBill}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ New Bill</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="pos-bills-filter-bar">
            <div className="pos-bills-search-wrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8C7E74" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="pos-bills-search-input"
                placeholder="Search by Invoice #, Customer name, phone, or item..."
                value={billsSearch}
                onChange={(e) => setBillsSearch(e.target.value)}
              />
              {billsSearch && (
                <button
                  type="button"
                  className="pos-bills-clear-search"
                  onClick={() => setBillsSearch('')}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="pos-bills-status-filter">
              <span className="pos-filter-label">Status:</span>
              <select
                className="pos-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Invoices</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
              </select>
            </div>
          </div>

          {/* Bills Table */}
          <div className="pos-bills-table-card">
            <div className="pos-bills-table-wrap">
              <table className="pos-bills-table">
                <thead>
                  <tr>
                    <th>INVOICE #</th>
                    <th>DATE</th>
                    <th>CUSTOMER</th>
                    <th>ITEMS ORDERED</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSavedBills.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="pos-bills-empty-cell">
                        <div className="pos-bills-empty-wrap">
                          <span className="pos-bills-empty-icon">🧾</span>
                          <h3 className="pos-bills-empty-title">
                            {billsSearch ? `No invoices found matching "${billsSearch}"` : 'No bills generated yet'}
                          </h3>
                          <p className="pos-bills-empty-desc">
                            {billsSearch
                              ? 'Try adjusting your search criteria or filter.'
                              : 'Click "+ New Bill" above to create and print your first customer timber invoice.'}
                          </p>
                          {!billsSearch && (
                            <button
                              type="button"
                              className="pos-btn-new-bill-primary"
                              style={{ marginTop: '12px' }}
                              onClick={handleStartNewBill}
                            >
                              + Create First Bill
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSavedBills.map((bill, idx) => {
                      const inv = bill.invoice || bill.invoiceNumber || bill.id || `INV-${idx + 1}`
                      const rawAmt = bill.rawAmount !== undefined
                        ? bill.rawAmount
                        : Number(String(bill.amount || 0).replace(/[^0-9.]/g, '')) || 0
                      const status = bill.status || bill.paymentStatus || 'Paid'
                      const statusLower = status.toLowerCase()
                      const statusClass = statusLower.includes('paid')
                        ? 'status-paid'
                        : statusLower.includes('partial')
                        ? 'status-partial'
                        : 'status-pending'

                      return (
                        <tr key={bill.id || bill.invoice || idx} className="pos-bills-table-row">
                          <td className="pos-col-invoice">
                            <span className="pos-invoice-pill">{inv}</span>
                          </td>
                          <td className="pos-col-date">
                            <span className="pos-bill-date">{bill.date || 'Today'}</span>
                          </td>
                          <td className="pos-col-customer">
                            <span className="pos-bill-cust-name">{bill.customer || 'Walk-in Patron'}</span>
                            {(bill.location || bill.customerPhone) && (
                              <span className="pos-bill-cust-sub">
                                {[bill.customerPhone, bill.location].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </td>
                          <td className="pos-col-items">
                            <span className="pos-bill-items-text" title={bill.items || bill.item}>
                              {bill.items || bill.item || 'Timber Furniture Order'}
                            </span>
                          </td>
                          <td className="pos-col-amount">
                            <span className="pos-bill-rupee">₹</span>
                            <span className="pos-bill-amt-val">{rawAmt.toLocaleString('en-IN')}</span>
                          </td>
                          <td className="pos-col-status">
                            <span className={`pos-bill-status-badge ${statusClass}`}>
                              {status}
                            </span>
                          </td>
                          <td className="pos-col-actions" style={{ textAlign: 'center' }}>
                            <div className="pos-bill-actions-wrap">
                              <button
                                type="button"
                                className="btn-bill-action btn-bill-view"
                                onClick={() => handleViewBill(bill)}
                                title="View Tax Invoice"
                                aria-label="View Invoice"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                className="btn-bill-action btn-bill-print"
                                onClick={() => handlePrintBill(bill)}
                                title="Print Invoice"
                                aria-label="Print Invoice"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 6 2 18 2 18 9" />
                                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                                  <rect x="6" y="14" width="12" height="8" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                className="btn-bill-action btn-bill-delete"
                                onClick={() => handleDeleteBillClick(bill)}
                                title="Delete Bill"
                                aria-label="Delete Bill"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="pos-bills-footer-info">
              <span>Showing {filteredSavedBills.length} of {savedBills.length} invoices</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="pos-editor-full-container">
          {/* Back to Bills List Header in Editor */}
          <div className="pos-editor-return-bar">
            <button
              type="button"
              className="pos-btn-return-list"
              onClick={handleBackToList}
            >
              ← Back to Bills List
            </button>
            <span className="pos-editor-mode-label">Editing Customer Bill • {invoiceNumber}</span>
          </div>

          {/* Top Bar with Concurrent Draft Tabs */}
          <div className="pos-drafts-topbar">
        <div className="pos-drafts-tabs-scroll">
          {bills.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              className={`pos-draft-chip ${b.id === currentBill.id ? 'active' : ''}`}
              onClick={() => handleSwitchBill(b.id)}
            >
              <span>{b.invoiceNumber || `Bill #${idx + 1}`}</span>
              {bills.length > 1 && (
                <span
                  className="pos-draft-chip-close"
                  onClick={(e) => handleRemoveBill(e, b.id)}
                  title="Close draft"
                >
                  ✕
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="pos-topbar-actions">
          <button type="button" className="pos-btn-new-draft" onClick={handleCreateNewBill}>
            + New Draft Bill
          </button>
          <button
            type="button"
            className="pos-btn-dossier-toggle"
            onClick={() => setBillDossierOpen(true)}
            title="Open Slide-over Bill Dossier"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Bill Dossier</span>
            <span className="pos-dossier-pill">₹{grandTotal.toLocaleString('en-IN')}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Concept Workspace */}
      <div className="pos-concept-workspace">
        {/* LEFT COLUMN: Metadata, Customer Details, Items, Additional Options */}
        <div className="pos-concept-left-column">
          {/* 1. Header Card: Invoice Number, Invoice Date, Due Date */}
          <div className="pos-card pos-meta-header-card">
            <div className="pos-meta-grid">
              <div className="pos-input-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label className="pos-label" style={{ marginBottom: 0 }}>Invoice Number *</label>
                    <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#C88D58', backgroundColor: '#FEF6EE', border: '1px solid #F5D7BA', padding: '1px 5px', borderRadius: '4px' }}>Auto-Generated</span>
                  </div>
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 'none', color: '#8A7B72', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                    title="Generate New Invoice Number"
                    onClick={() => {
                      const allNums = bills
                        .map((b) => {
                          const m = String(b.invoiceNumber || '').match(/INV-(\d+)/i)
                          return m ? parseInt(m[1], 10) : 0
                        })
                        .filter((n) => !isNaN(n) && n > 0)
                      const nextSeq = allNums.length > 0 ? Math.max(...allNums) + 1 : 1001
                      updateCurrentBill({ invoiceNumber: `INV-${nextSeq}` })
                    }}
                  >
                    🔄 Auto
                  </button>
                </div>
                <input
                  type="text"
                  className="pos-input"
                  value={invoiceNumber}
                  onChange={(e) => updateCurrentBill({ invoiceNumber: e.target.value })}
                  placeholder="INV-1001"
                />
              </div>

              <div className="pos-input-group">
                <label className="pos-label">Invoice Date *</label>
                <div className="pos-date-wrapper">
                  <input
                    type="date"
                    className="pos-input pos-date-input"
                    value={invoiceDate}
                    onChange={(e) => updateCurrentBill({ invoiceDate: e.target.value })}
                  />
                  <span className="pos-calendar-icon">📅</span>
                </div>
              </div>

              <div className="pos-input-group">
                <label className="pos-label">Due Date</label>
                <div className="pos-date-wrapper">
                  <input
                    type="date"
                    className="pos-input pos-date-input"
                    value={dueDate}
                    onChange={(e) => updateCurrentBill({ dueDate: e.target.value })}
                  />
                  <span className="pos-calendar-icon">📅</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Customer Details Card */}
          <div className="pos-card pos-customer-card">
            <div className="pos-card-header">
              <h3 className="pos-card-title">CUSTOMER DETAILS</h3>
              <div className="pos-card-header-actions">
                <select className="pos-select-autofill" onChange={handleAutofillCustomer} defaultValue="">
                  <option value="" disabled>
                    Autofill Saved Customer... ▾
                  </option>
                  <option value="clear">— Clear / New Customer —</option>
                  {customers.map((c) => (
                    <option key={c.id || c.name} value={c.id || c.name}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pos-customer-grid">
              <div className="pos-input-group">
                <input
                  type="text"
                  className="pos-input"
                  value={customer.name || ''}
                  onChange={(e) => handleCustomerChange('name', e.target.value)}
                  placeholder="Customer / Shop Name *"
                />
              </div>

              <div className="pos-input-group">
                <input
                  type="text"
                  className="pos-input"
                  value={customer.phone || ''}
                  onChange={(e) => handleCustomerChange('phone', e.target.value)}
                  placeholder="Phone Number (Optional)"
                />
              </div>

              <div className="pos-input-group pos-full-width">
                <input
                  type="text"
                  className="pos-input"
                  value={customer.address || ''}
                  onChange={(e) => handleCustomerChange('address', e.target.value)}
                  placeholder="Customer Address / City (Optional)"
                />
              </div>
            </div>

            <div className="pos-customer-checkbox-row">
              <label className="pos-checkbox-label">
                <input
                  type="checkbox"
                  checked={saveCustomerToDirectory}
                  onChange={(e) => setSaveCustomerToDirectory(e.target.checked)}
                />
                <span>Save customer to directory for future bills</span>
              </label>
            </div>
          </div>

          {/* 3. ITEMS Section */}
          <div className="pos-card pos-items-card">
            <div className="pos-card-header">
              <h3 className="pos-card-title">ITEMS ({items.length})</h3>
              <div className="pos-items-header-actions">
                <select className="pos-select-pick-catalog" onChange={handlePickFromCatalog} defaultValue="">
                  <option value="" disabled>
                    + Pick from Products Catalog... ▾
                  </option>
                  {products.map((p) => (
                    <option key={p.id || p.sku} value={p.sku || p.name}>
                      {p.name} — ₹{Number(p.sellingPrice || p.unitPrice || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>

                <button type="button" className="pos-btn-add-blank-row" onClick={handleAddBlankRow}>
                  <span className="pos-plus-icon">⊕</span> Add Blank Row
                </button>
              </div>
            </div>

            {/* Items Table */}
            <div className="pos-items-table-wrapper">
              <div className="pos-items-table-header">
                <div className="pos-col-idx">#</div>
                <div className="pos-col-desc">ITEM DESCRIPTION</div>
                <div className="pos-col-qty">QUANTITY</div>
                <div className="pos-col-rate">PRICE / RATE (₹)</div>
                <div className="pos-col-total">TOTAL & ACTIONS</div>
              </div>

              <div className="pos-items-rows-container">
                {items.map((item, index) => {
                  const qty = Number(item.quantity) || 0
                  const prc = Number(item.price) || 0
                  const lineTotal = qty * prc
                  const isExpanded = !!expandedItemDetails[item.id]

                  return (
                    <div key={item.id || index} className="pos-item-row-block">
                      <div className="pos-item-row-main">
                        {/* Number Badge */}
                        <div className="pos-col-idx">
                          <span className="pos-idx-badge">{index + 1}</span>
                        </div>

                        {/* Item Description */}
                        <div className="pos-col-desc">
                          <input
                            type="text"
                            list="pos-catalog-datalist"
                            className="pos-input pos-item-desc-input"
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            placeholder="Enter item description or furniture name"
                          />
                        </div>

                        {/* Quantity */}
                        <div className="pos-col-qty">
                          <input
                            type="number"
                            min="1"
                            className="pos-input pos-item-qty-input"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                            placeholder="Qty"
                          />
                        </div>

                        {/* Price / Rate (₹) */}
                        <div className="pos-col-rate">
                          <div className="pos-price-input-wrap">
                            <span className="pos-rupee-symbol">₹</span>
                            <input
                              type="number"
                              min="0"
                              className="pos-input pos-item-price-input"
                              value={item.price}
                              onChange={(e) => handleItemChange(index, 'price', Math.max(0, Number(e.target.value) || 0))}
                              placeholder="Price"
                            />
                          </div>
                        </div>

                        {/* Total & Action Buttons */}
                        <div className="pos-col-total">
                          <span className="pos-item-line-total">
                            ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            className="pos-row-action-btn pos-btn-copy"
                            onClick={() => handleDuplicateRow(index)}
                            title="Duplicate Row"
                          >
                            📋
                          </button>
                          <button
                            type="button"
                            className="pos-row-action-btn pos-btn-delete"
                            onClick={() => handleDeleteRow(index)}
                            title="Delete Row"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Expandable row strip under each row */}
                      <div className="pos-item-row-substrip">
                        <button
                          type="button"
                          className="pos-btn-expand-specs"
                          onClick={() => toggleItemExpansion(item.id)}
                        >
                          <span className="pos-expand-icon">⚙️</span>
                          <span>+ Add Dimensions, Wood Species & Finish (Optional) {isExpanded ? '▴' : '▾'}</span>
                        </button>

                        <div className="pos-gst-selector-wrap">
                          <span className="pos-gst-label">GST:</span>
                          <select
                            className="pos-select-gst"
                            value={item.gstRate !== undefined ? item.gstRate : 0}
                            onChange={(e) => handleItemChange(index, 'gstRate', Number(e.target.value))}
                          >
                            <option value="0">0% (Nil)</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                      </div>

                      {/* Expanded Timber Specifications (Optional) */}
                      {isExpanded && (
                        <div className="pos-item-specs-drawer">
                          <div className="pos-specs-grid">
                            <div>
                              <label className="pos-specs-label">Length (cm)</label>
                              <input
                                type="text"
                                className="pos-input"
                                value={item.length || ''}
                                onChange={(e) => handleItemChange(index, 'length', e.target.value)}
                                placeholder="e.g. 210"
                              />
                            </div>
                            <div>
                              <label className="pos-specs-label">Width (cm)</label>
                              <input
                                type="text"
                                className="pos-input"
                                value={item.width || ''}
                                onChange={(e) => handleItemChange(index, 'width', e.target.value)}
                                placeholder="e.g. 100"
                              />
                            </div>
                            <div>
                              <label className="pos-specs-label">Height (cm)</label>
                              <input
                                type="text"
                                className="pos-input"
                                value={item.height || ''}
                                onChange={(e) => handleItemChange(index, 'height', e.target.value)}
                                placeholder="e.g. 76"
                              />
                            </div>
                            <div>
                              <label className="pos-specs-label">Wood Species</label>
                              <input
                                type="text"
                                className="pos-input"
                                value={item.woodSpecies || ''}
                                onChange={(e) => handleItemChange(index, 'woodSpecies', e.target.value)}
                                placeholder="Teak / Rosewood"
                              />
                            </div>
                            <div>
                              <label className="pos-specs-label">Finish / Polish</label>
                              <input
                                type="text"
                                className="pos-input"
                                value={item.finish || ''}
                                onChange={(e) => handleItemChange(index, 'finish', e.target.value)}
                                placeholder="Organic Beeswax"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <datalist id="pos-catalog-datalist">
              {products.map((p) => (
                <option key={p.id || p.sku} value={p.name}>
                  {p.sku} • ₹{Number(p.sellingPrice || p.unitPrice || 0).toLocaleString('en-IN')}
                </option>
              ))}
            </datalist>
          </div>

          {/* Prominent Bill Dossier & Checkout Trigger Bar */}
          <div className="pos-checkout-trigger-bar">
            <div className="pos-checkout-trigger-info">
              <span className="pos-checkout-items-count">
                {items.length} {items.length === 1 ? 'Timber Item' : 'Timber Items'}
              </span>
              <span className="pos-checkout-amount">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pos-checkout-actions-inline">
              <button
                type="button"
                className="pos-btn-direct-save"
                onClick={() => handleSaveBill(false)}
                title="Save bill and deduct stock immediately"
              >
                <span>💾 Save & Deduct Stock</span>
              </button>
              <button
                type="button"
                className="pos-btn-open-dossier-prominent"
                onClick={() => setBillDossierOpen(true)}
              >
                <span>View Bill Dossier</span>
                <span className="pos-arrow-symbol">→</span>
              </button>
            </div>
          </div>

          {/* Discount & Delivery Options (Inline, No Dropdown) */}
          <div className="pos-card pos-additional-options-card">
            <div className="pos-card-header-clean" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px' }}>🏷️</span>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, margin: 0, color: '#31190B', letterSpacing: '-0.01em' }}>
                Trade Discount & Delivery Logistics
              </h3>
            </div>
            <div className="pos-additional-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="pos-input-group">
                <label className="pos-label">Trade Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="pos-input"
                  value={discount}
                  onChange={(e) => updateCurrentBill({ discount: Math.max(0, Number(e.target.value) || 0) })}
                  placeholder="0"
                />
              </div>

              <div className="pos-input-group">
                <label className="pos-label">Delivery Logistics Charges (₹)</label>
                <input
                  type="number"
                  min="0"
                  className="pos-input"
                  value={deliveryCharge}
                  onChange={(e) => updateCurrentBill({ deliveryCharge: Math.max(0, Number(e.target.value) || 0) })}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Bill Dossier Drawer */}
      {billDossierOpen && (
        <div className="dossier-drawer-backdrop" onClick={() => setBillDossierOpen(false)}>
          <div className="dossier-drawer-panel bill-dossier-panel" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="dossier-drawer-header">
              <div className="dossier-drawer-header-top">
                <div className="dossier-badge-wrap">
                  <span className="dossier-eyebrow">BILL DOSSIER</span>
                  <span className="dossier-badge-pill">{invoiceNumber || 'INV-1001'}</span>
                  <span className={`bill-status-pill status-${(paymentStatus || 'pending').toLowerCase()}`}>
                    {paymentStatus}
                  </span>
                </div>
                <button
                  type="button"
                  className="dossier-close-btn"
                  onClick={() => setBillDossierOpen(false)}
                  aria-label="Close bill dossier"
                >
                  ✕
                </button>
              </div>

              {/* Customer Profile Banner */}
              <div className="bill-dossier-customer-card">
                <div className="bill-dossier-cust-avatar">
                  {getCustomerInitials(customer?.name)}
                </div>
                <div className="bill-dossier-cust-info">
                  <h3 className="bill-dossier-cust-name">{customer.name || 'Walk-in Customer'}</h3>
                  <div className="bill-dossier-cust-meta">
                    {customer.phone && <span>📞 {customer.phone}</span>}
                    {customer.gstin && <span>🏛️ GSTIN: {customer.gstin}</span>}
                    {customer.address && <span>📍 {customer.address}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="dossier-drawer-body">
              {/* Hero Grand Total Box */}
              <div className="bill-dossier-grand-card">
                <div className="bill-dossier-grand-header">
                  <span className="bill-dossier-grand-label">GRAND TOTAL</span>
                  <span className="bill-dossier-item-tag">{items.length} {items.length === 1 ? 'Item' : 'Items'}</span>
                </div>
                <div className="bill-dossier-grand-price">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="bill-dossier-in-words">
                  <em>{numberToWordsINR(grandTotal)}</em>
                </div>
              </div>

              {/* Itemized Order Breakdown */}
              <div className="dossier-section-box">
                <div className="bill-dossier-sec-header">
                  <h4 className="dossier-section-heading" style={{ margin: 0, border: 'none', padding: 0 }}>
                    Itemized Order Breakdown
                  </h4>
                  <span className="bill-dossier-sec-sub">Sivakasi Yard Depot</span>
                </div>
                <div className="bill-dossier-items-list">
                  {items.map((it, idx) => {
                    const rowLine = (Number(it.quantity) || 0) * (Number(it.price) || 0)
                    return (
                      <div key={it.id || idx} className="bill-dossier-item-row">
                        <div className="bill-dossier-item-left">
                          <span className="bill-dossier-item-num">#{idx + 1}</span>
                          <div className="bill-dossier-item-details">
                            <span className="bill-dossier-item-name">{it.description || 'Timber Item'}</span>
                            <span className="bill-dossier-item-specs">
                              {it.woodSpecies ? `${it.woodSpecies} ` : ''}
                              {it.finish ? `• ${it.finish} ` : ''}
                              • Qty: {it.quantity || 1} × ₹{(Number(it.price) || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <div className="bill-dossier-item-right">
                          <span className="bill-dossier-item-line">₹{rowLine.toLocaleString('en-IN')}</span>
                          {it.gstRate > 0 && <span className="bill-dossier-item-tax">+{it.gstRate}% GST</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="dossier-section-box">
                <h4 className="dossier-section-heading">Financial Summary</h4>
                <div className="bill-dossier-calc-lines">
                  <div className="bill-dossier-calc-line">
                    <span className="bill-dossier-calc-label">Items Subtotal:</span>
                    <span className="bill-dossier-calc-val">
                      ₹{itemsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {discount > 0 && (
                    <div className="bill-dossier-calc-line calc-discount">
                      <span className="bill-dossier-calc-label">Trade Discount:</span>
                      <span className="bill-dossier-calc-val">-₹{discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {deliveryCharge > 0 && (
                    <div className="bill-dossier-calc-line">
                      <span className="bill-dossier-calc-label">Delivery Charges:</span>
                      <span className="bill-dossier-calc-val">+₹{deliveryCharge.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {totalGst > 0 && (
                    <div className="bill-dossier-calc-line">
                      <span className="bill-dossier-calc-label">Tax / GST Breakdown:</span>
                      <span className="bill-dossier-calc-val">
                        +₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <div className="bill-dossier-divider" />

                  <div className="bill-dossier-calc-line calc-net-total">
                    <span className="bill-dossier-calc-label bold">Final Payable Total:</span>
                    <span className="bill-dossier-calc-val bold">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Settlement Section */}
              <div className="dossier-section-box">
                <h4 className="dossier-section-heading">Payment Settlement</h4>
                <div className="pos-payment-status-block" style={{ marginBottom: '12px' }}>
                  <label className="pos-label">Payment Status</label>
                  <div className="pos-payment-status-segmented">
                    {['Pending', 'Partial', 'Paid'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        className={`pos-status-tab ${paymentStatus === st ? 'active' : ''}`}
                        onClick={() => updateCurrentBill({ paymentStatus: st })}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  {paymentStatus === 'Partial' && (
                    <div className="pos-partial-input-wrap">
                      <div className="pos-input-group">
                        <label className="pos-label">Amount Paid (₹)</label>
                        <input
                          type="number"
                          min="0"
                          max={grandTotal}
                          className="pos-input"
                          value={amountPaid}
                          onChange={(e) => updateCurrentBill({ amountPaid: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="pos-partial-balance">
                        <span>Balance Due:</span>
                        <strong>₹{balanceDue.toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  )}

                  <div className="pos-payment-mode-wrap">
                    <label className="pos-label">Payment Mode</label>
                    <select
                      className="pos-select"
                      value={paymentMode}
                      onChange={(e) => updateCurrentBill({ paymentMode: e.target.value })}
                    >
                      <option value="UPI">UPI / QR Transfer</option>
                      <option value="Cash">Cash at Yard</option>
                      <option value="Bank Transfer">Bank Wire (NEFT/RTGS)</option>
                      <option value="Cheque">Commercial Cheque</option>
                      <option value="Card">Credit / Debit Card</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Invoice Metadata & Dates */}
              <div className="dossier-section-box">
                <h4 className="dossier-section-heading">Billing Metadata</h4>
                <div className="dossier-details-grid">
                  <div className="dossier-detail-row">
                    <span className="dossier-label">INVOICE DATE</span>
                    <span className="dossier-value">{invoiceDate || '-'}</span>
                  </div>
                  <div className="dossier-detail-row">
                    <span className="dossier-label">DUE DATE</span>
                    <span className="dossier-value">{dueDate || '-'}</span>
                  </div>
                  {notes && (
                    <div className="dossier-detail-row full-width">
                      <span className="dossier-label">NOTE / INSTRUCTION</span>
                      <span className="dossier-value desc-text">{notes}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="dossier-drawer-actions bill-dossier-actions">
              <button
                type="button"
                className="pos-btn-save-bill"
                onClick={() => {
                  handleSaveBill(false)
                  setBillDossierOpen(false)
                }}
              >
                💾 Save Bill
              </button>

              <button
                type="button"
                className="pos-btn-save-print"
                onClick={() => {
                  handleSaveBill(true)
                  setBillDossierOpen(false)
                }}
              >
                👁️ Save & Print Preview
              </button>

              <button
                type="button"
                className="btn-dossier-close-full"
                onClick={() => setBillDossierOpen(false)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* Delete Bill Confirmation Modal */}
      {deleteModalBill && (
        <div className="pos-modal-overlay" onClick={() => setDeleteModalBill(null)}>
          <div className="pos-delete-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pos-delete-modal-icon">⚠️</div>
            <h3 className="pos-delete-modal-title">
              Delete Bill {deleteModalBill.invoice || deleteModalBill.id}?
            </h3>
            <p className="pos-delete-modal-desc">
              Are you sure you want to permanently delete this bill for{' '}
              <strong>{deleteModalBill.customer || 'Walk-in Patron'}</strong>? This will remove the transaction record from sales history and recent sales.
            </p>
            <div className="pos-delete-modal-actions">
              <button
                type="button"
                className="pos-btn-modal-cancel"
                onClick={() => setDeleteModalBill(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pos-btn-modal-delete-confirm"
                onClick={handleConfirmDeleteBill}
              >
                🗑️ Delete Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal Dossier */}
      {invoiceModalOpen && (
        <div className="pos-modal-overlay" onClick={handleCloseInvoiceModal}>
          <div className="pos-invoice-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <div className="pos-modal-header-info">
                <h3>Kerala Wood Furniture — Tax Invoice</h3>
                <p>Official Sivakasi Central Depot Tax Document</p>
              </div>
              <div className="pos-modal-header-actions">
                <button type="button" className="pos-btn-print-now" onClick={handlePrint}>
                  🖨️ Print Invoice
                </button>
                <button type="button" className="pos-btn-modal-close" onClick={handleCloseInvoiceModal}>
                  ✕
                </button>
              </div>
            </div>

            <div className="pos-invoice-printable-sheet" id="pos-printable-invoice">
              {/* Invoice Header */}
              <div className="pos-print-top">
                <div className="pos-print-brand">
                  {settings.logoUrl && (
                    <img src={settings.logoUrl} alt="Logo" className="pos-print-custom-logo" />
                  )}
                  <h2>{settings.depotName || 'Kerala Wood Furniture — Sivakasi Depot'}</h2>
                  <p>{settings.address || 'Sivakasi Central Depot & Mill Yard, Sivakasi'}</p>
                  <p>
                    Phone: {settings.contactPhone} • GSTIN: {settings.gstin} • HSN: {settings.hsnCode}
                  </p>
                </div>
                <div className="pos-print-meta">
                  <div className="pos-print-badge">TAX INVOICE</div>
                  <p>
                    <strong>Invoice #:</strong> {modalBillData.invoiceNumber}
                  </p>
                  <p>
                    <strong>Invoice Date:</strong> {modalBillData.invoiceDate}
                  </p>
                  <p>
                    <strong>Due Date:</strong> {modalBillData.dueDate}
                  </p>
                  <p>
                    <strong>Payment:</strong> {modalBillData.paymentStatus} ({modalBillData.paymentMode})
                  </p>
                </div>
              </div>

              {/* Customer Box */}
              <div className="pos-print-customer-box">
                <div className="pos-print-col">
                  <h4>Billed To:</h4>
                  <p className="pos-print-cust-name">{modalBillData.customer.name || 'Walk-in Customer'}</p>
                  <p>{modalBillData.customer.address || 'Sivakasi Yard Destination'}</p>
                  <p>Phone: {modalBillData.customer.phone || 'N/A'}</p>
                  <p>GSTIN: {modalBillData.customer.gstin || 'Unregistered / Personal'}</p>
                </div>
                <div className="pos-print-col">
                  <h4>Depot & Mill Yard:</h4>
                  <p>{settings.depotName}</p>
                  <p>Forest Timber Transit Permit: SFD/SVK/TMR/2026-884</p>
                  <p>Payment Terms: {settings.paymentTerms || 'Immediate / POS'}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="pos-print-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item Description</th>
                    <th>Qty</th>
                    <th>Price (₹)</th>
                    <th>GST</th>
                    <th>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {modalBillData.items.map((it, idx) => {
                    const rowLine = (Number(it.quantity) || 1) * (Number(it.price) || 0)
                    return (
                      <tr key={it.id || idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{it.description || it.name || 'Timber Item'}</strong>
                          {it.woodSpecies && (
                            <span className="pos-print-subspec">
                              {' '}
                              • {it.woodSpecies} {it.finish ? `(${it.finish})` : ''}
                            </span>
                          )}
                        </td>
                        <td>{it.quantity || 1}</td>
                        <td>₹{Number(it.price || 0).toLocaleString('en-IN')}</td>
                        <td>{it.gstRate || 0}%</td>
                        <td>₹{rowLine.toLocaleString('en-IN')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Totals & Signatures */}
              <div className="pos-print-footer">
                <div className="pos-print-words-and-notes">
                  <p>
                    <strong>Amount in Words:</strong>
                  </p>
                  <p className="pos-print-italic-words">{numberToWordsINR(modalBillData.grandTotal)}</p>
                  {modalBillData.notes && (
                    <p className="pos-print-note">
                      <strong>Note:</strong> {modalBillData.notes}
                    </p>
                  )}
                  <p className="pos-print-disclaimer">{settings.disclaimer}</p>
                </div>

                <div className="pos-print-summary-totals">
                  <div className="pos-print-line">
                    <span>Items Subtotal:</span>
                    <span>₹{modalBillData.itemsSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {modalBillData.discount > 0 && (
                    <div className="pos-print-line">
                      <span>Trade Discount:</span>
                      <span>-₹{modalBillData.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {modalBillData.deliveryCharge > 0 && (
                    <div className="pos-print-line">
                      <span>Delivery Logistics:</span>
                      <span>+₹{modalBillData.deliveryCharge.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {modalBillData.totalGst > 0 && (
                    <div className="pos-print-line">
                      <span>GST Amount:</span>
                      <span>+₹{modalBillData.totalGst.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="pos-print-line pos-print-grand">
                    <strong>Grand Total:</strong>
                    <strong>₹{modalBillData.grandTotal.toLocaleString('en-IN')}</strong>
                  </div>
                  {modalBillData.paymentStatus === 'Partial' && (
                    <div className="pos-print-line pos-print-balance">
                      <span>Balance Due:</span>
                      <span>₹{modalBillData.balanceDue.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="pos-print-sign-box">
                    <p>For {settings.depotName}</p>
                    <div className="pos-print-sign-space" />
                    <p>Authorized Signatory: {settings.signatoryName || 'Rajesh Sivan'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
