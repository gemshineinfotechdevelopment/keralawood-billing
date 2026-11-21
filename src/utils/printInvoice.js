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

  const invNumber = modalBillData.invoiceNumber || modalBillData.invoice || modalBillData.id || 'INV-1001'
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
          gstRate: 0,
          hsn: modalBillData.hsnCode || settings.hsnCode || '4407',
        },
      ]

  const taxType = modalBillData.taxType || 'intra'
  const isInter = taxType === 'inter'

  // HSN Breakdown
  const summaryMap = {}
  rawItems.forEach((it) => {
    const hsn = it.hsn || it.hsnCode || settings.hsnCode || '4407'
    const rate = Number(it.gstRate) || 0
    const qty = Number(it.quantity) || 1
    const price = Number(it.price) || 0
    const taxable = qty * price
    const cgstAmt = taxType === 'intra' ? (taxable * (rate / 2)) / 100 : 0
    const sgstAmt = taxType === 'intra' ? (taxable * (rate / 2)) / 100 : 0
    const igstAmt = taxType === 'inter' ? (taxable * rate) / 100 : 0
    const totalTax = cgstAmt + sgstAmt + igstAmt

    const key = `${hsn}-${rate}`
    if (!summaryMap[key]) {
      summaryMap[key] = { hsn, rate, taxable: 0, cgstAmt: 0, sgstAmt: 0, igstAmt: 0, totalTax: 0 }
    }
    summaryMap[key].taxable += taxable
    summaryMap[key].cgstAmt += cgstAmt
    summaryMap[key].sgstAmt += sgstAmt
    summaryMap[key].igstAmt += igstAmt
    summaryMap[key].totalTax += totalTax
  })

  const hsnSummary = Object.values(summaryMap)
  const totalHsnTaxable = hsnSummary.reduce((sum, h) => sum + h.taxable, 0)
  const totalHsnCgst = hsnSummary.reduce((sum, h) => sum + h.cgstAmt, 0)
  const totalHsnSgst = hsnSummary.reduce((sum, h) => sum + h.sgstAmt, 0)
  const totalHsnIgst = hsnSummary.reduce((sum, h) => sum + h.igstAmt, 0)
  const totalHsnTax = hsnSummary.reduce((sum, h) => sum + h.totalTax, 0)

  // Totals
  const grandTotal = modalBillData.rawAmount !== undefined
    ? Number(modalBillData.rawAmount)
    : (Number(String(modalBillData.amount || modalBillData.grandTotal || 0).replace(/[^0-9.]/g, '')) || 0)
  const subtotal = modalBillData.itemsSubtotal !== undefined
    ? Number(modalBillData.itemsSubtotal)
    : (modalBillData.subtotal !== undefined ? Number(modalBillData.subtotal) : grandTotal)
  const discount = Number(modalBillData.discount) || 0
  const deliveryCharge = Number(modalBillData.deliveryCharge) || 0
  const totalGst = Number(modalBillData.totalGst || modalBillData.taxAmount) || 0
  const cgstAmount = modalBillData.cgstAmount !== undefined ? Number(modalBillData.cgstAmount) : (!isInter ? totalGst / 2 : 0)
  const sgstAmount = modalBillData.sgstAmount !== undefined ? Number(modalBillData.sgstAmount) : (!isInter ? totalGst / 2 : 0)
  const paymentStatus = modalBillData.paymentStatus || modalBillData.status || 'Paid'
  const balanceDue = Number(modalBillData.balanceDue) || 0
  const notes = modalBillData.notes || ''

  const depotName = (settings.depotName || 'Kerala Wood Furniture').replace(/[-–—]\s*sivakasi\s*depot/gi, '').trim() || 'Kerala Wood Furniture'
  const address = (settings.address || 'Sivakasi Central Mill Yard, Sivakasi').replace(/Depot & /gi, '').replace(/Central Depot/gi, 'Central Yard')
  const logoSrc = settings.logoUrl || defaultLogo || ''

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

  const hsnRows = hsnSummary.map((h) => `
    <tr style="border-bottom: 1px solid #EFE4DC;">
      <td style="padding: 6px 8px; text-align: center; font-weight: 600;">${h.hsn}</td>
      <td style="padding: 6px 8px; text-align: right;">${h.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      ${isInter ? `
        <td style="padding: 6px 8px; text-align: center;">${h.rate.toFixed(2)}%</td>
        <td style="padding: 6px 8px; text-align: right;">${h.igstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      ` : `
        <td style="padding: 6px 8px; text-align: center;">${(h.rate / 2).toFixed(2)}%</td>
        <td style="padding: 6px 8px; text-align: right;">${h.cgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 6px 8px; text-align: center;">${(h.rate / 2).toFixed(2)}%</td>
        <td style="padding: 6px 8px; text-align: right;">${h.sgstAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      `}
      <td style="padding: 6px 8px; text-align: right; font-weight: 600;">${h.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('')

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
    .hsn-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 8px;
    }
    .hsn-table th {
      background-color: #FAF1EE;
      color: #31190B;
      font-weight: 700;
      padding: 5px 8px;
      border-bottom: 1px solid #D3C4B8;
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

    <div style="margin-top: 24px; margin-bottom: 18px; page-break-inside: avoid; break-inside: avoid;">
      <table class="hsn-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 18%; text-align: center;">HSN/SAC</th>
            <th rowspan="2" style="width: 20%; text-align: right;">Taxable Value</th>
            ${isInter ? `
              <th colspan="2" style="width: 42%; text-align: center;">IGST</th>
            ` : `
              <th colspan="2" style="width: 22%; text-align: center;">CGST</th>
              <th colspan="2" style="width: 22%; text-align: center;">SGST/UTGST</th>
            `}
            <th rowspan="2" style="width: 18%; text-align: right;">Total Tax</th>
          </tr>
          <tr>
            ${isInter ? `
              <th style="font-size: 10px; text-align: center;">Rate</th>
              <th style="font-size: 10px; text-align: right;">Amount</th>
            ` : `
              <th style="font-size: 10px; text-align: center;">Rate</th>
              <th style="font-size: 10px; text-align: right;">Amount</th>
              <th style="font-size: 10px; text-align: center;">Rate</th>
              <th style="font-size: 10px; text-align: right;">Amount</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${hsnRows}
          <tr style="background-color: #FAF5F1; font-weight: 700; border-top: 1.5px solid #D3C4B8; border-bottom: 1.5px solid #D3C4B8;">
            <td style="padding: 6px 8px; text-align: center;">Total</td>
            <td style="padding: 6px 8px; text-align: right;">${totalHsnTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            ${isInter ? `
              <td style="padding: 6px 8px; text-align: center;">-</td>
              <td style="padding: 6px 8px; text-align: right;">${totalHsnIgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            ` : `
              <td style="padding: 6px 8px; text-align: center;">-</td>
              <td style="padding: 6px 8px; text-align: right;">${totalHsnCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="padding: 6px 8px; text-align: center;">-</td>
              <td style="padding: 6px 8px; text-align: right;">${totalHsnSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            `}
            <td style="padding: 6px 8px; text-align: right;">${totalHsnTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
      ${totalHsnTax > 0 ? `
        <p style="margin: 4px 0 0 0; font-size: 10.5px; color: #5C3A21;">
          <strong>Tax Amount (in words):</strong> ${numberToWordsINR(totalHsnTax)}
        </p>
      ` : ''}
    </div>

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
          ${totalGst > 0 ? (isInter ? `
            <div class="summary-line">
              <span>IGST (Inter-State):</span>
              <span>+₹${totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : `
            <div class="summary-line">
              <span>CGST:</span>
              <span>+₹${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-line">
              <span>SGST:</span>
              <span>+₹${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          `) : ''}
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
