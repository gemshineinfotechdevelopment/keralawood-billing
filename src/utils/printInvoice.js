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
 * Shared print stylesheet for isolated A4 printing
 */
const sharedPrintCss = `
  @page {
    size: A4 portrait;
    margin: 8mm 10mm 10mm 10mm;
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
    padding: 6px 10px;
  }
  .header-table {
    width: 100%;
    border-collapse: collapse;
    border-bottom: 2px solid #D3C4B8;
    padding-bottom: 12px;
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
    margin: 2px 0 0 0;
    font-size: 11px;
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
    margin-bottom: 18px;
    background-color: #FEF9F6;
    border: 1px solid #EFE4DC;
    border-radius: 6px;
  }
  .cust-col {
    width: 50%;
    padding: 10px 14px;
    vertical-align: top;
  }
  .cust-label {
    font-size: 10px;
    font-weight: 700;
    color: #7D6C63;
    text-transform: uppercase;
    margin: 0 0 3px 0;
    letter-spacing: 0.04em;
  }
  .cust-name {
    font-size: 13.5px;
    font-weight: 700;
    color: #31190B;
    margin: 0 0 3px 0;
  }
  .cust-sub {
    font-size: 11px;
    color: #5C4537;
    margin: 1px 0;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
    font-size: 12px;
  }
  .items-table th {
    background-color: #F8EFE9;
    color: #31190B;
    font-weight: 700;
    padding: 9px 10px;
    border-bottom: 1.5px solid #D3C4B8;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .items-table td {
    padding: 9px 10px;
    border-bottom: 1px solid #EFE4DC;
    vertical-align: middle;
  }
  .footer-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 14px;
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
    padding: 3.5px 0;
    font-size: 12px;
    color: #5C4537;
    border-bottom: 1px dashed #EFE4DC;
  }
  .grand-line {
    display: flex;
    justify-content: space-between;
    padding: 7px 0;
    font-size: 14.5px;
    font-weight: 800;
    color: #31190B;
    border-top: 1.5px solid #31190B;
    border-bottom: 1.5px solid #31190B;
    margin-top: 5px;
    margin-bottom: 10px;
  }
  .sign-box {
    border: 1px solid #EFE4DC;
    border-radius: 6px;
    background-color: #FEF9F6;
    padding: 10px 12px;
    text-align: right;
    margin-top: 10px;
  }
  .sign-space {
    height: 38px;
  }
`

/**
 * Generate Clean Printable HTML for Customer Tax Invoice
 */
