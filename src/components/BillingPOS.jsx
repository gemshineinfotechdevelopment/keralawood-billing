import { useState, useEffect, useMemo, useRef } from 'react'
import { DataStore } from '../services/dataStore'
import kwfLogo from '../assets/kwf.jpg'
import { printInvoiceDocument, downloadInvoicePDF, numberToWordsINR, shareInvoiceOnWhatsApp } from '../utils/printInvoice'
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

  // Item description live autocomplete dropdown
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null)
  const itemDescDropdownRef = useRef(null)

  useEffect(() => {
    const handleItemDropdownClickOutside = (e) => {
      if (itemDescDropdownRef.current && !itemDescDropdownRef.current.contains(e.target)) {
        setActiveDropdownIndex(null)
      }
    }
    document.addEventListener('mousedown', handleItemDropdownClickOutside)
    document.addEventListener('touchstart', handleItemDropdownClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleItemDropdownClickOutside)
      document.removeEventListener('touchstart', handleItemDropdownClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target)) {
        setCustomerSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
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
          gstRate: 0,
          igstRate: 0,
          length: '',
          width: '',
          height: '',
          weight: '',
          woodSpecies: 'Teak',
          finish: 'Natural Beeswax',
        },
      ]

  // Payment status & modes
  const paymentStatus = currentBill.paymentStatus || 'Paid' // Default to 'Paid'
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

  // Manual GST (CGST + SGST) and IGST calculated per line item
  const totalGst = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const prc = Number(item.price) || 0
    const gstRate = Number(item.gstRate) || 0
    return sum + (qty * prc * gstRate) / 100
  }, 0)

  const totalIgst = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const prc = Number(item.price) || 0
    const igstRate = Number(item.igstRate) || 0
    return sum + (qty * prc * igstRate) / 100
  }, 0)

  const cgstAmount = totalGst / 2
  const sgstAmount = totalGst / 2
  const igstAmount = totalIgst

  const effectiveGstPct = itemsSubtotal > 0 && totalGst > 0
    ? Number(((totalGst / itemsSubtotal) * 100).toFixed(2))
    : (items.find((it) => Number(it.gstRate) > 0)?.gstRate ? Number(items.find((it) => Number(it.gstRate) > 0).gstRate) : 18)
  const halfGstPct = Number((effectiveGstPct / 2).toFixed(2))

  const grandTotal = Math.max(0, Math.round(itemsSubtotal + totalGst + totalIgst - discount))
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
      gstRate: 0,
      igstRate: 0,
      length: '',
      width: '',
      height: '',
      weight: '',
      woodSpecies: 'Teak',
      finish: 'Natural Beeswax',
    }
    updateCurrentBill({ items: [...items, newRow] })
  }

  // Live filter products in alphabetical order matching typed letter
  const getFilteredProducts = (query) => {
    if (!query || !query.trim()) return []
    const q = query.trim().toLowerCase()

    const matched = products.filter((p) => {
      const name = (p.name || '').toLowerCase()
      const sku = (p.sku || '').toLowerCase()
      return (
        name.startsWith(q) ||
        name.split(/\s+/).some((w) => w.startsWith(q)) ||
        sku.startsWith(q) ||
        name.includes(q)
      )
    })

    // Strict alphabetical order: products starting with typed letter come first
    return matched.sort((a, b) => {
      const aName = (a.name || '').toLowerCase()
      const bName = (b.name || '').toLowerCase()
      const aStarts = aName.startsWith(q)
      const bStarts = bName.startsWith(q)

      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1

      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
    })
  }

  // Handle selection from custom dropdown
  const handleSelectProduct = (index, prod) => {
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
      alert(`⚠️ "${prod.name}" is currently Out of Stock (0 units available).`)
      setPrintSuccessToast(`⚠️ "${prod.name}" is Out of Stock!`)
      setTimeout(() => setPrintSuccessToast(''), 3000)
      return
    }

    const updated = items.map((it, idx) => {
      if (idx === index) {
        return {
          ...it,
          productId: prod.id || prod._id,
          sku: prod.sku,
          name: prod.name,
          description: prod.name,
          price: Number(prod.sellingPrice || prod.unitPrice || prod.rawPrice || 0),
          gstRate: prod.gstRate !== undefined ? Number(prod.gstRate) : it.gstRate || 0,
          igstRate: prod.igstRate !== undefined ? Number(prod.igstRate) : it.igstRate || 0,
          length: prod.dimensions?.length || it.length || '',
          width: prod.dimensions?.width || it.width || '',
          height: prod.dimensions?.height || it.height || '',
          weight: prod.dimensions?.weight || it.weight || '',
          woodSpecies: prod.woodSpecies || it.woodSpecies || 'Teak',
          finish: prod.surfacePolish || prod.finish || it.finish || 'Natural Protective Beeswax',
        }
      }
      return it
    })
    updateCurrentBill({ items: updated })
    setActiveDropdownIndex(null)
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
      paymentStatus: 'Paid',
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
            gstRate: bill.gstRate !== undefined ? Number(bill.gstRate) : 0,
            igstRate: bill.igstRate !== undefined ? Number(bill.igstRate) : 0,
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

  const handleShareWhatsApp = async (billData) => {
    if (!billData) return
    setPrintSuccessToast('📱 Preparing WhatsApp bill & PDF...')
    try {
      const res = await shareInvoiceOnWhatsApp(billData, settings, kwfLogo)
      if (res?.success) {
        setPrintSuccessToast('✓ WhatsApp opened with bill details! PDF ready.')
      } else {
        setPrintSuccessToast('✓ WhatsApp opened with bill details!')
      }
    } catch {
      setPrintSuccessToast('✓ WhatsApp opened with bill details!')
    }
    setTimeout(() => setPrintSuccessToast(''), 3500)
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
        taxType: totalIgst > 0 && totalGst === 0 ? 'inter' : 'intra',
        totalGst,
        totalIgst,
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
    if (shipping.phone && shipping.phone.trim()) {
      const shipPhoneVal = validatePhone(shipping.phone, false)
      if (!shipPhoneVal.isValid) custErrs.shippingPhone = shipPhoneVal.error
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
      taxType: totalIgst > 0 && totalGst === 0 ? 'inter' : 'intra',
      totalGst,
      totalIgst,
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

      // Auto-download PDF on bill save per user requirement
      downloadInvoicePDF(billToRecord, settings, kwfLogo)

      if (directPrintAfter) {
        setPreviewBill(billToRecord)
        setInvoiceModalOpen(false)
        setPrintSuccessToast(`✓ Bill ${invoiceNumber} saved & PDF downloading! Opening print preview...`)
        setTimeout(() => {
          printInvoiceDocument(billToRecord, settings, kwfLogo)
          setTimeout(() => setPrintSuccessToast(''), 3000)
        }, 150)
        setViewMode('list')
      } else if (showModalAfter) {
        setPreviewBill(billToRecord)
        setInvoiceModalOpen(true)
      } else {
        setPrintSuccessToast(`✓ Bill ${invoiceNumber} saved & PDF downloaded!`)
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
          {(() => {
            const rawG = (typeof modalBillData.customer === 'object' && modalBillData.customer !== null ? modalBillData.customer.gstin : null) || modalBillData.customerGstin
            if (rawG && !String(rawG).toLowerCase().includes('unregistered') && !String(rawG).toLowerCase().includes('personal') && String(rawG).trim().length > 0) {
              return <p>GSTIN: {rawG}</p>
            }
            return null
          })()}
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
            <th style={{ width: '5%', textAlign: 'center' }}>#</th>
            <th style={{ width: '42%', textAlign: 'left' }}>Item Description</th>
            <th style={{ width: '13%', textAlign: 'center' }}>HSN/SAC</th>
            <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Rate (₹)</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {modalBillData.items.map((it, idx) => {
            const rowLine = (Number(it.quantity) || 1) * (Number(it.price) || 0)
            const hsn = it.hsn || it.hsnCode || settings.hsnCode || '4407'
            return (
              <tr key={it.id || idx}>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                <td>
                  <strong>{it.description || it.name || 'Timber Item'}</strong>
                </td>
                <td style={{ textAlign: 'center' }}>{hsn}</td>
                <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.quantity || 1}</td>
                <td style={{ textAlign: 'right' }}>₹{Number(it.price || 0).toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{rowLine.toLocaleString('en-IN')}</td>
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
          {(Number(modalBillData.totalGst) > 0 || Number(modalBillData.cgstAmount) > 0) && (() => {
            const gstVal = Number(modalBillData.totalGst) || ((Number(modalBillData.cgstAmount) || 0) * 2)
            const subVal = Number(modalBillData.itemsSubtotal) || 1
            const effectiveGst = Math.round((gstVal / subVal) * 100) || 18
            const halfPct = effectiveGst / 2
            const cgst = modalBillData.cgstAmount ?? (gstVal / 2)
            const sgst = modalBillData.sgstAmount ?? (gstVal / 2)
            return (
              <>
                <div className="pos-print-line">
                  <span>CGST ({halfPct}%):</span>
                  <span>+₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="pos-print-line">
                  <span>SGST ({halfPct}%):</span>
                  <span>+₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </>
            )
          })()}
          {(Number(modalBillData.totalIgst) > 0 || Number(modalBillData.igstAmount) > 0) && (
            <div className="pos-print-line">
              <span>IGST:</span>
              <span>+₹{(Number(modalBillData.totalIgst || modalBillData.igstAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                      <td colSpan="6" className="pos-bills-empty-cell">
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

                      return (
                        <tr key={bill.id || bill.invoice || idx} className="pos-bills-table-row">
                          <td className="pos-col-invoice">
                            <span className="pos-invoice-pill">{inv}</span>
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
                                className="btn-bill-action btn-bill-whatsapp"
                                onClick={() => handleShareWhatsApp(bill)}
                                title="Share on WhatsApp (Bill Details + PDF)"
                                aria-label="Share on WhatsApp"
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-1.107-.061-.252-.082-.578-.198-1.002-.382-1.782-.77-2.939-2.583-3.028-2.702-.089-.12-0.72-0.96-0.72-1.83 0-.87.458-1.299.621-1.474.163-.175.356-.219.474-.219.12 0 .239.002.344.007.11.005.258-.042.404.308.15.358.513 1.25.558 1.341.045.091.075.197.015.317-.06.12-.09.196-.179.3-.09.105-.189.233-.27.313-.09.088-.184.184-.079.364.105.18.468.772 1.004 1.25 0.69 0.614 1.272 0.804 1.452 0.894.18.09.285.075.39-.045.105-.12.45-0.525.57-.705.12-.18.24-.15.405-.09.165.06 1.05.495 1.23.585.18.09.3.135.345.21.045.075.045.435-.099.84z"/>
                                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.18L2 22l4.982-1.39A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.05c-1.68 0-3.24-.48-4.56-1.31l-.33-.21-2.96.83.84-2.88-.23-.37A8.04 8.04 0 1 1 12 20.05z"/>
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
                  type="tel"
                  maxLength={10}
                  className={`pos-input ${customerValidationErrors.phone ? 'kwf-input-error' : ''}`}
                  value={customer.phone || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    handleCustomerChange('phone', val)
                    if (customerValidationErrors.phone) setCustomerValidationErrors({ ...customerValidationErrors, phone: '' })
                  }}
                  placeholder="Phone (10 Digits starting with 6,7,8,9)"
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
                    type="tel"
                    maxLength={10}
                    className="pos-input"
                    value={shipping.phone || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                      handleShippingChange('phone', val)
                    }}
                    placeholder="Shipping Phone (10 Digits)"
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
                <button
                  type="button"
                  className="btn-pos-add-item"
                  onClick={handleAddBlankRow}
                  title="Add new item row"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ Add Item</span>
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
                <div className="pos-col-gst">GST (%)</div>
                <div className="pos-col-igst">IGST (%)</div>
                <div className="pos-col-total">TOTAL (₹)</div>
                <div className="pos-col-actions">ACTIONS</div>
              </div>

              <div className="pos-items-rows-container">
                {items.map((item, index) => {
                  const qty = Number(item.quantity) || 0
                  const prc = Number(item.price) || 0
                  const gstPct = Number(item.gstRate) || 0
                  const igstPct = Number(item.igstRate) || 0
                  const itemSub = qty * prc
                  const lineTotal = itemSub + (itemSub * (gstPct + igstPct)) / 100

                  return (
                    <div
                      key={item.id || index}
                      className="pos-item-row-block"
                      style={{ position: 'relative', zIndex: activeDropdownIndex === index ? 90 : 1 }}
                    >
                      <div className="pos-item-row-main">
                        {/* Number Badge */}
                        <div className="pos-col-idx">
                          <span className="pos-idx-badge">{index + 1}</span>
                        </div>

                        {/* Item Description */}
                        <div className="pos-col-desc" style={{ position: 'relative' }}>
                          <input
                            type="text"
                            id={`item-desc-${item.id || index}`}
                            className="pos-input pos-item-desc-input"
                            value={item.description || ''}
                            onChange={(e) => {
                              const val = e.target.value
                              handleItemChange(index, 'description', val)
                              if (val.trim()) {
                                setActiveDropdownIndex(index)
                              } else {
                                setActiveDropdownIndex(null)
                              }
                            }}
                            onFocus={() => {
                              if ((item.description || '').trim()) {
                                setActiveDropdownIndex(index)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setActiveDropdownIndex(null)
                              }
                            }}
                            placeholder="Enter item description or furniture name"
                            autoComplete="off"
                          />

                          {/* Custom Dropdown: shows only when user types, in A-Z alphabetical order */}
                          {activeDropdownIndex === index && (item.description || '').trim() && (() => {
                            const filtered = getFilteredProducts(item.description)
                            if (filtered.length === 0) return null
                            return (
                              <div
                                ref={itemDescDropdownRef}
                                className="pos-item-desc-dropdown"
                              >
                                {filtered.map((p) => {
                                  const stock = Number(
                                    p.stockQuantity !== undefined
                                      ? p.stockQuantity
                                      : p.stock !== undefined
                                      ? p.stock
                                      : p.quantity !== undefined
                                      ? p.quantity
                                      : 0
                                  )
                                  const isOutOfStock = !isNaN(stock) && stock <= 0
                                  return (
                                    <div
                                      key={p.id || p.sku}
                                      className={`pos-item-desc-option ${isOutOfStock ? 'out-of-stock' : ''}`}
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        handleSelectProduct(index, p)
                                      }}
                                    >
                                      <div className="pos-option-left">
                                        <span className="pos-option-name">{p.name}</span>
                                        <span className="pos-option-sku">
                                          {p.sku} {p.woodSpecies ? `• ${p.woodSpecies}` : ''}
                                        </span>
                                      </div>
                                      <div className="pos-option-right">
                                        <span className="pos-option-price">
                                          ₹{Number(p.sellingPrice || p.unitPrice || 0).toLocaleString('en-IN')}
                                        </span>
                                        <span className={`pos-option-stock ${isOutOfStock ? 'stock-empty' : ''}`}>
                                          {isOutOfStock ? '⚠️ Out of Stock' : `${stock} in stock`}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          })()}
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

                        {/* Manual GST (%) Column */}
                        <div className="pos-col-gst">
                          <div className="pos-tax-col-wrap">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              className="pos-input pos-item-tax-input"
                              value={item.gstRate !== undefined ? item.gstRate : ''}
                              onChange={(e) => handleItemChange(index, 'gstRate', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                              placeholder="0"
                              title="Enter GST % (e.g. 18, 12, 5)"
                            />
                            <span className="pos-tax-pct-symbol">%</span>
                          </div>
                        </div>

                        {/* Manual IGST (%) Column */}
                        <div className="pos-col-igst">
                          <div className="pos-tax-col-wrap">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="any"
                              className="pos-input pos-item-tax-input"
                              value={item.igstRate !== undefined ? item.igstRate : ''}
                              onChange={(e) => handleItemChange(index, 'igstRate', e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                              placeholder="0"
                              title="Enter IGST % (e.g. 18, 12, 5)"
                            />
                            <span className="pos-tax-pct-symbol">%</span>
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
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Bottom Add Line Item Bar */}
            <div className="pos-items-bottom-bar">
              <button
                type="button"
                className="btn-pos-add-item-bottom"
                onClick={handleAddBlankRow}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ Add Item</span>
              </button>
            </div>
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

          {/* Discount & GST Tax Options */}
          <div className="pos-card pos-additional-options-card">
            <div className="pos-card-header-clean" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px' }}>🏷️</span>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, margin: 0, color: '#31190B', letterSpacing: '-0.01em' }}>
                Discounts & GST Tax Mode
              </h3>
            </div>
            <div className="pos-additional-grid" style={{ gridTemplateColumns: '1fr' }}>
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

                  {totalGst > 0 && (
                    <>
                      <div className="bill-dossier-calc-line">
                        <span className="bill-dossier-calc-label">CGST ({halfGstPct}%):</span>
                        <span className="bill-dossier-calc-val">
                          +₹{(cgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bill-dossier-calc-line">
                        <span className="bill-dossier-calc-label">SGST ({halfGstPct}%):</span>
                        <span className="bill-dossier-calc-val">
                          +₹{(sgstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}

                  {totalIgst > 0 && (
                    <div className="bill-dossier-calc-line">
                      <span className="bill-dossier-calc-label">IGST (Inter-State):</span>
                      <span className="bill-dossier-calc-val">
                        +₹{(igstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                className="pos-btn-share-whatsapp"
                style={{ justifyContent: 'center' }}
                onClick={() => {
                  handleShareWhatsApp(modalBillData)
                }}
                title="Share Current Bill & PDF on WhatsApp"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-1.107-.061-.252-.082-.578-.198-1.002-.382-1.782-.77-2.939-2.583-3.028-2.702-.089-.12-0.72-0.96-0.72-1.83 0-.87.458-1.299.621-1.474.163-.175.356-.219.474-.219.12 0 .239.002.344.007.11.005.258-.042.404.308.15.358.513 1.25.558 1.341.045.091.075.197.015.317-.06.12-.09.196-.179.3-.09.105-.189.233-.27.313-.09.088-.184.184-.079.364.105.18.468.772 1.004 1.25 0.69 0.614 1.272 0.804 1.452 0.894.18.09.285.075.39-.045.105-.12.45-0.525.57-.705.12-.18.24-.15.405-.09.165.06 1.05.495 1.23.585.18.09.3.135.345.21.045.075.045.435-.099.84z"/>
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.18L2 22l4.982-1.39A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.05c-1.68 0-3.24-.48-4.56-1.31l-.33-.21-2.96.83.84-2.88-.23-.37A8.04 8.04 0 1 1 12 20.05z"/>
                </svg>
                <span>Share on WhatsApp</span>
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
                  <h3>{settings.depotName || 'Timber & Wood'} — Tax Invoice</h3>
                  <p>{settings.address || 'Central Depot & Mill Yard'}</p>
                </div>
              </div>
              <div className="pos-modal-header-actions">
                <button
                  type="button"
                  className="pos-btn-share-whatsapp"
                  onClick={() => handleShareWhatsApp(modalBillData)}
                  title="Share Bill & PDF on WhatsApp"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.586-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.073-1.107-.061-.252-.082-.578-.198-1.002-.382-1.782-.77-2.939-2.583-3.028-2.702-.089-.12-0.72-0.96-0.72-1.83 0-.87.458-1.299.621-1.474.163-.175.356-.219.474-.219.12 0 .239.002.344.007.11.005.258-.042.404.308.15.358.513 1.25.558 1.341.045.091.075.197.015.317-.06.12-.09.196-.179.3-.09.105-.189.233-.27.313-.09.088-.184.184-.079.364.105.18.468.772 1.004 1.25 0.69 0.614 1.272 0.804 1.452 0.894.18.09.285.075.39-.045.105-.12.45-0.525.57-.705.12-.18.24-.15.405-.09.165.06 1.05.495 1.23.585.18.09.3.135.345.21.045.075.045.435-.099.84z"/>
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.18L2 22l4.982-1.39A9.957 9.957 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.05c-1.68 0-3.24-.48-4.56-1.31l-.33-.21-2.96.83.84-2.88-.23-.37A8.04 8.04 0 1 1 12 20.05z"/>
                  </svg>
                  <span>Share on WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="pos-btn-download-pdf"
                  onClick={() => downloadInvoicePDF(modalBillData, settings, kwfLogo)}
                  title="Download Tax Invoice as PDF"
                >
                  📥 Download PDF
                </button>
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
    </div>
  )
}
