import { prisma } from './prisma';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const BACKUP_DIR = path.join(process.cwd(), 'backup', 'excel');

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
}

function yesterdayRange() {
  const s = new Date(); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setDate(e.getDate() - 1); e.setHours(23, 59, 59, 999);
  return { start: s, end: e };
}

function getShift(d: Date): 1 | 2 | 3 {
  const h = d.getHours();
  if (h < 8) return 1;
  if (h < 12) return 2;
  return 3;
}

const DAY_NAMES = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];

const EXPENSE_LABELS: Record<string, string> = {
  SALARY: 'Ish haqi', ELECTRICITY: 'Elektr', RAW_MATERIALS: 'Xom ashyo',
  TRANSPORT: 'Transport', TAX: 'Soliq', OTHER: 'Boshqa',
};

function pct(a: number, b: number): string {
  if (b === 0) return a > 0 ? '▲ yangi' : '—';
  const p = ((a - b) / b) * 100;
  return (p >= 0 ? '▲ +' : '▼ ') + Math.abs(p).toFixed(1) + '%';
}

function fmt(n: number, dec = 2): number { return +n.toFixed(dec); }

// ── Excel style helpers ───────────────────────────────────────────────────────

function autoWidth(ws: XLSX.WorkSheet, data: any[]) {
  if (!data.length) return;
  const cols = Object.keys(data[0]);
  ws['!cols'] = cols.map((key) => {
    const maxLen = Math.max(key.length, ...data.map((row) => String(row[key] ?? '').length));
    return { wch: Math.min(maxLen + 2, 45) };
  });
}

function headerStyle(): any {
  return {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1F4E79' }, patternType: 'solid' },
    alignment: { horizontal: 'center', wrapText: true, vertical: 'middle' },
    border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } },
  };
}

function totalStyle(): any {
  return {
    font: { bold: true, color: { rgb: '1F4E79' } },
    fill: { fgColor: { rgb: 'D6E4F0' }, patternType: 'solid' },
    alignment: { horizontal: 'right' },
  };
}

function sectionStyle(): any {
  return {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '2E75B6' }, patternType: 'solid' },
  };
}

function dangerStyle(): any {
  return { fill: { fgColor: { rgb: 'F8D7DA' }, patternType: 'solid' }, font: { bold: true } };
}

function warningStyle(): any {
  return { fill: { fgColor: { rgb: 'FFF3CD' }, patternType: 'solid' } };
}

function successStyle(): any {
  return { fill: { fgColor: { rgb: 'D4EDDA' }, patternType: 'solid' } };
}

function safeSheetName(name: string): string {
  return name.replace(/[\\\/:*?[\]]/g, '_').slice(0, 31);
}

function applyHeaderStyles(ws: XLSX.WorkSheet, headers: string[]) {
  headers.forEach((_, i) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[addr]) ws[addr].s = headerStyle();
  });
}

function addAutofilter(ws: XLSX.WorkSheet) {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: range.e.c } }) };
}

function makeSheet(data: any[]): XLSX.WorkSheet {
  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{}]);
  autoWidth(ws, data);
  if (data.length) applyHeaderStyles(ws, Object.keys(data[0]));
  addAutofilter(ws);
  return ws;
}

// Build sheet with JAMI (total) row at the bottom
function makeSheetWithTotal(data: Record<string, any>[], numericKeys: string[]): XLSX.WorkSheet {
  if (!data.length) return XLSX.utils.json_to_sheet([{}]);
  const keys = Object.keys(data[0]);
  const totalRow: Record<string, any> = {};
  keys.forEach((key, i) => {
    if (i === 0) totalRow[key] = '─── JAMI ───';
    else if (numericKeys.includes(key)) totalRow[key] = fmt(data.reduce((s, r) => s + (Number(r[key]) || 0), 0));
    else totalRow[key] = '';
  });
  const all = [...data, totalRow];
  const ws = XLSX.utils.json_to_sheet(all);
  autoWidth(ws, all);
  applyHeaderStyles(ws, keys);
  addAutofilter(ws);
  // Style total row
  const totalRowIdx = all.length - 1;
  keys.forEach((_, c) => {
    const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
    if (ws[addr]) ws[addr].s = totalStyle();
  });
  return ws;
}

