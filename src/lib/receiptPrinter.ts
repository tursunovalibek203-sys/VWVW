// Chek chiqarish utility
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
  const currencySuffix = isUSD ? '' : " so'm";

  const fmtAmt = (n: number) => {
    if (isUSD) return `$${n % 1 === 0 ? n.toLocaleString() : n.toFixed(2)}`;
    return `${Math.round(n).toLocaleString()} so'm`;
  };

  const paymentsRows = Object.entries(data.payments)
    .filter(([, amount]) => amount && amount > 0)
    .map(([type, amount]) => {
      const label = type === 'uzs' ? "Naqd (so'm)" :
                    type === 'usd' ? 'Dollar ($)' : 'Karta';
      const display = type === 'usd'
        ? `$${(amount! / data.exchangeRate).toFixed(2)}`
        : `${Math.round(amount!).toLocaleString()}${currencySuffix}`;
      return `<tr><td class="pay-label">${label}:</td><td class="pay-val">${display}</td></tr>`;
    }).join('');

  const hasDebt = data.debt > 0;
  const hasPrevDebt = (data.customer.previousBalanceUZS ?? 0) > 0 || (data.customer.previousBalanceUSD ?? 0) > 0;
  const hasTotalDebt = (data.customer.totalDebtUZS ?? 0) > 0 || (data.customer.totalDebtUSD ?? 0) > 0;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <title>Chek #${data.receiptNumber}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @media print {
      @page { size: 80mm auto; margin: 0; }
      html, body { margin: 0 !important; padding: 0 !important; width: 80mm !important; }
      .no-print { display: none !important; }
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      line-height: 1.45;
      width: 76mm;
      margin: 0 auto;
      background: #fff;
      color: #000;
      padding: 3mm 2mm 8mm;
    }

    /* ─── LOGO ─── */
    .logo-box {
      padding: 6px 4px 5px;
      border-bottom: 2px solid #000;
    }
    .logo-top {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
    }
    .logo-img {
      height: auto;
      width: auto;
      max-height: 30px;
      max-width: 30px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .logo-box .brand {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .logo-box .brand-sub {
      font-size: 8px;
      letter-spacing: 0.3px;
      margin-top: 1px;
      font-weight: 600;
    }
    .contact-info {
      font-size: 8px;
      margin-top: 4px;
      text-align: center;
    }

    /* ─── DIVIDERS ─── */
    .div-solid  { border-top: 2px solid #000; margin: 5px 0; }
    .div-dash   { border-top: 1px dashed #555; margin: 5px 0; }
    .div-double { border-top: 3px double #000; margin: 5px 0; }

    /* ─── INFO ROWS ─── */
    .info-table { width: 100%; font-size: 10.5px; }
    .info-table td { vertical-align: top; padding: 1px 0; }
    .info-table .lbl { width: 42%; font-weight: 700; white-space: nowrap; }
    .info-table .val { width: 58%; word-break: break-word; }

    /* ─── SECTION TITLE ─── */
    .section-title {
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 3px;
      text-align: center;
      padding: 6px 0;
      background: #000;
      color: #fff;
      margin: 8px 0 4px;
    }

    /* ─── ITEMS TABLE ─── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 9px;
      margin-bottom: 0;
    }
    .items-table th {
      background: #333;
      color: #fff;
      font-weight: 900;
      padding: 4px 2px;
      border: 1px solid #000;
      font-size: 8px;
      letter-spacing: 0.2px;
      text-align: center;
      white-space: normal;
      line-height: 1.2;
    }
    .items-table td {
      padding: 4px 2px;
      border-bottom: 1px solid #ddd;
      vertical-align: top;
    }
    .items-table .col-no      { width: 14px; text-align: center; }
    .items-table .col-name    { width: auto; text-align: left; word-break: break-word; white-space: normal; }
    .items-table .col-qty     { width: 24px; text-align: center; }
    .items-table .col-perbag  { width: 28px; text-align: center; }
    .items-table .col-price   { width: 38px; text-align: right; }
    .items-table .col-total   { width: 42px; text-align: right; font-weight: 700; }

    /* ─── TOTALS ─── */
    .totals-table { width: 100%; font-size: 10.5px; margin: 4px 0; }
    .totals-table td { padding: 1.5px 0; vertical-align: middle; }
    .pay-label { font-weight: 600; }
    .pay-val { text-align: right; font-weight: 700; }

    .grand-total-row td {
      font-size: 15px;
      font-weight: 900;
      padding: 6px 0;
      border-top: 2px solid #000;
      border-bottom: 2px solid #000;
      background: #f0f0f0;
    }
    .paid-row td {
      font-size: 12px;
      font-weight: 900;
      color: #000;
      padding: 3px 0;
    }
    .debt-row td {
      font-size: 12px;
      font-weight: 900;
      color: #c00;
      padding: 3px 0;
      border-top: 1px solid #c00;
    }

    /* ─── DEBT SECTION ─── */
    .debt-section {
      border: 2px solid #c00;
      margin: 8px 0;
      padding: 6px;
      background: #fff0f0;
    }
    .debt-section .title {
      font-weight: 900;
      font-size: 11px;
      text-align: center;
      letter-spacing: 1px;
      color: #c00;
      border-bottom: 1px dashed #c00;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .debt-section table { width: 100%; font-size: 10px; }
    .debt-section td { padding: 2px 0; }
    .debt-section .d-lbl { font-weight: 600; }
    .debt-section .d-val { text-align: right; font-weight: 700; color: #c00; }
    .debt-section .d-date { color: #c00; font-size: 9px; }

    /* ─── DRIVER ─── */
    .driver-section {
      border: 1px solid #000;
      margin: 6px 0;
      padding: 6px;
      background: #f9f9f9;
    }
    .driver-section .title {
      font-weight: 900;
      text-align: center;
      font-size: 11px;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
      letter-spacing: 1px;
    }

    /* ─── FOOTER ─── */
    .footer {
      text-align: center;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 3px double #000;
    }
    .footer .thanks {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    .footer .sub { font-size: 9.5px; margin-top: 2px; }
    .footer .brand-footer {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 3px;
      margin-top: 8px;
    }
    .footer .receipt-id { font-size: 8px; color: #666; margin-top: 6px; }
  </style>
</head>
<body>
  <!-- ═══ LOGO ═══ -->
  <div class="logo-box">
    <div class="logo-top">
      <img src="/logo.jpg" alt="LUX PET PLAST" class="logo-img" onerror="this.style.display='none'">
      <div>
        <div class="brand">LUX PET PLAST</div>
        <div class="brand-sub">Производство ПЭТ преформ</div>
      </div>
    </div>
    <div class="contact-info">
      <div>Buxoro viloyati, Vobkent tumani</div>
      <div>Tel: +998 91 414 44 58 | +998 91 920 07 00</div>
    </div>
  </div>

  <!-- ═══ CHEK SARLAVHASI ═══ -->
  <div class="section-title">SAVDO CHEKI</div>

  <div style="margin: 5px 0;">
    <table class="info-table">
      <tr><td class="lbl">Chek #:</td><td class="val"><b>${data.receiptNumber}</b></td></tr>
      <tr><td class="lbl">Sana:</td><td class="val">${data.date}</td></tr>
      <tr><td class="lbl">Vaqt:</td><td class="val">${data.time}</td></tr>
      <tr><td class="lbl">Kassir:</td><td class="val">${data.cashier}</td></tr>
    </table>
  </div>

  <div class="div-dash"></div>

  <!-- ═══ MIJOZ ═══ -->
  <table class="info-table">
    <tr><td class="lbl">Mijoz:</td><td class="val"><b>${data.customer.name}</b></td></tr>
    ${data.customer.phone ? `<tr><td class="lbl">Tel:</td><td class="val">${data.customer.phone}</td></tr>` : ''}
  </table>

  ${hasPrevDebt ? `
  <div class="div-dash"></div>
  <div style="font-size:9.5px; color:#c00;">
    <div style="font-weight:900; margin-bottom:2px;">OLDINGI QARZ:</div>
    ${(data.customer.previousBalanceUZS ?? 0) > 0 ? `<div>${data.customer.previousBalanceUZS!.toLocaleString()} so'm</div>` : ''}
    ${(data.customer.previousBalanceUSD ?? 0) > 0 ? `<div>$${data.customer.previousBalanceUSD!.toLocaleString()}</div>` : ''}
    ${data.customer.previousDebtDays ? `<div style="font-size:8.5px;">${data.customer.previousDebtDays} kun avvalgi qarz</div>` : ''}
  </div>
  ` : ''}

  <!-- ═══ MAHSULOTLAR ═══ -->
  <div class="section-title">MAHSULOTLAR</div>
  <table class="items-table">
    <thead>
      <tr>
        <th class="col-no">#</th>
        <th class="col-name" style="text-align:left;">Mahsulot</th>
        <th class="col-qty">Qop</th>
        <th class="col-perbag">1 qopda dona</th>
        <th class="col-price">1 dona narxi</th>
        <th class="col-total">Jami</th>
      </tr>
    </thead>
    <tbody>
      ${data.items.map((item, i) => {
        const ppb = item.piecesPerBag || 1;
        const donaNarxi = item.pricePerPiece ?? (item.pricePerUnit / ppb);
        const fmtPrice = (n: number) => isUSD
          ? `$${n % 1 === 0 ? n.toLocaleString() : n.toFixed(3).replace(/\.?0+$/, '')}`
          : `${Math.round(n).toLocaleString()}`;
        return `
      <tr>
        <td class="col-no">${i + 1}</td>
        <td class="col-name">${item.name}</td>
        <td class="col-qty">${item.quantity}</td>
        <td class="col-perbag">${item.piecesPerBag ?? '—'}</td>
        <td class="col-price">${fmtPrice(donaNarxi)}</td>
        <td class="col-total">${fmtPrice(item.subtotal)}</td>
      </tr>`;
      }).join('')}
    </tbody>
  </table>

  <!-- ═══ SUMMA ═══ -->
  <table class="totals-table" style="margin-top:6px;">
    <tr class="grand-total-row">
      <td class="pay-label">JAMI SUMMA:</td>
      <td class="pay-val">${fmtAmt(data.total)}</td>
    </tr>
  </table>

  <div class="div-dash" style="margin:4px 0;"></div>

  <div style="font-size:9.5px; font-weight:700; margin-bottom:2px;">TO'LOV:</div>
  <table class="totals-table">
    ${paymentsRows}
    <tr class="paid-row">
      <td class="pay-label">TO'LANDI:</td>
      <td class="pay-val">${fmtAmt(data.totalPaid)}</td>
    </tr>
    ${hasDebt ? `
    <tr class="debt-row">
      <td class="pay-label">QARZ:</td>
      <td class="pay-val">${fmtAmt(data.debt)}</td>
    </tr>
    ` : ''}
  </table>

  <!-- ═══ QARZ HOLATI ═══ -->
  ${hasTotalDebt ? `
  <div class="debt-section">
    <div class="title">QARZ HOLATI</div>
    <table>
      ${(data.customer.totalDebtUZS ?? 0) > 0 ? `<tr><td class="d-lbl">Jami qarz (so'm):</td><td class="d-val">${data.customer.totalDebtUZS!.toLocaleString()} so'm</td></tr>` : ''}
      ${(data.customer.totalDebtUSD ?? 0) > 0 ? `<tr><td class="d-lbl">Jami qarz ($):</td><td class="d-val">$${data.customer.totalDebtUSD!.toLocaleString()}</td></tr>` : ''}
      ${data.customer.paymentDueDate ? `<tr><td colspan="2" class="d-date" style="padding-top:3px;border-top:1px dashed #c00;margin-top:3px;">Muddat: ${data.customer.paymentDueDate} gacha to'lang!</td></tr>` : ''}
    </table>
  </div>
  ` : ''}

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 800);
      }, 400);
    };
  </script>
</body>
</html>`;
}

export function generateDeliveryStatementHTML(data: ReceiptData): string {
  const itemsHTML = data.items.map(item => `
    <tr>
      <td>${item.name}</td>
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
            <div class="info-value">${data.customer.name}</div>
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
            <span>${data.driver.name}</span>
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

// 80mm (8cm) thermal qog'oz uchun Yuk va Balans Xati
export function generateDeliveryStatementThermalHTML(data: ReceiptData): string {
  const totalBags = data.items.reduce((sum, item) => sum + item.quantity, 0);

  const itemsHTML = data.items.map((item, index) => `
    <tr class="item-row">
      <td class="col-no">${index + 1}</td>
      <td class="col-name">${item.name}</td>
      <td class="col-qty">${item.quantity}</td>
      <td class="col-perbag">${item.piecesPerBag || '-'}</td>
      <td class="col-price">${item.pricePerUnit.toLocaleString()}</td>
      <td class="col-total">${item.subtotal.toLocaleString()}</td>
    </tr>
  `).join('');

  // Mijoz qarzini formatlash
  const hasUZSDebt = (data.customer.totalDebtUZS || 0) > 0;
  const hasUSDDebt = (data.customer.totalDebtUSD || 0) > 0;
  const hasPrevUZS = (data.customer.previousBalanceUZS || 0) > 0;
  const hasPrevUSD = (data.customer.previousBalanceUSD || 0) > 0;

  return `
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yuk Xati - 80mm</title>
    <style>
        @font-face {
            font-family: 'Inter';
            font-style: normal;
            font-weight: 400;
            src: local('Arial');
        }

        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
        }

        @media print {
            @page {
                size: 80mm auto;
                margin: 0 !important;
            }
            html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 80mm !important;
            }
            .no-print { display: none; }
        }

        body {
            font-family: 'Courier New', 'Courier', ' monospace', 'Arial Black', sans-serif;
            font-size: 11px;
            line-height: 1.5;
            width: 76mm;
            padding: 2mm 2mm 6mm 2mm;
            background: white;
            color: #000;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .container {
      width: 100%;
    }

    /* LOGO */
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

    /* Phone Number - 8 6 5 */
    .phone-header {
      text-align: center;
      font-size: 20px;
      font-weight: 900;
      letter-spacing: 10px;
      padding: 8px 0;
      border-bottom: 2px solid #000;
      margin-bottom: 4px;
      font-family: 'Courier New', monospace;
      text-shadow: 1px 1px 0 #ccc;
      display: none;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
    }

    .brand-name {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: 1px;
      text-transform: uppercase;
      line-height: 1.1;
      margin-bottom: 4px;
      font-family: 'Courier New', 'Arial Black', sans-serif;
    }

    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #000;
      font-family: 'Courier New', monospace;
    }
    .contact-info {
      text-align: center;
      font-size: 9px;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #000;
    }

        /* Document Title */
        .doc-title {
            text-align: center;
            font-weight: 900;
            font-size: 16px;
            margin: 10px 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 8px 0;
            font-family: 'Courier New', 'Arial Black', sans-serif;
            background: #f9f9f9;
        }

        /* Items Table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10px;
        }

        .items-table th {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 6px 3px;
            font-weight: 900;
            text-align: center;
            background: #e0e0e0;
            font-size: 10px;
            font-family: 'Courier New', 'Arial Black', sans-serif;
            letter-spacing: 0.5px;
        }

        .items-table td {
            padding: 5px 3px;
            border-bottom: 1px solid #bbb;
            vertical-align: top;
        }

        .col-no { width: 20px; text-align: center; font-weight: 700; }
        .col-name { width: auto; text-align: left; font-weight: 700; }
        .col-qty { width: 32px; text-align: center; font-weight: 700; }
        .col-perbag { width: 40px; text-align: center; font-size: 9px; font-weight: 600; }
        .col-price { width: 50px; text-align: right; font-weight: 700; }
        .col-total { width: 55px; text-align: right; font-weight: 800; }

        /* Total Row */
        .total-row {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            background: #e0e0e0;
        }

        .total-row td {
            font-weight: 900;
            padding: 6px 3px;
            border-bottom: none;
            font-size: 11px;
        }

        /* Summary Section */
        .summary-section {
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 2px solid #000;
        }

        .summary-line {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 12px;
        }

        .summary-line.grand-total {
            font-weight: 900;
            font-size: 14px;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 6px 0;
            margin-top: 6px;
        }

        /* Debt Section */
        .debt-section {
            margin: 10px 0;
            padding: 8px;
            border: 2px solid #000;
            background: #f5f5f5;
        }

        .debt-title {
            text-align: center;
            font-weight: 900;
            font-size: 14px;
            margin-bottom: 6px;
            padding-bottom: 4px;
            border-bottom: 2px dashed #000;
            font-family: 'Courier New', 'Arial Black', sans-serif;
            letter-spacing: 1px;
        }

        .debt-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 11px;
        }

        .debt-row.prev {
            color: #444;
            font-weight: 600;
        }

        .debt-row.current {
            font-weight: 800;
            color: #d32f2f;
            border-top: 2px solid #000;
            padding-top: 4px;
            margin-top: 4px;
            font-size: 12px;
        }

        /* Info Section - pastda */
        .info-section {
            margin: 12px 0;
            padding-top: 10px;
            border-top: 2px solid #000;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            font-size: 12px;
        }

        .info-label {
            font-weight: 700;
        }

        .info-value {
            font-weight: 800;
        }

        /* Signatures */
        .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-top: 25px;
            padding-top: 20px;
        }

        .sig-line {
            border-top: 2px solid #000;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            padding-top: 5px;
        }

        /* Footer */
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 11px;
            color: #333;
            border-top: 2px solid #000;
            padding-top: 10px;
        }

        .footer-brand {
            font-size: 16px;
            font-weight: 900;
            margin-bottom: 4px;
            font-family: 'Courier New', 'Arial Black', sans-serif;
            letter-spacing: 1px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Logo -->
        <div class="logo-box">
            <img src="/logo.jpg" alt="LUX PET PLAST" class="logo-img" onerror="this.style.display='none'">
            <div class="brand-name">LUX PET PLAST</div>
            <div class="brand-sub">Производство ПЭТ преформ</div>
            <div class="contact-info">
                <div>Buxoro viloyati, Vobkent tumani</div>
                <div>Tel: +998 91 414 44 58 | +998 91 920 07 00</div>
            </div>
        </div>

        <!-- Document Title -->
        <div class="doc-title">YUK XATI № ${data.receiptNumber}</div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th class="col-no">№</th>
                    <th class="col-name">Maxsulot</th>
                    <th class="col-qty">Qop</th>
                    <th class="col-perbag">1 qopda</th>
                    <th class="col-price">Narx</th>
                    <th class="col-total">Jami</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
                <tr class="total-row">
                    <td colspan="2" style="text-align: left; padding-left: 4px;">JAMI:</td>
                    <td style="text-align: center;">${totalBags}</td>
                    <td colspan="2"></td>
                    <td style="text-align: right;">${data.total.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <!-- Summary -->
        <div class="summary-section">
            <div class="summary-line">
                <span>Jami qop:</span>
                <span style="font-weight:700;">${totalBags} ta</span>
            </div>
            <div class="summary-line">
                <span>Jami narx:</span>
                <span style="font-weight:700;">${data.total.toLocaleString()} so'm</span>
            </div>
            <div class="summary-line">
                <span>To'langan:</span>
                <span style="font-weight:700;">${data.totalPaid.toLocaleString()} so'm</span>
            </div>
            ${data.debt > 0 ? `
            <div class="summary-line" style="color:#d32f2f;">
                <span style="font-weight:700;">Ushbu yukdan qarz:</span>
                <span style="font-weight:900;">${data.debt.toLocaleString()} so'm</span>
            </div>
            ` : ''}
        </div>

        <!-- Customer Debt -->
        ${(hasPrevUZS || hasPrevUSD || hasUZSDebt || hasUSDDebt) ? `
        <div class="debt-section">
            <div class="debt-title">MIJOZ QARZI</div>
            ${hasPrevUZS ? `
            <div class="debt-row prev">
                <span>Oldingi qarz (so'm):</span>
                <span>${data.customer.previousBalanceUZS?.toLocaleString()} so'm</span>
            </div>
            ` : ''}
            ${hasPrevUSD ? `
            <div class="debt-row prev">
                <span>Oldingi qarz ($):</span>
                <span>$${data.customer.previousBalanceUSD?.toLocaleString()}</span>
            </div>
            ` : ''}
            ${data.customer.previousDebtDays ? `
            <div class="debt-row prev" style="font-size: 8px; color: #666;">
                <span>Qarz sanasi:</span>
                <span>${data.customer.previousDebtDays} kun o'tgan</span>
            </div>
            ` : ''}
            ${(hasUZSDebt || hasUSDDebt) ? `
            <div class="debt-row current">
                <span>JAMI QARZ:</span>
                <span>
                    ${hasUZSDebt ? `<span>${data.customer.totalDebtUZS?.toLocaleString()} so'm</span>` : ''}
                    ${(hasUZSDebt && hasUSDDebt) ? '<br>' : ''}
                    ${hasUSDDebt ? `<span>$${data.customer.totalDebtUSD?.toLocaleString()}</span>` : ''}
                </span>
            </div>
            ` : ''}
        </div>
        ` : ''}

        <!-- Info Section - Pastda -->
        <div class="info-section">
            <div class="info-row">
                <span class="info-label">Mijoz:</span>
                <span class="info-value">${data.customer.name}</span>
            </div>
            ${data.customer.phone ? `
            <div class="info-row">
                <span class="info-label">Telefon:</span>
                <span class="info-value">${data.customer.phone}</span>
            </div>
            ` : ''}
            <div class="info-row">
                <span class="info-label">Kassir:</span>
                <span class="info-value">${data.cashier}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Sana:</span>
                <span class="info-value">${data.date} ${data.time}</span>
            </div>
        </div>

        ${data.driver ? `
        <!-- Driver Info -->
        <div class="info-section" style="border-top: 1px dashed #000; margin-top: 8px;">
            <div class="info-row">
                <span class="info-label">Haydovchi:</span>
                <span class="info-value">${data.driver.name}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Zavod to'laydi:</span>
                <span class="info-value">${data.driver.factoryShare.toLocaleString()} so'm</span>
            </div>
            <div class="info-row">
                <span class="info-label">Mijoz to'laydi:</span>
                <span class="info-value">${data.driver.customerShare.toLocaleString()} so'm</span>
            </div>
        </div>
        ` : ''}

        <!-- Signatures -->
        <div class="signatures">
            <div class="sig-line">Topshirdi (Kassir)</div>
            <div class="sig-line">Qabul qildi (Mijoz)</div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-brand">LUX PET PLAST</div>
            <div>Производство ПЭТ преформ</div>
            <div style="margin-top: 8px; font-size: 12px; font-weight: 700; font-style: italic;">Xaridingiz uchun rahmat!</div>
            <div style="margin-top: 4px; font-size: 7px;">ID: ${data.saleId.slice(0, 8)}</div>
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
        };
    </script>
</body>
</html>
  `;
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
    const name = item.name.substring(0, 20).padEnd(20);
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
  receipt += padLine('Mijoz: ' + data.customer.name, '') + '\n';
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
    receipt += padLine('Haydovchi:', data.driver.name) + '\n';
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
    const piecesPerBag: number | null = item.product?.piecesPerBag || null;
    // Narxlar to'g'ridan-to'g'ri savdo valyutasida ($ yoki so'm) — exchangeRate bilan ko'paytirmaylik
    const pricePerUnit = isPiece
      ? (item.pricePerPiece || (item.pricePerBag / (item.unitsPerBag || 1)))
      : item.pricePerBag;
    const pricePerPiece = isPiece
      ? pricePerUnit
      : (piecesPerBag ? pricePerUnit / piecesPerBag : undefined);
    return {
      name: item.productName || item.product?.name || 'Mahsulot',
      quantity: item.quantity,
      unit,
      piecesPerBag,
      pricePerUnit,
      pricePerPiece,
      subtotal: item.subtotal
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
