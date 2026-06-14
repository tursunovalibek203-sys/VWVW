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

// Shift 1: 00:00–08:00 | Shift 2: 08:00–12:00 | Shift 3: 12:00–18:00
function getShift(d: Date): 1 | 2 | 3 {
  const h = d.getHours();
  if (h < 8) return 1;
  if (h < 12) return 2;
  return 3;
}

const EXPENSE_LABELS: Record<string, string> = {
  SALARY: 'Ish haqi',
  ELECTRICITY: 'Elektr',
  RAW_MATERIALS: 'Xom ashyo',
  TRANSPORT: 'Transport',
  TAX: 'Soliq',
  OTHER: 'Boshqa',
};

/**
 * Sheet 1: Ombor — pivot style
 * Columns: Mahsulot | Kun boshida | 8:00gacha | 8:00-12:00 | 12:00-18:00 | Jami ishlab chiqarildi | Kun oxirida | [SaleCol per sale...]
 */
async function buildOmborSheet(_date: Date) {
  const { start, end } = todayRange();

  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });

  // ── Sales: build one column per sale ─────────────────────────────────────
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: {
      id: true,
      receiptNumber: true,
      createdAt: true,
      quantity: true,
      productId: true,
      manualCustomerName: true,
      customer: { select: { name: true } },
      items: { select: { quantity: true, productId: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Count occurrences of each customer label (for deduplication)
  const baseLabelCount = new Map<string, number>();
  for (const s of sales) {
    const name = s.customer?.name ?? s.manualCustomerName ?? "Noma'lum";
    const base = `${name}ga savdo`;
    baseLabelCount.set(base, (baseLabelCount.get(base) ?? 0) + 1);
  }

  const baseLabelCounter = new Map<string, number>();
  const saleColumns: Array<{ label: string; itemMap: Map<string, number> }> = [];

  for (const s of sales) {
    const name = s.customer?.name ?? s.manualCustomerName ?? "Noma'lum";
    const base = `${name}ga savdo`;
    const total = baseLabelCount.get(base) ?? 1;

    let label: string;
    if (total > 1) {
      const n = (baseLabelCounter.get(base) ?? 0) + 1;
      baseLabelCounter.set(base, n);
      label = `${base} ${n}`;
    } else {
      label = base;
    }

    const itemMap = new Map<string, number>();
    if (s.items && s.items.length > 0) {
      for (const it of s.items) {
        if (it.productId) {
          itemMap.set(it.productId, (itemMap.get(it.productId) ?? 0) + it.quantity);
        }
      }
    } else if (s.productId) {
      itemMap.set(s.productId, s.quantity ?? 0);
    }

    saleColumns.push({ label, itemMap });
  }

  // Total sold per product
  const soldMap = new Map<string, number>();
  for (const col of saleColumns) {
    for (const [pid, qty] of col.itemMap) {
      soldMap.set(pid, (soldMap.get(pid) ?? 0) + qty);
    }
  }

  // ── Production: 3 sources → split by shift ───────────────────────────────
  const prodShift: Record<1 | 2 | 3, Map<string, number>> = {
    1: new Map(),
    2: new Map(),
    3: new Map(),
  };

  // Source 1: Batch records (scheduled production)
  const batches = await prisma.batch.findMany({
    where: { productionDate: { gte: start, lte: end } },
  });
  const batchKeys = new Set<string>();
  for (const b of batches) {
    const shift = getShift(new Date(b.productionDate));
    prodShift[shift].set(b.productId, (prodShift[shift].get(b.productId) ?? 0) + b.quantity);
    batchKeys.add(`${b.productId}_${new Date(b.productionDate).toISOString().slice(0, 16)}`);
  }

  // Source 2: StockMovement type=PRODUCTION (skip if already in Batch)
  const smProd = await prisma.stockMovement.findMany({
    where: { type: 'PRODUCTION', createdAt: { gte: start, lte: end } },
  });
  for (const sm of smProd) {
    const key = `${sm.productId}_${new Date(sm.createdAt).toISOString().slice(0, 16)}`;
    if (!batchKeys.has(key)) {
      const shift = getShift(new Date(sm.createdAt));
      prodShift[shift].set(sm.productId, (prodShift[shift].get(sm.productId) ?? 0) + sm.quantity);
    }
  }

  // Source 3: StockMovement type=ADD (warehouse add-bag — this is the fix for the 0 bug)
  const smAdd = await prisma.stockMovement.findMany({
    where: { type: 'ADD', createdAt: { gte: start, lte: end } },
  });
  for (const sm of smAdd) {
    const shift = getShift(new Date(sm.createdAt));
    prodShift[shift].set(sm.productId, (prodShift[shift].get(sm.productId) ?? 0) + sm.quantity);
  }

  // ── Build rows ────────────────────────────────────────────────────────────
  const rows = products.map((p) => {
    const s1 = prodShift[1].get(p.id) ?? 0;
    const s2 = prodShift[2].get(p.id) ?? 0;
    const s3 = prodShift[3].get(p.id) ?? 0;
    const totalProd = s1 + s2 + s3;
    const sotildi = soldMap.get(p.id) ?? 0;
    const kunOxirida = p.currentStock;
    const kunBoshida = Math.max(0, kunOxirida + sotildi - totalProd);

    const row: Record<string, any> = {
      'Mahsulot': p.name,
      'Kun boshida (qop)': kunBoshida,
      '8:00 gacha ishlab chiqarildi': s1 || '',
      '8:00-12:00 ishlab chiqarildi': s2 || '',
      '12:00-18:00 ishlab chiqarildi': s3 || '',
      'Jami ishlab chiqarildi (qop)': totalProd || '',
      'Kun oxirida qoldi (qop)': kunOxirida,
    };

    for (const col of saleColumns) {
      const qty = col.itemMap.get(p.id);
      row[col.label] = qty != null && qty > 0 ? qty : '';
    }

    return row;
  });

  return rows;
}

/** Sheet 2: Sotuv — chek raqami | sana | vaqt | kim oldi | nima oldi | qancha | jami | tuladi | qarz | olib ketdi */
async function buildSotuvSheet(_date: Date) {
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

  return sales.map((s) => {
    let nimaSotildi = '';
    if (s.items && s.items.length > 0) {
      nimaSotildi = s.items
        .map((it) => it.product?.name ?? it.variant?.variantName ?? "Noma'lum")
        .join(', ');
    } else {
      nimaSotildi = s.product?.name ?? "Noma'lum";
    }

    const kimOldi = s.customer?.name ?? s.manualCustomerName ?? "Noma'lum";
    const qarz = Math.max(0, s.totalAmount - s.paidAmount);

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
      'Kim olib ketdi': s.driver?.name ?? '',
      'Valyuta': s.currency,
      'Sotuvchi': s.user?.name ?? '',
    };
  });
}

/** Sheet 3a: Mijozlar umumiy */
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
    "So'nggi savdo": c.lastPurchase ? formatDate(new Date(c.lastPurchase)) : '',
    'Balans (USD)': c.balanceUSD,
    'Balans (UZS)': c.balanceUZS,
    'Qarz (USD)': c.debtUSD,
    'Qarz (UZS)': c.debtUZS,
    'Kategoriya': c.category,
  }));
}