// ── SHEET 0: Muqova (Cover) ───────────────────────────────────────────────────
function buildMuqovaSheet(now: Date, sheetList: string[]): XLSX.WorkSheet {
  const aoa: any[][] = [
    ['LUX PET PLAST'],
    ['KUNLIK HISOBOT TIZIMI'],
    [''],
    ['Sana:', formatDate(now)],
    ['Kun:', DAY_NAMES[now.getDay()]],
    ['Tuzildi:', formatTime(now)],
    ['Davr:', `${formatDate(now)} — ${formatDate(now)}`],
    [''],
    ["SAHIFALAR RO'YXATI:"],
    ...sheetList.map((name, i) => [`  ${i + 1}.`, name]),
    [''],
    ['Ushbu hisobot avtomatik yaratildi.'],
    ['LuxPetPlast ERP tizimi orqali.'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 28 }, { wch: 42 }];

  // Title styles
  const titleStyle = { font: { bold: true, sz: 18, color: { rgb: '1F4E79' } }, alignment: { horizontal: 'center' } };
  const subtitleStyle = { font: { bold: true, sz: 13, color: { rgb: '2E75B6' } }, alignment: { horizontal: 'center' } };
  const labelStyle = { font: { bold: true, color: { rgb: '595959' } } };
  const sectionHeaderStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F4E79' }, patternType: 'solid' } };

  if (ws['A1']) ws['A1'].s = titleStyle;
  if (ws['A2']) ws['A2'].s = subtitleStyle;
  ['A4','A5','A6','A7'].forEach(a => { if (ws[a]) ws[a].s = labelStyle; });
  if (ws['A9']) ws['A9'].s = sectionHeaderStyle;

  return ws;
}

