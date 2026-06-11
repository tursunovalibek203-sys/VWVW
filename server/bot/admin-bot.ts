import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../utils/prisma';
import { generateDailyExcelBackup } from '../utils/daily-excel-backup';

let adminBot: TelegramBot | null = null;

function getAdminChatIds(): number[] {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_ID ?? '';
  return raw.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
}

let dailySchedulerTimer: NodeJS.Timeout | null = null;

function startDailyScheduler() {
  if (dailySchedulerTimer) clearTimeout(dailySchedulerTimer);
  function scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setHours(19, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - now.getTime();
    dailySchedulerTimer = setTimeout(async () => {
      try { await sendExcelBackupToAdmins('🕖 Kunlik avtomatik hisobot (19:00)'); }
      catch (err) { console.error('❌ Kunlik hisobot xatolik:', err); }
      scheduleNext();
    }, delay);
    console.log(`⏰ Kunlik hisobot scheduler: ${Math.round(delay / 60000)} daqiqadan keyin`);
  }
  scheduleNext();
}

export async function sendExcelBackupToAdmins(caption = '📊 Kunlik hisobot') {
  const adminIds = getAdminChatIds();
  if (!adminIds.length) { console.warn('⚠️ TELEGRAM_ADMIN_CHAT_ID topilmadi'); return; }
  const { buffer, filename } = await generateDailyExcelBackup();
  for (const chatId of adminIds) {
    try {
      await adminBot?.sendDocument(
        chatId, buffer,
        { caption, parse_mode: 'Markdown' },
        { filename, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
    } catch (err: any) {
      console.error(`❌ ${chatId} ga yuborishda xatolik:`, err.message);
    }
  }
}

export function initAdminBot() {
  const token = process.env.TELEGRAM_ADMIN_BOT_TOKEN;
  if (!token) { console.log('⚠️ Admin bot token topilmadi'); return null; }
  try {
    adminBot = new TelegramBot(token, { polling: { interval: 2000, autoStart: true, params: { timeout: 10 } } });
    adminBot.on('polling_error', (e: any) => console.error('⚠️ Bot polling:', e.message));
    adminBot.on('error', (e: any) => console.error('⚠️ Bot xatolik:', e.message));
    setupCommands();
    startDailyScheduler();
    console.log('👑 Admin Bot ishga tushdi! (kunlik 19:00 da hisobot)');
    return adminBot;
  } catch (err: any) {
    console.error('❌ Admin Bot xatolik:', err.message);
    return null;
  }
}

// ─── Klaviatura ───────────────────────────────────────────────────────────────

const MAIN_KB = {
  keyboard: [
    [{ text: '⚡ Qisqa hisobot' }],
    [{ text: '🖥️ Tizim holati' },   { text: '👥 Foydalanuvchilar' }],
    [{ text: '💰 Sotuvlar' },        { text: '📦 Buyurtmalar' }],
    [{ text: '🚚 Haydovchilar' },    { text: '💳 Kassa' }],
    [{ text: '📊 Statistika' },      { text: '📈 Foyda/Zarar' }],
    [{ text: '🏭 Ishlab chiqarish' }, { text: '📋 Hisobot yuborish' }],
    [{ text: '💾 Zaxira' },          { text: '⚙️ Sozlamalar' }],
    [{ text: '📋 Loglar' },          { text: '❓ Yordam' }],
  ],
  resize_keyboard: true,
};

// ─── Komandalar ───────────────────────────────────────────────────────────────

function setupCommands() {
  if (!adminBot) return;

  adminBot.onText(/\/start/, (msg) => {
    adminBot?.sendMessage(msg.chat.id,
      `👑 *ADMIN BOSHQARUV BOTI*\n\n` +
      `Barcha bo'limlar haqiqiy ma'lumotlar bilan ishlaydi.\n` +
      `⏰ Kunlik Excel hisobot: *19:00* da avtomatik yuboriladi.`,
      { parse_mode: 'Markdown', reply_markup: MAIN_KB }
    );
  });

  adminBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ?? '';
    const handlers: Record<string, () => Promise<void>> = {
      '⚡ Qisqa hisobot':    () => handleQuickSummary(chatId),
      '/q':                   () => handleQuickSummary(chatId),
      '🖥️ Tizim holati':     () => handleSystem(chatId),
      '/system':              () => handleSystem(chatId),
      '👥 Foydalanuvchilar': () => handleUsers(chatId),
      '/users':               () => handleUsers(chatId),
      '💰 Sotuvlar':         () => handleSales(chatId),
      '/sales':               () => handleSales(chatId),
      '📦 Buyurtmalar':      () => handleOrders(chatId),
      '/orders':              () => handleOrders(chatId),
      '🚚 Haydovchilar':     () => handleDrivers(chatId),
      '/drivers':             () => handleDrivers(chatId),
      '💳 Kassa':            () => handleCashbox(chatId),
      '/cashbox':             () => handleCashbox(chatId),
      '📊 Statistika':       () => handleStats(chatId),
      '/stats':               () => handleStats(chatId),
      '📈 Foyda/Zarar':      () => handleProfitLoss(chatId),
      '/profit':              () => handleProfitLoss(chatId),
      '🏭 Ishlab chiqarish': () => handleProduction(chatId),
      '/production':          () => handleProduction(chatId),
      '📋 Hisobot yuborish': () => handleSendReport(chatId),
      '/report':              () => handleSendReport(chatId),
      '💾 Zaxira':           () => handleBackup(chatId),
      '/backup':              () => handleBackup(chatId),
      '⚙️ Sozlamalar':       () => handleSettings(chatId),
      '/settings':            () => handleSettings(chatId),
      '📋 Loglar':           () => handleLogs(chatId),
      '/logs':                () => handleLogs(chatId),
      '❓ Yordam':           () => handleHelp(chatId),
      '/help':                () => handleHelp(chatId),
    };
    if (handlers[text]) await handlers[text]().catch(() => adminBot?.sendMessage(chatId, '❌ Xatolik'));
  });

  adminBot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const data = query.data;
    if (!chatId || !data) return;
    try {
      if (data === 'quick_refresh') {
        await adminBot?.answerCallbackQuery(query.id, { text: 'Yangilanmoqda...' });
        await handleQuickSummary(chatId);
      } else if (data === 'admin_backup_create' || data === 'report_now') {
        await adminBot?.answerCallbackQuery(query.id, { text: 'Tayyorlanmoqda...' });
        await handleSendReport(chatId);
      } else if (data === 'system_refresh') {
        await adminBot?.answerCallbackQuery(query.id, { text: 'Yangilanmoqda...' });
        await handleSystem(chatId);
      } else if (data === 'sales_today') {
        await adminBot?.answerCallbackQuery(query.id, { text: '' });
        await handleSales(chatId);
      } else if (data.startsWith('prod_page_')) {
        const page = parseInt(data.replace('prod_page_', ''));
        await adminBot?.answerCallbackQuery(query.id, { text: '' });
        await handleProductionPage(chatId, page);
      } else if (data.startsWith('orders_status_')) {
        const status = data.replace('orders_status_', '');
        await adminBot?.answerCallbackQuery(query.id, { text: '' });
        await handleOrdersByStatus(chatId, status);
      } else if (data === 'profit_month') {
        await adminBot?.answerCallbackQuery(query.id, { text: '' });
        await handleProfitLoss(chatId, 'month');
      } else if (data === 'profit_week') {
        await adminBot?.answerCallbackQuery(query.id, { text: '' });
        await handleProfitLoss(chatId, 'week');
      } else if (data === 'profit_today') {
        await adminBot?.answerCallbackQuery(query.id, { text: '' });
        await handleProfitLoss(chatId, 'today');
      } else {
        await adminBot?.answerCallbackQuery(query.id, { text: 'Bajarildi!' });
      }
    } catch (err) {
      console.error('Callback xatolik:', err);
    }
  });
}

