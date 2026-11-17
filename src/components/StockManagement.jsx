import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './StockManagement.css'

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'Nilambur Teak 6-Seater Dining Set',
    sku: 'KWF-TB-NT-06 • Nilambur Teak',
    category: 'Dining',
    stock: '2 in stock (Low)',
    stockType: 'low',
    price: '₹54,000',
  },
  {
    id: 2,
    name: 'Solid Rosewood Royal King Bed',
    sku: 'KWF-BD-RW-K01 • Sivakasi Rosewood',
    category: 'Beds',
    stock: '1 left (Critical)',
    stockType: 'critical',
    price: '₹78,000',
  },
  {
    id: 3,
    name: 'Teak Ergonomic Armchair',
    sku: 'KWF-AC-TK-09 • Nilambur Teak',
    category: 'Chairs',
    stock: '3 in stock',
    stockType: 'in-stock',
    price: '₹14,500',
  },
  {
    id: 4,
    name: 'Handcrafted Cane Bookcase',
    sku: 'KWF-SH-CN-03 • Bamboo & Mahogany',
    category: 'Storage',
    stock: '2 in stock (Low)',
    stockType: 'low',
    price: '₹18,500',
  },
  {
    id: 5,
    name: 'Anjili Heritage Brass Chest',
    sku: 'KWF-CT-AN-14 • Anjili Wild Timber',
    category: 'Storage',
    stock: '7 in stock',
    stockType: 'in-stock',
    price: '₹22,500',
  },
  {
    id: 6,
    name: 'Jackfruit Live-Edge Boardroom Desk',
    sku: 'KWF-DK-JK-02 • Old-Growth Plavu',
    category: 'Tables',
    stock: '4 in stock',
    stockType: 'in-stock',
    price: '₹95,000',
  },
]

