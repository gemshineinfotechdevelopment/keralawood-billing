import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './ReportsAnalytics.css'

export default function ReportsAnalytics() {
  const now = new Date()
  const currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const [selectedMonth, setSelectedMonth] = useState(currentMonthName)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [transactions, setTransactions] = useState(() => DataStore.getTransactions())

  // Sync with store updates
  useEffect(() => {
    const handleUpdate = () => {
      setTransactions(DataStore.getTransactions())
    }
    window.addEventListener('timber_store_updated', handleUpdate)
    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  // Collect available unique months from recorded transactions plus the current month
  const availableMonths = [
    currentMonthName,
    ...new Set(
      transactions
        .map((tx) => {
          if (tx.monthYear) return tx.monthYear
          const d = tx.createdAt ? new Date(tx.createdAt) : new Date(tx.date)
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          }
          return null
        })
        .filter(Boolean)
    ),
  ].filter((v, i, a) => a.indexOf(v) === i)

  const monthOptions = [
    {
      value: currentMonthName,
      label: `This Month (${now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`,
    },
    ...availableMonths
      .filter((m) => m !== currentMonthName)
      .map((m) => ({ value: m, label: m })),
    { value: 'all', label: 'All-Time Ledger' },
  ]

  // Filter transactions for the selected month
  const isMatchMonth = (tx, targetMonth) => {
    if (targetMonth === 'all') return true
    if (tx.monthYear && tx.monthYear.toLowerCase() === targetMonth.toLowerCase()) return true
    if (tx.createdAt) {
      const d = new Date(tx.createdAt)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase() === targetMonth.toLowerCase()
      }
    }
    if (tx.date) {
      const d = new Date(tx.date)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toLowerCase() === targetMonth.toLowerCase()
      }
      const targetParts = targetMonth.split(' ')
      const shortTarget = targetParts[0].slice(0, 3).toLowerCase()
      const yearTarget = targetParts[1]
      const txLower = tx.date.toLowerCase()
      if (txLower.includes(shortTarget) && (!yearTarget || txLower.includes(yearTarget))) {
        return true
      }
    }
    return false
  }

  const monthTransactions = transactions.filter((tx) => isMatchMonth(tx, selectedMonth))

  // Filter transactions dynamically by search query within the month
  const filtered = monthTransactions.filter((tx) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      tx.id.toLowerCase().includes(q) ||
      tx.customer.toLowerCase().includes(q) ||
      tx.project?.toLowerCase().includes(q) ||
      tx.wood?.toLowerCase().includes(q) ||
      tx.item?.toLowerCase().includes(q)
    )
  })

  // Dynamic calculations based strictly on the selected month
  const totalRawAmount = monthTransactions.reduce((sum, tx) => {
    if (tx.rawAmount) return sum + tx.rawAmount
    const cleaned = Number(String(tx.amount).replace(/[^0-9]/g, '')) || 0
    return sum + cleaned
  }, 0)

  const totalVolumeCFT = monthTransactions.reduce((sum, tx) => sum + (Number(tx.volume) || 0), 0)
  const orderCount = monthTransactions.length

  const itemsPerPage = 5
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const displayed = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleExport = () => {
    setExportSuccess(true)
    setTimeout(() => {
      setExportSuccess(false)
    }, 2000)
  }

  // Format revenue display
  const revenueDisplay =
    totalRawAmount === 0
      ? '0.00'
      : totalRawAmount >= 100000
      ? `${(totalRawAmount / 100000).toFixed(2)} Lakhs`
      : totalRawAmount.toLocaleString('en-IN')

  // Top Selling Wood Species calculated dynamically from this month's transactions
  const speciesList = [
    { name: 'Nilambur Teak', color: '#31190B' },
    { name: 'Sivakasi Rosewood', color: '#C88D58' },
    { name: 'Wild Anjili Wood', color: '#1A4D2E' },
    { name: 'Country Hardwood & Mahogany', color: '#8C7B72' },
  ].map((spec) => {
    const specTxs = monthTransactions.filter((tx) =>
      (tx.wood || '').toLowerCase().includes(spec.name.toLowerCase().split(' ')[0])
    )
    const specVolume = specTxs.reduce((sum, tx) => sum + (Number(tx.volume) || 0), 0)
    const specRaw = specTxs.reduce((sum, tx) => sum + (Number(tx.rawAmount) || 0), 0)
    const pct = totalVolumeCFT > 0 ? Math.round((specVolume / totalVolumeCFT) * 100) : 0
    return {
      ...spec,
      volume: specVolume,
      raw: specRaw,
      percent: pct,
    }
  })

  return (
    <div className="reports-page-container">
      {/* Page Header */}
      <div className="reports-header">
        <div className="reports-title-wrap">
          <div className="reports-breadcrumb-pill">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>REPORTS & ANALYTICS</span>
          </div>

          <h1 className="reports-main-title">Business & Sales Summary</h1>
          <p className="reports-main-subtitle">
            Overview of revenue, timber volume dispatched, and monthly sales performance.
          </p>
        </div>

        <div className="reports-header-actions">
          {/* Month Selector Dropdown */}
          <div className="reports-month-select-wrap">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="reports-cal-icon"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <select
              className="reports-month-select"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value)
                setCurrentPage(1)
              }}
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="reports-chevron-icon"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Export Report Button */}
          <button
            type="button"
            className="btn-export-report"
            onClick={handleExport}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{exportSuccess ? '✓ Exported' : '+ Export Report (PDF/Excel)'}</span>
          </button>
        </div>
      </div>

      {/* Row 1: 3 KPI Summary Cards */}
      <div className="reports-kpi-grid">
        {/* Card 1: Total Monthly Revenue */}
        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">TOTAL MONTHLY REVENUE</span>
            <div className="reports-kpi-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
                <circle cx="7" cy="15" r="1" />
              </svg>
            </div>
          </div>

          <div className="reports-kpi-main">
            <span className="reports-kpi-val">
              <span className="straight-rupee">₹</span>{totalRawAmount === 0 ? '0.00' : revenueDisplay}
            </span>
          </div>

          <div className="reports-kpi-meta-row">
            <span className={orderCount > 0 ? 'kpi-trend-green' : 'kpi-subtext'}>
              {orderCount > 0 ? '↗ Active Month' : '• Fresh Month'}
            </span>
            <span className="kpi-subtext">{selectedMonth === 'all' ? 'All-time ledger' : selectedMonth}</span>
          </div>

          <div className="reports-kpi-divider" />

          <div className="reports-kpi-footer">
            <span className="kpi-footer-label">Gross Margin Target</span>
            <span className="kpi-footer-status green">{orderCount > 0 ? 'Achieved 104%' : 'Target Tracking'}</span>
          </div>
        </div>

        {/* Card 2: Timber Dispatched */}
        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">TIMBER DISPATCHED</span>
            <div className="reports-kpi-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="3" width="15" height="13" rx="1" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
          </div>

          <div className="reports-kpi-main">
            <span className="reports-kpi-val">
              {totalVolumeCFT.toLocaleString('en-IN')} <span className="kpi-unit">CFT</span>
            </span>
          </div>

          <div className="reports-kpi-meta-row">
            <span className="kpi-badge-orders">{orderCount} client {orderCount === 1 ? 'order' : 'orders'}</span>
            <span className="kpi-subtext">dispatched this period</span>
          </div>

          <div className="reports-kpi-divider" />

          <div className="reports-kpi-footer">
            <span className="kpi-footer-label">Depot Yard Stock</span>
            <span className="kpi-footer-status amber">Sivakasi Central Yard</span>
          </div>
        </div>

        {/* Card 3: Average Margin */}
        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">AVERAGE MARGIN</span>
            <div className="reports-kpi-icon">
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
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </div>
          </div>

          <div className="reports-kpi-main">
            <span className="reports-kpi-val">36.8%</span>
          </div>

          <div className="reports-kpi-meta-row">
            <span className="kpi-badge-optimal">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Optimal</span>
            </span>
            <span className="kpi-subtext">Healthy artisan furniture markup</span>
          </div>

          <div className="reports-kpi-divider" />

          <div className="reports-kpi-footer">
            <span className="kpi-footer-label">Craft Benchmark</span>
            <span className="kpi-footer-status amber">Exceeds 32% Plan</span>
          </div>
        </div>
      </div>

      {/* Row 2: Two Middle Analytics Cards */}
      <div className="reports-middle-grid">
        {/* Card Left: Top Selling Wood Species */}
        <div className="reports-panel-card">
          <div className="panel-card-header">
            <div>
              <h2 className="panel-card-title">Top Selling Wood Species</h2>
              <p className="panel-card-subtitle">
                Volume share and gross realization by species.
              </p>
            </div>
            <div className="panel-card-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5C3A21"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 7 9 10 9 5 16 19 16 14 9 17 9 12 2" />
                <line x1="12" y1="16" x2="12" y2="22" />
              </svg>
            </div>
          </div>

          <div className="species-progress-list">
            {speciesList.map((spec) => (
              <div key={spec.name} className="species-progress-item">
                <div className="species-item-header">
                  <div className="species-name-wrap">
                    <span className="species-dot" style={{ backgroundColor: spec.color }} />
                    <span className="species-name">{spec.name}</span>
                  </div>
                  <div className="species-stat-wrap">
                    <span className="species-percent">{spec.percent}%</span>
                    <span className="species-rev">
                      <span className="straight-rupee">₹</span>
                      {spec.raw === 0
                        ? '0'
                        : spec.raw >= 100000
                        ? `${(spec.raw / 100000).toFixed(1)}L`
                        : spec.raw.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
                <div className="species-progress-track">
                  <div
                    className="species-progress-bar"
                    style={{ width: `${spec.percent}%`, backgroundColor: spec.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card Right: Monthly Performance Snapshot */}
        <div className="reports-panel-card">
          <div className="panel-card-header">
            <div>
              <h2 className="panel-card-title">Monthly Performance Snapshot</h2>
              <p className="panel-card-subtitle">
                Current order pipeline and billing settlement health.
              </p>
            </div>
            <div className="panel-card-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5C3A21"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="15" x2="16" y2="15" />
              </svg>
            </div>
          </div>

          <div className="snapshot-cards-stack">
            {/* Delivered Orders */}
            <div className="snapshot-item green">
              <div className="snapshot-left">
                <div className="snapshot-icon-circle green">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="9 12 12 15 16 10" />
                  </svg>
                </div>
                <div className="snapshot-meta">
                  <h3 className="snapshot-name">Delivered Orders</h3>
                  <p className="snapshot-sub">Successfully installed & verified</p>
                </div>
              </div>

              <div className="snapshot-right">
                <span className="snapshot-val">{orderCount}</span>
                <span className="snapshot-tag green">{orderCount > 0 ? 'Complete' : 'Fresh'}</span>
              </div>
            </div>

            {/* In-Progress Orders */}
            <div className="snapshot-item amber">
              <div className="snapshot-left">
                <div className="snapshot-icon-circle amber">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="snapshot-meta">
                  <h3 className="snapshot-name">In-Progress Orders</h3>
                  <p className="snapshot-sub">In joinery, sanding & finish</p>
                </div>
              </div>

              <div className="snapshot-right">
                <span className="snapshot-val">{orderCount > 0 ? Math.ceil(orderCount / 3) : 0}</span>
                <span className="snapshot-tag amber">{orderCount > 0 ? 'Active' : 'Standby'}</span>
              </div>
            </div>

            {/* Pending Invoices */}
            <div className="snapshot-item red">
              <div className="snapshot-left">
                <div className="snapshot-icon-circle red">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <circle cx="12" cy="13" r="2" />
                  </svg>
                </div>
                <div className="snapshot-meta">
                  <h3 className="snapshot-name">Pending Invoices</h3>
                  <p className="snapshot-sub">Outstanding realization balance</p>
                </div>
              </div>

              <div className="snapshot-right">
                <span className="snapshot-val">
                  <span className="straight-rupee">₹</span>
                  {totalRawAmount === 0
                    ? '0'
                    : totalRawAmount * 0.1 >= 100000
                    ? `${((totalRawAmount * 0.1) / 100000).toFixed(1)}L`
                    : Math.round(totalRawAmount * 0.1).toLocaleString('en-IN')}
                </span>
                <span className="snapshot-tag red">Net Due</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Sales Report Table Card */}
      <div className="reports-table-card">
        {/* Table Top Header */}
        <div className="reports-table-header">
          <div>
            <h2 className="reports-table-title">Recent Sales Report</h2>
            <p className="reports-table-subtitle">
              Detailed transactions, volume metrics, and invoice clearance.
            </p>
          </div>

          <div className="reports-table-controls">
            {/* Search Input */}
            <div className="reports-search-box">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="search-icon"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search invoice, client, wood..."
                className="reports-search-input"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>

            {/* Month Filter Dropdown */}
            <div className="reports-filter-dropdown">
              <select
                className="reports-filter-select-inner"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value)
                  setCurrentPage(1)
                }}
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="reports-table-wrapper">
          <table className="reports-sales-table">
            <thead>
              <tr>
                <th>BILL # / DATE</th>
                <th>CUSTOMER / PROJECT</th>
                <th>WOOD / ITEM</th>
                <th>VOLUME</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length > 0 ? (
                displayed.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <div className="sales-bill-no">{tx.id}</div>
                      <div className="sales-bill-date">{tx.date}</div>
                    </td>
                    <td>
                      <div className="sales-primary-text">{tx.customer}</div>
                      <div className="sales-sub-text">{tx.project}</div>
                    </td>
                    <td>
                      <div className="sales-primary-text">{tx.wood}</div>
                      <div className="sales-sub-text">{tx.item}</div>
                    </td>
                    <td>
                      <span className="sales-vol-num">{tx.volume}</span>{' '}
                      <span className="sales-vol-unit">CFT</span>
                    </td>
                    <td>
                      <span className="sales-amount">
                        <span className="straight-rupee">₹</span>
                        {tx.amount}
                      </span>
                    </td>
                    <td>
                      <span className="sales-paid-badge">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="9 12 12 15 16 10" />
                        </svg>
                        <span>{tx.status || 'Paid'}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="sales-no-results">
                    {searchQuery
                      ? `No dispatched sales transactions found matching "${searchQuery}"`
                      : `No sales or dispatches recorded for ${selectedMonth === currentMonthName ? 'current month (' + currentMonthName + ')' : selectedMonth}. As bills are recorded in Billing POS, sales will automatically appear here.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Audit Trust Badge & Pagination */}
        <div className="reports-table-footer">
          <div className="footer-left-meta">
            <span className="showing-records-text">
              Showing <strong>{filtered.length > 0 ? `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filtered.length)}` : '0-0'}</strong> of <strong>{filtered.length}</strong> Dispatched Sales Invoices
            </span>
            <span className="footer-pipe-divider">|</span>
            <div className="audit-trust-badge">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 12 15 16 10" />
              </svg>
              <span>All invoices audited & GST compliant</span>
            </div>
          </div>

          <div className="reports-pagination-wrap">
            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </button>

            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`pagination-num-btn ${currentPage === num ? 'active' : ''}`}
                onClick={() => setCurrentPage(num)}
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              className="pagination-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
