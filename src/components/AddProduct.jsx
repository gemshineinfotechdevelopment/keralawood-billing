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
  // General Info states
  const [productName, setProductName] = useState('Nilambur Teak Dining Table')
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [category, setCategory] = useState('Dining Sets & Tables')
  const [skuCode, setSkuCode] = useState('KWF-NT-101')
  const [woodSpecies, setWoodSpecies] = useState('Teak')
  const [description, setDescription] = useState(
    'Seasoned solid Nilambur teak dining table crafted with traditional mortise and tenon joinery. Finished in natural protective organic beeswax with antique brass corner brackets.'
  )
  const [collection, setCollection] = useState('Malabar Heritage Collection')
  const [originZone, setOriginZone] = useState('Nilambur Govt Timber Depot')
  const [searchTags, setSearchTags] = useState('6-Seater, Handcrafted, Brass Inlay, Solid Teak')

  // Category Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDescription, setNewCatDescription] = useState('')
  const [isSavingCat, setIsSavingCat] = useState(false)
  const [catError, setCatError] = useState('')

  // Craft Specs states
  const [length, setLength] = useState('210')
  const [width, setWidth] = useState('100')
  const [height, setHeight] = useState('76')
  const [weight, setWeight] = useState('68')
  const [woodGrade, setWoodGrade] = useState('Grade A - Nilambur Heartwood')
  const [surfacePolish, setSurfacePolish] = useState('Natural Protective Organic-Beeswax')
  const [joineryTechnique, setJoineryTechnique] = useState('Mortise & Tenon with Rosewood Dowels')
  const [warranty, setWarranty] = useState('5-Yr Termite & Wood')

  // Inventory & Logistics states
  const [stockQuantity, setStockQuantity] = useState('4')
  const [lowStockThreshold, setLowStockThreshold] = useState('2')
  const [depotLocation, setDepotLocation] = useState('Kochi Central Depot')
  const [warehouseBay, setWarehouseBay] = useState('Bay C-04 / Shed 2')
  const [leadTime, setLeadTime] = useState('In Stock (Ready to Ship)')
  const [packagingType, setPackagingType] = useState('Corrugated Multi-layer Wood Wrap')
  const [shippingClass, setShippingClass] = useState(
    'Class 3 - Heavy Solid Furniture (Direct Depot Truck)'
  )

  // Pricing & GST states
  const [costPrice, setCostPrice] = useState('₹ 48500')
  const [sellingPrice, setSellingPrice] = useState('₹ 78500')
  const [gstSlab, setGstSlab] = useState('18% GST (HSN 9403 - Wooden Furniture)')
  const [tradeDiscount, setTradeDiscount] = useState('Architect / Builder Tier 1 (12% Off)')
  const [transitPassEnabled, setTransitPassEnabled] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

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
    const productPayload = {
      name: productName,
      category,
      sku: skuCode,
      woodSpecies,
      description,
      collectionSeries: collection,
      originZone,
      searchTags,
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
      warehouseBay,
      leadTime,
      packagingType,
      shippingClass,
      costPrice: costPrice.replace(/[^0-9.]/g, ''),
      sellingPrice: sellingPrice.replace(/[^0-9.]/g, ''),
      gstSlab,
      tradeDiscount,
      transitPass: transitPassEnabled,
    }

    // Add to centralized dynamic data store
    DataStore.addProduct(productPayload)

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
          <button type="button" className="btn-save-draft">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <span>Save Draft</span>
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
                value={skuCode}
                onChange={(e) => setSkuCode(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label">Wood Species</label>
            <div className="pill-options-wrap">
              {['Teak', 'Rosewood', 'Mahogany', 'Jackfruit'].map((sp) => (
                <button
                  key={sp}
                  type="button"
                  className={`pill-option-btn ${woodSpecies === sp ? 'active' : ''}`}
                  onClick={() => setWoodSpecies(sp)}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label">Full Detailed Description</label>
            <textarea
              className="textarea-styled"
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Collection / Series</label>
              <input
                type="text"
                className="input-styled"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
              />
            </div>

            <div className="form-field-group">
              <label className="field-label">Wood Origin & Harvest Zone</label>
              <input
                type="text"
                className="input-styled"
                value={originZone}
                onChange={(e) => setOriginZone(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label">Search Tags & Labels</label>
            <input
              type="text"
              className="input-styled"
              value={searchTags}
              onChange={(e) => setSearchTags(e.target.value)}
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
              <h2 className="card-section-title">Craft Specifications & Seasoning</h2>
            </div>
            <span className="section-badge-dark">FSC Certified Timber</span>
          </div>

          <div className="form-row-4col">
            <div className="form-field-group">
              <label className="field-label">Length (cm)</label>
              <input
                type="text"
                className="input-styled"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Width (cm)</label>
              <input
                type="text"
                className="input-styled"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Height (cm)</label>
              <input
                type="text"
                className="input-styled"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Net Wt. (kg)</label>
              <input
                type="text"
                className="input-styled"
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
                value={surfacePolish}
                onChange={(e) => setSurfacePolish(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Joinery Technique</label>
              <input
                type="text"
                className="input-styled"
                value={joineryTechnique}
                onChange={(e) => setJoineryTechnique(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field-group">
            <label className="field-label">Warranty & Craft Guarantee</label>
            <div className="pill-options-wrap">
              {[
                '5-Yr Termite & Wood',
                '10-Yr Royal Warranty',
                'Lifetime Heritage Care',
              ].map((war) => (
                <button
                  key={war}
                  type="button"
                  className={`pill-option-btn ${warranty === war ? 'active' : ''}`}
                  onClick={() => setWarranty(war)}
                >
                  {war}
                </button>
              ))}
            </div>
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
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
              />
            </div>
            <div className="form-field-group">
              <label className="field-label">Low Stock Alert Threshold</label>
              <input
                type="text"
                className="input-styled"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Depot Location</label>
              <select
                className="select-styled"
                value={depotLocation}
                onChange={(e) => setDepotLocation(e.target.value)}
              >
                <option value="Kochi Central Depot">Kochi Central Depot</option>
                <option value="Sivakasi Depot">Sivakasi Depot</option>
                <option value="Nilambur Mill Yard">Nilambur Mill Yard</option>
              </select>
            </div>
            <div className="form-field-group">
              <label className="field-label">Warehouse Bay / Rack</label>
              <input
                type="text"
                className="input-styled"
                value={warehouseBay}
                onChange={(e) => setWarehouseBay(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Lead / Craft Time</label>
              <select
                className="select-styled"
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
              >
                <option value="In Stock (Ready to Ship)">In Stock (Ready to Ship)</option>
                <option value="2-3 Weeks (Made to Order)">2-3 Weeks (Made to Order)</option>
                <option value="4-6 Weeks (Custom Commission)">4-6 Weeks (Custom Commission)</option>
              </select>
            </div>
            <div className="form-field-group">
              <label className="field-label">Packaging Type</label>
              <input
                type="text"
                className="input-styled"
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

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Cost Price (₹)</label>
              <input
                type="text"
                className="input-styled"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>

            <div className="form-field-group">
              <div className="field-label-row">
                <label className="field-label">Selling Price (₹)</label>
                <span className="price-margin-badge">+38.2% Margin</span>
              </div>
              <input
                type="text"
                className="input-styled"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Statutory GST Slab & HSN</label>
              <input
                type="text"
                className="input-styled"
                value={gstSlab}
                onChange={(e) => setGstSlab(e.target.value)}
              />
            </div>

            <div className="form-field-group">
              <label className="field-label">Contractor / Trade Discount Tier</label>
              <input
                type="text"
                className="input-styled"
                value={tradeDiscount}
                onChange={(e) => setTradeDiscount(e.target.value)}
              />
            </div>
          </div>

          {/* Forest Transit Pass Card */}
          <div className="forest-pass-card">
            <div className="pass-card-left">
              <span className="pass-icon-gold">
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
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <div className="pass-meta">
                <span className="pass-title">Forest Transit Pass (Form IV)</span>
                <span className="pass-subtext">
                  Mandatory Sivakasi Forest Dept. movement permit for Nilambur Teak transit
                </span>
              </div>
            </div>

            <div
              className="toggle-switch-wrap"
              onClick={() => setTransitPassEnabled(!transitPassEnabled)}
            >
              <div className={`toggle-pill ${transitPassEnabled ? 'checked' : ''}`}>
                <span className="toggle-thumb"></span>
              </div>
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
