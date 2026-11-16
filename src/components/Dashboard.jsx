import './Dashboard.css'

export default function Dashboard() {
  const recentSales = [
    {
      invoice: '#KWF-0891',
      customer: 'Anoop Menon',
      location: 'Panampilly Nagar, Kochi',
      items: '1x Solid Rosewood Royal King Bed, 2x Nightstands',
      amount: '₹78,400',
      status: 'Dispatched',
    },
    {
      invoice: '#KWF-0890',
      customer: 'Lakshmi Nair',
      location: 'Thottakkattukara, Aluva',
      items: '1x Nilambur Teak Dining Table, 6x Artisan Chairs',
      amount: '₹52,000',
      status: 'Dispatched',
    },
    {
      invoice: '#KWF-0889',
      customer: 'Dr. Thomas Varghese',
      location: 'Kumaranalloor, Kottayam',
      items: '2x Teakwood Ergonomic Armchairs, 1x Coffee Table',
      amount: '₹31,500',
      status: 'Dispatched',
    },
    {
      invoice: '#KWF-0888',
      customer: 'Deepak Kurian & Architects',
      location: 'Fort Kochi Heritage Zone',
      items: '1x Handcrafted Cane Bookcase, 1x Side Table',
      amount: '₹22,600',
      status: 'Dispatched',
    },
  ]

  const lowStockItems = [
    {
      name: 'Nilambur Teak 6-Seater',
      category: 'Dining Table',
      count: '2 left',
    },
    {
      name: 'Solid Rosewood King Bed',
      category: 'Hand-Carved Headboard',
      count: '1 left',
    },
    {
      name: 'Teakwood Ergonomic Armchair',
      category: 'Cane Weave Seating',
      count: '3 left',
    },
    {
      name: 'Cane & Teak Bookcase',
      category: '5-Tier Architectural',
      count: '2 left',
    },
  ]

  return (
    <div className="dashboard-container">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-search-container">
          <span className="topbar-search-icon">
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
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="text"
            className="topbar-search-input"
            placeholder="Lookup SKU, Timber Batch, Invoice #..."
          />
        </div>

        <div className="topbar-actions">
          <div className="time-badge">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B07D4F"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Today • Kerala Standard Time</span>
          </div>

          <button type="button" className="btn-new-bill">
            <span>+ + New Bill</span>
          </button>

          <div className="user-profile-widget">
            <div className="user-meta">
              <span className="user-name">Rajesh Sivan</span>
              <span className="user-role">Depot Lead & Store Manager</span>
            </div>
            <div className="user-avatar-circle">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Page Title & New Invoice Button */}
      <div className="dashboard-page-header">
        <div>
          <h1 className="depot-main-title">Ernakulam Central Depot</h1>
          <p className="depot-main-subtitle">
            Overview of daily sales, inventory levels, and stock replenishment alerts.
          </p>
        </div>
        <button type="button" className="btn-new-invoice">
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <span>+ New Invoice</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-cards-grid">
        <div className="kpi-card">
          <span className="kpi-label">TODAY'S SALES</span>
          <div className="kpi-value">₹1,84,500</div>
          <span className="kpi-subtext">18 orders processed today</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">TOTAL ITEMS IN STOCK</span>
          <div className="kpi-value">3,892</div>
          <span className="kpi-subtext">Across Nilambur & Kochi depots</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label alert">
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
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            LOW STOCK ALERTS
          </span>
          <div className="kpi-value alert">4 items</div>
          <span className="kpi-subtext">Urgent reorders required</span>
        </div>
      </div>

      {/* Middle Section: Quick Actions & Low Stock Items */}
      <div className="dashboard-middle-row">
        {/* Depot Quick Actions */}
        <div className="actions-card">
          <div className="card-top-row">
            <span className="card-heading">Depot Quick Actions</span>
            <span className="card-hint">Common depot workflows</span>
          </div>

          <div className="quick-actions-grid">
            <div className="quick-action-box">
              <span className="action-icon-wrap">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 22V12" />
                </svg>
              </span>
              <span className="action-title">Stock Inward</span>
              <span className="action-sub">Receive new wood lots</span>
            </div>

            <div className="quick-action-box">
              <span className="action-icon-wrap">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  <polyline points="9 14 11 16 15 11" />
                </svg>
              </span>
              <span className="action-title">Requisition</span>
              <span className="action-sub">Order workshop timber</span>
            </div>

            <div className="quick-action-box">
              <span className="action-icon-wrap">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span className="action-title">Gate Audit</span>
              <span className="action-sub">Clear vehicle pass</span>
            </div>
          </div>

          <div className="timber-fsc-note">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#A0724A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>All timber FSC certified and tracked from Nilambur mill.</span>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="low-stock-card">
          <div className="card-top-row">
            <span className="card-heading">Low Stock Items</span>
            <span className="count-badge-red">4 ITEMS</span>
          </div>

          <div className="low-stock-list">
            {lowStockItems.map((item) => (
              <div key={item.name} className="low-stock-row">
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-category">{item.category}</span>
                </div>
                <div className="item-action-wrap">
                  <span className="stock-left-text">{item.count}</span>
                  <button type="button" className="btn-reorder">
                    Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Sales & Dispatches Table */}
      <div className="recent-sales-card">
        <div className="table-header-bar">
          <div>
            <h2 className="table-title">Recent Sales & Dispatches</h2>
            <p className="table-subtitle">
              Completed sales and cleared passes from Ernakulam Depot
            </p>
          </div>

          <div className="table-search-box">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9E8E85"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="table-search-input"
              placeholder="Search customer or invoice..."
            />
          </div>
        </div>

        <table className="sales-table">
          <thead>
            <tr>
              <th>INVOICE #</th>
              <th>CUSTOMER</th>
              <th>ITEMS ORDERED</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {recentSales.map((sale) => (
              <tr key={sale.invoice}>
                <td className="invoice-col">{sale.invoice}</td>
                <td className="customer-col">
                  <span className="customer-name">{sale.customer}</span>
                  <span className="customer-location">{sale.location}</span>
                </td>
                <td className="items-col">{sale.items}</td>
                <td className="amount-col">{sale.amount}</td>
                <td>
                  <span className="status-badge-dispatched">
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
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{sale.status}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div className="pagination-bar">
          <span className="pagination-info">Showing 1 - 4 of 18 transactions</span>
          <div className="pagination-controls">
            <button type="button" className="page-btn arrow">
              ‹
            </button>
            <button type="button" className="page-btn active">
              1
            </button>
            <button type="button" className="page-btn">
              2
            </button>
            <button type="button" className="page-btn">
              3
            </button>
            <button type="button" className="page-btn arrow">
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
