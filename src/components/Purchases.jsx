import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import { validateRequired, validatePhone, validatePositiveNumber } from '../utils/validators'
import './Purchases.css'

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
    supplier: '',
    supplierPhone: '',
    date: new Date().toISOString().split('T')[0],
    item: '',
    category: 'Timber Logs',
    quantity: '',
    amount: '',
    gstAmount: '',
    paymentMode: 'Bank Wire',
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
    return purchases.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
  }, [purchases])

  const uniqueSuppliers = useMemo(() => {
    const set = new Set(purchases.map((p) => p.supplier).filter(Boolean))
    return set.size
  }, [purchases])

  const totalConsignments = purchases.length

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

  // Handlers
  const handleOpenAdd = () => {
    setEditingPurchase(null)
    setFormData({
      invoiceNumber: DataStore.getNextPurchaseNumber(),
      supplier: '',
      supplierPhone: '',
      date: new Date().toISOString().split('T')[0],
      item: '',
      category: 'Timber Logs',
      quantity: '',
      amount: '',
      gstAmount: '',
      paymentMode: 'Bank Wire',
      notes: '',
    })
    setFormErrors({})
    setViewMode('form')
  }

  const handleOpenEdit = (p) => {
    setEditingPurchase(p)
    const rawInv = String(p.invoiceNumber || p.id || '')
    const digitsOnly = rawInv.replace(/\D/g, '')
    setFormData({
      invoiceNumber: digitsOnly || rawInv || DataStore.getNextPurchaseNumber(),
      supplier: p.supplier || '',
      supplierPhone: p.supplierPhone || '',
      date: p.date || new Date().toISOString().split('T')[0],
      item: p.item || '',
      category: p.category || 'Timber Logs',
      quantity: p.quantity || '',
      amount: p.amount || '',
      gstAmount: p.gstAmount || '',
      paymentMode: p.paymentMode || 'Bank Wire',
      notes: p.notes || '',
    })
    setFormErrors({})
    setViewMode('form')
  }

  const handleSavePurchase = (e) => {
    e.preventDefault()
    const supplierVal = validateRequired(formData.supplier, 'Supplier Name', 2)
    const phoneVal = validatePhone(formData.supplierPhone, false)
    const itemVal = validateRequired(formData.item, 'Item Description', 2)
    const amountVal = validatePositiveNumber(formData.amount, 'Purchase Amount', false)
    const gstVal = formData.gstAmount ? validatePositiveNumber(formData.gstAmount, 'GST Tax', true) : { isValid: true, error: '' }

    const errs = {}
    if (!supplierVal.isValid) errs.supplier = supplierVal.error
    if (!phoneVal.isValid) errs.supplierPhone = phoneVal.error
    if (!itemVal.isValid) errs.item = itemVal.error
    if (!amountVal.isValid) errs.amount = amountVal.error
    if (!gstVal.isValid) errs.gstAmount = gstVal.error

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      showToast('⚠️ Please correct highlighted purchase fields')
      return
    }
    setFormErrors({})

    const cleanInvoiceNumber = String(formData.invoiceNumber).trim().replace(/\D/g, '') || DataStore.getNextPurchaseNumber()
    const cleanPhone = phoneVal.clean ? `+91 ${phoneVal.clean}` : formData.supplierPhone.trim()

    const payload = {
      ...formData,
      supplierPhone: cleanPhone,
      invoiceNumber: cleanInvoiceNumber,
      amount: Number(formData.amount) || 0,
      gstAmount: Number(formData.gstAmount) || 0,
    }

    if (editingPurchase) {
      DataStore.updatePurchase({ ...editingPurchase, ...payload })
      showToast(`✓ Updated purchase ${payload.invoiceNumber}`)
    } else {
      DataStore.addPurchase(payload)
      showToast(`✓ Recorded new purchase consignment ${payload.invoiceNumber}`)
    }

    setViewMode('list')
  }

  const handleDelete = () => {
    if (!deleteModalPurchase) return
    DataStore.deletePurchase(deleteModalPurchase.id)
    showToast(`✓ Removed purchase record ${deleteModalPurchase.invoiceNumber}`)
    setDeleteModalPurchase(null)
  }

  if (viewMode === 'form') {
    return (
      <div className="purchases-page-container purchases-form-page">
        {/* Toast Notification */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '28px',
            zIndex: 9999,
            backgroundColor: '#31190B',
            color: '#FAF4EF',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(49, 25, 11, 0.25)',
          }}>
            {toastMessage}
          </div>
        )}

        {/* Topbar with Back button */}
        <div className="purchases-form-topbar">
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
          <div className="purchases-form-top-actions">
            <button
              type="button"
              className="btn-purchases-cancel"
              onClick={() => setViewMode('list')}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="purchase-record-form"
              className="btn-purchases-submit"
            >
              {editingPurchase ? 'Update Consignment' : 'Save Consignment'}
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="purchases-form-header">
          <h1 className="purchases-form-main-title">
            {editingPurchase ? `Edit Consignment #${formData.invoiceNumber}` : 'Record Inward Timber Purchase'}
          </h1>
          <p className="purchases-form-subtitle">
            {editingPurchase
              ? 'Update inward supplier logs, timber measurements, and transaction payments'
              : 'Log new raw timber arrivals, sawmill stock, supplier bills, and payment settlements'}
          </p>
        </div>

        {/* Main Form */}
        <form id="purchase-record-form" onSubmit={handleSavePurchase} className="purchases-fullpage-form">
          {/* Card 1: Consignment & Supplier Details */}
          <div className="purchases-form-card">
            <div className="purchases-card-heading">
              <div className="purchases-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div>
                <h3 className="purchases-card-title">Consignment & Supplier Info</h3>
                <p className="purchases-card-desc">Reference number and mill provenance</p>
              </div>
            </div>
            <div className="purchases-form-grid">
              <div className="purchases-input-group">
                <label className="purchases-label">Purchase Consignment # *</label>
                <input
                  type="text"
                  className="purchases-input"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="100"
                  required
                />
                <span className="purchases-helper-text">Auto-generated number (strictly numeric from 100)</span>
              </div>
              <div className="purchases-input-group">
                <label className="purchases-label">Purchase Date *</label>
                <input
                  type="date"
                  className="purchases-input"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
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
                  placeholder="e.g. Wayanad Forest Mills"
                  required
                />
                {formErrors.supplier && <span className="kwf-field-error">{formErrors.supplier}</span>}
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
                {formErrors.supplierPhone && <span className="kwf-field-error">{formErrors.supplierPhone}</span>}
              </div>
            </div>
          </div>

          {/* Card 2: Timber Material & Volume */}
          <div className="purchases-form-card">
            <div className="purchases-card-heading">
              <div className="purchases-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
              </div>
              <div>
                <h3 className="purchases-card-title">Timber Material & Specifications</h3>
                <p className="purchases-card-desc">Species, lot size, and cubic volume</p>
              </div>
            </div>
            <div className="purchases-form-grid">
              <div className="purchases-input-group purchases-full-width">
                <label className="purchases-label">Item / Species Description *</label>
                <input
                  type="text"
                  className={`purchases-input ${formErrors.item ? 'kwf-input-error' : ''}`}
                  value={formData.item}
                  onChange={(e) => {
                    setFormData({ ...formData, item: e.target.value })
                    if (formErrors.item) setFormErrors({ ...formErrors, item: '' })
                  }}
                  placeholder="e.g. Grade-A Nilambur Teak Planks (6x4)"
                  required
                />
                {formErrors.item && <span className="kwf-field-error">{formErrors.item}</span>}
              </div>
              <div className="purchases-input-group">
                <label className="purchases-label">Wood Category</label>
                <select
                  className="purchases-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Timber Logs">Timber Logs</option>
                  <option value="Hardwood Timber">Hardwood Timber</option>
                  <option value="Structural Lumber">Structural Lumber</option>
                  <option value="Sawn Wood">Sawn Wood</option>
                  <option value="Hardware & Finishes">Hardware & Finishes</option>
                </select>
              </div>
              <div className="purchases-input-group">
                <label className="purchases-label">Quantity / Volume</label>
                <input
                  type="text"
                  className="purchases-input"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="e.g. 50 Pcs / 120 CFT"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Financials & Settlement */}
          <div className="purchases-form-card">
            <div className="purchases-card-heading">
              <div className="purchases-card-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </div>
              <div>
                <h3 className="purchases-card-title">Financials & Settlement</h3>
                <p className="purchases-card-desc">Procurement cost, tax, and settlement terms</p>
              </div>
            </div>
            <div className="purchases-form-grid">
              <div className="purchases-input-group">
                <label className="purchases-label">Purchase Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  className={`purchases-input ${formErrors.amount ? 'kwf-input-error' : ''}`}
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value })
                    if (formErrors.amount) setFormErrors({ ...formErrors, amount: '' })
                  }}
                  placeholder="145000"
                  required
                />
                {formErrors.amount && <span className="kwf-field-error">{formErrors.amount}</span>}
              </div>
              <div className="purchases-input-group">
                <label className="purchases-label">GST Tax (₹)</label>
                <input
                  type="number"
                  min="0"
                  className={`purchases-input ${formErrors.gstAmount ? 'kwf-input-error' : ''}`}
                  value={formData.gstAmount}
                  onChange={(e) => {
                    setFormData({ ...formData, gstAmount: e.target.value })
                    if (formErrors.gstAmount) setFormErrors({ ...formErrors, gstAmount: '' })
                  }}
                  placeholder="26100"
                />
                {formErrors.gstAmount && <span className="kwf-field-error">{formErrors.gstAmount}</span>}
              </div>
              <div className="purchases-input-group">
                <label className="purchases-label">Payment Mode *</label>
                <select
                  className="purchases-select"
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                >
                  <option value="Bank Wire">Bank Wire / NEFT / RTGS</option>
                  <option value="UPI">UPI Transfer</option>
                  <option value="Cash">Cash Settlement</option>
                  <option value="Cheque">Commercial Cheque</option>
                </select>
              </div>
              <div className="purchases-input-group">
                <label className="purchases-label">Total Outflow (₹)</label>
                <div className="purchases-computed-box">
                  ₹{((Number(formData.amount) || 0) + (Number(formData.gstAmount) || 0)).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="purchases-input-group purchases-full-width">
                <label className="purchases-label">Procurement Remarks / Notes</label>
                <textarea
                  className="purchases-textarea"
                  rows="3"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add delivery vehicle number, lorry receipt, or timber grade notes..."
                />
              </div>
            </div>
          </div>

          {/* Form Bottom Actions */}
          <div className="purchases-form-bottom-actions">
            <button
              type="button"
              className="btn-purchases-cancel"
              onClick={() => setViewMode('list')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-purchases-submit"
            >
              {editingPurchase ? 'Update Consignment' : 'Save Inward Consignment'}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="purchases-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '28px',
          zIndex: 9999,
          backgroundColor: '#31190B',
          color: '#FAF4EF',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 4px 14px rgba(49, 25, 11, 0.25)',
        }}>
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
          <button type="button" className="btn-purchases-print" onClick={() => window.print()} title="Print Purchases">
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
            <span className="purchases-kpi-label">INWARD SHIPMENTS</span>
            <div className="purchases-kpi-value">{totalConsignments}</div>
            <span className="purchases-kpi-sub">Recorded log consignments</span>
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
              {purchases.length > 0 ? `${primaryModeCount} consignment${primaryModeCount === 1 ? '' : 's'} recorded` : 'No purchase records'}
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
            placeholder="Search supplier, bill #, or wood..."
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
                <th>INVOICE # / DATE</th>
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
                      {searchQuery ? `No purchases found matching "${searchQuery}"` : 'No purchase consignments recorded yet'}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Click &quot;+ Record Purchase&quot; above to log your first timber inward consignment.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="purchases-invoice-no">{p.invoiceNumber || p.id}</div>
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
                      <div className="purchases-amt-val">₹{Number(p.amount || 0).toLocaleString('en-IN')}</div>
                      {p.gstAmount > 0 && (
                        <div style={{ fontSize: '10.5px', color: '#7D6C63' }}>
                          +₹{Number(p.gstAmount).toLocaleString('en-IN')} GST
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
                        {/* 1. Edit Button (Blue Squircle) */}
                        <button
                          type="button"
                          className="btn-purchase-action btn-purchase-edit"
                          onClick={() => handleOpenEdit(p)}
                          title="Edit Purchase"
                          aria-label="Edit"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {/* 2. View Button (White Squircle, Blue on Hover) */}
                        <button
                          type="button"
                          className="btn-purchase-action btn-purchase-view"
                          onClick={() => setViewDossierPurchase(p)}
                          title="View Consignment Details"
                          aria-label="View"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>

                        {/* 3. Delete Button (White Squircle, Red on Hover) */}
                        <button
                          type="button"
                          className="btn-purchase-action btn-purchase-delete"
                          onClick={() => setDeleteModalPurchase(p)}
                          title="Delete Purchase"
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
              ) : '0'}</strong> of {filteredPurchases.length} consignments
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

      {/* View Dossier Modal */}
      {viewDossierPurchase && (
        <div className="purchases-modal-overlay" onClick={() => setViewDossierPurchase(null)}>
          <div className="purchases-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="purchases-modal-header">
              <h3 className="purchases-modal-title">
                Consignment Dossier • {viewDossierPurchase.invoiceNumber}
              </h3>
              <button type="button" className="purchases-modal-close-btn" onClick={() => setViewDossierPurchase(null)}>
                ✕
              </button>
            </div>
            <div className="purchases-modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f0e6de', paddingBottom: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#8A7B72', textTransform: 'uppercase' }}>Supplier</span>
                  <div style={{ fontSize: '16px', fontWeight: 800 }}>{viewDossierPurchase.supplier}</div>
                  {viewDossierPurchase.supplierPhone && <div style={{ fontSize: '12px', color: '#8C5325' }}>{viewDossierPurchase.supplierPhone}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: '#8A7B72', textTransform: 'uppercase' }}>Purchase Date</span>
                  <div style={{ fontWeight: 700 }}>{viewDossierPurchase.date}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#8A7B72' }}>Item Description:</span>
                  <p style={{ margin: '4px 0', fontWeight: 600 }}>{viewDossierPurchase.item}</p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#8A7B72' }}>Category:</span>
                  <p style={{ margin: '4px 0', fontWeight: 600 }}>{viewDossierPurchase.category}</p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#8A7B72' }}>Quantity / Volume:</span>
                  <p style={{ margin: '4px 0', fontWeight: 600 }}>{viewDossierPurchase.quantity || '-'}</p>
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#8A7B72' }}>Payment Mode:</span>
                  <p style={{ margin: '4px 0' }}>
                    <span className="purchases-payment-mode-pill">{viewDossierPurchase.paymentMode || 'Bank Wire'}</span>
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '14px', padding: '14px', backgroundColor: '#FAF4EF', borderRadius: '8px', border: '1px solid #EFE4DC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Base Amount:</span>
                  <strong>₹{Number(viewDossierPurchase.amount || 0).toLocaleString('en-IN')}</strong>
                </div>
                {viewDossierPurchase.gstAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#7D6C63' }}>
                    <span>GST Tax:</span>
                    <span>₹{Number(viewDossierPurchase.gstAmount).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, borderTop: '1px solid #E2CEBE', paddingTop: '8px', color: '#31190B' }}>
                  <span>Total Inward Cost:</span>
                  <span>₹{(Number(viewDossierPurchase.amount || 0) + Number(viewDossierPurchase.gstAmount || 0)).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            <div className="purchases-modal-footer">
              <button type="button" className="btn-purchases-submit" onClick={() => setViewDossierPurchase(null)}>
                Close Dossier
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
              <h3 className="purchases-modal-title" style={{ color: '#DC2626' }}>Delete Purchase Consignment?</h3>
              <button type="button" className="purchases-modal-close-btn" onClick={() => setDeleteModalPurchase(null)}>
                ✕
              </button>
            </div>
            <div className="purchases-modal-body">
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: '#4A3528' }}>
                Are you sure you want to delete purchase <strong>{deleteModalPurchase.invoiceNumber}</strong> from{' '}
                <strong>{deleteModalPurchase.supplier}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="purchases-modal-footer">
              <button type="button" className="btn-purchases-cancel" onClick={() => setDeleteModalPurchase(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn-purchases-submit"
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