export function getInvoicePrintHtml(modalBillData, settings = {}, defaultLogo = '') {
  if (!modalBillData) return ''

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

  const grandTotal = modalBillData.rawAmount !== undefined
    ? Number(modalBillData.rawAmount)
    : (Number(String(modalBillData.amount || modalBillData.grandTotal || 0).replace(/[^0-9.]/g, '')) || 0)
  const subtotal = modalBillData.itemsSubtotal !== undefined
    ? Number(modalBillData.itemsSubtotal)
    : (modalBillData.subtotal !== undefined ? Number(modalBillData.subtotal) : grandTotal)
  const discount = Number(modalBillData.discount) || 0

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
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td><strong>${it.description || it.name || 'Timber Item'}</strong></td>
        <td style="text-align: center;">${hsn}</td>
        <td style="text-align: center; font-weight: 600;">${qty}</td>
        <td style="text-align: right;">₹${price.toLocaleString('en-IN')}</td>
        <td style="text-align: right; font-weight: 700;">₹${rowLine.toLocaleString('en-IN')}</td>
      </tr>
    `
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice #${invNumber} - ${custName}</title>
  <style>${sharedPrintCss}</style>
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
          <th style="width: 45%; text-align: left;">Item Description</th>
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
          <p style="margin: 0 0 10px 0; font-size: 11.5px; font-style: italic; color: #8C5325;">${numberToWordsINR(grandTotal)}</p>
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
}

/**
 * Cross-browser reliable printing via hidden in-viewport iframe with popup fallback
 */
export function printHtmlDocument(html, title = 'Document') {
  if (typeof document === 'undefined') return

  try {
    const iframe = document.createElement('iframe')
    iframe.id = 'kwf-print-frame-' + Date.now()
    // Position inside viewport with near-zero opacity so Chromium renders and executes print reliably
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '1px'
    iframe.style.height = '1px'
    iframe.style.border = '0'
    iframe.style.opacity = '0.01'
    iframe.style.pointerEvents = 'none'
    iframe.style.zIndex = '99999'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow.document
    doc.open()
    doc.write(html)
    doc.close()

    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      } catch (err) {
        console.warn('[printHtmlDocument] Iframe print failed, opening print window:', err)
        const printWindow = window.open('', '_blank', 'width=880,height=720')
        if (printWindow) {
          printWindow.document.open()
          printWindow.document.write(html)
          printWindow.document.close()
          printWindow.focus()
          setTimeout(() => {
            printWindow.print()
            printWindow.close()
          }, 350)
        } else {
          window.print()
        }
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe)
          }
        }, 5000)
      }
    }

    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
      setTimeout(triggerPrint, 250)
    } else {
      iframe.onload = () => setTimeout(triggerPrint, 250)
      setTimeout(triggerPrint, 500)
    }
  } catch (outerErr) {
    console.error('[printHtmlDocument] Top level print error:', outerErr)
    const printWindow = window.open('', '_blank', 'width=880,height=720')
    if (printWindow) {
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 350)
    } else {
      window.print()
    }
  }
}

/**
 * Print Customer Invoice via Isolated Iframe
 */
export function printInvoiceDocument(modalBillData, settings = {}, defaultLogo = '') {
  if (!modalBillData) return
  const html = getInvoicePrintHtml(modalBillData, settings, defaultLogo)
  printHtmlDocument(html, 'Tax Invoice')
}

/**
 * Download Customer Tax Invoice as PDF
 */
export async function downloadInvoicePDF(modalBillData, settings = {}, defaultLogo = '') {
  if (!modalBillData) return
  try {
    const html2pdfModule = await import('html2pdf.js')
    const html2pdf = html2pdfModule.default || html2pdfModule

    const invNumber = modalBillData.invoiceNumber || modalBillData.invoice || modalBillData.id || '100'
    const html = getInvoicePrintHtml(modalBillData, settings, defaultLogo)

    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-10000px'
    container.style.top = '0'
    container.style.width = '794px'
    container.innerHTML = html
    document.body.appendChild(container)

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `Tax_Invoice_${invNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    await html2pdf().set(opt).from(container).save()
    if (container.parentNode) container.parentNode.removeChild(container)
  } catch (err) {
    console.error('[downloadInvoicePDF] Error downloading PDF:', err)
  }
}

/**
 * Generate Clean Printable HTML for Purchase Bills (No Logo)
 */