// ─── Yordamchi ────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2) { return n.toFixed(decimals); }
function fmtDate(d: Date) { return d.toLocaleDateString('uz-UZ'); }
function fmtTime(d: Date) { return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }); }
function fmtDT(d: Date) { return `${fmtDate(d)} ${fmtTime(d)}`; }

function todayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function weekStart() { const d = new Date(); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d; }
function monthStart() { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; }

function send(chatId: number, text: string, extra?: any) {
  return adminBot?.sendMessage(chatId, text, { parse_mode: 'Markdown', ...extra });
}

// ─── 1. Tizim holati ──────────────────────────────────────────────────────────

async function handleSystem(chatId: number) {
  const [users, sales, products, orders, customers, batches] = await Promise.all([
    prisma.user.count(),
    prisma.sale.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.customer.count(),
    prisma.batch.count(),
  ]);
  const mem = process.memoryUsage();
  const uptime = Math.round(process.uptime() / 3600);
  await send(chatId,
    `🖥️ *TIZIM HOLATI*\n\n` +
    `📊 *Ma'lumotlar bazasi:*\n` +
    `• Foydalanuvchilar: ${users} ta\n` +
    `• Mijozlar: ${customers} ta\n` +
    `• Mahsulotlar: ${products} ta\n` +
    `• Sotuvlar: ${sales} ta\n` +
    `• Buyurtmalar: ${orders} ta\n` +
    `• Partiyalar (ishlab chiqarish): ${batches} ta\n\n` +
    `💾 *Server:*\n` +
    `• RAM: ${Math.round(mem.heapUsed / 1024 / 1024)} MB\n` +
    `• Ishlash vaqti: ${uptime} soat\n` +
    `• Holat: ✅ Faol`,
    { reply_markup: { inline_keyboard: [
      [{ text: '🔄 Yangilash', callback_data: 'system_refresh' }],
      [{ text: '📊 Excel hisobot', callback_data: 'admin_backup_create' }],
    ]}}
  );
}

// ─── 2. Foydalanuvchilar ──────────────────────────────────────────────────────

async function handleUsers(chatId: number) {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  const roleIcons: Record<string, string> = {
    ADMIN: '👑', SELLER: '🛒', CASHIER: '💰', WAREHOUSE_MANAGER: '🏭', DRIVER: '🚚', ACCOUNTANT: '📊'
  };
  let msg = `👥 *FOYDALANUVCHILAR* (${users.length} ta)\n\n`;
  users.forEach((u, i) => {
    msg += `${i + 1}. ${roleIcons[u.role] ?? '👤'} *${u.name}*\n`;
    msg += `   🔑 Login: \`${u.login}\`\n`;
    msg += `   🎭 Rol: ${u.role}\n`;
    msg += `   ${u.active ? '✅ Faol' : '❌ Nofaol'}\n\n`;
  });
  await send(chatId, msg);
}

// ─── 3. Sotuvlar ─────────────────────────────────────────────────────────────

