import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import './Dashboard.css'

const normalizeSaleItem = (sale, idx) => {
  const invoice = sale.invoice || sale.invoiceNumber || sale.id || `INV-${1000 + idx}`
  const customer = sale.customer?.name || (typeof sale.customer === 'string' && sale.customer.trim() ? sale.customer : 'Walk-in Customer')
  const location = sale.location || sale.project || sale.customerAddress || sale.customer?.address || sale.customer?.location || 'Sivakasi Depot'

  let items = ''
  if (typeof sale.items === 'string' && sale.items.trim()) {
    items = sale.items
  } else if (typeof sale.item === 'string' && sale.item.trim()) {
    items = sale.item
  } else if (Array.isArray(sale.items) && sale.items.length > 0) {
    items = sale.items.map((i) => `${i.quantity || 1}x ${i.description || i.name || 'Timber'}`).join(', ')
  } else if (Array.isArray(sale.itemDetails) && sale.itemDetails.length > 0) {
    items = sale.itemDetails.map((i) => `${i.quantity || 1}x ${i.description || i.name || 'Timber'}`).join(', ')
  } else {
    items = sale.wood ? `${sale.wood} Order` : 'Artisanal Timber Order'
  }

  const rawAmount = typeof sale.rawAmount === 'number'
    ? sale.rawAmount
    : typeof sale.amount === 'number'
    ? sale.amount
    : Number(String(sale.amount || 0).replace(/[^0-9.]/g, '')) || 0
  const formattedAmount = '₹' + rawAmount.toLocaleString('en-IN')

  const statusRaw = sale.status || sale.paymentStatus || 'Paid'
  const statusLower = statusRaw.toLowerCase()
  let statusType = 'paid'
  if (statusLower.includes('pending')) {
    statusType = 'pending'
  } else if (statusLower.includes('partial')) {
    statusType = 'partial'
  } else if (statusLower.includes('dispatch')) {
    statusType = 'dispatched'
  }

  return {
    id: sale.id || sale._id || invoice || `tx-${idx}`,
    invoice,
    customer,
    location,
    items,
    rawAmount,
    amount: formattedAmount,
    status: statusRaw,
    statusType,
    original: sale,
  }
}

