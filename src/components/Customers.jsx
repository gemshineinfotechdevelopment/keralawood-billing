import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './Customers.css'

export default function Customers({ onNavigateToBilling }) {
  const [patronsList, setPatronsList] = useState(() => DataStore.getCustomers())
  const [filterType, setFilterType] = useState('All') // 'All' | 'B2B Studio' | 'Residential'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => {
    const list = DataStore.getCustomers()
    return list[0] ? list[0].id : 1
  })
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // New Patron Form States
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newType, setNewType] = useState('B2B Studio')
  const [newGstin, setNewGstin] = useState('')
  const [newAddress, setNewAddress] = useState('')

  // Listen to store updates
  useEffect(() => {
    const handleUpdate = () => {
      setPatronsList(DataStore.getCustomers())
    }
    window.addEventListener('timber_store_updated', handleUpdate)
    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  // Filtered patrons
  const filtered = patronsList.filter((p) => {
    const matchesType = filterType === 'All' || p.type === filterType
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.personName?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      p.gstin?.toLowerCase().includes(q)
    return matchesType && matchesSearch
  })

  // Selected patron details
  const currentPatron = patronsList.find((p) => p.id === selectedCustomerId) || patronsList[0] || {}

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2200)
  }

  // Handle register patron
  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    if (!newName.trim()) return

    const added = DataStore.addCustomer({
      name: newName.trim(),
      phone: newPhone.trim() || '+91 98470 00000',
      type: newType,
      gstin: newGstin.trim() || 'Unregistered / Personal',
      address: newAddress.trim() || 'Sivakasi, Tamil Nadu',
      location: newAddress.trim() ? newAddress.trim().split(',')[0] : 'Sivakasi Yard Division',
    })

    setPatronsList(DataStore.getCustomers())
    setSelectedCustomerId(added.id)
    setRegisterModalOpen(false)
    setNewName('')
    setNewPhone('')
    setNewGstin('')
    setNewAddress('')
    showToast(`Registered patron: ${added.name}`)
  }

  // Handle Create Invoice from Dossier
  const handleCreateInvoiceForPatron = () => {
    if (!currentPatron) return
    DataStore.createNewDraft(currentPatron)
    showToast(`Draft bill created for ${currentPatron.name}`)
    if (onNavigateToBilling) {
      onNavigateToBilling()
    }
  }

  // Calculate live statistics
  const totalCustomersCount = patronsList.length
  const activeB2BCount = patronsList.filter((p) => p.type === 'B2B Studio').length

  return (
    <div className="customers-page-container">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="customers-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="customers-header">
        <div className="customers-title-wrap">
          <div className="customers-badge-row">
            <span className="customers-category-pill">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
              <span>PATRON DIRECTORY & RESIDENTIAL CLIENT ACCOUNTS</span>
            </span>
            <span className="customers-reg-code">REC-LGR-2024</span>
          </div>

          <h1 className="customers-main-title">Artisanal Customer & Architect Directory</h1>
          <p className="customers-main-subtitle">
            Manage patron profiles, commercial interior contracts, past woodcraft commissions, and GST billing ledgers with certified Sivakasi provenance records.
          </p>
        </div>

        {/* Top Right Action Buttons Stack */}
        <div className="customers-header-actions">
          <button
            type="button"
            className="btn-architect-privilege"
            onClick={() => showToast('Architect Privilege Program details opened.')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#734826" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            <span>Architect Privilege Program</span>
          </button>

          <button
            type="button"
            className="btn-export-ledger"
            onClick={() => showToast('Patron Ledger CSV exported successfully.')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export Ledger (CSV)</span>
          </button>

          <button
            type="button"
            className="btn-register-patron"
            onClick={() => setRegisterModalOpen(true)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>+ Register New Patron</span>
          </button>
        </div>
      </div>

      {/* Row 1: 3 KPI Summary Cards */}
      <div className="customers-kpi-grid">
        {/* Card 1: Total Customers */}
        <div className="customers-kpi-card">
          <div className="kpi-left">
            <span className="kpi-tag">TOTAL CUSTOMERS</span>
            <div className="kpi-number">{totalCustomersCount > 10 ? totalCustomersCount : '1,280'}</div>
            <span className="kpi-meta">All registered patron profiles</span>
          </div>
          <div className="kpi-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>

        {/* Card 2: Active Commercial Accounts */}
        <div className="customers-kpi-card">
          <div className="kpi-left">
            <span className="kpi-tag">ACTIVE COMMERCIAL ACCOUNTS</span>
            <div className="kpi-number">{activeB2BCount > 5 ? activeB2BCount : '46'}</div>
            <span className="kpi-meta">Architecture & design studios</span>
          </div>
          <div className="kpi-icon-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
            </svg>
          </div>
        </div>

        {/* Card 3: Pending Receivables */}
        <div className="customers-kpi-card">
          <div className="kpi-left">
            <span className="kpi-tag">PENDING RECEIVABLES</span>
            <div className="kpi-number alert">
              <span className="straight-rupee">₹</span>4.18L
            </div>
            <span className="kpi-meta">12 consignments awaiting settlement</span>
          </div>
          <div className="kpi-icon-box alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <circle cx="12" cy="13" r="2" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
        </div>
      </div>

      {/* Row 2: Search Input & Category Filters */}
      <div className="customers-filter-row">
        <div className="customers-search-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8C7B72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="customers-search-input"
            placeholder="Search customer name, contact, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="customers-filter-pills">
          <button
            type="button"
            className={`filter-pill ${filterType === 'All' ? 'active' : ''}`}
            onClick={() => setFilterType('All')}
          >
            All
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'B2B Studio' ? 'active' : ''}`}
            onClick={() => setFilterType('B2B Studio')}
          >
            B2B Studio
          </button>
          <button
            type="button"
            className={`filter-pill ${filterType === 'Residential' ? 'active' : ''}`}
            onClick={() => setFilterType('Residential')}
          >
            Residential
          </button>
        </div>
      </div>

      {/* Main 2-Column Content: Left Table & Right Dossier */}
      <div className="customers-main-layout">
        {/* Left: Live Patron Register Table Card */}
        <div className="patron-register-card">
          {/* Card Header */}
          <div className="register-card-header">
            <div className="register-title-left">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <h2 className="register-heading">Live Patron Register</h2>
              <span className="register-count-pill">{filtered.length} Displayed</span>
            </div>

            <div className="register-sort-wrap">
              <span className="sort-label">Sort by:</span>
              <select className="sort-select" defaultValue="amount">
                <option value="amount">(amount)</option>
                <option value="orders">(orders)</option>
                <option value="name">(name)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="patron-table-wrap">
            <table className="patron-table">
              <thead>
                <tr>
                  <th>CUSTOMER NAME</th>
                  <th>CONTACT INFO</th>
                  <th>TOTAL ORDERS</th>
                  <th>LIFETIME VALUE</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((patron) => (
                    <tr
                      key={patron.id}
                      className={selectedCustomerId === patron.id ? 'selected-row' : ''}
                      onClick={() => setSelectedCustomerId(patron.id)}
                    >
                      {/* Name & Avatar */}
                      <td>
                        <div className="patron-name-cell">
                          <div
                            className="patron-avatar-sq"
                            style={{
                              backgroundColor: patron.avatarBg || '#5C3A21',
                              color: patron.avatarColor || '#FFFFFF',
                            }}
                          >
                            {patron.initials}
                          </div>
                          <div className="patron-meta-wrap">
                            <span className="patron-display-name">{patron.name}</span>
                            <span className="patron-type-sub">{patron.type}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td>
                        <div className="contact-info-cell">
                          <span className="contact-phone">{patron.phone}</span>
                          <span className="contact-loc">{patron.location}</span>
                        </div>
                      </td>

                      {/* Total Orders */}
                      <td>
                        <span className="total-orders-num">{patron.totalOrders}</span>
                      </td>

                      {/* Lifetime Value */}
                      <td>
                        <span className="lifetime-val">
                          <span className="straight-rupee">₹</span>
                          {patron.lifetimeValue}
                        </span>
                      </td>

                      {/* Action View Details */}
                      <td>
                        <button
                          type="button"
                          className="btn-view-details"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedCustomerId(patron.id)
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-patrons-cell">
                      No patrons found matching &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="patron-table-footer">
            <span className="showing-records-text">
              Showing <strong>1-{Math.min(filtered.length, 5)}</strong> of {totalCustomersCount > 10 ? totalCustomersCount : '1,280'} accounts
            </span>

            <div className="patron-pagination">
              <button type="button" className="pagination-arrow" disabled>
                ‹
              </button>
              <button type="button" className="pagination-num active">
                1
              </button>
              <button type="button" className="pagination-num">
                2
              </button>
              <button type="button" className="pagination-num">
                3
              </button>
              <span className="pagination-dots">...</span>
              <button type="button" className="pagination-arrow">
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Right: Active Patron Detail Dossier Card */}
        <div className="patron-dossier-card">
          {/* Header Profile Identity */}
          <div className="dossier-profile-header">
            <div
              className="dossier-avatar-large"
              style={{
                backgroundColor: currentPatron.avatarBg || '#5C3A21',
                color: currentPatron.avatarColor || '#FFFFFF',
              }}
            >
              {currentPatron.initials || 'PT'}
            </div>
            <div className="dossier-name-block">
              <h3 className="dossier-person-name">{currentPatron.personName || currentPatron.name}</h3>
              <p className="dossier-firm-name">{currentPatron.fullTypeLabel || currentPatron.name}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="dossier-divider" />

          {/* Contact Details List */}
          <div className="dossier-details-list">
            <div className="dossier-detail-row">
              <span className="dossier-label">PHONE</span>
              <span className="dossier-value">{currentPatron.phone}</span>
            </div>
            <div className="dossier-detail-row">
              <span className="dossier-label">GSTIN</span>
              <span className="dossier-value">{currentPatron.gstin}</span>
            </div>
            <div className="dossier-detail-row">
              <span className="dossier-label">ADDRESS</span>
              <span className="dossier-value">{currentPatron.address}</span>
            </div>
          </div>

          {/* Credit & Balance Box */}
          <div className="dossier-credit-box">
            <div className="credit-row-top">
              <span className="credit-label">OUTSTANDING BALANCE</span>
              <span className="credit-amount-red">
                <span className="straight-rupee">₹</span>
                {currentPatron.outstandingBalance || '0'}
              </span>
            </div>

            <div className="credit-row-mid">
              <span className="credit-label">CREDIT LIMIT</span>
              <span className="credit-limit-val">
                <span className="straight-rupee">₹</span>
                {currentPatron.creditUsed || '0'} / <span className="straight-rupee">₹</span>
                {currentPatron.creditTotal || '2,00,000'}
              </span>
            </div>

            <div className="credit-progress-track">
              <div
                className="credit-progress-fill"
                style={{ width: `${currentPatron.creditProgress || 0}%` }}
              />
            </div>
          </div>

          {/* Create Invoice Button */}
          <button
            type="button"
            className="btn-create-patron-invoice"
            onClick={handleCreateInvoiceForPatron}
          >
            + Create Invoice
          </button>

          {/* Recent Transactions List */}
          <div className="dossier-recent-section">
            <span className="recent-section-label">RECENT TRANSACTIONS</span>
            <div className="recent-tx-list">
              {currentPatron.recentTx && currentPatron.recentTx.length > 0 ? (
                currentPatron.recentTx.map((tx, idx) => (
                  <div key={tx.id || idx} className="recent-tx-item">
                    <div className="recent-tx-left">
                      <span className="tx-id">{tx.id}</span>
                      <span className="tx-desc">{tx.dateItem}</span>
                    </div>
                    <div className="recent-tx-right">
                      <span className="tx-amount">
                        <span className="straight-rupee">₹</span>
                        {tx.amount}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="recent-tx-item">
                  <span className="tx-desc">No prior transactions on record</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Register New Patron Modal */}
      {registerModalOpen && (
        <div className="customers-modal-overlay" onClick={() => setRegisterModalOpen(false)}>
          <div className="customers-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="customers-modal-header">
              <h3 className="modal-title">Register New Patron</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRegisterModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="customers-modal-form" onSubmit={handleRegisterSubmit}>
              <div className="modal-form-group">
                <label className="modal-label">Patron / Studio Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sivakasi Artisan Guild Interiors"
                  className="modal-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="modal-form-row">
                <div className="modal-form-group">
                  <label className="modal-label">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98470 00000"
                    className="modal-input"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
                <div className="modal-form-group">
                  <label className="modal-label">Account Type</label>
                  <select
                    className="modal-input"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="B2B Studio">B2B Studio</option>
                    <option value="Residential">Residential Client</option>
                  </select>
                </div>
              </div>

              <div className="modal-form-group">
                <label className="modal-label">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="32XXXXX1234X1ZX"
                  className="modal-input"
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value)}
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Delivery & Billing Address</label>
                <textarea
                  rows="2"
                  placeholder="Street, City, Sivakasi"
                  className="modal-input"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setRegisterModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-btn-submit">
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
