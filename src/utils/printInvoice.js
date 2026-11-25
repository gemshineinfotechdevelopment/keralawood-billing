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
  const rawCustGstin = (typeof rawCust === 'object' && rawCust !== null ? rawCust.gstin : null) || modalBillData.customerGstin || modalBillData.gstin || ''
  const isCustGstinValid = rawCustGstin && !String(rawCustGstin).toLowerCase().includes('unregistered') && !String(rawCustGstin).toLowerCase().includes('personal') && String(rawCustGstin).trim().length > 0

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
    : (modalBillData.taxAmount !== undefined && !modalBillData.totalIgst ? Number(modalBillData.taxAmount) : NaN)
  if (isNaN(totalGst)) {
    totalGst = rawItems.reduce((sum, it) => {
      const q = Number(it.quantity) || 1
      const p = Number(it.price) || 0
      const r = it.gstRate !== undefined ? Number(it.gstRate) : 0
      return sum + (q * p * r) / 100
    }, 0)
  }

  let totalIgst = modalBillData.totalIgst !== undefined
    ? Number(modalBillData.totalIgst)
    : NaN
  if (isNaN(totalIgst)) {
    totalIgst = rawItems.reduce((sum, it) => {
      const q = Number(it.quantity) || 1
      const p = Number(it.price) || 0
      const r = it.igstRate !== undefined ? Number(it.igstRate) : 0
      return sum + (q * p * r) / 100
    }, 0)
  }

  const cgstAmount = modalBillData.cgstAmount !== undefined ? Number(modalBillData.cgstAmount) : (totalGst / 2)
  const sgstAmount = modalBillData.sgstAmount !== undefined ? Number(modalBillData.sgstAmount) : (totalGst / 2)
  const igstAmount = modalBillData.igstAmount !== undefined ? Number(modalBillData.igstAmount) : totalIgst
  const paymentStatus = modalBillData.paymentStatus || modalBillData.status || 'Paid'
  const balanceDue = Number(modalBillData.balanceDue) || 0
  const notes = modalBillData.notes || ''

  const depotName = (settings.depotName || 'Kerala Wood Furniture').replace(/[-–—]\s*sivakasi\s*(depot|branch)/gi, '').trim() || 'Kerala Wood Furniture'
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
          ${isCustGstinValid ? `<div class="cust-sub">GSTIN: ${rawCustGstin}</div>` : ''}
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
          ${totalGst > 0 ? `
            <div class="summary-line">
              <span>CGST:</span>
              <span>+₹${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-line">
              <span>SGST:</span>
              <span>+₹${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          ${totalIgst > 0 ? `
            <div class="summary-line">
              <span>IGST:</span>
              <span>+₹${igstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
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
 * Direct High-Fidelity PDF Generation using html2canvas & jsPDF
 * Completely bypasses html2pdf.js 0.14.0 opacity:0 overlay bug which caused blank PDFs.
 */
async function generatePdfFromHtml(html, fileName, isSaveOnly = false) {
  if (typeof document === 'undefined') return { success: false, error: 'No document' }

  const existingModalSheet = document.getElementById('pos-printable-invoice')
  let targetElement = null
  let isTemp = false
  let overlayEl = null

  if (existingModalSheet && existingModalSheet.offsetHeight > 100) {
    targetElement = existingModalSheet
  } else {
    isTemp = true
    overlayEl = document.createElement('div')
    overlayEl.id = 'kwf-pdf-progress-overlay'
    overlayEl.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(49,25,11,0.45);z-index:999999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);'
    overlayEl.innerHTML = `
      <div style="background:#fff;padding:18px 28px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.25);display:flex;align-items:center;gap:12px;font-family:'Inter',sans-serif;color:#31190B;font-weight:700;font-size:14px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:kwfSpin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        <span>Generating Invoice PDF...</span>
      </div>
      <style>@keyframes kwfSpin { 100% { transform: rotate(360deg); } }</style>
    `
    document.body.appendChild(overlayEl)

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const styles = Array.from(doc.querySelectorAll('style')).map(s => s.innerHTML).join('\n')
    const sheet = doc.querySelector('.sheet') || doc.body

    targetElement = document.createElement('div')
    targetElement.id = 'kwf-pdf-export-host-' + Date.now()
    targetElement.style.cssText = 'position:fixed;top:0;left:0;width:794px;background:#FFFFFF;color:#31190B;z-index:99999999;box-sizing:border-box;margin:0;padding:12px 16px;pointer-events:none;'
    targetElement.innerHTML = `
      <style>
        ${styles}
        *, *::before, *::after {
          box-sizing: border-box !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .sheet {
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      </style>
      <div style="background:#FFFFFF;color:#31190B;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.4;">
        ${sheet ? sheet.outerHTML : html}
      </div>
    `
    document.body.appendChild(targetElement)
  }

  const imgs = Array.from(targetElement.querySelectorAll('img'))
  if (imgs.length > 0) {
    await Promise.all(
      imgs.map(img => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve()
        return new Promise(res => {
          img.onload = res
          img.onerror = res
          setTimeout(res, 600)
        })
      })
    )
  }
  await new Promise(res => setTimeout(res, 120))

  try {
    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default || html2canvasModule
    const { jsPDF } = await import('jspdf')

    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.98)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pdfWidth = 210
    const pageHeight = 297
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    if (isSaveOnly) {
      pdf.save(fileName)
      return { success: true }
    } else {
      const blob = pdf.output('blob')
      return { success: true, blob, pdf }
    }
  } catch (err) {
    console.error('[generatePdfFromHtml] Error:', err)
    return { success: false, error: err.message }
  } finally {
    if (isTemp && targetElement && targetElement.parentNode) {
      targetElement.parentNode.removeChild(targetElement)
    }
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl)
    }
  }
}

