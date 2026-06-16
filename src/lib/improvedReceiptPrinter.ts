// Improved receipt printer with better design and accurate calculations
import { trData } from './transliterator';

export interface ImprovedReceiptData {
  saleId: string;
  receiptNumber: string;
  date: string;
  time: string;
  cashier: string;
  currency: string; // 'USD' or 'UZS'
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
    unit: string; // 'qop' or 'dona'
    piecesPerBag?: number;
    pricePerBag: number;
    pricePerPiece: number;
    subtotal: number;
    warehouse?: string; // 'preform', 'krishka', 'ruchka', 'other'
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
  };
}

export function generateImprovedReceiptHTML(data: ImprovedReceiptData): string {
  const currencySymbol = data.currency?.toUpperCase() === 'USD' ? '$' : 'so\'m';
  const isUSD = data.currency?.toUpperCase() === 'USD';
  
  // Group items by warehouse type for better organization
  const groupedItems = data.items.reduce((groups, item) => {
    const warehouse = item.warehouse || 'other';
    if (!groups[warehouse]) groups[warehouse] = [];
    groups[warehouse].push(item);
    return groups;
  }, {} as Record<string, typeof data.items>);

  // Generate HTML for grouped items
  const generateItemsHTML = (items: typeof data.items) => {
    return items.map((item, idx) => {
      const isPieceSale = item.unit === 'dona';
      const bags = isPieceSale ? (item.quantity / (item.piecesPerBag || 2000)).toFixed(2) : item.quantity;
      const pieces = isPieceSale ? item.quantity : item.quantity * (item.piecesPerBag || 2000);
      const pricePerUnit = isPieceSale ? item.pricePerPiece : item.pricePerBag;
      
      return `
        <tr style="background: ${idx % 2 === 0 ? '#fafafa' : '#ffffff'};">
          <td style="text-align: center; font-weight: bold; color: #374151; padding: 4px; font-size: 8px;">${idx + 1}</td>
          <td style="padding: 4px;">
            <div style="font-weight: 600; color: #111827; font-size: 8px; line-height: 1.2;">${trData(item.name)}</div>
            <div style="font-size: 7px; color: #6b7280; margin-top: 1px;">
              ${isPieceSale ?
                `${pieces.toLocaleString()} dona × ${pricePerUnit.toLocaleString()} ${currencySymbol}` :
                `${bags} qop × ${pricePerUnit.toLocaleString()} ${currencySymbol}`
              }
            </div>
            ${item.piecesPerBag ? `<div style="font-size: 6px; color: #9ca3af;">${item.piecesPerBag} dona/qop</div>` : ''}
          </td>
          <td style="text-align: center; font-weight: 500; color: #374151; padding: 4px; font-size: 8px;">
            ${isPieceSale ? bags : item.quantity}
          </td>
          <td style="text-align: right; font-weight: bold; color: #dc2626; padding: 4px; font-size: 8px;">
            ${item.subtotal.toLocaleString()} ${currencySymbol}
          </td>
        </tr>
      `;
    }).join('');
  };

  // Generate all items HTML
  let allItemsHTML = '';
  let itemCounter = 1;

  if (groupedItems.preform && groupedItems.preform.length > 0) {
    allItemsHTML += generateItemsHTML(groupedItems.preform);
    itemCounter += groupedItems.preform.length;
  }

  if (groupedItems.krishka && groupedItems.krishka.length > 0) {
    allItemsHTML += generateItemsHTML(groupedItems.krishka);
    itemCounter += groupedItems.krishka.length;
  }

  if (groupedItems.ruchka && groupedItems.ruchka.length > 0) {
    allItemsHTML += generateItemsHTML(groupedItems.ruchka);
    itemCounter += groupedItems.ruchka.length;
  }

  if (groupedItems.other && groupedItems.other.length > 0) {
    allItemsHTML += generateItemsHTML(groupedItems.other);
  }

  // Generate payment breakdown
  const paymentsHTML = Object.entries(data.payments)
    .filter(([_, amount]) => amount && amount > 0)
    .map(([type, amount]) => {
      const label = type === 'uzs' ? 'Naqd UZS' :
                    type === 'usd' ? 'Naqd USD' : 'Click';
      const icon = type === 'uzs' ? 'UZS' :
                   type === 'usd' ? '$' : 'Click';
      const bgColor = type === 'uzs' ? '#dbeafe' :
                      type === 'usd' ? '#fef3c7' : '#f3e8ff';
      const color = type === 'uzs' ? '#1e40af' :
                    type === 'usd' ? '#d97706' : '#7c3aed';
      return `
        <div style="display: flex; justify-content: space-between; padding: 6px 8px; background: ${bgColor}; border: 1px solid ${type === 'uzs' ? '#bfdbfe' : type === 'usd' ? '#fde68a' : '#e9d5ff'}; border-radius: 4px; margin-bottom: 4px;">
          <span style="font-weight: 600; color: ${color}; font-size: 9px;">${icon} ${label}:</span>
          <span style="font-weight: bold; color: ${color}; font-size: 9px;">${amount.toLocaleString()} ${type === 'usd' ? '$' : 'so\'m'}</span>
        </div>
      `;
    }).join('');

  return `
<!DOCTYPE html>
<html lang="uz" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chek #${data.receiptNumber}</title>
    <style>
        @media print {
            @page {
                size: 80mm auto;
                margin: 2mm;
            }
            body {
                margin: 0;
                width: 80mm;
                font-size: 10px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .no-print { display: none !important; }
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: 'Segoe UI', 'Arial Unicode MS', 'DejaVu Sans', 'Tahoma', 'Geneva', 'Verdana', sans-serif;
            font-size: 10px;
            line-height: 1.3;
            width: 80mm;
            margin: 0 auto;
            padding: 4px;
            background: #ffffff;
            color: #111827;
            unicode-bidi: plaintext;
            direction: ltr;
            font-variant-ligatures: none;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .header {
            background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #7c3aed 100%);
            color: white;
            padding: 20px 16px;
            text-align: center;
            border-radius: 16px;
            margin-bottom: 16px;
            box-shadow: 0 12px 40px rgba(14, 165, 233, 0.4);
            position: relative;
            border: 3px solid #0369a1;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
            animation: shimmer 3s infinite;
        }
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .company-name {
            font-size: 18px;
            font-weight: 900;
            margin-bottom: 4px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
            letter-spacing: 1px;
            position: relative;
            z-index: 1;
        }
        .receipt-title {
            font-size: 11px;
            opacity: 0.95;
            margin-bottom: 4px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 1;
        }
        .receipt-number {
            font-size: 12px;
            font-weight: 800;
            background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%);
            padding: 4px 12px;
            border-radius: 8px;
            display: inline-block;
            border: 2px solid rgba(255,255,255,0.4);
            backdrop-filter: blur(10px);
            position: relative;
            z-index: 1;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .customer-info {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #0ea5e9;
            padding: 12px;
            margin: 12px 0;
            border-radius: 10px;
            box-shadow: 0 4px 16px rgba(14, 165, 233, 0.15);
            position: relative;
            overflow: hidden;
        }
        .customer-info::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #0ea5e9 0%, #0284c7 100%);
        }
        .section-title {
            background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
            color: white;
            padding: 8px 12px;
            text-align: center;
            font-weight: 800;
            margin: 12px 0 6px 0;
            font-size: 11px;
            border-radius: 8px;
            border: 2px solid #065f46;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            position: relative;
            overflow: hidden;
        }
        .section-title::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
        }
        .products-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            border: 3px solid #1e293b;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(30, 41, 59, 0.15);
            background: white;
        }
        .products-table th {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%);
            color: white;
            padding: 8px 6px;
            font-weight: 900;
            text-align: center;
            font-size: 9px;
            border: 1px solid #4338ca;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: relative;
        }
        .products-table th::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%);
        }
        .products-table td {
            border: 1px solid #e2e8f0;
            padding: 6px;
            font-size: 9px;
            vertical-align: top;
            transition: background-color 0.3s ease;
        }
        .products-table tr:nth-child(even) td {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        .products-table tr:hover td {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }
        .summary-section {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 3px solid #f59e0b;
            padding: 12px;
            margin: 12px 0;
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(245, 158, 11, 0.2);
            position: relative;
            overflow: hidden;
        }
        .summary-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%);
        }
        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 10px;
            padding: 4px 0;
            border-bottom: 1px solid rgba(245, 158, 11, 0.2);
        }
        .payment-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-top: 6px;
            border-top: 2px solid #f59e0b;
            font-weight: 800;
            font-size: 11px;
        }
        .total-row {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            border: 2px solid #16a34a;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 900;
            color: #166534;
            font-size: 11px;
            box-shadow: 0 4px 12px rgba(22, 163, 74, 0.2);
            position: relative;
            overflow: hidden;
        }
        .total-row::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #16a34a 0%, #22c55e 100%);
        }
        .debt-row {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            border: 2px solid #dc2626;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 900;
            color: #dc2626;
            font-size: 11px;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
            position: relative;
            overflow: hidden;
        }
        .debt-row::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #dc2626 0%, #ef4444 100%);
        }
        .footer {
            text-align: center;
            margin-top: 16px;
            padding: 12px;
            border: 2px solid #6b7280;
            border-radius: 10px;
            font-size: 9px;
            color: #374151;
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            box-shadow: 0 4px 16px rgba(107, 114, 128, 0.15);
            position: relative;
            overflow: hidden;
        }
        .footer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #6b7280 0%, #9ca3af 50%, #6b7280 100%);
        }
        .footer-text {
            font-weight: 600;
            margin-bottom: 4px;
            color: #1f2937;
        }
        .footer-contact {
            font-size: 8px;
            color: #6b7280;
            margin-top: 4px;
        }
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(59, 130, 246, 0.1);
            font-weight: bold;
            pointer-events: none;
            z-index: 1;
        }
        .exchange-rate {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 8px;
            color: #0369a1;
            text-align: center;
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <div style="width: 100%; max-width: 80mm; margin: 0 auto; position: relative;">
        <div class="watermark">LUX PET PLAST</div>
        
        <!-- Logo Section -->
        <div style="text-align: center; padding: 8px 0; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-bottom: 2px solid #0ea5e9;">
            <img src="/logo.png" alt="LUX PET PLAST" style="max-width: 60mm; max-height: 20mm; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div style="display: none; font-size: 14px; font-weight: 900; color: #0ea5e9; letter-spacing: 2px; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">
                LUX PET PLAST
            </div>
        </div>
        
        <!-- Header -->
        <div class="header">
            <div class="company-name">LUX PET PLAST</div>
            <div class="receipt-title">SOTUV CHEKI</div>
            <div class="receipt-number">#${data.receiptNumber}</div>
        </div>
        
        <!-- Customer Info -->
        <div class="customer-info">
            <div style="font-weight: bold; color: #111827; margin-bottom: 6px; font-size: 10px; padding-bottom: 3px;">MIJOZ MA'LUMOTLARI</div>
            <div style="color: #374151; font-size: 8px; line-height: 1.5;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span><strong>Ismi:</strong></span>
                    <span>${trData(data.customer.name)}</span>
                </div>
                ${data.customer.phone ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span><strong>Telefon:</strong></span>
                    <span>${data.customer.phone}</span>
                </div>
                ` : ''}
                ${data.customer.previousBalanceUZS && data.customer.previousBalanceUZS > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #dc2626; font-weight: bold;">
                    <span>Oldingi qarz (UZS):</span>
                    <span>${data.customer.previousBalanceUZS.toLocaleString()} so'm</span>
                </div>
                ` : ''}
                ${data.customer.previousBalanceUSD && data.customer.previousBalanceUSD > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #dc2626; font-weight: bold;">
                    <span>Oldingi qarz (USD):</span>
                    <span>$${data.customer.previousBalanceUSD.toLocaleString()}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px solid #e5e7eb; padding-top: 3px;">
                    <span><strong>Sana:</strong></span>
                    <span>${data.date}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span><strong>Vaqt:</strong></span>
                    <span>${data.time}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span><strong>Kassir:</strong></span>
                    <span>${data.cashier}</span>
                </div>
            </div>
        </div>
    
        <!-- Exchange Rate (if not USD) -->
        ${!isUSD && data.exchangeRate ? `
        <div class="exchange-rate">
            <strong>Kurs:</strong> 1 USD = ${data.exchangeRate.toLocaleString()} so'm
        </div>
        ` : ''}
    
        <!-- Products -->
        <div>
            <div class="section-title">
                MAHSULOTLAR RO'YXATI (${data.items.length} ta)
            </div>
            <table class="products-table">
                <thead>
                    <tr>
                        <th style="width: 30px;">NO</th>
                        <th style="text-align: left;">Mahsulot</th>
                        <th style="width: 40px;">Miqdor</th>
                        <th style="width: 50px;">Jami</th>
                    </tr>
                </thead>
                <tbody>
                    ${allItemsHTML}
                </tbody>
            </table>
        </div>
    
        <!-- Summary -->
        <div class="summary-section">
            <div class="section-title" style="margin-top: 0;">
                HISOB-KITOB
            </div>
            
            <div class="payment-row" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 4px;">
                <span style="font-weight: 600; color: #374151;">Jami summa:</span>
                <span style="font-weight: bold; color: #374151;">${data.total.toLocaleString()} ${currencySymbol}</span>
            </div>
            
            ${paymentsHTML}
            
            <div class="total-row">
                <span>To'langan:</span>
                <span>${data.totalPaid.toLocaleString()} ${currencySymbol}</span>
            </div>
            
            ${data.debt > 0 ? `
            <div class="debt-row">
                <span>Qarz:</span>
                <span>${data.debt.toLocaleString()} ${currencySymbol}</span>
            </div>
            ` : ''}
            
            <!-- New Balance -->
            ${data.customer.newBalanceUZS && data.customer.newBalanceUZS > 0 ? `
            <div class="payment-row" style="background: #fef2f2; border: 1px solid #fecaca; padding: 6px 8px; border-radius: 4px; margin-top: 6px;">
                <span style="font-weight: bold; color: #dc2626;">Yangi qarz (UZS):</span>
                <span style="font-weight: bold; color: #dc2626;">${data.customer.newBalanceUZS.toLocaleString()} so'm</span>
            </div>
            ` : ''}
            ${data.customer.newBalanceUSD && data.customer.newBalanceUSD > 0 ? `
            <div class="payment-row" style="background: #fef2f2; border: 1px solid #fecaca; padding: 6px 8px; border-radius: 4px; margin-top: 6px;">
                <span style="font-weight: bold; color: #dc2626;">Yangi qarz (USD):</span>
                <span style="font-weight: bold; color: #dc2626;">$${data.customer.newBalanceUSD.toLocaleString()}</span>
            </div>
            ` : ''}
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">LUX PET PLAST</div>
            <div class="footer-contact">Buxoro viloyati, Vobkent tumani</div>
            <div class="footer-contact">+998 91 414 44 58 | +998 91 920 07 00</div>
            <div style="font-size: 7px; color: #6b7280; margin-top: 6px; font-style: italic; font-weight: 600;">--- Rahmat sotuvingiz uchun ---</div>
            <div style="font-size: 6px; color: #9ca3af; margin-top: 3px; font-weight: 500;">${new Date().toLocaleString('uz-UZ')}</div>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() { 
                    if (!window.matchMedia('(print)').matches) {
                        window.close(); 
                    }
                }, 1000);
            }, 500);
        };
        
        // Auto-close after printing
        window.addEventListener('afterprint', function() {
            setTimeout(function() {
                window.close();
            }, 500);
        });
    </script>
</body>
</html>
  `;
}

