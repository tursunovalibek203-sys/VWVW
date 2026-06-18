// Chek chiqarish utility
import { trData } from './transliterator';

export interface ReceiptData {
  saleId: string;
  receiptNumber: string;
  date: string;
  time: string;
  cashier: string;
  currency?: string;     // 'UZS' | 'USD'
  exchangeRate: number;  // Yangi - dollar kursi
  customer: {
    name: string;
    phone?: string;
    address?: string;

    previousBalance?: number;
    previousBalanceUZS?: number;
    previousBalanceUSD?: number;
    newBalance?: number;
    newBalanceUZS?: number;
    newBalanceUSD?: number;
    totalDebtUZS?: number;
    totalDebtUSD?: number;
    previousDebtDays?: number;  // Eski qarz necha kun bo'lgan
    paymentDueDate?: string;    // Yangi qarzni qachongacha to'lash kerak
  };
  driver?: {
    name: string;
    phone?: string;
    factoryShare: number;
    customerShare: number;
  };
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    piecesPerBag?: number;
    pricePerUnit: number;
    pricePerPiece?: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  payments: {
    uzs?: number;
    usd?: number;
    card?: number;
  };
  totalPaid: number;
  debt: number;
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    inn: string;
  };
}

export function generateReceiptHTML(data: ReceiptData): string {
  const isUSD = (data.currency ?? 'USD') !== 'UZS';

  const fmtAmt = (n: number) => {
    if (isUSD) return `$${n % 1 === 0 ? n.toLocaleString() : n.toFixed(2)}`;
    return `${Math.round(n).toLocaleString()} so'm`;
  };

  const paymentsRows = Object.entries(data.payments)
    .filter(([, amount]) => amount && amount > 0)
    .map(([type, amount]) => {
      const label = type === 'uzs' ? "Naqd (so'm)" : type === 'usd' ? 'Dollar ($)' : 'Karta';
      const display = type === 'usd'
        ? `$${(amount! / data.exchangeRate).toFixed(2)}`
        : isUSD ? fmtAmt(amount!) : `${Math.round(amount!).toLocaleString()} so'm`;
      return `<tr><td style="font-size:12px;padding:2px 0;">${label}:</td><td style="font-size:12px;text-align:right;font-weight:700;padding:2px 0;">${display}</td></tr>`;
    }).join('');

  const hasDebt    = data.debt > 0;
  const hasPrevDebt  = (data.customer.previousBalanceUZS ?? 0) > 0 || (data.customer.previousBalanceUSD ?? 0) > 0;
  const hasTotalDebt = (data.customer.totalDebtUZS ?? 0) > 0 || (data.customer.totalDebtUSD ?? 0) > 0;

  const row = (l: string, r: string, bold = false, red = false) =>
    `<div style="display:flex;justify-content:space-between;margin:2px 0;font-size:12px;${red ? 'color:#c00;' : ''}${bold ? 'font-weight:700;' : ''}">`
    + `<span>${l}</span><span>${r}</span></div>`;

  const ln  = `<div style="border-top:1px dashed #555;margin:5px 0;"></div>`;
  const ln2 = `<div style="border-top:2px solid #000;margin:5px 0;"></div>`;

  const debtUZS = data.customer.totalDebtUZS ?? 0;
  const debtUSD = data.customer.totalDebtUSD ?? 0;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Chek #${data.receiptNumber}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; width: 80mm !important; }
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    * { page-break-inside: avoid; }
  }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.3;
    width: 76mm;
    margin: 0 auto;
    background: #fff;
    color: #000;
    padding: 1mm 5mm;
  }
  table { width: 100%; border-collapse: collapse; }
  th { background: #333; color: #fff; font-size: 9px; padding: 3px 2px; border: 1px solid #000; text-align: center; }
  td { font-size: 11px; padding: 3px 2px; border: 1px solid #000; vertical-align: top; }
</style>
</head>
<body>
  <!-- Header: Chap - logo, O'ng - nom va manzil -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:5px;border-bottom:2px solid #000;margin-bottom:5px;">
    <img src="/logo.jpg" alt="Logo" style="width:18mm;height:auto;margin-right:3px;flex-shrink:0;" onerror="this.style.display='none'">
    <div style="flex:1;">
      <div style="font-size:19px;font-weight:900;letter-spacing:1px;line-height:1.1;">LUX PET PLAST</div>
      <div style="font-size:10px;margin-top:3px;">Buxoro viloyati, Vobkent tumani</div>
      <div style="font-size:10px;">+998 91 414 44 58</div>
      <div style="font-size:10px;">+998 91 920 07 00</div>
      <div style="font-size:11px;font-weight:bold;margin-top:3px;">SAVDO CHEKI #${data.receiptNumber}</div>
    </div>
  </div>

  <!-- Mijoz ma'lumotlari -->
  ${row('Sana:', `${data.date} ${data.time}`)}
  ${row('Kassir:', data.cashier)}
  ${row('Mijoz:', trData(data.customer.name), true)}
  ${data.customer.phone ? row('Tel:', data.customer.phone) : ''}

  <!-- Bu savdodan oldingi qarz -->
  ${hasPrevDebt ? ln
    + ((data.customer.previousBalanceUZS ?? 0) > 0 ? row("Bu savdodan oldingi qarz (so'm):", `${data.customer.previousBalanceUZS!.toLocaleString()} so'm`, false, true) : '')
    + ((data.customer.previousBalanceUSD ?? 0) > 0 ? row('Bu savdodan oldingi qarz ($):', `$${(data.customer.previousBalanceUSD!).toFixed(2)}`, false, true) : '')
    : ''}

  ${ln2}

  <!-- Mahsulotlar jadvali: Mahsulot | Qop | 1 qopda | Dona narxi | Jami summa -->
  <table style="margin-bottom:4px;">
    <thead><tr>
      <th style="width:32%;text-align:left;">Mahsulot</th>
      <th style="width:10%;">Qop</th>
      <th style="width:13%;">1 qopda</th>
      <th style="width:22%;text-align:right;">Dona narxi</th>
      <th style="width:23%;text-align:right;">Jami summa</th>
    </tr></thead>
    <tbody>
    ${data.items.map((item) => {
      const ppb = item.piecesPerBag || 1;
      const narx = item.pricePerPiece != null ? item.pricePerPiece : (item.pricePerUnit / ppb);
      return `<tr>
        <td style="word-break:break-word;white-space:normal;">${trData(item.name)}</td>
        <td style="text-align:center;">${item.quantity}</td>
        <td style="text-align:center;">${item.piecesPerBag != null ? item.piecesPerBag : '-'}</td>
        <td style="text-align:right;">${fmtAmt(narx)}</td>
        <td style="text-align:right;font-weight:700;">${fmtAmt(item.subtotal)}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>

  ${ln2}

  <!-- Jami summa -->
  <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin:3px 0;">
    <span>JAMI SUMMA:</span><span>${fmtAmt(data.total)}</span>
  </div>
  ${ln}

  <!-- To'lovlar -->
  <table style="border:none;">
    <tbody style="border:none;">
    ${paymentsRows}
    <tr style="border-top:1px dashed #555;">
      <td style="border:none;font-weight:700;font-size:13px;">TO'LANDI:</td>
      <td style="border:none;text-align:right;font-weight:700;font-size:13px;">${fmtAmt(data.totalPaid)}</td>
    </tr>
    </tbody>
  </table>

  <!-- Qarz (ikki valyutada) -->
  ${(debtUZS > 0 || debtUSD > 0 || hasDebt) ? ln : ''}
  ${debtUZS > 0 ? row("Qarz UZS:", `${debtUZS.toLocaleString()} so'm`, true, true) : ''}
  ${debtUSD > 0 ? row('Qarz USD:', `$${debtUSD.toFixed(2)}`, true, true) : ''}
  ${!debtUZS && !debtUSD && hasDebt ? row('QARZ:', fmtAmt(data.debt), true, true) : ''}
  ${data.customer.paymentDueDate && (hasDebt || debtUZS > 0 || debtUSD > 0) ? `<div style="font-size:11px;color:#c00;margin-top:2px;">Muddat: ${data.customer.paymentDueDate} gacha</div>` : ''}

  ${data.driver ? ln
    + row('Haydovchi:', trData(data.driver.name))
    + row("Zavod to'laydi:", `${data.driver.factoryShare.toLocaleString()} so'm`)
    + row("Mijoz to'laydi:", `${data.driver.customerShare.toLocaleString()} so'm`)
    : ''}

  ${ln2}
  <div style="text-align:center;font-size:11px;font-weight:bold;">Xaridingiz uchun rahmat!</div>

<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 300); };
</script>
</body>
</html>`;
}

export function generateDeliveryStatementHTML(data: ReceiptData): string {
  const itemsHTML = data.items.map(item => `
    <tr>
      <td>${trData(item.name)}</td>
      <td style="text-align:center">${item.quantity} ${item.unit}</td>
      <td style="text-align:right">${item.pricePerUnit.toLocaleString()}</td>
      <td style="text-align:right">${item.subtotal.toLocaleString()}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yuk va Balans Xati</title>
    <style>
        @media print {
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; width: 80mm; }
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12px;
            line-height: 1.4;
            width: 80mm;
            max-width: 80mm;
            margin: 0;
            padding: 5px;
            background: white;
        }
        .logo-box {
            text-align: center;
            padding: 8px 4px 6px;
            border-bottom: 2px solid #000;
        }
        .logo-img {
            max-width: 100%;
            height: auto;
            max-height: 40mm;
            margin-bottom: 6px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            position: relative;
            padding-top: 10px;
        }
        .header h1 {
            font-size: 20px;
            margin: 0;
            text-transform: uppercase;
        }
        .header h2 {
            font-size: 16px;
            margin: 5px 0;
            font-weight: normal;
        }
        .contact-info {
            text-align: center;
            font-size: 10px;
            margin-top: 6px;
            padding-top: 6px;
            border-top: 1px dashed #000;
        }
        .info-section {
            margin-bottom: 20px;
        }
        .info-row {
            display: flex;
            margin-bottom: 5px;
        }
        .info-label {
            width: 80px;
            font-weight: bold;
        }
        .info-value {
            flex: 1;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 8px;
            border: 1px solid #333;
            text-align: left;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .totals {
            margin-top: 20px;
            text-align: right;
        }
        .totals .row {
            margin: 5px 0;
        }
        .totals .amount {
            display: inline-block;
            width: 150px;
            font-weight: bold;
        }
        .balance-section {
            margin-top: 10px;
            padding: 5px 0;
            border: none;
            background: none;
        }
        .balance-section h3 {
            margin: 0;
            text-align: left;
            border-bottom: 1px dashed #333;
            padding-bottom: 3px;
            font-size: 12px;
            font-weight: bold;
        }
        .balance-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
            font-size: 11px;
        }
        .signatures {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
        }
        .signature-box {
            width: 200px;
        }
        .signature-line {
            border-top: 1px solid #333;
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="logo-box">
        <img src="/logo.jpg" alt="LUX PET PLAST" class="logo-img" onerror="this.style.display='none'">
        <h1>LUX PET PLAST</h1>
        <h2>YUK VA BALANS XATI</h2>
        <div class="contact-info">
            <div>Buxoro viloyati, Vobkent tumani</div>
            <div>Tel: +998 91 414 44 58 | +998 91 920 07 00</div>
        </div>
    </div>

    <div class="info-section">
        <div class="info-row">
            <div class="info-label">Sana:</div>
            <div class="info-value">${data.date} ${data.time}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Buyurtma №:</div>
            <div class="info-value">${data.receiptNumber}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Mijoz:</div>
            <div class="info-value">${trData(data.customer.name)}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Telefon:</div>
            <div class="info-value">${data.customer.phone || '-'}</div>
        </div>
        <div class="info-row">
            <div class="info-label">Kassir:</div>
            <div class="info-value">${data.cashier}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Mahsulot</th>
                <th style="text-align:center">Miqdor</th>
                <th style="text-align:right">Narx</th>
                <th style="text-align:right">Summa</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHTML}
        </tbody>
    </table>

    <div class="totals">
        <div class="row">Jami summa: <span class="amount">${data.total.toLocaleString()} so'm</span></div>
        <div class="row">To'langan: <span class="amount">${data.totalPaid.toLocaleString()} so'm</span></div>
        ${data.debt > 0 ? `<div class="row" style="color:red">Qarz: <span class="amount">${data.debt.toLocaleString()} so'm</span></div>` : ''}
    </div>

    <div class="balance-section">
        <h3>MIJOZ BALANSI</h3>
        <div class="balance-row">
            <span>Oldingi qarz (so'm):</span>
            <span>${(data.customer.previousBalanceUZS || 0).toLocaleString()} so'm</span>
        </div>
        <div class="balance-row">
            <span>Oldingi qarz ($):</span>
            <span>$${(data.customer.previousBalanceUSD || 0).toLocaleString()}</span>
        </div>
        <div class="balance-row" style="border-top: 1px dashed #999; padding-top: 3px; margin-top: 5px;">
            <span><strong>Jami qarz (so'm):</strong></span>
            <span style="color:red; font-weight:bold">${(data.customer.newBalanceUZS || 0).toLocaleString()} so'm</span>
        </div>
        <div class="balance-row">
            <span><strong>Jami qarz ($):</strong></span>
            <span style="color:red; font-weight:bold">$${(data.customer.newBalanceUSD || 0).toLocaleString()}</span>
        </div>
        ${data.customer.paymentDueDate ? `
        <div class="balance-row" style="margin-top: 8px; padding: 4px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 3px; font-size: 10px; color: #856404;">
            <span>⚠️ Iltimos, qarzingizni ${data.customer.paymentDueDate} gacha to'lab qo'ying</span>
        </div>
        ` : ''}
    </div>

    ${data.driver ? `
    <div class="balance-section" style="margin-top: 20px;">
        <h3>YETKAZIB BERISH</h3>
        <div class="balance-row">
            <span>Haydovchi:</span>
            <span>${trData(data.driver.name)}</span>
        </div>
        <div class="balance-row">
            <span>Zavod to'laydi:</span>
            <span>${data.driver.factoryShare.toLocaleString()} so'm</span>
        </div>
        <div class="balance-row">
            <span>Mijoz to'laydi:</span>
            <span>${data.driver.customerShare.toLocaleString()} so'm</span>
        </div>
    </div>
    ` : ''}

    <div class="signatures">
        <div class="signature-box">
            <div class="signature-line">Kassir imzosi</div>
        </div>
        <div class="signature-box">
            <div class="signature-line">Mijoz imzosi</div>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 1000);
            }, 500);
        };
    </script>
