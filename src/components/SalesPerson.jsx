import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import './SalesPerson.css'

export default function SalesPerson() {
  const [salesPersons, setSalesPersons] = useState(() => DataStore.getSalesPersons())
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentModeFilter, setPaymentModeFilter] = useState('all')

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [viewDossierPerson, setViewDossierPerson] = useState(null)
  const [deleteModalPerson, setDeleteModalPerson] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    email: '',
    role: 'Senior Timber Consultant',
    territory: 'Sivakasi & Virudhunagar',
    target: '',
    achievedSales: '',
    commissionRate: '3.0',
    paymentMode: 'Bank Wire',
    ordersClosed: '',
    joiningDate: new Date().toISOString().split('T')[0],
  })

  // Sync on store update
  useEffect(() => {
    const handleUpdate = () => {
      setSalesPersons(DataStore.getSalesPersons())
    }
    window.addEventListener('timber_store_updated', handleUpdate)
    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Filtered Sales Persons
  const filteredList = useMemo(() => {
    return salesPersons.filter((sp) => {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        (sp.code && sp.code.toLowerCase().includes(q)) ||
        (sp.name && sp.name.toLowerCase().includes(q)) ||
        (sp.phone && sp.phone.toLowerCase().includes(q)) ||
        (sp.email && sp.email.toLowerCase().includes(q)) ||
        (sp.territory && sp.territory.toLowerCase().includes(q)) ||
        (sp.role && sp.role.toLowerCase().includes(q))

      const matchMode =
        paymentModeFilter === 'all' ||
        (sp.paymentMode && sp.paymentMode.toLowerCase() === paymentModeFilter.toLowerCase())

      return matchSearch && matchMode
    })
  }, [salesPersons, searchQuery, paymentModeFilter])

  // KPIs
  const totalSalesGenerated = useMemo(() => {
    return salesPersons.reduce((acc, sp) => acc + (Number(sp.achievedSales) || 0), 0)
  }, [salesPersons])

  const totalCommissions = useMemo(() => {
    return salesPersons.reduce((acc, sp) => {
      const achieved = Number(sp.achievedSales) || 0
      const rate = Number(sp.commissionRate) || 0
      return acc + (achieved * rate) / 100
    }, 0)
  }, [salesPersons])

  const topPerformer = useMemo(() => {
    if (!salesPersons.length) return null
    return [...salesPersons].sort((a, b) => (Number(b.achievedSales) || 0) - (Number(a.achievedSales) || 0))[0]
  }, [salesPersons])

  // Handlers
  const handleOpenAdd = () => {
    setEditingPerson(null)
    setFormData({
      code: `SP-${100 + salesPersons.length + 1}`,
      name: '',
      phone: '',
      email: '',
      role: 'Sales Executive',
      territory: 'Sivakasi Town & Yard',
      target: '500000',
      achievedSales: '0',
      commissionRate: '3.0',
      paymentMode: 'Bank Wire',
      ordersClosed: '0',
      joiningDate: new Date().toISOString().split('T')[0],
    })
    setModalOpen(true)
  }

  const handleOpenEdit = (sp) => {
    setEditingPerson(sp)
    setFormData({
      code: sp.code || sp.id,
      name: sp.name || '',
      phone: sp.phone || '',
      email: sp.email || '',
      role: sp.role || 'Sales Executive',
      territory: sp.territory || '',
      target: sp.target !== undefined ? String(sp.target) : '',
      achievedSales: sp.achievedSales !== undefined ? String(sp.achievedSales) : '',
      commissionRate: sp.commissionRate !== undefined ? String(sp.commissionRate) : '3.0',
      paymentMode: sp.paymentMode || 'Bank Wire',
      ordersClosed: sp.ordersClosed !== undefined ? String(sp.ordersClosed) : '0',
      joiningDate: sp.joiningDate || new Date().toISOString().split('T')[0],
    })
    setModalOpen(true)
  }

  const handleSavePerson = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter sales person name.')
      return
    }

    const payload = {
      code: formData.code.trim() || `SP-${100 + salesPersons.length + 1}`,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      role: formData.role.trim(),
      territory: formData.territory.trim(),
      target: Number(formData.target) || 0,
      achievedSales: Number(formData.achievedSales) || 0,
      commissionRate: Number(formData.commissionRate) || 0,
      paymentMode: formData.paymentMode,
      ordersClosed: Number(formData.ordersClosed) || 0,
      joiningDate: formData.joiningDate,
    }

    if (editingPerson) {
      DataStore.updateSalesPerson({ ...editingPerson, ...payload })
      showToast(`Sales Person "${payload.name}" updated successfully!`)
    } else {
      DataStore.addSalesPerson(payload)
      showToast(`Sales Person "${payload.name}" registered successfully!`)
    }

    setModalOpen(false)
  }

  const handleDeleteConfirm = () => {
    if (!deleteModalPerson) return
    DataStore.deleteSalesPerson(deleteModalPerson.id || deleteModalPerson.code)
    showToast(`Sales Person "${deleteModalPerson.name}" deleted successfully.`)
    setDeleteModalPerson(null)
  }

  const getPayModeClass = (mode) => {
    if (!mode) return 'upi'
    const m = mode.toLowerCase()
    if (m.includes('upi')) return 'upi'
    if (m.includes('cash')) return 'cash'
    if (m.includes('bank') || m.includes('wire')) return 'bank-wire'
    if (m.includes('cheque')) return 'cheque'
    if (m.includes('card')) return 'card'
    return 'upi'
  }

  return (
    <div className="sales-person-page">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-title-area">
          <h1>Sales Persons & Executives</h1>
          <p>Sales executives, territory coverage, sales targets, commission structure & performance payouts</p>
        </div>
        <div className="sp-header-actions">
          <button type="button" className="btn-sp-primary" onClick={handleOpenAdd}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Add Sales Person</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="sp-kpi-grid">
        <div className="sp-kpi-card">
          <span className="sp-kpi-label">Active Sales Reps</span>
          <span className="sp-kpi-value">{salesPersons.length} Staff</span>
          <span className="sp-kpi-subtext">Assigned across territory zones</span>
        </div>

        <div className="sp-kpi-card">
          <span className="sp-kpi-label">Top Performer</span>
          <span className="sp-kpi-value" style={{ fontSize: '18px' }}>
            {topPerformer ? topPerformer.name : '—'}
          </span>
          <span className="sp-kpi-subtext">
            {topPerformer ? `₹${Number(topPerformer.achievedSales).toLocaleString('en-IN')} achieved` : 'No data yet'}
          </span>
        </div>

        <div className="sp-kpi-card">
          <span className="sp-kpi-label">Total Sales Generated</span>
          <span className="sp-kpi-value">₹{totalSalesGenerated.toLocaleString('en-IN')}</span>
          <span className="sp-kpi-subtext">Cumulative booked revenue</span>
        </div>

        <div className="sp-kpi-card">
          <span className="sp-kpi-label">Total Commissions Payable</span>
          <span className="sp-kpi-value">₹{Math.round(totalCommissions).toLocaleString('en-IN')}</span>
          <span className="sp-kpi-subtext">Accrued incentive payouts</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="sp-filter-bar">
        <div className="sp-search-box">
          <svg className="sp-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="sp-search-input"
            placeholder="Search by staff code, name, phone, territory, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sp-filter-controls">
          <label htmlFor="sp-payment-mode-filter" style={{ fontSize: '12px', fontWeight: 600, color: '#7A6858' }}>PAYMENT MODE:</label>
          <select
            id="sp-payment-mode-filter"
            className="sp-mode-select"
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value)}
          >
            <option value="all">All Modes</option>
            <option value="Bank Wire">Bank Wire</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="sp-table-wrapper">
        <table className="sp-table">
          <thead>
            <tr>
              <th>STAFF ID / JOINED</th>
              <th>NAME & CONTACT</th>
              <th>ROLE / TERRITORY</th>
              <th style={{ textAlign: 'center' }}>ORDERS CLOSED</th>
              <th style={{ minWidth: '150px' }}>ACHIEVED / TARGET</th>
              <th>COMMISSION</th>
              <th>PAYMENT MODE</th>
              <th style={{ textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="8">
                  <div className="sp-empty-state">
                    <svg className="sp-empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <h3>No Sales Person records found</h3>
                    <p>Try modifying your search or add a new sales person to the directory.</p>
                    <button type="button" className="btn-sp-primary" onClick={handleOpenAdd}>
                      + Add Sales Person
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((sp) => {
                const target = Number(sp.target) || 1
                const achieved = Number(sp.achievedSales) || 0
                const percent = Math.min(100, Math.round((achieved / target) * 100))
                const commRate = Number(sp.commissionRate) || 0
                const commAmount = Math.round((achieved * commRate) / 100)
                const fillClass = percent >= 80 ? 'high' : percent >= 50 ? 'medium' : 'low'

                return (
                  <tr key={sp.id || sp.code}>
                    {/* Staff ID & Joined */}
                    <td>
                      <div className="sp-code-cell">
                        <span className="sp-code-title">{sp.code || sp.id}</span>
                        <span className="sp-code-sub">Joined {sp.joiningDate || '2025'}</span>
                      </div>
                    </td>

                    {/* Name & Contact */}
                    <td>
                      <div className="sp-name-cell">
                        <span className="sp-name-title">{sp.name}</span>
                        <span className="sp-name-contact">{sp.phone || sp.email || '—'}</span>
                      </div>
                    </td>

                    {/* Role & Territory */}
                    <td>
                      <div className="sp-role-cell">
                        <span className="sp-role-title">{sp.role || 'Executive'}</span>
                        <span className="sp-territory-text">{sp.territory || 'Sivakasi'}</span>
                      </div>
                    </td>

                    {/* Orders Closed */}
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>
                      {sp.ordersClosed || 0}
                    </td>

                    {/* Achieved vs Target */}
                    <td>
                      <div className="sp-perf-container">
                        <div className="sp-perf-header">
                          <span className="sp-perf-achieved">₹{achieved.toLocaleString('en-IN')}</span>
                          <span className="sp-perf-target">{percent}%</span>
                        </div>
                        <div className="sp-progress-bar-bg">
                          <div
                            className={`sp-progress-bar-fill ${fillClass}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: '#8C7B6D', display: 'block', marginTop: '3px' }}>
                          Target: ₹{target.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </td>

                    {/* Commission */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#166534' }}>
                        ₹{commAmount.toLocaleString('en-IN')}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8C7B6D' }}>
                        @{commRate}% rate
                      </span>
                    </td>

                    {/* Payment Mode (Replaces Status) */}
                    <td>
                      <span className={`sp-paymode-badge ${getPayModeClass(sp.paymentMode)}`}>
                        <svg width="6" height="6" viewBox="0 0 6 6" fill="currentColor">
                          <circle cx="3" cy="3" r="3" />
                        </svg>
                        <span>{sp.paymentMode || 'Bank Wire'}</span>
                      </span>
                    </td>

                    {/* Actions (Exact User Squircle Design) */}
                    <td style={{ textAlign: 'center' }}>
                      <div className="sp-actions-cell" style={{ justifyContent: 'center' }}>
                        {/* Edit Button */}
                        <button
                          type="button"
                          className="btn-sp-edit"
                          onClick={() => handleOpenEdit(sp)}
                          title="Edit Sales Person"
                          aria-label={`Edit ${sp.name}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>

                        {/* View Dossier Button */}
                        <button
                          type="button"
                          className="btn-sp-view"
                          onClick={() => setViewDossierPerson(sp)}
                          title="View Sales Dossier"
                          aria-label={`View ${sp.name}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          className="btn-sp-delete"
                          onClick={() => setDeleteModalPerson(sp)}
                          title="Delete Sales Person"
                          aria-label={`Delete ${sp.name}`}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="sp-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h2>{editingPerson ? 'Edit Sales Person Profile' : 'Register New Sales Person'}</h2>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePerson}>
              <div className="sp-modal-body">
                <div className="sp-form-grid">
                  <div className="sp-form-group">
                    <label className="sp-form-label">STAFF ID / CODE *</label>
                    <input
                      type="text"
                      className="sp-form-input"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="e.g. SP-105"
                      required
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">JOINING DATE</label>
                    <input
                      type="date"
                      className="sp-form-input"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    />
                  </div>

                  <div className="sp-form-group sp-form-full">
                    <label className="sp-form-label">FULL NAME *</label>
                    <input
                      type="text"
                      className="sp-form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Anand Kumar"
                      required
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">PHONE NUMBER</label>
                    <input
                      type="text"
                      className="sp-form-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98421 55670"
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">EMAIL ADDRESS</label>
                    <input
                      type="email"
                      className="sp-form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@keralawood.in"
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">DESIGNATION / ROLE</label>
                    <input
                      type="text"
                      className="sp-form-input"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="e.g. Senior Timber Consultant"
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">TERRITORY / ZONE</label>
                    <input
                      type="text"
                      className="sp-form-input"
                      value={formData.territory}
                      onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                      placeholder="e.g. Sivakasi & Virudhunagar"
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">MONTHLY TARGET (₹)</label>
                    <input
                      type="number"
                      className="sp-form-input"
                      value={formData.target}
                      onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                      placeholder="500000"
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">ACHIEVED SALES (₹)</label>
                    <input
                      type="number"
                      className="sp-form-input"
                      value={formData.achievedSales}
                      onChange={(e) => setFormData({ ...formData, achievedSales: e.target.value })}
                      placeholder="482000"
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">COMMISSION RATE (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="sp-form-input"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                      placeholder="3.0"
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">PAYMENT MODE *</label>
                    <select
                      className="sp-form-select"
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    >
                      <option value="Bank Wire">Bank Wire</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">ORDERS CLOSED</label>
                    <input
                      type="number"
                      className="sp-form-input"
                      value={formData.ordersClosed}
                      onChange={(e) => setFormData({ ...formData, ordersClosed: e.target.value })}
                      placeholder="25"
                    />
                  </div>
                </div>
              </div>

              <div className="sp-modal-footer">
                <button
                  type="button"
                  className="btn-sp-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-sp-primary">
                  {editingPerson ? 'Save Changes' : 'Register Sales Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Sales Person Dossier Modal */}
      {viewDossierPerson && (
        <div className="sp-modal-overlay" onClick={() => setViewDossierPerson(null)}>
          <div className="sp-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h2>Sales Executive Dossier</h2>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setViewDossierPerson(null)}
                aria-label="Close dossier"
              >
                ✕
              </button>
            </div>

            <div className="sp-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '12px',
                  backgroundColor: '#F5ECE1',
                  color: '#5C4033',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 700,
                  border: '1px solid #EADBCC'
                }}>
                  {viewDossierPerson.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#2D2319' }}>
                    {viewDossierPerson.name}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#5C4033', fontWeight: 600 }}>
                      {viewDossierPerson.role || 'Sales Representative'}
                    </span>
                    <span style={{ color: '#C0B0A0' }}>•</span>
                    <span className={`sp-paymode-badge ${getPayModeClass(viewDossierPerson.paymentMode)}`}>
                      {viewDossierPerson.paymentMode || 'Bank Wire'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sp-dossier-grid">
                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Staff ID</div>
                  <div className="sp-dossier-val">{viewDossierPerson.code || viewDossierPerson.id}</div>
                </div>

                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Joining Date</div>
                  <div className="sp-dossier-val">{viewDossierPerson.joiningDate || '2025'}</div>
                </div>

                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Contact Phone</div>
                  <div className="sp-dossier-val">{viewDossierPerson.phone || '—'}</div>
                </div>

                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Official Email</div>
                  <div className="sp-dossier-val">{viewDossierPerson.email || '—'}</div>
                </div>

                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Territory / Territory Zone</div>
                  <div className="sp-dossier-val">{viewDossierPerson.territory || 'Sivakasi Yard'}</div>
                </div>

                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Invoices / Orders Closed</div>
                  <div className="sp-dossier-val">{viewDossierPerson.ordersClosed || 0} Bills</div>
                </div>

                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Monthly Target</div>
                  <div className="sp-dossier-val">₹{Number(viewDossierPerson.target || 0).toLocaleString('en-IN')}</div>
                </div>

                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Achieved Sales</div>
                  <div className="sp-dossier-val" style={{ color: '#166534' }}>
                    ₹{Number(viewDossierPerson.achievedSales || 0).toLocaleString('en-IN')}
                  </div>
                </div>

                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Commission Rate</div>
                  <div className="sp-dossier-val">{viewDossierPerson.commissionRate || 3.0}%</div>
                </div>

                <div className="sp-dossier-item">
                  <div className="sp-dossier-label">Earned Commission</div>
                  <div className="sp-dossier-val" style={{ color: '#1D4ED8' }}>
                    ₹{Math.round(((Number(viewDossierPerson.achievedSales) || 0) * (Number(viewDossierPerson.commissionRate) || 0)) / 100).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>

            <div className="sp-modal-footer">
              <button
                type="button"
                className="btn-sp-secondary"
                onClick={() => setViewDossierPerson(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-sp-primary"
                onClick={() => {
                  const p = viewDossierPerson
                  setViewDossierPerson(null)
                  handleOpenEdit(p)
                }}
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalPerson && (
        <div className="sp-modal-overlay" onClick={() => setDeleteModalPerson(null)}>
          <div className="sp-modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h2>Confirm Deletion</h2>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setDeleteModalPerson(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="sp-modal-body">
              <p style={{ margin: 0, fontSize: '14px', color: '#4A3328', lineHeight: 1.5 }}>
                Are you sure you want to remove <strong>{deleteModalPerson.name}</strong> ({deleteModalPerson.code || deleteModalPerson.id}) from the sales registry?
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#8C7B6D' }}>
                This record and performance metrics will be removed from your active roster.
              </p>
            </div>

            <div className="sp-modal-footer">
              <button
                type="button"
                className="btn-sp-secondary"
                onClick={() => setDeleteModalPerson(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-sp-danger"
                onClick={handleDeleteConfirm}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && <div className="sp-toast">{toastMessage}</div>}
    </div>
  )
}