async function handleSales(chatId: number) {
  const start = todayStart();

  const [todaySales, totalPaid, totalDebt, topCustomers, topProducts, recentSales] = await Promise.all([
    prisma.sale.count({ where: { createdAt: { gte: start } } }),
    prisma.sale.aggregate({ _sum: { paidAmount: true }, where: { createdAt: { gte: start } } }),
    prisma.sale.aggregate({ _sum: { totalAmount: true, paidAmount: true }, where: { createdAt: { gte: start } } }),
    prisma.sale.groupBy({
      by: ['customerId'], _sum: { totalAmount: true },
      where: { createdAt: { gte: start }, customerId: { not: null } },
      orderBy: { _sum: { totalAmount: 'desc' } }, take: 5,
    }),
    prisma.saleItem.groupBy({
      by: ['productId'], _sum: { quantity: true },
      where: { sale: { createdAt: { gte: start } }, productId: { not: null } },
      orderBy: { _sum: { quantity: 'desc' } }, take: 5,
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: start } },
      select: { receiptNumber: true, totalAmount: true, paidAmount: true, createdAt: true,
        customer: { select: { name: true } }, manualCustomerName: true },
      orderBy: { createdAt: 'desc' }, take: 5,
    }),
  ]);

  const jami = totalDebt._sum.totalAmount ?? 0;
  const tulangan = totalDebt._sum.paidAmount ?? 0;
  const qarz = Math.max(0, jami - tulangan);

  // Top customers
  const custIds = topCustomers.map((c) => c.customerId!).filter(Boolean);
  const custs = await prisma.customer.findMany({ where: { id: { in: custIds } }, select: { id: true, name: true } });
  const custMap = new Map(custs.map((c) => [c.id, c.name]));

  // Top products
  const prodIds = topProducts.map((p) => p.productId!).filter(Boolean);
  const prods = await prisma.product.findMany({ where: { id: { in: prodIds } }, select: { id: true, name: true } });
  const prodMap = new Map(prods.map((p) => [p.id, p.name]));

  let msg = `💰 *SOTUVLAR* — ${fmtDate(new Date())}\n\n`;
  msg += `📊 *Bugungi natija:*\n`;
  msg += `• Sotuvlar soni: ${todaySales} ta\n`;
  msg += `• Jami sotuv: $${fmt(jami)}\n`;
  msg += `• Tulangan: $${fmt(tulangan)}\n`;
  msg += `• Qarz: $${fmt(qarz)}\n\n`;

  if (topCustomers.length) {
    msg += `🏆 *Top mijozlar (bugun):*\n`;
    topCustomers.forEach((c, i) => {
      msg += `${i + 1}. ${custMap.get(c.customerId!) ?? 'Noma\'lum'} — $${fmt(c._sum.totalAmount ?? 0)}\n`;
    });
    msg += '\n';
  }

  if (topProducts.length) {
    msg += `📦 *Top mahsulotlar (bugun):*\n`;
    topProducts.forEach((p, i) => {
      msg += `${i + 1}. ${prodMap.get(p.productId!) ?? 'Noma\'lum'} — ${p._sum.quantity ?? 0} qop\n`;
    });
    msg += '\n';
  }

  if (recentSales.length) {
    msg += `🕐 *Oxirgi sotuvlar:*\n`;
    recentSales.forEach((s) => {
      const who = s.customer?.name ?? s.manualCustomerName ?? 'Naqd';
      msg += `• #${s.receiptNumber ?? '—'} | ${who} | $${fmt(s.totalAmount)} | ${fmtTime(new Date(s.createdAt))}\n`;
    });
  }

  await send(chatId, msg, { reply_markup: { inline_keyboard: [
    [{ text: '📊 Excel hisobot', callback_data: 'admin_backup_create' }],
    [{ text: '🔄 Yangilash', callback_data: 'sales_today' }],
  ]}});
}

// ─── 4. Buyurtmalar ───────────────────────────────────────────────────────────

async function handleOrders(chatId: number) {
  const statusGroups = await prisma.order.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  const statusLabels: Record<string, string> = {
    PENDING: '⏳ Kutilmoqda',
    CONFIRMED: '✅ Tasdiqlangan',
    IN_PRODUCTION: '🏭 Ishlab chiqarishda',
    READY: '📦 Tayyor',
    SOLD: '💰 Sotildi',
    DELIVERED: '🚚 Yetkazildi',
    CANCELLED: '❌ Bekor',
  };

  let msg = `📦 *BUYURTMALAR HOLATI*\n\n`;
  for (const g of statusGroups) {
    msg += `${statusLabels[g.status] ?? g.status}: ${g._count.status} ta\n`;
  }

  const recent = await prisma.order.findMany({
    take: 8,
    orderBy: { createdAt: 'desc' },
    select: {
      orderNumber: true, status: true, createdAt: true,
      customer: { select: { name: true } },
      items: { select: { quantity: true, product: { select: { name: true } } }, take: 1 },
    },
  });

  if (recent.length) {
    msg += `\n📋 *Oxirgi 8 buyurtma:*\n`;
    for (const o of recent) {
      const firstItem = o.items[0];
      const label = statusLabels[o.status]?.split(' ')[0] ?? '?';
      msg += `• ${label} *#${o.orderNumber}* | ${o.customer?.name ?? '—'}\n`;
      if (firstItem) msg += `  └ ${firstItem.product?.name ?? '?'} × ${firstItem.quantity}\n`;
      msg += `  └ ${fmtDate(new Date(o.createdAt))}\n`;
    }
  }

  const kb = Object.keys(statusLabels).map((s) => [{ text: `${statusLabels[s]}`, callback_data: `orders_status_${s}` }]);
  await send(chatId, msg, { reply_markup: { inline_keyboard: [
    ...kb,
    [{ text: '📊 Excel hisobot', callback_data: 'admin_backup_create' }],
  ]}});
}

