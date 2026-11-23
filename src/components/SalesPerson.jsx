import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import { validateRequired, validatePhone, validatePositiveNumber } from '../utils/validators'
import './SalesPerson.css'

export default function SalesPerson() {
  const [salesPersons, setSalesPersons] = useState(() => DataStore.getSalesPersons())
  const [searchQuery, setSearchQuery] = useState('')

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [deleteModalPerson, setDeleteModalPerson] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [formErrors, setFormErrors] = useState({})

  // Form State - strictly staff id, name, phone, ordersClosed
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    ordersClosed: '',
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
      if (!q) return true
      return (
        (sp.code && sp.code.toLowerCase().includes(q)) ||
        (sp.id && sp.id.toLowerCase().includes(q)) ||
        (sp.name && sp.name.toLowerCase().includes(q)) ||
        (sp.phone && sp.phone.toLowerCase().includes(q))
      )
    })
  }, [salesPersons, searchQuery])

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const totalPages = filteredList.length > 0 ? Math.ceil(filteredList.length / itemsPerPage) : 0
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const paginatedList = totalPages > 0 ? filteredList.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage) : []

  // KPIs
  const totalOrdersClosed = useMemo(() => {
    return salesPersons.reduce((acc, sp) => acc + (Number(sp.ordersClosed) || 0), 0)
  }, [salesPersons])

  // Handlers
  const handleOpenAdd = () => {
    setEditingPerson(null)
    setFormData({
      code: DataStore.getNextSalesPersonCode(),
      name: '',
      phone: '',
      ordersClosed: '0',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const handleOpenEdit = (sp) => {
    setEditingPerson(sp)
    setFormData({
      code: sp.code || sp.id || '',
      name: sp.name || '',
      phone: sp.phone || '',
      ordersClosed: sp.ordersClosed !== undefined ? String(sp.ordersClosed) : '0',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const handleSavePerson = (e) => {
    e.preventDefault()
    const nameVal = validateRequired(formData.name, 'Staff Name', 2)
    const phoneVal = validatePhone(formData.phone, true)
    const ordersVal = validatePositiveNumber(formData.ordersClosed || '0', 'Orders Closed', true)

    const errs = {}
    if (!nameVal.isValid) errs.name = nameVal.error
    if (!phoneVal.isValid) errs.phone = phoneVal.error
    if (!ordersVal.isValid) errs.ordersClosed = ordersVal.error

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }
    setFormErrors({})

    const cleanPhoneStr = phoneVal.clean ? `+91 ${phoneVal.clean}` : formData.phone.trim()

    const payload = {
      code: formData.code.trim().replace(/\D/g, '') || DataStore.getNextSalesPersonCode(),
      name: formData.name.trim(),
      phone: cleanPhoneStr,
      ordersClosed: Number(formData.ordersClosed) || 0,
    }

    if (editingPerson) {
      DataStore.updateSalesPerson({ ...editingPerson, ...payload })
      showToast(`✓ Sales Person "${payload.name}" updated successfully!`)
    } else {
      DataStore.addSalesPerson(payload)
      showToast(`✓ Sales Person "${payload.name}" registered successfully!`)
    }

    setModalOpen(false)
  }

  const handleDeleteConfirm = () => {
    if (!deleteModalPerson) return
    DataStore.deleteSalesPerson(deleteModalPerson.id || deleteModalPerson.code)
    showToast(`✓ Removed "${deleteModalPerson.name}" from sales registry.`)
    setDeleteModalPerson(null)
  }

  return (
    <div className="sales-person-page">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-title-area">
          <h1>Sales Persons</h1>
          <p>Sales staff directory and total orders closed</p>
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
      <div className="sp-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="sp-kpi-card">
          <span className="sp-kpi-label">Active Sales Staff</span>
          <span className="sp-kpi-value">{salesPersons.length} Staff</span>
          <span className="sp-kpi-subtext">Registered sales representatives</span>
        </div>

        <div className="sp-kpi-card">
          <span className="sp-kpi-label">Total Orders Closed</span>
          <span className="sp-kpi-value" style={{ color: '#166534' }}>{totalOrdersClosed} Orders</span>
          <span className="sp-kpi-subtext">Cumulative bills completed</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="sp-filter-bar">
        <div className="sp-search-box" style={{ maxWidth: '460px' }}>
          <svg className="sp-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="sp-search-input"
            placeholder="Search by staff ID, name, or phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#9C8979',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Table Container - Only Staff ID, Name, Orders Closed, Phone Number, Actions */}
      <div className="sp-table-wrapper">
        <table className="sp-table">
          <thead>
            <tr>
              <th style={{ width: '180px' }}>STAFF ID</th>
              <th>NAME</th>
              <th style={{ width: '180px', textAlign: 'center' }}>ORDERS CLOSED</th>
              <th style={{ width: '220px' }}>PHONE NUMBER</th>
              <th style={{ width: '140px', textAlign: 'center' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan="5">
                  <div className="sp-empty-state">
                    <svg className="sp-empty-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <h3>No sales persons found</h3>
                    <p>Try modifying your search or add a new sales person to the directory.</p>
                    <button type="button" className="btn-sp-primary" onClick={handleOpenAdd}>
                      + Add Sales Person
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedList.map((sp) => {
                return (
                  <tr key={sp.id || sp.code}>
                    {/* Staff ID */}
                    <td>
                      <span className="sp-code-title" style={{ fontSize: '13.5px' }}>
                        {sp.code || sp.id}
                      </span>
                    </td>

                    {/* Name */}
                    <td>
                      <span className="sp-name-title" style={{ fontSize: '14px', fontWeight: 600 }}>
                        {sp.name}
                      </span>
                    </td>

                    {/* Orders Closed */}
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#F5ECE1',
                        color: '#5C4033',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}>
                        {sp.ordersClosed || 0}
                      </span>
                    </td>

                    {/* Phone Number */}
                    <td>
                      <span style={{ color: '#4A3328', fontWeight: 500, fontSize: '13.5px' }}>
                        {sp.phone || '—'}
                      </span>
                    </td>

                    {/* Actions (Exact User Squircle Design: Edit, Delete) */}
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

        {/* Table Footer with Pagination */}
        <div className="patron-table-footer">
          <div className="patron-footer-left">
            <span className="showing-records-text">
              Showing <strong>{filteredList.length > 0 ? (
                (safePage - 1) * itemsPerPage + 1 === Math.min(safePage * itemsPerPage, filteredList.length)
                  ? `${(safePage - 1) * itemsPerPage + 1}`
                  : `${(safePage - 1) * itemsPerPage + 1}-${Math.min(safePage * itemsPerPage, filteredList.length)}`
              ) : '0'}</strong> of {filteredList.length} staff
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
            {totalPages > 0 && filteredList.length > 0 ? (
              Array.from({ length: totalPages }, (_, idx) => idx + 1).map((num) => (
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

      {/* Add / Edit Modal - Strictly Staff ID, Name, Phone Number, Orders Closed */}
      {modalOpen && (
        <div className="sp-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="sp-modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sp-modal-header">
              <h2>{editingPerson ? 'Edit Sales Person' : 'Add Sales Person'}</h2>
              <button
                type="button"
                className="sp-modal-close-btn"
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePerson} noValidate>
              <div className="sp-modal-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="sp-form-group">
                    <label className="sp-form-label">STAFF ID *</label>
                    <input
                      type="text"
                      className="sp-form-input"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '') })}
                      placeholder="101"
                      required
                    />
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">NAME *</label>
                    <input
                      type="text"
                      className={`sp-form-input ${formErrors.name ? 'kwf-input-error' : ''}`}
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value })
                        if (formErrors.name) setFormErrors({ ...formErrors, name: '' })
                      }}
                      placeholder="e.g. Anand Kumar"
                      required
                    />
                    {formErrors.name && <span className="kwf-field-error">{formErrors.name}</span>}
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">PHONE NUMBER *</label>
                    <input
                      type="text"
                      className={`sp-form-input ${formErrors.phone ? 'kwf-input-error' : ''}`}
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value })
                        if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' })
                      }}
                      placeholder="98421 55670"
                      required
                    />
                    {formErrors.phone && <span className="kwf-field-error">{formErrors.phone}</span>}
                  </div>

                  <div className="sp-form-group">
                    <label className="sp-form-label">ORDERS CLOSED</label>
                    <input
                      type="number"
                      min="0"
                      className={`sp-form-input ${formErrors.ordersClosed ? 'kwf-input-error' : ''}`}
                      value={formData.ordersClosed}
                      onChange={(e) => {
                        setFormData({ ...formData, ordersClosed: e.target.value })
                        if (formErrors.ordersClosed) setFormErrors({ ...formErrors, ordersClosed: '' })
                      }}
                      placeholder="0"
                    />
                    {formErrors.ordersClosed && <span className="kwf-field-error">{formErrors.ordersClosed}</span>}
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
                  {editingPerson ? 'Save Changes' : 'Add Sales Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalPerson && (
        <div className="sp-modal-overlay" onClick={() => setDeleteModalPerson(null)}>
          <div className="sp-modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
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