</body>
</html>
  `;
}

export function generateDeliveryStatementThermalHTML(data: ReceiptData): string {
  const isUSD = (data.currency ?? 'USD') !== 'UZS';
  const fmtAmt = (n: number) => isUSD ? `$${n % 1 === 0 ? n.toLocaleString() : n.toFixed(2)}` : `${Math.round(n).toLocaleString()} so'm`;
  const totalBags = data.items.reduce((sum, item) => sum + item.quantity, 0);

  const itemsHTML = data.items.map((item, i) => `
    <tr>
      <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-size:11px;">${i + 1}</td>
      <td style="border:1px solid #000;padding:4px 3px;font-size:12px;word-break:break-word;">${trData(item.name)}</td>
      <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-size:12px;">${item.quantity}</td>
      <td style="border:1px solid #000;padding:4px 3px;text-align:right;font-size:12px;font-weight:700;">${fmtAmt(item.subtotal)}</td>
    </tr>`).join('');

  const row = (l: string, r: string, bold = false, red = false) =>
    `<div style="display:flex;justify-content:space-between;margin:2px 0;font-size:12px;${red ? 'color:#c00;' : ''}${bold ? 'font-weight:700;' : ''}"><span>${l}</span><span>${r}</span></div>`;
  const ln  = `<div style="border-top:1px dashed #555;margin:5px 0;"></div>`;
  const ln2 = `<div style="border-top:2px solid #000;margin:5px 0;"></div>`;

  const hasUZSDebt = (data.customer.totalDebtUZS || 0) > 0;
  const hasUSDDebt = (data.customer.totalDebtUSD || 0) > 0;
  const hasPrevUZS = (data.customer.previousBalanceUZS || 0) > 0;
  const hasPrevUSD = (data.customer.previousBalanceUSD || 0) > 0;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Yuk Xati #${data.receiptNumber}</title>