/**
 * Download Customer Tax Invoice as PDF
 */
export async function downloadInvoicePDF(modalBillData, settings = {}, defaultLogo = '') {
  if (!modalBillData) return
  const invNumber = modalBillData.invoiceNumber || modalBillData.invoice || modalBillData.id || '100'
  const html = getInvoicePrintHtml(modalBillData, settings, defaultLogo)
  await generatePdfFromHtml(html, `Tax_Invoice_${invNumber}.pdf`, true)
}

/**
 * Format Customer Invoice text for WhatsApp matching the requested template
 */
export function formatWhatsAppInvoiceText(modalBillData, settings = {}) {
  if (!modalBillData) return ''

  const invNumber = modalBillData.invoiceNumber || modalBillData.invoice || modalBillData.id || '100'
  const invDate = modalBillData.invoiceDate || modalBillData.date || new Date().toISOString().split('T')[0]

  const rawCust = modalBillData.customer
  const custName = typeof rawCust === 'object' && rawCust !== null ? (rawCust.name || 'Valued Customer') : (String(rawCust || '').trim() || 'Valued Customer')
  const custPhone = (typeof rawCust === 'object' && rawCust !== null ? rawCust.phone : null) || modalBillData.customerPhone || modalBillData.phone || ''

  const paymentStatus = modalBillData.paymentStatus || modalBillData.status || 'Paid'
  const paymentMode = modalBillData.paymentMode || 'UPI'

  const rawItems = Array.isArray(modalBillData.items) && modalBillData.items.length > 0 && typeof modalBillData.items[0] === 'object'
    ? modalBillData.items
    : Array.isArray(modalBillData.itemDetails) && modalBillData.itemDetails.length > 0
    ? modalBillData.itemDetails
    : [
        {
          description: typeof modalBillData.items === 'string' && modalBillData.items.trim()
            ? modalBillData.items
            : (typeof modalBillData.item === 'string' && modalBillData.item.trim() ? modalBillData.item : 'Timber Furniture Order'),
          quantity: 1,
          price: modalBillData.rawAmount || Number(String(modalBillData.amount || 0).replace(/[^0-9.]/g, '')) || 0,
        }
      ]

  const grandTotal = modalBillData.rawAmount !== undefined
    ? Number(modalBillData.rawAmount)
    : (Number(String(modalBillData.amount || modalBillData.grandTotal || 0).replace(/[^0-9.]/g, '')) || 0)
  const subtotal = modalBillData.itemsSubtotal !== undefined
    ? Number(modalBillData.itemsSubtotal)
    : (modalBillData.subtotal !== undefined ? Number(modalBillData.subtotal) : grandTotal)
  const discount = Number(modalBillData.discount) || 0
  const deliveryCharge = Number(modalBillData.deliveryCharge) || 0

  let totalGst = Number(modalBillData.totalGst) || 0
  let totalIgst = Number(modalBillData.totalIgst) || 0
  if (!totalGst && !totalIgst && modalBillData.taxAmount) {
    totalGst = Number(modalBillData.taxAmount)
  }
  const taxAmount = totalGst + totalIgst

  const itemsLines = rawItems.map((it, idx) => {
    const desc = (it.description || it.name || it.item || 'Timber Item').toUpperCase()
    const qty = Number(it.quantity) || 1
    const unit = it.unit || 'Nos'
    const price = Number(it.price || it.rate || 0)
    const gstRate = Number(it.gstRate || 0)
    const igstRate = Number(it.igstRate || 0)
    const lineSub = qty * price
    const lineGst = (lineSub * (gstRate + igstRate)) / 100
    const lineTot = lineSub + lineGst

    let rateDetail = `@ ₹${price.toLocaleString('en-IN')}`
    if (gstRate > 0) rateDetail += ` (GST ${gstRate}%)`
    else if (igstRate > 0) rateDetail += ` (IGST ${igstRate}%)`

    return `${idx + 1}. *${desc}* - ${qty} ${unit} ${rateDetail} = *₹${lineTot.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`
  }).join('\n')

  const depotTitle = (settings.depotName || 'Kerala Wood Furniture - Sivakasi').toUpperCase()

  const lines = [
    `*${depotTitle} - INVOICE BILL 🧾*`,
    `--------------------------------`,
    `*Bill No:* #${invNumber}`,
    `*Customer:* ${custName}`,
    ...(custPhone ? [`*Phone:* ${custPhone}`] : []),
    `*Date:* ${invDate}`,
    `*Status:* ${paymentStatus} (${paymentMode})`,
    `--------------------------------`,
    `*ITEMS:*`,
    itemsLines,
    `--------------------------------`,
    `*Subtotal:* ₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ...(discount > 0 ? [`*Discount:* ₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`] : []),
    ...(deliveryCharge > 0 ? [`*Transport / Delivery:* ₹${deliveryCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`] : []),
    ...(taxAmount > 0 ? [`*Tax / GST:* ₹${taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`] : []),
    `*NET TOTAL: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`,
    `--------------------------------`,
    `_Thank you for your business!_`,
    `*${settings.depotName || 'Kerala Wood Furniture - Sivakasi'}*`,
  ]

  return lines.join('\n')
}

/**
 * Share Customer Invoice & PDF via WhatsApp
 */
export async function shareInvoiceOnWhatsApp(modalBillData, settings = {}, defaultLogo = '') {
  if (!modalBillData) return { success: false, error: 'No bill data provided' }

  const invNumber = modalBillData.invoiceNumber || modalBillData.invoice || modalBillData.id || '100'
  const rawCust = modalBillData.customer
  const custName = typeof rawCust === 'object' && rawCust !== null ? (rawCust.name || 'Customer') : (String(rawCust || '').trim() || 'Customer')
  const custPhone = (typeof rawCust === 'object' && rawCust !== null ? rawCust.phone : null) || modalBillData.customerPhone || modalBillData.phone || ''

  const safeCustName = custName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
  const pdfFileName = `Bill-${invNumber}-${safeCustName}.pdf`
  const messageText = formatWhatsAppInvoiceText(modalBillData, settings)

  let cleanPhone = String(custPhone || '').replace(/\D/g, '')
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone
  }

  try {
    const html = getInvoicePrintHtml(modalBillData, settings, defaultLogo)
    const result = await generatePdfFromHtml(html, pdfFileName, false)

    if (result.success && result.blob) {
      const pdfFile = new File([result.blob], pdfFileName, { type: 'application/pdf' })

      // Check Web Share API (mobile phones / tablets)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Bill #${invNumber} - ${custName}`,
          text: messageText,
        })
        return { success: true, method: 'native-share' }
      }

      // Native reliable PDF download
      if (result.pdf && typeof result.pdf.save === 'function') {
        result.pdf.save(pdfFileName)
      } else {
        const blobUrl = URL.createObjectURL(result.blob)
        const downloadAnchor = document.createElement('a')
        downloadAnchor.href = blobUrl
        downloadAnchor.download = pdfFileName
        document.body.appendChild(downloadAnchor)
        downloadAnchor.click()
        document.body.removeChild(downloadAnchor)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
      }
    }

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`
    window.open(waUrl, '_blank')

    return { success: true, method: 'whatsapp-web-download', downloadedFile: pdfFileName }
  } catch (err) {
    console.error('[shareInvoiceOnWhatsApp] Error:', err)
    if (err.name !== 'AbortError') {
      const waUrl = cleanPhone
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`
      window.open(waUrl, '_blank')
    }
    return { success: false, error: err.message }
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

  const depotName = (settings.depotName || 'Kerala Wood Furniture').replace(/[-–—]\s*sivakasi\s*(depot|branch)/gi, '').trim() || 'Kerala Wood Furniture'
  const companyName = purchase.companyName || depotName
  const address = (settings.address || 'Sivakasi Central Mill Yard, Sivakasi').replace(/Depot & /gi, '').replace(/Central Depot/gi, 'Central Yard')
  const companyAddress = purchase.companyAddress || address
  const companyGstin = purchase.companyGstin || settings.gstin || ''
  const companyPhone = purchase.companyPhone || settings.contactPhone || ''

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
  const invNumber = purchase.invoiceNumber || purchase.id || '100'
  const html = getPurchaseBillPrintHtml(purchase, settings)
  await generatePdfFromHtml(html, `Purchase_Bill_${invNumber}.pdf`, true)
}