// ── SHEET 1: KPI Dashboard ───────────────────────────────────────────────────
async function buildKPISheet(now: Date): Promise<XLSX.WorkSheet> {
  const { start: tS, end: tE } = todayRange();
  const { start: yS, end: yE } = yesterdayRange();

  const [tSales, ySales, tExp, yExp, products, custAgg, todayBuyers] = await Promise.all([
    prisma.sale.aggregate({ where: { createdAt: { gte: tS, lte: tE } }, _sum: { totalAmount: true, paidAmount: true, quantity: true }, _count: true }),
    prisma.sale.aggregate({ where: { createdAt: { gte: yS, lte: yE } }, _sum: { totalAmount: true, paidAmount: true, quantity: true }, _count: true }),
    prisma.expense.aggregate({ where: { createdAt: { gte: tS, lte: tE } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { createdAt: { gte: yS, lte: yE } }, _sum: { amount: true } }),
    prisma.product.findMany({ where: { active: true }, select: { currentStock: true, minStockLimit: true } }),
    prisma.customer.aggregate({ _sum: { debtUSD: true } }),
    prisma.sale.groupBy({ by: ['customerId'], where: { createdAt: { gte: tS, lte: tE }, customerId: { not: null } } }),
  ]);

  const n = (v: any) => Number(v ?? 0);
  const tSavdo   = n(tSales._sum.totalAmount);
  const ySavdo   = n(ySales._sum.totalAmount);
  const tTulov   = n(tSales._sum.paidAmount);
  const yTulov   = n(ySales._sum.paidAmount);
  const tQarz    = Math.max(0, tSavdo - tTulov);
  const yQarz    = Math.max(0, ySavdo - yTulov);
  const tQop     = n(tSales._sum.quantity);
  const yQop     = n(ySales._sum.quantity);
  const tCount   = tSales._count;
  const yCount   = ySales._count;
  const tXarajat = n(tExp._sum.amount);
  const yXarajat = n(yExp._sum.amount);
  const tFoyda   = tSavdo - tXarajat;
  const yFoyda   = ySavdo - yXarajat;
  const jarimiQ  = n(custAgg._sum.debtUSD);
  const kritik   = products.filter(p => p.currentStock <= 0).length;
  const past     = products.filter(p => p.currentStock > 0 && p.currentStock < p.minStockLimit).length;

  const rows: Record<string, any>[] = [
    { "Ko'rsatkich": "═══ 💰 SAVDO ═══",     'Bugun': '', 'Kecha': '', 'Farq': '' },
    { "Ko'rsatkich": 'Jami savdo ($)',        'Bugun': fmt(tSavdo),   'Kecha': fmt(ySavdo),   'Farq': pct(tSavdo, ySavdo) },
    { "Ko'rsatkich": "To'langan ($)",         'Bugun': fmt(tTulov),   'Kecha': fmt(yTulov),   'Farq': pct(tTulov, yTulov) },
    { "Ko'rsatkich": 'Yangi qarz ($)',        'Bugun': fmt(tQarz),    'Kecha': fmt(yQarz),    'Farq': pct(tQarz, yQarz) },
    { "Ko'rsatkich": 'Sotuvlar soni',         'Bugun': tCount,         'Kecha': yCount,         'Farq': pct(tCount, yCount) },
    { "Ko'rsatkich": 'Sotildi (qop)',         'Bugun': tQop,           'Kecha': yQop,           'Farq': pct(tQop, yQop) },
    { "Ko'rsatkich": "═══ 📦 OMBOR ═══",     'Bugun': '', 'Kecha': '', 'Farq': '' },
    { "Ko'rsatkich": 'Jami mahsulot turlari', 'Bugun': products.length,'Kecha': '',             'Farq': '' },
    { "Ko'rsatkich": 'Kritik zahira (0 qop)', 'Bugun': kritik,         'Kecha': '',             'Farq': kritik > 0 ? '⚠️ Darhol!' : '✅ Yaxshi' },
    { "Ko'rsatkich": 'Past zahira (< min)',   'Bugun': past,           'Kecha': '',             'Farq': past > 0 ? '⚠️ Diqqat' : '✅ Yaxshi' },
    { "Ko'rsatkich": "═══ 👥 MIJOZLAR ═══",  'Bugun': '', 'Kecha': '', 'Farq': '' },
    { "Ko'rsatkich": "Bugun xaridor bo'ldi", 'Bugun': todayBuyers.length, 'Kecha': '', 'Farq': '' },
    { "Ko'rsatkich": 'Jami qarz bazada ($)',  'Bugun': fmt(jarimiQ),  'Kecha': '',             'Farq': '' },
    { "Ko'rsatkich": "═══ 💸 XARAJAT / FOYDA ═══", 'Bugun': '', 'Kecha': '', 'Farq': '' },
    { "Ko'rsatkich": 'Xarajatlar ($)',        'Bugun': fmt(tXarajat), 'Kecha': fmt(yXarajat), 'Farq': pct(tXarajat, yXarajat) },
    { "Ko'rsatkich": 'Taxminiy sof foyda ($)','Bugun': fmt(tFoyda),   'Kecha': fmt(yFoyda),   'Farq': pct(tFoyda, yFoyda) },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 34 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  applyHeaderStyles(ws, ["Ko'rsatkich", 'Bugun', 'Kecha', 'Farq']);

  // Style section separator rows
  const sectionIdxs = [0, 6, 10, 13]; // 0-based row indexes after header (row 0 = header)
  sectionIdxs.forEach(ri => {
    [0, 1, 2, 3].forEach(ci => {
      const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      if (ws[addr]) ws[addr].s = sectionStyle();
    });
  });

  // Danger style for kritik > 0
  if (kritik > 0) {
    const addr = XLSX.utils.encode_cell({ r: 9, c: 1 });
    if (ws[addr]) ws[addr].s = dangerStyle();
  }

  return ws;
}

// ── SHEET 2: Ogohlantirishlar (Alerts) ───────────────────────────────────────
async function buildAlertsSheet(): Promise<Record<string, any>[]> {
  const now = new Date();

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: { name: true, currentStock: true, minStockLimit: true, optimalStock: true },
    }),
    prisma.customer.findMany({
      where: { debtUSD: { gt: 0 } },
      select: { name: true, phone: true, debtUSD: true, lastPurchase: true, lastPayment: true },
    }),
  ]);

  const rows: Record<string, any>[] = [];

  // Critical stock (= 0)
  products.filter(p => p.currentStock <= 0).forEach(p => {
    rows.push({ 'Daraja': '🔴 KRITIK', 'Tur': 'Ombor', 'Tavsif': `${p.name} — 0 qop qoldi`, 'Qiymat / Tel': `Min limit: ${p.minStockLimit} qop` });
  });

  // Low stock (< min)
  products.filter(p => p.currentStock > 0 && p.currentStock < p.minStockLimit).forEach(p => {
    rows.push({ 'Daraja': '🟡 DIQQAT', 'Tur': 'Ombor', 'Tavsif': `${p.name} — past zahira (${p.currentStock} qop)`, 'Qiymat / Tel': `Min: ${p.minStockLimit} | Optimal: ${p.optimalStock}` });
  });

  // Overdue debts
  customers.forEach(c => {
    const lastAct = c.lastPayment ?? c.lastPurchase;
    const days = lastAct ? Math.floor((now.getTime() - new Date(lastAct).getTime()) / 86400000) : 999;
    if (days > 60 && c.debtUSD > 50) {
      rows.push({
        'Daraja': days > 120 ? '🔴 KRITIK' : '🟡 DIQQAT',
        'Tur': 'Qarz',
        'Tavsif': `${c.name} — ${days} kun to'lovsiz, $${fmt(c.debtUSD)}`,
        'Qiymat / Tel': c.phone,
      });
    }
  });

  if (rows.length === 0) {
    rows.push({ 'Daraja': '✅ YAXSHI', 'Tur': '—', 'Tavsif': "Hech qanday kritik ogohlantirish yo'q", 'Qiymat / Tel': '' });
  }

  return rows;
}

