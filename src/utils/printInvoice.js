// Accurate Indian Number-to-Words converter
export function numberToWordsINR(num) {
  if (isNaN(num) || num <= 0) return 'INR Zero Only'
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const convertTwoDigits = (n) => {
    if (n === 0) return ''
    if (n < 20) return a[n] + ' '
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '') + ' '
  }

  const convertThreeDigits = (n) => {
    let str = ''
    if (Math.floor(n / 100) > 0) {
      str += a[Math.floor(n / 100)] + ' Hundred '
    }
    const rem = n % 100
    if (rem > 0) {
      str += convertTwoDigits(rem)
    }
    return str
  }

  let amount = Math.floor(num)
  const paise = Math.round((num - amount) * 100)
  let result = ''

  const crore = Math.floor(amount / 10000000)
  amount %= 10000000
  if (crore > 0) {
    result += convertThreeDigits(crore) + 'Crore '
  }

  const lakh = Math.floor(amount / 100000)
  amount %= 100000
  if (lakh > 0) {
    result += convertThreeDigits(lakh) + 'Lakh '
  }

  const thousand = Math.floor(amount / 1000)
  amount %= 1000
  if (thousand > 0) {
    result += convertThreeDigits(thousand) + 'Thousand '
  }

  if (amount > 0) {
    result += convertThreeDigits(amount)
  }

  result = result.trim()
  let out = result ? `INR ${result}` : 'INR Zero'
  if (paise > 0) {
    out += ` and ${convertTwoDigits(paise).trim()} Paise`
  }
  return `${out} Only`
}

/**
 * Robust, full-page isolated invoice printing using a dedicated hidden iframe.
 * Completely immune to @media print conflicts, overflow clipping, or #root UI leakage.
 */