export function getPurchaseBillPrintHtml(purchase, settings = {}) {
  if (!purchase) return ''

  const invNumber = purchase.invoiceNumber || purchase.id || '100'
  const invDate = purchase.date || new Date().toISOString().split('T')[0]

  const supplierName = purchase.supplier || 'Forest Timber Mill'
  const supplierPhone = purchase.supplierPhone || ''
  const supplierAddress = purchase.supplierAddress || 'Mill Yard Depot'
  const supplierGstin = purchase.supplierGstin || 'Unregistered'

  const depotName = (settings.depotName || 'Kerala Wood Furniture').replace(/[-–—]\s*sivakasi\s*depot/gi, '').trim() || 'Kerala Wood Furniture'
  const companyName = purchase.companyName || depotName
  const address = (settings.address || 'Sivakasi Central Mill Yard, Sivakasi').replace(/Depot & /gi, '').replace(/Central Depot/gi, 'Central Yard')
  const companyAddress = purchase.companyAddress || address
  const companyGstin = purchase.companyGstin || settings.gstin || '32AABCP9821K1ZK'
  const companyPhone = purchase.companyPhone || settings.contactPhone || '+91 484 289 1204'

  const rawItems = Array.isArray(purchase.itemsList) && purchase.itemsList.length > 0
    ? purchase.itemsList
    : [
        {
          name: purchase.item || 'Timber Material',
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
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td><strong>${it.name || it.item || 'Timber Material'}</strong></td>
        <td style="text-align: center; font-weight: 600;">${qty}</td>
        <td style="text-align: right;">₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: center;">${gstPct}%</td>
        <td style="text-align: right; font-weight: 700;">₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Bill #${invNumber}</title>
  <style>${sharedPrintCss}</style>
</head>
<body>
  <div class="sheet">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h1 class="brand-title" style="margin-bottom: 4px;">${depotName}</h1>
          <p class="brand-sub">${companyAddress}</p>
          <p class="brand-sub">Phone: ${companyPhone} • GSTIN: ${companyGstin} • HSN: ${settings.hsnCode || '9403'}</p>
        </td>
        <td style="vertical-align: top; text-align: right; width: 220px;">
          <div class="badge">PURCHASE BILL</div>
          <p style="margin: 3px 0; font-size: 12px;"><strong>Purchase #:</strong> ${invNumber}</p>
          <p style="margin: 3px 0; font-size: 12px;"><strong>Purchase Date:</strong> ${invDate}</p>
        </td>
      </tr>
    </table>

    <table class="cust-table">
      <tr>
        <td class="cust-col" style="border-right: 1px solid #EFE4DC;">
          <div class="cust-label">FROM (SUPPLIER DETAILS):</div>
          <div class="cust-name">${supplierName}</div>
          ${supplierAddress ? `<div class="cust-sub">${supplierAddress}</div>` : ''}
          ${supplierPhone ? `<div class="cust-sub">Phone: ${supplierPhone}</div>` : ''}
          <div class="cust-sub">GSTIN: ${supplierGstin}</div>
        </td>
        <td class="cust-col">
          <div class="cust-label">TO (BUYER / RECIPIENT):</div>
          <div class="cust-name">${companyName}</div>
          <div class="cust-sub">${companyAddress}</div>
          <div class="cust-sub">Phone: ${companyPhone}</div>
          <div class="cust-sub">GSTIN: ${companyGstin}</div>
        </td>
      </tr>
    </table>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">#</th>
          <th style="width: 42%; text-align: left;">Item Description</th>
          <th style="width: 10%; text-align: center;">Qty</th>
          <th style="width: 15%; text-align: right;">Rate (₹)</th>
          <th style="width: 12%; text-align: center;">GST</th>
          <th style="width: 16%; text-align: right;">Total (₹)</th>
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
          <p style="margin: 0 0 10px 0; font-size: 11.5px; font-style: italic; color: #8C5325;">${numberToWordsINR(grandTotal)}</p>
          ${purchase.notes ? `
            <p style="margin: 0 0 10px 0; font-size: 11px;"><strong>Remarks:</strong> ${purchase.notes}</p>
          ` : ''}
          <div style="background-color: #FAF5F1; border-left: 3px solid #8C5325; padding: 7px 10px; margin-top: 8px;">
            <p style="margin: 0 0 2px 0; font-size: 10px; font-weight: 700; color: #7D6C63; text-transform: uppercase;">Declaration:</p>
            <p style="margin: 0; font-size: 10.5px; color: #5C4537;">
              We declare that this purchase bill shows the actual procurement cost of the timber described and that all particulars are true and correct.
            </p>
          </div>
        </td>
        <td class="footer-right">
          <div class="summary-line">
            <span>Subtotal (Taxable Value):</span>
            <span>₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
          <div class="sign-box">
            <p style="margin: 0; font-size: 11px; font-weight: 600;">For ${companyName}</p>
            <div class="sign-space"></div>
            <p style="margin: 0; font-size: 11px; color: #7D6C63;">Authorized Receiver / Signatory</p>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

/**
 * Print Purchase Bill via Isolated Iframe
 */
export function printPurchaseBillDocument(purchase, settings = {}) {
  if (!purchase) return
  const html = getPurchaseBillPrintHtml(purchase, settings)
  printHtmlDocument(html, 'Purchase Bill')
}

/**
 * Download Purchase Bill as PDF
 */
export async function downloadPurchaseBillPDF(purchase, settings = {}) {
  if (!purchase) return
  try {
    const html2pdfModule = await import('html2pdf.js')
    const html2pdf = html2pdfModule.default || html2pdfModule

    const invNumber = purchase.invoiceNumber || purchase.id || '100'
    const html = getPurchaseBillPrintHtml(purchase, settings)

    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-10000px'
    container.style.top = '0'
    container.style.width = '794px'
    container.innerHTML = html
    document.body.appendChild(container)

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `Purchase_Bill_${invNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    await html2pdf().set(opt).from(container).save()
    if (container.parentNode) container.parentNode.removeChild(container)
  } catch (err) {
    console.error('[downloadPurchaseBillPDF] Error downloading PDF:', err)
  }
}

/**
 * Generate Clean Printable HTML for Products Catalog & Inventory
 */
export function getProductsPrintHtml(products = [], settings = {}, defaultLogo = '') {
  const depotName = (settings.depotName || 'Kerala Wood Furniture').replace(/[-–—]\s*sivakasi\s*depot/gi, '').trim() || 'Kerala Wood Furniture'
  const address = (settings.address || 'Sivakasi Central Mill Yard, Sivakasi').replace(/Depot & /gi, '').replace(/Central Depot/gi, 'Central Yard')
  const printDate = new Date().toLocaleDateString('en-GB')
  const printTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const logoUrl = settings.logoUrl || defaultLogo || ''

  const productRows = products.map((p, idx) => {
    const code = p.code || p.productCode || (100 + idx)
    const price = Number(String(p.sellingPrice || p.unitPrice || p.price || 0).replace(/[^0-9.]/g, '')) || 0
    const stock = p.stockQuantity !== undefined ? p.stockQuantity : (p.stock !== undefined ? p.stock : '-')
    return `
      <tr>
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 700; color: #5C3A21;">${code}</td>
        <td><strong>${p.name || 'Unnamed Product'}</strong></td>
        <td>${p.category || '-'}</td>
        <td>${p.woodSpecies || '-'}</td>
        <td style="text-align: right; font-weight: 600;">₹${price.toLocaleString('en-IN')}</td>
        <td style="text-align: center; font-weight: 700;">${stock}</td>
      </tr>
    `
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Products Catalog - ${depotName}</title>
  <style>
    ${sharedPrintCss}
    .products-table th {
      background-color: #31190B !important;
      color: #FFFFFF !important;
      border: 1px solid #31190B !important;
    }
    .products-table td {
      border: 1px solid #EDE3DB !important;
    }
    .products-table tbody tr:nth-child(even) td {
      background-color: #FAF6F2 !important;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <table class="header-table">
      <tr>
        ${logoUrl ? `
          <td style="width: 75px; vertical-align: top; padding-right: 14px;">
            <img src="${logoUrl}" alt="Logo" class="brand-logo" style="width: 64px; height: 64px; object-fit: contain; border-radius: 6px; border: 1px solid #D3C4B8;" />
          </td>
        ` : ''}
        <td style="vertical-align: top;">
          <h1 class="brand-title">${depotName}</h1>
          <p class="brand-sub">${address}</p>
          <p class="brand-sub">Phone: ${settings.contactPhone || 'N/A'} • GSTIN: ${settings.gstin || 'N/A'}</p>
        </td>
        <td style="vertical-align: top; text-align: right; width: 260px;">
          <div class="badge">PRODUCT CATALOG & INVENTORY</div>
          <p style="margin: 3px 0; font-size: 12px;"><strong>Total Products:</strong> ${products.length} Items</p>
          <p style="margin: 3px 0; font-size: 12px;"><strong>Printed On:</strong> ${printDate} ${printTime}</p>
        </td>
      </tr>
    </table>

    <table class="items-table products-table">
      <thead>
        <tr>
          <th style="width: 38px; text-align: center;">#</th>
          <th style="width: 75px; text-align: center;">Code</th>
          <th style="text-align: left;">Product Name / Description</th>
          <th style="width: 125px; text-align: left;">Category</th>
          <th style="width: 115px; text-align: left;">Wood Species</th>
          <th style="width: 110px; text-align: right;">Price (₹)</th>
          <th style="width: 65px; text-align: center;">Stock</th>
        </tr>
      </thead>
      <tbody>
        ${productRows.length > 0 ? productRows : `<tr><td colspan="7" style="text-align: center; padding: 20px;">No products in catalog.</td></tr>`}
      </tbody>
    </table>

    <table class="footer-table" style="margin-top: 20px; border-top: 1px solid #D3C4B8; padding-top: 10px;">
      <tr>
        <td style="font-size: 11px; color: #7D6C63;">
          Official Kerala Wood Furniture Inventory Record • Confidential internal depot catalog
        </td>
        <td style="text-align: right; font-size: 11px; color: #31190B; font-weight: 600;">
          Authorized Store Manager
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}

/**
 * Print Products Catalog via Isolated Iframe
 */
export function printProductsDocument(products = [], settings = {}, defaultLogo = '') {
  const html = getProductsPrintHtml(products, settings, defaultLogo)
  printHtmlDocument(html, 'Products Catalog')
}

/**
 * Download Products Catalog as PDF
 */
export async function downloadProductsPDF(products = [], settings = {}, defaultLogo = '') {
  try {
    const html2pdfModule = await import('html2pdf.js')
    const html2pdf = html2pdfModule.default || html2pdfModule

    const html = getProductsPrintHtml(products, settings, defaultLogo)

    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-10000px'
    container.style.top = '0'
    container.style.width = '794px'
    container.innerHTML = html
    document.body.appendChild(container)

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `Products_Catalog_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    await html2pdf().set(opt).from(container).save()
    if (container.parentNode) container.parentNode.removeChild(container)
  } catch (err) {
    console.error('[downloadProductsPDF] Error downloading PDF:', err)
  }
}