// ── SHEET 3: Ombor ────────────────────────────────────────────────────────────
async function buildOmborSheet(_date: Date) {
  const { start, end } = todayRange();
  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { id: true, receiptNumber: true, createdAt: true, quantity: true, productId: true, manualCustomerName: true, customer: { select: { name: true } }, items: { select: { quantity: true, productId: true } } },
    orderBy: { createdAt: 'asc' },
  });

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
    if (total > 1) { const n = (baseLabelCounter.get(base) ?? 0) + 1; baseLabelCounter.set(base, n); label = `${base} ${n}`; }
    else { label = base; }

    const itemMap = new Map<string, number>();
    if (s.items?.length > 0) { for (const it of s.items) { if (it.productId) itemMap.set(it.productId, (itemMap.get(it.productId) ?? 0) + it.quantity); } }
    else if (s.productId) { itemMap.set(s.productId, s.quantity ?? 0); }
    saleColumns.push({ label, itemMap });
  }

  const soldMap = new Map<string, number>();
  for (const col of saleColumns) for (const [pid, qty] of col.itemMap) soldMap.set(pid, (soldMap.get(pid) ?? 0) + qty);

  const prodShift: Record<1 | 2 | 3, Map<string, number>> = { 1: new Map(), 2: new Map(), 3: new Map() };
  const batches = await prisma.batch.findMany({ where: { productionDate: { gte: start, lte: end } } });
  const batchKeys = new Set<string>();
  for (const b of batches) {
    const shift = getShift(new Date(b.productionDate));
    prodShift[shift].set(b.productId, (prodShift[shift].get(b.productId) ?? 0) + b.quantity);
    batchKeys.add(`${b.productId}_${new Date(b.productionDate).toISOString().slice(0, 16)}`);
  }
  const smProd = await prisma.stockMovement.findMany({ where: { type: 'PRODUCTION', createdAt: { gte: start, lte: end } } });
  for (const sm of smProd) {
    const key = `${sm.productId}_${new Date(sm.createdAt).toISOString().slice(0, 16)}`;
    if (!batchKeys.has(key)) { const shift = getShift(new Date(sm.createdAt)); prodShift[shift].set(sm.productId, (prodShift[shift].get(sm.productId) ?? 0) + sm.quantity); }
  }
  const smAdd = await prisma.stockMovement.findMany({ where: { type: 'ADD', createdAt: { gte: start, lte: end } } });
  for (const sm of smAdd) { const shift = getShift(new Date(sm.createdAt)); prodShift[shift].set(sm.productId, (prodShift[shift].get(sm.productId) ?? 0) + sm.quantity); }

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
      '8:00 gacha': s1 || '',
      '8:00-12:00': s2 || '',
      '12:00-18:00': s3 || '',
      'Jami ishlab chiqarildi': totalProd || '',
      'Jami sotildi': sotildi || '',
      'Kun oxirida qoldi': kunOxirida,
      'Min limit': p.minStockLimit,
      'Holat': kunOxirida <= 0 ? '🔴 KRITIK' : kunOxirida < p.minStockLimit ? '🟡 PAST' : '🟢 NORMAL',
    };
    for (const col of saleColumns) {
      const qty = col.itemMap.get(p.id);
      row[col.label] = qty != null && qty > 0 ? qty : '';
    }
    return row;
  });

  return rows;
}