export default function Dashboard({ onNavigateToNewBill, onNavigateToNewInvoice, onNavigate }) {
  const [recentSales, setRecentSales] = useState(() => {
    const txs = DataStore.getTransactions()
    return Array.isArray(txs) ? txs : []
  })
  const [products, setProducts] = useState(() => DataStore.getProducts())
  const [reorderedMap, setReorderedMap] = useState({})
  const [toastMessage, setToastMessage] = useState('')
  const [salesSearch, setSalesSearch] = useState('')
  const [salesPage, setSalesPage] = useState(1)
  const salesPerPage = 20

  useEffect(() => {
    const handleStoreUpdate = () => {
      setProducts(DataStore.getProducts())
      const txs = DataStore.getTransactions()
      if (Array.isArray(txs)) {
        setRecentSales(txs)
      }
    }
    window.addEventListener('timber_store_updated', handleStoreUpdate)
    return () => window.removeEventListener('timber_store_updated', handleStoreUpdate)
  }, [])

  // Normalized dynamic sales list
  const normalizedSales = useMemo(() => {
    return recentSales.map((s, idx) => normalizeSaleItem(s, idx))
  }, [recentSales])

  // Dynamic calculations from live data
  const totalSalesSum = useMemo(() => {
    return normalizedSales.reduce((acc, s) => acc + (s.rawAmount || 0), 0)
  }, [normalizedSales])

  const totalStockCount = products.reduce((acc, p) => acc + (Number(p.stockQuantity) || 0), 0)

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
    const DUMMY_INVOICES = new Set([
      'INV-1001', 'INV-1002', 'INV-1003', 'INV-1004', 'INV-1005', 'INV-1006',
      'INV-1007', 'INV-1008', 'INV-1009', 'INV-1010', 'INV-1011', 'INV-1012',
      'INV-1013', 'INV-1014', 'INV-1015', 'INV-1016', 'INV-1017', 'INV-1018',
      'INV-1019', 'INV-1020', 'INV-1021', 'INV-1022', 'INV-1023', 'INV-1024'
    ])
    fetch('/api/sales')
      .then((res) => {
        if (!res.ok) throw new Error('Sales network response not ok')
        return res.json()
      })
      .then((data) => {
        if (data?.success && Array.isArray(data.sales)) {
          const realSales = data.sales.filter(s => !DUMMY_INVOICES.has(s.invoice || s.id))
          setRecentSales(realSales)
          DataStore.saveTransactions(realSales)
        } else {
          // If /api/sales is empty, try /api/dashboard
          return fetch('/api/dashboard')
            .then((r) => r.json())
            .then((d) => {
              if (d?.success && Array.isArray(d.recentSales)) {
                const realSales = d.recentSales.filter(s => !DUMMY_INVOICES.has(s.invoice || s.id))
                setRecentSales(realSales)
                DataStore.saveTransactions(realSales)
              }
            })
        }
      })
      .catch((err) => {
        console.warn('[Dashboard] Backend API offline or unreachable, using local dataStore:', err.message)
        const local = DataStore.getTransactions()
        const realSales = (Array.isArray(local) ? local : []).filter(s => !DUMMY_INVOICES.has(s.invoice || s.id))
        setRecentSales(realSales)
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

  const filteredSales = useMemo(() => {
    const q = salesSearch.toLowerCase().trim()
    if (!q) return normalizedSales
    return normalizedSales.filter((sale) => {
      return (
        sale.customer.toLowerCase().includes(q) ||
        sale.invoice.toLowerCase().includes(q) ||
        sale.items.toLowerCase().includes(q) ||
        sale.location.toLowerCase().includes(q) ||
        sale.status.toLowerCase().includes(q)
      )
    })
  }, [normalizedSales, salesSearch])

  const totalSalesPages = Math.ceil(filteredSales.length / salesPerPage) || 1
  const displayedSales = filteredSales.slice(
    (salesPage - 1) * salesPerPage,
    salesPage * salesPerPage
  )

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
          <h1 className="depot-main-title">Dashboard</h1>
          <p className="depot-main-subtitle">
            Overview of sales, inventory, and recent orders.
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
          <div className="kpi-value">₹{totalSalesSum.toLocaleString('en-IN')}</div>
          <span className="kpi-subtext">{recentSales.length} orders processed today</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">TOTAL ITEMS IN STOCK</span>
          <div className="kpi-value">{totalStockCount.toLocaleString('en-IN')}</div>
          <span className="kpi-subtext">Across Sivakasi master timber yards</span>
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

      {/* Middle Section: Low Stock Items */}
      <div className="dashboard-middle-row">
        {/* Dynamic Low Stock Items with Working Reorder */}
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
            <h2 className="table-title">Recent Sales</h2>
            <p className="table-subtitle">
              Completed customer orders and invoices
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
            {displayedSales.length === 0 ? (
              <tr>
                <td colSpan="5" className="dashboard-empty-sales-cell">
                  <div className="dashboard-empty-sales-wrap">
                    <p className="dashboard-empty-title">
                      {salesSearch ? `No sales found matching "${salesSearch}"` : 'No recent sales transactions recorded.'}
                    </p>
                    <p className="dashboard-empty-subtitle">
                      As bills and invoices are completed in Billing & POS, transactions will appear dynamically here.
                    </p>
                    <button type="button" className="btn-dashboard-create-bill" onClick={onNavigateToNewBill}>
                      + Create New Bill
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              displayedSales.map((sale, idx) => (
                <tr
                  key={sale.id || sale.invoice || idx}
                  className="dashboard-sales-row"
                  onClick={() => {
                    if (onNavigate) onNavigate('Billing & POS')
                  }}
                  title="View transaction in Billing & POS"
                >
                  <td className="invoice-col">{sale.invoice}</td>
                  <td className="customer-col">
                    <span className="customer-name">{sale.customer}</span>
                    <span className="customer-location">{sale.location}</span>
                  </td>
                  <td className="items-col">{sale.items}</td>
                  <td className="amount-col">{sale.amount}</td>
                  <td>
                    <span className={`status-badge status-badge-${sale.statusType}`}>
                      {sale.statusType === 'paid' && (
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
                      )}
                      {sale.statusType === 'pending' && (
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
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      )}
                      {sale.statusType === 'partial' && (
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
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      )}
                      {sale.statusType === 'dispatched' && (
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
                          <rect x="1" y="3" width="15" height="13" />
                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                      )}
                      <span>{sale.status}</span>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

        {/* Pagination Bar: 20 per page */}
        <div className="pagination-bar">
          <span className="pagination-info">
            Showing {filteredSales.length > 0 ? (salesPage - 1) * salesPerPage + 1 : 0} -{' '}
            {Math.min(salesPage * salesPerPage, filteredSales.length)} of {filteredSales.length} transactions
          </span>
          <div className="pagination-controls">
            <button
              type="button"
              className="page-btn arrow"
              disabled={salesPage <= 1}
              onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            {Array.from({ length: totalSalesPages }, (_, idx) => idx + 1).map((num) => (
              <button
                key={num}
                type="button"
                className={`page-btn ${salesPage === num ? 'active' : ''}`}
                onClick={() => setSalesPage(num)}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              className="page-btn arrow"
              disabled={salesPage >= totalSalesPages}
              onClick={() => setSalesPage((p) => Math.min(totalSalesPages, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