export function printInvoiceDocument(modalBillData, settings = {}, defaultLogo = '') {
  if (!modalBillData) return

  const invNumber = modalBillData.invoiceNumber || modalBillData.invoice || modalBillData.id || '100'
  const invDate = modalBillData.invoiceDate || modalBillData.date || new Date().toISOString().split('T')[0]

  const rawCust = modalBillData.customer
  const custName = typeof rawCust === 'object' && rawCust !== null ? (rawCust.name || 'Walk-in Customer') : (String(rawCust || '').trim() || 'Walk-in Customer')
  const custPhone = (typeof rawCust === 'object' && rawCust !== null ? rawCust.phone : null) || modalBillData.customerPhone || modalBillData.phone || 'N/A'
  const custAddress = (typeof rawCust === 'object' && rawCust !== null ? rawCust.address : null) || modalBillData.customerAddress || modalBillData.address || 'Local Destination'
  const custGstin = (typeof rawCust === 'object' && rawCust !== null ? rawCust.gstin : null) || modalBillData.customerGstin || modalBillData.gstin || 'Unregistered / Personal'

  const rawShp = modalBillData.shipping
  const shpName = (typeof rawShp === 'object' && rawShp !== null ? rawShp.name : null) || modalBillData.shippingName || custName
  const shpPhone = (typeof rawShp === 'object' && rawShp !== null ? rawShp.phone : null) || modalBillData.shippingPhone || custPhone
  const shpAddress = (typeof rawShp === 'object' && rawShp !== null ? rawShp.address : null) || modalBillData.shippingAddress || custAddress

  const rawItems = Array.isArray(modalBillData.items) && modalBillData.items.length > 0 && typeof modalBillData.items[0] === 'object'
    ? modalBillData.items
    : Array.isArray(modalBillData.itemDetails) && modalBillData.itemDetails.length > 0
    ? modalBillData.itemDetails
    : [
        {
          id: 'item-1',
          description: typeof modalBillData.items === 'string' && modalBillData.items.trim()
            ? modalBillData.items
            : (typeof modalBillData.item === 'string' && modalBillData.item.trim() ? modalBillData.item : 'Timber Furniture Order'),
          quantity: 1,
          price: modalBillData.rawAmount || Number(String(modalBillData.amount || 0).replace(/[^0-9.]/g, '')) || 0,
          gstRate: 18,
          hsn: modalBillData.hsnCode || settings.hsnCode || '4407',
        },
      ]

  const taxType = modalBillData.taxType || 'intra'
  const isInter = taxType === 'inter'
  const cgstRate = Number(settings.cgstRate) || 9
  const sgstRate = Number(settings.sgstRate) || 9
  const igstRate = cgstRate + sgstRate

  // Totals
  const grandTotal = modalBillData.rawAmount !== undefined
    ? Number(modalBillData.rawAmount)
    : (Number(String(modalBillData.amount || modalBillData.grandTotal || 0).replace(/[^0-9.]/g, '')) || 0)
  const subtotal = modalBillData.itemsSubtotal !== undefined
    ? Number(modalBillData.itemsSubtotal)
    : (modalBillData.subtotal !== undefined ? Number(modalBillData.subtotal) : grandTotal)
  const discount = Number(modalBillData.discount) || 0
  const deliveryCharge = Number(modalBillData.deliveryCharge) || 0
  
  let totalGst = modalBillData.totalGst !== undefined 
    ? Number(modalBillData.totalGst) 
    : (modalBillData.taxAmount !== undefined ? Number(modalBillData.taxAmount) : NaN)
  if (isNaN(totalGst)) {
    totalGst = rawItems.reduce((sum, it) => {
      const q = Number(it.quantity) || 1
      const p = Number(it.price) || 0
      const r = it.gstRate !== undefined ? Number(it.gstRate) : 18
      return sum + (q * p * r) / 100
    }, 0)
  }

  const cgstAmount = modalBillData.cgstAmount !== undefined ? Number(modalBillData.cgstAmount) : (!isInter ? totalGst / 2 : 0)
  const sgstAmount = modalBillData.sgstAmount !== undefined ? Number(modalBillData.sgstAmount) : (!isInter ? totalGst / 2 : 0)
  const igstAmount = modalBillData.igstAmount !== undefined ? Number(modalBillData.igstAmount) : (isInter ? totalGst : 0)
  const paymentStatus = modalBillData.paymentStatus || modalBillData.status || 'Paid'
  const balanceDue = Number(modalBillData.balanceDue) || 0
  const notes = modalBillData.notes || ''

  const depotName = (settings.depotName || 'Kerala Wood Furniture').replace(/[-–—]\s*sivakasi\s*depot/gi, '').trim() || 'Kerala Wood Furniture'
  const address = (settings.address || 'Sivakasi Central Mill Yard, Sivakasi').replace(/Depot & /gi, '').replace(/Central Depot/gi, 'Central Yard')
  const logoSrc = settings.logoUrl || defaultLogo || '/kwf.jpg'

  const itemsRows = rawItems.map((it, idx) => {
    const qty = Number(it.quantity) || 1
    const price = Number(it.price) || 0
    const rowLine = qty * price
    const hsn = it.hsn || it.hsnCode || settings.hsnCode || '4407'
    return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EFE4DC; text-align: center;">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EFE4DC;"><strong>${it.description || it.name || 'Timber Item'}</strong></td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EFE4DC; text-align: center;">${hsn}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EFE4DC; text-align: center;">${qty}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EFE4DC; text-align: right;">₹${price.toLocaleString('en-IN')}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #EFE4DC; text-align: right;">₹${rowLine.toLocaleString('en-IN')}</td>
      </tr>
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice - ${invNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #31190B;
      background: #FFFFFF;
      font-size: 12px;
      line-height: 1.4;
    }
    .sheet {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 8px 12px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #D3C4B8;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #31190B;
      margin: 0;
      line-height: 1.1;
    }
    .brand-sub {
      margin: 3px 0 0 0;
      font-size: 11.5px;
      color: #5C4537;
    }
    .badge {
      display: inline-block;
      background-color: #31190B;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 3px 10px;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .cust-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      background-color: #FEF9F6;
      border: 1px solid #EFE4DC;
      border-radius: 6px;
    }
    .cust-col {
      width: 50%;
      padding: 12px 16px;
      vertical-align: top;
    }
    .cust-label {
      font-size: 10.5px;
      font-weight: 700;
      color: #7D6C63;
      text-transform: uppercase;
      margin: 0 0 4px 0;
      letter-spacing: 0.04em;
    }
    .cust-name {
      font-size: 13.5px;
      font-weight: 700;
      color: #31190B;
      margin: 0 0 3px 0;
    }
    .cust-sub {
      font-size: 11.5px;
      color: #5C4537;
      margin: 2px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }
    .items-table th {
      background-color: #F8EFE9;
      color: #31190B;
      font-weight: 700;
      padding: 9px 10px;
      border-bottom: 1.5px solid #D3C4B8;
      text-align: left;
    }
    .footer-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer-left {
      width: 55%;
      vertical-align: top;
      padding-right: 20px;
    }
    .footer-right {
      width: 45%;
      vertical-align: top;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
      color: #5C4537;
      border-bottom: 1px dashed #EFE4DC;
    }
    .grand-line {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 15px;
      font-weight: 800;
      color: #31190B;
      border-top: 1.5px solid #31190B;
      border-bottom: 1.5px solid #31190B;
      margin-top: 6px;
      margin-bottom: 14px;
    }
    .sign-box {
      border: 1px solid #EFE4DC;
      border-radius: 6px;
      background-color: #FEF9F6;
      padding: 12px;
      text-align: center;
      margin-top: 10px;
    }
    .sign-space {
      height: 42px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 4px;">
            ${logoSrc ? `<img src="${logoSrc}" alt="Logo" style="max-height: 42px; max-width: 42px; object-fit: contain;" />` : ''}
            <h1 class="brand-title">${depotName}</h1>
          </div>
          <p class="brand-sub">${address}</p>
          <p class="brand-sub">Phone: ${settings.contactPhone || 'N/A'} • GSTIN: ${settings.gstin || 'N/A'} • HSN: ${settings.hsnCode || '4407'}</p>
        </td>
        <td style="vertical-align: top; text-align: right; width: 220px;">
          <div class="badge">TAX INVOICE</div>
          <p style="margin: 3px 0; font-size: 12px;"><strong>Invoice #:</strong> ${invNumber}</p>
          <p style="margin: 3px 0; font-size: 12px;"><strong>Invoice Date:</strong> ${invDate}</p>
        </td>
      </tr>
    </table>

    <table class="cust-table">
      <tr>
        <td class="cust-col" style="border-right: 1px solid #EFE4DC;">
          <div class="cust-label">Bill To:</div>
          <div class="cust-name">${custName}</div>
          <div class="cust-sub">${custAddress}</div>
          <div class="cust-sub">Phone: ${custPhone}</div>
          <div class="cust-sub">GSTIN: ${custGstin}</div>
        </td>
        <td class="cust-col">
          <div class="cust-label">Ship To:</div>
          <div class="cust-name">${shpName}</div>
          <div class="cust-sub">${shpAddress}</div>
          <div class="cust-sub">Phone: ${shpPhone}</div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">#</th>
          <th style="width: 45%;">Item Description</th>
          <th style="width: 15%; text-align: center;">HSN/SAC</th>
          <th style="width: 10%; text-align: center;">Qty</th>
          <th style="width: 12%; text-align: right;">Rate (₹)</th>
          <th style="width: 13%; text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <table class="footer-table">
      <tr>
        <td class="footer-left">
          <p style="margin: 0 0 3px 0; font-size: 11.5px; font-weight: 700;">Amount in Words:</p>
          <p style="margin: 0 0 10px 0; font-size: 11.5px; font-style: italic; color: #5C4537;">${numberToWordsINR(grandTotal)}</p>
          ${notes ? `
            <p style="margin: 0 0 10px 0; font-size: 11px;"><strong>Note:</strong> ${notes}</p>
          ` : ''}
          <div style="background-color: #FAF5F1; border-left: 3px solid #8C5325; padding: 7px 10px; margin-top: 8px;">
            <p style="margin: 0 0 2px 0; font-size: 10px; font-weight: 700; color: #7D6C63; text-transform: uppercase;">Declaration:</p>
            <p style="margin: 0; font-size: 10.5px; color: #5C4537;">
              ${settings.disclaimer && !settings.disclaimer.includes('Natural variations') ? settings.disclaimer : 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct'}
            </p>
          </div>
        </td>
        <td class="footer-right">
          <div class="summary-line">
            <span>Items Subtotal:</span>
            <span>₹${subtotal.toLocaleString('en-IN')}</span>
          </div>
          ${discount > 0 ? `
            <div class="summary-line">
              <span>Trade Discount:</span>
              <span>-₹${discount.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${deliveryCharge > 0 ? `
            <div class="summary-line">
              <span>Delivery Logistics:</span>
              <span>+₹${deliveryCharge.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          ${isInter ? `
            <div class="summary-line">
              <span>IGST (${igstRate}%):</span>
              <span>+₹${(igstAmount || totalGst).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : `
            <div class="summary-line">
              <span>CGST (${cgstRate}%):</span>
              <span>+₹${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-line">
              <span>SGST (${sgstRate}%):</span>
              <span>+₹${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          `}
          <div class="grand-line">
            <span>Grand Total:</span>
            <span>₹${grandTotal.toLocaleString('en-IN')}</span>
          </div>
          ${paymentStatus === 'Partial' && balanceDue > 0 ? `
            <div class="summary-line" style="color: #A34814; font-weight: 600;">
              <span>Balance Due:</span>
              <span>₹${balanceDue.toLocaleString('en-IN')}</span>
            </div>
          ` : ''}
          <div class="sign-box">
            <p style="margin: 0; font-size: 11px; font-weight: 600;">For ${depotName}</p>
            <div class="sign-space"></div>
            <p style="margin: 0; font-size: 11px; color: #7D6C63;">Authorized Signatory</p>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`

  // Create isolated off-screen iframe with true A4 rendering viewport (prevents Chrome 0x0 truncation)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = '210mm'
  iframe.style.height = '297mm'
  iframe.style.border = '0'
  iframe.style.visibility = 'visible'
  iframe.style.zIndex = '-9999'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  const executePrint = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.error('[printInvoiceDocument] Printing error:', e)
      window.print() // Fallback to page print if iframe print blocked
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }, 5000)
    }
  }

  // Allow iframe document, styles, and images to settle before opening print preview
  setTimeout(executePrint, 300)
}

/**
 * Isolated print utility for Purchase Bills
 */
export function printPurchaseBillDocument(purchase, settings = {}, defaultLogo = '') {
  if (!purchase) return

  const invNumber = purchase.invoiceNumber || purchase.id || '100'
  const invDate = purchase.date || new Date().toISOString().split('T')[0]

  const supplierName = purchase.supplier || 'Forest Timber Mill'
  const supplierPhone = purchase.supplierPhone || ''
  const supplierAddress = purchase.supplierAddress || 'Mill Yard Depot'
  const supplierGstin = purchase.supplierGstin || 'Unregistered'

  const companyName = purchase.companyName || settings.depotName || 'Kerala Wood Furniture - Sivakasi Depot'
  const companyAddress = purchase.companyAddress || settings.address || 'Sivakasi Central Depot & Mill Yard, Sivakasi'
  const companyGstin = purchase.companyGstin || settings.gstin || '32AABCP9821K1ZK'
  const companyPhone = purchase.companyPhone || settings.contactPhone || '+91 484 289 1204'

  const logoSrc = settings.logoUrl || defaultLogo || '/kwf.jpg'

  const rawItems = Array.isArray(purchase.itemsList) && purchase.itemsList.length > 0
    ? purchase.itemsList
    : [
        {
          name: purchase.item || 'Timber Material',
          category: purchase.category || 'Timber Logs',
          quantity: purchase.quantity || 1,
          rate: Number(purchase.amount || 0),
          gstRate: purchase.amount > 0 ? Math.round(((Number(purchase.gstAmount || 0)) / Number(purchase.amount)) * 100) : 18,
          gstAmount: Number(purchase.gstAmount || 0),
          total: Number(purchase.total || ((Number(purchase.amount) || 0) + (Number(purchase.gstAmount) || 0))),
        },
      ]

  const subtotal = Number(purchase.subtotal || purchase.amount || 0)
  const gstAmount = Number(purchase.gstAmount || 0)
  const grandTotal = Number(purchase.total || (subtotal + gstAmount))
  const cgstAmount = gstAmount / 2
  const sgstAmount = gstAmount / 2

  const itemsRows = rawItems.map((it, idx) => {
    const qty = Number(it.quantity) || 1
    const rate = Number(it.rate || it.amount || 0)
    const gstPct = Number(it.gstRate || it.gstPercent || 18)
    const lineGst = Number(it.gstAmount || 0)
    const lineTotal = Number(it.total || ((qty * rate) + lineGst))
    return `
      <tr>
        <td style="padding: 9px 12px; border-bottom: 1px solid #EFE4DC; text-align: center;">${idx + 1}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #EFE4DC;">
          <strong>${it.name || it.item || 'Timber Item'}</strong>
          ${it.category ? `<div style="font-size: 10.5px; color: #7D6C63;">${it.category}</div>` : ''}
        </td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #EFE4DC; text-align: center; font-weight: 600;">${qty}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #EFE4DC; text-align: right;">₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #EFE4DC; text-align: center;">${gstPct}%</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #EFE4DC; text-align: right;">₹${lineGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 9px 12px; border-bottom: 1px solid #EFE4DC; text-align: right; font-weight: 700;">₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Bill #${invNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #31190B;
      background: #FFFFFF;
      font-size: 12px;
      line-height: 1.4;
    }
    .sheet {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 8px 12px;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #D3C4B8;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #31190B;
      margin: 0;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 11.5px;
      color: #5C4537;
      margin: 3px 0 0 0;
      line-height: 1.4;
    }
    .bill-meta-box {
      border: 1.5px solid #C88D58;
      background: #FAF4EF;
      border-radius: 8px;
      padding: 10px 14px;
      text-align: right;
    }
    .bill-title-label {
      font-size: 14px;
      font-weight: 900;
      color: #31190B;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .bill-number {
      font-size: 18px;
      font-weight: 900;
      color: #8C5325;
      margin: 2px 0;
    }
    .bill-date {
      font-size: 11.5px;
      color: #5C4537;
      font-weight: 600;
    }
    .parties-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 12px 0;
      margin-bottom: 16px;
    }
    .party-card {
      border: 1.5px solid #EAE0D8;
      border-radius: 8px;
      padding: 12px 14px;
      vertical-align: top;
      background: #FFFFFF;
    }
    .party-tag {
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .party-from-tag { color: #8C5325; }
    .party-to-tag { color: #2563EB; }
    .party-name {
      font-size: 13.5px;
      font-weight: 800;
      color: #31190B;
      margin: 0 0 4px 0;
    }
    .party-text {
      font-size: 11.5px;
      color: #5C4537;
      line-height: 1.4;
      margin: 2px 0;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #D3C4B8;
    }
    .items-table th {
      background-color: #FAF4EF;
      color: #31190B;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 8px 10px;
      border-bottom: 2px solid #D3C4B8;
      border-right: 1px solid #EFE4DC;
    }
    .items-table th:last-child { border-right: none; }
    .items-table td {
      border-right: 1px solid #EFE4DC;
    }
    .items-table td:last-child { border-right: none; }
    .totals-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 12px;
      color: #5C4537;
    }
    .grand-line {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 15px;
      font-weight: 900;
      color: #31190B;
      border-top: 2px solid #31190B;
      border-bottom: 2px solid #31190B;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <table class="header-table">
      <tr>
        <td style="width: 70px; vertical-align: middle;">
          <img src="${logoSrc}" alt="KWF Logo" style="width: 60px; height: 60px; object-fit: contain; border-radius: 6px;" />
        </td>
        <td style="vertical-align: middle; padding-left: 14px;">
          <h1 class="brand-title">${companyName}</h1>
          <p class="brand-sub">
            ${companyAddress}<br>
            GSTIN: <strong>${companyGstin}</strong> | Phone: ${companyPhone}
          </p>
        </td>
        <td style="vertical-align: middle; width: 230px;">
          <div class="bill-meta-box">
            <div class="bill-title-label">PURCHASE BILL</div>
            <div class="bill-number">#${invNumber}</div>
            <div class="bill-date">Date: <strong>${invDate}</strong></div>
          </div>
        </td>
      </tr>
    </table>

    <table class="parties-table">
      <tr>
        <td class="party-card" style="width: 50%; border-left: 4px solid #C88D58;">
          <div class="party-tag party-from-tag">FROM (SUPPLIER / VENDOR)</div>
          <div class="party-name">${supplierName}</div>
          ${supplierAddress ? `<div class="party-text">${supplierAddress}</div>` : ''}
          ${supplierGstin ? `<div class="party-text"><strong>GSTIN:</strong> ${supplierGstin}</div>` : ''}
          ${supplierPhone ? `<div class="party-text"><strong>Phone:</strong> ${supplierPhone}</div>` : ''}
        </td>
        <td class="party-card" style="width: 50%; border-left: 4px solid #2563EB;">
          <div class="party-tag party-to-tag">TO (BUYER / INWARD DEPOT)</div>
          <div class="party-name">${companyName}</div>
          <div class="party-text">${companyAddress}</div>
          <div class="party-text"><strong>GSTIN:</strong> ${companyGstin}</div>
          <div class="party-text"><strong>Contact:</strong> ${companyPhone}</div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">#</th>
          <th>ITEM DESCRIPTION</th>
          <th style="width: 60px; text-align: center;">QTY</th>
          <th style="width: 90px; text-align: right;">RATE (₹)</th>
          <th style="width: 60px; text-align: center;">GST</th>
          <th style="width: 80px; text-align: right;">GST (₹)</th>
          <th style="width: 100px; text-align: right;">TOTAL (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <table class="totals-table">
      <tr>
        <td style="vertical-align: top; width: 55%; padding-right: 20px;">
          <div style="background: #FAF4EF; border: 1px solid #EFE4DC; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px;">
            <div style="font-size: 10.5px; font-weight: 800; color: #8C5325; text-transform: uppercase; margin-bottom: 2px;">
              AMOUNT IN WORDS
            </div>
            <div style="font-size: 11.5px; font-weight: 700; color: #31190B;">
              ${numberToWordsINR(grandTotal)}
            </div>
          </div>
          ${purchase.notes ? `
            <div style="font-size: 11.5px; color: #5C4537; margin-top: 6px;">
              <strong>Remarks:</strong> ${purchase.notes}
            </div>
          ` : ''}
          <div style="font-size: 10.5px; color: #7D6C63; margin-top: 10px; line-height: 1.4;">
            Declaration: We declare that this purchase bill shows the actual procurement cost of the timber described and that all particulars are true and correct.
          </div>
        </td>
        <td style="vertical-align: top; width: 45%; padding-left: 10px;">
          <div class="summary-line">
            <span>Subtotal (Taxable Value):</span>
            <strong>₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </div>
          ${cgstAmount > 0 ? `
            <div class="summary-line">
              <span>CGST (50%):</span>
              <span>+₹${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-line">
              <span>SGST (50%):</span>
              <span>+₹${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          <div class="grand-line">
            <span>Grand Total:</span>
            <span>₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div style="margin-top: 24px; text-align: right;">
            <p style="margin: 0; font-size: 11px; font-weight: 700; color: #31190B;">For ${companyName}</p>
            <div style="height: 38px;"></div>
            <p style="margin: 0; font-size: 10.5px; color: #7D6C63;">Authorized Receiver / Signatory</p>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-10000px'
  iframe.style.top = '0'
  iframe.style.width = '210mm'
  iframe.style.height = '297mm'
  iframe.style.border = '0'
  iframe.style.visibility = 'visible'
  iframe.style.zIndex = '-9999'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  const executePrint = () => {
    try {
      iframe.contentWindow.focus()
      iframe.contentWindow.print()
    } catch (e) {
      console.error('[printPurchaseBillDocument] Printing error:', e)
      window.print()
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe)
        }
      }, 5000)
    }
  }

  setTimeout(executePrint, 300)
}