<style>
  @page { size: 80mm auto; margin: 3mm 0; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @media print { html, body { margin: 0 !important; padding: 0 !important; width: 80mm !important; } -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; width: 74mm; margin: 0 auto; color: #000; background: #fff; padding: 2mm; }
  table { width: 100%; border-collapse: collapse; }
</style>
</head>
<body>
  <div style="text-align:center;padding-bottom:5px;border-bottom:2px solid #000;margin-bottom:5px;">
    <div style="font-size:16px;font-weight:900;">LUX PET PLAST</div>
    <div style="font-size:10px;">Buxoro vil., Vobkent | +998 91 414 44 58</div>
    <div style="font-size:12px;font-weight:bold;margin-top:2px;">YUK XATI #${data.receiptNumber}</div>
  </div>
  ${row('Mijoz:', trData(data.customer.name), true)}
  ${data.customer.phone ? row('Tel:', data.customer.phone) : ''}
  ${row('Sana:', `${data.date} ${data.time}`)}
  ${row('Kassir:', data.cashier)}
  ${ln2}
  <table>
    <thead><tr>
      <th style="background:#333;color:#fff;padding:4px 3px;font-size:11px;width:8%;">№</th>
      <th style="background:#333;color:#fff;padding:4px 3px;font-size:11px;text-align:left;width:44%;">Mahsulot</th>
      <th style="background:#333;color:#fff;padding:4px 3px;font-size:11px;width:16%;">Qop</th>
      <th style="background:#333;color:#fff;padding:4px 3px;font-size:11px;text-align:right;width:32%;">Jami</th>
    </tr></thead>
    <tbody>${itemsHTML}
    <tr style="border-top:2px solid #000;">
      <td colspan="2" style="border:none;padding:4px 3px;font-weight:700;font-size:12px;">JAMI:</td>
      <td style="border:none;padding:4px 3px;text-align:center;font-weight:700;font-size:12px;">${totalBags}</td>
      <td style="border:none;padding:4px 3px;text-align:right;font-weight:700;font-size:12px;">${fmtAmt(data.total)}</td>
    </tr>
    </tbody>
  </table>
  ${ln2}
  ${row("To'langan:", fmtAmt(data.totalPaid), true)}
  ${data.debt > 0 ? row('Qarz:', fmtAmt(data.debt), true, true) : ''}
  ${(hasPrevUZS || hasPrevUSD || hasUZSDebt || hasUSDDebt) ? ln
    + (hasPrevUZS ? row("Oldingi qarz (so'm):", `${data.customer.previousBalanceUZS!.toLocaleString()} so'm`, false, true) : '')
    + (hasPrevUSD ? row("Oldingi qarz ($):", `$${data.customer.previousBalanceUSD!.toLocaleString()}`, false, true) : '')
    + (hasUZSDebt ? row("Jami qarz (so'm):", `${data.customer.totalDebtUZS!.toLocaleString()} so'm`, true, true) : '')
    + (hasUSDDebt ? row("Jami qarz ($):", `$${data.customer.totalDebtUSD!.toLocaleString()}`, true, true) : '')
    : ''}
  ${data.driver ? ln
    + row('Haydovchi:', trData(data.driver.name))
    + row("Zavod to'laydi:", `${data.driver.factoryShare.toLocaleString()} so'm`)
    + row("Mijoz to'laydi:", `${data.driver.customerShare.toLocaleString()} so'm`)
    : ''}
  ${ln2}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:10px;">
    <div style="border-top:2px solid #000;text-align:center;padding-top:3px;font-size:11px;font-weight:700;">Kassir</div>
    <div style="border-top:2px solid #000;text-align:center;padding-top:3px;font-size:11px;font-weight:700;">Mijoz</div>
  </div>
  ${ln2}
  <div style="text-align:center;font-size:11px;font-weight:bold;">Xaridingiz uchun rahmat!</div>
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 300); };
</script>
</body>
</html>`;
}

export function printReceipt(data: ReceiptData): void {
  console.log('🖨️ printReceipt called with data:', data);
  printToPopupWindow(data);
  printToPhysicalPrinter(data).catch(console.error);
}

export function printDeliveryStatement(data: ReceiptData): void {
  console.log('📄 Yuk va Balans Xati:', data);
  const html = generateDeliveryStatementThermalHTML(data);
  const printWindow = window.open('', '_blank', 'width=320,height=600');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  } else {
    alert('Yuk va Balans Xati chiqarish uchun popup oynalariga ruxsat bering!');
  }
}

// Automatic printing to physical printer
async function printToPhysicalPrinter(data: ReceiptData): Promise<void> {
  try {
    console.log('🖨️ printToPhysicalPrinter started');
    
    // Generate receipt text for 80mm printer
    const receiptText = generateTextReceipt(data);
    console.log('📄 Receipt text generated, length:', receiptText.length);
    
    // Create temporary file
    const tempFile = `receipt-${Date.now()}.txt`;
    console.log('📝 Temp file name:', tempFile);
    
    // Get auth token
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    // Write to file (using Node.js fs in browser environment through API)
    console.log('📡 Sending print request to server...');
    const response = await fetch('/api/print/receipt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        content: receiptText,
        filename: tempFile
      })
    });
    
    console.log('📡 Server response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server error response:', errorText);
      throw new Error(`Print service unavailable: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('📡 Server response:', result);
    
    if (!result.success) {
      throw new Error(result.error || 'Printing failed');
    }
    
    console.log('✅ Print request successful');
    
  } catch (error) {
    console.error('❌ printToPhysicalPrinter error:', error);
    throw error;
  }
}

