import { prisma } from './prisma';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const BACKUP_DIR = path.join(process.cwd(), 'backup', 'excel');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Sheet 1: Ombor — sana | maxsulot | kun boshida | ishlab chiqarildi | sotildi | kun oxirida qoldi */
async function buildOmborSheet(date: Date) {
  const { start, end } = todayRange();

  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });

  // Bugun sotilgan (SaleItem orqali)
  const salesByProduct = await prisma.saleItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    where: { sale: { createdAt: { gte: start, lte: end } } },
  });
  const soldMap = new Map<string, number>();
  for (const s of salesByProduct) {
    if (s.productId) soldMap.set(s.productId, s._sum.quantity ?? 0);
  }
  // To'g'ridan-to'g'ri Sale (SaleItem bo'lmagan)
  const directSales = await prisma.sale.groupBy({
    by: ['productId'], _sum: { quantity: true },
    where: { productId: { not: null }, createdAt: { gte: start, lte: end } },
  });
  for (const s of directSales) {
    if (s.productId && !(soldMap.get(s.productId) ?? 0)) {
      soldMap.set(s.productId, s._sum.quantity ?? 0);
    }
  }

  // Bugun ishlab chiqarilgan (Batch modeli)
  const batchByProduct = await prisma.batch.groupBy({
    by: ['productId'], _sum: { quantity: true },
    where: { productionDate: { gte: start, lte: end } },
  });
  const prodMap = new Map<string, number>();
  for (const b of batchByProduct) {
    prodMap.set(b.productId, b._sum.quantity ?? 0);
  }

  // StockMovement type=PRODUCTION (qo'shimcha manba)
  const smProd = await prisma.stockMovement.groupBy({
    by: ['productId'], _sum: { quantity: true },
    where: { type: 'PRODUCTION', createdAt: { gte: start, lte: end } },
  });
  for (const s of smProd) {
    const existing = prodMap.get(s.productId) ?? 0;
    if (!existing) prodMap.set(s.productId, s._sum.quantity ?? 0);
  }

  const rows = products.map((p) => {
    const sotildi = soldMap.get(p.id) ?? 0;
    const ishlabChiqarildi = prodMap.get(p.id) ?? 0;
    const kunOxirida = p.currentStock;
    // kun_boshida = kun_oxirida + sotildi - ishlab_chiqarildi
    const kunBoshida = Math.max(0, kunOxirida + sotildi - ishlabChiqarildi);
    return {
      'Sana': formatDate(date),
      'Maxsulot': p.name,
      'Kun boshida (qop)': kunBoshida,
      'Ishlab chiqarildi (qop)': ishlabChiqarildi,
      'Sotildi (qop)': sotildi,
      'Kun oxirida qoldi (qop)': kunOxirida,
      'Tekshirish (boshi+ish-sotil)': kunBoshida + ishlabChiqarildi - sotildi,
    };
  });

  return rows;
}

