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
    paymentMode: sale.paymentMode || 'UPI',
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

  // Today's Sales only (Exact real-time filter for current day)
  const todaySalesList = useMemo(() => {
    const now = new Date()
    const todayY = now.getFullYear()
    const todayM = now.getMonth()
    const todayD = now.getDate()
    const todayISO = now.toISOString().split('T')[0]
    const todayLocale = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const todayGB = now.toLocaleDateString('en-GB')

    return normalizedSales.filter((sale) => {
      const raw = sale.original || sale
      if (raw.rawDate && raw.rawDate === todayISO) return true
      if (typeof raw.invoiceDate === 'string' && raw.invoiceDate.startsWith(todayISO)) return true
      if (typeof raw.createdAt === 'string' && raw.createdAt.startsWith(todayISO)) return true

      const sDate = raw.createdAt || raw.date || raw.rawDate
      if (sDate) {
        const d = new Date(sDate)
        if (!isNaN(d.getTime())) {
          if (d.getFullYear() === todayY && d.getMonth() === todayM && d.getDate() === todayD) {
            return true
          }
        }
      }

      const str = String(raw.date || '')
      return str.includes(todayLocale) || str.includes(todayISO) || str.includes(todayGB)
    })
  }, [normalizedSales])

  // Dynamic calculations from live data
  const totalSalesSum = useMemo(() => {
    return todaySalesList.reduce((acc, s) => acc + (s.rawAmount || 0), 0)
  }, [todaySalesList])

  const todayOrdersCount = todaySalesList.length

  const totalStockCount = useMemo(() => {
    return products.reduce((acc, p) => acc + (Number(p.stockQuantity) || 0), 0)
  }, [products])

  // Real live low stock items from Stock / Products output (No fake slice(0, 3) fallback)
  const dynamicLowStock = useMemo(() => {
    return products.filter((p) => {
      const qty = Number(p.stockQuantity)
      const threshold = Number(p.lowStockThreshold || 2)
      return !isNaN(qty) && qty <= threshold
    })
  }, [products])

  const displayLowStock = dynamicLowStock

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
    fetch('/api/sales')
      .then((res) => {
        if (!res.ok) throw new Error('Sales network response not ok')
        return res.json()
      })
      .then((data) => {
        if (data?.success && Array.isArray(data.sales)) {
          setRecentSales(data.sales)
          DataStore.saveTransactions(data.sales)
        } else {
          // If /api/sales is empty, try /api/dashboard
          return fetch('/api/dashboard')
            .then((r) => r.json())
            .then((d) => {
              if (d?.success && Array.isArray(d.recentSales)) {
                setRecentSales(d.recentSales)
                DataStore.saveTransactions(d.recentSales)
              }
            })
        }
      })
      .catch((err) => {
        console.warn('[Dashboard] Backend API offline or unreachable, using local dataStore:', err.message)
        const local = DataStore.getTransactions()
        setRecentSales(Array.isArray(local) ? local : [])
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
    if (!q) return todaySalesList
    return todaySalesList.filter((sale) => {
      return (
        sale.customer.toLowerCase().includes(q) ||
        sale.invoice.toLowerCase().includes(q) ||
        sale.items.toLowerCase().includes(q) ||
        sale.location.toLowerCase().includes(q) ||
        sale.status.toLowerCase().includes(q)
      )
    })
  }, [todaySalesList, salesSearch])

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
          <span className="kpi-subtext">
            {todayOrdersCount} {todayOrdersCount === 1 ? 'order' : 'orders'} processed today
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">TOTAL ITEMS IN STOCK</span>
          <div className="kpi-value">{totalStockCount.toLocaleString('en-IN')}</div>
          <span className="kpi-subtext">{products.length} catalog wood products tracked</span>
        </div>

        <div className="kpi-card">
          <span className={`kpi-label ${displayLowStock.length > 0 ? 'alert' : ''}`}>
            {displayLowStock.length > 0 && (
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
            )}
            LOW STOCK ALERTS
          </span>
          <div className={`kpi-value ${displayLowStock.length > 0 ? 'alert' : ''}`}>
            {displayLowStock.length} {displayLowStock.length === 1 ? 'item' : 'items'}
          </div>
          <span className="kpi-subtext">
            {displayLowStock.length > 0 ? 'Urgent reorders required' : 'Stock levels optimal'}
          </span>
        </div>
      </div>

      {/* Middle Section: Low Stock Items */}
      <div className="dashboard-middle-row">
        {/* Dynamic Low Stock Items with Working Reorder */}
        <div className="low-stock-card">
          <div className="card-top-row">
            <span className="card-heading">Low Stock Items</span>
            <span className={displayLowStock.length > 0 ? 'count-badge-red' : 'count-badge-green'}>
              {displayLowStock.length} ITEMS
            </span>
          </div>

          <div className="low-stock-list">
            {displayLowStock.length === 0 ? (
              <div className="low-stock-empty" style={{ padding: '24px 12px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                <p style={{ fontWeight: 600, color: '#166534', marginBottom: '4px' }}>✓ All Timber Stock Levels Optimal</p>
                <p style={{ margin: 0, fontSize: '12px' }}>No catalog products are currently below their minimum threshold.</p>
              </div>
            ) : (
              displayLowStock.map((item) => {
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
                      <button
                        type="button"
                        className={`btn-reorder ${isReordered ? 'reordered' : ''}`}
                        onClick={() => handleReorder(item)}
                        disabled={isReordered}
                      >
                        {isReordered ? '✓ Reordered' : '+ Reorder'}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Sales & Dispatches Table */}
      <div className="recent-sales-card">
        <div className="table-header-bar">
          <div>
            <h2 className="table-title">Recent Sales (Today's Orders)</h2>
            <p className="table-subtitle">
              Completed customer orders and invoices created today
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
                <th>PAYMENT MODE</th>
              </tr>
            </thead>
            <tbody>
            {displayedSales.length === 0 ? (
              <tr>
                <td colSpan="5" className="dashboard-empty-sales-cell">
                  <div className="dashboard-empty-sales-wrap">
                    <p className="dashboard-empty-title">
                      {salesSearch ? `No sales found matching "${salesSearch}"` : 'No sales transactions recorded today.'}
                    </p>
                    <p className="dashboard-empty-subtitle">
                      Completed customer bills created in Billing & POS today will appear automatically here.
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
                      {sale.paymentMode || 'UPI'}
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