// Fallback popup printing
function printToPopupWindow(data: ReceiptData): void {
  const html = generateReceiptHTML(data);
  
  // Yangi oyna ochish
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Automatik ravishda print dialog ochish
    setTimeout(() => {
      printWindow.print();
    }, 500);
  } else {
    console.error('❌ Chek oynasini ochib bo\'lmadi. Popup blocker tekshiring!');
    alert('Chek chiqarish uchun popup oynalariga ruxsat bering!');
  }
}

// Generate text receipt for 80mm printer
function generateTextReceipt(data: ReceiptData): string {
  const width = 48; // 80mm paper width in characters
  const separator = '='.repeat(width);
  const dashed = '-'.repeat(width);
  
  // Helper function to pad text
  const padLine = (left: string, right: string) => {
    const spaces = width - left.length - right.length;
    return left + ' '.repeat(Math.max(0, spaces)) + right;
  };
  
  // Items section
  const itemsText = data.items.map(item => {
    const name = trData(item.name).substring(0, 20).padEnd(20);
    const qty = item.quantity.toString().padStart(4);
    const price = item.pricePerUnit.toLocaleString().padStart(8);
    const total = item.subtotal.toLocaleString().padStart(10);
    return `${name} ${qty} ${price} ${total}`;
  }).join('\n');
  
  // Payments section
  const paymentsText = Object.entries(data.payments)
    .filter(([_, amount]) => amount && amount > 0)
    .map(([type, amount]) => {
      const label = type === 'uzs' ? 'Naqd (UZS)' : 
                   type === 'usd' ? 'Dollar (USD)' : 
                   type === 'card' ? 'Karta' : type;
      return padLine(label + ':', amount.toLocaleString() + ' so\'m');
    })
    .join('\n');

  let receipt = '';
  
  // Header
  receipt += separator + '\n';
  receipt += '*'.repeat(width) + '\n';
  receipt += '*' + 'LUX PET PLAST'.padStart(30).padEnd(width - 2) + '*\n';
  receipt += '*' + 'TOSHKENT DO\'KONI'.padStart(32).padEnd(width - 2) + '*\n';
  receipt += '*'.repeat(width) + '\n';
  receipt += separator + '\n';
  
  // Date and time
  receipt += padLine('Sana: ' + data.date, 'Vaqt: ' + data.time) + '\n';
  receipt += padLine('Buyurtma: ' + data.receiptNumber, '') + '\n';
  receipt += padLine('Kassir: ' + data.cashier, '') + '\n';
  receipt += padLine('Mijoz: ' + trData(data.customer.name), '') + '\n';
  if (data.customer.phone) {
    receipt += padLine('Tel: ' + data.customer.phone, '') + '\n';
  }
  
  // Previous balance if exists
  if (data.customer.previousBalance !== undefined && data.customer.previousBalance !== 0) {
    receipt += dashed + '\n';
    receipt += padLine('Oldingi balans:', data.customer.previousBalance.toLocaleString() + ' so\'m') + '\n';
    if (data.customer.previousDebtDays) {
      receipt += padLine('Qarz muddati:', data.customer.previousDebtDays + ' kun o\'tgan') + '\n';
    }
  }
  
  // Items header
  receipt += dashed + '\n';
  receipt += 'Mahsulot            Soni     Narx      Jami\n';
  receipt += dashed + '\n';
  
  // Items
  receipt += itemsText + '\n';
  receipt += dashed + '\n';
  
  // Totals
  receipt += padLine('JAMI SUMMA:', data.total.toLocaleString() + ' so\'m') + '\n';
  
  // Payments
  if (paymentsText) {
    receipt += dashed + '\n';
    receipt += 'TO\'LOV:\n';
    receipt += paymentsText + '\n';
  }
  
  receipt += dashed + '\n';
  receipt += padLine('To\'langan:', data.totalPaid.toLocaleString() + ' so\'m') + '\n';
  
  if (data.debt > 0) {
    receipt += padLine('Qarz:', data.debt.toLocaleString() + ' so\'m') + '\n';
  }
  
  // Driver info
  if (data.driver) {
    receipt += separator + '\n';
    receipt += 'YETKAZIB BERISH:\n';
    receipt += padLine('Haydovchi:', trData(data.driver.name)) + '\n';
    if (data.driver.phone) {
      receipt += padLine('Tel:', data.driver.phone) + '\n';
    }
    receipt += dashed + '\n';
    receipt += padLine('Zavod to\'laydi:', data.driver.factoryShare.toLocaleString() + ' so\'m') + '\n';
    receipt += padLine('Mijoz to\'laydi:', data.driver.customerShare.toLocaleString() + ' so\'m') + '\n';
  }
  
  // New balance
  if (data.customer.newBalance !== undefined) {
    receipt += separator + '\n';
    receipt += padLine('YANGI BALANS:', data.customer.newBalance.toLocaleString() + ' so\'m') + '\n';
    if (data.customer.paymentDueDate && data.customer.newBalance < 0) {
      receipt += padLine('To\'lash muddati:', data.customer.paymentDueDate) + '\n';
    }
  }
  
  // Footer
  receipt += separator + '\n';
  receipt += '*'.repeat(width) + '\n';
  receipt += 'XARIDINGIZ UCHUN RAHMAT!'.padStart(36).padEnd(width) + '\n';
  receipt += 'Qaytib kelishingizni kutamiz!'.padStart(39).padEnd(width) + '\n';
  receipt += '*'.repeat(width) + '\n';
  receipt += separator + '\n';
  receipt += padLine('ID: ' + data.saleId, '') + '\n';
  receipt += padLine(new Date().toLocaleString('uz-UZ'), '') + '\n';
  receipt += separator + '\n';
  
  return receipt;
}