/** Sheet 2: Sotuv — chek raqami | sana | vaqt | kim oldi | nima oldi | qancha | jami | tuladi | qarz | olib ketdi */
async function buildSotuvSheet(date: Date) {
  const { start, end } = todayRange();

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: {
      id: true, receiptNumber: true, createdAt: true,
      quantity: true, totalAmount: true, paidAmount: true,
      currency: true, manualCustomerName: true,
      customer: { select: { name: true } },
      product: { select: { name: true } },
      driver: { select: { name: true } },
      user: { select: { name: true } },
      items: {
        select: {
          quantity: true,
          product: { select: { name: true } },
          variant: { select: { variantName: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const rows = sales.map((s) => {
    // Build product name string
    let nimaSotildi = '';
    if (s.items && s.items.length > 0) {
      nimaSotildi = s.items
        .map((it) => it.product?.name ?? it.variant?.variantName ?? 'Noma\'lum')
        .join(', ');
    } else {
      nimaSotildi = s.product?.name ?? 'Noma\'lum';
    }

    const kimOldi =
      s.customer?.name ??
      s.manualCustomerName ??
      'Noma\'lum';

    const qarz = Math.max(0, s.totalAmount - s.paidAmount);
    const olib_ketdi = s.driver ? `${s.driver.name}` : '';

    return {
      'Chek raqami': s.receiptNumber ?? '',
      'Sana': formatDate(new Date(s.createdAt)),
      'Vaqt': formatTime(new Date(s.createdAt)),
      'Kim oldi': kimOldi,
      'Nima oldi': nimaSotildi,
      'Qancha oldi (qop)': s.quantity,
      'Jami qiymati': s.totalAmount,
      'Qancha tuladi': s.paidAmount,
      'Qarz': qarz,
      'Kim olib ketdi': olib_ketdi,
      'Valyuta': s.currency,
      'Sotuvchi': s.user?.name ?? '',
    };
  });

  return rows;
}

/** Sheet 3a: Mijozlar umumiy — mijoz | so'nggi savdo | balans */
async function buildMijozlarUmumiySheet() {
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, phone: true,
      lastPurchase: true, lastPayment: true,
      balanceUSD: true, balanceUZS: true,
      debtUSD: true, debtUZS: true,
      category: true,
    },
  });

  return customers.map((c) => ({
    'Mijoz': c.name,
    'Telefon': c.phone,
    'So\'nggi savdo': c.lastPurchase ? formatDate(new Date(c.lastPurchase)) : '',
    'Balans (USD)': c.balanceUSD,
    'Balans (UZS)': c.balanceUZS,
    'Qarz (USD)': c.debtUSD,
    'Qarz (UZS)': c.debtUZS,
    'Kategoriya': c.category,
  }));
}

/** Sheet 3b: Individual customer sheet rows — mixed savdo/tulov lines */
async function buildMijozShaxsiyRows(customerId: string) {
  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId },
      select: {
        id: true, receiptNumber: true, createdAt: true,
        quantity: true, totalAmount: true, paidAmount: true,
        product: { select: { name: true } },
        items: {
          select: {
            quantity: true,
            product: { select: { name: true } },
            variant: { select: { variantName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.payment.findMany({
      where: { customerId },
      select: { id: true, amount: true, currency: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Merge and sort chronologically
  type Row =
    | { type: 'savdo'; date: Date; saleId: string; data: any }
    | { type: 'tulov'; date: Date; paymentId: string; data: any };

  const events: Row[] = [
    ...sales.map((s) => ({ type: 'savdo' as const, date: new Date(s.createdAt), saleId: s.id, data: s })),
    ...payments.map((p) => ({ type: 'tulov' as const, date: new Date(p.createdAt), paymentId: p.id, data: p })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate running balance (USD)
  let balance = 0;
  const rows: any[] = [];

  for (const ev of events) {
    if (ev.type === 'savdo') {
      const s = ev.data;
      let nimaSotildi = '';
      if (s.items?.length > 0) {
        nimaSotildi = s.items.map((it: any) => it.product?.name ?? it.variant?.variantName ?? 'Noma\'lum').join(', ');
      } else {
        nimaSotildi = s.product?.name ?? 'Noma\'lum';
      }
      const oldingiBalans = balance;
      const qarz = Math.max(0, s.totalAmount - s.paidAmount);
      // After sale: balance decreases by debt (customer owes more)
      balance = balance - qarz;
      rows.push({
        'Turi': 'Savdo',
        'Sana': formatDate(ev.date),
        'Vaqt': formatTime(ev.date),
        'Nima oldi': nimaSotildi,
        'Nechta oldi (qop)': s.quantity,
        'Jami qiymati': s.totalAmount,
        'Qancha tulandi': s.paidAmount,
        'Qarz': qarz,
        'Oldingi balans': oldingiBalans,
        'Keyingi balans': balance,
        'To\'lov summasi': '',
      });
    } else {
      const p = ev.data;
      const oldingiBalans = balance;
      balance = balance + p.amount;
      rows.push({
        'Turi': 'To\'lov',
        'Sana': formatDate(ev.date),
        'Vaqt': formatTime(ev.date),
        'Nima oldi': '',
        'Nechta oldi (qop)': '',
        'Jami qiymati': '',
        'Qancha tulandi': '',
        'Qarz': '',
        'Oldingi balans': oldingiBalans,
        'Keyingi balans': balance,
        'To\'lov summasi': p.amount,
      });
    }
  }

  return rows;
}

/** Sheet 4: Kassa — turi | sababi | qayerdan | sana | vaqt | oldin kassada | keyin kassada */
async function buildKassaSheet(date: Date) {
  const { start, end } = todayRange();

  // Get today's cash shift for opening balance
  const shift = await prisma.cashierShift.findFirst({
    where: { startTime: { gte: start, lte: end } },
    orderBy: { startTime: 'asc' },
    select: { openingBalance: true, closingBalance: true },
  });

  const openingBalance = shift?.openingBalance ?? 0;

  // Incoming: sale payments (paidAmount > 0)
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end }, paidAmount: { gt: 0 } },
    select: {
      id: true, receiptNumber: true, createdAt: true, paidAmount: true,
      manualCustomerName: true,
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Outgoing: expenses
  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: {
      id: true, amount: true, currency: true,
      description: true, category: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Merge and sort chronologically
  type KassaEvent =
    | { type: 'kirim'; date: Date; amount: number; sabab: string; qayerdan: string }
    | { type: 'chiqim'; date: Date; amount: number; sabab: string; qayerdan: string };

  const events: KassaEvent[] = [
    ...sales.map((s) => ({
      type: 'kirim' as const,
      date: new Date(s.createdAt),
      amount: s.paidAmount,
      sabab: `Sotuv #${s.receiptNumber ?? s.id.slice(0, 8)}`,
      qayerdan: s.customer?.name ?? s.manualCustomerName ?? 'Naqd mijoz',
    })),
    ...expenses.map((e) => ({
      type: 'chiqim' as const,
      date: new Date(e.createdAt),
      amount: e.amount,
      sabab: e.description,
      qayerdan: e.category,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let kassaBalance = openingBalance;
  const rows: any[] = [];

  // Add opening balance row
  rows.push({
    'Turi': 'Kun boshi qoldig\'i',
    'Sababi': 'Kun boshlanganda kassadagi pul',
    'Qayerdan / Mijoz': '',
    'Sana': formatDate(date),
    'Vaqt': '00:00:00',
    'Bundan oldin kassada': 0,
    'Bundan keyin kassada': kassaBalance,
    'Valyuta': 'UZS',
  });

  for (const ev of events) {
    const oldin = kassaBalance;
    if (ev.type === 'kirim') {
      kassaBalance += ev.amount;
    } else {
      kassaBalance -= ev.amount;
    }
    rows.push({
      'Turi': ev.type === 'kirim' ? 'Kirim' : 'Chiqim',
      'Sababi': ev.sabab,
      'Qayerdan / Mijoz': ev.qayerdan,
      'Sana': formatDate(ev.date),
      'Vaqt': formatTime(ev.date),
      'Bundan oldin kassada': oldin,
      'Bundan keyin kassada': kassaBalance,
      'Valyuta': 'UZS',
    });
  }

  return rows;
}

function autoWidth(ws: XLSX.WorkSheet, data: any[]) {
  if (!data.length) return;
  const cols = Object.keys(data[0]);
  ws['!cols'] = cols.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? '').length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
}

function headerStyle(): XLSX.CellStyle {
  return {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1F4E79' }, patternType: 'solid' },
    alignment: { horizontal: 'center', wrapText: true },
    border: {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    },
  } as any;
}

function applyHeaderStyles(ws: XLSX.WorkSheet, headers: string[]) {
  headers.forEach((h, i) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cellAddr]) {
      ws[cellAddr].s = headerStyle();
    }
  });
}

function safeSheetName(name: string): string {
  // Excel sheet names: max 31 chars, no [\] /? * :
  return name.replace(/[\\\/:*?[\]]/g, '_').slice(0, 31);
}

/** Main function: generate full Excel backup workbook */
export async function generateDailyExcelBackup(): Promise<{ buffer: Buffer; filename: string }> {
  ensureBackupDir();

  const now = new Date();
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Ombor ──────────────────────────────────────────────────────────
  const omborData = await buildOmborSheet(now);
  const wsOmbor = XLSX.utils.json_to_sheet(omborData.length ? omborData : [{}]);
  autoWidth(wsOmbor, omborData);
  if (omborData.length) applyHeaderStyles(wsOmbor, Object.keys(omborData[0]));
  XLSX.utils.book_append_sheet(wb, wsOmbor, 'Ombor');

  // ── Sheet 2: Sotuv ──────────────────────────────────────────────────────────
  const sotuvData = await buildSotuvSheet(now);
  const wsSotuv = XLSX.utils.json_to_sheet(sotuvData.length ? sotuvData : [{}]);
  autoWidth(wsSotuv, sotuvData);
  if (sotuvData.length) applyHeaderStyles(wsSotuv, Object.keys(sotuvData[0]));
  XLSX.utils.book_append_sheet(wb, wsSotuv, 'Sotuv');

  // ── Sheet 3: Mijozlar umumiy ────────────────────────────────────────────────
  const mijozUmumiyData = await buildMijozlarUmumiySheet();
  const wsMijozlar = XLSX.utils.json_to_sheet(mijozUmumiyData.length ? mijozUmumiyData : [{}]);
  autoWidth(wsMijozlar, mijozUmumiyData);
  if (mijozUmumiyData.length) applyHeaderStyles(wsMijozlar, Object.keys(mijozUmumiyData[0]));
  XLSX.utils.book_append_sheet(wb, wsMijozlar, 'Mijozlar');

  // ── Sheet 3+N: Individual customer sheets ───────────────────────────────────
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  for (const cust of customers) {
    const rows = await buildMijozShaxsiyRows(cust.id);
    if (rows.length === 0) continue;

    const sheetName = safeSheetName(cust.name);

    // Add customer name as title row
    const ws = XLSX.utils.aoa_to_sheet([[`Mijoz: ${cust.name}`]]);
    // Merge A1 across all columns
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Object.keys(rows[0]).length - 1 } }];
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 14, color: { rgb: '1F4E79' } },
        alignment: { horizontal: 'center' },
      } as any;
    }

    // Append data starting from row 2
    XLSX.utils.sheet_add_json(ws, rows, { origin: 'A2' });
    autoWidth(ws, rows);
    applyHeaderStyles(ws, Object.keys(rows[0]));

    // Ensure sheet name is unique (Excel doesn't allow duplicates)
    let finalName = sheetName;
    let suffix = 2;
    while (wb.SheetNames.includes(finalName)) {
      finalName = safeSheetName(cust.name).slice(0, 28) + `_${suffix++}`;
    }
    XLSX.utils.book_append_sheet(wb, ws, finalName);
  }

  // ── Sheet 4: Kassa ──────────────────────────────────────────────────────────
  const kassaData = await buildKassaSheet(now);
  const wsKassa = XLSX.utils.json_to_sheet(kassaData.length ? kassaData : [{}]);
  autoWidth(wsKassa, kassaData);
  if (kassaData.length) applyHeaderStyles(wsKassa, Object.keys(kassaData[0]));
  XLSX.utils.book_append_sheet(wb, wsKassa, 'Kassa');

  // Write to buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false }) as Buffer;

  const dateStr = now.toISOString().slice(0, 10);
  const filename = `hisobot_${dateStr}.xlsx`;

  // Save to disk (real-time update: overwrite same-day file)
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  return { buffer, filename };
}

/** Returns path to today's saved backup file (for sending later) */
export function getTodayBackupPath(): string | null {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filePath = path.join(BACKUP_DIR, `hisobot_${dateStr}.xlsx`);
  return fs.existsSync(filePath) ? filePath : null;
}
