import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './Settings.css'

export default function Settings() {
  const initial = DataStore.getSettings()

  // General Depot Profile
  const [depotName, setDepotName] = useState(initial.depotName || 'Kerala Wood Furniture - Sivakasi Depot')
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
  const [bankName, setBankName] = useState(initial.bankName || 'State Bank of India - Sivakasi Branch')
  const [accountNumber, setAccountNumber] = useState(initial.accountNumber || '4092817290192')
  const [ifscCode, setIfscCode] = useState(initial.ifscCode || 'SBIN0008839')
  const [upiId, setUpiId] = useState(initial.upiId || 'keralawood.depot@sbi')

  // Stock Alerts
  const [minStockThreshold, setMinStockThreshold] = useState(initial.minStockThreshold || '5')

  // System Date & Time (POS Billing Clock)
  const [systemTime, setSystemTime] = useState(
    initial.systemTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  )
  const [systemDate, setSystemDate] = useState(initial.systemDate || '')

  const [savedSuccess, setSavedSuccess] = useState(false)

  // Load from MongoDB backend on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data.settings) {
          const s = data.settings
          if (s.depotName) setDepotName(s.depotName)
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
          if (s.bankName) setBankName(s.bankName)
          if (s.accountNumber) setAccountNumber(s.accountNumber)
          if (s.ifscCode) setIfscCode(s.ifscCode)
          if (s.upiId) setUpiId(s.upiId)
          if (s.minStockThreshold) setMinStockThreshold(s.minStockThreshold)
          if (s.systemTime) setSystemTime(s.systemTime)
          if (s.systemDate !== undefined) setSystemDate(s.systemDate)
        }
      })
      .catch(() => {})
  }, [])

  const handleSaveSettings = () => {
    const updated = {
      ...initial,
      depotName,
      contactPhone,
      contactEmail,
      address,
      dealerLicense,
      operatingHours,
      gstin,
      hsnCode,
      taxRate,
      cgstRate,
      sgstRate,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
      minStockThreshold,
      systemTime,
      systemDate,
    }
    DataStore.saveSettings(updated)
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {})

    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
    }, 1500)
  }

  return (
    <div className="settings-page-container">
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
          <div className="settings-field-group">
            <label className="settings-field-label">Depot Name</label>
            <input
              type="text"
              className="settings-input"
              value={depotName}
              onChange={(e) => setDepotName(e.target.value)}
            />
          </div>

          <div className="settings-form-row-2col">
            <div className="settings-field-group">
              <label className="settings-field-label">Contact Phone</label>
              <input
                type="text"
                className="settings-input"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="settings-field-group">
              <label className="settings-field-label">Contact Email</label>
              <input
                type="text"
                className="settings-input"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
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

      {/* Card 2: Tax, GST & Banking Defaults */}
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
            <h2 className="settings-section-title">Tax, GST & Banking Defaults</h2>
            <p className="settings-section-subtitle">
              Goods & Services Tax identity, invoice classification, and settlement bank accounts.
            </p>
          </div>
        </div>

        <div className="settings-form-col">
          <div className="settings-form-row-3col">
            <div className="settings-field-group">
              <label className="settings-field-label">GSTIN Number</label>
              <input
                type="text"
                className="settings-input"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
            </div>
            <div className="settings-field-group">
              <label className="settings-field-label">Default HSN Code</label>
              <input
                type="text"
                className="settings-input"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
              />
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

          <div className="sub-section-tag">
            <span>DEPOT SETTLEMENT ACCOUNT (PRINTED ON INVOICE QR)</span>
          </div>

          <div className="settings-form-row-2col">
            <div className="settings-field-group">
              <label className="settings-field-label">Beneficiary Bank Name</label>
              <input
                type="text"
                className="settings-input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div className="settings-field-group">
              <label className="settings-field-label">Current Account Number</label>
              <input
                type="text"
                className="settings-input"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
          </div>


        </div>
      </section>

      {/* Card 3: Stock Alerts */}
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
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h2 className="settings-section-title">Stock Alerts</h2>
            <p className="settings-section-subtitle">
              Depot stock deficit triggers and low inventory reorder alert settings.
            </p>
          </div>
        </div>

        <div className="settings-form-col">
          <div className="settings-field-group">
            <label className="settings-field-label">Minimum Stock Threshold (Units)</label>
            <span className="settings-field-hint">
              Alert triggered across dashboard and stock inventory when product quantity falls below this threshold.
            </span>
            <input
              type="number"
              className="settings-input threshold-input"
              value={minStockThreshold}
              onChange={(e) => setMinStockThreshold(e.target.value)}
              placeholder="e.g. 5"
              min="1"
            />
          </div>
        </div>
      </section>

      {/* Card 4: System Time & Billing Clock */}
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
            <h2 className="settings-section-title">System Time & Billing Clock</h2>
            <p className="settings-section-subtitle">
              Set the system time and date mentioned on customer invoices, print receipts, and transaction records.
            </p>
          </div>
        </div>

        <div className="settings-form-col">
          <div className="settings-form-row-2col">
            <div className="settings-field-group">
              <div className="settings-label-with-btn">
                <label className="settings-field-label">SYSTEM BILLING TIME *</label>
                <button
                  type="button"
                  className="btn-sync-time"
                  onClick={() => {
                    const now = new Date()
                    setSystemTime(
                      now.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })
                    )
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: '4px' }}
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                  </svg>
                  Sync Device Time
                </button>
              </div>
              <div className="settings-clock-input-wrap">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#8C7B72"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="settings-clock-icon"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <input
                  type="text"
                  className="settings-input settings-clock-input"
                  value={systemTime}
                  onChange={(e) => setSystemTime(e.target.value)}
                  placeholder="e.g. 10:30 AM or 04:15 PM"
                />
              </div>
              <span className="settings-field-hint">
                This exact time will be printed on customer tax invoices and sales records.
              </span>
            </div>

            <div className="settings-field-group">
              <div className="settings-label-with-btn">
                <label className="settings-field-label">SYSTEM BILLING DATE</label>
                <button
                  type="button"
                  className="btn-sync-time"
                  onClick={() => {
                    const now = new Date()
                    const y = now.getFullYear()
                    const m = String(now.getMonth() + 1).padStart(2, '0')
                    const d = String(now.getDate()).padStart(2, '0')
                    setSystemDate(`${y}-${m}-${d}`)
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ marginRight: '4px' }}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Set Today
                </button>
              </div>
              <div className="settings-clock-input-wrap">
                <input
                  type="date"
                  className="settings-input settings-clock-input"
                  value={systemDate}
                  onChange={(e) => setSystemDate(e.target.value)}
                />
              </div>
              <span className="settings-field-hint">
                Leave blank to automatically use the live calendar date.
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
              <span className="preview-label">INVOICE TIME & DATE PREVIEW</span>
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
                • {systemTime || '10:30 AM'} • Sivakasi Standard Time
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