// Chek ma'lumotlarini tayyorlash
export function prepareSaleReceipt(
  sale: any,
  customer: any,
  user: any,
  driver?: any,
  exchangeRate: number = 12500
): ReceiptData {
  const now = new Date();
  const date = now.toLocaleDateString('uz-UZ');
  const time = now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  
  // Qarz to'lash muddatini hisoblash (10 kun)
  const paymentDueDate = new Date(now);
  paymentDueDate.setDate(paymentDueDate.getDate() + 10);
  const dueDateStr = paymentDueDate.toLocaleDateString('uz-UZ');
  
  // Eski qarz necha kun bo'lganini hisoblash
  let previousDebtDays = 0;
  if (customer?.lastPurchase) {
    const lastPurchaseDate = new Date(customer.lastPurchase);
    const daysDiff = Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    previousDebtDays = daysDiff;
  }
  
  // Ko'chaga mijoz uchun qayta ishlash
  const isKocha = sale.isKocha || false;
  const kochaName = sale.manualCustomerName || '';
  const kochaPhone = sale.manualCustomerPhone || '';
  
  // Mijoz nomini aniqlash
  let displayName = 'Mijoz';
  if (isKocha) {
    displayName = kochaName || "Ko'chaga";
  } else if (customer?.name) {
    displayName = customer.name;
  }
  
  // Mijoz telefonini aniqlash
  const displayPhone = isKocha ? kochaPhone : customer?.phone;
  const currency = (sale.currency || 'USD').toUpperCase();
  const isUZS = currency === 'UZS';
  // rate variable used for future currency conversion features
  
  const items = sale.items.map((item: any) => {
    const isPiece = item.saleType === 'piece';
    const unit = isPiece ? 'dona' : 'qop';
    // Product modeli `unitsPerBag` ishlatadi (`piecesPerBag` yo'q)
    // Server items: item.product.unitsPerBag | Forma items: item.unitsPerBag
    const piecesPerBag: number | null =
      Number(item.product?.unitsPerBag || item.unitsPerBag) || null;
    const pricePerBagNum = parseFloat(item.pricePerBag) || 0;
    const pricePerPieceNum = parseFloat(item.pricePerPiece) || 0;
    const unitsNum = piecesPerBag || 1;
    const pricePerUnit = isPiece
      ? (pricePerPieceNum || (pricePerBagNum / unitsNum))
      : pricePerBagNum;
    const pricePerPiece = isPiece
      ? pricePerUnit
      : (piecesPerBag ? pricePerBagNum / piecesPerBag : undefined);
    return {
      name: item.productName || item.product?.name || 'Mahsulot',
      quantity: Number(item.quantity) || 0,
      unit,
      piecesPerBag,
      pricePerUnit,
      pricePerPiece,
      subtotal: parseFloat(item.subtotal) || 0,
    };
  });

  const subtotal = sale.totalAmount;
  const taxRate = 0;
  const tax = 0;
  const total = subtotal;

  // To'lovlarni tayyorlash
  const payments: any = {};
  if (sale.paymentDetails) {
    const details = typeof sale.paymentDetails === 'string'
      ? JSON.parse(sale.paymentDetails)
      : sale.paymentDetails;

    if (details.uzs) payments.uzs = parseFloat(details.uzs);
    if (details.usd) payments.usd = parseFloat(details.usd) * exchangeRate;
    if (details.click) payments.card = parseFloat(details.click);
  }

  const totalPaid = sale.paidAmount;
  const debt = Math.max(0, sale.debtAmount || 0);
  
  const previousDebtUZS = customer?.debtUZS || 0;
  const previousDebtUSD = customer?.debtUSD || 0;
  
  // Jami qarzni hisoblash (valyutaga qarab)
  let totalDebtUZS = previousDebtUZS;
  let totalDebtUSD = previousDebtUSD;

  if (isUZS) {
    totalDebtUZS = previousDebtUZS + (sale.debtAmount > 0 ? sale.debtAmount : 0);
  } else {
    totalDebtUSD = previousDebtUSD + (sale.debtAmount > 0 ? sale.debtAmount : 0);
  }
  
  // Haydovchi ma'lumotlari
  const driverInfo = driver ? {
    name: driver.name || 'Haydovchi',
    phone: driver.phone,
    factoryShare: (driver.factoryShare || 0) * exchangeRate,
    customerShare: (driver.customerShare || 0) * exchangeRate
  } : undefined;
  
  return {
    saleId: sale.id,
    receiptNumber: sale.receiptNumber != null
      ? String(sale.receiptNumber).padStart(4, '0')
      : sale.id.slice(0, 8).toUpperCase(),
    date,
    time,
    cashier: user?.name || 'Kassir',
    currency: currency === 'UZS' ? 'UZS' : 'USD',
    exchangeRate,  // Dollar kursi
    customer: {
      name: displayName,
      phone: displayPhone || undefined,
      address: isKocha ? undefined : customer?.address,
      previousBalanceUZS: previousDebtUZS !== 0 ? previousDebtUZS : undefined,
      previousBalanceUSD: previousDebtUSD !== 0 ? previousDebtUSD : undefined,
      totalDebtUZS: totalDebtUZS !== 0 ? totalDebtUZS : undefined,
      totalDebtUSD: totalDebtUSD !== 0 ? totalDebtUSD : undefined,
      previousDebtDays: (previousDebtUZS > 0 || previousDebtUSD > 0) ? previousDebtDays : undefined,
      paymentDueDate: debt > 0 ? dueDateStr : undefined
    },
    driver: driverInfo,
    items,
    subtotal,
    tax,
    taxRate,
    total,
    payments,
    totalPaid,
    debt,
    companyInfo: {
      name: 'LUX PET PLAST',
      address: 'Toshkent sh., Chilonzor t.',
      phone: '+998 90 123 45 67',
      inn: '123456789'
    }
  };
}