// ── SHEET 4: Sotuv ────────────────────────────────────────────────────────────
async function buildSotuvSheet(_date: Date): Promise<Record<string, any>[]> {
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
      items: { select: { quantity: true, product: { select: { name: true } }, variant: { select: { variantName: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const rows = sales.map((s) => {
    let nimaSotildi = '';
    if (s.items?.length > 0) nimaSotildi = s.items.map((it) => it.product?.name ?? it.variant?.variantName ?? "Noma'lum").join(', ');
    else nimaSotildi = s.product?.name ?? "Noma'lum";
    const kimOldi = s.customer?.name ?? s.manualCustomerName ?? "Noma'lum";
    const qarz = Math.max(0, s.totalAmount - s.paidAmount);
    return {
      'Chek #': s.receiptNumber ?? '',
      'Sana': formatDate(new Date(s.createdAt)),
      'Vaqt': formatTime(new Date(s.createdAt)),
      'Kim oldi': kimOldi,
      'Nima oldi': nimaSotildi,
      'Qop': s.quantity,
      'Jami ($)': fmt(s.totalAmount),
      "To'ladi ($)": fmt(s.paidAmount),
      'Qarz ($)': qarz > 0 ? fmt(qarz) : '',
      'Haydovchi': s.driver?.name ?? '—',
      'Valyuta': s.currency,
      'Sotuvchi': s.user?.name ?? '',
    };
  });

  return rows;
}

// ── SHEET 5: Haydovchi (Driver) ───────────────────────────────────────────────
async function buildHaydovchiSheet(): Promise<Record<string, any>[]> {
  const { start, end } = todayRange();
  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { totalAmount: true, quantity: true, driver: { select: { name: true } }, customer: { select: { name: true } }, manualCustomerName: true },
  });

  const dmap = new Map<string, { count: number; amount: number; qop: number; mijozlar: Set<string> }>();
  for (const s of sales) {
    const key = s.driver?.name ?? '— Haydovchisiz (o\'zi oldi) —';
    if (!dmap.has(key)) dmap.set(key, { count: 0, amount: 0, qop: 0, mijozlar: new Set() });
    const d = dmap.get(key)!;
    d.count++;
    d.amount += s.totalAmount;
    d.qop += s.quantity ?? 0;
    d.mijozlar.add(s.customer?.name ?? s.manualCustomerName ?? "Noma'lum");
  }

  const rows = Array.from(dmap.entries())
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([name, d]) => ({
      'Haydovchi': name,
      'Yetkazdi (sotuv)': d.count,
      'Jami qiymati ($)': fmt(d.amount),
      'Jami qop': d.qop,
      'Mijozlar': Array.from(d.mijozlar).join(', '),
    }));

  if (rows.length > 0) {
    rows.push({
      'Haydovchi': '─── JAMI ───',
      'Yetkazdi (sotuv)': rows.reduce((s, r) => s + (Number(r['Yetkazdi (sotuv)']) || 0), 0),
      'Jami qiymati ($)': fmt(rows.reduce((s, r) => s + (Number(r['Jami qiymati ($)']) || 0), 0)),
      'Jami qop': rows.reduce((s, r) => s + (Number(r['Jami qop']) || 0), 0),
      'Mijozlar': '',
    });
  }
  return rows;
}

// ── SHEET 6: Mijozlar umumiy ──────────────────────────────────────────────────
async function buildMijozlarUmumiySheet(): Promise<Record<string, any>[]> {
  const customers = await prisma.customer.findMany({
    orderBy: { debtUSD: 'desc' },
    select: { id: true, name: true, phone: true, lastPurchase: true, lastPayment: true, balanceUSD: true, balanceUZS: true, debtUSD: true, debtUZS: true, category: true },
  });

  const rows = customers.map((c) => ({
    'Mijoz': c.name,
    'Telefon': c.phone,
    "So'nggi savdo": c.lastPurchase ? formatDate(new Date(c.lastPurchase)) : '—',
    "So'nggi to'lov": c.lastPayment ? formatDate(new Date(c.lastPayment)) : '—',
    'Balans (USD)': fmt(c.balanceUSD),
    'Balans (UZS)': fmt(c.balanceUZS, 0),
    'Qarz (USD)': c.debtUSD > 0 ? fmt(c.debtUSD) : '',
    'Qarz (UZS)': c.debtUZS > 0 ? fmt(c.debtUZS, 0) : '',
    'Kategoriya': c.category,
    'Holat': c.debtUSD > 500 ? '🔴 Katta qarz' : c.debtUSD > 0 ? '🟡 Qarz bor' : '🟢 Toza',
  }));

  return rows;
}

// ── SHEET 7: Qarz Eskirish (Aging Report) ────────────────────────────────────
async function buildAgingSheet(): Promise<Record<string, any>[]> {
  const now = new Date();
  const unpaidSales = await prisma.sale.findMany({
    where: { totalAmount: { gt: 0 } },
    select: { createdAt: true, totalAmount: true, paidAmount: true, customer: { select: { id: true, name: true } }, manualCustomerName: true },
  });

  const cmap = new Map<string, { name: string; d30: number; d60: number; d90: number; d120: number; over120: number }>();
  for (const s of unpaidSales) {
    const debt = Math.max(0, s.totalAmount - s.paidAmount);
    if (debt < 0.01) continue;
    const key   = s.customer?.id ?? (s.manualCustomerName ?? 'unknown');
    const name  = s.customer?.name ?? s.manualCustomerName ?? "Noma'lum";
    const days  = Math.floor((now.getTime() - new Date(s.createdAt).getTime()) / 86400000);
    if (!cmap.has(key)) cmap.set(key, { name, d30: 0, d60: 0, d90: 0, d120: 0, over120: 0 });
    const e = cmap.get(key)!;
    if (days <= 30) e.d30 += debt;
    else if (days <= 60) e.d60 += debt;
    else if (days <= 90) e.d90 += debt;
    else if (days <= 120) e.d120 += debt;
    else e.over120 += debt;
  }

  const rows = Array.from(cmap.values())
    .map(c => ({ ...c, total: c.d30 + c.d60 + c.d90 + c.d120 + c.over120 }))
    .filter(c => c.total > 0.01)
    .sort((a, b) => b.total - a.total)
    .map(c => ({
      'Mijoz': c.name,
      'Jami qarz ($)': fmt(c.total),
      '0-30 kun': c.d30 > 0 ? fmt(c.d30) : '',
      '31-60 kun': c.d60 > 0 ? fmt(c.d60) : '',
      '61-90 kun': c.d90 > 0 ? fmt(c.d90) : '',
      '91-120 kun': c.d120 > 0 ? fmt(c.d120) : '',
      '120+ kun ⚠️': c.over120 > 0 ? fmt(c.over120) : '',
      'Xavf darajasi': c.over120 > 0 ? '🔴 Kritik' : c.d90 > 0 ? '🟡 Diqqat' : '🟢 Normal',
    }));

  if (rows.length > 0) {
    const sum = (key: string) => fmt(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));
    rows.push({
      'Mijoz': '─── JAMI ───',
      'Jami qarz ($)': sum('Jami qarz ($)'),
      '0-30 kun': sum('0-30 kun'),
      '31-60 kun': sum('31-60 kun'),
      '61-90 kun': sum('61-90 kun'),
      '91-120 kun': sum('91-120 kun'),
      '120+ kun ⚠️': sum('120+ kun ⚠️'),
      'Xavf darajasi': `${rows.length} ta mijoz`,
    });
  }
  return rows;
}