/**
 * Format Purchase Bill text for WhatsApp
 */
export function formatWhatsAppPurchaseBillText(purchase, settings = {}) {
  if (!purchase) return ''

  const invNumber = purchase.invoiceNumber || purchase.id || '100'
  const invDate = purchase.date || new Date().toISOString().split('T')[0]

  const supplierName = purchase.supplier || 'Forest Timber Mill'
  const supplierPhone = purchase.supplierPhone || ''
  const companyName = purchase.companyName || settings.depotName || 'Kerala Wood Furniture - Sivakasi'

  const rawItems = Array.isArray(purchase.itemsList) && purchase.itemsList.length > 0
    ? purchase.itemsList
    : Array.isArray(purchase.items) && purchase.items.length > 0
    ? purchase.items
    : [
        {
          name: purchase.item || 'Timber Material',
          quantity: purchase.quantity || 1,
          rate: purchase.amount || 0,
          gstRate: purchase.gstRate || 18,
          total: purchase.total || purchase.amount || 0,
        }
      ]

  const grandTotal = purchase.total !== undefined
    ? Number(purchase.total)
    : Number(String(purchase.amount || 0).replace(/[^0-9.]/g, ''))
  const subtotal = Number(purchase.amount || purchase.subtotal || 0)
  const gstAmount = Number(purchase.gstAmount || 0)

  const itemsLines = rawItems.map((it, idx) => {
    const desc = (it.name || it.item || 'Timber Material').toUpperCase()
    const qty = Number(it.quantity) || 1
    const rate = Number(it.rate || it.amount || 0)
    const gstPct = Number(it.gstRate || it.gstPercent || 18)
    const lineGst = Number(it.gstAmount || 0)
    const lineTotal = Number(it.total || ((qty * rate) + lineGst))

    return `${idx + 1}. *${desc}* - ${qty} Nos @ ₹${rate.toLocaleString('en-IN')} (GST ${gstPct}%) = *₹${lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`
  }).join('\n')

  const depotTitle = companyName.toUpperCase()

  const lines = [
    `*${depotTitle} - PURCHASE BILL 🪵*`,
    `--------------------------------`,
    `*Purchase Bill No:* #${invNumber}`,
    `*Supplier:* ${supplierName}`,
    ...(supplierPhone ? [`*Phone:* ${supplierPhone}`] : []),
    `*Date:* ${invDate}`,
    `--------------------------------`,
    `*ITEMS (PROCUREMENT):*`,
    itemsLines,
    `--------------------------------`,
    `*Subtotal (Taxable):* ₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ...(gstAmount > 0 ? [`*GST / Tax:* ₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`] : []),
    `*NET TOTAL: ₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`,
    `--------------------------------`,
    `_Official Purchase & Procurement Record_`,
    `*${companyName}*`,
  ]

  return lines.join('\n')
}

/**
 * Share Purchase Bill & PDF via WhatsApp
 */
export async function sharePurchaseBillOnWhatsApp(purchase, settings = {}) {
  if (!purchase) return { success: false, error: 'No purchase bill data' }

  const invNumber = purchase.invoiceNumber || purchase.id || '100'
  const supplierName = purchase.supplier || 'Supplier'
  const supplierPhone = purchase.supplierPhone || ''

  const safeSupplierName = supplierName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
  const pdfFileName = `Purchase_Bill_${invNumber}_${safeSupplierName}.pdf`
  const messageText = formatWhatsAppPurchaseBillText(purchase, settings)

  let cleanPhone = String(supplierPhone || '').replace(/\D/g, '')
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone
  }

  try {
    const html = getPurchaseBillPrintHtml(purchase, settings)
    const result = await generatePdfFromHtml(html, pdfFileName, false)

    if (result.success && result.blob) {
      const pdfFile = new File([result.blob], pdfFileName, { type: 'application/pdf' })

      // Check Web Share API (mobile phones / tablets)
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Purchase Bill #${invNumber} - ${supplierName}`,
          text: messageText,
        })
        return { success: true, method: 'native-share' }
      }

      // Native reliable PDF download
      if (result.pdf && typeof result.pdf.save === 'function') {
        result.pdf.save(pdfFileName)
      } else {
        const blobUrl = URL.createObjectURL(result.blob)
        const downloadAnchor = document.createElement('a')
        downloadAnchor.href = blobUrl
        downloadAnchor.download = pdfFileName
        document.body.appendChild(downloadAnchor)
        downloadAnchor.click()
        document.body.removeChild(downloadAnchor)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
      }
    }

    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`
    window.open(waUrl, '_blank')

    return { success: true, method: 'whatsapp-web-download', downloadedFile: pdfFileName }
  } catch (err) {
    console.error('[sharePurchaseBillOnWhatsApp] Error:', err)
    if (err.name !== 'AbortError') {
      const waUrl = cleanPhone
        ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(messageText)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`
      window.open(waUrl, '_blank')
    }
    return { success: false, error: err.message }
  }
}

