import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import { validateRequired, validatePositiveNumber } from '../utils/validators'
import './AddProduct.css'

const DEFAULT_CATEGORIES = [
  'Dining Sets & Tables',
  'Beds & Bedroom',
  'Armchairs & Seating',
  'Storage & Bookcases',
  'Executive Desks & Tables',
]

// Auto-generate strictly numeric SKU code starting at 100
const generateAutoSku = () => {
  return DataStore.getNextProductSku()
}

export default function AddProduct({ onProductSaved, onCancel, editProduct = null }) {
  // Settings sync (for Depot defaults)
  const [settings, setSettings] = useState(() => DataStore.getSettings())

  // General Info states (Numeric SKU is auto-generated on mount or loaded from editProduct)
  const [productName, setProductName] = useState(editProduct?.name || '')
  const [categories, setCategories] = useState(() => {
    const fromProds = Array.from(new Set(DataStore.getProducts().map((p) => p.category).filter(Boolean)))
    return fromProds.length > 0 ? fromProds : DEFAULT_CATEGORIES
  })
  const [category, setCategory] = useState(() => {
    if (editProduct?.category) return editProduct.category
    const fromProds = Array.from(new Set(DataStore.getProducts().map((p) => p.category).filter(Boolean)))
    return fromProds[0] || DEFAULT_CATEGORIES[0] || ''
  })
  const [skuCode, setSkuCode] = useState(() => {
    if (editProduct?.sku) {
      const digitsOnly = String(editProduct.sku).replace(/\D/g, '')
      return digitsOnly || generateAutoSku()
    }
    return generateAutoSku()
  })
  const [woodSpecies, setWoodSpecies] = useState(editProduct?.woodSpecies || '')
  const [description, setDescription] = useState(editProduct?.description || '')
  const [imageUrl, setImageUrl] = useState(editProduct?.imageUrl || '')
  const [imagePublicId, setImagePublicId] = useState(editProduct?.imagePublicId || '')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageUploadMsg, setImageUploadMsg] = useState('')

  // Category Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDescription, setNewCatDescription] = useState('')
  const [isSavingCat, setIsSavingCat] = useState(false)
  const [catError, setCatError] = useState('')

  // Craft Specs states
  const [length, setLength] = useState(editProduct?.dimensions?.length ?? '')
  const [width, setWidth] = useState(editProduct?.dimensions?.width ?? '')
  const [height, setHeight] = useState(editProduct?.dimensions?.height ?? '')
  const [weight, setWeight] = useState(editProduct?.dimensions?.weight ?? '')
  const [woodGrade, setWoodGrade] = useState(editProduct?.woodGrade || '')
  const [surfacePolish, setSurfacePolish] = useState(editProduct?.surfacePolish || editProduct?.finish || '')
  const [warranty, setWarranty] = useState(editProduct?.warranty || '')

  // Inventory & Logistics states
  const [stockQuantity, setStockQuantity] = useState(editProduct?.stockQuantity !== undefined ? editProduct.stockQuantity : '')
  const [lowStockThreshold, setLowStockThreshold] = useState(editProduct?.lowStockThreshold ?? '')
  const [depotLocation, setDepotLocation] = useState(
    () => editProduct?.depotLocation || settings.depotLocation || settings.yardLocation || ''
  )
  const [packagingType, setPackagingType] = useState(editProduct?.packagingType || '')

  // Pricing: Cost Price & Selling Price
  const [costPrice, setCostPrice] = useState(() => {
    if (!editProduct) return ''
    const val = editProduct.costPrice !== undefined ? editProduct.costPrice : ''
    return String(val).replace(/[^0-9.]/g, '')
  })
  const [sellingPrice, setSellingPrice] = useState(() => {
    if (!editProduct) return ''
    const val = editProduct.sellingPrice !== undefined ? editProduct.sellingPrice : (editProduct.unitPrice || editProduct.price || '')
    return String(val).replace(/[^0-9.]/g, '')
  })
  const [unitPrice, setUnitPrice] = useState(() => {
    if (!editProduct) return ''
    const val = editProduct.sellingPrice !== undefined ? editProduct.sellingPrice : (editProduct.unitPrice || editProduct.price || '')
    return String(val).replace(/[^0-9.]/g, '')
  })
  const [isSaving, setIsSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [formErrors, setFormErrors] = useState({})

  // Reset / Clear form for fresh new product entry
  const handleAddNewProductForm = () => {
    setProductName('')
    const defaultCat = categories[0] || 'Dining Sets & Tables'
    setCategory(defaultCat)
    setSkuCode(generateAutoSku())
    setWoodSpecies('')
    setDescription('')
    setLength('')
    setWidth('')
    setHeight('')
    setWeight('')
    setWoodGrade('')
    setSurfacePolish('')
    setWarranty('')
    setStockQuantity('')
    setLowStockThreshold('')
    setDepotLocation('Sivakasi Central Depot')
    setPackagingType('')
    setCostPrice('')
    setSellingPrice('')
    setUnitPrice('')
    setImageUrl('')
    setImagePublicId('')
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
    const apiUrl = import.meta.env.VITE_API_URL || ''
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
      const apiUrl = import.meta.env.VITE_API_URL || ''
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
    setSkuCode(generateAutoSku())
  }

  const handleProductImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      alert('Product image should be under 10MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result)
        setImageUploadMsg('✓ Photo added')
        setTimeout(() => setImageUploadMsg(''), 3000)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveProductImage = () => {
    setImageUrl('')
    setImagePublicId('')
  }

  const handleSaveProduct = async () => {
    const nameVal = validateRequired(productName, 'Product Name', 2)
    const catVal = validateRequired(category, 'Category', 1)
    const priceVal = validatePositiveNumber(sellingPrice || unitPrice, 'Selling Price', false)
    const costVal = costPrice ? validatePositiveNumber(costPrice, 'Cost Price', true) : { isValid: true, error: '' }
    const stockVal = validatePositiveNumber(stockQuantity === '' ? '0' : stockQuantity, 'Stock Quantity', true)

    const errs = {}
    if (!nameVal.isValid) errs.productName = nameVal.error
    if (!catVal.isValid) errs.category = catVal.error
    if (!priceVal.isValid) errs.sellingPrice = priceVal.error
    if (!costVal.isValid) errs.costPrice = costVal.error
    if (!stockVal.isValid) errs.stockQuantity = stockVal.error

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      setToastMsg('⚠️ Please fill all required product fields correctly')
      setTimeout(() => setToastMsg(''), 3000)
      return
    }
    setFormErrors({})

    setIsSaving(true)
    const numericSellingPrice = Number(String(sellingPrice || unitPrice).replace(/[^0-9.]/g, '')) || 0
    const numericCostPrice = Number(String(costPrice).replace(/[^0-9.]/g, '')) || 0
    const inputQty = Number(stockQuantity) || 0
    const prevQty = editProduct ? (Number(editProduct.stockQuantity) || 0) : 0
    const existingStockOut = editProduct ? (Number(editProduct.stockOut) || 0) : 0
    const existingStockIn = editProduct
      ? (editProduct.stockIn !== undefined ? Number(editProduct.stockIn) : (prevQty + existingStockOut))
      : 0
    const qtyDiff = editProduct ? Math.max(0, inputQty - prevQty) : 0
    const finalStockIn = editProduct ? (existingStockIn + qtyDiff) : inputQty

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
      warranty,
      stockQuantity: inputQty,
      stockIn: finalStockIn,
      stockOut: existingStockOut,
      lowStockThreshold: Number(lowStockThreshold) || 2,
      depotLocation,
      packagingType,
      unitPrice: numericSellingPrice,
      sellingPrice: String(numericSellingPrice),
      costPrice: numericCostPrice,
      price: numericSellingPrice,
      imageUrl,
      imagePublicId,
      gstSlab: '',
      tradeDiscount: '',
      transitPass: true,
    }

    if (editProduct) {
      const updatedPayload = {
        ...editProduct,
        ...productPayload,
        id: editProduct.id || editProduct._id,
        _id: editProduct._id,
      }
      DataStore.updateProduct(updatedPayload)
      try {
        const apiUrl = import.meta.env.VITE_API_URL || ''
        const idToSync = editProduct._id || editProduct.id || editProduct.sku
        await fetch(`${apiUrl}/api/products/${encodeURIComponent(idToSync)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPayload),
        })
      } catch (err) {
        console.warn('[AddProduct] Error updating product in backend API:', err.message)
      }
      setSavedSuccess(true)
      setTimeout(() => {
        setSavedSuccess(false)
        if (onProductSaved) onProductSaved(true)
      }, 700)
    } else {
      DataStore.addProduct(productPayload)
      try {
        const apiUrl = import.meta.env.VITE_API_URL || ''
        await fetch(`${apiUrl}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(productPayload),
        })
      } catch (err) {
        console.warn('[AddProduct] Error saving product to backend API:', err.message)
      }
      setSavedSuccess(true)
      localStorage.removeItem('kwf_product_draft')
      handleAddNewProductForm()
      setToastMsg('✓ Product cataloged successfully! Form cleared for next product entry')
      setTimeout(() => {
        setSavedSuccess(false)
        if (onProductSaved) onProductSaved(false)
      }, 700)
    }
    localStorage.removeItem('kwf_product_draft')
    setIsSaving(false)
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
        <span
          style={{ cursor: onCancel ? 'pointer' : 'default', textDecoration: onCancel ? 'underline' : 'none' }}
          onClick={onCancel ? onCancel : undefined}
        >
          Products
        </span>
        <span className="breadcrumb-slash">/</span>
        <span className="breadcrumb-active">{editProduct ? 'Edit Product' : 'Add Product'}</span>
      </nav>

      {/* Page Header */}
      <div className="add-product-header">
        <div className="product-title-wrap">
          <h1 className="product-page-title">{editProduct ? 'Edit Wood Product' : 'Add New Product'}</h1>
          <p className="product-page-subtitle">
            {editProduct
              ? `Update product details, pricing, and stock for SKU: ${editProduct.sku}`
              : 'Enter product details, pricing, and initial stock.'}
          </p>
        </div>

        <div className="product-header-actions">
          {onCancel && (
            <button
              type="button"
              className="btn-add-new-product"
              onClick={onCancel}
              title="Return to products catalog"
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
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>← Back to Products</span>
            </button>
          )}

          {!editProduct && (
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
              <span>+ Clear Form</span>
            </button>
          )}

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
            <span>{savedSuccess ? '✓ Saved!' : isSaving ? 'Saving...' : editProduct ? 'Update Product' : 'Save Product'}</span>
          </button>
        </div>
      </div>

      {/* Single Unified Form Container */}
      <div className="add-product-single-card">
        {/* Section 1: General Information */}
        <div className="form-section-block">
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
          </div>

          <div className="form-field-group">
            <label className="field-label">Product Name *</label>
            <input
              type="text"
              className={`input-styled ${formErrors.productName ? 'kwf-input-error' : ''}`}
              placeholder="e.g. Solid Rosewood Dressing Table with Mirror"
              value={productName}
              onChange={(e) => {
                setProductName(e.target.value)
                if (formErrors.productName) setFormErrors({ ...formErrors, productName: '' })
              }}
            />
            {formErrors.productName && <span className="kwf-field-error">{formErrors.productName}</span>}
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
                className={`select-styled ${formErrors.category ? 'kwf-input-error' : ''}`}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  if (formErrors.category) setFormErrors({ ...formErrors, category: '' })
                }}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {formErrors.category && <span className="kwf-field-error">{formErrors.category}</span>}
            </div>

            <div className="form-field-group">
              <div className="field-label-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>SKU / Code *</label>
                  <span className="sku-numeric-tag">Numeric Only</span>
                </div>
                <button
                  type="button"
                  className="field-action-link"
                  onClick={handleAutoGenerateSku}
                  title="Generate new numeric code"
                >
                  🔄 Regenerate
                </button>
              </div>
              <input
                type="text"
                className="input-styled input-readonly-code"
                placeholder="e.g. 100"
                value={skuCode}
                readOnly
                tabIndex={-1}
                title="Numeric product code starting at 100 (Read-only)"
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

          {/* Product Photo Upload */}
          <div className="form-field-group" style={{ marginTop: '14px' }}>
            <label className="field-label">Product Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '8px',
                border: '1.5px dashed #D3C4B8',
                backgroundColor: '#FAF5F1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {imageUrl ? (
                  <img src={imageUrl} alt="Product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '24px' }}>🪵</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#5C3A21',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}>
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      style={{ display: 'none' }}
                      onChange={handleProductImageUpload}
                    />
                  </label>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveProductImage}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #D3C4B8',
                        backgroundColor: '#FFF',
                        color: '#A34814',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                {imageUploadMsg && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#2E7D32' }}>
                    {imageUploadMsg}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="form-section-separator" />

        {/* Section 2: Inventory & Stock */}
        <div className="form-section-block">
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
              <h2 className="card-section-title">Inventory & Stock</h2>
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Stock Quantity</label>
              <input
                type="text"
                className={`input-styled ${formErrors.stockQuantity ? 'kwf-input-error' : ''}`}
                placeholder="e.g. 4"
                value={stockQuantity}
                onChange={(e) => {
                  setStockQuantity(e.target.value)
                  if (formErrors.stockQuantity) setFormErrors({ ...formErrors, stockQuantity: '' })
                }}
              />
              {formErrors.stockQuantity && <span className="kwf-field-error">{formErrors.stockQuantity}</span>}
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
        </div>

        <div className="form-section-separator" />

        {/* Section 4: Pricing */}
        <div className="form-section-block">
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
              <h2 className="card-section-title">Pricing & Margins</h2>
            </div>
          </div>

          <div className="form-row-2col">
            <div className="form-field-group">
              <label className="field-label">Cost Price (₹) *</label>
              <input
                type="text"
                className={`input-styled ${formErrors.costPrice ? 'kwf-input-error' : ''}`}
                placeholder="e.g. 18000"
                value={costPrice}
                onChange={(e) => {
                  setCostPrice(e.target.value)
                  if (formErrors.costPrice) setFormErrors({ ...formErrors, costPrice: '' })
                }}
              />
              {formErrors.costPrice && <span className="kwf-field-error">{formErrors.costPrice}</span>}
            </div>
            <div className="form-field-group">
              <label className="field-label">Selling Price (₹) *</label>
              <input
                type="text"
                className={`input-styled ${formErrors.sellingPrice ? 'kwf-input-error' : ''}`}
                placeholder="e.g. 29500"
                value={sellingPrice}
                onChange={(e) => {
                  setSellingPrice(e.target.value)
                  setUnitPrice(e.target.value)
                  if (formErrors.sellingPrice) setFormErrors({ ...formErrors, sellingPrice: '' })
                }}
              />
              {formErrors.sellingPrice && <span className="kwf-field-error">{formErrors.sellingPrice}</span>}
            </div>
          </div>

          {Number(sellingPrice) > 0 && Number(costPrice) > 0 && (
            <div style={{
              marginTop: '10px',
              padding: '8px 14px',
              backgroundColor: '#FAF5EE',
              border: '1px solid #EAD8C7',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11.5px',
              color: '#4A2E18'
            }}>
              <span>Estimated Profit: <strong>₹{(Number(sellingPrice) - Number(costPrice)).toLocaleString('en-IN')}</strong></span>
              <span style={{ fontWeight: 700, color: Number(sellingPrice) >= Number(costPrice) ? '#166534' : '#991B1B' }}>
                Markup: {(((Number(sellingPrice) - Number(costPrice)) / Number(costPrice)) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
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
                <span className="drawer-badge-tag">CATEGORY SETUP</span>
                <h3 className="quick-modal-title">Add New Product Category</h3>
                <p className="quick-modal-subtitle">
                  Define a new product category
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