export default function StockManagement({ onAddNewProduct }) {
  const [activeTab, setActiveTab] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState(DEFAULT_PRODUCTS)
  const [metrics, setMetrics] = useState({
    totalStock: '3,892',
    totalValuationFormatted: '₹1.42 Cr',
    lowStockCount: '6 SKUs',
    categoryCounts: { All: 148, Dining: 0, Beds: 0, Chairs: 0, Storage: 0 },
  })

  // Dynamic Pagination states
  const [itemsPerPage, setItemsPerPage] = useState(6)
  const [currentPage, setCurrentPage] = useState(1)

  // Quick Stock In / Out Modal states
  const [quickStockOpen, setQuickStockOpen] = useState(false)
  const [quickProductId, setQuickProductId] = useState('')
  const [movementType, setMovementType] = useState('in') // 'in' or 'out'
  const [movementQty, setMovementQty] = useState(1)
  const [movementReason, setMovementReason] = useState('Nilambur Mill Yard Delivery')
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickSuccess, setQuickSuccess] = useState(false)

  // Stock Edit Drawer / Dossier states
  const [editingProduct, setEditingProduct] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editQuantity, setEditQuantity] = useState(0)
  const [editThreshold, setEditThreshold] = useState(2)
  const [editPrice, setEditPrice] = useState('')
  const [editBay, setEditBay] = useState('Bay C-04 / Shed 2')
  const [isUpdating, setIsUpdating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

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

    const currentQty =
      targetProduct.stockQuantity !== undefined
        ? targetProduct.stockQuantity
        : parseInt(targetProduct.stock) || 0
    const change = Number(movementQty) || 0
    const newQty = movementType === 'in' ? currentQty + change : Math.max(0, currentQty - change)
    const threshold = targetProduct.lowStockThreshold || 2

    let stockType = 'in-stock'
    let stockLabel = `${newQty} in stock`
    if (newQty <= 1) {
      stockType = 'critical'
      stockLabel = `${newQty} left (Critical)`
    } else if (newQty <= threshold) {
      stockType = 'low'
      stockLabel = `${newQty} in stock (Low)`
    }

    const updatedProduct = {
      ...targetProduct,
      stockQuantity: newQty,
      stock: stockLabel,
      stockType,
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === targetProduct.id ? updatedProduct : p))
    )

    DataStore.updateStock(targetProduct.id, newQty)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      await fetch(`${apiUrl}/api/products/${targetProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockQuantity: newQty,
        }),
      })

      const refreshRes = await fetch(`${apiUrl}/api/products`)
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        if (refreshData?.success && Array.isArray(refreshData.products)) {
          setProducts(refreshData.products)
          if (refreshData.metrics) setMetrics(refreshData.metrics)
        }
      }
    } catch (err) {
      console.warn('[StockManagement] Quick stock movement PUT error:', err.message)
    } finally {
      setQuickSaving(false)
      setQuickSuccess(true)
      setTimeout(() => {
        handleCloseQuickStock()
      }, 700)
    }
  }

  const handleOpenEditDrawer = (product) => {
    setEditingProduct(product)
    const rawQty =
      product.stockQuantity !== undefined
        ? product.stockQuantity
        : parseInt(product.stock) || 0
    setEditQuantity(rawQty)
    setEditThreshold(product.lowStockThreshold || 2)
    setEditPrice(product.rawPrice || product.price?.replace(/[^0-9]/g, '') || '54000')
    setEditBay(product.warehouseBay || 'Bay C-04 / Shed 2')
    setSaveSuccess(false)
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setEditingProduct(null)
  }

  const handleSaveStock = async () => {
    if (!editingProduct) return
    setIsUpdating(true)

    const qty = Math.max(0, Number(editQuantity) || 0)
    const threshold = Math.max(0, Number(editThreshold) || 2)
    const numPrice = Number(String(editPrice).replace(/[^0-9.]/g, '')) || 0

    let stockType = 'in-stock'
    let stockLabel = `${qty} in stock`
    if (qty <= 1) {
      stockType = 'critical'
      stockLabel = `${qty} left (Critical)`
    } else if (qty <= threshold) {
      stockType = 'low'
      stockLabel = `${qty} in stock (Low)`
    }

    const updatedProduct = {
      ...editingProduct,
      stockQuantity: qty,
      lowStockThreshold: threshold,
      stock: stockLabel,
      stockType,
      price: '₹' + numPrice.toLocaleString('en-IN'),
      rawPrice: numPrice,
      warehouseBay: editBay,
    }

    // Immediately update local state so table updates in real time
    setProducts((prev) =>
      prev.map((p) => (p.id === editingProduct.id ? updatedProduct : p))
    )

    DataStore.updateStock(editingProduct.id, qty)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      await fetch(`${apiUrl}/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockQuantity: qty,
          lowStockThreshold: threshold,
          sellingPrice: numPrice,
          warehouseBay: editBay,
        }),
      })

      // Refresh product list and metrics from API
      const refreshRes = await fetch(`${apiUrl}/api/products`)
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json()
        if (refreshData?.success && Array.isArray(refreshData.products)) {
          setProducts(refreshData.products)
          if (refreshData.metrics) setMetrics(refreshData.metrics)
        }
      }
    } catch (err) {
      console.warn('[StockManagement] PUT update fallback to local state:', err.message)
    } finally {
      setIsUpdating(false)
      setSaveSuccess(true)
      setTimeout(() => {
        handleCloseDrawer()
      }, 700)
    }
  }

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    fetch(`${apiUrl}/api/products`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response not ok')
        return res.json()
      })
      .then((data) => {
        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products)
          if (data.metrics) {
            setMetrics(data.metrics)
          }
        }
      })
      .catch((err) => {
        console.warn('[StockManagement] Backend API offline or unreachable, using fallback dataset:', err.message)
      })
  }, [])

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
    { label: `All (${metrics.categoryCounts?.All || products.length || 148})`, value: 'All' },
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
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

  const getPageNumbers = () => {
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
          <span className="stock-category-pill">STOCK MANAGEMENT</span>
          <h1 className="stock-main-title">Artisanal Stock & Timber Reserves</h1>
          <p className="stock-main-subtitle">
            Manage indigenous hardwood stock, kiln seasoning logs, warehouse allocations,
            and unit pricing across Sivakasi's master artisan yards and coastal mill hubs.
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
            <span>+ Add New Wood Product</span>
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
            <span className="kpi-big-num">{metrics.totalValuationFormatted || '₹1.42 Cr'}</span>
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
            <span className="kpi-big-num">{metrics.totalStock || '3,892'}</span>
            <span className="kpi-suffix-gray">Pcs in inventory</span>
          </div>
          <span className="kpi-footer-sub">Active across 3 warehouses</span>
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
            <span className="kpi-big-num alert">{metrics.lowStockCount || '6 SKUs'}</span>
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
                <th>PRODUCT</th>
                <th>CATEGORY</th>
                <th>STOCK LEVEL</th>
                <th>PRICE</th>
                <th className="actions-th">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((p) => (
                <tr
                  key={p.id}
                  className="stock-table-row"
                  onClick={() => handleOpenEditDrawer(p)}
                >
                  <td>
                    <div className="product-cell">
                      <div className="product-details">
                        <span className="product-title">{p.name}</span>
                        <span className="product-sku-wood">{p.sku}</span>
                      </div>
                    </div>
                  </td>
                  <td className="category-cell">{p.category}</td>
                  <td>
                    <span className={`stock-badge ${p.stockType}`}>{p.stock}</span>
                  </td>
                  <td className="price-cell">{p.price}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn-edit-product"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEditDrawer(p)
                      }}
                      title="Edit Stock & Pricing"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Row */}
        <div className="stock-pagination-bar">
          <div className="stock-pagination-info">
            <span>
              Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} artisanal furniture SKUs
            </span>
            <span>•</span>
            <select
              className="per-ledger-dropdown"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value={6}>6 per ledger</option>
              <option value={12}>12 per ledger</option>
              <option value={24}>24 per ledger</option>
            </select>
          </div>

          <div className="stock-pagination-controls">
            <button
              type="button"
              className="stock-page-btn arrow"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage <= 1}
            >
              ‹
            </button>
            {getPageNumbers().map((pageNum, idx) =>
              pageNum === '...' ? (
                <span key={`dots-${idx}`} className="stock-page-dots">
                  ...
                </span>
              ) : (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  className={`stock-page-btn ${safeCurrentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            )}
            <button
              type="button"
              className="stock-page-btn arrow"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage >= totalPages}
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

      {/* Dossier / Stock Edit Drawer */}
      {drawerOpen && editingProduct && (
        <div className="stock-drawer-backdrop" onClick={handleCloseDrawer}>
          <div
            className="stock-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div className="drawer-header">
              <div className="drawer-header-left">
                <span className="drawer-badge-tag">STOCK REALLOCATION DOSSIER</span>
                <h3 className="drawer-product-title">{editingProduct.name}</h3>
                <span className="drawer-sku-label">{editingProduct.sku}</span>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={handleCloseDrawer}
                aria-label="Close dossier"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div className="drawer-body">
              {/* Current Status Card */}
              <div className="drawer-status-card">
                <span className="drawer-card-label">CURRENT RESERVE STATUS</span>
                <div className="drawer-status-row">
                  <div className="status-live-counter">
                    <span className="live-counter-number">{editQuantity}</span>
                    <span className="live-counter-unit">Units in Yard</span>
                  </div>
                  <span
                    className={`stock-badge ${
                      editQuantity <= 1
                        ? 'critical'
                        : editQuantity <= editThreshold
                        ? 'low'
                        : 'in-stock'
                    }`}
                  >
                    {editQuantity <= 1
                      ? `${editQuantity} left (Critical)`
                      : editQuantity <= editThreshold
                      ? `${editQuantity} in stock (Low)`
                      : `${editQuantity} in stock`}
                  </span>
                </div>
              </div>

              {/* Stock Quantity Stepper */}
              <div className="drawer-form-group">
                <label className="drawer-field-label">Available Stock Quantity (Units)</label>
                <div className="stepper-row">
                  <button
                    type="button"
                    className="stepper-btn minus"
                    onClick={() => setEditQuantity((q) => Math.max(0, q - 1))}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="stepper-input"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <button
                    type="button"
                    className="stepper-btn plus"
                    onClick={() => setEditQuantity((q) => q + 1)}
                  >
                    +
                  </button>
                </div>

                {/* Quick Increment Chips */}
                <div className="quick-chip-row">
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setEditQuantity((q) => q + 1)}
                  >
                    +1 Inward
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setEditQuantity((q) => q + 5)}
                  >
                    +5 Batch
                  </button>
                  <button
                    type="button"
                    className="quick-chip"
                    onClick={() => setEditQuantity((q) => q + 10)}
                  >
                    +10 Mill Lot
                  </button>
                  <button
                    type="button"
                    className="quick-chip dispatch"
                    onClick={() => setEditQuantity((q) => Math.max(0, q - 1))}
                  >
                    −1 Dispatch
                  </button>
                </div>
              </div>

              {/* Threshold & Selling Price */}
              <div className="drawer-form-row-2col">
                <div className="drawer-form-group">
                  <label className="drawer-field-label">Low Stock Threshold</label>
                  <input
                    type="number"
                    className="drawer-input-styled"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                <div className="drawer-form-group">
                  <label className="drawer-field-label">Selling Price (₹)</label>
                  <input
                    type="text"
                    className="drawer-input-styled"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
              </div>

              {/* Warehouse Bay */}
              <div className="drawer-form-group">
                <label className="drawer-field-label">Depot Warehouse Bay / Shed Allocation</label>
                <input
                  type="text"
                  className="drawer-input-styled"
                  value={editBay}
                  onChange={(e) => setEditBay(e.target.value)}
                  placeholder="e.g. Bay C-04 / Shed 2"
                />
              </div>

              {/* Compliance & Audit Note */}
              <div className="drawer-fsc-note">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#A0724A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span>Stock movement logged to Sivakasi Forest Dept & FSC transit audit trail.</span>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="drawer-footer">
              <button
                type="button"
                className="btn-drawer-cancel"
                onClick={handleCloseDrawer}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-drawer-save"
                onClick={handleSaveStock}
                disabled={isUpdating}
              >
                {saveSuccess ? '✓ Stock Updated!' : isUpdating ? 'Saving...' : '✓ Update Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                      {p.name} ({p.sku}) — {p.stock}
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
                const next = movementType === 'in' ? cur + chg : Math.max(0, cur - chg)
                return (
                  <div className="quick-preview-box">
                    <div className="preview-stat">
                      <span className="preview-label">CURRENT RESERVE</span>
                      <span className="preview-val">{cur} units</span>
                    </div>
                    <span className="preview-arrow">
                      {movementType === 'in' ? '+' : '−'} {chg} →
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
                )
              })()}

              {/* Quantity Stepper */}
              <div className="drawer-form-group">
                <label className="drawer-field-label">
                  {movementType === 'in'
                    ? 'Inward Quantity to Add'
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