async function handleOrdersByStatus(chatId: number, status: string) {
  const orders = await prisma.order.findMany({
    where: { status },
    take: 15,
    orderBy: { createdAt: 'desc' },
    select: {
      orderNumber: true, status: true, createdAt: true,
      customer: { select: { name: true, phone: true } },
      items: { select: { quantity: true, product: { select: { name: true } } } },
    },
  });

  const statusLabels: Record<string, string> = {
    PENDING: '⏳', CONFIRMED: '✅', IN_PRODUCTION: '🏭',
    READY: '📦', SOLD: '💰', DELIVERED: '🚚', CANCELLED: '❌',
  };

  let msg = `📦 *${statusLabels[status] ?? ''} ${status} — Buyurtmalar* (${orders.length} ta)\n\n`;
  for (const o of orders) {
    msg += `*#${o.orderNumber}* — ${o.customer?.name ?? '—'} (${o.customer?.phone ?? ''})\n`;
    o.items.forEach((it) => { msg += `  • ${it.product?.name ?? '?'} × ${it.quantity}\n`; });
    msg += `  📅 ${fmtDate(new Date(o.createdAt))}\n\n`;
  }
  if (!orders.length) msg += 'Bu holatda buyurtmalar yo\'q.';
  await send(chatId, msg, { reply_markup: { inline_keyboard: [
    [{ text: '⬅️ Orqaga', callback_data: 'back_orders' }],
  ]}});
}

// ─── 5. Haydovchilar ──────────────────────────────────────────────────────────

async function handleDrivers(chatId: number) {
  const drivers = await prisma.driver.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, phone: true, vehicleNumber: true, status: true, totalDeliveries: true, rating: true },
  });

  const statusIcon = (s: string) => s === 'AVAILABLE' ? '🟢' : s === 'BUSY' ? '🟡' : '⚫';
  const statusLabel = (s: string) => s === 'AVAILABLE' ? 'Bo\'sh' : s === 'BUSY' ? 'Band' : 'Offline';

  const available = drivers.filter((d) => d.status === 'AVAILABLE').length;
  const busy = drivers.filter((d) => d.status === 'BUSY').length;

  let msg = `🚚 *HAYDOVCHILAR* (${drivers.length} ta)\n\n`;
  msg += `🟢 Bo'sh: ${available} | 🟡 Band: ${busy} | ⚫ Offline: ${drivers.length - available - busy}\n\n`;

  for (const d of drivers) {
    msg += `${statusIcon(d.status)} *${d.name}*\n`;
    msg += `  📞 ${d.phone} | 🚗 ${d.vehicleNumber ?? '—'}\n`;
    msg += `  📦 Yetkazmalar: ${d.totalDeliveries} | ⭐ ${fmt(d.rating ?? 0, 1)}\n`;
    msg += `  Holat: ${statusLabel(d.status)}\n\n`;
  }
  if (!drivers.length) msg += 'Hozircha haydovchilar yo\'q.';

  // Bugungi yetkazmalar
  const start = todayStart();
  const todayDeliveries = await prisma.deliveryAssignment.count({ where: { assignedAt: { gte: start } } }).catch(() => 0);
  msg += `📦 Bugungi topshiriqlar: ${todayDeliveries} ta`;

  await send(chatId, msg);
}

// ─── 6. Kassa ────────────────────────────────────────────────────────────────

async function handleCashbox(chatId: number) {
  const start = todayStart();

  const [salesAgg, expensesAgg, shift] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { paidAmount: true, totalAmount: true },
      where: { createdAt: { gte: start } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: start } },
    }),
    prisma.cashierShift.findFirst({
      where: { startTime: { gte: start } },
      orderBy: { startTime: 'asc' },
      select: { openingBalance: true, closingBalance: true, startTime: true, status: true },
    }),
  ]);

  const kirim = salesAgg._sum.paidAmount ?? 0;
  const chiqim = expensesAgg._sum.amount ?? 0;
  const ochilish = shift?.openingBalance ?? 0;
  const hozir = ochilish + kirim - chiqim;

  // Xarajat kategoriyalari
  const expCats = await prisma.expense.groupBy({
    by: ['category'], _sum: { amount: true },
    where: { createdAt: { gte: start } },
    orderBy: { _sum: { amount: 'desc' } },
  });

  let msg = `💳 *KASSA* — ${fmtDate(new Date())}\n\n`;
  msg += `🔓 Kun boshi: ${fmt(ochilish)} UZS\n`;
  msg += `📥 Kirim (sotuvlar): $${fmt(kirim)}\n`;
  msg += `📤 Chiqim (xarajatlar): ${fmt(chiqim)} UZS\n`;
  msg += `💰 Joriy balans: $${fmt(hozir)}\n\n`;

  if (shift) {
    msg += `⏰ Smena boshlanishi: ${fmtTime(new Date(shift.startTime))}\n`;
    msg += `📊 Smena holati: ${shift.status === 'OPEN' ? '✅ Ochiq' : '🔒 Yopiq'}\n\n`;
  }

  if (expCats.length) {
    msg += `📋 *Bugungi xarajatlar:*\n`;
    expCats.forEach((e) => {
      msg += `• ${e.category}: ${fmt(e._sum.amount ?? 0)} UZS\n`;
    });
  }

  await send(chatId, msg, { reply_markup: { inline_keyboard: [
    [{ text: '📊 Excel hisobot', callback_data: 'admin_backup_create' }],
  ]}});
}