/** Sheet 3b: Individual customer rows */
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

  type Row =
    | { type: 'savdo'; date: Date; data: typeof sales[0] }
    | { type: 'tulov'; date: Date; data: typeof payments[0] };

  const events: Row[] = [
    ...sales.map((s) => ({ type: 'savdo' as const, date: new Date(s.createdAt), data: s })),
    ...payments.map((p) => ({ type: 'tulov' as const, date: new Date(p.createdAt), data: p })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let balance = 0;
  const rows: any[] = [];

  for (const ev of events) {
    if (ev.type === 'savdo') {
      const s = ev.data as typeof sales[0];
      let nimaSotildi = '';
      if (s.items?.length > 0) {
        nimaSotildi = s.items
          .map((it: any) => it.product?.name ?? it.variant?.variantName ?? "Noma'lum")
          .join(', ');
      } else {
        nimaSotildi = s.product?.name ?? "Noma'lum";
      }
      const oldingiBalans = balance;
      const qarz = Math.max(0, s.totalAmount - s.paidAmount);
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
        "To'lov summasi": '',
      });
    } else {
      const p = ev.data as typeof payments[0];
      const oldingiBalans = balance;
      balance = balance + p.amount;
      rows.push({
        'Turi': "To'lov",
        'Sana': formatDate(ev.date),
        'Vaqt': formatTime(ev.date),
        'Nima oldi': '',
        'Nechta oldi (qop)': '',
        'Jami qiymati': '',
        'Qancha tulandi': '',
        'Qarz': '',
        'Oldingi balans': oldingiBalans,
        'Keyingi balans': balance,
        "To'lov summasi": p.amount,
      });
    }
  }

  return rows;
}

/**
 * Kassa ma'lumotlarini tayyorlash — barcha sheetlar uchun
 * Yangi ustunlar: UZS | $ | Karta | Kassada bo'ldi UZS | Kassada bo'ldi $ | Kassada bo'ldi Karta
 */
