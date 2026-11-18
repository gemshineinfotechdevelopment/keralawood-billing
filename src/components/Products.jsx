import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import AddProduct from './AddProduct'
import './Products.css'

export default function Products() {
  const [viewMode, setViewMode] = useState('list') // 'list' | 'add' | 'edit'
  const [editingProduct, setEditingProduct] = useState(null)
  const [previewProduct, setPreviewProduct] = useState(null)
  const [dossierOpen, setDossierOpen] = useState(false)
  const [deleteModalProduct, setDeleteModalProduct] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  const [products, setProducts] = useState(() => DataStore.getProducts())
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [printCatalogOpen, setPrintCatalogOpen] = useState(false)

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

  const handleProductSaved = () => {
    setProducts(DataStore.getProducts())
    setViewMode('list')
    setEditingProduct(null)
    showToast(editingProduct ? '✓ Product updated successfully!' : '✓ New product cataloged successfully!')
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
    if (prod?.code) return String(prod.code).trim()
    if (prod?.sku) {
      const raw = String(prod.sku).trim()
      if (raw.includes('•')) {
        return raw.split('•')[0].trim()
      }
      return raw
    }
    return `KWF-${prod?.id || '101'}`
  }

  // Reliable cross-browser catalog print
  const handlePrintCatalog = () => {
    const printEl = document.getElementById('printable-products-catalog')
    if (!printEl) {
      window.print()
      return
    }

    const existing = document.getElementById('catalog-print-iframe')
    if (existing) existing.remove()

    const iframe = document.createElement('iframe')
    iframe.id = 'catalog-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kerala Wood Furniture — Master Products Catalog</title>
          <style>
            @page { size: A4 portrait; margin: 14mm 16mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            body { background: #FFFFFF; color: #31190B; padding: 0; font-size: 12px; line-height: 1.5; }

            /* Header Section */
            .catalog-print-top {
              display: flex; justify-content: space-between; align-items: flex-start;
              border-bottom: 3px solid #31190B; padding-bottom: 14px; margin-bottom: 20px;
            }
            .catalog-print-brand h2 {
              margin: 0 0 6px 0; font-size: 20px; font-weight: 800; color: #31190B;
              letter-spacing: -0.02em;
            }
            .catalog-print-brand p { margin: 3px 0; font-size: 11px; color: #5C4537; line-height: 1.4; }
            .catalog-print-meta { text-align: right; font-size: 11px; color: #5C4537; min-width: 180px; }
            .catalog-print-badge {
              display: inline-block; background: #31190B !important; color: #FFFFFF !important;
              font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
              padding: 4px 10px; border-radius: 4px; margin-bottom: 8px;
            }
            .catalog-print-meta p { margin: 3px 0; }

            /* Table Styling */
            .catalog-print-table {
              width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px;
              border: 1px solid #D3C4B8;
            }
            .catalog-print-table th {
              background-color: #3D2114 !important; color: #FFFFFF !important;
              font-weight: 700; text-align: left; padding: 10px 12px;
              border-bottom: 2px solid #31190B; font-size: 10px;
              letter-spacing: 0.05em; text-transform: uppercase;
            }
            .catalog-print-table th:last-child { text-align: right; }
            .catalog-print-table td {
              padding: 9px 12px; border-bottom: 1px solid #EDE3DB; color: #31190B;
              vertical-align: middle;
            }
            .catalog-print-table tbody tr:nth-child(even) td {
              background-color: #FAF6F2 !important;
            }
            .catalog-print-table tbody tr:hover td { background-color: #F5EDE5 !important; }
            .catalog-print-num { font-weight: 700; color: #8C5325; width: 28px; text-align: center; }
            .catalog-print-code code {
              font-family: 'Consolas', 'Courier New', monospace; font-weight: 700; font-size: 10.5px;
              color: #5C3A21; background: #F3EAE2 !important; padding: 3px 7px;
              border-radius: 4px; border: 1px solid #E2D5C9; white-space: nowrap;
            }
            .catalog-print-name strong { font-size: 11.5px; color: #31190B; font-weight: 600; }
            .catalog-print-cat { color: #6D5C52; font-size: 10.5px; }
            .catalog-print-wood { color: #5C3A21; font-weight: 600; font-size: 10.5px; }
            .catalog-print-price {
              font-weight: 800; color: #31190B; text-align: right; font-size: 12px;
              font-family: 'Segoe UI', Arial, sans-serif; white-space: nowrap;
            }

            /* Footer Section */
            .catalog-print-footer {
              display: flex; justify-content: space-between; align-items: flex-start;
              margin-top: 20px; border-top: 2px solid #D3C4B8;
              padding-top: 16px; page-break-inside: avoid;
            }
            .catalog-print-terms { max-width: 60%; font-size: 10px; color: #7D6C63; line-height: 1.5; }
            .catalog-print-terms strong { color: #31190B; }
            .catalog-print-sign { text-align: right; font-size: 11px; color: #31190B; }
            .catalog-print-sign p { margin: 2px 0; }
            .catalog-print-sign-space { height: 40px; border-bottom: 1px solid #C4B5A8; width: 160px; margin-left: auto; margin-top: 4px; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          ${printEl.innerHTML}
        </body>
      </html>
    `)
    doc.close()

    setTimeout(() => {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
      setTimeout(() => {
        iframe.remove()
      }, 1000)
    }, 250)
  }

  // Products list for pagination
  const sortedProducts = filteredProducts

  // Dynamic Pagination calculations
  const totalItems = sortedProducts.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const startIndex = (safePage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)
  const paginatedProducts = sortedProducts.slice(startIndex, endIndex)

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
            className="btn-print-catalog-main"
            onClick={() => setPrintCatalogOpen(true)}
            title="Print master product price & specification catalog"
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
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print Catalog</span>
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
                <th>UNIT PRICE</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length > 0 ? (
                paginatedProducts.map((prod) => {
                  const numPrice = Number(String(prod.sellingPrice || prod.unitPrice || prod.price || 0).replace(/[^0-9.]/g, '')) || 0

                  return (
                    <tr key={prod.id || prod.sku}>
                      <td>
                        <div className="product-name-cell">
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
                          {numPrice.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td>
                        <div className="product-actions-cell">
                          {/* Preview Button - Symbol only */}
                          <button
                            type="button"
                            className="btn-action-preview"
                            onClick={() => handleOpenPreview(prod)}
                            title="Preview product dossier"
                            aria-label="Preview"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          {/* Edit Button - Symbol only */}
                          <button
                            type="button"
                            className="btn-action-edit"
                            onClick={() => handleOpenEditProduct(prod)}
                            title="Edit product specifications"
                            aria-label="Edit"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>

                          {/* Delete Button - Symbol only */}
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
                  <td colSpan="5" className="products-no-results">
                    No products found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="products-table-footer">
          <div className="footer-left-info">
            <span className="showing-records-text">
              Showing <strong>{filteredProducts.length > 0 ? `${startIndex + 1}-${endIndex}` : '0-0'}</strong> of <strong>{filteredProducts.length}</strong> Products
            </span>
            <span className="footer-pipe">•</span>
            <div className="per-page-wrap">
              <span className="per-page-label">Rows:</span>
              <select
                className="per-page-select"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
              >
                <option value={20}>20 per page</option>
                <option value={40}>40 per page</option>
                <option value={60}>60 per page</option>
              </select>
            </div>
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="pagination-btn arrow"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`pagination-btn ${safePage === num ? 'active' : ''}`}
                onClick={() => setCurrentPage(num)}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="pagination-btn arrow"
              disabled={safePage >= totalPages}
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
                <div className="dossier-avatar-large">
                  {getProductInitials(previewProduct)}
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
                <div className="dossier-price-row-top" style={{ marginBottom: 0 }}>
                  <span className="dossier-price-label">UNIT CATALOG PRICE</span>
                  <span className="dossier-price-large">
                    <span className="straight-rupee">₹</span>
                    {Number(String(previewProduct.sellingPrice || previewProduct.unitPrice || previewProduct.price || 0).replace(/[^0-9.]/g, '')).toLocaleString('en-IN')}
                  </span>
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
      {/* Printable Products Catalog Modal */}
      {printCatalogOpen && (
        <div className="catalog-modal-overlay" onClick={() => setPrintCatalogOpen(false)}>
          <div className="catalog-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="catalog-modal-header">
              <div className="catalog-modal-header-info">
                <h3>Kerala Wood Furniture — Master Products Catalog</h3>
                <p>Official Depot Catalog • {products.length} Products with Codes, Categories, Species & Pricing</p>
              </div>
              <div className="catalog-modal-header-actions">
                <button
                  type="button"
                  className="btn-print-catalog-now"
                  onClick={handlePrintCatalog}
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  type="button"
                  className="btn-catalog-modal-close"
                  onClick={() => setPrintCatalogOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="catalog-printable-sheet" id="printable-products-catalog">
              <div className="catalog-print-top">
                <div className="catalog-print-brand">
                  <h2>Kerala Wood Furniture — Sivakasi Central Depot</h2>
                  <p>Master Timber & Artisan Furniture Product Catalog</p>
                  <p>Depot Address: Sivakasi Central Depot & Mill Yard, Sivakasi</p>
                  <p>Phone: +91 94431 52088 • GSTIN: 33AABCK8921M1Z5</p>
                </div>
                <div className="catalog-print-meta">
                  <div className="catalog-print-badge">PRICE & SPEC CATALOG</div>
                  <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                  <p><strong>Total Items:</strong> {products.length} Products</p>
                </div>
              </div>

              <table className="catalog-print-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product Code</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Wood Species</th>
                    <th style={{ textAlign: 'right' }}>Unit Price (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, idx) => {
                    const numPrice = Number(String(p.sellingPrice || p.unitPrice || p.price || 0).replace(/[^0-9.]/g, '')) || 0
                    return (
                      <tr key={p.id || p.sku || idx}>
                        <td className="catalog-print-num">{idx + 1}</td>
                        <td className="catalog-print-code">
                          <code>{getProductCode(p)}</code>
                        </td>
                        <td className="catalog-print-name">
                          <strong>{p.name}</strong>
                        </td>
                        <td className="catalog-print-cat">{p.category || '-'}</td>
                        <td className="catalog-print-wood">{p.woodSpecies || '-'}</td>
                        <td className="catalog-print-price" style={{ textAlign: 'right' }}>
                          ₹{numPrice.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div className="catalog-print-footer">
                <div className="catalog-print-terms">
                  <p><strong>Note:</strong> Prices are ex-depot Sivakasi. Custom timber finishes and mortise-tenon joinery are subject to standard artisanal warranty.</p>
                </div>
                <div className="catalog-print-sign">
                  <p>For Kerala Wood Furniture</p>
                  <div className="catalog-print-sign-space" />
                  <p>Authorized Depot Manager</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
