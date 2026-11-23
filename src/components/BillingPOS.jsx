import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DataStore } from '../services/dataStore'
import kwfLogo from '../assets/kwf.jpg'
import { printInvoiceDocument, numberToWordsINR } from '../utils/printInvoice'
import { validatePhone, validateGSTIN } from '../utils/validators'
import './BillingPOS.css'

const getCustomerInitials = (name) => {
  if (!name) return 'WC'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return String(name).trim().slice(0, 2).toUpperCase() || 'WC'
}

const PAYMENT_MODES = [
  { value: 'UPI', label: 'UPI / QR Transfer' },
  { value: 'Cash', label: 'Cash Payment' },
  { value: 'Card', label: 'Credit / Debit Card' },
  { value: 'Bank Transfer', label: 'Net Banking / Wire Transfer' },
  { value: 'Cheque', label: 'Commercial Cheque' },
]

export default function BillingPOS({ onNavigateToProducts, initialViewMode = 'list' }) {
  const [viewMode, setViewMode] = useState(initialViewMode) // 'list' | 'editor'
  const [billsSearch, setBillsSearch] = useState('')
  const [savedBills, setSavedBills] = useState(() => DataStore.getTransactions())
  const [previewBill, setPreviewBill] = useState(null)
  const [deleteModalBill, setDeleteModalBill] = useState(null)

  const [bills, setBills] = useState(() => DataStore.getBills())
  const [activeBillId, setActiveBillId] = useState(() => DataStore.getActiveBillId())
  const [customers, setCustomers] = useState(() => DataStore.getCustomers())
  const [products, setProducts] = useState(() => DataStore.getProducts())
  const [settings, setSettings] = useState(() => DataStore.getSettings())
  const [salesPersonsList, setSalesPersonsList] = useState(() => DataStore.getSalesPersons())

  // Modal, Dossier & Toast States
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [billDossierOpen, setBillDossierOpen] = useState(false)
  const [printSuccessToast, setPrintSuccessToast] = useState('')
  const [saveCustomerToDirectory, setSaveCustomerToDirectory] = useState(false)
  const [additionalOptionsOpen, setAdditionalOptionsOpen] = useState(false)
  const [expandedItemDetails, setExpandedItemDetails] = useState({}) // { [itemId]: boolean }

  // Customer search & sameAsBillTo state
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [sameAsBillTo, setSameAsBillTo] = useState(false)
  const [customerValidationErrors, setCustomerValidationErrors] = useState({})
  const customerSearchRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target)) {
        setCustomerSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      setSalesPersonsList(DataStore.getSalesPersons())
    }
    window.addEventListener('timber_store_updated', handleUpdate)

    // Pull live sales persons from MongoDB on mount
    fetch('/api/sales-persons')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.salesPersons) && data.salesPersons.length > 0) {
          setSalesPersonsList(data.salesPersons)
          DataStore.saveSalesPersons(data.salesPersons)
        }
      })
      .catch(() => {})

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
    return DataStore.getNextInvoiceNumber(currentBill.id, false)
  }, [currentBill.invoiceNumber, currentBill.id, bills, savedBills])

  const invoiceNumber = currentBill.invoiceNumber || autoGeneratedInvoiceNumber
  const invoiceDate = currentBill.invoiceDate || new Date().toISOString().split('T')[0]
  const dueDate = currentBill.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Customer state
  const customer = currentBill.customer || { name: '', phone: '', address: '', gstin: '' }
  const shipping = currentBill.shipping || {
    name: customer.name || '',
    phone: customer.phone || '',
    address: customer.address || '',
  }

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
          gstRate: 18,
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
  const rawMode = currentBill.paymentMode || 'UPI'
  const paymentMode =
    rawMode === 'Net Banking' || rawMode === 'Bank Wire' ? 'Bank Transfer' : rawMode
  const billedBy = currentBill.billedBy || currentBill.salesPerson || (salesPersonsList[0]?.name || '')
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

  // GST Tax Mode: 'intra' (CGST + SGST Mandatory) vs 'inter' (IGST Optional)
  const taxType = currentBill.taxType || 'intra'

  const totalGst = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const prc = Number(item.price) || 0
    const gstRate = item.gstRate !== undefined ? Number(item.gstRate) : 18
    return sum + (qty * prc * gstRate) / 100
  }, 0)

  const cgstRate = Number(settings.cgstRate) || 9
  const sgstRate = Number(settings.sgstRate) || 9
  const igstRate = cgstRate + sgstRate

  const cgstAmount = taxType === 'intra' ? totalGst / 2 : 0
  const sgstAmount = taxType === 'intra' ? totalGst / 2 : 0
  const igstAmount = taxType === 'inter' ? totalGst : 0

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
    const updatedShip = sameAsBillTo
      ? {
          ...shipping,
          [field]: val,
        }
      : shipping

    updateCurrentBill({
      customer: updated,
      shipping: updatedShip,
      name: updated.name ? `${currentBill.name.split('•')[0].trim()} • ${updated.name}` : currentBill.name,
    })
  }

  // Shipping Field Changes
  const handleShippingChange = (field, val) => {
    updateCurrentBill({
      shipping: {
        ...shipping,
        [field]: val,
      },
    })
  }

  // Select customer from search dropdown
  const handleSelectCustomer = (c) => {
    if (!c) {
      updateCurrentBill({
        customer: { name: '', phone: '', address: '', deliveryAddress: '', gstin: '' },
        shipping: sameAsBillTo ? { name: '', phone: '', address: '' } : shipping,
      })
      setCustomerSearchQuery('')
    } else {
      updateCurrentBill({
        customer: {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          address: c.address || c.location || '',
          deliveryAddress: c.deliveryAddress || c.address || '',
          gstin: c.gstin || '',
        },
        shipping: sameAsBillTo ? {
          name: c.name,
          phone: c.phone || '',
          address: c.deliveryAddress || c.address || '',
        } : shipping,
        name: `${currentBill.name.split('•')[0].trim()} • ${c.name}`,
      })
      setCustomerSearchQuery(c.name)
    }
    setCustomerSearchOpen(false)
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
      gstRate: 18,
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

    if (prodIdOrSku === '__blank__') {
      handleAddBlankRow()
      e.target.value = ''
      return
    }

    const prod = products.find((p) => p.id === prodIdOrSku || p.sku === prodIdOrSku || p.name === prodIdOrSku)
    if (!prod) {
      e.target.value = ''
      return
    }

    const stock = Number(
      prod.stockQuantity !== undefined
        ? prod.stockQuantity
        : prod.stock !== undefined
        ? prod.stock
        : prod.quantity !== undefined
        ? prod.quantity
        : 0
    )

    if (stock <= 0) {
      alert(`⚠️ "${prod.name}" is currently Out of Stock (0 units available). Cannot be added to bill.`)
      setPrintSuccessToast(`⚠️ "${prod.name}" is Out of Stock!`)
      setTimeout(() => setPrintSuccessToast(''), 3000)
      e.target.value = ''
      return
    }

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
    return (Array.isArray(savedBills) ? savedBills : []).filter((bill) => {
      if (!bill) return false
      const q = billsSearch.toLowerCase().trim()
      if (!q) return true
      const invMatch = bill.invoice && String(bill.invoice).toLowerCase().includes(q)
      const custStr = typeof bill.customer === 'object' && bill.customer !== null
        ? String(bill.customer.name || '')
        : String(bill.customer || '')
      const custMatch = custStr.toLowerCase().includes(q)
      const phoneMatch = (bill.customerPhone || bill.phone) && String(bill.customerPhone || bill.phone).toLowerCase().includes(q)
      const itemsStr = Array.isArray(bill.items)
        ? bill.items.map((i) => i.description || i.name || '').join(' ')
        : String(bill.items || bill.item || '')
      const itemMatch = itemsStr.toLowerCase().includes(q)
      const modeMatch = bill.paymentMode && String(bill.paymentMode).toLowerCase().includes(q)
      return invMatch || custMatch || phoneMatch || itemMatch || modeMatch
    })
  }, [savedBills, billsSearch])

  const [billsPage, setBillsPage] = useState(1)
  const [billsPerPage, setBillsPerPage] = useState(20)
  const totalBillsPages = filteredSavedBills.length > 0 ? Math.ceil(filteredSavedBills.length / billsPerPage) : 0
  const safeBillsPage = totalBillsPages > 0 ? Math.min(billsPage, totalBillsPages) : 1
  const paginatedSavedBills = totalBillsPages > 0 ? filteredSavedBills.slice((safeBillsPage - 1) * billsPerPage, safeBillsPage * billsPerPage) : []

  const handleStartNewBill = () => {
    const defaultBilledBy = salesPersonsList[0]?.name || ''
    // Ensure only exactly 1 fresh clean bill draft exists when starting a new bill
    // Next invoice number is strictly based on completed / saved bills in the billing list
    const nextInv = DataStore.getNextInvoiceNumber(null, false)
    const today = new Date().toISOString().split('T')[0]
    const due = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
    const fresh = {
      id: `bill-${Date.now()}`,
      invoiceNumber: nextInv,
      invoiceDate: today,
      dueDate: due,
      name: 'Bill #1',
      status: 'active',
      customer: {
        id: `cust-${Date.now()}`,
        name: '',
        phone: '',
        address: '',
        deliveryAddress: '',
        location: '',
        gstin: '',
        totalOrders: 0,
        lifetimeValue: 0,
      },
      shipping: {
        name: '',
        phone: '',
        address: '',
      },
      items: [],
      paymentStatus: 'Pending',
      paymentMode: 'UPI',
      billedBy: defaultBilledBy,
      salesPerson: defaultBilledBy,
      amountPaid: 0,
      discount: 0,
      deliveryCharge: 0,
      notes: '',
    }
    // Set bills list to ONLY this single bill draft
    DataStore.saveBills([fresh])
    DataStore.setActiveBillId(fresh.id)
    setBills([fresh])
    setActiveBillId(fresh.id)
    setCustomerSearchQuery('')
    setCustomerSearchOpen(false)
    setSameAsBillTo(false)
    setSaveCustomerToDirectory(false)
    setAdditionalOptionsOpen(false)
    setExpandedItemDetails({})
    setBillDossierOpen(false)
    setViewMode('editor')
  }

  const handleBackToList = () => {
    setViewMode('list')
  }

  const handleEditBill = (bill) => {
    const inv = bill.invoice || bill.invoiceNumber || bill.id
    const existingDraft = bills.find((b) => b.invoiceNumber === inv || b.id === inv || b.id === bill.id)

    if (existingDraft) {
      setActiveBillId(existingDraft.id)
      DataStore.setActiveBillId(existingDraft.id)
      setViewMode('editor')
      setPrintSuccessToast(`✓ Resumed editing bill ${inv}!`)
      setTimeout(() => setPrintSuccessToast(''), 2000)
      return
    }

    const itms = Array.isArray(bill.itemDetails) && bill.itemDetails.length > 0
      ? bill.itemDetails
      : [
          {
            id: 'item-edit-1',
            description: bill.items || bill.item || 'Timber Furniture Order',
            quantity: 1,
            unit: 'Pieces (Nos)',
            price: bill.rawAmount || Number(String(bill.amount || 0).replace(/[^0-9.]/g, '')) || 0,
            gstRate: bill.taxType === 'intra' || !bill.taxType ? 18 : 18,
            hsn: bill.hsnCode || '4407',
            woodSpecies: bill.wood || 'Teak',
            finish: 'Natural Beeswax',
          },
        ]

    const editableBill = {
      id: bill.id || `bill-edit-${Date.now()}`,
      invoiceNumber: inv,
      invoiceDate: bill.rawDate || (bill.date && !isNaN(new Date(bill.date).getTime()) ? new Date(bill.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      paymentStatus: bill.paymentStatus || bill.status || 'Paid',
      paymentMode: bill.paymentMode || 'UPI',
      billedBy: bill.billedBy || bill.salesPerson || (salesPersonsList[0]?.name || ''),
      salesPerson: bill.salesPerson || bill.billedBy || (salesPersonsList[0]?.name || ''),
      amountPaid: bill.rawAmount || Number(String(bill.amount || 0).replace(/[^0-9.]/g, '')) || 0,
      discount: bill.discount || 0,
      deliveryCharge: bill.deliveryCharge || 0,
      taxType: bill.taxType || 'intra',
      notes: bill.notes || '',
      customer: {
        name: bill.customer || 'Walk-in Patron',
        phone: bill.customerPhone || bill.phone || '',
        address: bill.customerAddress || bill.address || bill.location || '',
        gstin: bill.customerGstin || bill.gstin || '',
      },
      shipping: bill.shipping || {
        name: bill.shippingName || bill.customer || '',
        phone: bill.shippingPhone || bill.customerPhone || '',
        address: bill.shippingAddress || bill.location || bill.customerAddress || '',
      },
      items: itms,
    }

    DataStore.saveBill(editableBill)
    setBills(DataStore.getBills())
    setActiveBillId(editableBill.id)
    DataStore.setActiveBillId(editableBill.id)
    setViewMode('editor')
    setPrintSuccessToast(`✓ Loaded bill ${inv} for editing!`)
    setTimeout(() => setPrintSuccessToast(''), 2000)
  }

  const handleViewBill = (bill) => {
    setPreviewBill(bill)
    setInvoiceModalOpen(true)
  }

  const handlePrintBill = (bill) => {
    setPreviewBill(bill)
    // Direct isolated print: guarantees 100% full-page crisp print without clipping or blank gaps
    printInvoiceDocument(bill, settings, kwfLogo)
  }

  const handleDeleteBillClick = (bill) => {
    setDeleteModalBill(bill)
  }

  const handleConfirmDeleteBill = () => {
    if (!deleteModalBill) return
    const inv = deleteModalBill.invoice || deleteModalBill.id
    DataStore.deleteTransaction(inv)
    setSavedBills((prev) => prev.filter((b) => b.invoice !== inv && b.id !== inv))
    setCustomers(DataStore.getCustomers())
    setSalesPersonsList(DataStore.getSalesPersons())
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
        billedBy,
        customer,
        shipping,
        items,
        notes,
        itemsSubtotal,
        discount,
        deliveryCharge,
        taxType,
        totalGst,
        cgstAmount,
        sgstAmount,
        igstAmount,
        grandTotal,
        balanceDue,
      }
    }
    const inv = previewBill.invoice || previewBill.invoiceNumber || previewBill.id || '100'
    const dt = previewBill.date || new Date().toLocaleDateString('en-GB')
    const due = previewBill.dueDate || '15 Days Net'
    const st = previewBill.paymentStatus || previewBill.status || 'Paid'
    const md = previewBill.paymentMode || 'UPI'

    const custName = typeof previewBill.customer === 'object' && previewBill.customer !== null
      ? (previewBill.customer.name || 'Walk-in Patron')
      : (typeof previewBill.customer === 'string' && previewBill.customer.trim() ? previewBill.customer : 'Walk-in Patron')
    const custPhone = (typeof previewBill.customer === 'object' && previewBill.customer !== null ? previewBill.customer.phone : null) || previewBill.customerPhone || previewBill.phone || 'N/A'
    const custAddress = (typeof previewBill.customer === 'object' && previewBill.customer !== null ? previewBill.customer.address : null) || previewBill.customerAddress || previewBill.address || previewBill.location || 'Sivakasi Yard Sale'
    const custGstin = (typeof previewBill.customer === 'object' && previewBill.customer !== null ? previewBill.customer.gstin : null) || previewBill.customerGstin || previewBill.gstin || 'Unregistered / Personal'

    const cust = {
      name: custName,
      phone: custPhone,
      address: custAddress,
      gstin: custGstin,
    }

    const shp = {
      name: (typeof previewBill.shipping === 'object' && previewBill.shipping !== null ? previewBill.shipping.name : null) || previewBill.shippingName || cust.name,
      phone: (typeof previewBill.shipping === 'object' && previewBill.shipping !== null ? previewBill.shipping.phone : null) || previewBill.shippingPhone || cust.phone,
      address: (typeof previewBill.shipping === 'object' && previewBill.shipping !== null ? previewBill.shipping.address : null) || previewBill.shippingAddress || cust.address,
    }

    const itms =
      Array.isArray(previewBill.items) && previewBill.items.length > 0 && typeof previewBill.items[0] === 'object'
        ? previewBill.items
        : Array.isArray(previewBill.itemDetails) && previewBill.itemDetails.length > 0
        ? previewBill.itemDetails
        : [
            {
              id: 'item-prev-1',
              description: typeof previewBill.items === 'string' && previewBill.items.trim()
                ? previewBill.items
                : (typeof previewBill.item === 'string' && previewBill.item.trim() ? previewBill.item : 'Timber Furniture Order'),
              quantity: 1,
              price:
                previewBill.rawAmount ||
                Number(String(previewBill.amount || 0).replace(/[^0-9.]/g, '')) ||
                0,
              gstRate: 0,
              hsn: previewBill.hsnCode || '4407',
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

    const activeTaxType = previewBill.taxType || 'intra'
    const cgstAmt = previewBill.cgstAmount !== undefined ? previewBill.cgstAmount : (activeTaxType === 'intra' ? gstAmt / 2 : 0)
    const sgstAmt = previewBill.sgstAmount !== undefined ? previewBill.sgstAmount : (activeTaxType === 'intra' ? gstAmt / 2 : 0)
    const igstAmt = previewBill.igstAmount !== undefined ? previewBill.igstAmount : (activeTaxType === 'inter' ? gstAmt : 0)

    return {
      invoiceNumber: inv,
      invoiceDate: dt,
      dueDate: due,
      paymentStatus: st,
      paymentMode: md,
      billedBy: previewBill.billedBy || previewBill.salesPerson || billedBy,
      customer: cust,
      shipping: shp,
      items: itms,
      notes: nt,
      itemsSubtotal: sub,
      discount: disc,
      deliveryCharge: deliv,
      taxType: activeTaxType,
      totalGst: gstAmt,
      cgstAmount: cgstAmt,
      sgstAmount: sgstAmt,
      igstAmount: igstAmt,
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
    billedBy,
    customer,
    shipping,
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
  const handleSaveBill = (showModalAfter = false, directPrintAfter = false) => {
    // Collect valid items or fallback
    const validItems = items
      .filter((i) => (i.description && i.description.trim()) || Number(i.price) > 0)
      .map((i, idx) => ({
        ...i,
        description: i.description?.trim() || `Timber Order Item #${idx + 1}`,
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
        hsn: i.hsn || i.hsnCode || settings.hsnCode || '4407',
      }))

    if (validItems.length === 0) {
      alert('⚠️ Please enter at least one item description or rate before saving.')
      setPrintSuccessToast('⚠️ Please enter at least one item description or rate before saving.')
      setTimeout(() => setPrintSuccessToast(''), 3000)
      return
    }

    // Validate customer phone & GSTIN if provided
    const custErrs = {}
    if (customer.phone && customer.phone.trim()) {
      const phoneVal = validatePhone(customer.phone, false)
      if (!phoneVal.isValid) custErrs.phone = phoneVal.error
    }
    if (customer.gstin && customer.gstin.trim() && customer.gstin !== 'Unregistered / Personal') {
      const gstinVal = validateGSTIN(customer.gstin, false)
      if (!gstinVal.isValid) custErrs.gstin = gstinVal.error
    }
    if (Object.keys(custErrs).length > 0) {
      setCustomerValidationErrors(custErrs)
      const firstErr = Object.values(custErrs)[0]
      setPrintSuccessToast(`⚠️ ${firstErr}`)
      setTimeout(() => setPrintSuccessToast(''), 3500)
      return
    }
    setCustomerValidationErrors({})

    // Check if any item selected is out of stock in catalog
    for (const it of validItems) {
      const itDesc = String(it.description || it.name || '').trim().toLowerCase()
      const itSku = String(it.sku || '').trim().toLowerCase()
      const matched = products.find(
        (p) =>
          (itSku && String(p.sku || '').trim().toLowerCase() === itSku) ||
          (p.name && String(p.name).trim().toLowerCase() === itDesc)
      )
      if (matched) {
        const stock = Number(
          matched.stockQuantity !== undefined
            ? matched.stockQuantity
            : matched.stock !== undefined
            ? matched.stock
            : matched.quantity !== undefined
            ? matched.quantity
            : 0
        )
        if (stock <= 0) {
          alert(`⚠️ "${matched.name}" is currently Out of Stock (0 units remaining). Please remove it before saving the bill.`)
          setPrintSuccessToast(`⚠️ "${matched.name}" is Out of Stock!`)
          setTimeout(() => setPrintSuccessToast(''), 3000)
          return
        }
      }
    }

    // 1. If "Save customer to directory" is checked, save customer to MongoDB & store
    if (saveCustomerToDirectory && customer.name && customer.name.trim()) {
      DataStore.addCustomer({
        name: customer.name.trim(),
        phone: customer.phone?.trim() || '',
        address: customer.address?.trim() || '',
        deliveryAddress: shipping?.address?.trim() || customer.address?.trim() || '',
        gstin: customer.gstin?.trim() || 'Unregistered / Personal',
        location: customer.address?.trim() ? customer.address.trim().split(',')[0] : 'Sivakasi',
      })
    }

    // 2. Record sale into MongoDB & local dataStore
    const billToRecord = {
      ...currentBill,
      id: currentBill.id || `BILL-${Date.now()}`,
      invoiceNumber,
      invoiceDate,
      dueDate,
      customer,
      shipping,
      items: validItems,
      itemDetails: validItems,
      discount,
      deliveryCharge,
      taxType,
      cgstAmount,
      sgstAmount,
      igstAmount,
      subtotal: itemsSubtotal,
      rawAmount: grandTotal,
      amount: grandTotal,
      paymentStatus,
      paymentMode,
      billedBy,
      salesPerson: billedBy,
      amountPaid: paymentStatus === 'Paid' ? grandTotal : amountPaid,
      balanceDue,
      notes,
    }

    try {
      DataStore.recordSaleFromBill(billToRecord)
      DataStore.removeBill(currentBill.id)

      // Create a fresh clean new draft so the bill form is completely cleared
      const freshDraft = DataStore.createNewDraft()
      setBills(DataStore.getBills())
      setActiveBillId(freshDraft.id)
      DataStore.setActiveBillId(freshDraft.id)
      setSavedBills(DataStore.getTransactions())

      // Reset all search and form states
      setCustomerSearchQuery('')
      setCustomerSearchOpen(false)
      setSameAsBillTo(false)
      setSaveCustomerToDirectory(false)
      setAdditionalOptionsOpen(false)
      setExpandedItemDetails({})
      setBillDossierOpen(false)

      if (directPrintAfter) {
        setPreviewBill(billToRecord)
        setInvoiceModalOpen(false)
        setPrintSuccessToast(`✓ Bill ${invoiceNumber} saved! Opening print preview...`)
        setTimeout(() => {
          printInvoiceDocument(billToRecord, settings, kwfLogo)
          setTimeout(() => setPrintSuccessToast(''), 3000)
        }, 150)
        setViewMode('list')
      } else if (showModalAfter) {
        setPreviewBill(billToRecord)
        setInvoiceModalOpen(true)
      } else {
        setPrintSuccessToast(`✓ Bill ${invoiceNumber} saved successfully!`)
        setViewMode('list')
        setTimeout(() => setPrintSuccessToast(''), 3000)
      }
    } catch (err) {
      console.error('[BillingPOS] Save bill error:', err)
      alert('Error saving bill: ' + err.message)
    }
  }

  const handlePrint = () => {
    printInvoiceDocument(modalBillData, settings, kwfLogo)
  }

  const renderPrintableInvoiceSheet = () => (
    <div className="pos-invoice-printable-sheet" id="pos-printable-invoice">
      {/* Invoice Header */}
      <div className="pos-print-top">
        <div className="pos-print-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <img src={settings.logoUrl || kwfLogo} alt="Kerala Wood Furniture Logo" className="pos-print-custom-logo" style={{ maxHeight: '42px', maxWidth: '42px', objectFit: 'contain', margin: 0 }} />
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#31190B', lineHeight: 1.1 }}>
              {(settings.depotName || 'Kerala Wood Furniture').replace(/[-–—]\s*sivakasi\s*depot/gi, '').trim() || 'Kerala Wood Furniture'}
            </h2>
          </div>
          <p>{(settings.address || 'Sivakasi Central Mill Yard, Sivakasi').replace(/Depot & /gi, '').replace(/Central Depot/gi, 'Central Yard')}</p>
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
        </div>
      </div>

      {/* Customer & Shipping Addresses (Bill To & Ship To) */}
      <div className="pos-print-customer-box">
        <div className="pos-print-col">
          <h4>Bill To:</h4>
          <p className="pos-print-cust-name">{typeof modalBillData.customer === 'object' && modalBillData.customer !== null ? (modalBillData.customer.name || 'Walk-in Customer') : (modalBillData.customer || 'Walk-in Customer')}</p>
          <p>{typeof modalBillData.customer === 'object' && modalBillData.customer !== null ? (modalBillData.customer.address || 'Local Destination') : 'Local Destination'}</p>
          <p>Phone: {(typeof modalBillData.customer === 'object' && modalBillData.customer !== null ? modalBillData.customer.phone : null) || modalBillData.customerPhone || 'N/A'}</p>
          <p>GSTIN: {(typeof modalBillData.customer === 'object' && modalBillData.customer !== null ? modalBillData.customer.gstin : null) || modalBillData.customerGstin || 'Unregistered / Personal'}</p>
        </div>
        <div className="pos-print-col">
          <h4>Ship To:</h4>
          <p className="pos-print-cust-name">{modalBillData.shipping?.name || (typeof modalBillData.customer === 'object' && modalBillData.customer !== null ? modalBillData.customer.name : modalBillData.customer) || 'Walk-in Customer'}</p>
          <p>{modalBillData.shipping?.address || (typeof modalBillData.customer === 'object' && modalBillData.customer !== null ? modalBillData.customer.address : '') || 'Same as Billing Address'}</p>
          <p>Phone: {modalBillData.shipping?.phone || (typeof modalBillData.customer === 'object' && modalBillData.customer !== null ? modalBillData.customer.phone : null) || modalBillData.customerPhone || 'N/A'}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="pos-print-table">
        <thead>
          <tr>
            <th style={{ width: '5%' }}>#</th>
            <th style={{ width: '42%' }}>Item Description</th>
            <th style={{ width: '15%' }}>HSN/SAC</th>
            <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
            <th style={{ width: '13%', textAlign: 'right' }}>Rate (₹)</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {modalBillData.items.map((it, idx) => {
            const rowLine = (Number(it.quantity) || 1) * (Number(it.price) || 0)
            const hsn = it.hsn || it.hsnCode || settings.hsnCode || '4407'
            return (
              <tr key={it.id || idx}>
                <td>{idx + 1}</td>
                <td>
                  <strong>{it.description || it.name || 'Timber Item'}</strong>
                </td>
                <td>{hsn}</td>
                <td style={{ textAlign: 'center' }}>{it.quantity || 1}</td>
                <td style={{ textAlign: 'right' }}>₹{Number(it.price || 0).toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}>₹{rowLine.toLocaleString('en-IN')}</td>
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
          <div className="pos-print-declaration-wrap">
            <p className="pos-print-declaration-label">Declaration:</p>
            <p className="pos-print-disclaimer">
              {settings.disclaimer && !settings.disclaimer.includes('Natural variations')
                ? settings.disclaimer
                : 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct'}
            </p>
          </div>
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
          {modalBillData.taxType === 'inter' ? (
            <div className="pos-print-line">
              <span>IGST ({(Number(settings.cgstRate) || 9) + (Number(settings.sgstRate) || 9)}%):</span>
              <span>+₹{(Number(modalBillData.totalGst || modalBillData.igstAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ) : (
            <>
              <div className="pos-print-line">
                <span>CGST ({Number(settings.cgstRate) || 9}%):</span>
                <span>+₹{(modalBillData.cgstAmount ?? ((Number(modalBillData.totalGst) || 0) / 2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="pos-print-line">
                <span>SGST ({Number(settings.sgstRate) || 9}%):</span>
                <span>+₹{(modalBillData.sgstAmount ?? ((Number(modalBillData.totalGst) || 0) / 2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
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
            <p style={{ fontWeight: 600 }}>For Kerala Wood Furniture</p>
            <div className="pos-print-sign-space" />
            <p>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  )

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
              <span>New Bill</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="pos-bills-filter-bar">
            <div className="pos-bills-search-wrap" style={{ maxWidth: '420px', width: '100%' }}>
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
                    <th>PAYMENT MODE</th>
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
                    paginatedSavedBills.map((bill, idx) => {
                      const inv = bill.invoice || bill.invoiceNumber || bill.id || String(100 + idx)
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
                            {(bill.billedBy || bill.salesPerson) && (
                              <span style={{ fontSize: '11px', color: '#8A7B72', display: 'block', marginTop: '2px' }}>
                                By: {bill.billedBy || bill.salesPerson}
                              </span>
                            )}
                          </td>
                          <td className="pos-col-customer">
                            <span className="pos-bill-cust-name">{typeof bill.customer === 'object' && bill.customer !== null ? (bill.customer.name || 'Walk-in Customer') : (bill.customer || 'Walk-in Customer')}</span>
                            {(bill.location || bill.customerPhone) && (
                              <span className="pos-bill-cust-sub">
                                {[bill.customerPhone, bill.location].filter(Boolean).join(' • ')}
                              </span>
                            )}
                          </td>
                          <td className="pos-col-items">
                            <span className="pos-bill-items-text" title={Array.isArray(bill.items) ? bill.items.map(i => i.description || i.name).join(', ') : (bill.items || bill.item || 'Timber Furniture Order')}>
                              {Array.isArray(bill.items) ? bill.items.map(i => i.description || i.name).join(', ') : (bill.items || bill.item || 'Timber Furniture Order')}
                            </span>
                          </td>
                          <td className="pos-col-amount">
                            <span className="pos-bill-rupee">₹</span>
                            <span className="pos-bill-amt-val">{rawAmt.toLocaleString('en-IN')}</span>
                          </td>
                          <td className="pos-col-mode">
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              backgroundColor: '#F5EAE4',
                              color: '#5C3A21',
                              border: '1px solid #E8D5C8',
                              letterSpacing: '0.02em'
                            }}>
                              {bill.paymentMode || 'UPI'}
                            </span>
                          </td>
                          <td className="pos-col-actions" style={{ textAlign: 'center' }}>
                            <div className="pos-bill-actions-wrap">
                              <button
                                type="button"
                                className="btn-bill-action btn-bill-edit"
                                onClick={() => handleEditBill(bill)}
                                title="Edit Bill"
                                aria-label="Edit Bill"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>

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

            {/* Table Footer with Pagination */}
            <div className="patron-table-footer">
              <div className="patron-footer-left">
                <span className="showing-records-text">
                  Showing <strong>{filteredSavedBills.length > 0 ? (
                    (safeBillsPage - 1) * billsPerPage + 1 === Math.min(safeBillsPage * billsPerPage, filteredSavedBills.length)
                      ? `${(safeBillsPage - 1) * billsPerPage + 1}`
                      : `${(safeBillsPage - 1) * billsPerPage + 1}-${Math.min(safeBillsPage * billsPerPage, filteredSavedBills.length)}`
                  ) : '0'}</strong> of {filteredSavedBills.length} invoices
                </span>
                <div className="patron-per-page-wrap">
                  <span className="patron-per-page-label">Show:</span>
                  <select
                    className="patron-per-page-select"
                    value={billsPerPage}
                    onChange={(e) => {
                      setBillsPerPage(Number(e.target.value))
                      setBillsPage(1)
                    }}
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>
                </div>
              </div>

              <div className="patron-pagination">
                <button
                  type="button"
                  className="pagination-arrow"
                  disabled={safeBillsPage <= 1 || totalBillsPages <= 1}
                  onClick={() => setBillsPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>
                {totalBillsPages > 0 && filteredSavedBills.length > 0 ? (
                  Array.from({ length: totalBillsPages }, (_, idx) => idx + 1).map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`pagination-num ${safeBillsPage === num ? 'active' : ''}`}
                      onClick={() => setBillsPage(num)}
                    >
                      {num}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="pagination-num"
                    disabled
                    style={{ opacity: 0.4, cursor: 'default' }}
                  >
                    -
                  </button>
                )}
                <button
                  type="button"
                  className="pagination-arrow"
                  disabled={safeBillsPage >= totalBillsPages || totalBillsPages <= 1}
                  onClick={() => setBillsPage((p) => Math.min(totalBillsPages, p + 1))}
                >
                  ›
                </button>
              </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={settings.logoUrl || kwfLogo}
                alt="Logo"
                style={{ width: '26px', height: '26px', objectFit: 'contain', borderRadius: '4px' }}
              />
              <span className="pos-editor-mode-label">Editing Customer Bill • {invoiceNumber}</span>
            </div>
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
                      const nextSeqInv = DataStore.getNextInvoiceNumber(currentBill.id, false)
                      updateCurrentBill({ invoiceNumber: nextSeqInv })
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
                  placeholder="100"
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
                <label className="pos-label">Payment Mode *</label>
                <select
                  className="pos-input"
                  style={{ height: '38px', cursor: 'pointer', fontWeight: 600, color: '#31190B' }}
                  value={paymentMode}
                  onChange={(e) => updateCurrentBill({ paymentMode: e.target.value })}
                >
                  {PAYMENT_MODES.map((pm) => (
                    <option key={pm.value} value={pm.value}>
                      {pm.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pos-input-group">
                <label className="pos-label">Sales Person (Billed By) *</label>
                <select
                  className="pos-input"
                  style={{ height: '38px', cursor: 'pointer', fontWeight: 600, color: '#31190B' }}
                  value={billedBy}
                  onChange={(e) => updateCurrentBill({ billedBy: e.target.value, salesPerson: e.target.value })}
                >
                  {salesPersonsList.length === 0 ? (
                    <option value="">No sales persons found (Add in Sales Person page)</option>
                  ) : (
                    <>
                      <option value="">-- Select Sales Person --</option>
                      {salesPersonsList.map((sp) => (
                        <option key={sp.id || sp.code} value={sp.name}>
                          {sp.name} {sp.code ? `(${sp.code})` : ''}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Customer Details Card */}
          <div className="pos-card pos-customer-card">
            <div className="pos-card-header">
              <h3 className="pos-card-title">CUSTOMER DETAILS</h3>
              <div className="pos-card-header-actions" ref={customerSearchRef} style={{ position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="pos-input"
                    style={{
                      width: '240px',
                      height: '34px',
                      fontSize: '12px',
                      paddingLeft: '28px',
                      paddingRight: customerSearchQuery ? '26px' : '10px',
                      backgroundColor: '#FEF9F6',
                      borderColor: customerSearchOpen ? '#C88D58' : '#D3C4B8'
                    }}
                    placeholder="Search customer by name/phone..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value)
                      setCustomerSearchOpen(true)
                    }}
                    onFocus={() => setCustomerSearchOpen(true)}
                  />
                  <span style={{ position: 'absolute', left: '9px', fontSize: '12px', color: '#8A7B72', pointerEvents: 'none' }}>
                    🔍
                  </span>
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerSearchQuery('')
                        setCustomerSearchOpen(false)
                      }}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        background: 'none',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: 0
                      }}
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {customerSearchOpen && (
                  <div
                    className="pos-customer-search-dropdown"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      right: 0,
                      width: '280px',
                      zIndex: 100,
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #D3C4B8',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(49, 25, 11, 0.15)',
                      maxHeight: '230px',
                      overflowY: 'auto'
                    }}
                  >
                    <div
                      onClick={() => handleSelectCustomer(null)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '11.5px',
                        color: '#b45309',
                        fontWeight: 700,
                        backgroundColor: '#FEF6EE',
                        borderBottom: '1px solid #F5D7BA',
                        cursor: 'pointer'
                      }}
                    >
                      — Clear / New Customer —
                    </div>
                    {customers
                      .filter((c) => {
                        if (!customerSearchQuery.trim()) return true
                        const q = customerSearchQuery.toLowerCase()
                        return (
                          (c.name && c.name.toLowerCase().includes(q)) ||
                          (c.phone && c.phone.includes(q)) ||
                          (c.address && c.address.toLowerCase().includes(q))
                        )
                      })
                      .map((c) => (
                        <div
                          key={c.id || c.name}
                          onClick={() => handleSelectCustomer(c)}
                          style={{
                            padding: '9px 12px',
                            fontSize: '12px',
                            borderBottom: '1px solid #F8EFE9',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            transition: 'background-color 0.1s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF1EE')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ color: '#31190B' }}>{c.name}</strong>
                            {c.phone && <span style={{ fontSize: '11px', color: '#8C5325', fontWeight: 600 }}>{c.phone}</span>}
                          </div>
                          {(c.address || c.deliveryAddress) && (
                            <span style={{ fontSize: '11px', color: '#8A7B72', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {c.deliveryAddress || c.address}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
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
                  className={`pos-input ${customerValidationErrors.phone ? 'kwf-input-error' : ''}`}
                  value={customer.phone || ''}
                  onChange={(e) => {
                    handleCustomerChange('phone', e.target.value)
                    if (customerValidationErrors.phone) setCustomerValidationErrors({ ...customerValidationErrors, phone: '' })
                  }}
                  placeholder="Phone Number (10 Digits)"
                />
                {customerValidationErrors.phone && <span className="kwf-field-error">{customerValidationErrors.phone}</span>}
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

            {/* Ship To (Delivery / Site Address) */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f0e6de' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#6A5649', letterSpacing: '0.04em' }}>
                  SHIP TO (DELIVERY / SITE ADDRESS)
                </span>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#31190B'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={sameAsBillTo}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setSameAsBillTo(checked)
                      if (checked) {
                        updateCurrentBill({
                          shipping: {
                            name: customer.name || '',
                            phone: customer.phone || '',
                            address: customer.address || '',
                          }
                        })
                      }
                    }}
                    style={{ accentColor: '#8C5325', width: '15px', height: '15px', cursor: 'pointer' }}
                  />
                  <span>Same as Bill To</span>
                </label>
              </div>
              <div className="pos-customer-grid">
                <div className="pos-input-group">
                  <input
                    type="text"
                    className="pos-input"
                    value={shipping.name || ''}
                    onChange={(e) => handleShippingChange('name', e.target.value)}
                    placeholder="Recipient / Site Contact (Ship To)"
                  />
                </div>
                <div className="pos-input-group">
                  <input
                    type="text"
                    className="pos-input"
                    value={shipping.phone || ''}
                    onChange={(e) => handleShippingChange('phone', e.target.value)}
                    placeholder="Shipping Phone"
                  />
                </div>
                <div className="pos-input-group pos-full-width">
                  <input
                    type="text"
                    className="pos-input"
                    value={shipping.address || ''}
                    onChange={(e) => handleShippingChange('address', e.target.value)}
                    placeholder="Shipping / Delivery Site Address (Optional)"
                  />
                </div>
              </div>
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
                  <option value="__blank__">+ Add Custom / Blank Item</option>
                  {products.map((p) => {
                    const stock = Number(
                      p.stockQuantity !== undefined
                        ? p.stockQuantity
                        : p.stock !== undefined
                        ? p.stock
                        : p.quantity !== undefined
                        ? p.quantity
                        : 0
                    )
                    const isOutOfStock = isNaN(stock) || stock <= 0
                    return (
                      <option
                        key={p.id || p.sku}
                        value={p.sku || p.name}
                        disabled={isOutOfStock}
                        style={
                          isOutOfStock
                            ? { color: '#9CA3AF', backgroundColor: '#F3F4F6', cursor: 'not-allowed' }
                            : {}
                        }
                      >
                        {p.name} — ₹{Number(p.sellingPrice || p.unitPrice || 0).toLocaleString('en-IN')}{' '}
                        {isOutOfStock ? '⚠️ (Out of Stock)' : `(${stock} in stock)`}
                      </option>
                    )
                  })}
                </select>
              </div>
            </div>

            {/* Items Table */}
            <div className="pos-items-table-wrapper">
              <div className="pos-items-table-header">
                <div className="pos-col-idx">#</div>
                <div className="pos-col-desc">ITEM DESCRIPTION</div>
                <div className="pos-col-qty">QUANTITY</div>
                <div className="pos-col-rate">PRICE / RATE (₹)</div>
                <div className="pos-col-total">TOTAL (₹)</div>
                <div className="pos-col-actions">ACTIONS</div>
              </div>

              <div className="pos-items-rows-container">
                {items.map((item, index) => {
                  const qty = Number(item.quantity) || 0
                  const prc = Number(item.price) || 0
                  const lineTotal = qty * prc

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
                            id={`item-desc-${item.id || index}`}
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

                        {/* Total Column */}
                        <div className="pos-col-total">
                          <span className="pos-item-line-total">
                            ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Actions Column */}
                        <div className="pos-col-actions">
                          <button
                            type="button"
                            className="btn-bill-action btn-bill-edit"
                            onClick={() => {
                              const el = document.getElementById(`item-desc-${item.id || index}`)
                              if (el) {
                                el.focus()
                                el.select()
                              }
                            }}
                            title="Edit Item Description"
                            aria-label="Edit Item"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="btn-bill-action btn-bill-delete"
                            onClick={() => handleDeleteRow(index)}
                            title="Delete Row"
                            aria-label="Delete Row"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Row substrip for statutory HSN & GST */}
                      <div className="pos-item-row-substrip" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px', padding: '6px 8px', marginTop: '6px', borderTop: '1px dashed #F0E4DC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="pos-gst-label" style={{ fontWeight: 600, fontSize: '11px', color: '#6A5649' }}>HSN:</span>
                          <input
                            type="text"
                            style={{ width: '70px', padding: '2px 6px', fontSize: '11px', height: '26px', border: '1px solid #D3C4B8', borderRadius: '4px' }}
                            value={item.hsn !== undefined ? item.hsn : (settings.hsnCode || '4407')}
                            onChange={(e) => handleItemChange(index, 'hsn', e.target.value)}
                            placeholder="4407"
                          />
                        </div>

                        <div className="pos-gst-selector-wrap" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="pos-gst-label" style={{ fontWeight: 600, fontSize: '11px', color: '#6A5649' }}>
                            {taxType === 'intra' ? 'GST (CGST+SGST):' : 'IGST:'}
                          </span>
                          <select
                            className="pos-select-gst"
                            value={item.gstRate !== undefined ? item.gstRate : 18}
                            onChange={(e) => handleItemChange(index, 'gstRate', Number(e.target.value))}
                          >
                            <option value="18">{taxType === 'intra' ? '18% (9% CGST + 9% SGST)' : '18% (IGST)'}</option>
                            <option value="12">{taxType === 'intra' ? '12% (6% CGST + 6% SGST)' : '12% (IGST)'}</option>
                            <option value="5">{taxType === 'intra' ? '5% (2.5% CGST + 2.5% SGST)' : '5% (IGST)'}</option>
                            <option value="28">{taxType === 'intra' ? '28% (14% CGST + 14% SGST)' : '28% (IGST)'}</option>
                            <option value="0">0% (Nil)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <datalist id="pos-catalog-datalist">
              {products
                .filter((p) => {
                  const stock = Number(
                    p.stockQuantity !== undefined
                      ? p.stockQuantity
                      : p.stock !== undefined
                      ? p.stock
                      : p.quantity !== undefined
                      ? p.quantity
                      : 0
                  )
                  return !isNaN(stock) && stock > 0
                })
                .map((p) => (
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
                <span>💾 Save Bill</span>
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

          {/* Discount, Delivery & GST Tax Options */}
          <div className="pos-card pos-additional-options-card">
            <div className="pos-card-header-clean" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px' }}>🏷️</span>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, margin: 0, color: '#31190B', letterSpacing: '-0.01em' }}>
                Discounts, Logistics & GST Tax Mode
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

            {/* GST Tax Application Mode */}
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <label className="pos-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                GST Tax Application Mode:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: taxType === 'intra' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: taxType === 'intra' ? '#eff6ff' : '#ffffff',
                    color: taxType === 'intra' ? '#1d4ed8' : '#64748b',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => updateCurrentBill({ taxType: 'intra' })}
                >
                  <span style={{ display: 'block', fontWeight: 700 }}>CGST + SGST</span>
                  <span style={{ fontSize: '10px', opacity: 0.85 }}>(Mandatory • Intra-State)</span>
                </button>
                <button
                  type="button"
                  style={{
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: taxType === 'inter' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: taxType === 'inter' ? '#eff6ff' : '#ffffff',
                    color: taxType === 'inter' ? '#1d4ed8' : '#64748b',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => updateCurrentBill({ taxType: 'inter' })}
                >
                  <span style={{ display: 'block', fontWeight: 700 }}>IGST</span>
                  <span style={{ fontSize: '10px', opacity: 0.85 }}>(Optional • Inter-State)</span>
                </button>
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
                  <span className="dossier-badge-pill">{invoiceNumber || '100'}</span>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: '#F5EAE4',
                    color: '#5C3A21',
                    border: '1px solid #E8D5C8',
                    letterSpacing: '0.02em'
                  }}>
                    ● {paymentMode || 'UPI'}
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

                  {taxType === 'inter' ? (
                    <div className="bill-dossier-calc-line">
                      <span className="bill-dossier-calc-label">IGST ({(Number(settings.cgstRate) || 9) + (Number(settings.sgstRate) || 9)}%):</span>
                      <span className="bill-dossier-calc-val">
                        +₹{(Number(totalGst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="bill-dossier-calc-line">
                        <span className="bill-dossier-calc-label">CGST ({Number(settings.cgstRate) || 9}%):</span>
                        <span className="bill-dossier-calc-val">
                          +₹{(cgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bill-dossier-calc-line">
                        <span className="bill-dossier-calc-label">SGST ({Number(settings.sgstRate) || 9}%):</span>
                        <span className="bill-dossier-calc-val">
                          +₹{(sgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
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
                      {PAYMENT_MODES.map((pm) => (
                        <option key={pm.value} value={pm.value}>
                          {pm.label}
                        </option>
                      ))}
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
                  handleSaveBill(false, true)
                  setBillDossierOpen(false)
                }}
              >
                🖨️ Save & Direct Print
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

      {/* Printable Invoice Modal: only displayed when user clicks View (eye icon) */}
      {invoiceModalOpen && (
        <div className="pos-modal-overlay" onClick={handleCloseInvoiceModal}>
          <div className="pos-invoice-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={settings.logoUrl || kwfLogo}
                  alt="Logo"
                  style={{ width: '38px', height: '38px', objectFit: 'contain', borderRadius: '4px', background: '#fff', padding: '2px' }}
                />
                <div className="pos-modal-header-info">
                  <h3>Kerala Wood Furniture — Tax Invoice</h3>
                  <p>Official Sivakasi Central Depot Tax Document</p>
                </div>
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

            {renderPrintableInvoiceSheet()}
          </div>
        </div>
      )}

      {/* Isolated Print Portal attached directly to document.body:
          guarantees 100% full-page, multi-page printing without clipping from #root or scroll containers */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div id="pos-print-isolated-portal" className="pos-print-isolated-portal" aria-hidden="true">
            {renderPrintableInvoiceSheet()}
          </div>,
          document.body
        )}
    </div>
  )
}
