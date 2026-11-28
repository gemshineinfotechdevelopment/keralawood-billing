import { useState, useEffect, useMemo } from 'react'
import { DataStore } from '../services/dataStore'
import kwfLogo from '../assets/kwf.jpg'
import './ReportsAnalytics.css'

export default function ReportsAnalytics({ userRole = 'super_admin' }) {
  const isSuperAdmin = userRole === 'super_admin'
  const settings = DataStore.getSettings()
  const now = new Date()
  const currentYear = settings.systemDate
    ? (new Date(settings.systemDate).getFullYear() || now.getFullYear()).toString()
    : now.getFullYear().toString()

  // Navigation tab state: 'overview' | 'salesperson'
  const [activeReportTab, setActiveReportTab] = useState('overview')

  // Overview Report states
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateSortOrder, setDateSortOrder] = useState('newest') // 'newest' | 'oldest' | 'sales_high' | 'sales_low' | 'discount_high'
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [exportSuccess, setExportSuccess] = useState(false)

  // Sales Person Report specific states
  const [selectedSalesPerson, setSelectedSalesPerson] = useState('all')
  const [spYear, setSpYear] = useState(currentYear)
  const [spFromDate, setSpFromDate] = useState('')
  const [spToDate, setSpToDate] = useState('')
  const [spSearchQuery, setSpSearchQuery] = useState('')
  const [spDateSortOrder, setSpDateSortOrder] = useState('newest')
  const [spCurrentPage, setSpCurrentPage] = useState(1)
  const [spItemsPerPage, setSpItemsPerPage] = useState(20)
  const [spExportSuccess, setSpExportSuccess] = useState(false)

  // Dispatch & Delivery Schedule specific states
  const [dispatchScope, setDispatchScope] = useState('all') // 'all' | 'today' | 'upcoming' | 'past'
  const [dispatchFromDate, setDispatchFromDate] = useState('')
  const [dispatchToDate, setDispatchToDate] = useState('')
  const [dispatchSearchQuery, setDispatchSearchQuery] = useState('')
  const [dispatchCurrentPage, setDispatchCurrentPage] = useState(1)
  const [dispatchItemsPerPage, setDispatchItemsPerPage] = useState(20)
  const [dispatchExportSuccess, setDispatchExportSuccess] = useState(false)

  const [transactions, setTransactions] = useState(() => DataStore.getTransactions())
  const [salesPersonsList, setSalesPersonsList] = useState(() => DataStore.getSalesPersons())

  // Sync with store updates and MongoDB backend
  useEffect(() => {
    const handleUpdate = () => {
      setTransactions(DataStore.getTransactions())
      setSalesPersonsList(DataStore.getSalesPersons())
    }
    window.addEventListener('timber_store_updated', handleUpdate)
    DataStore.syncFromBackend()

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

  // -------------------------------------------------------------
  // OVERVIEW REPORT CALCULATIONS
  // -------------------------------------------------------------
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
      tx.item?.toLowerCase().includes(q) ||
      (tx.salesPerson || tx.billedBy || '').toLowerCase().includes(q)
    )
  })

  // Dynamic calculations based strictly on the selected range
  const totalRawAmount = yearTransactions.reduce((sum, tx) => {
    if (tx.rawAmount) return sum + tx.rawAmount
    const cleaned = Number(String(tx.amount).replace(/[^0-9.]/g, '')) || 0
    return sum + cleaned
  }, 0)

  const orderCount = yearTransactions.length

  const totalActualSellingPrice = yearTransactions.reduce((sum, tx) => {
    const act = tx.actualSellingPrice !== undefined
      ? Number(tx.actualSellingPrice)
      : (Number(tx.rawAmount || 0) + Number(tx.discount || 0))
    return sum + act
  }, 0)

  const totalDiscountReduced = yearTransactions.reduce((sum, tx) => {
    return sum + (Number(tx.discount) || 0)
  }, 0)

  const totalNetSalesMargin = totalRawAmount

  const overallDiscountMarginPct = totalActualSellingPrice > 0
    ? Number(((totalDiscountReduced / totalActualSellingPrice) * 100).toFixed(2))
    : 0

  const overallSalesMarginPct = totalActualSellingPrice > 0
    ? Number(((totalNetSalesMargin / totalActualSellingPrice) * 100).toFixed(2))
    : 100

  // Timestamp helper for robust date sorting
  const getTxTimestamp = (tx) => {
    if (tx.createdAt) {
      const d = new Date(tx.createdAt)
      if (!isNaN(d.getTime())) return d.getTime()
    }
    if (tx.rawDate) {
      const d = new Date(tx.rawDate)
      if (!isNaN(d.getTime())) return d.getTime()
    }
    if (tx.date) {
      const d = new Date(tx.date)
      if (!isNaN(d.getTime())) return d.getTime()
    }
    return 0
  }

  // Date-wise & margin sorting for overview table
  const sortedTransactions = useMemo(() => {
    const list = [...filtered]
    return list.sort((a, b) => {
      if (dateSortOrder === 'newest') {
        const timeDiff = getTxTimestamp(b) - getTxTimestamp(a)
        if (timeDiff !== 0) return timeDiff
        return String(b.invoice || b.id || '').localeCompare(String(a.invoice || a.id || ''), undefined, { numeric: true })
      }
      if (dateSortOrder === 'oldest') {
        const timeDiff = getTxTimestamp(a) - getTxTimestamp(b)
        if (timeDiff !== 0) return timeDiff
        return String(a.invoice || a.id || '').localeCompare(String(b.invoice || b.id || ''), undefined, { numeric: true })
      }
      if (dateSortOrder === 'sales_high') {
        return (b.rawAmount || 0) - (a.rawAmount || 0)
      }
      if (dateSortOrder === 'sales_low') {
        return (a.rawAmount || 0) - (b.rawAmount || 0)
      }
      if (dateSortOrder === 'discount_high') {
        return (b.discount || 0) - (a.discount || 0)
      }
      if (dateSortOrder === 'discount_margin_high') {
        return (b.discountMarginPct || 0) - (a.discountMarginPct || 0)
      }
      return getTxTimestamp(b) - getTxTimestamp(a)
    })
  }, [filtered, dateSortOrder])

  const toggleDateSort = () => {
    setDateSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
    setCurrentPage(1)
  }

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

  const totalPages = sortedTransactions.length > 0 ? Math.ceil(sortedTransactions.length / itemsPerPage) : 0
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const displayed = totalPages > 0 ? sortedTransactions.slice(
    (safeCurrentPage - 1) * itemsPerPage,
    safeCurrentPage * itemsPerPage
  ) : []

  // Format revenue display
  const revenueDisplay =
    totalRawAmount === 0
      ? '0.00'
      : totalRawAmount >= 100000
      ? `${(totalRawAmount / 100000).toFixed(2)} Lakhs`
      : totalRawAmount.toLocaleString('en-IN')

  // -------------------------------------------------------------
  // SALES PERSON REPORT CALCULATIONS (SUPER ADMIN ONLY)
  // -------------------------------------------------------------
  // Consolidate all salespersons: registered list + any names recorded in transactions
  const allSalesPersons = useMemo(() => {
    const list = [...salesPersonsList]
    const seen = new Set(list.map((s) => (s.name || '').trim().toLowerCase()))
    transactions.forEach((tx) => {
      const sp = (tx.salesPerson || tx.billedBy || '').trim()
      if (sp && !seen.has(sp.toLowerCase()) && !sp.toLowerCase().includes('walk-in') && sp !== 'Unassigned') {
        seen.add(sp.toLowerCase())
        list.push({
          id: `sp-${sp.toLowerCase().replace(/\s+/g, '-')}`,
          code: 'SP',
          name: sp,
          phone: '',
          ordersClosed: 0,
        })
      }
    })
    return list
  }, [salesPersonsList, transactions])

  // Date/Year filter for Sales Person report
  const isSpDateRangeActive = Boolean(spFromDate || spToDate)
  const isMatchSpDateRange = (tx) => {
    if (String(tx.year) === '2024' || String(tx.date).includes('2024')) return false
    if (isSpDateRangeActive) {
      const txDateStr = getTxDateString(tx)
      if (!txDateStr) return false
      if (spFromDate && txDateStr < spFromDate) return false
      if (spToDate && txDateStr > spToDate) return false
      return true
    }
    return isMatchYear(tx, spYear)
  }

  const spDateFilteredTransactions = useMemo(() => {
    return transactions.filter(isMatchSpDateRange)
  }, [transactions, spFromDate, spToDate, spYear])

  // Aggregated performance statistics for each salesperson in active period
  const spStatsMap = useMemo(() => {
    const map = {}
    allSalesPersons.forEach((sp) => {
      map[sp.name] = {
        code: sp.code || 'SP',
        name: sp.name,
        phone: sp.phone || '—',
        revenue: 0,
        count: 0,
        transactions: [],
        woodBreakdown: {},
      }
    })

    // Unassigned bucket for counter or unspecified staff
    map['Unassigned'] = {
      code: '—',
      name: 'Direct Counter / Unassigned',
      phone: '—',
      revenue: 0,
      count: 0,
      transactions: [],
      woodBreakdown: {},
    }

    spDateFilteredTransactions.forEach((tx) => {
      const rawName = (tx.salesPerson || tx.billedBy || '').trim()
      const matchedKey = Object.keys(map).find(
        (k) => k.toLowerCase() === rawName.toLowerCase()
      ) || (rawName ? rawName : 'Unassigned')

      if (!map[matchedKey]) {
        map[matchedKey] = {
          code: 'SP',
          name: matchedKey,
          phone: '—',
          revenue: 0,
          count: 0,
          transactions: [],
          woodBreakdown: {},
        }
      }

      const amt = tx.rawAmount || Number(String(tx.amount).replace(/[^0-9.]/g, '')) || 0
      map[matchedKey].revenue += amt
      map[matchedKey].count += 1
      map[matchedKey].transactions.push(tx)

      const wood = tx.wood || 'Artisan Timber'
      map[matchedKey].woodBreakdown[wood] = (map[matchedKey].woodBreakdown[wood] || 0) + 1
    })

    return map
  }, [allSalesPersons, spDateFilteredTransactions])

  // Overall team totals in period
  const totalTeamRevenue = spDateFilteredTransactions.reduce((sum, tx) => {
    return sum + (tx.rawAmount || Number(String(tx.amount).replace(/[^0-9.]/g, '')) || 0)
  }, 0)
  const totalTeamBills = spDateFilteredTransactions.length

  // Filtered transactions for the Sales Person detailed table
  const spTransactionsList = useMemo(() => {
    let list = []
    if (selectedSalesPerson === 'all') {
      list = spDateFilteredTransactions
    } else {
      const target = selectedSalesPerson.toLowerCase().trim()
      list = spDateFilteredTransactions.filter((tx) => {
        const staff = (tx.salesPerson || tx.billedBy || '').toLowerCase().trim()
        if (target === 'unassigned') {
          return !staff || staff === 'unassigned' || staff.includes('counter')
        }
        return staff === target
      })
    }

    if (!spSearchQuery.trim()) return list
    const q = spSearchQuery.toLowerCase().trim()
    return list.filter((tx) => {
      return (
        tx.id.toLowerCase().includes(q) ||
        tx.customer.toLowerCase().includes(q) ||
        tx.project?.toLowerCase().includes(q) ||
        tx.wood?.toLowerCase().includes(q) ||
        tx.item?.toLowerCase().includes(q) ||
        (tx.salesPerson || tx.billedBy || '').toLowerCase().includes(q)
      )
    })
  }, [spDateFilteredTransactions, selectedSalesPerson, spSearchQuery])

  // Active salesperson stats
  const activeSpStats = useMemo(() => {
    if (selectedSalesPerson === 'all') {
      // Find top executive
      const sorted = Object.values(spStatsMap)
        .filter((s) => s.name !== 'Direct Counter / Unassigned' && s.count > 0)
        .sort((a, b) => b.revenue - a.revenue)
      const topSp = sorted[0] || null

      return {
        revenue: totalTeamRevenue,
        bills: totalTeamBills,
        avgBill: totalTeamBills > 0 ? Math.round(totalTeamRevenue / totalTeamBills) : 0,
        topName: topSp ? `${topSp.name} (₹${topSp.revenue.toLocaleString('en-IN')})` : '—',
        activeStaffCount: Object.values(spStatsMap).filter((s) => s.count > 0).length,
      }
    }

    const matchedKey = Object.keys(spStatsMap).find(
      (k) => k.toLowerCase() === selectedSalesPerson.toLowerCase()
    ) || selectedSalesPerson
    const stats = spStatsMap[matchedKey] || { revenue: 0, count: 0, woodBreakdown: {} }

    // Top selling wood species for this salesperson
    const woodEntries = Object.entries(stats.woodBreakdown || {}).sort((a, b) => b[1] - a[1])
    const topWood = woodEntries[0] ? `${woodEntries[0][0]} (${woodEntries[0][1]} bills)` : 'Artisan Teak'

    const share = totalTeamRevenue > 0 ? ((stats.revenue / totalTeamRevenue) * 100).toFixed(1) : '0.0'

    return {
      revenue: stats.revenue,
      bills: stats.count,
      avgBill: stats.count > 0 ? Math.round(stats.revenue / stats.count) : 0,
      share: `${share}%`,
      topWood,
    }
  }, [selectedSalesPerson, spStatsMap, totalTeamRevenue, totalTeamBills])

  // Date-wise & margin sorting for salesperson table
  const spSortedTransactions = useMemo(() => {
    const list = [...spTransactionsList]
    return list.sort((a, b) => {
      if (spDateSortOrder === 'newest') {
        const timeDiff = getTxTimestamp(b) - getTxTimestamp(a)
        if (timeDiff !== 0) return timeDiff
        return String(b.invoice || b.id || '').localeCompare(String(a.invoice || a.id || ''), undefined, { numeric: true })
      }
      if (spDateSortOrder === 'oldest') {
        const timeDiff = getTxTimestamp(a) - getTxTimestamp(b)
        if (timeDiff !== 0) return timeDiff
        return String(a.invoice || a.id || '').localeCompare(String(b.invoice || b.id || ''), undefined, { numeric: true })
      }
      if (spDateSortOrder === 'sales_high') {
        return (b.rawAmount || 0) - (a.rawAmount || 0)
      }
      if (spDateSortOrder === 'sales_low') {
        return (a.rawAmount || 0) - (b.rawAmount || 0)
      }
      if (spDateSortOrder === 'discount_high') {
        return (b.discount || 0) - (a.discount || 0)
      }
      if (spDateSortOrder === 'discount_margin_high') {
        return (b.discountMarginPct || 0) - (a.discountMarginPct || 0)
      }
      return getTxTimestamp(b) - getTxTimestamp(a)
    })
  }, [spTransactionsList, spDateSortOrder])

  const toggleSpDateSort = () => {
    setSpDateSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
    setSpCurrentPage(1)
  }

  // Pagination for Sales Person table
  const spTotalPages = spSortedTransactions.length > 0 ? Math.ceil(spSortedTransactions.length / spItemsPerPage) : 0
  const safeSpCurrentPage = spTotalPages > 0 ? Math.min(spCurrentPage, spTotalPages) : 1
  const spDisplayedTransactions = spTotalPages > 0 ? spSortedTransactions.slice(
    (safeSpCurrentPage - 1) * spItemsPerPage,
    safeSpCurrentPage * spItemsPerPage
  ) : []

  const spDateRangeLabel = isSpDateRangeActive
    ? `${spFromDate || 'Beginning'} → ${spToDate || 'Today'}`
    : spYear === 'all'
    ? 'All-Time'
    : `Year ${spYear}`

  const handleSetSpToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setSpFromDate(today)
    setSpToDate(today)
    setSpCurrentPage(1)
  }

  const handleSetSpThisMonth = () => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const today = now.toISOString().split('T')[0]
    setSpFromDate(firstDay)
    setSpToDate(today)
    setSpCurrentPage(1)
  }

  const handleClearSpDateFilter = () => {
    setSpFromDate('')
    setSpToDate('')
    setSpYear(currentYear)
    setSpCurrentPage(1)
  }

  // -------------------------------------------------------------
  // PRINT & EXPORT ACTIONS
  // -------------------------------------------------------------
  const handleExportCSV = (dataToExport, filename) => {
    if (!dataToExport || dataToExport.length === 0) {
      alert('⚠️ No transaction data to export.')
      return
    }

    const headers = [
      'Invoice / Bill #',
      'Date',
      'Customer',
      'Sales Person',
      'Wood Species',
      'Items',
      'Actual Selling Price (INR)',
      'Discount Reduced (INR)',
      'Discount Reduction Margin (%)',
      'Net Sales Margin (INR)',
      'Sales Margin Realized (%)',
      'Payment Mode',
      'Status'
    ]
    const rows = dataToExport.map((t) => {
      const netAmt = t.rawAmount || Number(String(t.amount).replace(/[^0-9.]/g, '')) || 0
      const disc = Number(t.discount || 0)
      const actual = t.actualSellingPrice !== undefined ? Number(t.actualSellingPrice) : (netAmt + disc)
      const discMargin = actual > 0 ? Number(((disc / actual) * 100).toFixed(2)) : 0
      const salesMargin = actual > 0 ? Number(((netAmt / actual) * 100).toFixed(2)) : 100
      return [
        `"${t.id || t.invoice}"`,
        `"${t.date || t.rawDate}"`,
        `"${(t.customer || '').replace(/"/g, '""')}"`,
        `"${(t.salesPerson || t.billedBy || 'Direct Counter').replace(/"/g, '""')}"`,
        `"${(t.wood || '').replace(/"/g, '""')}"`,
        `"${(t.item || '').replace(/"/g, '""')}"`,
        actual,
        disc,
        `${discMargin}%`,
        netAmt,
        `${salesMargin}%`,
        `"${t.paymentMode || 'UPI'}"`,
        `"${t.status || 'Paid'}"`,
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintReport = (title, subtitle, targetSalesPerson = null) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      alert('⚠️ Popup blocked. Please allow popups to print report.')
      return
    }

    const txList = targetSalesPerson && targetSalesPerson !== 'all'
      ? spTransactionsList
      : spDateFilteredTransactions

    const totalAmt = txList.reduce((acc, t) => acc + (t.rawAmount || Number(String(t.amount).replace(/[^0-9.]/g, '')) || 0), 0)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - Kerala Wood Furniture</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #31190B; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #C88D58; padding-bottom: 14px; margin-bottom: 18px; }
          .title-area h1 { margin: 0; font-size: 22px; color: #31190B; }
          .title-area p { margin: 4px 0 0; font-size: 12px; color: #6A564A; }
          .badge { background: #FAF5F1; border: 1px solid #C88D58; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #31190B; }
          .kpi-row { display: flex; gap: 12px; margin-bottom: 20px; }
          .kpi-card { flex: 1; background: #FAF5F1; border: 1px solid #EAE0D8; border-radius: 6px; padding: 12px; }
          .kpi-label { font-size: 10px; font-weight: 700; color: #8C7B72; text-transform: uppercase; }
          .kpi-val { font-size: 18px; font-weight: 700; color: #31190B; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          th { background: #31190B; color: #FFFFFF; text-align: left; padding: 8px 10px; font-weight: 600; }
          td { padding: 8px 10px; border-bottom: 1px solid #EAE0D8; color: #31190B; }
          tr:nth-child(even) { background: #FAF8F6; }
          .amt { text-align: right; font-weight: 700; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #C88D58; padding-top: 15px; font-size: 11px; color: #8C7B72; }
          .sign-box { text-align: center; border-top: 1px solid #31190B; width: 180px; padding-top: 5px; color: #31190B; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>${settings.depotName || 'Kerala Wood Furniture Depot'}</h1>
            <p>${title} | ${subtitle}</p>
            <p style="margin-top:2px;">Period: <strong>${spDateRangeLabel}</strong> | Generated: ${new Date().toLocaleString()}</p>
          </div>
          <div class="badge">🔒 SUPER ADMIN AUDIT REPORT</div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Total Revenue</div>
            <div class="kpi-val">₹${totalAmt.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Bills / Invoices Closed</div>
            <div class="kpi-val">${txList.length} Bills</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Sales Person Filter</div>
            <div class="kpi-val" style="font-size: 15px;">${targetSalesPerson === 'all' ? 'All Staff Members' : targetSalesPerson}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Average Ticket Size</div>
            <div class="kpi-val">₹${txList.length > 0 ? Math.round(totalAmt / txList.length).toLocaleString('en-IN') : '0'}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>BILL #</th>
              <th>DATE</th>
              <th>CUSTOMER</th>
              <th>SALES PERSON</th>
              <th>WOOD / ITEMS</th>
              <th>PAYMENT</th>
              <th style="text-align:right;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${txList.map((t) => `
              <tr>
                <td><strong>${t.id || t.invoice}</strong></td>
                <td>${t.date || t.rawDate}</td>
                <td>${t.customer || 'Walk-in'}</td>
                <td><strong>${t.salesPerson || t.billedBy || 'Direct Counter'}</strong></td>
                <td>${t.wood || 'Artisan Wood'} - ${t.item || 'Furniture Items'}</td>
                <td>${t.paymentMode || 'UPI'} (${t.status || 'Paid'})</td>
                <td class="amt">₹${Number(t.rawAmount || String(t.amount).replace(/[^0-9.]/g, '') || 0).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>
            <p>Report certified strictly for internal Depot auditing and staff sales performance analysis.</p>
            <p>Depot: Sivakasi Main Yard, Tamil Nadu | GSTIN: ${settings.gstin || '33AAECK1234F1Z5'}</p>
          </div>
          <div class="sign-box">
            Authorized Signature<br/>(Super Admin)
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  // =========================================================
  // DISPATCH & DELIVERY SCHEDULE (EVERYDAY & FUTURE)
  // =========================================================
  const todayDateStr = settings.systemDate
    ? new Date(settings.systemDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  const dispatchRecords = useMemo(() => {
    return transactions.map((t) => {
      const explicitDispatch = (t.dispatchDate || '').trim()
      const effectiveDate = explicitDispatch || (t.rawDate || '').trim() || todayDateStr
      
      let urgency = 'past'
      let daysDiff = 0
      
      if (effectiveDate === todayDateStr) {
        urgency = 'today'
        daysDiff = 0
      } else if (effectiveDate > todayDateStr) {
        urgency = 'upcoming'
        const msDiff = new Date(effectiveDate).getTime() - new Date(todayDateStr).getTime()
        daysDiff = Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)))
      } else {
        urgency = 'past'
        const msDiff = new Date(todayDateStr).getTime() - new Date(effectiveDate).getTime()
        daysDiff = -Math.max(1, Math.round(msDiff / (1000 * 60 * 60 * 24)))
      }

      const rawAmt = t.rawAmount !== undefined
        ? Number(t.rawAmount)
        : Number(String(t.amount || 0).replace(/[^0-9.]/g, '')) || 0

      const custName = typeof t.customer === 'object' && t.customer !== null
        ? (t.customer.name || 'Walk-in Customer')
        : (String(t.customer || '').trim() || 'Walk-in Customer')

      const custPhone = (typeof t.customer === 'object' && t.customer !== null ? t.customer.phone : null) || t.customerPhone || ''
      const custAddress = (typeof t.customer === 'object' && t.customer !== null ? t.customer.address : null) || t.customerAddress || t.project || t.location || ''

      return {
        ...t,
        effectiveDispatchDate: effectiveDate,
        isExplicitSchedule: Boolean(explicitDispatch),
        urgency,
        daysDiff,
        parsedAmount: rawAmt,
        custName,
        custPhone,
        custAddress,
      }
    })
  }, [transactions, todayDateStr])

  // Scope counts & KPI metrics
  const todayDispatchList = useMemo(() => dispatchRecords.filter((r) => r.urgency === 'today'), [dispatchRecords])
  const upcomingDispatchList = useMemo(() => dispatchRecords.filter((r) => r.urgency === 'upcoming'), [dispatchRecords])
  const pastDispatchList = useMemo(() => dispatchRecords.filter((r) => r.urgency === 'past'), [dispatchRecords])

  const todayCount = todayDispatchList.length
  const todayTotalValue = todayDispatchList.reduce((sum, r) => sum + r.parsedAmount, 0)

  const upcomingCount = upcomingDispatchList.length
  const upcomingTotalValue = upcomingDispatchList.reduce((sum, r) => sum + r.parsedAmount, 0)

  const totalTrackedShipments = dispatchRecords.length
  const totalTrackedValue = dispatchRecords.reduce((sum, r) => sum + r.parsedAmount, 0)

  // Filtered dispatch schedule list
  const filteredDispatchRecords = useMemo(() => {
    return dispatchRecords.filter((r) => {
      // 1. Scope filter
      if (dispatchScope === 'today' && r.urgency !== 'today') return false
      if (dispatchScope === 'upcoming' && r.urgency !== 'upcoming') return false
      if (dispatchScope === 'past' && r.urgency !== 'past') return false

      // 2. Date Range filter
      if (dispatchFromDate && r.effectiveDispatchDate < dispatchFromDate) return false
      if (dispatchToDate && r.effectiveDispatchDate > dispatchToDate) return false

      // 3. Search query filter
      if (dispatchSearchQuery.trim()) {
        const q = dispatchSearchQuery.toLowerCase()
        const inv = String(r.invoice || r.id || '').toLowerCase()
        const cName = String(r.custName || '').toLowerCase()
        const cPhone = String(r.custPhone || '').toLowerCase()
        const vNum = String(r.vehicleNumber || '').toLowerCase()
        const items = String(r.items || r.item || '').toLowerCase()
        if (!inv.includes(q) && !cName.includes(q) && !cPhone.includes(q) && !vNum.includes(q) && !items.includes(q)) {
          return false
        }
      }

      return true
    }).sort((a, b) => {
      if (dispatchScope === 'upcoming') {
        return a.effectiveDispatchDate.localeCompare(b.effectiveDispatchDate)
      }
      return b.effectiveDispatchDate.localeCompare(a.effectiveDispatchDate)
    })
  }, [dispatchRecords, dispatchScope, dispatchFromDate, dispatchToDate, dispatchSearchQuery])

  // Pagination for dispatch schedule
  const dispatchTotalPages = Math.ceil(filteredDispatchRecords.length / dispatchItemsPerPage) || 1
  const safeDispatchCurrentPage = Math.min(Math.max(dispatchCurrentPage, 1), dispatchTotalPages)
  const paginatedDispatchRecords = useMemo(() => {
    const start = (safeDispatchCurrentPage - 1) * dispatchItemsPerPage
    return filteredDispatchRecords.slice(start, start + dispatchItemsPerPage)
  }, [filteredDispatchRecords, safeDispatchCurrentPage, dispatchItemsPerPage])

  // Export Dispatch Schedule to CSV
  const handleExportDispatchCSV = () => {
    const headers = [
      'Status / Urgency',
      'Scheduled Dispatch Date',
      'Invoice #',
      'Invoice Date',
      'Customer Name',
      'Customer Phone',
      'Delivery Destination',
      'Vehicle Number',
      'Timber Items / Goods',
      'Total Amount (Rs)',
      'Payment Mode',
      'Payment Status',
    ]

    const rows = filteredDispatchRecords.map((r) => [
      `"${r.urgency === 'today' ? 'TODAY' : r.urgency === 'upcoming' ? `UPCOMING (in ${r.daysDiff} days)` : 'COMPLETED / PAST'}"`,
      `"${r.effectiveDispatchDate}"`,
      `"${r.invoice || r.id}"`,
      `"${r.rawDate || r.date || ''}"`,
      `"${(r.custName || '').replace(/"/g, '""')}"`,
      `"${(r.custPhone || '').replace(/"/g, '""')}"`,
      `"${(r.custAddress || '').replace(/"/g, '""')}"`,
      `"${(r.vehicleNumber || 'Self Pickup').replace(/"/g, '""')}"`,
      `"${(r.items || r.item || 'Timber Furniture').replace(/"/g, '""')}"`,
      r.parsedAmount,
      `"${r.paymentMode || 'UPI'}"`,
      `"${r.status || 'Paid'}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Dispatch_Schedule_${dispatchScope}_${todayDateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setDispatchExportSuccess(true)
    setTimeout(() => setDispatchExportSuccess(false), 3000)
  }

  // Print Dispatch Manifest (All filtered deliveries)
  const handlePrintDispatchManifest = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=750')
    if (!printWindow) {
      alert('⚠️ Popup blocked. Please allow popups to print dispatch manifest.')
      return
    }

    const scopeTitle = dispatchScope === 'today'
      ? "TODAY'S ACTIVE DISPATCH MANIFEST"
      : dispatchScope === 'upcoming'
      ? "UPCOMING & FUTURE SCHEDULED DELIVERIES"
      : dispatchScope === 'past'
      ? "PAST & COMPLETED DISPATCH RECORD"
      : "MASTER TIMBER DISPATCH & DELIVERY SCHEDULE"

    const totalManifestAmt = filteredDispatchRecords.reduce((sum, r) => sum + r.parsedAmount, 0)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${scopeTitle} - ${settings.depotName || 'Kerala Wood Furniture'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #31190B; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #C88D58; padding-bottom: 12px; margin-bottom: 16px; }
          .title-area h1 { margin: 0; font-size: 20px; color: #31190B; }
          .title-area p { margin: 3px 0 0; font-size: 11.5px; color: #6A564A; }
          .badge { background: #FAF5F1; border: 1px solid #C88D58; padding: 5px 12px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #31190B; }
          .kpi-row { display: flex; gap: 12px; margin-bottom: 16px; }
          .kpi-card { flex: 1; background: #FAF5F1; border: 1px solid #EAE0D8; border-radius: 6px; padding: 10px 14px; }
          .kpi-label { font-size: 9.5px; font-weight: 700; color: #8C7B72; text-transform: uppercase; }
          .kpi-val { font-size: 16px; font-weight: 700; color: #31190B; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 8px; }
          th { background: #31190B; color: #FFFFFF; text-align: left; padding: 7px 8px; font-weight: 600; font-size: 10px; }
          td { padding: 7px 8px; border-bottom: 1px solid #EAE0D8; color: #31190B; vertical-align: top; }
          tr:nth-child(even) { background: #FAF8F6; }
          .tag-today { background: #FEF3C7; color: #92400E; font-weight: 700; padding: 2px 6px; border-radius: 3px; font-size: 9.5px; }
          .tag-upcoming { background: #EFF6FF; color: #1E40AF; font-weight: 700; padding: 2px 6px; border-radius: 3px; font-size: 9.5px; }
          .tag-past { background: #F3F4F6; color: #4B5563; padding: 2px 6px; border-radius: 3px; font-size: 9.5px; }
          .amt { text-align: right; font-weight: 700; }
          .footer { margin-top: 26px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #C88D58; padding-top: 14px; font-size: 10.5px; color: #8C7B72; }
          .sign-col { text-align: center; border-top: 1px solid #31190B; width: 150px; padding-top: 4px; font-weight: 600; color: #31190B; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <h1>${settings.depotName || 'Kerala Wood Furniture Depot'}</h1>
            <p><strong>${scopeTitle}</strong></p>
            <p>System Date: <strong>${todayDateStr}</strong> | Generated: ${new Date().toLocaleString()}</p>
          </div>
          <div class="badge">🚚 DEPOT DISPATCH MANIFEST</div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Orders Listed</div>
            <div class="kpi-val">${filteredDispatchRecords.length} Shipments</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Manifest Total Value</div>
            <div class="kpi-val">₹${totalManifestAmt.toLocaleString('en-IN')}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Today's Priority</div>
            <div class="kpi-val">${todayCount} Scheduled</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Future Bookings</div>
            <div class="kpi-val">${upcomingCount} Advance Orders</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>S.NO</th>
              <th>STATUS</th>
              <th>DISPATCH DATE</th>
              <th>BILL #</th>
              <th>CUSTOMER & DESTINATION</th>
              <th>PHONE</th>
              <th>VEHICLE NO</th>
              <th>TIMBER ITEMS</th>
              <th style="text-align: right;">AMOUNT</th>
              <th>SIGNATURE</th>
            </tr>
          </thead>
          <tbody>
            ${filteredDispatchRecords.map((r, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>
                  <span class="${r.urgency === 'today' ? 'tag-today' : r.urgency === 'upcoming' ? 'tag-upcoming' : 'tag-past'}">
                    ${r.urgency === 'today' ? 'TODAY ⚡' : r.urgency === 'upcoming' ? `IN ${r.daysDiff}D` : 'DONE'}
                  </span>
                </td>
                <td><strong>${r.effectiveDispatchDate}</strong></td>
                <td>#${r.invoice || r.id}${r.referenceNumber ? `<br/><span style="font-size: 9.5px; color: #1E40AF; font-weight: 700;">Ref: ${r.referenceNumber}</span>` : ''}</td>
                <td><strong>${r.custName}</strong><br/><span style="font-size: 9.5px; color: #6A564A;">${r.custAddress || 'Local Sivakasi'}</span></td>
                <td>${r.custPhone || 'N/A'}</td>
                <td><strong>${r.vehicleNumber || 'Self Pickup'}</strong></td>
                <td>${r.items || r.item || 'Timber Furniture Goods'}</td>
                <td class="amt">₹${r.parsedAmount.toLocaleString('en-IN')}</td>
                <td style="width: 80px; border-bottom: 1px dotted #ccc;"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>
            <p>Certified for Depot Gatepass & Dispatch Clearance.</p>
            <p>Depot: Sivakasi Central Mill Yard | Phone: ${settings.contactPhone || 'N/A'}</p>
          </div>
          <div style="display: flex; gap: 20px;">
            <div class="sign-col">Lorry Driver Sign</div>
            <div class="sign-col">Gatepass Security</div>
            <div class="sign-col">Depot Manager</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  // Print Delivery Challan for a single order
  const handlePrintDeliveryChallan = (record) => {
    const printWindow = window.open('', '_blank', 'width=850,height=700')
    if (!printWindow) {
      alert('⚠️ Popup blocked. Please allow popups to print delivery challan.')
      return
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Delivery Challan #${record.invoice || record.id} - ${settings.depotName || 'Kerala Wood Furniture'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 28px; color: #31190B; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #C88D58; padding-bottom: 14px; margin-bottom: 16px; }
          .brand h1 { margin: 0; font-size: 22px; color: #31190B; }
          .brand p { margin: 3px 0; font-size: 11.5px; color: #6A564A; }
          .challan-badge { border: 2px solid #31190B; padding: 6px 14px; font-weight: 800; font-size: 13px; text-align: center; border-radius: 4px; }
          .grid { display: flex; justify-content: space-between; margin: 18px 0; gap: 20px; font-size: 12px; }
          .box { flex: 1; border: 1px solid #EAE0D8; padding: 12px; border-radius: 6px; background: #FAF5F1; }
          .box h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #8C7B72; }
          table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 14px; }
          th { background: #31190B; color: #FFFFFF; text-align: left; padding: 8px 10px; }
          td { padding: 9px 10px; border-bottom: 1px solid #EAE0D8; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 11px; color: #31190B; }
          .sign-box { text-align: center; border-top: 1px solid #31190B; width: 170px; padding-top: 6px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <h1>${settings.depotName || 'Kerala Wood Furniture'}</h1>
            <p>${settings.address || 'Central Mill Yard, Sivakasi, Tamil Nadu'}</p>
            <p>Phone: ${settings.contactPhone || 'N/A'} • GSTIN: ${settings.gstin || '33AAECK1234F1Z5'}</p>
          </div>
          <div>
            <div class="challan-badge">DELIVERY CHALLAN<br/><span style="font-size: 10px; font-weight: 600;">(GOODS DISPATCH PASS)</span></div>
          </div>
        </div>

        <div class="grid">
          <div class="box">
            <h4>DISPATCH & BILL PARTICULARS</h4>
            <p style="margin: 4px 0;"><strong>Invoice / Bill #:</strong> #${record.invoice || record.id}</p>
            <p style="margin: 4px 0;"><strong>Invoice Date:</strong> ${record.rawDate || record.date}</p>
            <p style="margin: 4px 0; color: #8C5325;"><strong>Scheduled Dispatch Date:</strong> ${record.effectiveDispatchDate}</p>
            <p style="margin: 4px 0;"><strong>Transport Vehicle:</strong> ${record.vehicleNumber || 'Self Transport'}</p>
          </div>
          <div class="box">
            <h4>DELIVERY DESTINATION (CONSIGNEE)</h4>
            <p style="margin: 4px 0; font-size: 13px;"><strong>${record.custName}</strong></p>
            <p style="margin: 4px 0;">Address: ${record.custAddress || 'Local Sivakasi'}</p>
            <p style="margin: 4px 0;">Phone: ${record.custPhone || 'N/A'}</p>
            <p style="margin: 4px 0;">Payment: <strong>${record.status || 'Paid'}</strong> (${record.paymentMode || 'UPI'})</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>PARTICULARS / TIMBER GOODS</th>
              <th style="width: 100px;">WOOD SPECIES</th>
              <th style="width: 120px; text-align: right;">VALUE (RS)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>${record.items || record.item || 'Timber Furniture Order'}</strong></td>
              <td>${record.wood || 'Teak / Artisan'}</td>
              <td style="text-align: right; font-weight: 700;">₹${record.parsedAmount.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 18px; padding: 10px 14px; background: #FAF8F6; border-radius: 6px; font-size: 11px; color: #6A564A;">
          <strong>Declaration:</strong> Goods described above are dispatched in good order and condition. Kindly inspect all items upon unloading at customer destination.
        </div>

        <div class="footer">
          <div class="sign-box">
            Driver / Transporter Sign
          </div>
          <div class="sign-box">
            Security Gate Clearance
          </div>
          <div class="sign-box">
            Customer / Consignee Sign
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="reports-page-container">
      {/* Page Header */}
      <div className="reports-header">
        <div className="reports-title-wrap">
          <div className="reports-breadcrumb-pill">
            <span style={{ color: '#2E7D32', fontWeight: 800 }}>●</span>
            <span>AUDIT & ANALYTICS WORKSPACE</span>
          </div>
          <h1 className="reports-main-title">Reports & Analytics</h1>
          <p className="reports-main-subtitle">
            Sales turnover, staff performance tracking, and invoice clearance reports.
          </p>
        </div>

        <div className="reports-header-actions">
          {/* Main Top Tab Switcher */}
          <div className="reports-tab-nav-group">
            <button
              type="button"
              className={`reports-nav-tab-btn ${activeReportTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveReportTab('overview')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>General Sales Report</span>
            </button>

            {/* Dispatch & Delivery Schedule Tab (Admin & Super Admin) */}
            <button
              type="button"
              className={`reports-nav-tab-btn ${activeReportTab === 'dispatch' ? 'active' : ''}`}
              onClick={() => setActiveReportTab('dispatch')}
              title="Everyday & Future Dispatch Schedule"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span>🚚 Dispatch Schedule</span>
              {todayCount > 0 ? (
                <span style={{
                  background: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: '2px'
                }}>
                  {todayCount} Today
                </span>
              ) : upcomingCount > 0 ? (
                <span style={{
                  background: '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: '2px'
                }}>
                  {upcomingCount} Upcoming
                </span>
              ) : null}
            </button>

            {/* Sales Person Report Tab (Super Admin Only) */}
            <button
              type="button"
              className={`reports-nav-tab-btn ${activeReportTab === 'salesperson' ? 'active' : ''} ${!isSuperAdmin ? 'locked' : ''}`}
              onClick={() => {
                if (!isSuperAdmin) {
                  alert('🔒 Restricted Access: Only Super Admin is authorized to view Sales Person Performance & Individual Commission Reports.')
                  return
                }
                setActiveReportTab('salesperson')
              }}
              title={isSuperAdmin ? 'View Sales Person Performance Report' : 'Locked: Super Admin Only'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Sales Person Report</span>
              <span className={`reports-tab-lock-badge ${isSuperAdmin ? 'super-tag' : 'locked-tag'}`}>
                {isSuperAdmin ? '👑 Super Admin' : '🔒 Locked'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: GENERAL SALES REPORT (VISIBLE TO ALL ROLES)        */}
      {/* ========================================================= */}
      {activeReportTab === 'overview' && (
        <>
          {/* Date Range Filter Bar */}
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

          {/* Row 1: 4 KPI Summary Cards for Sales, Margins & Discount Reductions */}
          <div className="reports-kpi-grid">
            {/* Card 1: Total Net Sales Margin (Realized Revenue) */}
            <div className="reports-kpi-card">
              <div className="reports-kpi-top">
                <span className="reports-kpi-label">TOTAL SALES MARGIN</span>
                <div className="reports-kpi-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                    <circle cx="7" cy="15" r="1" />
                  </svg>
                </div>
              </div>

              <div className="reports-kpi-main">
                <span className="reports-kpi-val">
                  <span className="straight-rupee">₹</span>{totalNetSalesMargin === 0 ? '0.00' : totalNetSalesMargin.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="reports-kpi-meta-row">
                <span className={orderCount > 0 ? 'kpi-trend-green' : 'kpi-subtext'}>
                  {orderCount > 0 ? `↗ ${overallSalesMarginPct}% Realized` : '• Standby'}
                </span>
                <span className="kpi-subtext">net billed sales in {dateRangeLabel}</span>
              </div>

              <div className="reports-kpi-divider" />

              <div className="reports-kpi-footer">
                <span className="kpi-footer-label">Realized Sales Value</span>
                <span className="kpi-footer-status green">{orderCount > 0 ? `${overallSalesMarginPct}% Retained` : 'Tracking'}</span>
              </div>
            </div>

            {/* Card 2: Actual Selling Value (Before Discount) */}
            <div className="reports-kpi-card">
              <div className="reports-kpi-top">
                <span className="reports-kpi-label">ACTUAL SELLING VALUE</span>
                <div className="reports-kpi-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                  <span className="straight-rupee">₹</span>{totalActualSellingPrice === 0 ? '0.00' : totalActualSellingPrice.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="reports-kpi-meta-row">
                <span className="kpi-badge-orders">{orderCount} {orderCount === 1 ? 'Bill' : 'Bills'}</span>
                <span className="kpi-subtext">original retail value before discount</span>
              </div>

              <div className="reports-kpi-divider" />

              <div className="reports-kpi-footer">
                <span className="kpi-footer-label">Gross Value</span>
                <span className="kpi-footer-status amber">100% Catalog Value</span>
              </div>
            </div>

            {/* Card 3: Discount Reduction Margin */}
            <div className="reports-kpi-card">
              <div className="reports-kpi-top">
                <span className="reports-kpi-label">DISCOUNT REDUCTION MARGIN</span>
                <div className="reports-kpi-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="5" x2="5" y2="19" />
                    <circle cx="6.5" cy="6.5" r="2.5" />
                    <circle cx="17.5" cy="17.5" r="2.5" />
                  </svg>
                </div>
              </div>

              <div className="reports-kpi-main">
                <span className="reports-kpi-val" style={{ color: totalDiscountReduced > 0 ? '#C62828' : '#31190B' }}>
                  {totalDiscountReduced > 0 ? `-₹${totalDiscountReduced.toLocaleString('en-IN')}` : '₹0.00'}
                </span>
              </div>

              <div className="reports-kpi-meta-row">
                <span className="kpi-badge-discount-rate" style={{
                  backgroundColor: totalDiscountReduced > 0 ? '#FEE2E2' : '#F5EAE4',
                  color: totalDiscountReduced > 0 ? '#991B1B' : '#7D6C63',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {totalDiscountReduced > 0 ? `-${overallDiscountMarginPct}% Reduction` : '0% Discount'}
                </span>
                <span className="kpi-subtext">reduced from actual selling price</span>
              </div>

              <div className="reports-kpi-divider" />

              <div className="reports-kpi-footer">
                <span className="kpi-footer-label">Reduction Impact</span>
                <span className={`kpi-footer-status ${totalDiscountReduced > 0 ? 'red' : 'green'}`}>
                  {totalDiscountReduced > 0 ? `-${overallDiscountMarginPct}% Margin Reduced` : 'Zero Discount Given'}
                </span>
              </div>
            </div>

            {/* Card 4: Net Margin Retention */}
            <div className="reports-kpi-card">
              <div className="reports-kpi-top">
                <span className="reports-kpi-label">MARGIN RETENTION</span>
                <div className="reports-kpi-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </div>
              </div>

              <div className="reports-kpi-main">
                <span className="reports-kpi-val">{orderCount > 0 ? `${overallSalesMarginPct}%` : '100%'}</span>
              </div>

              <div className="reports-kpi-meta-row">
                <span className="kpi-badge-optimal">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{overallSalesMarginPct >= 90 ? 'Optimal' : 'Discount Heavy'}</span>
                </span>
                <span className="kpi-subtext">{totalDiscountReduced > 0 ? `${overallDiscountMarginPct}% given in discounts` : 'Full 100% retail realization'}</span>
              </div>

              <div className="reports-kpi-divider" />

              <div className="reports-kpi-footer">
                <span className="kpi-footer-label">Margin Health</span>
                <span className={`kpi-footer-status ${overallSalesMarginPct >= 90 ? 'green' : 'amber'}`}>
                  {overallSalesMarginPct >= 90 ? 'Healthy Margin' : 'Discount Review Advised'}
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Recent Sales Report Table Card with Margins & Date-Wise Sorting */}
          <div className="reports-table-card">
            {/* Table Top Header */}
            <div className="reports-table-header">
              <div>
                <h2 className="reports-table-title">Recent Sales Report</h2>
                <p className="reports-table-subtitle">
                  Detailed transactions with Actual Selling Price, Discount Reduction Margin, and Realized Sales Margin.
                </p>
              </div>

              <div className="reports-table-controls">
                {/* Search Input */}
                <div className="reports-search-box">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search invoice, client, staff, wood..."
                    className="reports-search-input"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>

                {/* Date-Wise & Margin Sort Dropdown */}
                <div className="reports-filter-dropdown">
                  <select
                    className="reports-filter-select-inner"
                    value={dateSortOrder}
                    onChange={(e) => {
                      setDateSortOrder(e.target.value)
                      setCurrentPage(1)
                    }}
                    title="Sort sales records by date or margins"
                  >
                    <option value="newest">📅 Date: Newest First</option>
                    <option value="oldest">📅 Date: Oldest First</option>
                    <option value="sales_high">💰 Highest Sales Margin First</option>
                    <option value="sales_low">📉 Lowest Sales Margin First</option>
                    <option value="discount_high">🏷️ Highest Discount First</option>
                    <option value="discount_margin_high">📊 Highest Discount Margin % First</option>
                  </select>
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

                {/* Export Button */}
                <button
                  type="button"
                  className="btn-export-report"
                  onClick={() => {
                    handleExportCSV(sortedTransactions, `sales_report_${selectedYear}`)
                    setExportSuccess(true)
                    setTimeout(() => setExportSuccess(false), 2500)
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{exportSuccess ? '✓ CSV Exported' : 'Export CSV'}</span>
                </button>
              </div>
            </div>

            {/* Sales Table with Sales Margin and Discount Reduction Margin Columns */}
            <div className="reports-table-wrapper">
              <table className="reports-sales-table">
                <thead>
                  <tr>
                    <th
                      onClick={toggleDateSort}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      title="Click to toggle Date sorting (Newest ↔ Oldest)"
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span>BILL # / DATE</span>
                        <span style={{ fontSize: '10px', color: '#8C5325', fontWeight: 800 }}>
                          {dateSortOrder === 'newest' ? '▼ Newest' : dateSortOrder === 'oldest' ? '▲ Oldest' : '↕'}
                        </span>
                      </div>
                    </th>
                    <th>CUSTOMER / PROJECT</th>
                    <th>SALES PERSON</th>
                    <th>WOOD / ITEMS</th>
                    <th style={{ textAlign: 'right' }}>ACTUAL SELLING PRICE</th>
                    <th style={{ textAlign: 'right' }}>DISCOUNT REDUCTION</th>
                    <th style={{ textAlign: 'right' }}>SALES MARGIN (NET)</th>
                    <th style={{ textAlign: 'center' }}>PAYMENT</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length > 0 ? (
                    displayed.map((tx, idx) => {
                      const netAmt = tx.rawAmount || Number(String(tx.amount).replace(/[^0-9.]/g, '')) || 0
                      const disc = Number(tx.discount || 0)
                      const actual = tx.actualSellingPrice !== undefined
                        ? Number(tx.actualSellingPrice)
                        : (netAmt + disc)
                      const discMargin = tx.discountMarginPct !== undefined
                        ? Number(tx.discountMarginPct)
                        : (actual > 0 ? Number(((disc / actual) * 100).toFixed(1)) : 0)
                      const salesMargin = tx.salesMarginPct !== undefined
                        ? Number(tx.salesMarginPct)
                        : (actual > 0 ? Number(((netAmt / actual) * 100).toFixed(1)) : 100)

                      return (
                        <tr key={tx.id ? `tx-${tx.id}-${idx}` : tx.invoice ? `tx-inv-${tx.invoice}-${idx}` : `tx-row-${idx}`}>
                          <td>
                            <div className="sales-bill-no">{tx.id || tx.invoice}</div>
                            <div className="sales-bill-date">{tx.date}</div>
                            {tx.referenceNumber && (
                              <div style={{ fontSize: '10px', color: '#8C5325', fontWeight: 600 }}>
                                Ref: {tx.referenceNumber}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="sales-primary-text">{tx.customer}</div>
                            <div className="sales-sub-text">{tx.project}</div>
                          </td>
                          <td>
                            <span className="sales-person-inline-pill">
                              <span style={{ fontSize: '11px' }}>👤</span>
                              <span>{tx.salesPerson || tx.billedBy || 'Direct Counter'}</span>
                            </span>
                          </td>
                          <td>
                            <div className="sales-primary-text">{tx.wood}</div>
                            <div className="sales-sub-text" style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tx.item || 'Timber items'}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: 700, color: '#31190B', fontSize: '12.5px' }}>
                              ₹{actual.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {disc > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <span style={{ fontWeight: 700, color: '#C62828', fontSize: '12px' }}>
                                  -₹{disc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="badge-discount-margin" title="Discount Reduction Margin %">
                                  -{discMargin}% Red.
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#8C7B72', fontWeight: 500 }}>
                                ₹0.00 (0%)
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span className="sales-amount" style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                                <span className="straight-rupee">₹</span>
                                {netAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="badge-sales-margin" title="Realized Sales Margin %">
                                {salesMargin}% Margin
                              </span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 8px',
                              borderRadius: '5px',
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
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="sales-no-results">
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
                  <button type="button" className="pagination-num" disabled style={{ opacity: 0.4, cursor: 'default' }}>
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
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DISPATCH & DELIVERY SCHEDULE (EVERYDAY & FUTURE)    */}
      {/* ========================================================= */}
      {activeReportTab === 'dispatch' && (
        <div className="dispatch-schedule-container">
          {/* Quick Scope Filter Bar & Actions */}
          <div className="dispatch-controls-card">
            <div className="dispatch-controls-top">
              <div className="dispatch-scope-group">
                <button
                  type="button"
                  className={`dispatch-scope-btn ${dispatchScope === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    setDispatchScope('all')
                    setDispatchCurrentPage(1)
                  }}
                >
                  <span>📦 All Deliveries</span>
                  <span className="dispatch-pill-count">{dispatchRecords.length}</span>
                </button>

                <button
                  type="button"
                  className={`dispatch-scope-btn today ${dispatchScope === 'today' ? 'active' : ''}`}
                  onClick={() => {
                    setDispatchScope('today')
                    setDispatchCurrentPage(1)
                  }}
                >
                  <span>⚡ Today's Dispatches</span>
                  <span className="dispatch-pill-count today">{todayCount}</span>
                </button>

                <button
                  type="button"
                  className={`dispatch-scope-btn upcoming ${dispatchScope === 'upcoming' ? 'active' : ''}`}
                  onClick={() => {
                    setDispatchScope('upcoming')
                    setDispatchCurrentPage(1)
                  }}
                >
                  <span>🔮 Future / Upcoming</span>
                  <span className="dispatch-pill-count upcoming">{upcomingCount}</span>
                </button>

                <button
                  type="button"
                  className={`dispatch-scope-btn ${dispatchScope === 'past' ? 'active' : ''}`}
                  onClick={() => {
                    setDispatchScope('past')
                    setDispatchCurrentPage(1)
                  }}
                >
                  <span>⏰ Past / Delivered</span>
                  <span className="dispatch-pill-count">{pastDispatchList.length}</span>
                </button>
              </div>

              <div className="dispatch-actions-right">
                <button
                  type="button"
                  className="dispatch-action-btn primary"
                  onClick={handlePrintDispatchManifest}
                  title="Print Manifest for Driver / Depot Loading"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect x="6" y="14" width="12" height="8" />
                  </svg>
                  <span>Print Manifest</span>
                </button>

                <button
                  type="button"
                  className={`dispatch-action-btn secondary ${dispatchExportSuccess ? 'success' : ''}`}
                  onClick={handleExportDispatchCSV}
                  title="Download CSV report of scheduled dispatches"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>{dispatchExportSuccess ? '✓ CSV Exported' : 'Export CSV'}</span>
                </button>
              </div>
            </div>

            {/* Date and Search filter inputs */}
            <div className="dispatch-filters-subrow">
              <div className="dispatch-search-box">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8C7B72" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="dispatch-search-input"
                  placeholder="Filter by invoice #, customer, phone, vehicle, goods..."
                  value={dispatchSearchQuery}
                  onChange={(e) => {
                    setDispatchSearchQuery(e.target.value)
                    setDispatchCurrentPage(1)
                  }}
                />
                {dispatchSearchQuery && (
                  <button
                    type="button"
                    className="dispatch-clear-search-btn"
                    onClick={() => setDispatchSearchQuery('')}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="dispatch-date-range-group">
                <div className="dispatch-date-field">
                  <span className="dispatch-date-label">From:</span>
                  <input
                    type="date"
                    className="dispatch-date-input"
                    value={dispatchFromDate}
                    onChange={(e) => {
                      setDispatchFromDate(e.target.value)
                      setDispatchCurrentPage(1)
                    }}
                  />
                </div>
                <div className="dispatch-date-field">
                  <span className="dispatch-date-label">To:</span>
                  <input
                    type="date"
                    className="dispatch-date-input"
                    value={dispatchToDate}
                    onChange={(e) => {
                      setDispatchToDate(e.target.value)
                      setDispatchCurrentPage(1)
                    }}
                  />
                </div>
                {(dispatchFromDate || dispatchToDate || dispatchSearchQuery || dispatchScope !== 'all') && (
                  <button
                    type="button"
                    className="dispatch-reset-filters-btn"
                    onClick={() => {
                      setDispatchScope('all')
                      setDispatchFromDate('')
                      setDispatchToDate('')
                      setDispatchSearchQuery('')
                      setDispatchCurrentPage(1)
                    }}
                    title="Clear all filters"
                  >
                    ↺ Reset Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 3 Dispatch KPI Summary Cards */}
          <div className="dispatch-kpi-grid">
            {/* Card 1: Today's Dispatches */}
            <div className="dispatch-kpi-card highlight-today">
              <div className="dispatch-kpi-top">
                <span className="dispatch-kpi-badge today">⚡ TODAY'S SCHEDULE</span>
                <span className="dispatch-kpi-icon">🚚</span>
              </div>
              <div className="dispatch-kpi-main-val">{todayCount} Orders</div>
              <div className="dispatch-kpi-sub-val">
                Total Value: <strong>₹{todayTotalValue.toLocaleString('en-IN')}</strong>
              </div>
              <div className="dispatch-kpi-foot">
                {todayCount > 0 ? 'Priority delivery scheduled for today' : 'No dispatches scheduled for today'}
              </div>
            </div>

            {/* Card 2: Future / Upcoming Deliveries */}
            <div className="dispatch-kpi-card highlight-upcoming">
              <div className="dispatch-kpi-top">
                <span className="dispatch-kpi-badge upcoming">🔮 FUTURE BOOKINGS</span>
                <span className="dispatch-kpi-icon">📅</span>
              </div>
              <div className="dispatch-kpi-main-val">{upcomingCount} Orders</div>
              <div className="dispatch-kpi-sub-val">
                Scheduled Value: <strong>₹{upcomingTotalValue.toLocaleString('en-IN')}</strong>
              </div>
              <div className="dispatch-kpi-foot">
                Advance delivery requested by customers
              </div>
            </div>

            {/* Card 3: Total Tracked Orders */}
            <div className="dispatch-kpi-card">
              <div className="dispatch-kpi-top">
                <span className="dispatch-kpi-badge neutral">📊 TOTAL ORDERS</span>
                <span className="dispatch-kpi-icon">🏷️</span>
              </div>
              <div className="dispatch-kpi-main-val">{totalTrackedShipments} Total</div>
              <div className="dispatch-kpi-sub-val">
                Lifetime Value: <strong>₹{totalTrackedValue.toLocaleString('en-IN')}</strong>
              </div>
              <div className="dispatch-kpi-foot">
                Everyday depot counter & advance bookings
              </div>
            </div>
          </div>

          {/* Dispatch Schedule Table */}
          <div className="dispatch-table-card">
            <div className="dispatch-table-header-row">
              <div className="dispatch-table-title-wrap">
                <h3 className="dispatch-table-title">
                  {dispatchScope === 'today'
                    ? "Today's Delivery Schedule"
                    : dispatchScope === 'upcoming'
                    ? "Advance / Future Delivery Schedule"
                    : dispatchScope === 'past'
                    ? "Completed / Past Deliveries"
                    : "Complete Dispatch & Delivery Schedule"}
                </h3>
                <span className="dispatch-table-count-pill">
                  {filteredDispatchRecords.length} Shipments Found
                </span>
              </div>
            </div>

            <div className="dispatch-table-responsive">
              <table className="dispatch-table">
                <thead>
                  <tr>
                    <th>STATUS / URGENCY</th>
                    <th>DISPATCH DATE</th>
                    <th>BILL # & INVOICE DATE</th>
                    <th>CUSTOMER & DESTINATION</th>
                    <th>TIMBER GOODS / ITEMS</th>
                    <th>VEHICLE / TRANSPORT</th>
                    <th style={{ textAlign: 'right' }}>AMOUNT & STATUS</th>
                    <th style={{ textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDispatchRecords.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="dispatch-empty-td">
                        <div className="dispatch-empty-box">
                          <span style={{ fontSize: '36px', marginBottom: '8px' }}>🚚</span>
                          <h4 style={{ margin: '0 0 4px', color: '#31190B' }}>No dispatch records found</h4>
                          <p style={{ margin: 0, color: '#8C7B72', fontSize: '12px' }}>
                            {dispatchSearchQuery || dispatchFromDate || dispatchToDate
                              ? 'Try adjusting your filters or date range.'
                              : 'Bills generated with delivery dates will appear here automatically.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDispatchRecords.map((r, idx) => (
                      <tr key={r.invoice || r.id || idx} className="dispatch-table-row">
                        {/* Status / Urgency */}
                        <td>
                          {r.urgency === 'today' ? (
                            <span className="dispatch-status-badge today">
                              ⚡ TODAY
                            </span>
                          ) : r.urgency === 'upcoming' ? (
                            <span className="dispatch-status-badge upcoming">
                              🔮 In {r.daysDiff} {r.daysDiff === 1 ? 'Day' : 'Days'}
                            </span>
                          ) : (
                            <span className="dispatch-status-badge past">
                              ✓ COMPLETED
                            </span>
                          )}
                        </td>

                        {/* Dispatch Date */}
                        <td>
                          <div className="dispatch-date-cell">
                            <span className="dispatch-date-main">
                              📅 {r.effectiveDispatchDate}
                            </span>
                            <span className="dispatch-date-sub">
                              {r.isExplicitSchedule ? 'Customer Requested' : 'Immediate Counter'}
                            </span>
                          </div>
                        </td>

                        {/* Bill # & Date */}
                        <td>
                          <div className="dispatch-bill-cell">
                            <span className="dispatch-inv-pill">#{r.invoice || r.id}</span>
                            {r.referenceNumber && (
                              <span style={{ fontSize: '10px', color: '#1E40AF', fontWeight: 700, background: '#EFF6FF', padding: '1px 5px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                                Ref: {r.referenceNumber}
                              </span>
                            )}
                            <span className="dispatch-billed-date">
                              Billed: {r.rawDate || r.date}
                            </span>
                          </div>
                        </td>

                        {/* Customer & Destination */}
                        <td>
                          <div className="dispatch-cust-cell">
                            <strong className="dispatch-cust-name">{r.custName}</strong>
                            {r.custPhone && (
                              <span className="dispatch-cust-phone">📞 {r.custPhone}</span>
                            )}
                            <span className="dispatch-cust-addr" title={r.custAddress}>
                              📍 {r.custAddress || 'Local Sivakasi'}
                            </span>
                          </div>
                        </td>

                        {/* Items */}
                        <td>
                          <div className="dispatch-items-cell" title={r.items || r.item}>
                            <span className="dispatch-items-text">
                              {r.items || r.item || 'Timber Furniture Order'}
                            </span>
                            {r.wood && (
                              <span className="dispatch-wood-pill">🪵 {r.wood}</span>
                            )}
                          </div>
                        </td>

                        {/* Vehicle */}
                        <td>
                          {r.vehicleNumber ? (
                            <div className="dispatch-vehicle-pill">
                              🚚 {r.vehicleNumber}
                            </div>
                          ) : (
                            <span className="dispatch-self-pickup">
                              🏃 Self Pickup
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td style={{ textAlign: 'right' }}>
                          <div className="dispatch-amount-cell">
                            <span className="dispatch-amt-val">
                              ₹{r.parsedAmount.toLocaleString('en-IN')}
                            </span>
                            <span className={`dispatch-pay-badge ${String(r.status).toLowerCase() === 'paid' ? 'paid' : 'pending'}`}>
                              {r.status || 'Paid'} ({r.paymentMode || 'UPI'})
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="dispatch-print-slip-btn"
                            onClick={() => handlePrintDeliveryChallan(r)}
                            title="Print Delivery Challan / Gatepass"
                          >
                            📄 Slip
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="patron-table-footer">
              <div className="patron-footer-left">
                <span className="showing-records-text">
                  Showing <strong>{filteredDispatchRecords.length > 0 ? (
                    (safeDispatchCurrentPage - 1) * dispatchItemsPerPage + 1 === Math.min(safeDispatchCurrentPage * dispatchItemsPerPage, filteredDispatchRecords.length)
                      ? `${(safeDispatchCurrentPage - 1) * dispatchItemsPerPage + 1}`
                      : `${(safeDispatchCurrentPage - 1) * dispatchItemsPerPage + 1}-${Math.min(safeDispatchCurrentPage * dispatchItemsPerPage, filteredDispatchRecords.length)}`
                  ) : '0'}</strong> of {filteredDispatchRecords.length} shipments
                </span>
                <div className="patron-per-page-wrap">
                  <span className="patron-per-page-label">Show:</span>
                  <select
                    className="patron-per-page-select"
                    value={dispatchItemsPerPage}
                    onChange={(e) => {
                      setDispatchItemsPerPage(Number(e.target.value))
                      setDispatchCurrentPage(1)
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
                  disabled={safeDispatchCurrentPage <= 1 || dispatchTotalPages <= 1}
                  onClick={() => setDispatchCurrentPage((p) => Math.max(p - 1, 1))}
                >
                  ‹
                </button>
                {dispatchTotalPages > 0 && filteredDispatchRecords.length > 0 ? (
                  Array.from({ length: dispatchTotalPages }, (_, i) => i + 1).map((num) => (
                    <button
                      key={`dispatch-page-btn-${num}`}
                      type="button"
                      className={`pagination-num ${safeDispatchCurrentPage === num ? 'active' : ''}`}
                      onClick={() => setDispatchCurrentPage(num)}
                    >
                      {num}
                    </button>
                  ))
                ) : (
                  <button type="button" className="pagination-num" disabled style={{ opacity: 0.4, cursor: 'default' }}>
                    -
                  </button>
                )}
                <button
                  type="button"
                  className="pagination-arrow"
                  disabled={safeDispatchCurrentPage >= dispatchTotalPages || dispatchTotalPages <= 1}
                  onClick={() => setDispatchCurrentPage((p) => Math.min(p + 1, dispatchTotalPages))}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SALES PERSON REPORT (SUPER ADMIN ONLY)             */}
      {/* ========================================================= */}
      {activeReportTab === 'salesperson' && (
        <div className="sp-report-container">
          {!isSuperAdmin ? (
            <div className="sp-access-denied-card">
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>🔒</div>
              <h2 style={{ fontSize: '20px', color: '#31190B', margin: '0 0 8px' }}>Super Admin Authorization Required</h2>
              <p style={{ color: '#6A564A', fontSize: '13px', maxWidth: '460px', margin: '0 auto 16px', lineHeight: '1.5' }}>
                Individual sales performance metrics, revenue tracking by staff, and commission reports are strictly restricted to <strong>Super Admin</strong>.
              </p>
              <button
                type="button"
                className="btn-back-dash"
                onClick={() => setActiveReportTab('overview')}
              >
                ← Return to General Sales Report
              </button>
            </div>
          ) : (
            <>
              {/* Sales Person Filter Bar Card */}
              <div className="sp-filter-card">
                <div className="sp-filter-top-row">
                  {/* Staff Dropdown Selection */}
                  <div className="sp-selector-wrap">
                    <label className="sp-filter-label">
                      <span>👤 SELECT SALES PERSON:</span>
                    </label>
                    <select
                      className="sp-select-dropdown"
                      value={selectedSalesPerson}
                      onChange={(e) => {
                        setSelectedSalesPerson(e.target.value)
                        setSpCurrentPage(1)
                      }}
                    >
                      <option value="all">👑 All Sales Persons (Team Overview & Comparison)</option>
                      {allSalesPersons.map((sp) => (
                        <option key={sp.id || sp.code || sp.name} value={sp.name}>
                          {sp.name} {sp.code ? `(${sp.code})` : ''} {sp.phone ? `• ${sp.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Year Dropdown */}
                  <div className="sp-year-wrap">
                    <label className="sp-filter-label">YEAR:</label>
                    <select
                      className="sp-year-dropdown"
                      value={spYear}
                      onChange={(e) => {
                        setSpYear(e.target.value)
                        setSpFromDate('')
                        setSpToDate('')
                        setSpCurrentPage(1)
                      }}
                    >
                      {yearOptions.map((opt) => (
                        <option key={`sp-yr-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons: Print & Export */}
                  <div className="sp-action-btns">
                    <button
                      type="button"
                      className="btn-sp-print"
                      onClick={() => handlePrintReport(
                        'Sales Executive Performance Report',
                        selectedSalesPerson === 'all' ? 'Team Performance Audit' : `Staff: ${selectedSalesPerson}`,
                        selectedSalesPerson
                      )}
                      title="Print official Super Admin Sales Person Report"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      <span>Print Report</span>
                    </button>

                    <button
                      type="button"
                      className="btn-sp-export"
                      onClick={() => {
                        handleExportCSV(spTransactionsList, `sales_person_report_${selectedSalesPerson}_${spYear}`)
                        setSpExportSuccess(true)
                        setTimeout(() => setSpExportSuccess(false), 2500)
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>{spExportSuccess ? '✓ CSV Exported' : 'Export CSV'}</span>
                    </button>
                  </div>
                </div>

                {/* Date Filter Row */}
                <div className="sp-filter-date-row">
                  <div className="sp-date-inputs">
                    <span className="sp-filter-label">📅 PERIOD:</span>
                    <div className="sp-input-group">
                      <label>From:</label>
                      <input
                        type="date"
                        value={spFromDate}
                        onChange={(e) => {
                          setSpFromDate(e.target.value)
                          setSpCurrentPage(1)
                        }}
                      />
                    </div>
                    <div className="sp-input-group">
                      <label>To:</label>
                      <input
                        type="date"
                        value={spToDate}
                        onChange={(e) => {
                          setSpToDate(e.target.value)
                          setSpCurrentPage(1)
                        }}
                      />
                    </div>
                    <button type="button" className="btn-sp-quick-date" onClick={handleSetSpToday}>
                      Today
                    </button>
                    <button type="button" className="btn-sp-quick-date" onClick={handleSetSpThisMonth}>
                      This Month
                    </button>
                    {isSpDateRangeActive && (
                      <button type="button" className="btn-sp-clear-date" onClick={handleClearSpDateFilter}>
                        ✕ Reset Dates
                      </button>
                    )}
                  </div>

                  <div className="sp-active-period-badge">
                    <span>Filtering: <strong>{spDateRangeLabel}</strong> ({spTransactionsList.length} bills)</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Sales Person Performance KPI Cards */}
              <div className="sp-kpi-grid">
                {/* KPI 1: Revenue */}
                <div className="sp-kpi-card highlight">
                  <div className="sp-kpi-top">
                    <span className="sp-kpi-title">
                      {selectedSalesPerson === 'all' ? 'TEAM TOTAL SALES' : 'EXECUTIVE SALES REVENUE'}
                    </span>
                    <div className="sp-kpi-icon gold">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v12M15 9.5a3.5 3.5 0 0 0-5 0c0 2 2 3 5 4s5 2 5 4a3.5 3.5 0 0 1-5 0" />
                      </svg>
                    </div>
                  </div>
                  <div className="sp-kpi-value">
                    <span className="straight-rupee">₹</span>
                    {activeSpStats.revenue.toLocaleString('en-IN')}
                  </div>
                  <div className="sp-kpi-subtext">
                    {selectedSalesPerson === 'all'
                      ? 'Combined revenue across all staff members'
                      : `Total turnover closed by ${selectedSalesPerson}`}
                  </div>
                </div>

                {/* KPI 2: Bills / Invoices Closed */}
                <div className="sp-kpi-card">
                  <div className="sp-kpi-top">
                    <span className="sp-kpi-title">BILLS / INVOICES CLOSED</span>
                    <div className="sp-kpi-icon green">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                  </div>
                  <div className="sp-kpi-value">
                    {activeSpStats.bills} <span className="sp-kpi-unit">{activeSpStats.bills === 1 ? 'Bill' : 'Bills'}</span>
                  </div>
                  <div className="sp-kpi-subtext">
                    {activeSpStats.bills > 0 ? 'Dispatched and recorded in depot' : 'No sales bills recorded yet'}
                  </div>
                </div>

                {/* KPI 3: Average Ticket Size */}
                <div className="sp-kpi-card">
                  <div className="sp-kpi-top">
                    <span className="sp-kpi-title">AVERAGE BILL VALUE</span>
                    <div className="sp-kpi-icon blue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                        <polyline points="17 6 23 6 23 12" />
                      </svg>
                    </div>
                  </div>
                  <div className="sp-kpi-value">
                    <span className="straight-rupee">₹</span>
                    {activeSpStats.avgBill.toLocaleString('en-IN')}
                  </div>
                  <div className="sp-kpi-subtext">Average order size per invoice</div>
                </div>

                {/* KPI 4: Contribution or Top Performer */}
                <div className="sp-kpi-card">
                  <div className="sp-kpi-top">
                    <span className="sp-kpi-title">
                      {selectedSalesPerson === 'all' ? 'TOP SALES EXECUTIVE' : 'STORE CONTRIBUTION'}
                    </span>
                    <div className="sp-kpi-icon amber">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </div>
                  </div>
                  <div className="sp-kpi-value" style={{ fontSize: selectedSalesPerson === 'all' ? '18px' : '24px' }}>
                    {selectedSalesPerson === 'all' ? activeSpStats.topName : activeSpStats.share}
                  </div>
                  <div className="sp-kpi-subtext">
                    {selectedSalesPerson === 'all'
                      ? `${activeSpStats.activeStaffCount} active executives with sales`
                      : `Top wood sold: ${activeSpStats.topWood}`}
                  </div>
                </div>
              </div>

              {/* Staff Performance Leaderboard Table (When "all" is selected or as an overview) */}
              {selectedSalesPerson === 'all' && (
                <div className="sp-leaderboard-card">
                  <div className="sp-card-header">
                    <div>
                      <h3 className="sp-card-title">Staff Sales Leaderboard & Contribution Breakdown</h3>
                      <p className="sp-card-subtitle">
                        Comparative summary of all sales executives for {spDateRangeLabel}.
                      </p>
                    </div>
                    <span className="sp-table-badge">
                      {Object.keys(spStatsMap).length} Staff Tracked
                    </span>
                  </div>

                  <div className="reports-table-wrapper">
                    <table className="sp-leaderboard-table">
                      <thead>
                        <tr>
                          <th># RANK</th>
                          <th>SALES PERSON</th>
                          <th>STAFF ID</th>
                          <th>PHONE</th>
                          <th>BILLS CLOSED</th>
                          <th>TOTAL REVENUE (₹)</th>
                          <th>STORE SHARE (%)</th>
                          <th>AVG BILL (₹)</th>
                          <th style={{ textAlign: 'center' }}>ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.values(spStatsMap)
                          .sort((a, b) => b.revenue - a.revenue)
                          .map((sp, idx) => {
                            const share = totalTeamRevenue > 0
                              ? ((sp.revenue / totalTeamRevenue) * 100).toFixed(1)
                              : '0.0'
                            const avg = sp.count > 0 ? Math.round(sp.revenue / sp.count) : 0

                            return (
                              <tr key={`lb-${sp.name}-${idx}`}>
                                <td>
                                  <span className={`sp-rank-pill ${idx === 0 && sp.revenue > 0 ? 'gold' : idx === 1 && sp.revenue > 0 ? 'silver' : idx === 2 && sp.revenue > 0 ? 'bronze' : ''}`}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td>
                                  <div className="sp-name-cell">
                                    <span className="sp-name-text">{sp.name}</span>
                                    {idx === 0 && sp.revenue > 0 && (
                                      <span className="sp-top-badge">★ Top Seller</span>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <span className="sp-code-pill">{sp.code}</span>
                                </td>
                                <td>
                                  <span className="sp-sub-text">{sp.phone}</span>
                                </td>
                                <td>
                                  <span className="sp-orders-pill">{sp.count} Bills</span>
                                </td>
                                <td>
                                  <span className="sp-revenue-text">
                                    <span className="straight-rupee">₹</span>
                                    {sp.revenue.toLocaleString('en-IN')}
                                  </span>
                                </td>
                                <td>
                                  <div className="sp-share-cell">
                                    <span>{share}%</span>
                                    <div className="sp-share-bar-bg">
                                      <div className="sp-share-bar-fill" style={{ width: `${Math.min(100, Number(share))}%` }} />
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <span className="sp-sub-text">
                                    ₹{avg.toLocaleString('en-IN')}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button
                                    type="button"
                                    className="btn-sp-drilldown"
                                    onClick={() => {
                                      setSelectedSalesPerson(sp.name)
                                      setSpCurrentPage(1)
                                    }}
                                  >
                                    View Bills →
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Detailed Sales Bills Table for Selected Sales Person */}
              <div className="reports-table-card" style={{ marginTop: '16px' }}>
                <div className="reports-table-header">
                  <div>
                    <h2 className="reports-table-title">
                      {selectedSalesPerson === 'all'
                        ? 'All Staff Sales Bills'
                        : `Sales Invoices Closed by ${selectedSalesPerson}`}
                    </h2>
                    <p className="reports-table-subtitle">
                      Detailed itemized invoices and billing transactions for {spDateRangeLabel}.
                    </p>
                  </div>

                  <div className="reports-table-controls">
                    {/* Search Input */}
                    <div className="reports-search-box">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search invoice, customer, items..."
                        className="reports-search-input"
                        value={spSearchQuery}
                        onChange={(e) => {
                          setSpSearchQuery(e.target.value)
                          setSpCurrentPage(1)
                        }}
                      />
                    </div>

                    {/* Date-Wise Sort Dropdown */}
                    <div className="reports-filter-dropdown">
                      <select
                        className="reports-filter-select-inner"
                        value={spDateSortOrder}
                        onChange={(e) => {
                          setSpDateSortOrder(e.target.value)
                          setSpCurrentPage(1)
                        }}
                        title="Sort staff sales records by date or margins"
                      >
                        <option value="newest">📅 Date: Newest First</option>
                        <option value="oldest">📅 Date: Oldest First</option>
                        <option value="sales_high">💰 Highest Sales Margin First</option>
                        <option value="sales_low">📉 Lowest Sales Margin First</option>
                        <option value="discount_high">🏷️ Highest Discount First</option>
                        <option value="discount_margin_high">📊 Highest Discount Margin % First</option>
                      </select>
                    </div>

                    {selectedSalesPerson !== 'all' && (
                      <button
                        type="button"
                        className="btn-sp-back-all"
                        onClick={() => {
                          setSelectedSalesPerson('all')
                          setSpCurrentPage(1)
                        }}
                      >
                        ← View All Staff
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="reports-table-wrapper">
                  <table className="reports-sales-table">
                    <thead>
                      <tr>
                        <th
                          onClick={toggleSpDateSort}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          title="Click to toggle Date sorting (Newest ↔ Oldest)"
                        >
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <span>BILL # / DATE</span>
                            <span style={{ fontSize: '10px', color: '#8C5325', fontWeight: 800 }}>
                              {spDateSortOrder === 'newest' ? '▼ Newest' : spDateSortOrder === 'oldest' ? '▲ Oldest' : '↕'}
                            </span>
                          </div>
                        </th>
                        <th>CUSTOMER / PROJECT</th>
                        <th>SALES PERSON</th>
                        <th>WOOD / ITEMS</th>
                        <th style={{ textAlign: 'right' }}>ACTUAL SELLING PRICE</th>
                        <th style={{ textAlign: 'right' }}>DISCOUNT REDUCTION</th>
                        <th style={{ textAlign: 'right' }}>SALES MARGIN (NET)</th>
                        <th style={{ textAlign: 'center' }}>PAYMENT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spDisplayedTransactions.length > 0 ? (
                        spDisplayedTransactions.map((tx, idx) => {
                          const netAmt = tx.rawAmount || Number(String(tx.amount).replace(/[^0-9.]/g, '')) || 0
                          const disc = Number(tx.discount || 0)
                          const actual = tx.actualSellingPrice !== undefined
                            ? Number(tx.actualSellingPrice)
                            : (netAmt + disc)
                          const discMargin = tx.discountMarginPct !== undefined
                            ? Number(tx.discountMarginPct)
                            : (actual > 0 ? Number(((disc / actual) * 100).toFixed(1)) : 0)
                          const salesMargin = tx.salesMarginPct !== undefined
                            ? Number(tx.salesMarginPct)
                            : (actual > 0 ? Number(((netAmt / actual) * 100).toFixed(1)) : 100)

                          return (
                            <tr key={tx.id ? `sptx-${tx.id}-${idx}` : `sptx-row-${idx}`}>
                              <td>
                                <div className="sales-bill-no">{tx.id}</div>
                                <div className="sales-bill-date">{tx.date}</div>
                                {tx.referenceNumber && (
                                  <div style={{ fontSize: '10px', color: '#8C5325', fontWeight: 600 }}>
                                    Ref: {tx.referenceNumber}
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="sales-primary-text">{tx.customer}</div>
                                <div className="sales-sub-text">{tx.project}</div>
                              </td>
                              <td>
                                <span className="sales-person-inline-pill highlight">
                                  <span style={{ fontSize: '11px' }}>👤</span>
                                  <span>{tx.salesPerson || tx.billedBy || 'Direct Counter'}</span>
                                </span>
                              </td>
                              <td>
                                <div className="sales-primary-text">{tx.wood}</div>
                                <div className="sales-sub-text" style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {tx.item || 'Artisan Timber Order'}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 700, color: '#31190B', fontSize: '12.5px' }}>
                                  ₹{actual.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {disc > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                    <span style={{ fontWeight: 700, color: '#C62828', fontSize: '12px' }}>
                                      -₹{disc.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="badge-discount-margin" title="Discount Reduction Margin %">
                                      -{discMargin}% Red.
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '11px', color: '#8C7B72', fontWeight: 500 }}>
                                    ₹0.00 (0%)
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                  <span className="sales-amount" style={{ fontSize: '13px', fontWeight: 800, color: '#166534' }}>
                                    <span className="straight-rupee">₹</span>
                                    {netAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  <span className="badge-sales-margin" title="Realized Sales Margin %">
                                    {salesMargin}% Margin
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '3px 8px',
                                  borderRadius: '5px',
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
                          )
                        })
                      ) : (
                        <tr>
                          <td colSpan="8" className="sales-no-results">
                            {spSearchQuery
                              ? `No sales invoices found matching "${spSearchQuery}" for ${selectedSalesPerson === 'all' ? 'staff members' : selectedSalesPerson}`
                              : `No bills recorded for ${selectedSalesPerson === 'all' ? 'any staff member' : selectedSalesPerson} during ${spDateRangeLabel}.`}
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
                      Showing <strong>{spTransactionsList.length > 0 ? (
                        (safeSpCurrentPage - 1) * spItemsPerPage + 1 === Math.min(safeSpCurrentPage * spItemsPerPage, spTransactionsList.length)
                          ? `${(safeSpCurrentPage - 1) * spItemsPerPage + 1}`
                          : `${(safeSpCurrentPage - 1) * spItemsPerPage + 1}-${Math.min(safeSpCurrentPage * spItemsPerPage, spTransactionsList.length)}`
                      ) : '0'}</strong> of {spTransactionsList.length} transactions
                    </span>
                    <div className="patron-per-page-wrap">
                      <span className="patron-per-page-label">Show:</span>
                      <select
                        className="patron-per-page-select"
                        value={spItemsPerPage}
                        onChange={(e) => {
                          setSpItemsPerPage(Number(e.target.value))
                          setSpCurrentPage(1)
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
                      disabled={safeSpCurrentPage <= 1 || spTotalPages <= 1}
                      onClick={() => setSpCurrentPage((p) => Math.max(p - 1, 1))}
                    >
                      ‹
                    </button>
                    {spTotalPages > 0 && spTransactionsList.length > 0 ? (
                      Array.from({ length: spTotalPages }, (_, i) => i + 1).map((num) => (
                        <button
                          key={`sp-page-btn-${num}`}
                          type="button"
                          className={`pagination-num ${safeSpCurrentPage === num ? 'active' : ''}`}
                          onClick={() => setSpCurrentPage(num)}
                        >
                          {num}
                        </button>
                      ))
                    ) : (
                      <button type="button" className="pagination-num" disabled style={{ opacity: 0.4, cursor: 'default' }}>
                        -
                      </button>
                    )}
                    <button
                      type="button"
                      className="pagination-arrow"
                      disabled={safeSpCurrentPage >= spTotalPages || spTotalPages <= 1}
                      onClick={() => setSpCurrentPage((p) => Math.min(p + 1, spTotalPages))}
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
