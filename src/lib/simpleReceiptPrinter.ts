// Haqiqiy chekga o'xshash dizayn - barcha shakllarsiz
export interface SimpleReceiptData {
  saleId: string;
  receiptNumber: string;
  date: string;
  time: string;
  cashier: string;
  currency: string;
  exchangeRate?: number;
  customer: {
    name: string;
    phone?: string;
    address?: string;
    previousBalanceUZS?: number;
    previousBalanceUSD?: number;
    newBalanceUZS?: number;
    newBalanceUSD?: number;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    piecesPerBag?: number;
    pricePerBag: number;
    pricePerPiece: number;
    pricePerUnit?: number;
    subtotal: number;
    warehouse?: string;
  }>;
  subtotal: number;
  total: number;
  payments: {
    uzs?: number;
    usd?: number;
    click?: number;
  };
  totalPaid: number;
  debt: number;
  companyInfo: {
    name: string;
    address: string;
    phone: string;
  }
}

// Convert function to maintain compatibility
export function convertToSimpleFormat(data: any, exchangeRate: number): SimpleReceiptData {
  return {
    saleId: data.saleId || 'N/A',
    receiptNumber: data.receiptNumber || data.saleId?.slice(0, 8).toUpperCase() || 'N/A',
    date: data.date,
    time: data.time,
    cashier: data.cashier,
    currency: data.currency || 'USD',
    exchangeRate: data.exchangeRate || exchangeRate,
    customer: data.customer,
    items: data.items,
    subtotal: data.subtotal,
    total: data.total,
    payments: data.payments,
    totalPaid: data.totalPaid,
    debt: data.debt,
    companyInfo: data.companyInfo
  };
}

export function convertToFormat(data: any, exchangeRate: number): SimpleReceiptData {
  return convertToSimpleFormat(data, exchangeRate);
}

