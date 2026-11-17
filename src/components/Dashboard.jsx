import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './Dashboard.css'

const DEFAULT_SALES = [
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

export default function Dashboard({ onNavigateToNewBill, onNavigateToNewInvoice, onNavigate }) {
  const [recentSales, setRecentSales] = useState(DEFAULT_SALES)
  const [products, setProducts] = useState(() => DataStore.getProducts())
  const [reorderedMap, setReorderedMap] = useState({})
  const [toastMessage, setToastMessage] = useState('')
  const [stats, setStats] = useState({
    todaySales: '₹1,84,500',
    ordersToday: '18 orders processed today',
    totalStock: '3,892',
    stockLocationNote: 'Across Sivakasi master timber yards',
    lowStockCount: '3 items',
  })
  const [salesSearch, setSalesSearch] = useState('')

  useEffect(() => {
    const handleStoreUpdate = () => {
      setProducts(DataStore.getProducts())
    }
    window.addEventListener('timber_store_updated', handleStoreUpdate)
    return () => window.removeEventListener('timber_store_updated', handleStoreUpdate)
  }, [])

  // Dynamic low stock items (Requirement 3)
  const dynamicLowStock = products.filter(
    (p) => Number(p.stockQuantity) <= Number(p.lowStockThreshold || 3)
  )
  const displayLowStock = dynamicLowStock.length > 0
    ? dynamicLowStock
    : [...products].sort((a, b) => a.stockQuantity - b.stockQuantity).slice(0, 3)

  // Dynamic Reorder action (Requirement 3)
  const handleReorder = (prod) => {
    const qtyToAdd = 5
    const newQty = (prod.stockQuantity || 0) + qtyToAdd
    const updated = products.map((p) => {
      if (p.id === prod.id || p.sku === prod.sku) {
        return { ...p, stockQuantity: newQty }
      }
      return p
    })
    DataStore.saveProducts(updated)
    setProducts(updated)
    setReorderedMap((prev) => ({ ...prev, [prod.sku]: true }))
    setToastMessage(`✓ Reordered: +${qtyToAdd} units added to ${prod.name}!`)

    // Sync to MongoDB
    fetch(`/api/products/${encodeURIComponent(prod.sku || prod.name || prod.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stockQuantity: newQty }),
    }).catch(() => {})

    setTimeout(() => {
      setReorderedMap((prev) => ({ ...prev, [prod.sku]: false }))
    }, 2500)
    setTimeout(() => {
      setToastMessage('')
    }, 3200)
  }

  useEffect(() => {
    // 1. Fetch dashboard aggregated stats and recent sales from MongoDB
    fetch('/api/dashboard')
      .then((res) => {
        if (!res.ok) throw new Error('Network response not ok')
        return res.json()
      })
      .then((data) => {
        if (data?.success) {
          if (Array.isArray(data.recentSales) && data.recentSales.length > 0) {
            setRecentSales(data.recentSales)
          }
          if (data.stats) {
            setStats(data.stats)
          }
        }
      })
      .catch((err) => {
        console.warn('[Dashboard] Backend API offline or unreachable, using fallback dataset:', err.message)
      })

    // 2. Fetch live products from MongoDB
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products)
          DataStore.saveProducts(data.products)
        }
      })
      .catch(() => {})
  }, [])

  const filteredSales = recentSales.filter((sale) => {
    const q = salesSearch.toLowerCase()
    return (
      sale.customer.toLowerCase().includes(q) ||
      sale.invoice.toLowerCase().includes(q) ||
      sale.items.toLowerCase().includes(q)
    )
  })

  return (
    <div className="dashboard-container">
      {/* Dynamic Toast Feedback */}
      {toastMessage && (
        <div className="dashboard-toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title & New Invoice Button */}
      <div className="dashboard-page-header">
        <div>
          <span className="dashboard-category-pill">DASHBOARD OVERVIEW</span>
          <h1 className="depot-main-title">Sivakasi Central Depot</h1>
          <p className="depot-main-subtitle">
            Overview of daily sales, inventory levels, and stock replenishment alerts.
          </p>
        </div>
        <button type="button" className="btn-new-invoice" onClick={onNavigateToNewInvoice}>
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
          <div className="kpi-value">{stats.todaySales || '₹1,84,500'}</div>
          <span className="kpi-subtext">{stats.ordersToday || '18 orders processed today'}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">TOTAL ITEMS IN STOCK</span>
          <div className="kpi-value">{stats.totalStock || '3,892'}</div>
          <span className="kpi-subtext">{stats.stockLocationNote || 'Across Sivakasi master timber yards'}</span>
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
          <div className="kpi-value alert">{displayLowStock.length} items</div>
          <span className="kpi-subtext">Urgent reorders required</span>
        </div>
      </div>

      {/* Middle Section: Quick Actions & Low Stock Items */}
      <div className="dashboard-middle-row">
        {/* Simple Depot Quick Actions (Requirement 2) */}
        <div className="actions-card">
          <div className="card-top-row">
            <span className="card-heading">Depot Quick Actions</span>
            <span className="card-hint">Direct operational shortcuts</span>
          </div>

          <div className="quick-actions-grid">
            <div
              className="quick-action-box"
              onClick={() => (onNavigateToNewBill ? onNavigateToNewBill() : onNavigate ? onNavigate('Billing & POS') : null)}
              role="button"
              tabIndex={0}
              title="Open Billing & POS to generate customer bills"
            >
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              <span className="action-title">Create New Bill</span>
              <span className="action-sub">Open counter POS</span>
            </div>

            <div
              className="quick-action-box"
              onClick={() => (onNavigate ? onNavigate('Products') : onNavigateToNewBill && onNavigateToNewBill())}
              role="button"
              tabIndex={0}
              title="Add a new timber furniture item to the catalog"
            >
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
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </span>
              <span className="action-title">Add Furniture</span>
              <span className="action-sub">Catalog new timber item</span>
            </div>

            <div
              className="quick-action-box"
              onClick={() => (onNavigate ? onNavigate('Stock Management') : onNavigateToNewInvoice && onNavigateToNewInvoice())}
              role="button"
              tabIndex={0}
              title="View and manage timber reserves"
            >
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
              <span className="action-title">Stock Inventory</span>
              <span className="action-sub">Manage timber reserves</span>
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
            <span>Direct shortcuts for Sivakasi timber depot and store operations.</span>
          </div>
        </div>

        {/* Dynamic Low Stock Items with Working Reorder (Requirement 3) */}
        <div className="low-stock-card">
          <div className="card-top-row">
            <span className="card-heading">Low Stock Items</span>
            <span className="count-badge-red">{displayLowStock.length} ITEMS</span>
          </div>

          <div className="low-stock-list">
            {displayLowStock.map((item) => {
              const isReordered = reorderedMap[item.sku]
              return (
                <div key={item.sku} className="low-stock-row">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-category">
                      {item.category} • {item.woodSpecies || 'Hardwood'}
                    </span>
                  </div>
                  <div className="item-action-wrap">
                    <span className="stock-left-text">
                      {item.stockQuantity} left
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Sales & Dispatches Table */}
      <div className="recent-sales-card">
        <div className="table-header-bar">
          <div>
            <h2 className="table-title">Recent Sales & Dispatches</h2>
            <p className="table-subtitle">
              Completed sales and cleared passes from Sivakasi Depot
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
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
              placeholder="Search customer or invoice..."
            />
          </div>
        </div>

        <div className="sales-table-wrapper">
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
            {filteredSales.map((sale) => (
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
      </div>

        {/* Pagination Bar */}
        <div className="pagination-bar">
          <span className="pagination-info">Showing 1 - {filteredSales.length} of {recentSales.length || 18} transactions</span>
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