// ─── 7. Statistika ───────────────────────────────────────────────────────────

async function handleStats(chatId: number) {
  const mStart = monthStart();

  const [totalSales, monthlySales, totalCustomers, products, topProducts] = await Promise.all([
    prisma.sale.aggregate({ _sum: { totalAmount: true, paidAmount: true } }),
    prisma.sale.aggregate({ _sum: { totalAmount: true, paidAmount: true }, where: { createdAt: { gte: mStart } } }),
    prisma.customer.count(),
    prisma.product.findMany({ select: { name: true, currentStock: true, minStockLimit: true } }),
    prisma.saleItem.groupBy({
      by: ['productId'], _sum: { quantity: true },
      where: { sale: { createdAt: { gte: mStart } }, productId: { not: null } },
      orderBy: { _sum: { quantity: 'desc' } }, take: 5,
    }),
  ]);

  const lowStock = products.filter((p) => p.currentStock <= p.minStockLimit);
  const prodIds = topProducts.map((p) => p.productId!).filter(Boolean);
  const prods = await prisma.product.findMany({ where: { id: { in: prodIds } }, select: { id: true, name: true } });
  const prodMap = new Map(prods.map((p) => [p.id, p.name]));

  let msg = `📊 *UMUMIY STATISTIKA*\n\n`;
  msg += `👥 Mijozlar: ${totalCustomers} ta\n`;
  msg += `📦 Mahsulotlar: ${products.length} ta\n`;
  msg += `⚠️ Kam qolgan: ${lowStock.length} ta\n\n`;

  msg += `💰 *Jami barcha vaqt:*\n`;
  msg += `• Sotuv: $${fmt(totalSales._sum.totalAmount ?? 0)}\n`;
  msg += `• Tulangan: $${fmt(totalSales._sum.paidAmount ?? 0)}\n`;
  const totalDebt = Math.max(0, (totalSales._sum.totalAmount ?? 0) - (totalSales._sum.paidAmount ?? 0));
  msg += `• Qarz: $${fmt(totalDebt)}\n\n`;

  msg += `📅 *Bu oy (${fmtDate(mStart)} — bugun):*\n`;
  msg += `• Sotuv: $${fmt(monthlySales._sum.totalAmount ?? 0)}\n`;
  msg += `• Tulangan: $${fmt(monthlySales._sum.paidAmount ?? 0)}\n\n`;

  if (topProducts.length) {
    msg += `🏆 *Bu oy top mahsulotlar:*\n`;
    topProducts.forEach((p, i) => {
      msg += `${i + 1}. ${prodMap.get(p.productId!) ?? '?'} — ${p._sum.quantity ?? 0} qop\n`;
    });
  }

  if (lowStock.length) {
    msg += `\n⚠️ *Kam qolgan mahsulotlar:*\n`;
    lowStock.slice(0, 5).forEach((p) => {
      msg += `• ${p.name}: ${p.currentStock} qop (min: ${p.minStockLimit})\n`;
    });
  }

  await send(chatId, msg, { reply_markup: { inline_keyboard: [
    [{ text: '📊 Excel hisobot', callback_data: 'admin_backup_create' }],
  ]}});
}

// ─── 8. Foyda / Zarar / Marja ─────────────────────────────────────────────────