// Improved receipt function with proper Uzbek character support
export function generateUzbekReceiptHTML(data: ImprovedReceiptData): string {
  const currencySymbol = data.currency?.toUpperCase() === 'USD' ? '$' : 'so\'m';
  const isUSD = data.currency?.toUpperCase() === 'USD';
  
  // Helper function to ensure proper Uzbek text encoding
  const encodeUzbekText = (text: string): string => {
    return text
      .replace(/o'/g, 'oʻ')
      .replace(/g'/g, 'gʻ')
      .replace(/O'/g, 'Oʻ')
      .replace(/G'/g, 'Gʻ')
      .replace(/sh/g, 'sh')
      .replace(/ch/g, 'ch')
      .replace(/ng/g, 'ng');
  };
  
  // Group items by warehouse type for better organization
  const groupedItems = data.items.reduce((groups, item) => {
    const warehouse = item.warehouse || 'other';
    if (!groups[warehouse]) groups[warehouse] = [];
    groups[warehouse].push(item);
    return groups;
  }, {} as Record<string, typeof data.items>);

  // Generate HTML for grouped items
  const generateItemsHTML = (items: typeof data.items) => {
    return items.map((item, idx) => {
      const isPieceSale = item.unit === 'dona';
      const bags = isPieceSale ? (item.quantity / (item.piecesPerBag || 2000)).toFixed(2) : item.quantity;
      const pieces = isPieceSale ? item.quantity : item.quantity * (item.piecesPerBag || 2000);
      const pricePerUnit = isPieceSale ? item.pricePerPiece : item.pricePerBag;
      
      return `
        <tr style="background: ${idx % 2 === 0 ? '#fafafa' : '#ffffff'};">
          <td style="text-align: center; font-weight: bold; color: #374151; padding: 4px; font-size: 8px;">${idx + 1}</td>
          <td style="padding: 4px;">
            <div style="font-weight: 600; color: #111827; font-size: 8px; line-height: 1.2;">${encodeUzbekText(trData(item.name))}</div>
            <div style="font-size: 7px; color: #6b7280; margin-top: 1px;">
              ${isPieceSale ? 
                `${pieces.toLocaleString()} dona × ${pricePerUnit.toLocaleString()} ${currencySymbol}` : 
                `${bags} qop × ${pricePerUnit.toLocaleString()} ${currencySymbol}`
              }
            </div>
            ${item.piecesPerBag ? `<div style="font-size: 6px; color: #9ca3af;">${item.piecesPerBag} dona/qop</div>` : ''}
          </td>
          <td style="text-align: center; font-weight: 500; color: #374151; padding: 4px; font-size: 8px;">
            ${isPieceSale ? bags : item.quantity}
          </td>
          <td style="text-align: right; font-weight: bold; color: #dc2626; padding: 4px; font-size: 8px;">
            ${item.subtotal.toLocaleString()} ${currencySymbol}
          </td>
        </tr>
      `;
    }).join('');
  };

  // Generate all items HTML
  let allItemsHTML = '';
  let itemCounter = 1;
  
  if (groupedItems.preform && groupedItems.preform.length > 0) {
    allItemsHTML += generateItemsHTML(groupedItems.preform);
    itemCounter += groupedItems.preform.length;
  }
  
  if (groupedItems.krishka && groupedItems.krishka.length > 0) {
    allItemsHTML += generateItemsHTML(groupedItems.krishka);
    itemCounter += groupedItems.krishka.length;
  }
  
  if (groupedItems.ruchka && groupedItems.ruchka.length > 0) {
    allItemsHTML += generateItemsHTML(groupedItems.ruchka);
    itemCounter += groupedItems.ruchka.length;
  }
  
  if (groupedItems.other && groupedItems.other.length > 0) {
    allItemsHTML += generateItemsHTML(groupedItems.other);
  }

  // Generate payment breakdown
  const paymentsHTML = Object.entries(data.payments)
    .filter(([_, amount]) => amount && amount > 0)
    .map(([type, amount]) => {
      const label = type === 'uzs' ? 'Naqd UZS' : 
                    type === 'usd' ? 'Naqd USD' : 'Click';
      const icon = type === 'uzs' ? 'UZS' : 
                   type === 'usd' ? '$' : 'Click';
      const bgColor = type === 'uzs' ? '#dbeafe' : 
                      type === 'usd' ? '#fef3c7' : '#f3e8ff';
      const color = type === 'uzs' ? '#1e40af' : 
                    type === 'usd' ? '#d97706' : '#7c3aed';
      return `
        <div style="display: flex; justify-content: space-between; padding: 6px 8px; background: ${bgColor}; border: 1px solid ${type === 'uzs' ? '#bfdbfe' : type === 'usd' ? '#fde68a' : '#e9d5ff'}; border-radius: 4px; margin-bottom: 4px;">
          <span style="font-weight: 600; color: ${color}; font-size: 9px;">${icon} ${label}:</span>
          <span style="font-weight: bold; color: ${color}; font-size: 9px;">${amount.toLocaleString()} ${type === 'usd' ? '$' : 'so\'m'}</span>
        </div>
      `;
    }).join('');

  return `
<!DOCTYPE html>
<html lang="uz" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chek #${data.receiptNumber}</title>
    <style>
        @media print {
            @page { 
                size: 80mm auto; 
                margin: 2mm; 
            }
            body { 
                margin: 0; 
                width: 80mm; 
                font-size: 10px; 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .no-print { display: none !important; }
        }
        * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
        }
        body {
            font-family: 'Segoe UI', 'Arial Unicode MS', 'DejaVu Sans', 'Tahoma', 'Geneva', 'Verdana', sans-serif;
            font-size: 10px;
            line-height: 1.3;
            width: 80mm;
            margin: 0 auto;
            padding: 4px;
            background: #ffffff;
            color: #111827;
            unicode-bidi: plaintext;
            direction: ltr;
            font-variant-ligatures: none;
            text-rendering: optimizeLegibility;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #7c3aed 100%);
            color: white;
            padding:16px 12px;
            text-align: center;
            border-radius: 12px;
            margin-bottom: 12px;
            box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
            position: relative;
            border: 3px solid #1e3a8a;
            overflow: hidden;
        }
        .company-name {
            font-size: 18px;
            font-weight: 900;
            margin-bottom: 4px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.4);
            letter-spacing: 1px;
            position: relative;
            z-index: 1;
        }
        .receipt-title {
            font-size: 11px;
            opacity: 0.95;
            margin-bottom: 4px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 1;
        }
        .receipt-number {
            font-size: 12px;
            font-weight: 800;
            background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%);
            padding: 4px 12px;
            border-radius: 8px;
            display: inline-block;
            border: 2px solid rgba(255,255,255,0.4);
            backdrop-filter: blur(10px);
            position: relative;
            z-index: 1;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .customer-info {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #0ea5e9;
            padding: 12px;
            margin: 12px 0;
            border-radius: 10px;
            box-shadow: 0 4px 16px rgba(14, 165, 233, 0.15);
            position: relative;
            overflow: hidden;
        }
        .section-title {
            background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
            color: white;
            padding: 8px 12px;
            text-align: center;
            font-weight: 800;
            margin: 12px 0 6px 0;
            font-size: 11px;
            border-radius: 8px;
            border: 2px solid #065f46;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            position: relative;
            overflow: hidden;
        }
        .products-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            border: 3px solid #1e293b;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(30, 41, 59, 0.15);
            background: white;
        }
        .products-table th {
            background: linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #4338ca 100%);
            color: white;
            padding: 8px 6px;
            font-weight: 900;
            text-align: center;
            font-size: 9px;
            border: 1px solid #4338ca;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: relative;
        }
        .products-table td {
            border: 1px solid #e2e8f0;
            padding: 6px;
            font-size: 9px;
            vertical-align: top;
            transition: background-color 0.3s ease;
        }
        .products-table tr:nth-child(even) td {
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        .products-table tr:hover td {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }
        .summary-section {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 3px solid #f59e0b;
            padding: 12px;
            margin: 12px 0;
            border-radius: 10px;
            box-shadow: 0 8px 24px rgba(245, 158, 11, 0.2);
            position: relative;
            overflow: hidden;
        }
        .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 10px;
            padding: 4px 0;
            border-bottom: 1px solid rgba(245, 158, 11, 0.2);
        }
        .payment-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-top: 6px;
            border-top: 2px solid #f59e0b;
            font-weight: 800;
            font-size: 11px;
        }
        .total-row {
            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
            border: 2px solid #16a34a;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 900;
            color: #166534;
            font-size: 11px;
            box-shadow: 0 4px 12px rgba(22, 163, 74, 0.2);
            position: relative;
            overflow: hidden;
        }
        .debt-row {
            background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
            border: 2px solid #dc2626;
            padding: 8px 12px;
            border-radius: 8px;
            font-weight: 900;
            color: #dc2626;
            font-size: 11px;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
            position: relative;
            overflow: hidden;
        }
        .footer {
            text-align: center;
            margin-top: 16px;
            padding: 12px;
            border: 2px solid #6b7280;
            border-radius: 10px;
            font-size: 9px;
            color: #374151;
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            box-shadow: 0 4px 16px rgba(107, 114, 128, 0.15);
            position: relative;
            overflow: hidden;
        }
        .footer-text {
            font-weight: 600;
            margin-bottom: 4px;
            color: #1f2937;
        }
        .footer-contact {
            font-size: 8px;
            color: #6b7280;
            margin-top: 4px;
        }
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(59, 130, 246, 0.1);
            font-weight: bold;
            pointer-events: none;
            z-index: 1;
        }
        .exchange-rate {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 8px;
            color: #0369a1;
            text-align: center;
            margin: 4px 0;
        }
    </style>
</head>
<body>
    <div style="width: 100%; max-width: 80mm; margin: 0 auto; position: relative;">
        <div class="watermark">LUX PET PLAST</div>
        
        <!-- Logo Section -->
        <div style="text-align: center; padding: 8px 0; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-bottom: 2px solid #0ea5e9;">
            <img src="/logo.png" alt="LUX PET PLAST" style="max-width: 60mm; max-height: 20mm; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div style="display: none; font-size: 14px; font-weight: 900; color: #0ea5e9; letter-spacing: 2px; text-shadow: 1px 1px 2px rgba(0,0,0,0.2);">
                LUX PET PLAST
            </div>
        </div>
        
        <!-- Header -->
        <div class="header">
            <div class="company-name">LUX PET PLAST</div>
            <div class="receipt-title">SOTUV CHEKI</div>
            <div class="receipt-number">#${data.receiptNumber}</div>
        </div>
        
        <!-- Customer Info -->
        <div class="customer-info">
            <div style="font-weight: bold; color: #111827; margin-bottom: 6px; font-size: 10px; padding-bottom: 3px;">${encodeUzbekText('MIJOZ MAʼLUMOTLARI')}</div>
            <div style="color: #374151; font-size: 8px; line-height: 1.5;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span><strong>${encodeUzbekText('Ismi:')}</strong></span>
                    <span>${trData(data.customer.name)}</span>
                </div>
                ${data.customer.phone ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                    <span><strong>${encodeUzbekText('Telefon:')}</strong></span>
                    <span>${data.customer.phone}</span>
                </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; margin-top: 4px; border-top: 1px solid #e5e7eb; padding-top: 3px;">
                    <span><strong>${encodeUzbekText('Sana:')}</strong></span>
                    <span>${data.date}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span><strong>${encodeUzbekText('Vaqt:')}</strong></span>
                    <span>${data.time}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span><strong>${encodeUzbekText('Kassir:')}</strong></span>
                    <span>${data.cashier}</span>
                </div>
            </div>
        </div>
    
        <!-- Exchange Rate (if not USD) -->
        ${!isUSD && data.exchangeRate ? `
        <div class="exchange-rate">
            <strong>${encodeUzbekText('Kurs:')}</strong> 1 USD = ${data.exchangeRate.toLocaleString()} so'm
        </div>
        ` : ''}
    
        <!-- Products -->
        <div>
            <div class="section-title">
                ${encodeUzbekText('MAHSULOTLAR ROʼYXATI')} (${data.items.length} ta)
            </div>
            <table class="products-table">
                <thead>
                    <tr>
                        <th style="width: 30px;">NO</th>
                        <th style="text-align: left;">${encodeUzbekText('Mahsulot')}</th>
                        <th style="width: 40px;">${encodeUzbekText('Miqdor')}</th>
                        <th style="width: 50px;">${encodeUzbekText('Jami')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${allItemsHTML}
                </tbody>
            </table>
        </div>
    
        <!-- Summary -->
        <div class="summary-section">
            <div class="section-title" style="margin-top: 0;">
                ${encodeUzbekText('HISOB-KITOBLAR')}
            </div>
            
            <div class="payment-row" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 6px 8px; border-radius: 4px;">
                <span style="font-weight: 600; color: #374151;">${encodeUzbekText('Jami summa:')}</span>
                <span style="font-weight: bold; color: #374151;">${data.total.toLocaleString()} ${currencySymbol}</span>
            </div>
            
            ${paymentsHTML}
            
            <div class="total-row">
                <span>${encodeUzbekText('Toʼlangan:')}</span>
                <span>${data.totalPaid.toLocaleString()} ${currencySymbol}</span>
            </div>
            
            ${data.debt > 0 ? `
            <div class="debt-row">
                <span>${encodeUzbekText('Qarz:')}</span>
                <span>${data.debt.toLocaleString()} ${currencySymbol}</span>
            </div>
            ` : ''}
            
            <!-- New Balance -->
            ${data.customer.newBalanceUZS && data.customer.newBalanceUZS > 0 ? `
            <div class="payment-row" style="background: #fef2f2; border: 1px solid #fecaca; padding: 6px 8px; border-radius: 4px; margin-top: 6px;">
                <span style="font-weight: bold; color: #dc2626;">${encodeUzbekText('Yangi qarz (UZS):')}</span>
                <span style="font-weight: bold; color: #dc2626;">${data.customer.newBalanceUZS.toLocaleString()} so'm</span>
            </div>
            ` : ''}
            ${data.customer.newBalanceUSD && data.customer.newBalanceUSD > 0 ? `
            <div class="payment-row" style="background: #fef2f2; border: 1px solid #fecaca; padding: 6px 8px; border-radius: 4px; margin-top: 6px;">
                <span style="font-weight: bold; color: #dc2626;">${encodeUzbekText('Yangi qarz (USD):')}</span>
                <span style="font-weight: bold; color: #dc2626;">$${data.customer.newBalanceUSD.toLocaleString()}</span>
            </div>
            ` : ''}
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-text">LUX PET PLAST</div>
            <div class="footer-contact">${encodeUzbekText('Buxoro viloyati, Vobkent tumani')}</div>
            <div class="footer-contact">+998 91 414 44 58 | +998 91 920 07 00</div>
            <div style="font-size: 7px; color: #6b7280; margin-top: 6px; font-style: italic; font-weight: 600;">--- ${encodeUzbekText('Rahmat sotuvingiz uchun')} ---</div>
            <div style="font-size: 6px; color: #9ca3af; margin-top: 3px; font-weight: 500;">${new Date().toLocaleString('uz-UZ')}</div>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() { 
                    if (!window.matchMedia('(print)').matches) {
                        window.close(); 
                    }
                }, 1000);
            }, 500);
        };
        
        // Auto-close after printing
        window.addEventListener('afterprint', function() {
            setTimeout(function() {
                window.close();
            }, 500);
        });
    </script>
</body>
</html>
  `;
}

// Helper function to convert old receipt data to new format
export function convertToImprovedFormat(oldData: any, exchangeRate: number = 12500): ImprovedReceiptData {
  const isUSD = oldData.currency?.toUpperCase() === 'USD';
  
  return {
    saleId: oldData.saleId || oldData.id,
    receiptNumber: oldData.receiptNumber,
    date: oldData.date,
    time: oldData.time,
    cashier: oldData.cashier,
    currency: oldData.currency || 'USD',
    exchangeRate: isUSD ? exchangeRate : undefined,
    customer: oldData.customer,
    items: oldData.items.map((item: any) => ({
      id: item.id || Math.random().toString(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      piecesPerBag: item.piecesPerBag,
      pricePerBag: item.unit === 'dona' ? item.pricePerUnit * (item.piecesPerBag || 2000) : item.pricePerUnit,
      pricePerPiece: item.pricePerUnit,
      subtotal: item.subtotal,
      warehouse: item.warehouse || 'other'
    })),
    subtotal: oldData.subtotal,
    total: oldData.total,
    payments: oldData.payments,
    totalPaid: oldData.totalPaid,
    debt: oldData.debt,
    companyInfo: oldData.companyInfo
  };
}