export function generateSimpleReceiptHTML(data: SimpleReceiptData): string {
  const sym = data.currency?.toUpperCase() === 'USD' ? '$' : "so'm";

  const itemsHTML = data.items.map((item) => {
    const isPiece = item.unit === 'dona';
    const bags = isPiece
      ? (item.quantity / (item.piecesPerBag || 2000)).toFixed(2)
      : item.quantity;
    const price = isPiece ? (item.pricePerPiece || 0) : (item.pricePerBag || 0);
    return `<tr>
      <td style="padding:4px 4px;border:1px solid #000;font-size:12px;">${item.name}</td>
      <td style="padding:4px 4px;border:1px solid #000;font-size:12px;text-align:center;">${bags}</td>
      <td style="padding:4px 4px;border:1px solid #000;font-size:12px;text-align:right;">${price.toLocaleString()}</td>
      <td style="padding:4px 4px;border:1px solid #000;font-size:12px;text-align:right;font-weight:bold;">${item.subtotal.toLocaleString()} ${sym}</td>
    </tr>`;
  }).join('');

  const paymentsHTML = Object.entries(data.payments)
    .filter(([, amount]) => amount && amount > 0)
    .map(([type, amount]) => {
      const label = type === 'uzs' ? 'Naqd (so\'m)' : type === 'usd' ? 'Naqd ($)' : 'Click';
      const s = type === 'usd' ? '$' : "so'm";
      return `<tr><td style="padding:3px 0;font-size:12px;">${label}:</td><td style="padding:3px 0;font-size:12px;text-align:right;">${(amount as number).toLocaleString()} ${s}</td></tr>`;
    }).join('');

  const prevDebtUZS = data.customer.previousBalanceUZS || 0;
  const prevDebtUSD = data.customer.previousBalanceUSD || 0;
  const newDebtUZS  = data.customer.newBalanceUZS  || 0;
  const newDebtUSD  = data.customer.newBalanceUSD  || 0;

  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Chek #${data.receiptNumber}</title>
<style>
  @page { size: 80mm auto; margin: 3mm 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.4;
    width: 74mm;
    margin: 0 auto;
    color: #000;
    background: #fff;
  }
  .ln  { border-bottom: 1px dashed #000; margin: 5px 0; }
  .ln2 { border-bottom: 2px solid #000; margin: 5px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; }
  .bold { font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  th { border: 1px solid #000; padding: 4px 3px; font-size: 11px; text-align: center; background: #000; color: #fff; }
  td { border: 1px solid #000; padding: 4px 3px; font-size: 12px; vertical-align: top; }
  tr:nth-child(even) td { background: #f5f5f5; }
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:5px;">
    <div style="font-size:16px;font-weight:bold;letter-spacing:1px;">LUX PET PLAST</div>
    <div style="font-size:10px;">Buxoro vil., Vobkent tumani</div>
    <div style="font-size:10px;">+998 91 414 44 58 | +998 91 920 07 00</div>
    <div style="font-size:11px;font-weight:bold;margin-top:3px;">SOTUV CHEKI #${data.receiptNumber}</div>
  </div>
  <div class="ln2"></div>

  <div class="row"><span>Mijoz:</span><span class="bold">${data.customer.name}</span></div>
  ${data.customer.phone ? `<div class="row"><span>Tel:</span><span>${data.customer.phone}</span></div>` : ''}
  <div class="row"><span>Sana:</span><span>${data.date} ${data.time}</span></div>
  <div class="row"><span>Kassir:</span><span>${data.cashier}</span></div>
  ${(prevDebtUZS > 0 || prevDebtUSD > 0) ? `
  <div class="ln"></div>
  ${prevDebtUZS > 0 ? `<div class="row" style="color:#c00"><span>Oldingi qarz (so'm):</span><span>${prevDebtUZS.toLocaleString()} so'm</span></div>` : ''}
  ${prevDebtUSD > 0 ? `<div class="row" style="color:#c00"><span>Oldingi qarz ($):</span><span>$${prevDebtUSD.toLocaleString()}</span></div>` : ''}
  ` : ''}
  <div class="ln2"></div>

  <table style="margin-bottom:4px;">
    <thead><tr>
      <th style="width:40%;text-align:left;">Mahsulot</th>
      <th style="width:11%;">Qop</th>
      <th style="width:22%;text-align:right;">Narx</th>
      <th style="width:27%;text-align:right;">Jami</th>
    </tr></thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <div class="ln2"></div>
  <div class="row bold" style="font-size:14px;">
    <span>JAMI:</span><span>${data.total.toLocaleString()} ${sym}</span>
  </div>
  <div class="ln"></div>
  <table style="width:100%;border:none;">
    <tbody>${paymentsHTML}
    <tr style="border-top:1px dashed #000;">
      <td style="border:none;padding:3px 0;font-size:12px;font-weight:bold;">To'langan:</td>
      <td style="border:none;padding:3px 0;font-size:12px;font-weight:bold;text-align:right;">${data.totalPaid.toLocaleString()} ${sym}</td>
    </tr>
    </tbody>
  </table>
  ${(newDebtUZS > 0 || newDebtUSD > 0) ? `
  <div class="ln"></div>
  ${newDebtUZS > 0 ? `<div class="row bold" style="color:#c00;font-size:13px;"><span>Qarz (so'm):</span><span>${newDebtUZS.toLocaleString()} so'm</span></div>` : ''}
  ${newDebtUSD > 0 ? `<div class="row bold" style="color:#c00;font-size:13px;"><span>Qarz ($):</span><span>$${newDebtUSD.toLocaleString()}</span></div>` : ''}
  ` : `<div class="row" style="color:green;font-size:12px;"><span>Qarz:</span><span>0</span></div>`}
  <div class="ln2"></div>
  <div style="text-align:center;font-size:11px;margin-top:3px;font-weight:bold;">Xaridingiz uchun rahmat!</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;
}

export function generateDeliveryReceiptHTML(data: SimpleReceiptData): string {
  const sym = data.currency?.toUpperCase() === 'USD' ? '$' : "so'm";
  const itemsHTML = data.items.map((item, i) => `
    <tr>
      <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-size:11px;">${i + 1}</td>
      <td style="border:1px solid #000;padding:4px 3px;font-size:12px;">${item.name}</td>
      <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-size:12px;">${item.quantity}</td>
      <td style="border:1px solid #000;padding:4px 3px;text-align:right;font-size:12px;font-weight:bold;">${item.subtotal.toLocaleString()} ${sym}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8">
<title>Yuk Xati #${data.receiptNumber}</title>
<style>
  @page { size: 80mm auto; margin: 3mm 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4; width: 74mm; margin: 0 auto; color: #000; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 12px; }
  .ln { border-bottom: 1px dashed #000; margin: 5px 0; }
  .ln2 { border-bottom: 2px solid #000; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { border: 1px solid #000; padding: 4px 3px; font-size: 11px; background: #000; color: #fff; }
</style>
</head>
<body>
  <div style="text-align:center;margin-bottom:5px;">
    <div style="font-size:16px;font-weight:bold;">LUX PET PLAST</div>
    <div style="font-size:10px;">Buxoro vil., Vobkent | +998 91 414 44 58</div>
    <div style="font-size:11px;font-weight:bold;margin-top:2px;">YUK XATI #${data.receiptNumber}</div>
  </div>
  <div class="ln2"></div>
  <div class="row"><span>Mijoz:</span><span style="font-weight:bold;">${data.customer.name}</span></div>
  <div class="row"><span>Sana:</span><span>${data.date} ${data.time}</span></div>
  <div class="row"><span>Kassir:</span><span>${data.cashier}</span></div>
  <div class="ln2"></div>
  <table>
    <thead><tr>
      <th style="width:8%;">№</th>
      <th style="width:44%;text-align:left;">Mahsulot</th>
      <th style="width:16%;">Qop</th>
      <th style="width:32%;text-align:right;">Jami</th>
    </tr></thead>
    <tbody>${itemsHTML}</tbody>
  </table>
  <div class="ln2"></div>
  <div class="row" style="font-weight:bold;font-size:13px;">
    <span>JAMI:</span><span>${data.total.toLocaleString()} ${sym}</span>
  </div>
  <div class="ln"></div>
  <div style="text-align:center;font-size:11px;font-weight:bold;margin-top:3px;">Xaridingiz uchun rahmat!</div>
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 300); };
</script>
</body>
</html>`;
}