async function handleProfitLoss(chatId: number, period: 'today' | 'week' | 'month' = 'today') {
  const periodStart = period === 'today' ? todayStart() : period === 'week' ? weekStart() : monthStart();
  const periodLabel = period === 'today' ? 'Bugun' : period === 'week' ? 'Oxirgi 7 kun' : 'Bu oy';

  const [salesAgg, expensesAgg, saleItems, productCosts] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { totalAmount: true, paidAmount: true },
      where: { createdAt: { gte: periodStart } },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: periodStart } },
    }),
    prisma.saleItem.findMany({
      where: { sale: { createdAt: { gte: periodStart } }, productId: { not: null } },
      select: { quantity: true, pricePerBag: true, productId: true },
    }),
    prisma.product.findMany({
      select: { id: true, name: true, productionCost: true, pricePerBag: true },
    }),
  ]);

  const costMap = new Map(productCosts.map((p) => [p.id, { name: p.name, cost: p.productionCost ?? 0, price: p.pricePerBag }]));

  // Mahsulot bo'yicha marja hisoblash
  type MarjaRow = { name: string; qty: number; revenue: number; cost: number; profit: number; margin: number };
  const marjaByProduct = new Map<string, MarjaRow>();

  for (const item of saleItems) {
    if (!item.productId) continue;
    const info = costMap.get(item.productId);
    if (!info) continue;
    const prev = marjaByProduct.get(item.productId) ?? { name: info.name, qty: 0, revenue: 0, cost: 0, profit: 0, margin: 0 };
    const rev = (item.pricePerBag ?? info.price) * item.quantity;
    const cost = info.cost * item.quantity;
    prev.qty += item.quantity;
    prev.revenue += rev;
    prev.cost += cost;
    prev.profit += (rev - cost);
    marjaByProduct.set(item.productId, prev);
  }

  // Marja hisoblash
  for (const [, row] of marjaByProduct) {
    row.margin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
  }

  const daromad = salesAgg._sum.totalAmount ?? 0;
  const tulangan = salesAgg._sum.paidAmount ?? 0;
  const xarajat = expensesAgg._sum.amount ?? 0;

  let totalRevenue = 0, totalCost = 0;
  for (const [, row] of marjaByProduct) { totalRevenue += row.revenue; totalCost += row.cost; }
  const grossProfit = totalRevenue - totalCost;
  const netProfit = grossProfit - xarajat;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  let msg = `📈 *FOYDA/ZARAR/MARJA* — ${periodLabel}\n\n`;
  msg += `💵 *Asosiy ko'rsatkichlar:*\n`;
  msg += `• Jami sotuv: $${fmt(daromad)}\n`;
  msg += `• Tulangan: $${fmt(tulangan)}\n`;
  msg += `• Tan narxi (jami): $${fmt(totalCost)}\n`;
  msg += `• Xarajatlar: ${fmt(xarajat)} UZS\n\n`;
  msg += `📊 *Foyda:*\n`;
  msg += `• Yalpi foyda: $${fmt(grossProfit)} (${fmt(grossMargin, 1)}%)\n`;
  msg += `• Sof foyda: $${fmt(netProfit)} (${fmt(netMargin, 1)}%)\n`;
  msg += `• ${netProfit >= 0 ? '✅ Foydada' : '❌ Zararda'}\n\n`;

  if (marjaByProduct.size > 0) {
    const sorted = [...marjaByProduct.values()].sort((a, b) => b.profit - a.profit);
    msg += `📦 *Mahsulot bo'yicha marja:*\n`;
    for (const row of sorted.slice(0, 8)) {
      const icon = row.margin >= 30 ? '🟢' : row.margin >= 15 ? '🟡' : '🔴';
      msg += `${icon} *${row.name}*\n`;
      msg += `   ${row.qty} qop | $${fmt(row.revenue)} | foyda: $${fmt(row.profit)} | ${fmt(row.margin, 1)}%\n`;
    }
  }

  await send(chatId, msg, { reply_markup: { inline_keyboard: [
    [
      { text: '📅 Bugun', callback_data: 'profit_today' },
      { text: '📅 Hafta', callback_data: 'profit_week' },
      { text: '📅 Oy', callback_data: 'profit_month' },
    ],
    [{ text: '📊 Excel hisobot', callback_data: 'admin_backup_create' }],
  ]}});
}

// ─── 9. Ishlab chiqarish ──────────────────────────────────────────────────────

async function handleProduction(chatId: number) {
  await handleProductionPage(chatId, 0);
}

async function handleProductionPage(chatId: number, page: number) {
  const pageSize = 10;

  const [batches, total] = await Promise.all([
    prisma.batch.findMany({
      orderBy: { productionDate: 'desc' },
      skip: page * pageSize,
      take: pageSize,
      include: { product: { select: { name: true, currentStock: true } } },
    }),
    prisma.batch.count(),
  ]);

  // Bugungi ishlab chiqarish jami
  const start = todayStart();
  const todayBatches = await prisma.batch.findMany({
    where: { productionDate: { gte: start } },
    include: { product: { select: { name: true } } },
  });
  const todayTotal = todayBatches.reduce((s, b) => s + b.quantity, 0);

  // Bu oy
  const mBatches = await prisma.batch.aggregate({
    _sum: { quantity: true },
    where: { productionDate: { gte: monthStart() } },
  });

  let msg = `🏭 *ISHLAB CHIQARISH* (${total} ta partiya)\n\n`;
  msg += `📅 Bugun ishlab chiqarildi: *${todayTotal} qop*\n`;
  msg += `📅 Bu oy jami: *${mBatches._sum.quantity ?? 0} qop*\n\n`;

  if (todayBatches.length) {
    msg += `🕐 *Bugungi partiyalar:*\n`;
    for (const b of todayBatches) {
      msg += `• ${fmtTime(new Date(b.productionDate))} | *${b.product.name}* — ${b.quantity} qop\n`;
      msg += `  Smena: ${b.shift} | Mas'ul: ${b.responsiblePerson}\n`;
    }
    msg += '\n';
  }

  msg += `📋 *Oxirgi partiyalar (${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)}):*\n\n`;
  for (const b of batches) {
    msg += `📦 *${b.product.name}*\n`;
    msg += `   📅 ${fmtDate(new Date(b.productionDate))} ${fmtTime(new Date(b.productionDate))}\n`;
    msg += `   🔢 Miqdor: ${b.quantity} qop\n`;
    msg += `   🔄 Smena: ${b.shift}\n`;
    msg += `   👷 Mas'ul: ${b.responsiblePerson}\n`;
    msg += `   📦 Joriy zaxira: ${b.product.currentStock} qop\n\n`;
  }

  const totalPages = Math.ceil(total / pageSize);
  const navBtns: any[] = [];
  if (page > 0) navBtns.push({ text: '⬅️ Oldingi', callback_data: `prod_page_${page - 1}` });
  if (page < totalPages - 1) navBtns.push({ text: 'Keyingi ➡️', callback_data: `prod_page_${page + 1}` });

  const kb: any[] = [];
  if (navBtns.length) kb.push(navBtns);
  kb.push([{ text: '📊 Excel hisobot', callback_data: 'admin_backup_create' }]);

  await send(chatId, msg, { reply_markup: { inline_keyboard: kb } });
}

// ─── ⚡ Qisqa Hisobot ────────────────────────────────────────────────────────

