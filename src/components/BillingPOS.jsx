import { useState } from 'react'
import './BillingPOS.css'

export default function BillingPOS() {
  const [activeCategory, setActiveCategory] = useState('Dining Sets')
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentMode, setPaymentMode] = useState('UPI')
  const [invoiceSuccess, setInvoiceSuccess] = useState(false)
  const [holdSuccess, setHoldSuccess] = useState(false)
  const [customNote, setCustomNote] = useState(false)

  // Cart items state
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      sku: 'KWF-TB-NT-06',
      name: 'Nilambur Teak 6-Seater Dining Table',
      finish: 'Grade-A Matte Walnut Finish',
      unitPrice: 54000,
      quantity: 1,
      category: 'Dining Sets',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h18M5 8v11M19 8v11M8 8v4M16 8v4" />
        </svg>
      ),
    },
    {
      id: 2,
      sku: 'KWF-DC-TK-02',
      name: 'Teakwood Dining Chairs with Cane Weave',
      finish: 'Handcrafted Rattan Back',
      unitPrice: 6500,
      quantity: 6,
      category: 'Chairs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
          <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
          <path d="M5 18v2M19 18v2" />
        </svg>
      ),
    },
    {
      id: 3,
      sku: 'KWF-CR-TK-01',
      name: 'Solid Teak Side Server Credenza',
      finish: 'Brass Pull Inlays',
      unitPrice: 24000,
      quantity: 1,
      category: 'Storage',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="15" rx="2" />
          <line x1="12" y1="4" x2="12" y2="19" />
          <line x1="8" y1="11" x2="8" y2="12" />
          <line x1="16" y1="11" x2="16" y2="12" />
        </svg>
      ),
    },
  ])

  // Quantity handlers
  const handleUpdateQuantity = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(item.quantity + delta, 0)
            return { ...item, quantity: newQty }
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    )
  }

  const handleRemoveItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
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

  // Totals calculations
  const totalUnits = cartItems.reduce((acc, item) => acc + item.quantity, 0)
  const totalItemsCount = cartItems.length
  const subtotal = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  const gst = Math.round(subtotal * 0.18)
  const grandTotal = subtotal + gst

  const formatRupees = (amount) => {
    return Number(amount).toLocaleString('en-IN')
  }

  const handlePrint = () => {
    setInvoiceSuccess(true)
    setTimeout(() => {
      setInvoiceSuccess(false)
    }, 2500)
  }

  const handleHold = () => {
    setHoldSuccess(true)
    setTimeout(() => {
      setHoldSuccess(false)
    }, 2000)
  }

  return (
    <div className="pos-page-container">
      {/* Top Banner Status */}
      <div className="pos-top-banner">
        <div className="pos-terminal-info">
          <span className="pos-pulse-dot" />
          <span className="pos-terminal-name">Terminal #02</span>
          <span className="pos-banner-sep">•</span>
          <span className="pos-counter-label">Counter POS</span>
        </div>

        <div className="pos-banner-meta">
          <span className="pos-inv-tag">TAX-INV #2024-KL-982</span>
          <span className="pos-banner-pipe">|</span>
          <span className="pos-cart-badge">{totalItemsCount} Items in Cart</span>
        </div>
      </div>

      {/* Main Grid: Left Workspace & Right Summary */}
      <div className="pos-main-grid">
        {/* Left Column: Customer, Search, Categories, Active Cart */}
        <div className="pos-left-column">
          {/* Customer Profile Box */}
          <div className="pos-customer-card">
            <div className="customer-avatar-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>

            <div className="customer-main-meta">
              <h2 className="customer-name">Mathew Philip</h2>
              <div className="customer-phone">+91 98470 12345</div>
            </div>

            <div className="customer-tax-meta">
              <div className="customer-gstin-row">
                <span className="gstin-label">GSTIN:</span>
                <span className="gstin-value">32AABCP9821K1ZK</span>
              </div>
              <div className="customer-address-row">
                <span className="address-square-bullet">▪</span>
                <span className="address-text">Panampilly Nagar, Kochi</span>
              </div>
            </div>

            <button type="button" className="btn-change-customer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 3 21 3 21 8" />
                <line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" />
                <line x1="15" y1="15" x2="21" y2="21" />
                <line x1="4" y1="4" x2="9" y2="9" />
              </svg>
              <span>Change<br />Customer</span>
            </button>
          </div>

          {/* Search, Filter & Quick Tools Bar */}
          <div className="pos-search-filter-row">
            <div className="pos-sku-search-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8C7B72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="barcode-icon">
                <path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14" />
              </svg>
              <input
                type="text"
                className="pos-sku-input"
                placeholder="Type SKU (e.g. KWF-TB-NT) or furni..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8C7B72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-glass-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            <button type="button" className="btn-timber-provenance">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A06A3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Timber Provenance</span>
            </button>

            <button type="button" className="btn-pos-tools" aria-label="POS Configuration Tools">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4A2E18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </button>
          </div>

          {/* Artisan Timber Lines Categories */}
          <div className="pos-categories-section">
            <span className="pos-categories-label">ARTISAN TIMBER LINES</span>
            <div className="pos-categories-grid">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  className={`pos-category-card ${activeCategory === cat.name ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat.name)}
                >
                  <div className="category-icon-wrap">{cat.icon}</div>
                  <span className="category-title">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Invoice Cart */}
          <div className="pos-cart-card">
            <div className="pos-cart-header">
              <div className="pos-cart-title-wrap">
                <span className="pos-cart-heading">Active Invoice Cart</span>
                <span className="pos-cart-count-pill">{totalItemsCount} Items</span>
              </div>
              <span className="pos-cart-tax-inv">TAX-INV #2024-KL-982</span>
            </div>

            {/* Cart Items List */}
            <div className="pos-cart-items-list">
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <div key={item.id} className="pos-cart-item-row">
                    <div className="pos-item-icon-box">
                      {item.icon}
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
                <div className="pos-empty-cart">
                  <p>Cart is empty. Select items from Artisan Timber Lines.</p>
                </div>
              )}
            </div>

            {/* Bottom Delivery & Packaging Banner */}
            <div className="pos-cart-bottom-banner">
              <div className="pos-delivery-tag">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="1" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                <span>Free Depot Delivery within 35km radius applied</span>
              </div>

              <button
                type="button"
                className="btn-packaging-note"
                onClick={() => setCustomNote(!customNote)}
              >
                + Add Custom Packaging Note
              </button>
            </div>

            {customNote && (
              <div className="pos-custom-note-input-wrap">
                <input
                  type="text"
                  placeholder="Enter custom packaging / transit note..."
                  className="pos-custom-note-input"
                />
              </div>
            )}
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
              <span className="summary-hsn-tag">HSN 9403</span>
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
                <span className="breakdown-label">GST (18%)</span>
                <span className="breakdown-value">
                  <span className="straight-rupee">₹</span>
                  {formatRupees(gst)}.00
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

            {/* Payment Mode Selection */}
            <div className="payment-mode-section">
              <span className="payment-mode-heading">PAYMENT MODE</span>
              <div className="payment-modes-grid">
                {/* Mode 1: UPI */}
                <button
                  type="button"
                  className={`payment-mode-btn ${paymentMode === 'UPI' ? 'active' : ''}`}
                  onClick={() => setPaymentMode('UPI')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <span>UPI</span>
                </button>

                {/* Mode 2: Card */}
                <button
                  type="button"
                  className={`payment-mode-btn ${paymentMode === 'Card' ? 'active' : ''}`}
                  onClick={() => setPaymentMode('Card')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                  <span>Card</span>
                </button>

                {/* Mode 3: Cash */}
                <button
                  type="button"
                  className={`payment-mode-btn ${paymentMode === 'Cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMode('Cash')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                  <span>Cash</span>
                </button>

                {/* Mode 4: Bank Transfer */}
                <button
                  type="button"
                  className={`payment-mode-btn ${paymentMode === 'Bank' ? 'active' : ''}`}
                  onClick={() => setPaymentMode('Bank')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="21" x2="21" y2="21" />
                    <line x1="6" y1="18" x2="6" y2="11" />
                    <line x1="10" y1="18" x2="10" y2="11" />
                    <line x1="14" y1="18" x2="14" y2="11" />
                    <line x1="18" y1="18" x2="18" y2="11" />
                    <polygon points="12 2 20 7 4 7" />
                  </svg>
                  <span>Bank Transfer</span>
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              className="btn-print-tax-invoice"
              onClick={handlePrint}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>{invoiceSuccess ? '✓ Invoice Saved & Printed' : 'Save & Print Tax Invoice'}</span>
            </button>

            {/* Secondary Actions */}
            <div className="pos-secondary-actions">
              <button
                type="button"
                className="btn-secondary-pos"
                onClick={handleHold}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                <span>{holdSuccess ? '✓ Held' : 'Hold Order'}</span>
              </button>

              <button
                type="button"
                className="btn-secondary-pos"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Challan Only</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