async function buildKassaData(date: Date) {
  const { start, end } = todayRange();

  const shift = await prisma.cashierShift.findFirst({
    where: { startTime: { gte: start, lte: end } },
    orderBy: { startTime: 'asc' },
    select: { openingBalance: true },
  });

  // UZS opening balance from shift, USD and Card start at 0
  const openingUZS = shift?.openingBalance ?? 0;

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end }, paidAmount: { gt: 0 } },
    select: {
      id: true, receiptNumber: true, createdAt: true,
      paidAmount: true, currency: true, paymentMethod: true,
      paymentDetails: true,
      manualCustomerName: true,
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: {
      id: true, amount: true, currency: true,
      description: true, category: true, createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Determine how much of a sale was in UZS / USD / Card
  function parseSaleAmounts(s: typeof sales[0]): { uzs: number; usd: number; card: number } {
    const method = (s.paymentMethod ?? 'CASH').toUpperCase();

    // Card / Click → all goes to Karta
    if (method === 'CARD' || method === 'CLICK') {
      return { uzs: 0, usd: 0, card: s.paidAmount };
    }

    // Try paymentDetails JSON breakdown first
    if (s.paymentDetails) {
      try {
        const pd = JSON.parse(s.paymentDetails);
        const uzs = Number(pd.uzs) || 0;
        const usd = Number(pd.usd) || 0;
        if (uzs > 0 || usd > 0) return { uzs, usd, card: 0 };
      } catch {
        // ignore parse error
      }
    }

    // Fall back to currency field
    if ((s.currency ?? '').toUpperCase() === 'UZS') {
      return { uzs: s.paidAmount, usd: 0, card: 0 };
    }
    return { uzs: 0, usd: s.paidAmount, card: 0 };
  }

  type KassaEvent = {
    isKirim: boolean;
    date: Date;
    turi: string;
    sabab: string;
    qayerdan: string;
    uzs: number;
    usd: number;
    card: number;
    category: string; // for grouping expense sheets
  };

  const events: KassaEvent[] = [
    ...sales.map((s) => {
      const { uzs, usd, card } = parseSaleAmounts(s);
      return {
        isKirim: true,
        date: new Date(s.createdAt),
        turi: 'Sotuv',
        sabab: `Sotuv #${s.receiptNumber ?? s.id.slice(0, 8)}`,
        qayerdan: s.customer?.name ?? s.manualCustomerName ?? 'Naqd mijoz',
        uzs, usd, card,
        category: 'SALE',
      };
    }),
    ...expenses.map((e) => {
      const curr = (e.currency ?? 'UZS').toUpperCase();
      return {
        isKirim: false,
        date: new Date(e.createdAt),
        turi: EXPENSE_LABELS[e.category] ?? e.category,
        sabab: e.description,
        qayerdan: EXPENSE_LABELS[e.category] ?? e.category,
        uzs: curr === 'UZS' ? e.amount : 0,
        usd: curr === 'USD' ? e.amount : 0,
        card: 0,
        category: e.category,
      };
    }),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  type KassaRow = Record<string, any>;

  function makeRow(
    turi: string, sabab: string, qayerdan: string,
    rowDate: Date, rowTime: Date,
    direction: string,
    uzs: number | string, usd: number | string, card: number | string,
    balUZS: number, balUSD: number, balCard: number,
  ): KassaRow {
    return {
      'Turi': turi,
      'Sababi': sabab,
      'Qayerdan / Kimdan': qayerdan,
      'Sana': formatDate(rowDate),
      'Vaqt': formatTime(rowTime),
      'Kirgan yoki chiqgan': direction,
      'UZS': uzs,
      '$': usd,
      'Karta': card,
      "Kassada bo'ldi UZS": balUZS,
      "Kassada bo'ldi $": balUSD,
      "Kassada bo'ldi Karta": balCard,
    };
  }

  let balUZS = openingUZS;
  let balUSD = 0;
  let balCard = 0;

  // Opening row
  const openingRow = makeRow(
    "Kun boshi qoldig'i", 'Kun boshlanganda kassadagi pul', '',
    date, new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
    '-', '', '', '',
    balUZS, balUSD, balCard,
  );

  const allRows: KassaRow[] = [openingRow];
  const kirimRows: KassaRow[] = [];
  const chiqimRows: KassaRow[] = [];
  const categoryMap = new Map<string, KassaRow[]>();

  for (const ev of events) {
    if (ev.isKirim) {
      balUZS += ev.uzs;
      balUSD += ev.usd;
      balCard += ev.card;
    } else {
      balUZS -= ev.uzs;
      balUSD -= ev.usd;
      balCard -= ev.card;
    }

    const row = makeRow(
      ev.turi, ev.sabab, ev.qayerdan,
      ev.date, ev.date,
      ev.isKirim ? 'Kirdi ▲' : 'Chiqdi ▼',
      ev.uzs || '', ev.usd || '', ev.card || '',
      balUZS, balUSD, balCard,
    );

    allRows.push(row);

    if (ev.isKirim) {
      kirimRows.push(row);
    } else {
      chiqimRows.push(row);
      if (!categoryMap.has(ev.category)) categoryMap.set(ev.category, []);
      categoryMap.get(ev.category)!.push(row);
    }
  }

  return { allRows, kirimRows, chiqimRows, categoryMap };
}

// ── Excel helpers ─────────────────────────────────────────────────────────────

function autoWidth(ws: XLSX.WorkSheet, data: any[]) {
  if (!data.length) return;
  const cols = Object.keys(data[0]);
  ws['!cols'] = cols.map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? '').length),
    );
    return { wch: Math.min(maxLen + 2, 45) };
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
  headers.forEach((_, i) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cellAddr]) ws[cellAddr].s = headerStyle();
  });
}