async function handleQuickSummary(chatId: number) {
  const start = todayStart();
  const mStart = monthStart();

  const [
    salesToday, expToday, cashShift,
    totalDebt, totalDebtUZS,
    activeOrders, lowStockCount,
    todayBatchSum, unpaidSales,
    weekSales, monthSales,
    customerCount, driverBusy,
  ] = await Promise.all([
    // Bugungi sotuvlar
    prisma.sale.aggregate({
      _sum: { totalAmount: true, paidAmount: true },
      where: { createdAt: { gte: start } },
    }),
    // Bugungi xarajatlar
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { createdAt: { gte: start } },
    }),
    // Kassa smena
    prisma.cashierShift.findFirst({
      where: { startTime: { gte: start } },
      orderBy: { startTime: 'asc' },
      select: { openingBalance: true },
    }),
    // Jami mijozlar qarzi (USD) — raw SQL (telegramTopicId migration muammosi uchun)
    prisma.$queryRaw<[{ total: number }]>`SELECT COALESCE(SUM(debtUSD),0) as total FROM "Customer"`.then(r => ({ _sum: { debtUSD: r[0]?.total ?? 0 } })).catch(() => ({ _sum: { debtUSD: 0 } })),
    // Jami mijozlar qarzi (UZS)
    prisma.$queryRaw<[{ total: number }]>`SELECT COALESCE(SUM(debtUZS),0) as total FROM "Customer"`.then(r => ({ _sum: { debtUZS: r[0]?.total ?? 0 } })).catch(() => ({ _sum: { debtUZS: 0 } })),
    // Aktiv buyurtmalar
    prisma.order.count({
      where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
    }),
    // Kam qolgan mahsulotlar (raw SQL — cross-column comparison)
    prisma.$queryRaw<[{ cnt: bigint }]>`SELECT COUNT(*) as cnt FROM "Product" WHERE currentStock <= minStockLimit`
      .then((r) => Number(r[0]?.cnt ?? 0)).catch(() => 0),
    // Bugun ishlab chiqarildi
    prisma.batch.aggregate({
      _sum: { quantity: true },
      where: { productionDate: { gte: start } },
    }),
    // To'lanmagan sotuvlar soni
    prisma.sale.count({ where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } } }),
    // Oxirgi 7 kun sotuv
    prisma.sale.aggregate({
      _sum: { totalAmount: true, paidAmount: true },
      where: { createdAt: { gte: weekStart() } },
    }),
    // Bu oy sotuv
    prisma.sale.aggregate({
      _sum: { totalAmount: true, paidAmount: true },
      where: { createdAt: { gte: mStart } },
    }),
    // Mijozlar soni
    prisma.$queryRaw<[{ cnt: bigint }]>`SELECT COUNT(*) as cnt FROM "Customer"`.then(r => Number(r[0]?.cnt ?? 0)).catch(() => 0),
    // Band haydovchilar
    prisma.driver.count({ where: { status: 'BUSY' } }),
  ]);

  const todaySaleSum   = salesToday._sum.totalAmount ?? 0;
  const todayPaid      = salesToday._sum.paidAmount  ?? 0;
  const todaySaleDebt  = Math.max(0, todaySaleSum - todayPaid);
  const todayExpense   = expToday._sum.amount ?? 0;
  const openBal        = cashShift?.openingBalance ?? 0;
  const kassaJoriy     = openBal + todayPaid - todayExpense;
  const debtUSD        = totalDebt._sum.debtUSD  ?? 0;
  const debtUZS        = totalDebtUZS._sum.debtUZS ?? 0;
  const prodToday      = todayBatchSum._sum.quantity ?? 0;

  const weekTotal  = weekSales._sum.totalAmount  ?? 0;
  const weekPaid   = weekSales._sum.paidAmount   ?? 0;
  const monthTotal = monthSales._sum.totalAmount ?? 0;
  const monthPaid  = monthSales._sum.paidAmount  ?? 0;

  const now = new Date();
  const timeStr = fmtTime(now);
  const dateStr = fmtDate(now);

  const line = (icon: string, label: string, val: string) => `${icon} *${label}:* ${val}\n`;

  let msg = `⚡ *QISQA HISOBOT* — ${dateStr} ${timeStr}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  msg += `💳 *KASSA*\n`;
  msg += line('  🔓', 'Kun boshi', `${fmt(openBal)} UZS`);
  msg += line('  💰', 'Joriy balans', `${fmt(kassaJoriy)} UZS`);
  msg += '\n';

  msg += `📊 *BUGUNGI SAVDO*\n`;
  msg += line('  💵', 'Jami sotuv', `$${fmt(todaySaleSum)}`);
  msg += line('  ✅', 'Naqt keldi', `$${fmt(todayPaid)}`);
  msg += line('  ⏳', 'Savdo qarzi', `$${fmt(todaySaleDebt)}`);
  msg += '\n';

  msg += `👥 *MIJOZLAR*\n`;
  msg += line('  🔢', 'Jami mijozlar', `${customerCount} ta`);
  msg += line('  📋', 'Umumiy qarz (USD)', `$${fmt(debtUSD)}`);
  msg += line('  📋', 'Umumiy qarz (UZS)', `${fmt(debtUZS)} UZS`);
  msg += '\n';

  msg += `📤 *XARAJAT*\n`;
  msg += line('  💸', 'Bugungi xarajat', `${fmt(todayExpense)} UZS`);
  msg += '\n';

  msg += `🏭 *ISHLAB CHIQARISH*\n`;
  msg += line('  📦', 'Bugun ishlab chiqarildi', `${prodToday} qop`);
  msg += '\n';

  msg += `📈 *DAVR SAVDOLARI*\n`;
  msg += line('  📅', 'Oxirgi 7 kun jami', `$${fmt(weekTotal)}`);
  msg += line('  ✅', 'Oxirgi 7 kun tulangan', `$${fmt(weekPaid)}`);
  msg += line('  📅', 'Bu oy jami', `$${fmt(monthTotal)}`);
  msg += line('  ✅', 'Bu oy tulangan', `$${fmt(monthPaid)}`);
  msg += '\n';

  msg += `⚠️ *DIQQAT*\n`;
  msg += line('  📦', 'Aktiv buyurtmalar', `${activeOrders} ta`);
  msg += line('  ❗', 'Tolanmagan sotuvlar', `${unpaidSales} ta`);
  msg += line('  🔴', 'Kam qolgan mahsulot', `${typeof lowStockCount === 'number' ? lowStockCount : '?'} ta`);
  msg += line('  🚚', 'Band haydovchilar', `${driverBusy} ta`);

  await send(chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Yangilash', callback_data: 'quick_refresh' }],
        [{ text: '📊 Excel hisobot', callback_data: 'admin_backup_create' }],
      ],
    },
  });
}

// ─── 10. Hisobot yuborish ────────────────────────────────────────────────────

async function handleSendReport(chatId: number) {
  try {
    await send(chatId, '⏳ Excel hisobot tayyorlanmoqda...');
    const { buffer, filename } = await generateDailyExcelBackup();
    const today = fmtDate(new Date());
    const caption =
      `📊 *Kunlik hisobot — ${today}*\n\n` +
      `✅ Ombor holati\n✅ Sotuvlar\n✅ Mijozlar (har biri alohida)\n✅ Kassa\n\n` +
      `⏰ ${fmtDT(new Date())}`;
    await adminBot?.sendDocument(
      chatId, buffer,
      { caption, parse_mode: 'Markdown' },
      { filename, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );
  } catch (err: any) {
    await send(chatId, `❌ Xatolik: ${err.message}`);
  }
}

// ─── 11. Zaxira ──────────────────────────────────────────────────────────────

async function handleBackup(chatId: number) {
  await send(chatId,
    `💾 *MA'LUMOTLAR ZAXIRASI*\n\n` +
    `📅 Bugun: ${fmtDate(new Date())}\n` +
    `⏰ Avtomatik: Har kuni 19:00\n\n` +
    `📊 *Excel hisobot tarkibi:*\n` +
    `• Ombor holati (mahsulot qoldiqlari)\n` +
    `• Bugungi barcha sotuvlar\n` +
    `• Har bir mijoz balansi va tarixi\n` +
    `• Kassa kirimi/chiqimi\n\n` +
    `Hozir yuborish:`,
    { reply_markup: { inline_keyboard: [
      [{ text: '📊 Hozir Excel yuborish', callback_data: 'admin_backup_create' }],
    ]}}
  );
}

