import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import AddProduct from './AddProduct'
import './Products.css'

export default function Products({ initialViewMode = 'list' }) {
  const [viewMode, setViewMode] = useState(initialViewMode) // 'list' | 'add' | 'edit'
  const [editingProduct, setEditingProduct] = useState(null)
  const [previewProduct, setPreviewProduct] = useState(null)
  const [dossierOpen, setDossierOpen] = useState(false)
  const [deleteModalProduct, setDeleteModalProduct] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  const [products, setProducts] = useState(() => DataStore.getProducts())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  // Sync initial view mode when navigated from external button (e.g. Add Product from Stock Management)
  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode)
      if (initialViewMode === 'add') {
        setEditingProduct(null)
      }
    }
  }, [initialViewMode])

  // Pagination states: minimum 20 products per page
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Sync products on store update or MongoDB load
  useEffect(() => {
    const handleUpdate = () => {
      setProducts(DataStore.getProducts())
    }
    window.addEventListener('timber_store_updated', handleUpdate)

    const apiUrl = import.meta.env.VITE_API_URL || ''
    fetch(`${apiUrl}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products)
          DataStore.saveProducts(data.products)
        }
      })
      .catch(() => {})

    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  // Close drawer / modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDossierOpen(false)
        setDeleteModalProduct(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpenAddProduct = () => {
    setEditingProduct(null)
    setViewMode('add')
  }

  const handleOpenEditProduct = (product) => {
    setEditingProduct(product)
    setDossierOpen(false)
    setViewMode('edit')
  }

  const handleOpenPreview = (product) => {
    setPreviewProduct(product)
    setDossierOpen(true)
  }

  const handleCloseDossier = () => {
    setDossierOpen(false)
  }

  const handleProductSaved = (wasEdit = false) => {
    setProducts(DataStore.getProducts())
    if (wasEdit) {
      setViewMode('list')
      setEditingProduct(null)
      showToast('✓ Product updated successfully!')
    } else {
      showToast('✓ New product cataloged successfully! Form cleared.')
    }
  }

  const handleDeleteProduct = () => {
    if (!deleteModalProduct) return
    const prodName = deleteModalProduct.name
    DataStore.deleteProduct(deleteModalProduct.id || deleteModalProduct._id || deleteModalProduct.sku)
    setProducts(DataStore.getProducts())
    setDeleteModalProduct(null)
    if (previewProduct?.id === deleteModalProduct.id) {
      setDossierOpen(false)
    }
    showToast(`✓ "${prodName}" removed from catalog.`)
  }

  // If in Add or Edit mode, render AddProduct form
  if (viewMode === 'add' || viewMode === 'edit') {
    return (
      <AddProduct
        editProduct={editingProduct}
        onProductSaved={handleProductSaved}
        onCancel={() => {
          setViewMode('list')
          setEditingProduct(null)
        }}
      />
    )
  }

  // Dynamic Categories from live products
  const dynamicCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  )

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      activeCategory === 'All' ||
      (p.category || '').toLowerCase() === activeCategory.toLowerCase() ||
      (p.category || '').toLowerCase().includes(activeCategory.toLowerCase())

    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.woodSpecies || '').toLowerCase().includes(q)

    return matchesCat && matchesSearch
  })

  const getProductCode = (prod) => {
    if (prod?.code) {
      const d = String(prod.code).trim().replace(/\D/g, '')
      if (d) return d
    }
    if (prod?.sku) {
      const raw = String(prod.sku).trim()
      const d = raw.replace(/\D/g, '')
      if (d) return d
      if (raw.includes('•')) {
        return raw.split('•')[0].trim()
      }
      return raw
    }
    return '100'
  }

  const getProductInitials = (prod) => {
    if (!prod) return 'KW'
    const name = String(prod.name || prod.productName || 'Timber Product').trim()
    const parts = name.split(/\s+/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase() || 'KW'
  }


  // Products list for pagination
  const sortedProducts = filteredProducts

  // Dynamic Pagination calculations
  const totalItems = sortedProducts.length
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / itemsPerPage) : 0
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const startIndex = totalPages > 0 ? (safePage - 1) * itemsPerPage : 0
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedProducts = totalPages > 0 ? sortedProducts.slice(startIndex, endIndex) : []

  // Product Catalog KPI Metrics (Stock metrics removed per user requirement)
  const avgCatalogPrice = products.length > 0
    ? Math.round(
        products.reduce(
          (acc, p) => acc + (Number(String(p.sellingPrice || p.price || p.unitPrice || 0).replace(/[^0-9.]/g, '')) || 0),
          0
        ) / products.length
      )
    : 0

  return (
    <div className="products-page-container">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="products-toast-banner">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="products-header">
        <div className="products-title-wrap">
          <h1 className="products-main-title">Products</h1>
          <p className="products-main-subtitle">
            Manage timber species, artisan furniture inventory, and catalog pricing.
          </p>
        </div>

        <div className="products-header-actions">
          <button
            type="button"
            className="btn-print-products"
            onClick={() => window.print()}
            title="Print products table"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print</span>
          </button>

          <button
            type="button"
            className="btn-add-product-main"
            onClick={handleOpenAddProduct}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="products-kpi-grid">
        <div className="products-kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">TOTAL PRODUCTS</span>
            <span className="kpi-icon-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C88D58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </span>
          </div>
          <div className="kpi-value">{products.length}</div>
          <span className="kpi-sub">Active furniture & timber SKUs</span>
        </div>

        <div className="products-kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">WOOD CATEGORIES</span>
            <span className="kpi-icon-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
                <path d="M6 6h10" />
                <path d="M6 10h10" />
              </svg>
            </span>
          </div>
          <div className="kpi-value">{dynamicCategories.length} Categories</div>
          <span className="kpi-sub">Handcrafted collection lines</span>
        </div>

        <div className="products-kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">AVG CATALOG PRICE</span>
            <span className="kpi-icon-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C88D58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </span>
          </div>
          <div className="kpi-value">
            <span className="straight-rupee">₹</span>
            {avgCatalogPrice.toLocaleString('en-IN')}
          </div>
          <span className="kpi-sub">Standard unit price benchmark</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="products-controls-row">
        <div className="products-category-pills">
          <button
            type="button"
            className={`cat-pill-btn ${activeCategory === 'All' ? 'active' : ''}`}
            onClick={() => {
              setActiveCategory('All')
              setCurrentPage(1)
            }}
          >
            All ({products.length})
          </button>
          {dynamicCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`cat-pill-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat)
                setCurrentPage(1)
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="products-search-box">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8C7B72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="products-search-input"
            placeholder="Search products, SKU, wood species..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>


      </div>

      {/* Products Table Card */}
      <div className="products-table-card">
        <div className="products-table-wrapper">
          <table className="products-main-table">
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>CATEGORY</th>
                <th>WOOD SPECIES</th>
                <th>SELLING PRICE</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((prod) => {
                  const numSelling = Number(String(prod.sellingPrice || prod.unitPrice || prod.price || 0).replace(/[^0-9.]/g, '')) || 0

                  return (
                    <tr key={prod.id || prod.sku}>
                      <td>
                        <div className="product-name-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #E8D5C8', flexShrink: 0 }}
                            />
                          ) : null}
                          <span className="product-code-pill" title={`Product Code: ${getProductCode(prod)}`}>
                            {getProductCode(prod)}
                          </span>
                          <span className="product-display-name">{prod.name}</span>
                        </div>
                      </td>

                      <td>
                        <span className="product-category-badge">{prod.category || '-'}</span>
                      </td>

                      <td>
                        <span className="product-wood-tag">{prod.woodSpecies || '-'}</span>
                      </td>

                      <td>
                        <span className="product-price-val">
                          <span className="straight-rupee">₹</span>
                          {numSelling.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td>
                        <div className="product-actions-cell">
                          {/* Edit Button */}
                          <button
                            type="button"
                            className="btn-action-edit"
                            onClick={() => handleOpenEditProduct(prod)}
                            title="Edit product specifications"
                            aria-label="Edit"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Preview Button */}
                          <button
                            type="button"
                            className="btn-action-preview"
                            onClick={() => handleOpenPreview(prod)}
                            title="Preview product dossier"
                            aria-label="Preview"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            className="btn-action-delete"
                            onClick={() => setDeleteModalProduct(prod)}
                            title="Delete product"
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
                  )
                })
              ) : (
                <tr>
                  <td colSpan="5" className="products-no-results" style={{ textAlign: 'center', padding: '48px 20px', color: '#8C7E74' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🪵</div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#2C1810', marginBottom: '4px' }}>
                      {searchQuery ? `No products found matching "${searchQuery}"` : 'No timber products cataloged yet'}
                    </div>
                    <div style={{ fontSize: '0.85rem' }}>
                      Click &quot;+ Add Product&quot; to catalog your first timber item or import inventory.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="patron-table-footer">
          <div className="patron-footer-left">
            <span className="showing-records-text">
              Showing <strong>{filteredProducts.length > 0 ? (
                startIndex + 1 === endIndex
                  ? `${startIndex + 1}`
                  : `${startIndex + 1}-${endIndex}`
              ) : '0'}</strong> of {filteredProducts.length} products
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
            {totalPages > 0 && filteredProducts.length > 0 ? (
              Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
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

      {/* Product Dossier Drawer (Slide-Over Side Panel) */}
      {dossierOpen && previewProduct && (
        <div className="dossier-drawer-backdrop" onClick={handleCloseDossier}>
          <div className="dossier-drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="dossier-drawer-header">
              <div className="dossier-drawer-header-top">
                <div className="dossier-badge-wrap">
                  <span className="dossier-eyebrow">PRODUCT DOSSIER</span>
                  <span className="dossier-badge-pill">{previewProduct.category || '-'}</span>
                </div>
                <button
                  type="button"
                  className="dossier-close-btn"
                  onClick={handleCloseDossier}
                  aria-label="Close dossier"
                >
                  ✕
                </button>
              </div>

              {/* Profile Header Identity */}
              <div className="dossier-profile-header">
                <div className="dossier-avatar-large" style={{ overflow: 'hidden' }}>
                  {previewProduct.imageUrl ? (
                    <img src={previewProduct.imageUrl} alt={previewProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getProductInitials(previewProduct)
                  )}
                </div>
                <div className="dossier-name-block">
                  <h3 className="dossier-person-name">{previewProduct.name || '-'}</h3>
                  <div className="dossier-sku-pill">{previewProduct.sku || '-'}</div>
                </div>
              </div>
            </div>

            {/* Scrollable Drawer Body with All Real Product Details */}
            <div className="dossier-drawer-body">
              {/* Section 1: Wood & Finish Details */}
              <div className="dossier-section-box">
                <h4 className="dossier-section-heading">Wood & Material Details</h4>
                <div className="dossier-details-grid">
                  <div className="dossier-detail-row">
                    <span className="dossier-label">CATEGORY</span>
                    <span className="dossier-value">{previewProduct.category || '-'}</span>
                  </div>
                  <div className="dossier-detail-row">
                    <span className="dossier-label">WOOD SPECIES</span>
                    <span className="dossier-value bold-wood">{previewProduct.woodSpecies || '-'}</span>
                  </div>
                  <div className="dossier-detail-row">
                    <span className="dossier-label">SURFACE POLISH</span>
                    <span className="dossier-value">{previewProduct.surfacePolish || previewProduct.finish || '-'}</span>
                  </div>
                  <div className="dossier-detail-row full-width">
                    <span className="dossier-label">DESCRIPTION</span>
                    <span className="dossier-value desc-text">
                      {previewProduct.description || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Craft Specifications */}
              <div className="dossier-section-box">
                <h4 className="dossier-section-heading">Craft Specifications</h4>
                <div className="dossier-details-grid">
                  <div className="dossier-detail-row">
                    <span className="dossier-label">DIMENSIONS (L × W × H)</span>
                    <span className="dossier-value">
                      {previewProduct.dimensions && (previewProduct.dimensions.length || previewProduct.dimensions.width || previewProduct.dimensions.height)
                        ? `${previewProduct.dimensions.length || 0} × ${previewProduct.dimensions.width || 0} × ${previewProduct.dimensions.height || 0} cm`
                        : '-'}
                    </span>
                  </div>
                  <div className="dossier-detail-row">
                    <span className="dossier-label">WEIGHT</span>
                    <span className="dossier-value">
                      {previewProduct.dimensions?.weight ? `${previewProduct.dimensions.weight} kg` : '-'}
                    </span>
                  </div>
                  <div className="dossier-detail-row">
                    <span className="dossier-label">WOOD GRADE</span>
                    <span className="dossier-value">{previewProduct.woodGrade || '-'}</span>
                  </div>
                  <div className="dossier-detail-row">
                    <span className="dossier-label">WARRANTY</span>
                    <span className="dossier-value">{previewProduct.warranty || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Inventory & Logistics */}
              <div className="dossier-section-box">
                <h4 className="dossier-section-heading">Inventory & Yard Logistics</h4>
                <div className="dossier-details-grid">
                  <div className="dossier-detail-row">
                    <span className="dossier-label">CURRENT STOCK</span>
                    <span className="dossier-value stock-highlight">
                      {previewProduct.stockQuantity !== undefined ? previewProduct.stockQuantity : parseInt(previewProduct.stock) || 0} Units
                    </span>
                  </div>
                  <div className="dossier-detail-row">
                    <span className="dossier-label">LOW STOCK THRESHOLD</span>
                    <span className="dossier-value">
                      {previewProduct.lowStockThreshold !== undefined && previewProduct.lowStockThreshold !== ''
                        ? `${previewProduct.lowStockThreshold} Units`
                        : '-'}
                    </span>
                  </div>
                  <div className="dossier-detail-row">
                    <span className="dossier-label">YARD / DEPOT LOCATION</span>
                    <span className="dossier-value">{previewProduct.depotLocation || '-'}</span>
                  </div>
                  <div className="dossier-detail-row full-width">
                    <span className="dossier-label">PACKAGING TYPE</span>
                    <span className="dossier-value">{previewProduct.packagingType || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Pricing */}
              <div className="dossier-pricing-card">
                <div className="dossier-price-row-top" style={{ marginBottom: '8px' }}>
                  <span className="dossier-price-label">SELLING PRICE</span>
                  <span className="dossier-price-large">
                    <span className="straight-rupee">₹</span>
                    {Number(String(previewProduct.sellingPrice || previewProduct.unitPrice || previewProduct.price || 0).replace(/[^0-9.]/g, '')).toLocaleString('en-IN')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#6D5C52', borderTop: '1px solid rgba(200, 141, 88, 0.2)', paddingTop: '6px' }}>
                  <span>Cost Price:</span>
                  <strong>₹{Number(String(previewProduct.costPrice || 0).replace(/[^0-9.]/g, '')).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Action Buttons in Drawer - Close only per user requirement */}
              <div className="dossier-drawer-actions">
                <button
                  type="button"
                  className="btn-dossier-close-full"
                  onClick={handleCloseDossier}
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalProduct && (
        <div className="delete-modal-backdrop" onClick={() => setDeleteModalProduct(null)}>
          <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="delete-modal-title">Delete Wood Product?</h3>
            <p className="delete-modal-text">
              Are you sure you want to delete <strong>{deleteModalProduct.name}</strong> ({deleteModalProduct.sku})? This item will be removed from your active catalog and sales POS.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="btn-delete-cancel"
                onClick={() => setDeleteModalProduct(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete-confirm"
                onClick={handleDeleteProduct}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print-Only Products Table: hidden on screen, shows ONLY the full products table when printing */}
      <div className="products-print-only-wrapper" aria-hidden="true">
        <div className="printable-products-header">
          <h2>Products Catalog & Inventory</h2>
          <p>Total: {filteredProducts.length} Items • Date: {new Date().toLocaleDateString('en-GB')}</p>
        </div>

        <table className="printable-products-only-table">
          <thead>
            <tr>
              <th style={{ width: '36px', textAlign: 'center' }}>#</th>
              <th>Product Code</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Wood Species</th>
              <th style={{ textAlign: 'right' }}>Selling Price (₹)</th>
              <th style={{ textAlign: 'right' }}>Stock</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '16px' }}>
                  No products in catalog.
                </td>
              </tr>
            ) : (
              filteredProducts.map((p, idx) => {
                const numSelling = Number(String(p.sellingPrice || p.unitPrice || p.price || 0).replace(/[^0-9.]/g, '')) || 0
                return (
                  <tr key={p.id || p.sku || idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td><code>{getProductCode(p)}</code></td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.category || '-'}</td>
                    <td>{p.woodSpecies || '-'}</td>
                    <td style={{ textAlign: 'right' }}>₹{numSelling.toLocaleString('en-IN')}</td>
                    <td style={{ textAlign: 'right' }}>{p.stockQuantity !== undefined ? p.stockQuantity : '-'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