function safeSheetName(name: string): string {
  return name.replace(/[\\\/:*?[\]]/g, '_').slice(0, 31);
}

function makeSheet(data: any[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{}]);
  autoWidth(ws, data);
  if (data.length) applyHeaderStyles(ws, Object.keys(data[0]));
  return ws;
}

/** Main function: generate full Excel backup workbook */
export async function generateDailyExcelBackup(): Promise<{ buffer: Buffer; filename: string }> {
  ensureBackupDir();

  const now = new Date();
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Ombor (pivot: mahsulot × smena + savdo ustunlari) ─────────────
  const omborData = await buildOmborSheet(now);
  XLSX.utils.book_append_sheet(wb, makeSheet(omborData), 'Ombor');

  // ── Sheet 2: Sotuv ─────────────────────────────────────────────────────────
  const sotuvData = await buildSotuvSheet(now);
  XLSX.utils.book_append_sheet(wb, makeSheet(sotuvData), 'Sotuv');

  // ── Sheet 3: Mijozlar umumiy ───────────────────────────────────────────────
  const mijozUmumiyData = await buildMijozlarUmumiySheet();
  XLSX.utils.book_append_sheet(wb, makeSheet(mijozUmumiyData), 'Mijozlar');

  // ── Sheets 3+N: Individual customer sheets ─────────────────────────────────
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  for (const cust of customers) {
    const rows = await buildMijozShaxsiyRows(cust.id);
    if (rows.length === 0) continue;

    const ws = XLSX.utils.aoa_to_sheet([[`Mijoz: ${cust.name}`]]);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Object.keys(rows[0]).length - 1 } }];
    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 14, color: { rgb: '1F4E79' } },
        alignment: { horizontal: 'center' },
      } as any;
    }
    XLSX.utils.sheet_add_json(ws, rows, { origin: 'A2' });
    autoWidth(ws, rows);
    applyHeaderStyles(ws, Object.keys(rows[0]));

    let finalName = safeSheetName(cust.name);
    let suffix = 2;
    while (wb.SheetNames.includes(finalName)) {
      finalName = safeSheetName(cust.name).slice(0, 28) + `_${suffix++}`;
    }
    XLSX.utils.book_append_sheet(wb, ws, finalName);
  }

  // ── Kassa sheets (all / kirim / chiqim / per-category) ────────────────────
  const kassaResult = await buildKassaData(now);

  // All transactions
  XLSX.utils.book_append_sheet(wb, makeSheet(kassaResult.allRows), 'Kassa');

  // Income only
  XLSX.utils.book_append_sheet(
    wb,
    makeSheet(kassaResult.kirimRows.length ? kassaResult.kirimRows : [{}]),
    'Kassa - Kirim',
  );

  // Expense only
  XLSX.utils.book_append_sheet(
    wb,
    makeSheet(kassaResult.chiqimRows.length ? kassaResult.chiqimRows : [{}]),
    'Kassa - Chiqim',
  );

  // Per expense category
  for (const [cat, rows] of kassaResult.categoryMap) {
    const label = EXPENSE_LABELS[cat] ?? cat;
    const sheetName = safeSheetName(`Harajat - ${label}`);
    let finalName = sheetName;
    let sfx = 2;
    while (wb.SheetNames.includes(finalName)) {
      finalName = sheetName.slice(0, 28) + `_${sfx++}`;
    }
    XLSX.utils.book_append_sheet(wb, makeSheet(rows), finalName);
  }

  // ── Write buffer ───────────────────────────────────────────────────────────
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false }) as Buffer;

  const dateStr = now.toISOString().slice(0, 10);
  const filename = `hisobot_${dateStr}.xlsx`;

  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, buffer);

  return { buffer, filename };
}

/** Returns path to today's saved backup file */
export function getTodayBackupPath(): string | null {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filePath = path.join(BACKUP_DIR, `hisobot_${dateStr}.xlsx`);
  return fs.existsSync(filePath) ? filePath : null;
}