// ─── 12. Sozlamalar ───────────────────────────────────────────────────────────

async function handleSettings(chatId: number) {
  await send(chatId,
    `⚙️ *SOZLAMALAR*\n\n` +
    `🤖 Admin Chat ID: \`${process.env.TELEGRAM_ADMIN_CHAT_ID ?? 'sozlanmagan'}\`\n` +
    `⏰ Kunlik hisobot: 19:00\n` +
    `🌐 Muhit: ${process.env.NODE_ENV}\n` +
    `📊 Debug: ${process.env.NODE_ENV === 'development' ? '✅' : '❌'}\n` +
    `💱 USD/UZS: ${process.env.USD_TO_UZS_RATE ?? '12500'}`
  );
}

// ─── 13. Loglar ───────────────────────────────────────────────────────────────

async function handleLogs(chatId: number) {
  const logs = await prisma.auditLog.findMany({
    take: 10, orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true } } },
  });

  let msg = `📋 *TIZIM LOGLARI* (oxirgi 10)\n\n`;
  if (!logs.length) { msg += 'Log yo\'q'; }
  else {
    for (const log of logs) {
      msg += `• ${fmtTime(new Date(log.createdAt))} — *${log.user?.name ?? '?'}*\n`;
      msg += `  ${log.action} | ${log.entity}\n`;
    }
  }
  await send(chatId, msg);
}

// ─── 14. Yordam ───────────────────────────────────────────────────────────────

async function handleHelp(chatId: number) {
  await send(chatId,
    `❓ *ADMIN BOT YORDAM*\n\n` +
    `⚡ /q — Qisqa hisobot (barcha asosiy raqamlar)\n\n` +
    `🖥️ /system — Tizim holati\n` +
    `👥 /users — Foydalanuvchilar ro'yxati\n` +
    `💰 /sales — Bugungi sotuvlar\n` +
    `📦 /orders — Buyurtmalar holati\n` +
    `🚚 /drivers — Haydovchilar\n` +
    `💳 /cashbox — Kassa holati\n` +
    `📊 /stats — Umumiy statistika\n` +
    `📈 /profit — Foyda/Zarar/Marja\n` +
    `🏭 /production — Ishlab chiqarish hisoboti\n` +
    `📋 /report — Excel hisobot yuborish\n` +
    `💾 /backup — Zaxira\n` +
    `⚙️ /settings — Sozlamalar\n` +
    `📋 /logs — Tizim loglari\n\n` +
    `⏰ Kunlik hisobot har kuni *19:00* da avtomatik yuboriladi.`
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function triggerBackupUpdate() {
  try {
    const { generateDailyExcelBackup } = await import('../utils/daily-excel-backup');
    await generateDailyExcelBackup();
  } catch { /* silent */ }
}

export { adminBot };
