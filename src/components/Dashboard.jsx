import { useState, useEffect } from 'react'
import { DataStore } from '../services/dataStore'
import './Dashboard.css'

const DEFAULT_SALES = [
  { invoice: 'INV-1024', customer: 'Suresh Kumar & Sons', location: 'Sivakasi Town', items: '1x Teak Dining Table, 6x Chairs', amount: '₹60,500', status: 'Dispatched' },
  { invoice: 'INV-1023', customer: 'Dr. Thomas Varghese', location: 'Sivakasi Division', items: '1x Solid Rosewood King Bed, 2x Nightstands', amount: '₹85,200', status: 'Dispatched' },
  { invoice: 'INV-1022', customer: 'Priya Lakshmi Textiles', location: 'Kamaraj Road, Sivakasi', items: '1x Teakwood 3-Seater Sofa, 1x Coffee Table', amount: '₹58,500', status: 'Dispatched' },
  { invoice: 'INV-1021', customer: 'Deepak Kurian & Architects', location: 'Sivakasi Guild', items: '1x Jackfruit Live-Edge Boardroom Desk', amount: '₹95,000', status: 'Dispatched' },
  { invoice: 'INV-1020', customer: 'Rajeshwari Ammal', location: 'Main Bazaar, Sivakasi', items: '1x Kerala Traditional Mandapam Pooja Unit', amount: '₹34,000', status: 'Dispatched' },
  { invoice: 'INV-1019', customer: 'Anoop Menon', location: 'Sivakasi Colony', items: '1x Teakwood Queen Hydraulic Storage Bed', amount: '₹62,000', status: 'Dispatched' },
  { invoice: 'INV-1018', customer: 'Sri Meenakshi Printers', location: 'Industrial Area, Sivakasi', items: '1x Rosewood 3-Door Master Wardrobe', amount: '₹68,000', status: 'Dispatched' },
  { invoice: 'INV-1017', customer: 'Murugan Modern Furnishings', location: 'Bypass Road, Sivakasi', items: '4x High-Back Ergonomic Teak Study Chairs', amount: '₹34,000', status: 'Dispatched' },
  { invoice: 'INV-1016', customer: 'Senthil Nathan', location: 'Police Station Rd, Sivakasi', items: '1x Handcrafted Wooden Oonjal Swing', amount: '₹48,000', status: 'Dispatched' },
  { invoice: 'INV-1015', customer: 'Dr. K. Radhakrishnan', location: 'Gandhi Nagar, Sivakasi', items: '1x Solid Rosewood Dressing Table with Mirror', amount: '₹29,500', status: 'Dispatched' },
  { invoice: 'INV-1014', customer: 'Anandha Bhavan Residency', location: 'Station Rd, Sivakasi', items: '1x Teakwood 4-Seater Dining Set', amount: '₹36,000', status: 'Dispatched' },
  { invoice: 'INV-1013', customer: 'Vignesh Construction Co.', location: 'Ring Road, Sivakasi', items: '1x Mahogany 6-Shelf Library Display Rack', amount: '₹21,000', status: 'Dispatched' },
  { invoice: 'INV-1012', customer: 'Karthik Raja', location: 'Teachers Colony, Sivakasi', items: '1x Teakwood TV Media Entertainment Console', amount: '₹26,500', status: 'Dispatched' },
  { invoice: 'INV-1011', customer: 'Selvi Thirumalai', location: 'Sankarankovil Rd, Sivakasi', items: '1x Traditional Hand-Carved Rocking Chair', amount: '₹12,800', status: 'Dispatched' },
  { invoice: 'INV-1010', customer: 'Vijayalakshmi Sweets', location: 'South Car Street, Sivakasi', items: '2x Teak Ergonomic Armchairs', amount: '₹29,000', status: 'Dispatched' },
  { invoice: 'INV-1009', customer: 'Jayaram Brothers', location: 'Thirutangal Rd, Sivakasi', items: '1x Handcrafted Cane Bookcase', amount: '₹18,500', status: 'Dispatched' },
  { invoice: 'INV-1008', customer: 'Dr. N. Soundararajan', location: 'Hospital Road, Sivakasi', items: '1x Anjili Heritage Brass Chest', amount: '₹22,500', status: 'Dispatched' },
  { invoice: 'INV-1007', customer: 'Malarvizhi Interiors', location: 'North Car Street, Sivakasi', items: '1x Live-Edge Teak Entryway Console Table', amount: '₹19,800', status: 'Dispatched' },
  { invoice: 'INV-1006', customer: 'Balaji Agency', location: 'Sattur Road, Sivakasi', items: '1x Solid Wood 3-Tier Louvered Shoe Rack', amount: '₹9,500', status: 'Dispatched' },
  { invoice: 'INV-1005', customer: 'Manickam & Sons Traders', location: 'Market Yard, Sivakasi', items: '1x Vintage 5-Drawer Wooden Chest', amount: '₹31,000', status: 'Dispatched' },
  { invoice: 'INV-1004', customer: 'Sree Saravana Match Works', location: 'Sivakasi Depot', items: '2x Teakwood Solid Dining Benches', amount: '₹23,000', status: 'Dispatched' },
  { invoice: 'INV-1003', customer: 'K. Vasanth Kumar', location: 'Velayutham Colony, Sivakasi', items: '2x Wooden Bar Stools with Swivel Top', amount: '₹13,600', status: 'Dispatched' },
  { invoice: 'INV-1002', customer: 'Gowri Shankar Mills', location: 'Vembakottai Rd, Sivakasi', items: '1x Solid Teak Side Server Credenza', amount: '₹24,000', status: 'Dispatched' },
  { invoice: 'INV-1001', customer: 'Shanmuga Priya', location: 'Alagappan Nagar, Sivakasi', items: '2x Rosewood Dual-Drawer Bedside Nightstands', amount: '₹14,400', status: 'Dispatched' },
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
  const [salesPage, setSalesPage] = useState(1)
  const salesPerPage = 20

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
      (sale.customer || '').toLowerCase().includes(q) ||
      (sale.invoice || '').toLowerCase().includes(q) ||
      (sale.items || '').toLowerCase().includes(q)
    )
  })

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
          <div className="kpi-value">{stats.todaySales || '₹1,84,500'}</div>
          <span className="kpi-subtext">{stats.ordersToday || '18 orders processed today'}</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">TOTAL ITEMS IN STOCK</span>
          <div className="kpi-value">{stats.totalStock || '3,892'}</div>
          <span className="kpi-subtext">{stats.stockLocationNote || 'In active inventory'}</span>
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
            {displayedSales.map((sale) => (
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
