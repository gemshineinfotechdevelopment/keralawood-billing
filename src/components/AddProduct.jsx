import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './AddProduct.css'

const DEFAULT_CATEGORIES = [
  'Dining Sets & Tables',
  'Beds & Bedroom',
  'Armchairs & Seating',
  'Storage & Bookcases',
  'Executive Desks & Tables',
]

export default function AddProduct({ onProductSaved }) {
  // Settings sync (for dynamic GST and Depot defaults)
  const [settings, setSettings] = useState(() => DataStore.getSettings())

  // General Info states (Initialized empty for clean data entry)
  const [productName, setProductName] = useState('')
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0] || 'Dining Sets & Tables')
  const [skuCode, setSkuCode] = useState('')
  const [woodSpecies, setWoodSpecies] = useState('')
  const [description, setDescription] = useState('')

  // Category Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDescription, setNewCatDescription] = useState('')
  const [isSavingCat, setIsSavingCat] = useState(false)
  const [catError, setCatError] = useState('')

  // Craft Specs states
  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [woodGrade, setWoodGrade] = useState('')
  const [surfacePolish, setSurfacePolish] = useState('')
  const [joineryTechnique, setJoineryTechnique] = useState('')
  const [warranty, setWarranty] = useState('')

  // Inventory & Logistics states
  const [stockQuantity, setStockQuantity] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState('')
  const [depotLocation, setDepotLocation] = useState('Sivakasi Central Depot')
  const [packagingType, setPackagingType] = useState('')
  const [shippingClass, setShippingClass] = useState(
    'Class 3 - Heavy Solid Furniture (Direct Depot Truck)'
  )

  // Pricing & Statutory GST
  const [unitPrice, setUnitPrice] = useState('')
  const [tradeDiscount, setTradeDiscount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  // Reset / Clear form for fresh new product entry
  const handleAddNewProductForm = () => {
    setProductName('')
    setCategory(categories[0] || 'Dining Sets & Tables')
    setSkuCode('')
    setWoodSpecies('')
    setDescription('')
    setLength('')
    setWidth('')
    setHeight('')
    setWeight('')
    setWoodGrade('')
    setSurfacePolish('')
    setJoineryTechnique('')
    setWarranty('')
    setStockQuantity('')
    setLowStockThreshold('')
    setDepotLocation('Sivakasi Central Depot')
    setPackagingType('')
    setShippingClass('Class 3 - Heavy Solid Furniture (Direct Depot Truck)')
    setUnitPrice('')
    setTradeDiscount('')
    setSavedSuccess(false)
    setToastMsg('Form cleared for new product entry')
    setTimeout(() => setToastMsg(''), 2200)
  }

  // Sync settings when modified
  useEffect(() => {
    const handleUpdate = () => {
      setSettings(DataStore.getSettings())
    }
    window.addEventListener('timber_store_updated', handleUpdate)
    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  // Derived GST Slab from Settings
  const cgstRate = settings.cgstRate || 9
  const sgstRate = settings.sgstRate || 9
  const totalTax = cgstRate + sgstRate
  const hsn = settings.hsnCode || '9403'
  const dynamicGstLabel = `${totalTax}% GST (CGST ${cgstRate}% + SGST ${sgstRate}%) • HSN ${hsn}`

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    fetch(`${apiUrl}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.categories) && data.categories.length > 0) {
          const names = data.categories.map((c) => c.name)
          setCategories((prev) => Array.from(new Set([...prev, ...names])))
        }
      })
      .catch(() => {})
  }, [])

  const handleCreateCategory = async (catNameToSave) => {
    const targetName = (catNameToSave || newCatName).trim()
    if (!targetName) {
      setCatError('Category name is required')
      return
    }

    setIsSavingCat(true)
    setCatError('')

    // Instantly add to state and select
    setCategories((prev) => (prev.includes(targetName) ? prev : [...prev, targetName]))
    setCategory(targetName)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      await fetch(`${apiUrl}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetName,
          description: newCatDescription.trim(),
        }),
      })
    } catch (err) {
      console.warn('[AddProduct] Failed to persist category to backend:', err.message)
    } finally {
      setIsSavingCat(false)
      setNewCatName('')
      setNewCatDescription('')
      setIsCategoryModalOpen(false)
    }
  }

  const handleAutoGenerateSku = () => {
    const randomNum = Math.floor(100 + Math.random() * 900)
    setSkuCode(`KWF-NT-${randomNum}`)
  }

  const handleSaveProduct = async () => {
    setIsSaving(true)
    const numericPrice = Number(unitPrice.replace(/[^0-9.]/g, '')) || 0
    const productPayload = {
      name: productName,
      category,
      sku: skuCode,
      woodSpecies,
      description,
      dimensions: {
        length: Number(length) || 0,
        width: Number(width) || 0,
        height: Number(height) || 0,
        weight: Number(weight) || 0,
      },
      woodGrade,
      surfacePolish,
      joineryTechnique,
      warranty,
      stockQuantity: Number(stockQuantity) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 2,
      depotLocation,
      packagingType,
      shippingClass,
      unitPrice: numericPrice,
      sellingPrice: String(numericPrice),
      costPrice: '',
      gstSlab: dynamicGstLabel,
      tradeDiscount,
      transitPass: true,
    }

    // Add to centralized dynamic data store
    DataStore.addProduct(productPayload)
    localStorage.removeItem('kwf_product_draft')

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload),
      })
      if (response.ok) {
        setSavedSuccess(true)
        setTimeout(() => {
          setSavedSuccess(false)
          if (onProductSaved) {
            onProductSaved()
          }
        }, 1000)
      }
    } catch (err) {
      console.warn('[AddProduct] Error saving product to backend API:', err.message)
      if (onProductSaved) {
        onProductSaved()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="add-product-container">
      {toastMsg && (
        <div className="product-toast-banner">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Breadcrumb */}
      <nav className="product-breadcrumb">
        <span>PRODUCTS</span>
        <span className="breadcrumb-slash">/</span>
        <span className="breadcrumb-active">ADD PRODUCT</span>
      </nav>

      {/* Page Header */}
      <div className="add-product-header">
        <div className="product-title-wrap">
          <h1 className="product-page-title">Add New Product</h1>
          <p className="product-page-subtitle">
            Enter core artisan timber details, craft specifications, warehouse logistics, and
            statutory pricing.
          </p>
        </div>

        <div className="product-header-actions">
          <button
            type="button"
            className="btn-add-new-product"
            onClick={handleAddNewProductForm}
            title="Clear all fields and start entering another new product"
          >
            <svg
              width="13"
              height="13"
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
            <span>+ Add New Product</span>
          </button>

          <button
            type="button"
            className="btn-save-product"
            onClick={handleSaveProduct}
            disabled={isSaving}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{savedSuccess ? '✓ Saved!' : isSaving ? 'Saving...' : 'Save Product'}</span>
          </button>
        </div>
      </div>

      {/* 2x2 Form Cards Grid */}
      <div className="product-form-grid">
        {/* Card 1: General Information */}
        <section className="form-section-card">
          <div className="card-section-header">
            <div className="card-title-group">
              <span className="card-icon">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </span>
              <h2 className="card-section-title">General Information</h2>
            </div>
            <span className="section-badge-tan">Catalog Master</span>
          </div>

          <div className="form-field-group">
            <label className="field-label">Product Name *</label>
            <input
              type="text"
              className="input-styled"
              placeholder="e.g. Nilambur Teak Dining Table"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <div className="field-label-row">
                <label className="field-label">Category *</label>
                <button
                  type="button"
                  className="field-action-link"
                  onClick={() => setIsCategoryModalOpen(true)}
                >
                  + New Category
                </button>
              </div>
              <select
                className="select-styled"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field-group">
              <div className="field-label-row">
                <label className="field-label">SKU / Code *</label>
                <button
                  type="button"
                  className="field-action-link"
                  onClick={handleAutoGenerateSku}
                >
                  🔄 Auto-gen
                </button>
              </div>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. KWF-NT-101"
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label">Wood Species *</label>
            <input
              type="text"
              className="input-styled"
              placeholder="e.g. Nilambur Teak, Rosewood, Mahogany..."
              value={woodSpecies}
              onChange={(e) => setWoodSpecies(e.target.value)}
            />
          </div>

          <div className="form-field-group">
            <label className="field-label">Full Detailed Description</label>
            <textarea
              className="textarea-styled"
              rows="3"
              placeholder="Seasoned solid Nilambur teak dining table crafted with traditional mortise and tenon joinery..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        {/* Card 2: Craft Specifications & Seasoning */}
        <section className="form-section-card">
          <div className="card-section-header">
            <div className="card-title-group">
              <span className="card-icon">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </span>
              <h2 className="card-section-title">Craft & Timber Specifications</h2>
            </div>
            <span className="section-badge-dark">FSC Certified Timber</span>
          </div>

          <div className="form-row-4col">
            <div className="form-field-group">
              <label className="field-label">Length (cm)</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. 210"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Width (cm)</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. 100"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Height (cm)</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. 76"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Net Wt. (kg)</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. 68"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label">Wood Grade & Quality</label>
            <input
              type="text"
              className="input-styled"
              placeholder="e.g. Grade A - Nilambur Heartwood"
              value={woodGrade}
              onChange={(e) => setWoodGrade(e.target.value)}
            />
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Surface Polish & Treatment</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. Natural Protective Organic-Beeswax"
                value={surfacePolish}
                onChange={(e) => setSurfacePolish(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Joinery Technique</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. Mortise & Tenon with Rosewood Dowels"
                value={joineryTechnique}
                onChange={(e) => setJoineryTechnique(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label">Warranty & Craft Guarantee</label>
            <input
              type="text"
              className="input-styled"
              placeholder="e.g. 5-Yr Termite & Woodcraft Guarantee"
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
            />
          </div>
        </section>

        {/* Card 3: Inventory, Logistics & Packaging */}
        <section className="form-section-card">
          <div className="card-section-header">
            <div className="card-title-group">
              <span className="card-icon">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <h2 className="card-section-title">Inventory, Logistics & Packaging</h2>
            </div>
            <span className="section-badge-tan">Bay C-04 Active</span>
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Stock Quantity</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. 4"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Low Stock Alert Threshold</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. 2"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Depot Location</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. Sivakasi Central Depot"
                value={depotLocation}
                onChange={(e) => setDepotLocation(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Packaging Type</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. Corrugated Multi-layer Wood Wrap"
                value={packagingType}
                onChange={(e) => setPackagingType(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label">Shipping & Transport Class</label>
            <select
              className="select-styled"
              value={shippingClass}
              onChange={(e) => setShippingClass(e.target.value)}
            >
              <option value="Class 3 - Heavy Solid Furniture (Direct Depot Truck)">
                Class 3 - Heavy Solid Furniture (Direct Depot Truck)
              </option>
              <option value="Class 2 - Medium Parcel (Flat Pack / Courier)">
                Class 2 - Medium Parcel (Flat Pack / Courier)
              </option>
              <option value="Class 1 - Fragile Artisan Decor">Class 1 - Fragile Artisan Decor</option>
            </select>
          </div>
        </section>

        {/* Card 4: Pricing, Margins & Statutory GST */}
        <section className="form-section-card">
          <div className="card-section-header">
            <div className="card-title-group">
              <span className="card-icon">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="9" y1="21" x2="9" y2="9" />
                </svg>
              </span>
              <h2 className="card-section-title">Pricing, Margins & Statutory GST</h2>
            </div>
            <span className="section-badge-green">Tax Compliant</span>
          </div>

          <div className="form-field-group">
            <label className="field-label">Unit Price (₹) *</label>
            <input
              type="text"
              className="input-styled"
              placeholder="e.g. ₹ 78,500"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Statutory GST Slab (from System Settings)</label>
              <input
                type="text"
                className="input-styled"
                value={dynamicGstLabel}
                readOnly
                style={{ backgroundColor: '#FDFBF7', color: '#5C4537', cursor: 'default' }}
              />
            </div>

            <div className="form-field-group">
              <label className="field-label">Contractor / Trade Discount Tier</label>
              <input
                type="text"
                className="input-styled"
                placeholder="e.g. Architect / Builder Tier 1 (12% Off)"
                value={tradeDiscount}
                onChange={(e) => setTradeDiscount(e.target.value)}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Add New Category Modal */}
      {isCategoryModalOpen && (
        <div
          className="quick-modal-backdrop"
          onClick={() => setIsCategoryModalOpen(false)}
        >
          <div
            className="quick-modal-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="quick-modal-header">
              <div className="quick-header-left">
                <span className="drawer-badge-tag">CATALOG MANAGEMENT</span>
                <h3 className="quick-modal-title">Add New Product Category</h3>
                <p className="quick-modal-subtitle">
                  Define a new artisanal timber furniture line or department
                </p>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setIsCategoryModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="quick-modal-body">
              <div className="drawer-form-group">
                <label className="drawer-field-label">Category Name *</label>
                <input
                  type="text"
                  className="drawer-input-styled"
                  placeholder="e.g. Doors & Window Frames"
                  value={newCatName}
                  onChange={(e) => {
                    setNewCatName(e.target.value)
                    setCatError('')
                  }}
                  autoFocus
                />
                {catError && (
                  <span style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
                    {catError}
                  </span>
                )}
              </div>

              {/* Quick suggestions */}
              <div className="drawer-form-group">
                <label className="drawer-field-label">Quick Suggestions</label>
                <div className="quick-chip-row">
                  {[
                    'Sofas & Lounges',
                    'Doors & Window Frames',
                    'Outdoor & Patio',
                    'Heritage Wall Panels',
                    'Temple Mandapams & Carvings',
                  ].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      className="quick-chip"
                      onClick={() => setNewCatName(sug)}
                    >
                      + {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="drawer-form-group">
                <label className="drawer-field-label">Description (Optional)</label>
                <textarea
                  className="textarea-styled"
                  rows={2}
                  placeholder="Artisan timber craft specifications or collection notes..."
                  value={newCatDescription}
                  onChange={(e) => setNewCatDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                className="btn-drawer-cancel"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-drawer-save"
                onClick={() => handleCreateCategory()}
                disabled={isSavingCat}
              >
                {isSavingCat ? 'Adding...' : '✓ Add Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
