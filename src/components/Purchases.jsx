import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import { validateRequired, validatePhone, validatePositiveNumber } from '../utils/validators'
import './Purchases.css'

const createEmptyItem = () => ({
  id: Date.now() + Math.random(),
  name: '',
  category: 'Timber Logs',
  quantity: 1,
  rate: '',
  gstRate: 18,
  gstAmount: 0,
  total: 0,
})

export default function Purchases() {
  const [purchases, setPurchases] = useState(() => DataStore.getPurchases())
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentModeFilter, setPaymentModeFilter] = useState('all')

  // View state: 'list' | 'form'
  const [viewMode, setViewMode] = useState('list')
  const [editingPurchase, setEditingPurchase] = useState(null)
  const [viewDossierPurchase, setViewDossierPurchase] = useState(null)
  const [deleteModalPurchase, setDeleteModalPurchase] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [formErrors, setFormErrors] = useState({})

  // Form State
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'Bank Wire',
    // FROM Side (Supplier)
    supplier: '',
    supplierAddress: '',
    supplierGstin: '',
    supplierPhone: '',
    // TO Side (Buyer / Company)
    companyName: '',
    companyAddress: '',
    companyGstin: '',
    companyPhone: '',
    // Items
    itemsList: [createEmptyItem()],
    notes: '',
  })

  // Sync on store update
  useEffect(() => {
    const handleUpdate = () => {
      setPurchases(DataStore.getPurchases())
    }
    window.addEventListener('timber_store_updated', handleUpdate)
    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
        (p.supplier && p.supplier.toLowerCase().includes(q)) ||
        (p.item && p.item.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))

      const matchMode =
        paymentModeFilter === 'all' ||
        (p.paymentMode && p.paymentMode.toLowerCase() === paymentModeFilter.toLowerCase())

      return matchSearch && matchMode
    })
  }, [purchases, searchQuery, paymentModeFilter])

  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage)
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const paginatedPurchases = totalPages > 0 ? filteredPurchases.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage) : []

  // KPIs
  const totalSpend = useMemo(() => {
    return purchases.reduce((acc, p) => acc + (Number(p.amount) || 0) + (Number(p.gstAmount) || 0), 0)
  }, [purchases])

  const uniqueSuppliers = useMemo(() => {
    const set = new Set(purchases.map((p) => p.supplier).filter(Boolean))
    return set.size
  }, [purchases])

  const totalPurchases = purchases.length

  const { primaryMode, primaryModeCount } = useMemo(() => {
    if (purchases.length === 0) return { primaryMode: '-', primaryModeCount: 0 }
    const counts = purchases.reduce((acc, p) => {
      const mode = p.paymentMode || 'Bank Wire'
      acc[mode] = (acc[mode] || 0) + 1
      return acc
    }, {})
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return {
      primaryMode: sorted[0] ? sorted[0][0] : '-',
      primaryModeCount: sorted[0] ? sorted[0][1] : 0,
    }
  }, [purchases])

  // Calculation helpers for Form
  const formSubtotal = useMemo(() => {
    return (formData.itemsList || []).reduce((acc, it) => {
      const qty = Number(it.quantity) || 0
      const rate = Number(it.rate) || 0
      return acc + (qty * rate)
    }, 0)
  }, [formData.itemsList])

  const formGstTotal = useMemo(() => {
    return (formData.itemsList || []).reduce((acc, it) => {
      return acc + (Number(it.gstAmount) || 0)
    }, 0)
  }, [formData.itemsList])

  const formGrandTotal = useMemo(() => {
    return Math.round((formSubtotal + formGstTotal) * 100) / 100
  }, [formSubtotal, formGstTotal])

  // Handlers for Add / Edit
  const handleOpenAdd = () => {
    const settings = DataStore.getSettings()
    setEditingPurchase(null)
    setFormData({
      invoiceNumber: DataStore.getNextPurchaseNumber(),
      date: new Date().toISOString().split('T')[0],
      paymentMode: 'Bank Wire',
      // Left FROM (Supplier)
      supplier: '',
      supplierAddress: '',
      supplierGstin: '',
      supplierPhone: '',
      // Right TO (Buyer)
      companyName: settings.depotName || 'Kerala Wood Furniture',
      companyAddress: settings.address || 'Sivakasi Central Depot & Mill Yard, Sivakasi',
      companyGstin: settings.gstin || '32AABCP9821K1ZK',
      companyPhone: settings.contactPhone || '+91 484 289 1204',
      // Items
      itemsList: [createEmptyItem()],
      notes: '',
    })
    setFormErrors({})
    setViewMode('form')
  }

  const handleOpenEdit = (p) => {
    const settings = DataStore.getSettings()
    setEditingPurchase(p)
    const rawInv = String(p.invoiceNumber || p.id || '')
    const digitsOnly = rawInv.replace(/\D/g, '')

    let loadedItems = []
    if (Array.isArray(p.itemsList) && p.itemsList.length > 0) {
      loadedItems = p.itemsList.map((it, idx) => ({
        id: it.id || idx + 1,
        name: it.name || it.item || '',
        category: it.category || 'Timber Logs',
        quantity: it.quantity !== undefined ? it.quantity : 1,
        rate: it.rate !== undefined ? it.rate : (it.amount || 0),
        gstRate: it.gstRate !== undefined ? it.gstRate : (it.gstPercent || 18),
        gstAmount: it.gstAmount !== undefined ? it.gstAmount : 0,
        total: it.total !== undefined ? it.total : 0,
      }))
    } else {
      const qty = Number(p.quantity) || 1
      const amt = Number(p.amount) || 0
      const gst = Number(p.gstAmount) || 0
      const rate = amt && qty ? Math.round((amt / qty) * 100) / 100 : amt
      const gstPct = amt > 0 ? Math.round((gst / amt) * 100) : 18
      loadedItems = [
        {
          id: 1,
          name: p.item || 'Timber Materials',
          category: p.category || 'Timber Logs',
          quantity: qty,
          rate: rate,
          gstRate: gstPct,
          gstAmount: gst,
          total: amt + gst,
        },
      ]
    }

    setFormData({
      invoiceNumber: digitsOnly || rawInv || DataStore.getNextPurchaseNumber(),
      date: p.date || new Date().toISOString().split('T')[0],
      paymentMode: p.paymentMode || 'Bank Wire',
      // FROM (Supplier)
      supplier: p.supplier || '',
      supplierAddress: p.supplierAddress || '',
      supplierGstin: p.supplierGstin || '',
      supplierPhone: p.supplierPhone || '',
      // TO (Company)
      companyName: p.companyName || settings.depotName || 'Kerala Wood Furniture',
      companyAddress: p.companyAddress || settings.address || 'Sivakasi Central Depot & Mill Yard, Sivakasi',
      companyGstin: p.companyGstin || settings.gstin || '32AABCP9821K1ZK',
      companyPhone: p.companyPhone || settings.contactPhone || '+91 484 289 1204',
      // Items
      itemsList: loadedItems,
      notes: p.notes || '',
    })
    setFormErrors({})
    setViewMode('form')
  }

  // Row item actions
  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const nextItems = [...prev.itemsList]
      const row = { ...nextItems[index], [field]: value }

      const qty = Number(row.quantity) || 0
      const rate = Number(row.rate) || 0
      const lineBase = Math.round(qty * rate * 100) / 100
      const gstPct = Number(row.gstRate) || 0
      const gstAmt = Math.round(lineBase * (gstPct / 100) * 100) / 100
      const lineTotal = Math.round((lineBase + gstAmt) * 100) / 100

      row.gstAmount = gstAmt
      row.total = lineTotal
      nextItems[index] = row

      return { ...prev, itemsList: nextItems }
    })
  }

  const handleAddItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      itemsList: [...prev.itemsList, createEmptyItem()],
    }))
  }

  const handleRemoveItemRow = (index) => {
    if (formData.itemsList.length <= 1) {
      showToast('⚠️ At least one line item is required')
      return
    }
    setFormData((prev) => ({
      ...prev,
      itemsList: prev.itemsList.filter((_, idx) => idx !== index),
    }))
  }

  const handleSavePurchase = (e) => {
    e.preventDefault()

    // 1. Validate Supplier
    const supplierVal = validateRequired(formData.supplier, 'Supplier Name', 2)
    const phoneVal = validatePhone(formData.supplierPhone, false)

    const errs = {}
    if (!supplierVal.isValid) errs.supplier = supplierVal.error
    if (!phoneVal.isValid) errs.supplierPhone = phoneVal.error

    // 2. Validate Items
    if (!formData.itemsList || formData.itemsList.length === 0) {
      errs.items = 'Please add at least one line item'
    } else {
      let hasValidItem = false
      formData.itemsList.forEach((it, idx) => {
        if (!it.name || !it.name.trim()) {
          errs[`item_${idx}_name`] = 'Item name is required'
        } else {
          hasValidItem = true
        }
        if (!it.rate || Number(it.rate) <= 0) {
          errs[`item_${idx}_rate`] = 'Rate must be > 0'
        }
      })
      if (!hasValidItem) {
        errs.items = 'Please specify at least one valid item name'
      }
    }

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      showToast('⚠️ Please correct the highlighted billing fields')
      return
    }
    setFormErrors({})

    const cleanInvoiceNumber =
      String(formData.invoiceNumber).trim().replace(/\D/g, '') || DataStore.getNextPurchaseNumber()
    const cleanPhone = phoneVal.clean ? `+91 ${phoneVal.clean}` : formData.supplierPhone.trim()

    // Summaries for backward compatibility and quick ledger view
    const itemSummary = formData.itemsList
      .map((it) => it.name.trim())
      .filter(Boolean)
      .join(', ') || 'Timber Purchase'
    const totalQty = formData.itemsList.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
    const primaryCategory = formData.itemsList[0]?.category || 'Timber Logs'

    const payload = {
      ...formData,
      invoiceNumber: cleanInvoiceNumber,
      supplier: formData.supplier.trim(),
      supplierAddress: formData.supplierAddress.trim(),
      supplierGstin: formData.supplierGstin.trim().toUpperCase(),
      supplierPhone: cleanPhone,
      companyName: formData.companyName.trim(),
      companyAddress: formData.companyAddress.trim(),
      companyGstin: formData.companyGstin.trim().toUpperCase(),
      companyPhone: formData.companyPhone.trim(),
      item: itemSummary,
      category: primaryCategory,
      quantity: String(totalQty),
      subtotal: formSubtotal,
      amount: formSubtotal,
      gstAmount: formGstTotal,
      total: formGrandTotal,
      itemsList: formData.itemsList,
    }

    if (editingPurchase) {
      DataStore.updatePurchase({ ...editingPurchase, ...payload })
      showToast(`✓ Updated purchase bill #${payload.invoiceNumber}`)
    } else {
      DataStore.addPurchase(payload)
      showToast(`✓ Recorded new purchase bill #${payload.invoiceNumber}`)
    }

    setViewMode('list')
  }

  const handleDelete = () => {
    if (!deleteModalPurchase) return
    DataStore.deletePurchase(deleteModalPurchase.id)
    showToast(`✓ Removed purchase bill #${deleteModalPurchase.invoiceNumber}`)
    setDeleteModalPurchase(null)
  }

  // =========================================================================
  // VIEW MODE: BILLING PAGE (Full Form)
  // =========================================================================
  if (viewMode === 'form') {
    return (
      <div className="purchases-page-container purchases-billing-container">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="purchases-toast-banner">
            {toastMessage}
          </div>
        )}

        {/* Topbar with Back button and Actions */}
        <div className="purchases-billing-topbar">
          <button
            type="button"
            className="btn-purchases-back-link"
            onClick={() => setViewMode('list')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Purchases</span>
          </button>

          <div className="purchases-billing-top-actions">
            <button
              type="button"
              className="btn-purchases-cancel"
              onClick={() => setViewMode('list')}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="purchase-billing-form"
              className="btn-purchases-submit-primary"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{editingPurchase ? 'Update Purchase Bill' : 'Save Purchase Bill'}</span>
            </button>
          </div>
        </div>

        {/* Main Billing Sheet */}
        <form id="purchase-billing-form" onSubmit={handleSavePurchase} className="purchase-bill-sheet">
          {/* Top Sheet Header: Bill Title + Purchase Number Box + Date + Payment Mode */}
          <div className="purchase-bill-header-row">
            <div className="purchase-bill-title-block">
              <span className="purchase-bill-badge">INWARD PROCUREMENT</span>
              <h1 className="purchase-bill-main-title">
                {editingPurchase ? `Edit Purchase Bill #${formData.invoiceNumber}` : 'Purchase Bill'}
              </h1>
              <p className="purchase-bill-subtitle">
                Inward timber procurement invoice & supplier tax credit entry
              </p>
            </div>

            <div className="purchase-bill-meta-box">
              <div className="purchase-meta-field">
                <label className="purchase-meta-label">Purchase Number *</label>
                <div className="purchase-num-input-wrap">
                  <span className="purchase-num-prefix">#</span>
                  <input
                    type="text"
                    className="purchase-num-input"
                    value={formData.invoiceNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, invoiceNumber: e.target.value.replace(/\D/g, '') })
                    }
                    placeholder="100"
                    required
                  />
                </div>
                <span className="purchase-meta-hint">Numeric only (e.g. 100, 101)</span>
              </div>

              <div className="purchase-meta-field">
                <label className="purchase-meta-label">Purchase Date *</label>
                <input
                  type="date"
                  className="purchases-input purchase-meta-date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="purchase-meta-field">
                <label className="purchase-meta-label">Payment Mode *</label>
                <select
                  className="purchases-select purchase-meta-select"
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                >
                  <option value="Bank Wire">Bank Wire / NEFT / RTGS</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="Cash">Cash Settlement</option>
                  <option value="Cheque">Commercial Cheque</option>
                </select>
              </div>
            </div>
          </div>

          {/* Party Details Section: Left side (FROM - Supplier) | Right side (TO - Company) */}
          <div className="purchase-parties-grid">
            {/* LEFT SIDE: FROM (Supplier Details) */}
            <div className="purchase-party-card purchase-party-from">
              <div className="purchase-party-header">
                <div className="purchase-party-tag from-tag">FROM (SUPPLIER DETAILS)</div>
                <span className="purchase-party-role-text">Vendor / Timber Mill / Seller</span>
              </div>

              <div className="purchase-party-body">
                <div className="purchases-input-group">
                  <label className="purchases-label">Supplier / Mill Name *</label>
                  <input
                    type="text"
                    className={`purchases-input ${formErrors.supplier ? 'kwf-input-error' : ''}`}
                    value={formData.supplier}
                    onChange={(e) => {
                      setFormData({ ...formData, supplier: e.target.value })
                      if (formErrors.supplier) setFormErrors({ ...formErrors, supplier: '' })
                    }}
                    placeholder="e.g. Nilambur Forest Timber Syndicate"
                    required
                  />
                  {formErrors.supplier && <span className="kwf-field-error">{formErrors.supplier}</span>}
                </div>

                <div className="purchases-input-group">
                  <label className="purchases-label">Supplier Address</label>
                  <textarea
                    rows="2"
                    className="purchases-textarea party-textarea"
                    value={formData.supplierAddress}
                    onChange={(e) => setFormData({ ...formData, supplierAddress: e.target.value })}
                    placeholder="e.g. Mill Yard #4, Forest Range Road, Nilambur, Malappuram, Kerala - 679329"
                  />
                </div>

                <div className="purchase-party-subgrid">
                  <div className="purchases-input-group">
                    <label className="purchases-label">Supplier GSTIN</label>
                    <input
                      type="text"
                      maxLength={15}
                      className="purchases-input purchases-uppercase-input"
                      value={formData.supplierGstin}
                      onChange={(e) =>
                        setFormData({ ...formData, supplierGstin: e.target.value.toUpperCase().trim() })
                      }
                      placeholder="e.g. 32AABCN1234F1ZQ"
                    />
                  </div>

                  <div className="purchases-input-group">
                    <label className="purchases-label">Supplier Phone</label>
                    <input
                      type="text"
                      className={`purchases-input ${formErrors.supplierPhone ? 'kwf-input-error' : ''}`}
                      value={formData.supplierPhone}
                      onChange={(e) => {
                        setFormData({ ...formData, supplierPhone: e.target.value })
                        if (formErrors.supplierPhone) setFormErrors({ ...formErrors, supplierPhone: '' })
                      }}
                      placeholder="94471 28910"
                    />
                    {formErrors.supplierPhone && (
                      <span className="kwf-field-error">{formErrors.supplierPhone}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: TO (Company / Buyer Details) */}
            <div className="purchase-party-card purchase-party-to">
              <div className="purchase-party-header">
                <div className="purchase-party-tag to-tag">TO (BUYER / COMPANY)</div>
                <span className="purchase-party-role-text">Inward Depot & Mill Recipient</span>
              </div>

              <div className="purchase-party-body">
                <div className="purchases-input-group">
                  <label className="purchases-label">Company Name *</label>
                  <input
                    type="text"
                    className="purchases-input"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Kerala Wood Furniture - Sivakasi Depot"
                    required
                  />
                </div>

                <div className="purchases-input-group">
                  <label className="purchases-label">Depot Delivery Address</label>
                  <textarea
                    rows="2"
                    className="purchases-textarea party-textarea"
                    value={formData.companyAddress}
                    onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                    placeholder="Sivakasi Central Depot & Mill Yard, Sivakasi"
                  />
                </div>

                <div className="purchase-party-subgrid">
                  <div className="purchases-input-group">
                    <label className="purchases-label">Company GSTIN</label>
                    <input
                      type="text"
                      maxLength={15}
                      className="purchases-input purchases-uppercase-input"
                      value={formData.companyGstin}
                      onChange={(e) =>
                        setFormData({ ...formData, companyGstin: e.target.value.toUpperCase().trim() })
                      }
                      placeholder="32AABCP9821K1ZK"
                    />
                  </div>

                  <div className="purchases-input-group">
                    <label className="purchases-label">Depot Contact Phone</label>
                    <input
                      type="text"
                      className="purchases-input"
                      value={formData.companyPhone}
                      onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                      placeholder="+91 484 289 1204"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table Section */}
          <div className="purchase-items-section">
            <div className="purchase-items-section-header">
              <div className="purchase-items-title-wrap">
                <h3 className="purchase-items-section-title">Itemized Purchase Particulars</h3>
                <span className="purchase-items-count">
                  {formData.itemsList.length} line item{formData.itemsList.length === 1 ? '' : 's'}
                </span>
              </div>
              <button
                type="button"
                className="btn-add-item-row"
                onClick={handleAddItemRow}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add Item</span>
              </button>
            </div>

            {formErrors.items && (
              <div className="purchase-items-error-banner">{formErrors.items}</div>
            )}

            <div className="purchase-items-table-wrapper">
              <table className="purchase-items-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    <th style={{ minWidth: '240px' }}>ITEM NAME / DESCRIPTION *</th>
                    <th style={{ width: '170px' }}>WOOD CATEGORY</th>
                    <th style={{ width: '100px', textAlign: 'right' }}>QUANTITY *</th>
                    <th style={{ width: '130px', textAlign: 'right' }}>AMOUNT / RATE (₹) *</th>
                    <th style={{ width: '95px', textAlign: 'center' }}>GST (%)</th>
                    <th style={{ width: '120px', textAlign: 'right' }}>GST (₹)</th>
                    <th style={{ width: '140px', textAlign: 'right' }}>TOTAL (₹)</th>
                    <th style={{ width: '48px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.itemsList.map((row, idx) => (
                    <tr key={row.id || idx}>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#8A7B72' }}>
                        {idx + 1}
                      </td>
                      <td>
                        <input
                          type="text"
                          className={`purchase-table-input ${formErrors[`item_${idx}_name`] ? 'kwf-input-error' : ''}`}
                          value={row.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="e.g. Grade-A Nilambur Teak Planks (6x4)"
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="purchase-table-select"
                          value={row.category}
                          onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                        >
                          <option value="Timber Logs">Timber Logs</option>
                          <option value="Hardwood Timber">Hardwood Timber</option>
                          <option value="Structural Lumber">Structural Lumber</option>
                          <option value="Sawn Wood">Sawn Wood</option>
                          <option value="Hardware & Finishes">Hardware & Finishes</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="purchase-table-input"
                          style={{ textAlign: 'right' }}
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', Math.max(1, Number(e.target.value) || 1))}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className={`purchase-table-input ${formErrors[`item_${idx}_rate`] ? 'kwf-input-error' : ''}`}
                          style={{ textAlign: 'right' }}
                          value={row.rate}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </td>
                      <td>
                        <select
                          className="purchase-table-select"
                          style={{ textAlign: 'center' }}
                          value={row.gstRate}
                          onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#6A564A' }}>
                        ₹{Number(row.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#31190B' }}>
                        ₹{Number(row.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-remove-row"
                          onClick={() => handleRemoveItemRow(idx)}
                          title="Remove item row"
                          disabled={formData.itemsList.length <= 1}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="purchase-items-bottom-bar">
              <button
                type="button"
                className="btn-add-item-dashed"
                onClick={handleAddItemRow}
              >
                + Add Another Wood Product / Line Item
              </button>
            </div>
          </div>

          {/* Bottom Billing Grid: Remarks & Notes (Left) | Financial Calculations (Right) */}
          <div className="purchase-bottom-grid">
            <div className="purchase-notes-card">
              <label className="purchases-label">Procurement Remarks / Lorry & Mill Notes</label>
              <textarea
                className="purchases-textarea"
                rows="4"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add lorry receipt (LR) #, delivery vehicle number, saw mill lot code, timber grading notes..."
              />
              <span className="purchases-helper-text">
                Recorded on purchase ledger for inward stock auditing and GST input tax credit (ITC).
              </span>
            </div>

            <div className="purchase-financials-card">
              <div className="purchase-summary-row">
                <span className="purchase-summary-label">Subtotal (Taxable Amount):</span>
                <span className="purchase-summary-val">
                  ₹{formSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="purchase-summary-row">
                <span className="purchase-summary-label">GST Tax Outflow:</span>
                <span className="purchase-summary-val" style={{ color: '#8C5325' }}>
                  +₹{formGstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {formGstTotal > 0 && (
                <div className="purchase-summary-tax-split">
                  <span>CGST (50%): ₹{(formGstTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span>SGST (50%): ₹{(formGstTotal / 2).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="purchase-summary-grand-total">
                <div className="purchase-grand-label-wrap">
                  <span className="purchase-grand-title">GRAND TOTAL</span>
                  <span className="purchase-grand-sub">Total Purchase Outflow (INR)</span>
                </div>
                <div className="purchase-grand-amount">
                  ₹{formGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Form Bottom Actions */}
          <div className="purchase-sheet-bottom-actions">
            <button
              type="button"
              className="btn-purchases-cancel"
              onClick={() => setViewMode('list')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-purchases-submit-primary"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              <span>{editingPurchase ? 'Update Purchase Bill' : 'Save Purchase Bill'}</span>
            </button>
          </div>
        </form>
      </div>
    )
  }

  // =========================================================================
  // VIEW MODE: PURCHASES LEDGER (List View)
  // =========================================================================
  return (
    <div className="purchases-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="purchases-toast-banner">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="purchases-header">
        <div className="purchases-title-col">
          <h1 className="purchases-main-title">Purchases & Inward Cargo</h1>
          <p className="purchases-main-subtitle">
            Log inward raw timber, sawmill shipments, supplier procurement & vendor clearance
          </p>
        </div>
        <div className="purchases-header-actions">
          <button type="button" className="btn-purchases-print" onClick={() => window.print()} title="Print Purchases Ledger">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print Ledger</span>
          </button>
          <button type="button" className="btn-new-purchase-primary" onClick={handleOpenAdd}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Record Purchase</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="purchases-kpi-grid">
        <div className="purchases-kpi-card">
          <div className="purchases-kpi-left">
            <span className="purchases-kpi-label">TOTAL PURCHASES</span>
            <div className="purchases-kpi-value">₹{totalSpend.toLocaleString('en-IN')}</div>
            <span className="purchases-kpi-sub">Total inward timber procurement</span>
          </div>
          <div className="purchases-kpi-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
        </div>

        <div className="purchases-kpi-card">
          <div className="purchases-kpi-left">
            <span className="purchases-kpi-label">SUPPLIERS</span>
            <div className="purchases-kpi-value">{uniqueSuppliers}</div>
            <span className="purchases-kpi-sub">Active forest mills & depots</span>
          </div>
          <div className="purchases-kpi-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>

        <div className="purchases-kpi-card">
          <div className="purchases-kpi-left">
            <span className="purchases-kpi-label">INWARD PURCHASES</span>
            <div className="purchases-kpi-value">{totalPurchases}</div>
            <span className="purchases-kpi-sub">Recorded purchase bills</span>
          </div>
          <div className="purchases-kpi-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
        </div>

        <div className="purchases-kpi-card">
          <div className="purchases-kpi-left">
            <span className="purchases-kpi-label">PRIMARY MODE</span>
            <div className="purchases-kpi-value" style={{ fontSize: '18px' }}>{primaryMode}</div>
            <span className="purchases-kpi-sub">
              {purchases.length > 0 ? `${primaryModeCount} purchase${primaryModeCount === 1 ? '' : 's'} recorded` : 'No purchase records'}
            </span>
          </div>
          <div className="purchases-kpi-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="purchases-controls-bar">
        <div className="purchases-search-wrap">
          <span className="purchases-search-icon">🔍</span>
          <input
            type="text"
            className="purchases-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by purchase #, supplier, or wood..."
          />
        </div>

        <div className="purchases-filter-group">
          <label style={{ fontSize: '12px', fontWeight: 700, color: '#5C4537' }}>Payment Mode:</label>
          <select
            className="purchases-select-filter"
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
          >
            <option value="all">All Payment Modes</option>
            <option value="UPI">UPI</option>
            <option value="Bank Wire">Bank Wire / NEFT</option>
            <option value="Cash">Cash</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="purchases-table-card">
        <div className="purchases-table-wrapper">
          <table className="purchases-table">
            <thead>
              <tr>
                <th>PURCHASE # / DATE</th>
                <th>SUPPLIER / MILL</th>
                <th>MATERIAL & WOOD SPECIES</th>
                <th>QUANTITY</th>
                <th>PURCHASE AMOUNT</th>
                <th>PAYMENT MODE</th>
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px 16px', color: '#8A7B72' }}>
                    <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>📦</div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#2C1810', marginBottom: '4px' }}>
                      {searchQuery ? `No purchases found matching "${searchQuery}"` : 'No purchase bills recorded yet'}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Click &quot;+ Record Purchase&quot; above to log your first timber purchase bill.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="purchases-invoice-no">#{p.invoiceNumber || p.id}</div>
                      <div className="purchases-invoice-date">{p.date}</div>
                    </td>
                    <td>
                      <div className="purchases-supplier-name">{p.supplier}</div>
                      {p.supplierPhone && <div className="purchases-supplier-phone">{p.supplierPhone}</div>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.item}</div>
                      <div style={{ fontSize: '11px', color: '#8A7B72' }}>{p.category}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{p.quantity || '-'}</span>
                    </td>
                    <td>
                      <div className="purchases-amt-val">
                        ₹{Number(p.total || ((Number(p.amount) || 0) + (Number(p.gstAmount) || 0))).toLocaleString('en-IN')}
                      </div>
                      {p.gstAmount > 0 && (
                        <div style={{ fontSize: '10.5px', color: '#7D6C63' }}>
                          incl. ₹{Number(p.gstAmount).toLocaleString('en-IN')} GST
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="purchases-payment-mode-pill">
                        {p.paymentMode || 'Bank Wire'}
                      </span>
                    </td>
                    <td>
                      <div className="purchases-actions-cell">
                        {/* 1. Edit Button */}
                        <button
                          type="button"
                          className="btn-purchase-action btn-purchase-edit"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Purchase Bill"
                          aria-label="Edit"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {/* 2. View Button */}
                        <button
                          type="button"
                          className="btn-purchase-action btn-purchase-view"
                          onClick={() => setViewDossierPurchase(p)}
                          title="View Purchase Bill Details"
                          aria-label="View"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>

                        {/* 3. Delete Button */}
                        <button
                          type="button"
                          className="btn-purchase-action btn-purchase-delete"
                          onClick={() => setDeleteModalPurchase(p)}
                          title="Delete Purchase Bill"
                          aria-label="Delete"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="patron-table-footer">
          <div className="patron-footer-left">
            <span className="showing-records-text">
              Showing <strong>{filteredPurchases.length > 0 ? (
                (safePage - 1) * itemsPerPage + 1 === Math.min(safePage * itemsPerPage, filteredPurchases.length)
                  ? `${(safePage - 1) * itemsPerPage + 1}`
                  : `${(safePage - 1) * itemsPerPage + 1}-${Math.min(safePage * itemsPerPage, filteredPurchases.length)}`
              ) : '0'}</strong> of {filteredPurchases.length} purchases
            </span>
            <div className="patron-per-page-wrap">
              <span className="patron-per-page-label">Show:</span>
              <select
                className="patron-per-page-select"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
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
              disabled={safePage <= 1 || totalPages <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            {totalPages > 0 && filteredPurchases.length > 0 ? (
              Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`pagination-num ${safePage === num ? 'active' : ''}`}
                  onClick={() => setCurrentPage(num)}
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
              disabled={safePage >= totalPages || totalPages <= 1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* View Purchase Bill Modal */}
      {viewDossierPurchase && (
        <div className="purchases-modal-overlay" onClick={() => setViewDossierPurchase(null)}>
          <div className="purchases-modal-card purchases-bill-view-card" onClick={(e) => e.stopPropagation()}>
            <div className="purchases-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="purchase-party-tag to-tag" style={{ fontSize: '10px' }}>PURCHASE BILL</span>
                <h3 className="purchases-modal-title">
                  Purchase Bill • #{viewDossierPurchase.invoiceNumber}
                </h3>
              </div>
              <button type="button" className="purchases-modal-close-btn" onClick={() => setViewDossierPurchase(null)}>
                ✕
              </button>
            </div>

            <div className="purchases-modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Meta strip */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1.5px solid #EFE4DC', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#8A7B72', textTransform: 'uppercase', fontWeight: 700 }}>Purchase Date</span>
                  <div style={{ fontWeight: 800, color: '#31190B' }}>{viewDossierPurchase.date}</div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#8A7B72', textTransform: 'uppercase', fontWeight: 700 }}>Payment Mode</span>
                  <div>
                    <span className="purchases-payment-mode-pill">{viewDossierPurchase.paymentMode || 'Bank Wire'}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#8A7B72', textTransform: 'uppercase', fontWeight: 700 }}>Total Inward Outflow</span>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#31190B' }}>
                    ₹{Number(viewDossierPurchase.total || ((Number(viewDossierPurchase.amount) || 0) + (Number(viewDossierPurchase.gstAmount) || 0))).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* FROM & TO Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                <div style={{ padding: '12px', background: '#FDFBF9', border: '1px solid #EFE4DC', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#8C5325', textTransform: 'uppercase', marginBottom: '4px' }}>
                    FROM (SUPPLIER)
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#31190B' }}>{viewDossierPurchase.supplier}</div>
                  {viewDossierPurchase.supplierAddress && (
                    <div style={{ fontSize: '12px', color: '#6A564A', marginTop: '3px', lineHeight: 1.4 }}>
                      {viewDossierPurchase.supplierAddress}
                    </div>
                  )}
                  {viewDossierPurchase.supplierGstin && (
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#4A3528', marginTop: '4px' }}>
                      GSTIN: {viewDossierPurchase.supplierGstin}
                    </div>
                  )}
                  {viewDossierPurchase.supplierPhone && (
                    <div style={{ fontSize: '11.5px', color: '#7D6C63', marginTop: '2px' }}>
                      Phone: {viewDossierPurchase.supplierPhone}
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px', background: '#F8F9FA', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', marginBottom: '4px' }}>
                    TO (BUYER / COMPANY)
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                    {viewDossierPurchase.companyName || 'Kerala Wood Furniture - Sivakasi Depot'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '3px', lineHeight: 1.4 }}>
                    {viewDossierPurchase.companyAddress || 'Sivakasi Central Depot & Mill Yard, Sivakasi'}
                  </div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#1E293B', marginTop: '4px' }}>
                    GSTIN: {viewDossierPurchase.companyGstin || '32AABCP9821K1ZK'}
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div style={{ marginTop: '10px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#4A3528', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                  Purchase Items
                </span>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#FAF4EF', borderBottom: '1.5px solid #EFE4DC', color: '#7D6C63', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>#</th>
                      <th style={{ padding: '6px 8px' }}>Item Description</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>GST</th>
                      <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.isArray(viewDossierPurchase.itemsList) && viewDossierPurchase.itemsList.length > 0 ? (
                      viewDossierPurchase.itemsList.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F4E8DF' }}>
                          <td style={{ padding: '7px 8px', color: '#8A7B72' }}>{idx + 1}</td>
                          <td style={{ padding: '7px 8px', fontWeight: 600 }}>{it.name || it.item}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>{it.quantity}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right' }}>₹{Number(it.rate || it.amount || 0).toLocaleString('en-IN')}</td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', color: '#8C5325' }}>
                            {it.gstRate || it.gstPercent || 18}% (₹{Number(it.gstAmount || 0).toLocaleString('en-IN')})
                          </td>
                          <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>₹{Number(it.total || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    ) : (
                      <tr style={{ borderBottom: '1px solid #F4E8DF' }}>
                        <td style={{ padding: '7px 8px' }}>1</td>
                        <td style={{ padding: '7px 8px', fontWeight: 600 }}>{viewDossierPurchase.item}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 600 }}>{viewDossierPurchase.quantity || '-'}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right' }}>₹{Number(viewDossierPurchase.amount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: '#8C5325' }}>₹{Number(viewDossierPurchase.gstAmount || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700 }}>
                          ₹{(Number(viewDossierPurchase.amount || 0) + Number(viewDossierPurchase.gstAmount || 0)).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financials & Notes */}
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#FAF4EF', borderRadius: '8px', border: '1px solid #EFE4DC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span>Subtotal (Taxable Value):</span>
                  <strong>₹{Number(viewDossierPurchase.subtotal || viewDossierPurchase.amount || 0).toLocaleString('en-IN')}</strong>
                </div>
                {viewDossierPurchase.gstAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#7D6C63', fontSize: '13px' }}>
                    <span>GST Tax Amount:</span>
                    <span>+₹{Number(viewDossierPurchase.gstAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 900, borderTop: '1.5px solid #E2CEBE', paddingTop: '8px', color: '#31190B' }}>
                  <span>Grand Total:</span>
                  <span>₹{Number(viewDossierPurchase.total || ((Number(viewDossierPurchase.amount) || 0) + (Number(viewDossierPurchase.gstAmount) || 0))).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {viewDossierPurchase.notes && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6A564A', fontStyle: 'italic' }}>
                  <strong>Notes:</strong> {viewDossierPurchase.notes}
                </div>
              )}
            </div>

            <div className="purchases-modal-footer">
              <button
                type="button"
                className="btn-purchases-cancel"
                onClick={() => window.print()}
              >
                Print Bill
              </button>
              <button
                type="button"
                className="btn-purchases-submit-primary"
                onClick={() => setViewDossierPurchase(null)}
              >
                Close Purchase Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalPurchase && (
        <div className="purchases-modal-overlay" onClick={() => setDeleteModalPurchase(null)}>
          <div className="purchases-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="purchases-modal-header" style={{ backgroundColor: '#FEF2F2' }}>
              <h3 className="purchases-modal-title" style={{ color: '#DC2626' }}>Delete Purchase Bill?</h3>
              <button type="button" className="purchases-modal-close-btn" onClick={() => setDeleteModalPurchase(null)}>
                ✕
              </button>
            </div>
            <div className="purchases-modal-body">
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: '#4A3528' }}>
                Are you sure you want to delete purchase bill <strong>#{deleteModalPurchase.invoiceNumber}</strong> from{' '}
                <strong>{deleteModalPurchase.supplier}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="purchases-modal-footer">
              <button type="button" className="btn-purchases-cancel" onClick={() => setDeleteModalPurchase(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-purchases-submit-primary"
                style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