// ── SHEET 8: ABC Analiz ───────────────────────────────────────────────────────
async function buildABCSheet(): Promise<Record<string, any>[]> {
  const since = new Date(); since.setDate(since.getDate() - 30);

  const custSales = await prisma.sale.groupBy({
    by: ['customerId'],
    where: { createdAt: { gte: since }, customerId: { not: null } },
    _sum: { totalAmount: true },
    orderBy: { _sum: { totalAmount: 'desc' } },
  });

  const ids = custSales.map(s => s.customerId).filter(Boolean) as string[];
  const customers = await prisma.customer.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const custMap = new Map(customers.map(c => [c.id, c.name]));

  const totalRev = custSales.reduce((s, c) => s + (c._sum.totalAmount ?? 0), 0);
  let cumulative = 0;

  return custSales
    .filter(c => c.customerId && (c._sum.totalAmount ?? 0) > 0)
    .map((c, i) => {
      const amount = c._sum.totalAmount ?? 0;
      const share  = totalRev > 0 ? (amount / totalRev) * 100 : 0;
      cumulative  += share;
      const group  = cumulative <= 80 ? 'A ⭐' : cumulative <= 95 ? 'B' : 'C';
      return {
        'Rank': i + 1,
        'Mijoz': custMap.get(c.customerId!) ?? "Noma'lum",
        'Savdo 30 kun ($)': fmt(amount),
        'Ulush (%)': fmt(share, 1),
        'Kumulyativ (%)': fmt(cumulative, 1),
        'Guruh': group,
        'Tavsif': group.startsWith('A') ? 'VIP — asosiy mijoz' : group === 'B' ? "O'rta — muhim" : 'Kichik',
      };
    });
}