/**
 * Generate Clean Printable HTML for Products Catalog & Inventory
 */
export function getProductsPrintHtml(products = [], settings = {}, defaultLogo = '') {
  const depotName = (settings.depotName || 'Kerala Wood Furniture').replace(/[-–—]\s*sivakasi\s*(depot|branch)/gi, '').trim() || 'Kerala Wood Furniture'
  const address = (settings.address || 'Sivakasi Central Mill Yard, Sivakasi').replace(/Depot & /gi, '').replace(/Central Depot/gi, 'Central Yard')
  const printDate = new Date().toLocaleDateString('en-GB')
  const printTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const logoUrl = settings.logoUrl || defaultLogo || ''

  const productRows = products.map((p, idx) => {
    const code = p.code || p.productCode || (100 + idx)
    const price = Number(String(p.sellingPrice || p.unitPrice || p.price || 0).replace(/[^0-9.]/g, '')) || 0
    return `
      <tr>
        <td style="text-align: center; font-weight: 600;">${idx + 1}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 700; color: #5C3A21;">${code}</td>
        <td><strong>${p.name || 'Unnamed Product'}</strong></td>
        <td>${p.category || '-'}</td>
        <td>${p.woodSpecies || '-'}</td>
        <td style="text-align: right; font-weight: 600;">₹${price.toLocaleString('en-IN')}</td>
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
          <div class="badge">PRODUCT CATALOG</div>
          <p style="margin: 3px 0; font-size: 12px;"><strong>Total Products:</strong> ${products.length} Items</p>
          <p style="margin: 3px 0; font-size: 12px;"><strong>Printed On:</strong> ${printDate} ${printTime}</p>
        </td>
      </tr>
    </table>

    <table class="items-table products-table">
      <thead>
        <tr>
          <th style="width: 42px; text-align: center;">#</th>
          <th style="width: 80px; text-align: center;">Code</th>
          <th style="text-align: left;">Product Name / Description</th>
          <th style="width: 140px; text-align: left;">Category</th>
          <th style="width: 130px; text-align: left;">Wood Species</th>
          <th style="width: 120px; text-align: right;">Price (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${productRows.length > 0 ? productRows : `<tr><td colspan="6" style="text-align: center; padding: 20px;">No products in catalog.</td></tr>`}
      </tbody>
    </table>

    <table class="footer-table" style="margin-top: 20px; border-top: 1px solid #D3C4B8; padding-top: 10px;">
      <tr>
        <td style="font-size: 11px; color: #7D6C63;">
          Official ${depotName} Product Catalog Record • Confidential internal catalog
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
  const html = getProductsPrintHtml(products, settings, defaultLogo)
  await generatePdfFromHtml(html, `Products_Catalog_${new Date().toISOString().split('T')[0]}.pdf`, true)
}
