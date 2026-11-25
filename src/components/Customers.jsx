import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import { validatePhone, validateGSTIN, validateRequired } from '../utils/validators'
import './Customers.css'

const getInitials = (patron) => {
  if (patron?.initials) return patron.initials
  const name = patron?.personName || patron?.name || 'PT'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

export default function Customers({ onNavigateToBilling }) {
  const [patronsList, setPatronsList] = useState(() => DataStore.getCustomers())
  const [transactions, setTransactions] = useState(() => DataStore.getTransactions())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => {
    const list = DataStore.getCustomers()
    return list[0] ? list[0].id : 1
  })
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [editingPatron, setEditingPatron] = useState(null)
  const [deleteModalPatron, setDeleteModalPatron] = useState(null)
  const [toastMessage, setToastMessage] = useState('')

  // New Patron Form States
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newGstin, setNewGstin] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [formErrors, setFormErrors] = useState({})

  // Listen to store updates
  useEffect(() => {
    const handleUpdate = () => {
      setPatronsList(DataStore.getCustomers())
      setTransactions(DataStore.getTransactions())
    }
    window.addEventListener('timber_store_updated', handleUpdate)

    // Pull live sales from MongoDB
    fetch('/api/sales')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.sales)) {
          setTransactions(data.sales)
          DataStore.saveTransactions(data.sales)
        }
      })
      .catch(() => {})

    // Fetch live customers from MongoDB
    fetch('/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.customers)) {
          const currentTxs = DataStore.getTransactions()
          const formatted = data.customers.map((c) => {
            const cName = String(c.name || '').trim().toLowerCase()
            const cPhone = String(c.phone || '').trim()

            const custTxs = currentTxs.filter((t) => {
              const tCust = typeof t.customer === 'object' && t.customer !== null ? t.customer.name : t.customer
              const nameMatch = cName && tCust && String(tCust).trim().toLowerCase() === cName
              const phoneMatch = cPhone && t.customerPhone && String(t.customerPhone).trim() === cPhone
              return nameMatch || (cPhone && phoneMatch)
            })

            const totalOrders = custTxs.length > 0 ? custTxs.length : (Number(c.totalOrders) || 0)
            const rawTotalBilled = custTxs.reduce((sum, t) => {
              const amt = t.rawAmount !== undefined
                ? Number(t.rawAmount)
                : Number(String(t.amount || 0).replace(/[^0-9.]/g, '')) || 0
              return sum + amt
            }, 0)

            const lifetimeValue = rawTotalBilled > 0
              ? rawTotalBilled.toLocaleString('en-IN')
              : (c.lifetimeValue && c.lifetimeValue !== '0' ? c.lifetimeValue : '0')

            const recentTx = custTxs.length > 0
              ? custTxs.slice(0, 5).map((t) => ({
                  id: t.invoice || t.id,
                  dateItem: `${t.date || t.rawDate || ''} • ₹${(t.rawAmount || t.amount || 0).toLocaleString('en-IN')}`,
                  status: t.paymentStatus || t.status || 'Paid',
                }))
              : (c.recentTx || [])

            return {
              id: c._id || c.id,
              initials: c.initials || getInitials(c),
              name: c.name,
              personName: c.personName || c.name,
              phone: c.phone || '',
              email: c.email || '',
              location: c.location || '',
              address: c.address || '',
              deliveryAddress: c.deliveryAddress || c.address || '',
              gstin: c.gstin || 'Unregistered / Personal',
              type: c.type || 'Residential',
              totalOrders,
              lifetimeValue,
              outstandingBalance: c.outstandingBalance || '0',
              creditUsed: c.creditUsed || '0',
              creditTotal: c.creditTotal || '2,00,000',
              recentTx,
            }
          })
          setPatronsList(formatted)
          DataStore.saveCustomers(formatted)
        }
      })
      .catch(() => {})

    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  // Filtered patrons & pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)

  // Customer Dossier Drawer state
  const [dossierOpen, setDossierOpen] = useState(false)

  // Close drawer / modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDossierOpen(false)
        setRegisterModalOpen(false)
        setDeleteModalPatron(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpenDossier = (patron) => {
    setSelectedCustomerId(patron.id)
    setDossierOpen(true)
  }

  const handleCloseDossier = () => {
    setDossierOpen(false)
  }

  const handleOpenAddCustomer = () => {
    setEditingPatron(null)
    setNewName('')
    setNewPhone('')
    setNewGstin('')
    setNewAddress('')
    setFormErrors({})
    setRegisterModalOpen(true)
  }

  const handleOpenEditPatron = (patron) => {
    setEditingPatron(patron)
    setNewName(patron.name || patron.personName || '')
    setNewPhone(patron.phone || '')
    setNewGstin(patron.gstin && patron.gstin !== 'Unregistered / Personal' ? patron.gstin : '')
    setNewAddress(patron.address || patron.deliveryAddress || patron.location || '')
    setFormErrors({})
    setRegisterModalOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!deleteModalPatron) return
    DataStore.deleteCustomer(deleteModalPatron.id)
    const updated = DataStore.getCustomers()
    setPatronsList(updated)
    showToast(`Deleted customer: ${deleteModalPatron.name}`)
    if (selectedCustomerId === deleteModalPatron.id) {
      setSelectedCustomerId(updated[0]?.id || null)
      setDossierOpen(false)
    }
    setDeleteModalPatron(null)
  }

  // Compute live orders and billed total from transactions for every customer
  const enrichedPatrons = useMemo(() => {
    return patronsList.map((p) => {
      const pName = String(p.name || '').trim().toLowerCase()
      const pPhone = String(p.phone || '').trim()

      const custTxs = transactions.filter((tx) => {
        const txCust = typeof tx.customer === 'object' && tx.customer !== null ? tx.customer.name : tx.customer
        const nameMatch = pName && txCust && String(txCust).trim().toLowerCase() === pName
        const phoneMatch = pPhone && tx.customerPhone && String(tx.customerPhone).trim() === pPhone
        return nameMatch || (pPhone && phoneMatch)
      })

      const totalOrders = custTxs.length > 0 ? custTxs.length : (Number(p.totalOrders) || 0)
      const rawTotalBilled = custTxs.reduce((sum, tx) => {
        const amt = tx.rawAmount !== undefined
          ? Number(tx.rawAmount)
          : Number(String(tx.amount || 0).replace(/[^0-9.]/g, '')) || 0
        return sum + amt
      }, 0)

      const lifetimeValue = rawTotalBilled > 0
        ? rawTotalBilled.toLocaleString('en-IN')
        : (p.lifetimeValue && p.lifetimeValue !== '0' ? p.lifetimeValue : '0')

      const recentTx = custTxs.length > 0
        ? custTxs.slice(0, 5).map((tx) => ({
            id: tx.invoice || tx.id,
            dateItem: `${tx.date || tx.rawDate || ''} • ₹${(tx.rawAmount || tx.amount || 0).toLocaleString('en-IN')}`,
            status: tx.paymentStatus || tx.status || 'Paid',
          }))
        : (p.recentTx || [])

      return {
        ...p,
        totalOrders,
        lifetimeValue,
        rawTotalBilled,
        recentTx,
      }
    })
  }, [patronsList, transactions])

  const filtered = enrichedPatrons.filter((p) => {
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

  const [sortBy, setSortBy] = useState('amount-desc')

  const sortedPatrons = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      const getAmt = (p) => Number(String(p.lifetimeValue || p.amount || 0).replace(/[^0-9.]/g, '')) || 0
      const getOrders = (p) => Number(p.totalOrders || p.orders || 0) || 0
      const getName = (p) => String(p.personName || p.name || '').toLowerCase()

      switch (sortBy) {
        case 'amount-desc':
          return getAmt(b) - getAmt(a)
        case 'amount-asc':
          return getAmt(a) - getAmt(b)
        case 'orders-desc':
          return getOrders(b) - getOrders(a)
        case 'orders-asc':
          return getOrders(a) - getOrders(b)
        case 'name-asc':
          return getName(a).localeCompare(getName(b))
        case 'name-desc':
          return getName(b).localeCompare(getName(a))
        default:
          return getAmt(b) - getAmt(a)
      }
    })
    return list
  }, [filtered, sortBy])

  const totalPages = Math.ceil(sortedPatrons.length / itemsPerPage)
  const safePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const paginatedPatrons = totalPages > 0 ? sortedPatrons.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage) : []

  // Selected patron details
  const currentPatron = enrichedPatrons.find((p) => p.id === selectedCustomerId) || enrichedPatrons[0] || {}

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 2200)
  }

  // Handle register / update patron
  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    const nameVal = validateRequired(newName, 'Customer Name', 2)
    const phoneVal = validatePhone(newPhone, true)
    const gstinVal = validateGSTIN(newGstin, false)

    const errs = {}
    if (!nameVal.isValid) errs.name = nameVal.error
    if (!phoneVal.isValid) errs.phone = phoneVal.error
    if (!gstinVal.isValid) errs.gstin = gstinVal.error

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs)
      return
    }
    setFormErrors({})

    const cleanPhoneStr = phoneVal.clean ? `+91 ${phoneVal.clean}` : newPhone.trim()

    if (editingPatron) {
      const updated = {
        ...editingPatron,
        name: newName.trim(),
        personName: newName.trim(),
        phone: cleanPhoneStr,
        gstin: newGstin.trim().toUpperCase() || 'Unregistered / Personal',
        address: newAddress.trim() || editingPatron.address || 'Sivakasi, Tamil Nadu',
        deliveryAddress: newAddress.trim() || editingPatron.deliveryAddress || editingPatron.address || 'Sivakasi, Tamil Nadu',
        location: newAddress.trim() ? newAddress.trim().split(',')[0].trim() : (editingPatron.location || 'Sivakasi Yard Division'),
      }
      DataStore.updateCustomer(updated)
      setPatronsList(DataStore.getCustomers())
      setRegisterModalOpen(false)
      setEditingPatron(null)
      showToast(`Updated customer: ${updated.name}`)
    } else {
      const added = DataStore.addCustomer({
        name: newName.trim(),
        phone: cleanPhoneStr,
        gstin: newGstin.trim().toUpperCase() || 'Unregistered / Personal',
        address: newAddress.trim() || 'Sivakasi, Tamil Nadu',
        location: newAddress.trim() ? newAddress.trim().split(',')[0].trim() : 'Sivakasi Yard Division',
      })

      setPatronsList(DataStore.getCustomers())
      setSelectedCustomerId(added.id)
      setRegisterModalOpen(false)
      setDossierOpen(true)
      showToast(`Added customer: ${added.name}`)
    }

    setNewName('')
    setNewPhone('')
    setNewGstin('')
    setNewAddress('')
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
    setDossierOpen(false)
    if (onNavigateToBilling) {
      onNavigateToBilling()
    }
  }

  // Calculate live statistics
  const totalCustomersCount = enrichedPatrons.length
  const activeAccountsCount = enrichedPatrons.filter((p) => Number(p.totalOrders) > 0).length
  const totalPendingReceivables = enrichedPatrons.reduce((sum, p) => {
    const val = Number(String(p.outstandingBalance || 0).replace(/[^0-9]/g, '')) || 0
    return sum + val
  }, 0)
  const pendingAccountsCount = enrichedPatrons.filter((p) => {
    const val = Number(String(p.outstandingBalance || 0).replace(/[^0-9]/g, '')) || 0
    return val > 0
  }).length

  const pendingReceivablesFormatted = totalPendingReceivables >= 100000
    ? `${(totalPendingReceivables / 100000).toFixed(2)}L`
    : totalPendingReceivables.toLocaleString('en-IN')

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
            onClick={handleOpenAddCustomer}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Row 1: 3 KPI Summary Cards */}
      <div className="customers-kpi-grid">
        {/* Card 1: Total Customers */}
        <div className="customers-kpi-card">
          <div className="kpi-left">
            <span className="kpi-tag">TOTAL CUSTOMERS</span>
            <div className="kpi-number">{totalCustomersCount}</div>
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
            <div className="kpi-number">{activeAccountsCount}</div>
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
              <span className="straight-rupee">₹</span>{pendingReceivablesFormatted}
            </div>
            <span className="kpi-meta">{pendingAccountsCount} customer account{pendingAccountsCount === 1 ? '' : 's'} awaiting settlement</span>
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
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value)
                  setCurrentPage(1)
                }}
              >
                <option value="amount-desc">Billed Amount (High to Low)</option>
                <option value="amount-asc">Billed Amount (Low to High)</option>
                <option value="orders-desc">Total Orders (High to Low)</option>
                <option value="orders-asc">Total Orders (Low to High)</option>
                <option value="name-asc">Customer Name (A to Z)</option>
                <option value="name-desc">Customer Name (Z to A)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="patron-table-wrap">
            <table className="patron-table">
              <thead>
                <tr>
                  <th style={{ width: '28%' }}>CUSTOMER NAME</th>
                  <th style={{ width: '26%' }}>CONTACT INFO</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>TOTAL ORDERS</th>
                  <th style={{ width: '16%' }}>TOTAL BILLED</th>
                  <th style={{ width: '16%', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatrons.length > 0 ? (
                  paginatedPatrons.map((patron) => (
                    <tr
                      key={patron.id}
                      className={selectedCustomerId === patron.id && dossierOpen ? 'selected-row' : ''}
                      onClick={() => handleOpenDossier(patron)}
                    >
                      {/* Name & Avatar */}
                      <td>
                        <div className="patron-name-cell">
                          <div className="patron-avatar-sq">
                            {getInitials(patron)}
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
                      <td style={{ textAlign: 'center' }}>
                        <span className="total-orders-num">{patron.totalOrders}</span>
                      </td>

                      {/* Total Billed */}
                      <td>
                        <span className="lifetime-val">
                          <span className="straight-rupee">₹</span>
                          {patron.lifetimeValue}
                        </span>
                      </td>

                      {/* Action Icons: Edit, Preview, Delete */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="patron-actions-cell">
                          <button
                            type="button"
                            className="btn-patron-action btn-patron-edit"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenEditPatron(patron)
                            }}
                            title="Edit Customer"
                            aria-label="Edit"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="btn-patron-action btn-patron-preview"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenDossier(patron)
                            }}
                            title="Preview Customer Dossier"
                            aria-label="Preview"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="btn-patron-action btn-patron-delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteModalPatron(patron)
                            }}
                            title="Delete Customer"
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
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="no-patrons-cell" style={{ textAlign: 'center', padding: '40px 20px', color: '#8C7E74' }}>
                      <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>👥</div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#2C1810', marginBottom: '4px' }}>
                        {searchQuery ? `No customers found matching "${searchQuery}"` : 'No customers registered yet'}
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>
                        Click &quot;+ Register Customer&quot; above to create your first client dossier.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="patron-table-footer">
            <div className="patron-footer-left">
              <span className="showing-records-text">
                Showing <strong>{filtered.length > 0 ? (
                  (safePage - 1) * itemsPerPage + 1 === Math.min(safePage * itemsPerPage, filtered.length)
                    ? `${(safePage - 1) * itemsPerPage + 1}`
                    : `${(safePage - 1) * itemsPerPage + 1}-${Math.min(safePage * itemsPerPage, filtered.length)}`
                ) : '0'}</strong> of {filtered.length} customers
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
              {totalPages > 0 && filtered.length > 0 ? (
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
      </div>

      {/* Customer Dossier Drawer (Slide-Over Panel) */}
      {dossierOpen && (
        <div className="dossier-drawer-backdrop" onClick={handleCloseDossier}>
          <div className="dossier-drawer-panel" onClick={(e) => e.stopPropagation()}>
            {/* Drawer Header */}
            <div className="dossier-drawer-header">
              <div className="dossier-drawer-header-top">
                <div className="dossier-badge-wrap">
                  <span className="dossier-eyebrow">CUSTOMER DOSSIER</span>
                  <span className="dossier-badge-pill">{currentPatron.type || 'Client'}</span>
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
                  {getInitials(currentPatron)}
                </div>
                <div className="dossier-name-block">
                  <h3 className="dossier-person-name">{currentPatron.personName || currentPatron.name}</h3>
                  <p className="dossier-firm-name">{currentPatron.name}</p>
                </div>
              </div>
            </div>

            {/* Scrollable Drawer Body */}
            <div className="dossier-drawer-body">
              {/* Contact Details List */}
              <div className="dossier-details-list">
                <div className="dossier-detail-row">
                  <span className="dossier-label">PHONE</span>
                  <span className="dossier-value">{currentPatron.phone || 'N/A'}</span>
                </div>
                <div className="dossier-detail-row">
                  <span className="dossier-label">GSTIN</span>
                  <span className="dossier-value">{currentPatron.gstin || 'Unregistered / Personal'}</span>
                </div>
                <div className="dossier-detail-row">
                  <span className="dossier-label">ADDRESS</span>
                  <span className="dossier-value">{currentPatron.address || currentPatron.location || 'Sivakasi, Tamil Nadu'}</span>
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
        </div>
      )}

      {/* Register New Customer Modal */}
      {registerModalOpen && (
        <div className="customers-modal-overlay" onClick={() => setRegisterModalOpen(false)}>
          <div className="customers-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="customers-modal-header">
              <h3 className="modal-title">{editingPatron ? 'Edit Customer Details' : 'Add New Customer'}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRegisterModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form className="customers-modal-form" onSubmit={handleRegisterSubmit} noValidate>
              <div className="modal-form-group">
                <label className="modal-label">Customer / Company Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Kumar / Sri Amman Stores"
                  className={`modal-input ${formErrors.name ? 'kwf-input-error' : ''}`}
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' })
                  }}
                />
                {formErrors.name && <span className="kwf-field-error">{formErrors.name}</span>}
              </div>

              <div className="modal-form-group">
                <label className="modal-label">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="10-digit mobile (starts with 6,7,8,9)"
                  className={`modal-input ${formErrors.phone ? 'kwf-input-error' : ''}`}
                  value={newPhone}
                  maxLength={10}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setNewPhone(val)
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' })
                  }}
                />
                {formErrors.phone && <span className="kwf-field-error">{formErrors.phone}</span>}
              </div>

              <div className="modal-form-group">
                <label className="modal-label">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="33XXXXX1234X1ZX"
                  className={`modal-input ${formErrors.gstin ? 'kwf-input-error' : ''}`}
                  value={newGstin}
                  onChange={(e) => {
                    setNewGstin(e.target.value.toUpperCase())
                    if (formErrors.gstin) setFormErrors({ ...formErrors, gstin: '' })
                  }}
                  maxLength={15}
                />
                {formErrors.gstin && <span className="kwf-field-error">{formErrors.gstin}</span>}
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
                  {editingPatron ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalPatron && (
        <div className="customers-modal-overlay" onClick={() => setDeleteModalPatron(null)}>
          <div className="customers-delete-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="customers-delete-modal-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="customers-delete-modal-title">Delete Customer?</h3>
            <p className="customers-delete-modal-text">
              Are you sure you want to delete <strong>{deleteModalPatron.name}</strong>? This will remove this patron from your active customer directory.
            </p>
            <div className="customers-delete-modal-actions">
              <button
                type="button"
                className="btn-delete-cancel"
                onClick={() => setDeleteModalPatron(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-delete-confirm"
                onClick={handleDeleteConfirm}
              >
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
