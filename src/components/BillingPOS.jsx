import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './BillingPOS.css'

export default function BillingPOS() {
  const [bills, setBills] = useState(() => DataStore.getBills())
  const [activeBillId, setActiveBillId] = useState(() => DataStore.getActiveBillId())
  const [customers, setCustomers] = useState(() => DataStore.getCustomers())
  const [products, setProducts] = useState(() => DataStore.getProducts())
  const [settings, setSettings] = useState(() => DataStore.getSettings())

  const [activeCategory, setActiveCategory] = useState('Dining Sets')
  const [searchQuery, setSearchQuery] = useState('')
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [productPickerOpen, setProductPickerOpen] = useState(false)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [activeInvoiceTab, setActiveInvoiceTab] = useState('preview') // 'preview' | 'edit'
  const [holdSuccess, setHoldSuccess] = useState(false)

  // Edit Invoice Bill states (Requirement 2 & 3)
  const [editInvNumber, setEditInvNumber] = useState('')
  const [editCustomerName, setEditCustomerName] = useState('')
  const [editCustomerPhone, setEditCustomerPhone] = useState('')
  const [editCustomerAddress, setEditCustomerAddress] = useState('')
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('')
  const [editCustomerGstin, setEditCustomerGstin] = useState('')

  // Sync with data store events
  useEffect(() => {
    const handleUpdate = () => {
      setBills(DataStore.getBills())
      setActiveBillId(DataStore.getActiveBillId())
      setCustomers(DataStore.getCustomers())
      setProducts(DataStore.getProducts())
      setSettings(DataStore.getSettings())
    }
    window.addEventListener('timber_store_updated', handleUpdate)
    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  // Find active bill
  const currentBill = bills.find((b) => b.id === activeBillId) || bills[0] || DataStore.createNewDraft()
  const cartItems = currentBill.items || []
  const currentCustomer = currentBill.customer || customers[0]

  // Switch Bill Draft (Prompt 9 Requirement 1)
  const handleSwitchBill = (id) => {
    setActiveBillId(id)
    DataStore.setActiveBillId(id)
  }

  // Create New Draft Bill
  const handleCreateNewBill = () => {
    const newBill = DataStore.createNewDraft()
    setBills(DataStore.getBills())
    setActiveBillId(newBill.id)
  }

  // Close / Delete Bill Draft
  const handleCloseBill = (e, id) => {
    e.stopPropagation()
    const nextBill = DataStore.removeBill(id)
    setBills(DataStore.getBills())
    if (nextBill) {
      setActiveBillId(nextBill.id)
    }
  }

  // Clear Cart Items (Requirement 5)
  const handleClearCart = () => {
    DataStore.updateBill(currentBill.id, { items: [] })
    setBills(DataStore.getBills())
  }

  // Hold Order / Save as Draft
  const handleHoldOrder = () => {
    DataStore.holdCurrentBill(currentBill.id)
    setBills(DataStore.getBills())
    setHoldSuccess(true)
    setTimeout(() => setHoldSuccess(false), 2200)
  }

  // Update Cart Quantity
  const handleUpdateQuantity = (itemId, delta) => {
    const updatedItems = cartItems
      .map((item) => {
        if (item.id === itemId) {
          const newQty = Math.max(item.quantity + delta, 0)
          return { ...item, quantity: newQty }
        }
        return item
      })
      .filter((item) => item.quantity > 0)

    DataStore.updateBill(currentBill.id, { items: updatedItems })
    setBills(DataStore.getBills())
  }

  // Remove Item
  const handleRemoveItem = (itemId) => {
    const updatedItems = cartItems.filter((item) => item.id !== itemId)
    DataStore.updateBill(currentBill.id, { items: updatedItems })
    setBills(DataStore.getBills())
  }

  // Add Product to Cart
  const handleAddProductToCart = (prod) => {
    const existing = cartItems.find((item) => item.sku === prod.sku)
    let updatedItems
    if (existing) {
      updatedItems = cartItems.map((item) =>
        item.sku === prod.sku ? { ...item, quantity: item.quantity + 1 } : item
      )
    } else {
      updatedItems = [
        ...cartItems,
        {
          id: `${prod.sku}-${cartItems.length + 1}`,
          sku: prod.sku,
          name: prod.name,
          finish: prod.finish,
          unitPrice: prod.unitPrice,
          quantity: 1,
          category: prod.category,
        },
      ]
    }
    DataStore.updateBill(currentBill.id, { items: updatedItems })
    setBills(DataStore.getBills())
    setSearchQuery('')
  }

  // Live customer field updater for billing page
  const handleCustomerFieldChange = (field, value) => {
    const updatedCust = {
      ...currentCustomer,
      [field]: value,
    }
    if (field === 'name') {
      updatedCust.personName = value
    }
    DataStore.updateBill(currentBill.id, {
      customer: updatedCust,
      name: `${currentBill.name.split('•')[0]} • ${value || 'New Patron'}`,
    })
    setBills(DataStore.getBills())
  }

  // Change Customer from Directory on Active Bill
  const handleSelectCustomer = (cust) => {
    DataStore.updateBill(currentBill.id, {
      customer: {
        ...cust,
        deliveryAddress: cust.deliveryAddress || cust.address || 'Sivakasi Yard Destination',
      },
      name: `${currentBill.name.split('•')[0]} • ${cust.name}`,
    })
    setBills(DataStore.getBills())
    setCustomerModalOpen(false)
  }

  // Dynamic Totals
  const totalUnits = cartItems.reduce((acc, item) => acc + item.quantity, 0)
  const totalItemsCount = cartItems.length
  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  const cgstRateNum = Number(settings.cgstRate) || (parseFloat(settings.taxRate) ? parseFloat(settings.taxRate) / 2 : 9)
  const sgstRateNum = Number(settings.sgstRate) || (parseFloat(settings.taxRate) ? parseFloat(settings.taxRate) / 2 : 9)
  const cgst = Math.round((subtotal * cgstRateNum) / 100)
  const sgst = Math.round((subtotal * sgstRateNum) / 100)
  const totalGst = cgst + sgst
  const grandTotal = subtotal + totalGst

  // Open Invoice Modal with Editable Defaults from Settings & Bill
  const handleOpenInvoiceModal = () => {
    if (cartItems.length === 0) return
    setEditInvNumber(currentBill.invoiceNumber || `TAX-INV #2024-SK-${Math.floor(900 + Math.random() * 100)}`)
    setEditCustomerName(currentCustomer.name || '')
    setEditCustomerPhone(currentCustomer.phone || '')
    setEditCustomerAddress(currentCustomer.address || currentCustomer.location || 'Sivakasi, Tamil Nadu')
    setEditDeliveryAddress(currentCustomer.deliveryAddress || currentCustomer.address || 'Sivakasi, Tamil Nadu')
    setEditCustomerGstin(currentCustomer.gstin || 'Unregistered / Personal')
    setActiveInvoiceTab('preview')
    setInvoiceModalOpen(true)
  }

  // Save changes from Edit Bill Drawer
  const handleSaveBillEdits = () => {
    const updatedCust = {
      ...currentCustomer,
      name: editCustomerName,
      phone: editCustomerPhone,
      address: editCustomerAddress,
      deliveryAddress: editDeliveryAddress,
      gstin: editCustomerGstin,
    }
    DataStore.updateBill(currentBill.id, {
      invoiceNumber: editInvNumber,
      customer: updatedCust,
    })
    setBills(DataStore.getBills())
    setActiveInvoiceTab('preview')
  }

  // Finalize Sale & Print
  const handleFinalizeAndPrint = () => {
    DataStore.recordSaleFromBill(currentBill)
    window.print()
  }

  // Close Invoice and Proceed to Next Draft
  const handleNextBill = () => {
    setInvoiceModalOpen(false)
    const nextBill = DataStore.removeBill(currentBill.id)
    setBills(DataStore.getBills())
    if (nextBill) {
      setActiveBillId(nextBill.id)
    }
  }

  // Categories
  const categories = [
    {
      name: 'Dining Sets',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h18M5 8v11M19 8v11M8 8v4M16 8v4" />
        </svg>
      ),
    },
    {
      name: 'Chairs',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
          <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
          <path d="M5 18v2M19 18v2" />
        </svg>
      ),
    },
    {
      name: 'Beds',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v4" />
        </svg>
      ),
    },
    {
      name: 'Living',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2" />
          <path d="M2 11v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M4 19v2M20 19v2" />
        </svg>
      ),
    },
    {
      name: 'Storage',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="15" rx="2" />
          <line x1="12" y1="4" x2="12" y2="19" />
          <line x1="8" y1="11" x2="8" y2="12" />
          <line x1="16" y1="11" x2="16" y2="12" />
        </svg>
      ),
    },
  ]

  // Filtered products for quick-search dropdown or catalog picker
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return p.category === activeCategory
    return (
      p.sku.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.woodSpecies?.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    )
  })

  const formatRupees = (amount) => Number(amount || 0).toLocaleString('en-IN')

  return (
    <div className="pos-page-container">
      {/* Multi-Bill Concurrent Draft Tabs (Prompt 9 Requirement 1) */}
      <div className="pos-drafts-tab-bar">
        <div className="pos-drafts-list">
          {bills.map((b, idx) => {
            const isActive = b.id === currentBill.id
            return (
              <div
                key={b.id}
                className={`pos-draft-tab ${isActive ? 'active' : ''}`}
                onClick={() => handleSwitchBill(b.id)}
              >
                <div className="draft-tab-title-wrap">
                  <span className={`draft-dot ${isActive ? 'active' : ''}`} />
                  <span className="draft-tab-label">
                    Bill #{idx + 1}: {b.customer ? b.customer.name.split(' ')[0] : 'Draft'}
                  </span>
                  <span className="draft-items-pill">{b.items ? b.items.length : 0} items</span>
                </div>

                {bills.length > 1 && (
                  <button
                    type="button"
                    className="btn-close-draft"
                    onClick={(e) => handleCloseBill(e, b.id)}
                    title="Close Draft"
                  >
                    ✕
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <button
          type="button"
          className="btn-add-draft"
          onClick={handleCreateNewBill}
          title="Create another simultaneous bill draft"
        >
          <span>+ New Draft Bill</span>
        </button>
      </div>

      {/* Top Banner Status */}
      <div className="pos-top-banner">
        <div className="pos-terminal-info">
          <span className="pos-pulse-dot" />
          <span className="pos-terminal-name">Terminal #02</span>
          <span className="pos-banner-sep">•</span>
          <span className="pos-counter-label">Sivakasi Counter POS</span>
        </div>

        <div className="pos-banner-meta">
          <span className="pos-inv-tag">{currentBill.invoiceNumber || 'TAX-INV #2024-SK-982'}</span>
          <span className="pos-banner-pipe">|</span>
          <span className="pos-cart-badge">{totalItemsCount} Items in Cart</span>
        </div>
      </div>

      {/* Main Grid: Left Workspace & Right Summary */}
      <div className="pos-main-grid">
        {/* Left Column: Customer & Delivery Details, Active Cart */}
        <div className="pos-left-column">
          {/* Customer & Delivery Information Form */}
          <div className="pos-customer-edit-card">
            <div className="pos-customer-edit-header">
              <div className="pos-customer-title-wrap">
                <div className="pos-customer-title-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <span className="pos-customer-edit-title">Patron & Delivery Details</span>
              </div>

              <button
                type="button"
                className="btn-pick-existing-customer"
                onClick={() => setCustomerModalOpen(true)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span>Select from Patrons</span>
              </button>
            </div>

            <div className="pos-customer-fields-grid">
              <div className="pos-customer-row-2col">
                <div className="pos-field-group">
                  <label className="pos-field-label">Customer / Patron Name *</label>
                  <input
                    type="text"
                    className="pos-field-input"
                    placeholder="e.g. Mathew Philip"
                    value={currentCustomer.name || ''}
                    onChange={(e) => handleCustomerFieldChange('name', e.target.value)}
                  />
                </div>

                <div className="pos-field-group">
                  <label className="pos-field-label">Contact Phone *</label>
                  <input
                    type="text"
                    className="pos-field-input"
                    placeholder="e.g. +91 98470 12345"
                    value={currentCustomer.phone || ''}
                    onChange={(e) => handleCustomerFieldChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="pos-customer-row-2col">
                <div className="pos-field-group">
                  <label className="pos-field-label">Customer / Billing Address *</label>
                  <input
                    type="text"
                    className="pos-field-input"
                    placeholder="e.g. Bazaar Street, Sivakasi"
                    value={currentCustomer.address || currentCustomer.location || ''}
                    onChange={(e) => handleCustomerFieldChange('address', e.target.value)}
                  />
                </div>

                <div className="pos-field-group">
                  <label className="pos-field-label">Delivery Address *</label>
                  <input
                    type="text"
                    className="pos-field-input"
                    placeholder="e.g. Delivery Yard, Site #4, Sivakasi"
                    value={currentCustomer.deliveryAddress || currentCustomer.address || ''}
                    onChange={(e) => handleCustomerFieldChange('deliveryAddress', e.target.value)}
                  />
                </div>
              </div>

              <div className="pos-field-group">
                <label className="pos-field-label">Client GSTIN (Optional)</label>
                <input
                  type="text"
                  className="pos-field-input"
                  placeholder="e.g. 33AABCP9821K1ZK"
                  value={currentCustomer.gstin && currentCustomer.gstin !== 'Unregistered / Personal' ? currentCustomer.gstin : ''}
                  onChange={(e) => handleCustomerFieldChange('gstin', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Active Invoice Cart */}
          <div className="pos-cart-card">
            <div className="pos-cart-header">
              <div className="pos-cart-title-wrap">
                <span className="pos-cart-heading">Active Invoice Cart</span>
                <span className="pos-cart-count-pill">{totalItemsCount} Items</span>
              </div>
              <div className="pos-cart-header-actions">
                <button
                  type="button"
                  className="btn-add-furniture-cart"
                  onClick={() => setProductPickerOpen(true)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ Add Furniture</span>
                </button>
                {cartItems.length > 0 && (
                  <button
                    type="button"
                    className="btn-clear-cart"
                    onClick={handleClearCart}
                    title="Clear all items in cart"
                  >
                    Clear Cart
                  </button>
                )}
                <span className="pos-cart-tax-inv">{currentBill.invoiceNumber || 'TAX-INV #2024-SK-982'}</span>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="pos-cart-items-list">
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <div key={item.id} className="pos-cart-item-row">
                    <div className="pos-item-icon-box">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 8h18M5 8v11M19 8v11M8 8v4M16 8v4" />
                      </svg>
                    </div>

                    <div className="pos-item-details">
                      <h3 className="pos-item-name">{item.name}</h3>
                      <div className="pos-item-meta-line">
                        <span className="pos-item-sku">{item.sku}</span>
                        <span className="pos-item-dot">▪</span>
                        <span className="pos-item-finish">{item.finish}</span>
                      </div>
                    </div>

                    {/* Stepper */}
                    <div className="pos-item-stepper">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                      >
                        –
                      </button>
                      <span className="stepper-val">{item.quantity}</span>
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                      >
                        +
                      </button>
                    </div>

                    {/* Price Block */}
                    <div className="pos-item-price-block">
                      <span className="pos-item-total-price">
                        <span className="straight-rupee">₹</span>
                        {formatRupees(item.unitPrice * item.quantity)}
                      </span>
                      <span className="pos-item-unit-rate">
                        <span className="straight-rupee">₹</span>
                        {formatRupees(item.unitPrice)} / unit
                      </span>
                    </div>

                    {/* Trash Delete Action */}
                    <button
                      type="button"
                      className="btn-delete-item"
                      onClick={() => handleRemoveItem(item.id)}
                      aria-label="Remove item"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="pos-empty-cart-state">
                  <div className="empty-cart-icon-wrap">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#A06A3A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                  </div>
                  <h4 className="empty-cart-title">Cart is currently empty</h4>
                  <p className="empty-cart-subtitle">
                    Click any <strong>Artisan Timber Line</strong> or search SKU above to add timber furniture to this bill.
                  </p>
                  <button
                    type="button"
                    className="btn-browse-timber-cta"
                    onClick={() => setProductPickerOpen(true)}
                  >
                    + Browse Timber Catalog
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Invoice Summary & Settlement */}
        <div className="pos-right-column">
          <div className="pos-summary-card">
            {/* Header */}
            <div className="summary-card-header">
              <div>
                <h2 className="summary-title">Invoice Summary</h2>
                <p className="summary-subtitle">
                  {totalItemsCount} items • {totalUnits} units
                </p>
              </div>
              <span className="summary-hsn-tag">HSN {settings.hsnCode || '9403'}</span>
            </div>

            {/* Subtotal & GST Rows */}
            <div className="summary-breakdown">
              <div className="breakdown-row">
                <span className="breakdown-label">Subtotal</span>
                <span className="breakdown-value">
                  <span className="straight-rupee">₹</span>
                  {formatRupees(subtotal)}.00
                </span>
              </div>

              <div className="breakdown-row gst">
                <span className="breakdown-label">CGST ({cgstRateNum}%)</span>
                <span className="breakdown-value">
                  <span className="straight-rupee">₹</span>
                  {formatRupees(cgst)}.00
                </span>
              </div>

              <div className="breakdown-row gst">
                <span className="breakdown-label">SGST ({sgstRateNum}%)</span>
                <span className="breakdown-value">
                  <span className="straight-rupee">₹</span>
                  {formatRupees(sgst)}.00
                </span>
              </div>
            </div>

            {/* Grand Total Box */}
            <div className="pos-grand-total-box">
              <div className="grand-total-left">
                <span className="grand-total-label">GRAND TOTAL</span>
                <span className="grand-total-sub">Incl. all taxes</span>
              </div>

              <div className="grand-total-right">
                <span className="grand-total-amount">
                  <span className="straight-rupee">₹</span>
                  {formatRupees(grandTotal)}
                </span>
              </div>
            </div>


            {/* Primary Action Button (Derived from Settings & Opens Review/Edit Bill) */}
            <button
              type="button"
              className="btn-print-tax-invoice"
              onClick={handleOpenInvoiceModal}
              disabled={cartItems.length === 0}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Save & Print Tax Invoice</span>
            </button>

            {/* Secondary Action: Hold Draft */}
            <div className="pos-secondary-actions">
              <button
                type="button"
                className="btn-secondary-pos"
                onClick={handleHoldOrder}
                style={{ width: '100%' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span>{holdSuccess ? '✓ Held as Draft' : 'Hold Order'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Customer Picker */}
      {customerModalOpen && (
        <div className="pos-modal-overlay" onClick={() => setCustomerModalOpen(false)}>
          <div className="pos-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <h3 className="pos-modal-title">Select Customer for Bill</h3>
              <button type="button" className="pos-modal-close" onClick={() => setCustomerModalOpen(false)}>✕</button>
            </div>
            <div className="pos-customer-picker-list">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className={`customer-picker-item ${currentCustomer.id === c.id ? 'active' : ''}`}
                  onClick={() => handleSelectCustomer(c)}
                >
                  <div className="picker-avatar">{c.initials}</div>
                  <div className="picker-info">
                    <span className="picker-name">{c.name}</span>
                    <span className="picker-phone">{c.phone} • {c.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Timber Catalog Item Picker */}
      {productPickerOpen && (
        <div className="pos-modal-overlay" onClick={() => setProductPickerOpen(false)}>
          <div className="pos-modal-card catalog-picker-card" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <div>
                <h3 className="pos-modal-title">Artisanal Timber Catalog</h3>
                <span className="picker-sub">Category: <strong>{activeCategory}</strong> • Click any line to add to current bill</span>
              </div>
              <button type="button" className="pos-modal-close" onClick={() => setProductPickerOpen(false)}>✕</button>
            </div>

            <div className="catalog-category-tabs">
              {categories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`catalog-tab-btn ${activeCategory === c.name ? 'active' : ''}`}
                  onClick={() => setActiveCategory(c.name)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="pos-catalog-grid-scroll">
              {filteredProducts.map((p) => {
                const inCart = cartItems.find((ci) => ci.sku === p.sku)
                return (
                  <div key={p.sku} className="catalog-grid-item">
                    <div className="catalog-item-info">
                      <span className="catalog-item-sku">{p.sku}</span>
                      <h4 className="catalog-item-name">{p.name}</h4>
                      <span className="catalog-item-finish">{p.finish} • {p.woodSpecies}</span>
                      <span className="catalog-item-stock">{p.stockQuantity} in stock</span>
                    </div>
                    <div className="catalog-item-action">
                      <span className="catalog-price">₹{formatRupees(p.unitPrice)}</span>
                      <button
                        type="button"
                        className="btn-catalog-add"
                        onClick={() => handleAddProductToCart(p)}
                      >
                        {inCart ? `+ Add (${inCart.quantity} in cart)` : '+ Add to Bill'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="catalog-picker-footer">
              <button
                type="button"
                className="btn-done-picking"
                onClick={() => setProductPickerOpen(false)}
              >
                Done Adding Items
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tax Invoice Preview & Edit Bill Details (Derived from Settings - Requirement 2) */}
      {invoiceModalOpen && (
        <div className="pos-modal-overlay" onClick={() => setInvoiceModalOpen(false)}>
          <div className="pos-invoice-full-modal" onClick={(e) => e.stopPropagation()}>
            {/* Modal Top Switcher */}
            <div className="invoice-modal-header-bar">
              <div className="inv-tabs">
                <button
                  type="button"
                  className={`inv-tab-btn ${activeInvoiceTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveInvoiceTab('preview')}
                >
                  🖨 Tax Invoice Preview
                </button>
                <button
                  type="button"
                  className={`inv-tab-btn ${activeInvoiceTab === 'edit' ? 'active' : ''}`}
                  onClick={() => setActiveInvoiceTab('edit')}
                >
                  ✏ Edit Invoice Bill Details
                </button>
              </div>

              <div className="inv-header-right-actions">
                <button
                  type="button"
                  className="btn-inv-print"
                  onClick={handleFinalizeAndPrint}
                  title="Print GST Invoice"
                >
                  🖨 Print Invoice
                </button>
                <button
                  type="button"
                  className="btn-inv-close"
                  onClick={() => setInvoiceModalOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tab 1: Tax Invoice Preview (Print Area) */}
            {activeInvoiceTab === 'preview' ? (
              <div className="invoice-print-area">
                {/* Depot Header Derived from System Settings */}
                <div className="inv-sheet-header">
                  <div className="inv-brand-block">
                    <span className="inv-brand-title">{settings.depotName || 'Kerala Wood Furniture - Sivakasi Depot'}</span>
                    <span className="inv-brand-tagline">HERITAGE ARTISAN TIMBER • SIVAKASI</span>
                    <p className="inv-depot-address">{settings.address || 'Sivakasi Central Depot & Mill Yard, Sivakasi'}</p>
                    <p className="inv-depot-contact">
                      Phone: {settings.contactPhone || '+91 94842 89120'} | Email: {settings.contactEmail || 'depot@keralawood.in'}
                    </p>
                  </div>

                  <div className="inv-gst-statutory-block">
                    <div className="statutory-badge">GST TAX INVOICE</div>
                    <div className="statutory-field"><strong>GSTIN:</strong> {settings.gstin || '33AABCP9821K1ZK'}</div>
                    <div className="statutory-field"><strong>HSN Code:</strong> {settings.hsnCode || '9403'}</div>
                    <div className="statutory-field"><strong>Forest Reg:</strong> {settings.dealerLicense || 'SFD/SVK/TMR/2023-884'}</div>
                  </div>
                </div>

                <div className="inv-sheet-divider" />

                {/* Invoice & Customer Meta Grid */}
                <div className="inv-meta-grid">
                  <div className="inv-billed-to">
                    <span className="inv-section-title">BILLED TO (PATRON):</span>
                    <h3 className="inv-client-name">{currentCustomer.name || 'Walk-in Patron'}</h3>
                    <p className="inv-client-phone"><strong>Phone:</strong> {currentCustomer.phone || '-'}</p>
                    <p className="inv-client-addr"><strong>Billing Address:</strong> {currentCustomer.address || currentCustomer.location || 'Sivakasi'}</p>
                    <p className="inv-client-delivery"><strong>Delivery Address:</strong> {currentCustomer.deliveryAddress || currentCustomer.address || 'Same as Billing Address'}</p>
                    {currentCustomer.gstin && currentCustomer.gstin !== 'Unregistered / Personal' && (
                      <p className="inv-client-gstin"><strong>Client GSTIN:</strong> {currentCustomer.gstin}</p>
                    )}
                  </div>

                  <div className="inv-doc-info">
                    <span className="inv-section-title">INVOICE SPECIFICS:</span>
                    <div className="inv-info-row">
                      <span>Invoice No:</span>
                      <strong>{currentBill.invoiceNumber || 'TAX-INV #2024-SK-982'}</strong>
                    </div>
                    <div className="inv-info-row">
                      <span>Date & Time:</span>
                      <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • Sivakasi Standard Time</span>
                    </div>
                    <div className="inv-info-row">
                      <span>Place of Supply:</span>
                      <span>Sivakasi, Tamil Nadu (State Code: 33)</span>
                    </div>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="inv-table-wrap">
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Artisan Timber Description & Finish</th>
                        <th>HSN</th>
                        <th className="num-col">Qty</th>
                        <th className="num-col">Unit Rate (₹)</th>
                        <th className="num-col">CGST ({cgstRateNum}%)</th>
                        <th className="num-col">SGST ({sgstRateNum}%)</th>
                        <th className="num-col">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item, idx) => {
                        const itemSub = item.unitPrice * item.quantity
                        const itemCgst = Math.round((itemSub * cgstRateNum) / 100)
                        const itemSgst = Math.round((itemSub * sgstRateNum) / 100)
                        const itemTotal = itemSub + itemCgst + itemSgst
                        return (
                          <tr key={item.id}>
                            <td>{idx + 1}</td>
                            <td>
                              <strong>{item.name}</strong>
                              <span className="inv-item-sub">{item.sku} • {item.finish}</span>
                            </td>
                            <td>{settings.hsnCode || '9403'}</td>
                            <td className="num-col">{item.quantity}</td>
                            <td className="num-col">₹{formatRupees(item.unitPrice)}</td>
                            <td className="num-col">₹{formatRupees(itemCgst)}</td>
                            <td className="num-col">₹{formatRupees(itemSgst)}</td>
                            <td className="num-col font-bold">₹{formatRupees(itemTotal)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Settlement Box */}
                <div className="inv-settlement-row">
                  <div className="inv-bank-box">
                    <span className="inv-box-heading">DEPOT SETTLEMENT ACCOUNT (DIRECT SETTLEMENT):</span>
                    <p className="bank-meta"><strong>Bank:</strong> {settings.bankName || 'State Bank of India - Sivakasi Town Branch'}</p>
                    <p className="bank-meta"><strong>A/C No:</strong> {settings.accountNumber || '4092817290192'}</p>
                    <p className="bank-meta"><strong>IFSC Code:</strong> {settings.ifscCode || 'SBIN0008839'}</p>
                    <p className="bank-meta"><strong>UPI VPA:</strong> {settings.upiId || 'keralawood.sivakasi@sbi'}</p>
                    {currentBill.packagingNote && (
                      <p className="packaging-note-text">
                        <strong>Packaging & Transit Note:</strong> {currentBill.packagingNote}
                      </p>
                    )}
                  </div>

                  <div className="inv-totals-box">
                    <div className="inv-tot-line">
                      <span>Taxable Subtotal:</span>
                      <strong>₹{formatRupees(subtotal)}.00</strong>
                    </div>
                    <div className="inv-tot-line">
                      <span>Central GST (CGST {cgstRateNum}%):</span>
                      <span>₹{formatRupees(cgst)}.00</span>
                    </div>
                    <div className="inv-tot-line">
                      <span>State GST (SGST {sgstRateNum}%):</span>
                      <span>₹{formatRupees(sgst)}.00</span>
                    </div>
                    <div className="inv-tot-divider" />
                    <div className="inv-tot-line grand">
                      <span>Grand Total (Settled):</span>
                      <strong className="grand-val">₹{formatRupees(grandTotal)}.00</strong>
                    </div>
                  </div>
                </div>

                {/* Signatory & Legal Terms Derived from Settings */}
                <div className="inv-footer-signatures">
                  <div className="inv-legal-disclaimer">
                    <span className="disclaimer-label">TERMS & TIMBER GRAIN DISCLAIMER:</span>
                    <p className="disclaimer-text">{settings.disclaimer || 'Natural variations in teak & rosewood grain are organic characteristics. Claims accepted within 7 days of yard delivery.'}</p>
                  </div>

                  <div className="inv-signatory-block">
                    <div className="signature-line" />
                    <span className="signatory-name">{settings.signatoryName || 'Rajesh Sivan'}</span>
                    <span className="signatory-title">{settings.signatoryDesignation || 'Depot Lead & Store Manager'}</span>
                    <span className="signatory-store">Kerala Wood Furniture • Sivakasi</span>
                  </div>
                </div>

                {/* Final Confirmation Buttons */}
                <div className="inv-bottom-actions">
                  <button
                    type="button"
                    className="btn-print-bill-primary"
                    onClick={handleFinalizeAndPrint}
                  >
                    🖨 Print Official Invoice
                  </button>
                  <button
                    type="button"
                    className="btn-edit-bill-details"
                    onClick={() => setActiveInvoiceTab('edit')}
                  >
                    ✏ Edit Bill Details
                  </button>
                  <button
                    type="button"
                    className="btn-done-bill-next"
                    onClick={handleNextBill}
                  >
                    ✓ Complete & Next Bill
                  </button>
                </div>
              </div>
            ) : (
              /* Tab 2: Edit Invoice Bill Details (Requirement 2) */
              <div className="invoice-edit-form-wrap">
                <div className="edit-form-header">
                  <h3 className="edit-form-title">Edit Invoice Bill Details</h3>
                  <p className="edit-form-sub">
                    Adjust customer billing data, tax invoice code, payment terms, or transit notes before printing.
                  </p>
                </div>

                <div className="edit-fields-grid">
                  <div className="edit-field">
                    <label>Invoice Number</label>
                    <input
                      type="text"
                      value={editInvNumber}
                      onChange={(e) => setEditInvNumber(e.target.value)}
                    />
                  </div>

                  <div className="edit-field">
                    <label>Customer / Patron Name</label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="edit-field">
                    <label>Contact Phone</label>
                    <input
                      type="text"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                    />
                  </div>

                  <div className="edit-field">
                    <label>Patron GSTIN</label>
                    <input
                      type="text"
                      value={editCustomerGstin}
                      onChange={(e) => setEditCustomerGstin(e.target.value)}
                    />
                  </div>

                  <div className="edit-field">
                    <label>Billing Address</label>
                    <input
                      type="text"
                      value={editCustomerAddress}
                      onChange={(e) => setEditCustomerAddress(e.target.value)}
                    />
                  </div>

                  <div className="edit-field">
                    <label>Delivery Address</label>
                    <input
                      type="text"
                      value={editDeliveryAddress}
                      onChange={(e) => setEditDeliveryAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="edit-form-actions">
                  <button
                    type="button"
                    className="btn-save-bill-edits"
                    onClick={handleSaveBillEdits}
                  >
                    Save Changes & Return to Preview
                  </button>
                  <button
                    type="button"
                    className="btn-cancel-bill-edits"
                    onClick={() => setActiveInvoiceTab('preview')}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
