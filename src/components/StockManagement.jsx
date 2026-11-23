import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './StockManagement.css'

const DEFAULT_PRODUCTS = []

const getProductCode = (prod) => {
  if (prod?.code) return String(prod.code).trim()
  if (prod?.sku) {
    const raw = String(prod.sku).trim()
    if (raw.includes('•')) return raw.split('•')[0].trim()
    return raw
  }
  return `KWF-${prod?.id || '101'}`
}

export default function StockManagement({ onAddNewProduct }) {
  const [activeTab, setActiveTab] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState(() => {
    const stored = DataStore.getProducts()
    return Array.isArray(stored) ? stored : []
  })

  // Listen to store updates
  useEffect(() => {
    const handleStoreUpdate = () => {
      const stored = DataStore.getProducts()
      if (Array.isArray(stored)) {
        setProducts(stored)
      }
    }
    window.addEventListener('timber_store_updated', handleStoreUpdate)
    return () => window.removeEventListener('timber_store_updated', handleStoreUpdate)
  }, [])

  // Dynamic Pagination states: Minimum 20 products per page
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  // Quick Stock In / Out Modal states
  const [quickStockOpen, setQuickStockOpen] = useState(false)
  const [quickProductId, setQuickProductId] = useState('')
  const [movementType, setMovementType] = useState('in') // 'in' or 'out'
  const [movementQty, setMovementQty] = useState(1)
  const [movementReason, setMovementReason] = useState('Nilambur Mill Yard Delivery')
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickSuccess, setQuickSuccess] = useState(false)

  const handleOpenQuickStock = () => {
    if (products.length > 0 && !quickProductId) {
      setQuickProductId(products[0].id)
    }
    setMovementType('in')
    setMovementQty(1)
    setMovementReason('Nilambur Mill Yard Delivery')
    setQuickSuccess(false)
    setQuickStockOpen(true)
  }

  const handleCloseQuickStock = () => {
    setQuickStockOpen(false)
  }

  const handleConfirmQuickMovement = async () => {
    const targetProduct = products.find((p) => p.id === quickProductId) || products[0]
    if (!targetProduct) return
    setQuickSaving(true)

    const change = Number(movementQty) || 1
    if (movementType === 'in') {
      DataStore.recordStockIn(targetProduct.id, change)
    } else {
      DataStore.recordStockOut(targetProduct.id, change)
    }

    const updatedList = DataStore.getProducts()
    setProducts(updatedList)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const updatedItem = updatedList.find((p) => p.id === targetProduct.id)
      if (updatedItem) {
        await fetch(`${apiUrl}/api/products/${encodeURIComponent(targetProduct.id || targetProduct.sku)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stockQuantity: updatedItem.stockQuantity,
            stockIn: updatedItem.stockIn,
            stockOut: updatedItem.stockOut,
          }),
        })
      }
    } catch (err) {
      console.warn('[StockManagement] Quick stock movement sync error:', err.message)
    } finally {
      setQuickSaving(false)
      setQuickSuccess(true)
      setTimeout(() => {
        handleCloseQuickStock()
      }, 700)
    }
  }

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || ''
    fetch(`${apiUrl}/api/products`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response not ok')
        return res.json()
      })
      .then((data) => {
        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          const localList = DataStore.getProducts()
          const merged = data.products.map((rp) => {
            const lp = localList.find((p) => p.id === rp.id || p.sku === rp.sku || p.name === rp.name)
            const stockOut = rp.stockOut !== undefined ? Number(rp.stockOut) : (lp?.stockOut !== undefined ? Number(lp.stockOut) : 0)
            const stockQty = rp.stockQuantity !== undefined ? Number(rp.stockQuantity) : (lp?.stockQuantity !== undefined ? Number(lp.stockQuantity) : 0)
            const stockIn = rp.stockIn !== undefined ? Number(rp.stockIn) : (lp?.stockIn !== undefined ? Number(lp.stockIn) : (stockQty + stockOut))
            return {
              ...rp,
              stockQuantity: stockQty,
              stockOut,
              stockIn,
            }
          })
          setProducts(merged)
          DataStore.saveProducts(merged)
          if (data.metrics) {
            setMetrics(data.metrics)
          }
        }
      })
      .catch((err) => {
        console.warn('[StockManagement] Backend API offline or unreachable, using fallback dataset:', err.message)
      })
  }, [])

  // Dynamic metrics computed directly from live products list
  const totalStockCount = products.reduce((acc, p) => {
    const qty = p.stockQuantity !== undefined ? Number(p.stockQuantity) : (parseInt(p.stock) || 0)
    return acc + (isNaN(qty) ? 0 : qty)
  }, 0)

  const inStockProductsCount = products.filter((p) => {
    const qty = p.stockQuantity !== undefined ? Number(p.stockQuantity) : (parseInt(p.stock) || 0)
    return qty > 0
  }).length

  const totalValuation = products.reduce((acc, p) => {
    const qty = p.stockQuantity !== undefined ? Number(p.stockQuantity) : (parseInt(p.stock) || 0)
    const price = Number(String(p.sellingPrice || p.price || p.unitPrice || 0).replace(/[^0-9]/g, '')) || 0
    return acc + (qty * price)
  }, 0)

  const totalValuationFormatted = totalValuation >= 10000000
    ? `₹${(totalValuation / 10000000).toFixed(2)} Cr`
    : totalValuation >= 100000
    ? `₹${(totalValuation / 100000).toFixed(2)} Lakhs`
    : `₹${totalValuation.toLocaleString('en-IN')}`

  const lowStockCount = products.filter((p) => {
    const qty = p.stockQuantity !== undefined ? Number(p.stockQuantity) : (parseInt(p.stock) || 0)
    const threshold = Number(p.lowStockThreshold || 2)
    return qty <= threshold
  }).length

  const dynamicCategories = Array.from(
    new Set([
      'Dining',
      'Beds',
      'Chairs',
      'Storage',
      ...products.map((p) => p.category).filter(Boolean),
    ])
  )

  const tabs = [
    { label: `All (${products.length})`, value: 'All' },
    ...dynamicCategories.map((cat) => ({
      label: cat,
      value: cat,
    })),
  ]

  const filteredProducts = products.filter((p) => {
    const matchesTab =
      activeTab === 'All' ||
      p.category.toLowerCase().includes(activeTab.toLowerCase()) ||
      activeTab.toLowerCase().includes(p.category.toLowerCase())
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  // Dynamic pagination calculations
  const totalItems = filteredProducts.length
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / itemsPerPage) : 0
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const startIndex = totalPages > 0 ? (safeCurrentPage - 1) * itemsPerPage : 0
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedProducts = totalPages > 0 ? filteredProducts.slice(startIndex, endIndex) : []

  const getPageNumbers = () => {
    if (totalPages === 0) return []
    const pages = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages)
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', safeCurrentPage, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <div className="stock-mgmt-container">
      {/* Page Header */}
      <div className="stock-page-header">
        <div className="stock-title-wrap">
          <h1 className="stock-main-title">Stock Management</h1>
          <p className="stock-main-subtitle">
            Manage products, current inventory levels, and warehouse pricing.
          </p>
        </div>

        <div className="stock-header-actions">
          <button
            type="button"
            className="btn-quick-stock"
            onClick={handleOpenQuickStock}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            <span>Quick Stock In / Out</span>
          </button>

          <button type="button" className="btn-add-product" onClick={onAddNewProduct}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Add New Wood Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stock-kpi-grid">
        {/* Total Stock Valuation */}
        <div className="stock-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-tag-label">TOTAL STOCK VALUATION</span>
            <span className="kpi-icon-gold">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
                <circle cx="17" cy="15" r="1" />
              </svg>
            </span>
          </div>
          <div className="kpi-metric-wrap">
            <span className="kpi-big-num">{totalValuationFormatted}</span>
            <span className="kpi-change-green">↗+6.4%</span>
          </div>
          <span className="kpi-footer-sub">Updated today across all depots</span>
        </div>

        {/* Available Finished Furniture */}
        <div className="stock-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-tag-label">AVAILABLE FINISHED FURNITURE</span>
            <span className="kpi-icon-dark">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
                <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2z" />
                <line x1="6" y1="18" x2="6" y2="21" />
                <line x1="18" y1="18" x2="18" y2="21" />
              </svg>
            </span>
          </div>
          <div className="kpi-metric-wrap">
            <span className="kpi-big-num">{inStockProductsCount} Products</span>
            <span className="kpi-suffix-gray">in stock</span>
          </div>
          <span className="kpi-footer-sub">Out of {products.length} total catalog items</span>
        </div>

        {/* Low Stock Items */}
        <div className="stock-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-tag-label alert">LOW STOCK ITEMS</span>
            <span className="kpi-icon-red">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
          </div>
          <div className="kpi-metric-wrap">
            <span className="kpi-big-num alert">{lowStockCount} SKUs</span>
            <span className="kpi-threshold-red">Below threshold</span>
          </div>
          <a
            href="#review"
            className="kpi-action-link-red"
            onClick={(e) => e.preventDefault()}
          >
            Review Indents →
          </a>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="filter-search-row">
        <div className="filter-tabs-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`filter-tab-pill ${activeTab === tab.value ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(tab.value)
                setCurrentPage(1)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="search-box-wrap">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9E8E85"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-box-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search products, SKUs..."
          />
        </div>
      </div>

      {/* Artisanal Stock Table Card */}
      <div className="stock-table-card">
        <div className="stock-table-scroll-wrap">
          <table className="stock-table">
            <thead>
              <tr>
                <th>PRODUCT CODE</th>
                <th>PRODUCT NAME</th>
                <th className="category-th">CATEGORY</th>
                <th>STOCK IN</th>
                <th>STOCK OUT</th>
                <th>AVAILABLE STOCK</th>
                <th className="price-th" style={{ textAlign: 'right' }}>PRICE</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '48px 20px', color: '#8C7E74' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#2C1810', marginBottom: '4px' }}>
                      {searchQuery ? `No stock items matching "${searchQuery}"` : 'No stock inventory items found'}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Add timber products in the Products page or create new inward inventory to see stock levels.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                const code = getProductCode(p)
                const stockQty = Number(p.stockQuantity !== undefined ? p.stockQuantity : parseInt(p.stock) || 0)
                const stockOutVal = Number(p.stockOut || 0)
                const stockInVal = Number(p.stockIn !== undefined ? p.stockIn : (stockQty + stockOutVal))
                const numPrice = Number(String(p.sellingPrice || p.price || 0).replace(/[^0-9.]/g, '')) || 0
                const threshold = Number(p.lowStockThreshold || 2)

                return (
                  <tr key={p.id || p.sku} className="stock-table-row">
                    <td>
                      <span className="product-code-pill" title={`Product Code: ${code}`}>
                        {code}
                      </span>
                    </td>
                    <td>
                      <span className="product-display-name-clean" title={p.name}>
                        {p.name}
                      </span>
                    </td>
                    <td className="category-cell">
                      <span className="stock-cat-pill">{p.category || '-'}</span>
                    </td>
                    <td>
                      <span className="badge-stock-in" title="Inward stock recorded from Product Page">
                        +{stockInVal} pcs
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge-stock-out ${stockOutVal > 0 ? 'has-out' : 'zero-out'}`}
                        title="Deducted through POS Billing orders"
                      >
                        -{stockOutVal} pcs
                      </span>
                    </td>
                    <td>
                      <span
                        className={`stock-badge ${
                          stockQty <= 1 ? 'critical' : stockQty <= threshold ? 'low' : 'in-stock'
                        }`}
                      >
                        {stockQty <= 1
                          ? `${stockQty} left (Critical)`
                          : stockQty <= threshold
                          ? `${stockQty} in stock (Low)`
                          : `${stockQty} in stock`}
                      </span>
                    </td>
                    <td className="price-cell" style={{ textAlign: 'right' }}>
                      <span className="straight-rupee">₹</span>
                      {numPrice.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )
              }))}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        <div className="patron-table-footer">
          <div className="patron-footer-left">
            <span className="showing-records-text">
              Showing <strong>{totalItems > 0 ? (
                startIndex + 1 === endIndex
                  ? `${startIndex + 1}`
                  : `${startIndex + 1}-${endIndex}`
              ) : '0'}</strong> of {totalItems} products
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
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1 || totalPages <= 1}
            >
              ‹
            </button>
            {totalPages > 0 && totalItems > 0 ? (
              getPageNumbers().map((pageNum, idx) =>
                pageNum === '...' ? (
                  <span key={`dots-${idx}`} className="pagination-dots">
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${pageNum}`}
                    type="button"
                    className={`pagination-num ${safeCurrentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )
              )
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
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages || totalPages <= 1}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Compliance Info Banner */}
      <div className="compliance-banner">
        <div className="compliance-left">
          <span className="compliance-icon">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A0724A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <span>
            All timber lots are FSC-certified and compliant with Sivakasi Forest Department
            guidelines.
          </span>
        </div>
        <a
          href="#compliance"
          className="compliance-link"
          onClick={(e) => e.preventDefault()}
        >
          View Compliance Info →
        </a>
      </div>



      {/* Quick Stock In / Out Modal */}
      {quickStockOpen && (
        <div className="quick-modal-backdrop" onClick={handleCloseQuickStock}>
          <div
            className="quick-modal-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="quick-modal-header">
              <div className="quick-header-left">
                <span className="drawer-badge-tag">DEPOT INVENTORY WORKFLOW</span>
                <h3 className="quick-modal-title">Quick Stock In / Out</h3>
                <p className="quick-modal-subtitle">
                  Record immediate timber inward lots or warehouse dispatch deductions
                </p>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={handleCloseQuickStock}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="quick-modal-body">
              {/* Movement Type Toggle */}
              <div className="movement-toggle-row">
                <button
                  type="button"
                  className={`movement-toggle-btn ${movementType === 'in' ? 'active-in' : ''}`}
                  onClick={() => setMovementType('in')}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <polyline points="19 12 12 19 5 12" />
                  </svg>
                  <span>Stock In (Inward)</span>
                </button>
                <button
                  type="button"
                  className={`movement-toggle-btn ${movementType === 'out' ? 'active-out' : ''}`}
                  onClick={() => setMovementType('out')}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                  <span>Stock Out (Dispatch)</span>
                </button>
              </div>

              {/* Select Product */}
              <div className="drawer-form-group">
                <label className="drawer-field-label">Select Wood Product</label>
                <select
                  className="drawer-input-styled"
                  value={quickProductId}
                  onChange={(e) => setQuickProductId(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current vs Projected Reserve Preview */}
              {(() => {
                const sel = products.find((p) => p.id === quickProductId) || products[0]
                const cur = sel
                  ? sel.stockQuantity !== undefined
                    ? sel.stockQuantity
                    : parseInt(sel.stock) || 0
                  : 0
                const chg = Number(movementQty) || 0
                const next = movementType === 'in' ? chg : Math.max(0, cur - chg)
                return (
                  <div>
                    <div className="quick-preview-box">
                      <div className="preview-stat">
                        <span className="preview-label">CURRENT RESERVE</span>
                        <span className="preview-val">{cur} units</span>
                      </div>
                      <span className="preview-arrow">
                        {movementType === 'in' ? '→' : '−'} {chg} →
                      </span>
                      <div className="preview-stat">
                        <span className="preview-label">NEW BALANCE</span>
                        <span
                          className={`preview-val highlight ${
                            next <= 1 ? 'critical' : next <= 2 ? 'low' : ''
                          }`}
                        >
                          {next} units
                        </span>
                      </div>
                    </div>
                    {movementType === 'in' && (
                      <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '6px', fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                        ✓ Reset Cycle: Stock In will be +{chg} pcs and Stock Out resets to 0 pcs.
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Quantity Stepper */}
              <div className="drawer-form-group">
                <label className="drawer-field-label">
                  {movementType === 'in'
                    ? 'Inward Stock Quantity (Resets Stock Out to 0)'
                    : 'Dispatch Quantity to Deduct'}
                </label>
                <div className="stepper-row">
                  <button
                    type="button"
                    className="stepper-btn minus"
                    onClick={() => setMovementQty((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="stepper-input"
                    value={movementQty}
                    onChange={(e) => setMovementQty(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                  />
                  <button
                    type="button"
                    className="stepper-btn plus"
                    onClick={() => setMovementQty((q) => q + 1)}
                  >
                    +
                  </button>
                </div>

                {/* Quick Chips for Adjustment */}
                <div className="quick-chip-row">
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setMovementQty(1)}
                  >
                    1 Unit
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setMovementQty(5)}
                  >
                    5 Units
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setMovementQty(10)}
                  >
                    10 Mill Lot
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setMovementQty(25)}
                  >
                    25 Bulk
                  </button>
                </div>
              </div>

              {/* Movement Reason */}
              <div className="drawer-form-group">
                <label className="drawer-field-label">Audit / Movement Reference</label>
                <input
                  type="text"
                  className="drawer-input-styled"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="e.g. Nilambur Mill Lot Receipt #KWF-884"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="drawer-footer">
              <button
                type="button"
                className="btn-drawer-cancel"
                onClick={handleCloseQuickStock}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn-drawer-save ${
                  movementType === 'out' ? 'btn-dispatch-save' : ''
                }`}
                onClick={handleConfirmQuickMovement}
                disabled={quickSaving}
              >
                {quickSuccess
                  ? '✓ Movement Logged!'
                  : quickSaving
                  ? 'Updating...'
                  : movementType === 'in'
                  ? '✓ Add Inward Stock'
                  : '✓ Deduct Dispatch Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
