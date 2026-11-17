import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './Customers.css'

export default function Customers({ onNavigateToBilling }) {
  const [patronsList, setPatronsList] = useState(() => DataStore.getCustomers())
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
  const [newGstin, setNewGstin] = useState('')
  const [newAddress, setNewAddress] = useState('')

  // Listen to store updates
  useEffect(() => {
    const handleUpdate = () => {
      setPatronsList(DataStore.getCustomers())
    }
    window.addEventListener('timber_store_updated', handleUpdate)

    // Fetch live customers from MongoDB
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.customers) && data.customers.length > 0) {
          const formatted = data.customers.map((c) => ({
            id: c._id || c.id,
            name: c.name,
            personName: c.personName || c.name,
            phone: c.phone || '',
            email: c.email || '',
            location: c.location || '',
            address: c.address || '',
            deliveryAddress: c.deliveryAddress || c.address || '',
            gstin: c.gstin || 'Unregistered / Personal',
            type: c.type || 'Residential',
            totalOrders: c.totalOrders || 0,
            lifetimeValue: c.lifetimeValue || '0',
            outstandingBalance: c.outstandingBalance || '0',
            creditUsed: c.creditUsed || '0',
            creditTotal: c.creditTotal || '2,00,000',
            recentTx: c.recentTx || [],
          }))
          setPatronsList(formatted)
          DataStore.saveCustomers(formatted)
        }
      })
      .catch(() => {})

    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  // Filtered patrons
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const filtered = patronsList.filter((p) => {
    const q = searchQuery.toLowerCase().trim()
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.personName?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.location?.toLowerCase().includes(q) ||
      p.gstin?.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedPatrons = filtered.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage)

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
    showToast(`Added customer: ${added.name}`)
  }

  // Real CSV Ledger Export (Requirement 3)
  const handleExportCSV = () => {
    const headers = [
      'Customer ID',
      'Name',
      'Phone',
      'Location',
      'Address',
      'GSTIN',
      'Total Orders',
      'Lifetime Value (INR)',
      'Outstanding Balance (INR)',
    ]

    const rows = patronsList.map((p) => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${p.phone || ''}"`,
      `"${(p.location || '').replace(/"/g, '""')}"`,
      `"${(p.address || '').replace(/"/g, '""')}"`,
      `"${p.gstin || ''}"`,
      p.totalOrders || 0,
      `"${p.lifetimeValue || 0}"`,
      `"${p.outstandingBalance || 0}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Kerala_Wood_Customers_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showToast('Customer list exported to CSV successfully!')
  }

  // Handle Create Invoice from Dossier (Requirement 1)
  const handleCreateInvoiceForPatron = () => {
    if (!currentPatron) return
    const newDraft = DataStore.createNewDraft(currentPatron)
    DataStore.setActiveBillId(newDraft.id)
    showToast(`Draft bill created for ${currentPatron.name}. Opening billing...`)
    if (onNavigateToBilling) {
      onNavigateToBilling()
    }
  }

  // Calculate live statistics
  const totalCustomersCount = patronsList.length

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
          <h1 className="customers-main-title">Customers</h1>
          <p className="customers-main-subtitle">
            Manage customer profiles, contact details, and order history.
          </p>
        </div>

        {/* Top Right Action Buttons Stack */}
        <div className="customers-header-actions">
          <button
            type="button"
            className="btn-export-ledger"
            onClick={handleExportCSV}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export CSV</span>
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
            <span>+ Add Customer</span>
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
            <span className="kpi-meta">All customer profiles</span>
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

        {/* Card 2: Active Accounts */}
        <div className="customers-kpi-card">
          <div className="kpi-left">
            <span className="kpi-tag">ACTIVE ACCOUNTS</span>
            <div className="kpi-number">{totalCustomersCount > 10 ? totalCustomersCount : '46'}</div>
            <span className="kpi-meta">Active purchasing accounts</span>
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

      {/* Row 2: Search Input */}
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
      </div>

      {/* Main 2-Column Content: Left Table & Right Dossier */}
      <div className="customers-main-layout">
        {/* Left: Customer Directory Table Card */}
        <div className="patron-register-card">
          {/* Card Header */}
          <div className="register-card-header">
            <div className="register-title-left">
              <div className="register-heading-wrap">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5C3A21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <h2 className="register-heading">Customer Directory</h2>
              </div>
              <span className="register-count-pill">{filtered.length} Customers</span>
            </div>

            <div className="register-sort-wrap">
              <span className="sort-label">Sort by:</span>
              <select className="sort-select" defaultValue="amount">
                <option value="amount">Amount</option>
                <option value="orders">Orders</option>
                <option value="name">Name</option>
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
                  <th>TOTAL BILLED</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatrons.length > 0 ? (
                  paginatedPatrons.map((patron) => (
                    <tr
                      key={patron.id}
                      className={selectedCustomerId === patron.id ? 'selected-row' : ''}
                      onClick={() => setSelectedCustomerId(patron.id)}
                    >
                      {/* Name & Avatar */}
                      <td>
                        <div className="patron-name-cell">
                          <div className="patron-avatar-sq">
                            {patron.initials}
                          </div>
                          <div className="patron-meta-wrap">
                            <span className="patron-display-name">{patron.name}</span>
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

                      {/* Total Billed */}
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
                      No customers found matching &quot;{searchQuery}&quot;
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="patron-table-footer">
            <span className="showing-records-text">
              Showing <strong>{filtered.length > 0 ? (safePage - 1) * itemsPerPage + 1 : 0}-{Math.min(safePage * itemsPerPage, filtered.length)}</strong> of {filtered.length} customers
            </span>

            <div className="patron-pagination">
              <button
                type="button"
                className="pagination-arrow"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`pagination-num ${safePage === num ? 'active' : ''}`}
                  onClick={() => setCurrentPage(num)}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                className="pagination-arrow"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Right: Active Patron Detail Dossier Card */}
        <div className="patron-dossier-card">
          {/* Header Profile Identity */}
          <div className="dossier-profile-header">
            <div className="dossier-avatar-large">
              {currentPatron.initials || 'PT'}
            </div>
            <div className="dossier-name-block">
              <h3 className="dossier-person-name">{currentPatron.personName || currentPatron.name}</h3>
              <p className="dossier-firm-name">{currentPatron.name}</p>
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

      {/* Register New Customer Modal */}
      {registerModalOpen && (
        <div className="customers-modal-overlay" onClick={() => setRegisterModalOpen(false)}>
          <div className="customers-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="customers-modal-header">
              <h3 className="modal-title">Add New Customer</h3>
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
                <label className="modal-label">Customer / Company Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar / Sri Amman Stores"
                  className="modal-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

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
                <label className="modal-label">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="33XXXXX1234X1ZX"
                  className="modal-input"
                  value={newGstin}
                  onChange={(e) => setNewGstin(e.target.value)}
                />
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Address</label>
                <textarea
                  rows="2"
                  placeholder="Street, Area, City"
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
