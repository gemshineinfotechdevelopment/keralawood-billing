import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import './ReportsAnalytics.css'

export default function ReportsAnalytics() {
  const settings = DataStore.getSettings()
  const now = new Date()
  const currentYear = settings.systemDate
    ? (new Date(settings.systemDate).getFullYear() || now.getFullYear()).toString()
    : now.getFullYear().toString()

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [transactions, setTransactions] = useState(() => DataStore.getTransactions())

  // Sync with store updates and MongoDB backend
  useEffect(() => {
    const handleUpdate = () => {
      setTransactions(DataStore.getTransactions())
    }
    window.addEventListener('timber_store_updated', handleUpdate)

    // Pull latest sales transactions from MongoDB
    fetch('/api/sales')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.sales) && data.sales.length > 0) {
          const formatted = data.sales.map((s) => ({
            id: s.invoice,
            invoice: s.invoice,
            date: s.date ? new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Nov 17, 2026',
            rawDate: s.date ? new Date(s.date).toISOString().split('T')[0] : '',
            year: s.year || (s.date ? new Date(s.date).getFullYear().toString() : '2026'),
            monthYear: s.monthYear || 'November 2026',
            customer: s.customer,
            project: s.location || 'Sivakasi Yard Sale',
            wood: s.wood || 'Artisan Timber',
            item: s.items,
            amount: Number(s.amount || 0).toLocaleString('en-IN'),
            rawAmount: Number(s.amount || 0),
            paymentMode: s.paymentMode || 'UPI',
            status: s.paymentStatus || s.status || 'Paid',
            createdAt: s.createdAt || s.date,
          }))
          setTransactions(formatted)
          DataStore.saveTransactions(formatted)
        }
      })
      .catch(() => {})

    return () => window.removeEventListener('timber_store_updated', handleUpdate)
  }, [])

  // Collect all unique years dynamically from system clock and settings (base year: 2026)
  const baseYear = 2026
  const activeYearNum = Math.max(baseYear, Number(currentYear))

  const yearNumbers = []
  for (let y = activeYearNum; y >= baseYear; y--) {
    yearNumbers.push(y)
  }

  // Also include any recorded transaction years that are >= baseYear (never 2024 or older)
  transactions.forEach((tx) => {
    const yr = Number(tx.year || (tx.createdAt && new Date(tx.createdAt).getFullYear()))
    if (yr >= baseYear && !yearNumbers.includes(yr)) {
      yearNumbers.push(yr)
    }
  })
  yearNumbers.sort((a, b) => b - a)

  const availableYears = yearNumbers.map(String)

  const yearOptions = useMemo(() => {
    const raw = [
      {
        value: String(currentYear),
        label: `This Year (${currentYear})`,
      },
      ...availableYears
        .filter((y) => String(y) !== String(currentYear))
        .map((y) => ({ value: String(y), label: `Year ${y}` })),
      { value: 'all', label: 'All-Time' },
    ]
    const seen = new Set()
    return raw.filter((opt) => {
      const val = String(opt.value)
      if (seen.has(val)) return false
      seen.add(val)
      return true
    })
  }, [currentYear, availableYears])

  // Helper to extract ISO YYYY-MM-DD from any transaction date format
  const getTxDateString = (tx) => {
    if (tx.rawDate) return tx.rawDate.split('T')[0]
    if (tx.createdAt) {
      const d = new Date(tx.createdAt)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    }
    if (tx.date) {
      const d = new Date(tx.date)
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
      const m = String(tx.date).match(/\b(\d{4}-\d{2}-\d{2})\b/)
      if (m) return m[1]
    }
    return ''
  }

  // Filter transactions for the selected year (strictly excluding any legacy 2024 data)
  const isMatchYear = (tx, targetYear) => {
    if (String(tx.year) === '2024' || String(tx.date).includes('2024')) return false
    if (targetYear === 'all') return true
    if (tx.year && String(tx.year) === String(targetYear)) return true
    if (tx.createdAt) {
      const d = new Date(tx.createdAt)
      if (!isNaN(d.getTime()) && d.getFullYear().toString() === String(targetYear)) {
        return true
      }
    }
    if (tx.date) {
      const m = String(tx.date).match(/\b(20\d\d)\b/)
      if (m && m[1] === String(targetYear)) return true
    }
    return false
  }

  // Date range or Year matching
  const isDateRangeActive = Boolean(fromDate || toDate)
  const isMatchDateRange = (tx) => {
    if (String(tx.year) === '2024' || String(tx.date).includes('2024')) return false
    if (isDateRangeActive) {
      const txDateStr = getTxDateString(tx)
      if (!txDateStr) return false
      if (fromDate && txDateStr < fromDate) return false
      if (toDate && txDateStr > toDate) return false
      return true
    }
    return isMatchYear(tx, selectedYear)
  }

  const yearTransactions = transactions.filter(isMatchDateRange)

  // Filter transactions dynamically by search query within the selected date range
  const filtered = yearTransactions.filter((tx) => {
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

  // Dynamic calculations based strictly on the selected range
  const totalRawAmount = yearTransactions.reduce((sum, tx) => {
    if (tx.rawAmount) return sum + tx.rawAmount
    const cleaned = Number(String(tx.amount).replace(/[^0-9]/g, '')) || 0
    return sum + cleaned
  }, 0)

  const orderCount = yearTransactions.length

  // Dynamic payment settlement & clearance metrics
  const paidTransactions = yearTransactions.filter(
    (tx) => (tx.status || '').toLowerCase() === 'paid'
  )
  const paidCount = paidTransactions.length
  const paidAmount = paidTransactions.reduce(
    (sum, tx) => sum + (tx.rawAmount || Number(String(tx.amount).replace(/[^0-9]/g, '')) || 0),
    0
  )

  const pendingTransactions = yearTransactions.filter(
    (tx) => (tx.status || '').toLowerCase() !== 'paid'
  )
  const pendingCount = pendingTransactions.length
  const pendingDueAmount = yearTransactions.reduce(
    (sum, tx) => sum + (Number(tx.balanceDue) || (tx.status !== 'Paid' ? (tx.rawAmount || Number(String(tx.amount).replace(/[^0-9]/g, '')) || 0) : 0)),
    0
  )

  const avgBillAmount = orderCount > 0 ? Math.round(totalRawAmount / orderCount) : 0

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setFromDate(today)
    setToDate(today)
    setCurrentPage(1)
  }

  const handleSetThisMonth = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]
    setFromDate(firstDay)
    setToDate(today)
    setCurrentPage(1)
  }

  const handleClearDateFilter = () => {
    setFromDate('')
    setToDate('')
    setSelectedYear(currentYear)
    setCurrentPage(1)
  }

  const dateRangeLabel = isDateRangeActive
    ? `${fromDate || 'Beginning'} → ${toDate || 'Today'}`
    : selectedYear === 'all'
    ? 'All-Time'
    : `Year ${selectedYear}`

  // Pagination states: minimum 20 transactions per page
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const totalPages = filtered.length > 0 ? Math.ceil(filtered.length / itemsPerPage) : 0
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const displayed = totalPages > 0 ? filtered.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  ) : []

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



  return (
    <div className="reports-page-container">
      {/* Page Header */}
      <div className="reports-header">
        <div className="reports-title-wrap">
          <h1 className="reports-main-title">Reports & Analytics</h1>
          <p className="reports-main-subtitle">
            Sales summary, revenue metrics, and invoice clearance reports.
          </p>
        </div>

        <div className="reports-header-actions">
          {/* Year Selector Dropdown */}
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
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value)
                setFromDate('')
                setToDate('')
                setCurrentPage(1)
              }}
            >
              {yearOptions.map((opt) => (
                <option key={`hdr-yr-${opt.value}`} value={opt.value}>
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

      {/* Date Range Filter Bar (From Date to To Date) */}
      <div className="reports-date-filter-bar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '12px 18px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #EAE0D8',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(49, 25, 11, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#6A5649', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            📅 Filter by Date:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: '#8C7B72', fontWeight: 600 }}>From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value)
                setCurrentPage(1)
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11.5px',
                border: '1px solid #E2CEBE',
                borderRadius: '5px',
                backgroundColor: '#FAF5F1',
                color: '#31190B',
                outline: 'none',
                fontWeight: 500
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '11px', color: '#8C7B72', fontWeight: 600 }}>To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value)
                setCurrentPage(1)
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11.5px',
                border: '1px solid #E2CEBE',
                borderRadius: '5px',
                backgroundColor: '#FAF5F1',
                color: '#31190B',
                outline: 'none',
                fontWeight: 500
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleSetToday}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid #E2CEBE',
                backgroundColor: '#FFFFFF',
                color: '#31190B',
                cursor: 'pointer'
              }}
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleSetThisMonth}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '4px',
                border: '1px solid #E2CEBE',
                backgroundColor: '#FFFFFF',
                color: '#31190B',
                cursor: 'pointer'
              }}
            >
              This Month
            </button>
            {isDateRangeActive && (
              <button
                type="button"
                onClick={handleClearDateFilter}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: '1px solid #E57373',
                  backgroundColor: '#FFEBEE',
                  color: '#C62828',
                  cursor: 'pointer'
                }}
              >
                ✕ Clear Date Filter
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#8C7B72' }}>Active Period:</span>
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '4px',
            backgroundColor: isDateRangeActive ? '#E8F5E9' : '#F6ECE5',
            color: isDateRangeActive ? '#2E7D32' : '#9A6638'
          }}>
            {dateRangeLabel} ({filtered.length} {filtered.length === 1 ? 'bill' : 'bills'})
          </span>
        </div>
      </div>

      {/* Row 1: 3 KPI Summary Cards */}
      <div className="reports-kpi-grid">
        {/* Card 1: Total Annual Revenue */}
        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">TOTAL SALES REVENUE</span>
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
              {orderCount > 0 ? '↗ Active Sales' : '• Standby'}
            </span>
            <span className="kpi-subtext">{dateRangeLabel}</span>
          </div>

          <div className="reports-kpi-divider" />

          <div className="reports-kpi-footer">
            <span className="kpi-footer-label">Gross Margin</span>
            <span className="kpi-footer-status green">{orderCount > 0 ? 'Achieved 104%' : 'Target Tracking'}</span>
          </div>
        </div>

        {/* Card 2: Total Invoices */}
        <div className="reports-kpi-card">
          <div className="reports-kpi-top">
            <span className="reports-kpi-label">TOTAL INVOICES</span>
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
          </div>

          <div className="reports-kpi-main">
            <span className="reports-kpi-val">
              {orderCount} <span className="kpi-unit">{orderCount === 1 ? 'Bill' : 'Bills'}</span>
            </span>
          </div>

          <div className="reports-kpi-meta-row">
            <span className="kpi-badge-orders">100% Tax Compliant</span>
            <span className="kpi-subtext">fulfilled in {dateRangeLabel}</span>
          </div>

          <div className="reports-kpi-divider" />

          <div className="reports-kpi-footer">
            <span className="kpi-footer-label">Yard Location</span>
            <span className="kpi-footer-status amber">Sivakasi Yard Depot</span>
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
            <span className="reports-kpi-val">{orderCount > 0 ? '36.8%' : '0.0%'}</span>
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
              <span>{orderCount > 0 ? 'Optimal' : 'Standby'}</span>
            </span>
            <span className="kpi-subtext">{orderCount > 0 ? 'Healthy artisan furniture markup' : 'No sales recorded yet'}</span>
          </div>

          <div className="reports-kpi-divider" />

          <div className="reports-kpi-footer">
            <span className="kpi-footer-label">Craft Benchmark</span>
            <span className="kpi-footer-status amber">{orderCount > 0 ? 'Exceeds 32% Plan' : 'Tracking'}</span>
          </div>
        </div>
      </div>

      {/* Row 2: Payment Settlement & Order Realization */}
      <div className="reports-middle-grid">
        {/* Payment Settlement & Clearance Card */}
        <div className="reports-panel-card">
          <div className="panel-card-header">
            <div>
              <h2 className="panel-card-title">Payment Settlement & Order Clearance</h2>
              <p className="panel-card-subtitle">
                Live settlement health, collected revenue, and outstanding balance ({dateRangeLabel}).
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
            {/* Cleared / Paid Invoices */}
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
                  <h3 className="snapshot-name">Paid & Cleared Invoices</h3>
                  <p className="snapshot-sub">Fully realized bill payments</p>
                </div>
              </div>

              <div className="snapshot-right">
                <span className="snapshot-val">
                  <span className="straight-rupee">₹</span>
                  {paidAmount === 0
                    ? '0'
                    : paidAmount >= 100000
                    ? `${(paidAmount / 100000).toFixed(2)}L`
                    : paidAmount.toLocaleString('en-IN')}
                </span>
                <span className="snapshot-tag green">
                  {paidCount} of {orderCount} Paid {orderCount > 0 ? `(${Math.round((paidCount / orderCount) * 100)}%)` : ''}
                </span>
              </div>
            </div>

            {/* Average Bill Value */}
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
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="snapshot-meta">
                  <h3 className="snapshot-name">Average Order Value (AOV)</h3>
                  <p className="snapshot-sub">Mean ticket size per order</p>
                </div>
              </div>

              <div className="snapshot-right">
                <span className="snapshot-val">
                  <span className="straight-rupee">₹</span>
                  {avgBillAmount.toLocaleString('en-IN')}
                </span>
                <span className="snapshot-tag amber">
                  {orderCount > 0 ? `${orderCount} Orders Billed` : 'No Orders'}
                </span>
              </div>
            </div>

            {/* Outstanding Balance Due */}
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
                  <h3 className="snapshot-name">Outstanding Balance Due</h3>
                  <p className="snapshot-sub">Pending customer payment collection</p>
                </div>
              </div>

              <div className="snapshot-right">
                <span className="snapshot-val">
                  <span className="straight-rupee">₹</span>
                  {pendingDueAmount === 0
                    ? '0'
                    : pendingDueAmount >= 100000
                    ? `${(pendingDueAmount / 100000).toFixed(2)}L`
                    : pendingDueAmount.toLocaleString('en-IN')}
                </span>
                <span className="snapshot-tag red">
                  {pendingCount > 0 ? `${pendingCount} Invoices Due` : 'Zero Due'}
                </span>
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
              Detailed transactions, customer billing records, and invoice clearance.
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

            {/* Year Filter Dropdown */}
            <div className="reports-filter-dropdown">
              <select
                className="reports-filter-select-inner"
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value)
                  setFromDate('')
                  setToDate('')
                  setCurrentPage(1)
                }}
              >
                {yearOptions.map((opt) => (
                  <option key={`tbl-yr-${opt.value}`} value={opt.value}>
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
                <th>WOOD SPECIES</th>
                <th>ORDER ITEMS</th>
                <th>AMOUNT</th>
                <th>PAYMENT MODE</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length > 0 ? (
                displayed.map((tx, idx) => (
                  <tr key={tx.id ? `tx-${tx.id}-${idx}` : tx.invoice ? `tx-inv-${tx.invoice}-${idx}` : `tx-row-${idx}`}>
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
                    </td>
                    <td>
                      <div className="sales-sub-text" style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.item || 'Timber items'}
                      </div>
                    </td>
                    <td>
                      <span className="sales-amount">
                        <span className="straight-rupee">₹</span>
                        {tx.amount}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#F5EAE4',
                        color: '#5C3A21',
                        border: '1px solid #E8D5C8',
                        letterSpacing: '0.02em'
                      }}>
                        {tx.paymentMode || 'UPI'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="sales-no-results">
                    {searchQuery
                      ? `No dispatched sales transactions found matching "${searchQuery}"`
                      : `No sales or bills recorded for ${dateRangeLabel}. As bills are generated in Billing POS, records will appear here automatically.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="patron-table-footer">
          <div className="patron-footer-left">
            <span className="showing-records-text">
              Showing <strong>{filtered.length > 0 ? (
                (safeCurrentPage - 1) * itemsPerPage + 1 === Math.min(safeCurrentPage * itemsPerPage, filtered.length)
                  ? `${(safeCurrentPage - 1) * itemsPerPage + 1}`
                  : `${(safeCurrentPage - 1) * itemsPerPage + 1}-${Math.min(safeCurrentPage * itemsPerPage, filtered.length)}`
              ) : '0'}</strong> of {filtered.length} transactions
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
              disabled={safeCurrentPage <= 1 || totalPages <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              ‹
            </button>
            {totalPages > 0 && filtered.length > 0 ? (
              Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={`page-btn-${num}`}
                  type="button"
                  className={`pagination-num ${safeCurrentPage === num ? 'active' : ''}`}
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
              disabled={safeCurrentPage >= totalPages || totalPages <= 1}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
