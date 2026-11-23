import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import kwfLogo from '../assets/kwf.jpg'
import { validateRequired, validatePhone, validateEmail, validateGSTIN, validateHSN } from '../utils/validators'
import './Settings.css'

export default function Settings() {
  const initial = DataStore.getSettings()

  // Form error state
  const [formErrors, setFormErrors] = useState({})

  // General Depot Profile
  const [depotName, setDepotName] = useState(initial.depotName || 'Kerala Wood Furniture - Sivakasi Depot')
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl || '')
  const [contactPhone, setContactPhone] = useState(initial.contactPhone || '+91 484 289 1204')
  const [contactEmail, setContactEmail] = useState(initial.contactEmail || 'depot@keralawood.in')
  const [address, setAddress] = useState(initial.address || 'Sivakasi Central Depot & Mill Yard, Sivakasi')
  const [dealerLicense, setDealerLicense] = useState(initial.dealerLicense || 'SFD/SVK/TMR/2023-884')
  const [operatingHours, setOperatingHours] = useState(initial.operatingHours || 'Mon - Sat: 08:30 AM - 06:30 PM (Sun: Closed)')

  // Tax, GST & Banking Defaults
  const [gstin, setGstin] = useState(initial.gstin || '32AABCP9821K1ZK')
  const [hsnCode, setHsnCode] = useState(initial.hsnCode || '9403')
  const [taxRate, setTaxRate] = useState(initial.taxRate || '18% (Standard GST)')
  const [cgstRate, setCgstRate] = useState(initial.cgstRate !== undefined ? initial.cgstRate : 9)
  const [sgstRate, setSgstRate] = useState(initial.sgstRate !== undefined ? initial.sgstRate : 9)
  const [ifscCode, setIfscCode] = useState(initial.ifscCode || 'SBIN0008839')
  const [upiId, setUpiId] = useState(initial.upiId || 'keralawood.depot@sbi')

  // Live Continuous System Clock (ticks every second automatically)
  const [liveClock, setLiveClock] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  )
  const [systemDate, setSystemDate] = useState(initial.systemDate || '')

  const [savedSuccess, setSavedSuccess] = useState(false)
  const [logoUploadMsg, setLogoUploadMsg] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  // Real-time ticking clock timer
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(
        new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Load from MongoDB backend on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.settings) {
          const s = data.settings
          if (s.depotName) setDepotName(s.depotName)
          if (s.logoUrl && !s.logoUrl.includes('cloudinary')) {
            setLogoUrl(s.logoUrl)
          } else {
            setLogoUrl(kwfLogo)
          }
          if (s.contactPhone) setContactPhone(s.contactPhone)
          if (s.contactEmail) setContactEmail(s.contactEmail)
          if (s.address) setAddress(s.address)
          if (s.dealerLicense) setDealerLicense(s.dealerLicense)
          if (s.operatingHours) setOperatingHours(s.operatingHours)
          if (s.gstin) setGstin(s.gstin)
          if (s.hsnCode) setHsnCode(s.hsnCode)
          if (s.taxRate) setTaxRate(s.taxRate)
          if (s.cgstRate !== undefined) setCgstRate(s.cgstRate)
          if (s.sgstRate !== undefined) setSgstRate(s.sgstRate)
          if (s.ifscCode) setIfscCode(s.ifscCode)
          if (s.upiId) setUpiId(s.upiId)
          if (s.systemDate !== undefined) setSystemDate(s.systemDate)
        }
      })
      .catch(() => {})
  }, [])

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      alert('Logo image should be under 8MB')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const res = event.target?.result
      if (res) {
        setLogoUrl(res)
        setLogoUploadMsg('✓ Logo updated successfully!')
        setTimeout(() => setLogoUploadMsg(''), 3000)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleResetToDefaultLogo = () => {
    setLogoUrl(kwfLogo)
    setLogoUploadMsg('✓ Reset to official KWF logo')
    setTimeout(() => setLogoUploadMsg(''), 3000)
  }

  const handleSaveSettings = () => {
    const nameVal = validateRequired(depotName, 'Depot Name', 2)
    const phoneVal = validatePhone(contactPhone, true)
    const emailVal = validateEmail(contactEmail, false)
    const gstinVal = validateGSTIN(gstin, false)
    const hsnVal = validateHSN(hsnCode, false)

    const errs = {}
    if (!nameVal.isValid) errs.depotName = nameVal.error
    if (!phoneVal.isValid) errs.contactPhone = phoneVal.error
    if (!emailVal.isValid) errs.contactEmail = emailVal.error
    if (!gstinVal.isValid) errs.gstin = gstinVal.error
    if (!hsnVal.isValid) errs.hsnCode = hsnVal.error

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      setToastMessage('⚠️ Please check the highlighted fields')
      setTimeout(() => setToastMessage(''), 3000)
      return
    }
    setFormErrors({})

    const cleanPhone = phoneVal.clean ? `+91 ${phoneVal.clean}` : contactPhone.trim()

    const updated = {
      ...initial,
      depotName: depotName.trim(),
      logoUrl,
      contactPhone: cleanPhone,
      contactEmail: contactEmail.trim(),
      address: address.trim(),
      dealerLicense: dealerLicense.trim(),
      operatingHours: operatingHours.trim(),
      gstin: gstin.trim().toUpperCase(),
      hsnCode: hsnCode.trim(),
      taxRate,
      cgstRate,
      sgstRate,
      ifscCode,
      upiId,
      systemTime: liveClock,
      systemDate,
    }
    DataStore.saveSettings(updated)
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {})

    setSavedSuccess(true)
    setToastMessage('✓ Store settings saved successfully!')
    setTimeout(() => {
      setSavedSuccess(false)
      setToastMessage('')
    }, 2500)
  }

  return (
    <div className="settings-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '28px',
          right: '32px',
          zIndex: 9999,
          backgroundColor: '#31190B',
          color: '#FAF4EF',
          padding: '12px 22px',
          borderRadius: '8px',
          fontSize: '13.5px',
          fontWeight: 600,
          boxShadow: '0 4px 16px rgba(49, 25, 11, 0.25)',
        }}>
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <div className="settings-header">
        <div className="settings-title-wrap">
          <h1 className="settings-main-title">Settings</h1>
          <p className="settings-main-subtitle">
            Manage store information, GST details, inventory alert thresholds, and system billing clock.
          </p>
        </div>

        <button
          type="button"
          className="btn-save-settings-top"
          onClick={handleSaveSettings}
        >
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
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>{savedSuccess ? '✓ Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Card 1: General Depot Profile */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-icon-box">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5C4537"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div>
            <h2 className="settings-section-title">General Depot Profile</h2>
            <p className="settings-section-subtitle">
              Basic store information and business contact details.
            </p>
          </div>
        </div>

        <div className="settings-form-col">
          {/* Brand Logo Upload Section */}
          <div className="settings-logo-uploader-card">
            <label className="settings-field-label">Official Depot Logo</label>
            <div className="settings-logo-row">
              <div className="settings-logo-preview-frame">
                <img
                  src={logoUrl || kwfLogo}
                  alt="Official Depot Logo"
                  className="settings-logo-preview-img"
                  style={{ maxHeight: '72px', maxWidth: '140px', objectFit: 'contain' }}
                />
              </div>

              <div className="settings-logo-details">
                <p className="settings-logo-hint-text">
                  Official Kerala Wood Furniture logo (<strong>src/assets/kwf.jpg</strong>). Appears on all tax invoices, billing POS, headers, and reports.
                </p>
                <div className="settings-logo-actions-bar">
                  <label className="btn-settings-choose-logo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Upload Custom Logo</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                      style={{ display: 'none' }}
                      onChange={handleLogoUpload}
                    />
                  </label>

                  {logoUrl && logoUrl !== kwfLogo && (
                    <button
                      type="button"
                      className="btn-settings-remove-logo"
                      onClick={handleResetToDefaultLogo}
                      title="Reset to official Kerala Wood Furniture logo"
                    >
                      ↺ Reset to Default Logo
                    </button>
                  )}
                </div>

                {logoUploadMsg && (
                  <p className="settings-logo-upload-msg">
                    {logoUploadMsg}
                  </p>
                )}

                <div className="settings-logo-source-badge">
                  <span>🪵 Active Source: src/assets/kwf.jpg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-field-group">
            <label className="settings-field-label">Depot Name *</label>
            <input
              type="text"
              className={`settings-input ${formErrors.depotName ? 'kwf-input-error' : ''}`}
              value={depotName}
              onChange={(e) => {
                setDepotName(e.target.value)
                if (formErrors.depotName) setFormErrors({ ...formErrors, depotName: '' })
              }}
            />
            {formErrors.depotName && <span className="kwf-field-error">{formErrors.depotName}</span>}
          </div>

          <div className="settings-form-row-2col">
            <div className="settings-field-group">
              <label className="settings-field-label">Contact Phone *</label>
              <input
                type="text"
                className={`settings-input ${formErrors.contactPhone ? 'kwf-input-error' : ''}`}
                value={contactPhone}
                onChange={(e) => {
                  setContactPhone(e.target.value)
                  if (formErrors.contactPhone) setFormErrors({ ...formErrors, contactPhone: '' })
                }}
              />
              {formErrors.contactPhone && <span className="kwf-field-error">{formErrors.contactPhone}</span>}
            </div>
            <div className="settings-field-group">
              <label className="settings-field-label">Contact Email</label>
              <input
                type="text"
                className={`settings-input ${formErrors.contactEmail ? 'kwf-input-error' : ''}`}
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value)
                  if (formErrors.contactEmail) setFormErrors({ ...formErrors, contactEmail: '' })
                }}
              />
              {formErrors.contactEmail && <span className="kwf-field-error">{formErrors.contactEmail}</span>}
            </div>
          </div>

          <div className="settings-field-group">
            <label className="settings-field-label">Address / Yard Location</label>
            <input
              type="text"
              className="settings-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="settings-form-row-2col">
            <div className="settings-field-group">
              <label className="settings-field-label">Timber Dealer License & Forest Dept Reg</label>
              <input
                type="text"
                className="settings-input"
                value={dealerLicense}
                onChange={(e) => setDealerLicense(e.target.value)}
              />
            </div>
            <div className="settings-field-group">
              <label className="settings-field-label">Depot Operating Hours & Working Days</label>
              <input
                type="text"
                className="settings-input"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Card 2: Tax & GST Defaults */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-icon-box">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5C4537"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="21" x2="21" y2="21" />
              <line x1="6" y1="18" x2="6" y2="11" />
              <line x1="10" y1="18" x2="10" y2="11" />
              <line x1="14" y1="18" x2="14" y2="11" />
              <line x1="18" y1="18" x2="18" y2="11" />
              <polygon points="12 2 20 7 4 7" />
            </svg>
          </div>
          <div>
            <h2 className="settings-section-title">Tax & GST Defaults</h2>
            <p className="settings-section-subtitle">
              Goods & Services Tax identity and invoice classification.
            </p>
          </div>
        </div>

        <div className="settings-form-col">
          <div className="settings-form-row-3col">
            <div className="settings-field-group">
              <label className="settings-field-label">GSTIN Number</label>
              <input
                type="text"
                className={`settings-input ${formErrors.gstin ? 'kwf-input-error' : ''}`}
                value={gstin}
                maxLength={15}
                onChange={(e) => {
                  setGstin(e.target.value.toUpperCase())
                  if (formErrors.gstin) setFormErrors({ ...formErrors, gstin: '' })
                }}
              />
              {formErrors.gstin && <span className="kwf-field-error">{formErrors.gstin}</span>}
            </div>
            <div className="settings-field-group">
              <label className="settings-field-label">Default HSN Code</label>
              <input
                type="text"
                className={`settings-input ${formErrors.hsnCode ? 'kwf-input-error' : ''}`}
                value={hsnCode}
                onChange={(e) => {
                  setHsnCode(e.target.value)
                  if (formErrors.hsnCode) setFormErrors({ ...formErrors, hsnCode: '' })
                }}
              />
              {formErrors.hsnCode && <span className="kwf-field-error">{formErrors.hsnCode}</span>}
            </div>
            <div className="settings-field-group">
              <label className="settings-field-label">Default Tax Rate (GST)</label>
              <select
                className="settings-input"
                value={taxRate}
                onChange={(e) => {
                  const val = e.target.value
                  setTaxRate(val)
                  if (val.includes('18%')) {
                    setCgstRate(9)
                    setSgstRate(9)
                  } else if (val.includes('12%')) {
                    setCgstRate(6)
                    setSgstRate(6)
                  } else if (val.includes('5%')) {
                    setCgstRate(2.5)
                    setSgstRate(2.5)
                  } else if (val.includes('28%')) {
                    setCgstRate(14)
                    setSgstRate(14)
                  }
                }}
              >
                <option value="18% (Standard GST)">18% (Standard GST) • CGST 9% + SGST 9%</option>
                <option value="12% (Artisan Timber)">12% (Artisan Timber) • CGST 6% + SGST 6%</option>
                <option value="5% (Raw Logs)">5% (Raw Logs) • CGST 2.5% + SGST 2.5%</option>
                <option value="28% (Luxury Craft)">28% (Luxury Craft) • CGST 14% + SGST 14%</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Card 3: Live System Clock & Billing Time */}
      <section className="settings-card settings-clock-card">
        <div className="settings-card-header">
          <div className="settings-icon-box">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5C4537"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <h2 className="settings-section-title">Live System Clock & Billing Time</h2>
            <p className="settings-section-subtitle">
              Real-time continuous device clock running automatically for invoices, receipts, and transactions.
            </p>
          </div>
        </div>

        <div className="settings-form-col">
          <div className="settings-form-row-2col">
            <div className="settings-field-group">
              <label className="settings-field-label">LIVE RUNNING SYSTEM TIME (REAL-TIME)</label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: '#FAF5F0',
                border: '1.5px solid #E8DACF',
                borderRadius: '8px'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#16A34A',
                  boxShadow: '0 0 0 3px rgba(22, 163, 74, 0.25)'
                }} />
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#31190B', letterSpacing: '0.02em', fontFamily: 'monospace' }}>
                    {liveClock}
                  </div>
                  <span style={{ fontSize: '11px', color: '#8C5325', fontWeight: 600 }}>
                    Continuously running device clock (Auto-applied to bills)
                  </span>
                </div>
              </div>
            </div>

            <div className="settings-field-group">
              <label className="settings-field-label">SYSTEM BILLING DATE</label>
              <div className="settings-clock-input-wrap">
                <input
                  type="date"
                  className="settings-input settings-clock-input"
                  value={systemDate}
                  onChange={(e) => setSystemDate(e.target.value)}
                />
              </div>
              <span className="settings-field-hint">
                Leave blank to automatically use today's live calendar date.
              </span>
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="system-time-preview-box">
            <div className="preview-clock-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C88D58"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="preview-meta">
              <span className="preview-label">LIVE INVOICE TIME & DATE PREVIEW</span>
              <strong className="preview-time-val">
                {systemDate
                  ? new Date(systemDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                • {liveClock} • Live System Time
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Save Changes Button */}
      <div className="settings-bottom-actions">
        <button
          type="button"
          className="btn-save-settings-bottom"
          onClick={handleSaveSettings}
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
          <span>{savedSuccess ? '✓ Saved Changes' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  )
}