// ── SHEET 9+: Mijoz shaxsiy ───────────────────────────────────────────────────
async function buildMijozShaxsiyRows(customerId: string) {
  const [sales, payments] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId },
      select: { id: true, receiptNumber: true, createdAt: true, quantity: true, totalAmount: true, paidAmount: true, product: { select: { name: true } }, items: { select: { quantity: true, product: { select: { name: true } }, variant: { select: { variantName: true } } } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.payment.findMany({
      where: { customerId },
      select: { id: true, amount: true, currency: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  type Row = | { type: 'savdo'; date: Date; data: typeof sales[0] } | { type: 'tulov'; date: Date; data: typeof payments[0] };
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
      if (s.items?.length > 0) nimaSotildi = s.items.map((it: any) => it.product?.name ?? it.variant?.variantName ?? "Noma'lum").join(', ');
      else nimaSotildi = s.product?.name ?? "Noma'lum";
      const qarz = Math.max(0, s.totalAmount - s.paidAmount);
      balance -= qarz;
      rows.push({ 'Turi': '🛍 Savdo', 'Sana': formatDate(ev.date), 'Vaqt': formatTime(ev.date), 'Nima / Izoh': nimaSotildi, 'Qop': s.quantity, 'Jami ($)': fmt(s.totalAmount), "To'ladi ($)": fmt(s.paidAmount), 'Qarz ($)': qarz > 0 ? fmt(qarz) : '', 'Joriy balans ($)': fmt(balance) });
    } else {
      const p = ev.data as typeof payments[0];
      balance += p.amount;
      rows.push({ 'Turi': "💵 To'lov", 'Sana': formatDate(ev.date), 'Vaqt': formatTime(ev.date), 'Nima / Izoh': p.currency, 'Qop': '', 'Jami ($)': '', "To'ladi ($)": '', 'Qarz ($)': '', 'Joriy balans ($)': fmt(balance) });
    }
  }
  return rows;
}

// ── Kassa data ─────────────────────────────────────────────────────────────────
async function buildKassaData(date: Date) {
  const { start, end } = todayRange();
  const shift = await prisma.cashierShift.findFirst({ where: { startTime: { gte: start, lte: end } }, orderBy: { startTime: 'asc' }, select: { openingBalance: true } });
  const openingUZS = shift?.openingBalance ?? 0;

  const [sales, expenses] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: start, lte: end }, paidAmount: { gt: 0 } }, select: { id: true, receiptNumber: true, createdAt: true, paidAmount: true, currency: true, paymentMethod: true, paymentDetails: true, manualCustomerName: true, customer: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.expense.findMany({ where: { createdAt: { gte: start, lte: end } }, select: { id: true, amount: true, currency: true, description: true, category: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
  ]);

  function parseSaleAmounts(s: typeof sales[0]): { uzs: number; usd: number; card: number } {
    const method = (s.paymentMethod ?? 'CASH').toUpperCase();
    if (method === 'CARD' || method === 'CLICK') return { uzs: 0, usd: 0, card: s.paidAmount };
    if (s.paymentDetails) {
      try { const pd = JSON.parse(s.paymentDetails); const uzs = Number(pd.uzs) || 0; const usd = Number(pd.usd) || 0; if (uzs > 0 || usd > 0) return { uzs, usd, card: 0 }; } catch {}
    }
    return (s.currency ?? '').toUpperCase() === 'UZS' ? { uzs: s.paidAmount, usd: 0, card: 0 } : { uzs: 0, usd: s.paidAmount, card: 0 };
  }

  type KassaEvent = { isKirim: boolean; date: Date; turi: string; sabab: string; qayerdan: string; uzs: number; usd: number; card: number; category: string };

  const events: KassaEvent[] = [
    ...sales.map((s) => { const { uzs, usd, card } = parseSaleAmounts(s); return { isKirim: true, date: new Date(s.createdAt), turi: 'Sotuv', sabab: `Sotuv #${s.receiptNumber ?? s.id.slice(0, 8)}`, qayerdan: s.customer?.name ?? s.manualCustomerName ?? 'Naqd mijoz', uzs, usd, card, category: 'SALE' }; }),
    ...expenses.map((e) => { const curr = (e.currency ?? 'UZS').toUpperCase(); return { isKirim: false, date: new Date(e.createdAt), turi: EXPENSE_LABELS[e.category] ?? e.category, sabab: e.description, qayerdan: EXPENSE_LABELS[e.category] ?? e.category, uzs: curr === 'UZS' ? e.amount : 0, usd: curr === 'USD' ? e.amount : 0, card: 0, category: e.category }; }),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  function makeRow(turi: string, sabab: string, qayerdan: string, rowDate: Date, rowTime: Date, direction: string, uzs: number | string, usd: number | string, card: number | string, balUZS: number, balUSD: number, balCard: number): Record<string, any> {
    return { 'Turi': turi, 'Sababi': sabab, 'Qayerdan / Kimdan': qayerdan, 'Sana': formatDate(rowDate), 'Vaqt': formatTime(rowTime), 'Kirgan/Chiqgan': direction, 'UZS': uzs, '$': usd, 'Karta': card, "Kassa UZS": balUZS, "Kassa $": balUSD, "Kassa Karta": balCard };
  }

  let balUZS = openingUZS, balUSD = 0, balCard = 0;
  const allRows: Record<string, any>[] = [makeRow("Kun boshi qoldig'i", 'Kun boshlanganda kassadagi pul', '', date, new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0), '—', '', '', '', balUZS, balUSD, balCard)];
  const kirimRows: Record<string, any>[] = [];
  const chiqimRows: Record<string, any>[] = [];
  const categoryMap = new Map<string, Record<string, any>[]>();

  for (const ev of events) {
    if (ev.isKirim) { balUZS += ev.uzs; balUSD += ev.usd; balCard += ev.card; }
    else { balUZS -= ev.uzs; balUSD -= ev.usd; balCard -= ev.card; }
    const row = makeRow(ev.turi, ev.sabab, ev.qayerdan, ev.date, ev.date, ev.isKirim ? 'Kirdi ▲' : 'Chiqdi ▼', ev.uzs || '', ev.usd || '', ev.card || '', balUZS, balUSD, balCard);
    allRows.push(row);
    if (ev.isKirim) kirimRows.push(row);
    else { chiqimRows.push(row); if (!categoryMap.has(ev.category)) categoryMap.set(ev.category, []); categoryMap.get(ev.category)!.push(row); }
  }

  return { allRows, kirimRows, chiqimRows, categoryMap };
}

// ── Main export function ──────────────────────────────────────────────────────
export async function generateDailyExcelBackup(): Promise<{ buffer: Buffer; filename: string }> {
  ensureBackupDir();
  const now = new Date();
  const wb = XLSX.utils.book_new();

  // All sheet names for Cover
  const sheetList = [
    'KPI — Bugungi ko\'rsatkichlar',
    'Ogohlantirishlar (Alerts)',
    'Ombor — Mahsulotlar holati',
    'Sotuvlar',
    'Haydovchi hisoboti',
    'Mijozlar umumiy',
    'Qarz eskirish (Aging)',
    'ABC Analiz (30 kun)',
    'Kassa — Barcha harakatlar',
    'Kassa — Kirim',
    'Kassa — Chiqim',
    'Harajat turlari (alohida)',
    'Mijozlar tarixlari (alohida)',
  ];

  // ── 0: Muqova ──────────────────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(wb, buildMuqovaSheet(now, sheetList), 'Muqova');

  // ── 1: KPI ─────────────────────────────────────────────────────────────────
  try {
    const kpiWs = await buildKPISheet(now);
    XLSX.utils.book_append_sheet(wb, kpiWs, 'KPI');
  } catch (e) { console.error('KPI sheet error:', e); }

  // ── 2: Ogohlantirishlar ────────────────────────────────────────────────────
  try {
    const alertsData = await buildAlertsSheet();
    XLSX.utils.book_append_sheet(wb, makeSheet(alertsData), 'Ogohlantirishlar');
  } catch (e) { console.error('Alerts sheet error:', e); }

  // ── 3: Ombor ───────────────────────────────────────────────────────────────
  const omborData = await buildOmborSheet(now);
  XLSX.utils.book_append_sheet(wb, makeSheet(omborData), 'Ombor');

  // ── 4: Sotuv ───────────────────────────────────────────────────────────────
  const sotuvData = await buildSotuvSheet(now);
  const sotuvWs = makeSheetWithTotal(sotuvData, ['Qop', 'Jami ($)', "To'ladi ($)", 'Qarz ($)']);
  XLSX.utils.book_append_sheet(wb, sotuvWs, 'Sotuvlar');

  // ── 5: Haydovchi ───────────────────────────────────────────────────────────
  try {
    const driverData = await buildHaydovchiSheet();
    XLSX.utils.book_append_sheet(wb, makeSheet(driverData), 'Haydovchi');
  } catch (e) { console.error('Driver sheet error:', e); }

  // ── 6: Mijozlar umumiy ─────────────────────────────────────────────────────
  const mijozData = await buildMijozlarUmumiySheet();
  const mijozWs = makeSheetWithTotal(mijozData, ['Balans (USD)', 'Balans (UZS)', 'Qarz (USD)', 'Qarz (UZS)']);
  XLSX.utils.book_append_sheet(wb, mijozWs, 'Mijozlar');

  // ── 7: Qarz Eskirish ───────────────────────────────────────────────────────
  try {
    const agingData = await buildAgingSheet();
    XLSX.utils.book_append_sheet(wb, makeSheet(agingData), 'Qarz Eskirish');
  } catch (e) { console.error('Aging sheet error:', e); }

  // ── 8: ABC Analiz ─────────────────────────────────────────────────────────
  try {
    const abcData = await buildABCSheet();
    XLSX.utils.book_append_sheet(wb, makeSheet(abcData), 'ABC Analiz');
  } catch (e) { console.error('ABC sheet error:', e); }

  // ── 9: Kassa ──────────────────────────────────────────────────────────────
  const kassaResult = await buildKassaData(now);
  XLSX.utils.book_append_sheet(wb, makeSheet(kassaResult.allRows), 'Kassa');
  XLSX.utils.book_append_sheet(wb, makeSheet(kassaResult.kirimRows.length ? kassaResult.kirimRows : [{}]), 'Kassa - Kirim');
  XLSX.utils.book_append_sheet(wb, makeSheet(kassaResult.chiqimRows.length ? kassaResult.chiqimRows : [{}]), 'Kassa - Chiqim');

  for (const [cat, rows] of kassaResult.categoryMap) {
    const label = EXPENSE_LABELS[cat] ?? cat;
    const sheetName = safeSheetName(`Harajat - ${label}`);
    let finalName = sheetName; let sfx = 2;
    while (wb.SheetNames.includes(finalName)) finalName = sheetName.slice(0, 28) + `_${sfx++}`;
    XLSX.utils.book_append_sheet(wb, makeSheet(rows), finalName);
  }

  // ── Mijoz shaxsiy sheets ───────────────────────────────────────────────────
  const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
  for (const cust of customers) {
    const rows = await buildMijozShaxsiyRows(cust.id);
    if (!rows.length) continue;
    const ws = XLSX.utils.aoa_to_sheet([[`Mijoz: ${cust.name}`]]);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Object.keys(rows[0]).length - 1 } }];
    if (ws['A1']) ws['A1'].s = { font: { bold: true, sz: 13, color: { rgb: '1F4E79' } }, alignment: { horizontal: 'center' } } as any;
    XLSX.utils.sheet_add_json(ws, rows, { origin: 'A2' });
    autoWidth(ws, rows);
    applyHeaderStyles(ws, Object.keys(rows[0]));
    let finalName = safeSheetName(cust.name); let suffix = 2;
    while (wb.SheetNames.includes(finalName)) finalName = safeSheetName(cust.name).slice(0, 28) + `_${suffix++}`;
    XLSX.utils.book_append_sheet(wb, ws, finalName);
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', bookSST: false }) as Buffer;
  const dateStr = now.toISOString().slice(0, 10);
  const filename = `hisobot_${dateStr}.xlsx`;
  fs.writeFileSync(path.join(BACKUP_DIR, filename), buffer);

  return { buffer, filename };
}

export function getTodayBackupPath(): string | null {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filePath = path.join(BACKUP_DIR, `hisobot_${dateStr}.xlsx`);
  return fs.existsSync(filePath) ? filePath : null;
}
