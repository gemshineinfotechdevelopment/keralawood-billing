import { useState } from 'react'
import './ReportsAnalytics.css'

export default function ReportsAnalytics() {
  const [selectedMonth, setSelectedMonth] = useState('October 2024')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Transaction Ledger Data
  const allTransactions = [
    {
      id: 'INV-892',
      date: 'Oct 28, 2024',
      customer: 'Kumarakom Lake Resort',
      project: 'Heritage Suites Wing B',
      wood: 'Nilambur Teak',
      item: '8-Seater Suite',
      volume: 48,
      amount: '4,85,000',
      status: 'Paid',
    },
    {
      id: 'INV-889',
      date: 'Oct 26, 2024',
      customer: 'Dr. Ananya Verma',
      project: 'Private Residence, Kochi',
      wood: 'Malabar Rosewood',
      item: 'Bed Suite',
      volume: 32,
      amount: '2,45,000',
      status: 'Paid',
    },
    {
      id: 'INV-885',
      date: 'Oct 24, 2024',
      customer: 'Malabar Heritage Club',
      project: 'Clubhouse Dining Hall',
      wood: 'Wild Anjili Dining',
      item: '16 Sets',
      volume: 64,
      amount: '5,20,000',
      status: 'Paid',
    },
    {
      id: 'INV-881',
      date: 'Oct 21, 2024',
      customer: 'Brunton Boatyard',
      project: 'Heritage Suite 204',
      wood: 'Teak Wardrobe',
      item: 'Armoire',
      volume: 28,
      amount: '1,95,000',
      status: 'Paid',
    },
    {
      id: 'INV-878',
      date: 'Oct 18, 2024',
      customer: 'The Leela Kovalam',
      project: 'Deck Renovation',
      wood: '12 Teak Sun Loungers',
      item: 'Weather-Treated',
      volume: 52,
      amount: '3,80,000',
      status: 'Paid',
    },
    {
      id: 'INV-872',
      date: 'Oct 15, 2024',
      customer: 'Carnoustie Ayurveda Resort',
      project: 'Villa Veranda Re-timbering',
      wood: 'Nilambur Teak',
      item: 'Pillars & Loungers',
      volume: 68,
      amount: '6,10,000',
      status: 'Paid',
    },
    {
      id: 'INV-867',
      date: 'Oct 12, 2024',
      customer: 'Kochi Heritage Home',
      project: 'Fort Kochi Restoration',
      wood: 'Kerala Rosewood',
      item: 'Ceiling Rafters & Beams',
      volume: 42,
      amount: '3,40,000',
      status: 'Paid',
    },
  ]

  // Filter transactions
  const filtered = allTransactions.filter((tx) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return (
      tx.id.toLowerCase().includes(q) ||
      tx.customer.toLowerCase().includes(q) ||
      tx.project.toLowerCase().includes(q) ||
      tx.wood.toLowerCase().includes(q) ||
      tx.item.toLowerCase().includes(q)
    )
  })

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
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="October 2024">This Month (Oct 2024)</option>
              <option value="September 2024">Last Month (Sep 2024)</option>
              <option value="August 2024">August 2024</option>
              <option value="FY 2024-25">Full Year (FY 24-25)</option>
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
              <span className="straight-rupee">₹</span>48.25 Lakhs
            </span>
          </div>

          <div className="reports-kpi-meta-row">
            <span className="kpi-trend-green">↗+12.4%</span>
            <span className="kpi-subtext">vs last month</span>
          </div>

          <div className="reports-kpi-divider" />

          <div className="reports-kpi-footer">
            <span className="kpi-footer-label">Gross Margin Target</span>
            <span className="kpi-footer-status green">Achieved 104%</span>
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
              1,420 <span className="kpi-unit">CFT</span>
            </span>
          </div>

          <div className="reports-kpi-meta-row">
            <span className="kpi-badge-orders">34 client orders</span>
            <span className="kpi-subtext">fulfilled on schedule</span>
          </div>

          <div className="reports-kpi-divider" />

          <div className="reports-kpi-footer">
            <span className="kpi-footer-label">Depot Yard Stock</span>
            <span className="kpi-footer-status amber">Ernakulam Central Yard</span>
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
                stroke="#5C4537"
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
            {/* Item 1 */}
            <div className="species-progress-item">
              <div className="species-item-header">
                <div className="species-name-wrap">
                  <span className="species-dot" style={{ backgroundColor: '#31190B' }} />
                  <span className="species-name">Nilambur Teak</span>
                </div>
                <div className="species-stat-wrap">
                  <span className="species-percent">45%</span>
                  <span className="species-rev">
                    <span className="straight-rupee">₹</span>21.7L
                  </span>
                </div>
              </div>
              <div className="species-progress-track">
                <div
                  className="species-progress-bar"
                  style={{ width: '45%', backgroundColor: '#31190B' }}
                />
              </div>
            </div>

            {/* Item 2 */}
            <div className="species-progress-item">
              <div className="species-item-header">
                <div className="species-name-wrap">
                  <span className="species-dot" style={{ backgroundColor: '#C88D58' }} />
                  <span className="species-name">Kerala Rosewood</span>
                </div>
                <div className="species-stat-wrap">
                  <span className="species-percent">30%</span>
                  <span className="species-rev">
                    <span className="straight-rupee">₹</span>14.5L
                  </span>
                </div>
              </div>
              <div className="species-progress-track">
                <div
                  className="species-progress-bar"
                  style={{ width: '30%', backgroundColor: '#C88D58' }}
                />
              </div>
            </div>

            {/* Item 3 */}
            <div className="species-progress-item">
              <div className="species-item-header">
                <div className="species-name-wrap">
                  <span className="species-dot" style={{ backgroundColor: '#1A4D2E' }} />
                  <span className="species-name">Wild Anjili Wood</span>
                </div>
                <div className="species-stat-wrap">
                  <span className="species-percent">15%</span>
                  <span className="species-rev">
                    <span className="straight-rupee">₹</span>7.2L
                  </span>
                </div>
              </div>
              <div className="species-progress-track">
                <div
                  className="species-progress-bar"
                  style={{ width: '15%', backgroundColor: '#1A4D2E' }}
                />
              </div>
            </div>

            {/* Item 4 */}
            <div className="species-progress-item">
              <div className="species-item-header">
                <div className="species-name-wrap">
                  <span className="species-dot" style={{ backgroundColor: '#8C7B72' }} />
                  <span className="species-name">Country Hardwood & Mahogany</span>
                </div>
                <div className="species-stat-wrap">
                  <span className="species-percent">10%</span>
                  <span className="species-rev">
                    <span className="straight-rupee">₹</span>4.8L
                  </span>
                </div>
              </div>
              <div className="species-progress-track">
                <div
                  className="species-progress-bar"
                  style={{ width: '10%', backgroundColor: '#8C7B72' }}
                />
              </div>
            </div>
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
                stroke="#5C4537"
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
                <span className="snapshot-val">28</span>
                <span className="snapshot-tag green">Complete</span>
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
                <span className="snapshot-val">6</span>
                <span className="snapshot-tag amber">Active</span>
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
                  <span className="straight-rupee">₹</span>3.4L
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
              <span>October 2024</span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
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
                        <span>{tx.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="sales-no-results">
                    No dispatched sales transactions found matching &quot;{searchQuery}&quot;
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
              Showing <strong>1-5</strong> of <strong>34</strong> Dispatched Sales Invoices
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

            <button
              type="button"
              className={`pagination-num-btn ${currentPage === 1 ? 'active' : ''}`}
              onClick={() => setCurrentPage(1)}
            >
              1
            </button>
            <button
              type="button"
              className={`pagination-num-btn ${currentPage === 2 ? 'active' : ''}`}
              onClick={() => setCurrentPage(2)}
            >
              2
            </button>
            <button
              type="button"
              className={`pagination-num-btn ${currentPage === 3 ? 'active' : ''}`}
              onClick={() => setCurrentPage(3)}
            >
              3
            </button>

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
