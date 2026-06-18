/**
 * SQLite -> Neon PostgreSQL migration script
 * Run: npx tsx scripts/migrate-sqlite-to-postgres.ts
 */
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import path from 'path';
import { setTimeout as sleep } from 'timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NEON_URL = 'postgresql://neondb_owner:npg_MosTpPCd06Hu@ep-holy-voice-ahtci1c8.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';
process.env.DATABASE_URL = NEON_URL;

const sqlite = new Database(path.join(__dirname, '../prisma/dev.db'));

function getPrisma() {
  return new PrismaClient({
    datasources: { db: { url: NEON_URL } },
    log: ['error'],
  });
}

const bool = (v: any) => v === 1 || v === true;
const date = (v: any): Date | null => (v ? new Date(v) : null);
const dateReq = (v: any): Date => new Date(v || Date.now());

function rows<T = any>(table: string): T[] {
  try {
    return sqlite.prepare(`SELECT * FROM "${table}"`).all() as T[];
  } catch {
    return [];
  }
}

// Chunk array into batches
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

async function withRetry<T>(fn: () => Promise<T>, label: string, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i < retries - 1) {
        console.log(`  Retry ${i + 1}/${retries - 1} for ${label}...`);
        await sleep(2000);
      } else {
        throw e;
      }
    }
  }
  throw new Error('unreachable');
}

async function migrate() {
  console.log('Starting migration SQLite -> Neon PostgreSQL...\n');
  let prisma = getPrisma();

  // 1. Users
  const users = rows('User');
  console.log(`Users: ${users.length}`);
  if (users.length > 0) {
    await withRetry(() => prisma.user.createMany({
      data: users.map((u: any) => ({
        id: u.id, login: u.login, password: u.password, name: u.name,
        role: u.role || 'SELLER', active: bool(u.active),
        createdAt: dateReq(u.createdAt), updatedAt: dateReq(u.updatedAt),
      })),
      skipDuplicates: true,
    }), 'Users');
  }

  // 2. ProductType
  const productTypes = rows('ProductType');
  console.log(`ProductTypes: ${productTypes.length}`);
  if (productTypes.length > 0) {
    await withRetry(() => prisma.productType.createMany({
      data: productTypes.map((pt: any) => ({
        id: pt.id, name: pt.name, description: pt.description ?? null,
        defaultCard: pt.defaultCard ?? null, active: bool(pt.active),
        createdAt: dateReq(pt.createdAt), updatedAt: dateReq(pt.updatedAt),
      })),
      skipDuplicates: true,
    }), 'ProductTypes');
  }

  // 3. ProductCategory
  const productCategories = rows('ProductCategory');
  console.log(`ProductCategories: ${productCategories.length}`);
  if (productCategories.length > 0) {
    await withRetry(() => prisma.productCategory.createMany({
      data: productCategories.map((pc: any) => ({
        id: pc.id, name: pc.name, description: pc.description ?? null,
        icon: pc.icon ?? null, color: pc.color ?? null, active: bool(pc.active),
        productTypeId: pc.productTypeId,
        createdAt: dateReq(pc.createdAt), updatedAt: dateReq(pc.updatedAt),
      })),
      skipDuplicates: true,
    }), 'ProductCategories');
  }

  // 4. ProductSize
  const productSizes = rows('ProductSize');
  console.log(`ProductSizes: ${productSizes.length}`);
  if (productSizes.length > 0) {
    await withRetry(() => prisma.productSize.createMany({
      data: productSizes.map((ps: any) => ({
        id: ps.id, name: ps.name, description: ps.description ?? null,
        unit: ps.unit, value: ps.value, active: bool(ps.active),
        categoryId: ps.categoryId,
        createdAt: dateReq(ps.createdAt), updatedAt: dateReq(ps.updatedAt),
      })),
      skipDuplicates: true,
    }), 'ProductSizes');
  }

  // 5. Card
  const cards = rows('Card');
  console.log(`Cards: ${cards.length}`);
  if (cards.length > 0) {
    await withRetry(() => prisma.card.createMany({
      data: cards.map((c: any) => ({
        id: c.id, name: c.name, description: c.description ?? null,
        price: c.price || 0, active: bool(c.active),
        createdAt: dateReq(c.createdAt), updatedAt: dateReq(c.updatedAt),
      })),
      skipDuplicates: true,
    }), 'Cards');
  }

  // 6. Products (parents first, then children)
  const products = rows('Product');
  const parentProducts = products.filter((p: any) => !p.parentProductId);
  const childProducts = products.filter((p: any) => !!p.parentProductId);
  console.log(`Products: ${products.length}`);

  const mapProduct = (p: any) => ({
    id: p.id, name: p.name, bagType: p.bagType, color: p.color ?? null,
    unitsPerBag: p.unitsPerBag || 1000, minStockLimit: p.minStockLimit || 0,
    optimalStock: p.optimalStock || 0, maxCapacity: p.maxCapacity || 0,
    currentStock: p.currentStock || 0, currentUnits: p.currentUnits || 0,
    pricePerBag: p.pricePerBag || 0, pricePerPiece: p.pricePerPiece || 0,
    productionCost: p.productionCost || 0, isParent: bool(p.isParent),
    parentProductId: p.parentProductId ?? null, variantName: p.variantName ?? null,
    productTypeId: p.productTypeId ?? null, warehouse: p.warehouse || 'preform',
    categoryId: p.categoryId ?? null, sizeId: p.sizeId ?? null,
    subType: p.subType ?? null, active: bool(p.active),
    createdAt: dateReq(p.createdAt), updatedAt: dateReq(p.updatedAt),
  });

  for (const batch of chunk(parentProducts, 30)) {
    await withRetry(() => prisma.product.createMany({ data: batch.map(mapProduct), skipDuplicates: true }), 'Products-parent');
    await sleep(200);
  }
  for (const batch of chunk(childProducts, 30)) {
    await withRetry(() => prisma.product.createMany({ data: batch.map(mapProduct), skipDuplicates: true }), 'Products-child');
    await sleep(200);
  }

  // 7. ProductVariant
  const variants = rows('ProductVariant');
  console.log(`ProductVariants: ${variants.length}`);
  for (const batch of chunk(variants, 50)) {
    await withRetry(() => prisma.productVariant.createMany({
      data: batch.map((v: any) => ({
        id: v.id, parentId: v.parentId, variantName: v.variantName,
        cardType: v.cardType ?? null, currentStock: v.currentStock || 0,
        currentUnits: v.currentUnits || 0, pricePerBag: v.pricePerBag || 0,
        sku: v.sku ?? null, active: bool(v.active),
        createdAt: dateReq(v.createdAt), updatedAt: dateReq(v.updatedAt),
      })),
      skipDuplicates: true,
    }), 'ProductVariants');
    await sleep(200);
  }

  // 8. CardProduct
  const cardProducts = rows('CardProduct');
  console.log(`CardProducts: ${cardProducts.length}`);
  if (cardProducts.length > 0) {
    await withRetry(() => prisma.cardProduct.createMany({
      data: cardProducts.map((cp: any) => ({
        id: cp.id, cardId: cp.cardId, productId: cp.productId,
        quantity: cp.quantity || 1, active: bool(cp.active),
        createdAt: dateReq(cp.createdAt),
      })),
      skipDuplicates: true,
    }), 'CardProducts');
  }

  // 9. Customers
  const customers = rows('Customer');
  console.log(`Customers: ${customers.length}`);
  for (const batch of chunk(customers, 50)) {
    await withRetry(() => prisma.customer.createMany({
      data: batch.map((c: any) => ({
        id: c.id, name: c.name, email: c.email ?? null, phone: c.phone,
        address: c.address ?? null, telegramChatId: c.telegramChatId ?? null,
        telegramUsername: c.telegramUsername ?? null, telegramTopicId: c.telegramTopicId ?? null,
        notificationsEnabled: bool(c.notificationsEnabled ?? 1),
        debtReminderDays: c.debtReminderDays || 7, category: c.category || 'NORMAL',
        balance: c.balance || 0, balanceUZS: c.balanceUZS || 0, balanceUSD: c.balanceUSD || 0,
        debt: c.debt || 0, debtUZS: c.debtUZS || 0, debtUSD: c.debtUSD || 0,
        creditLimit: c.creditLimit || 0, paymentTermDays: c.paymentTermDays || 30,
        discountPercent: c.discountPercent || 0, pricePerBag: c.pricePerBag ?? null,
        productPrices: c.productPrices ?? null, lastPurchase: date(c.lastPurchase),
        lastPayment: date(c.lastPayment),
        createdAt: dateReq(c.createdAt), updatedAt: dateReq(c.updatedAt),
      })),
      skipDuplicates: true,
    }), 'Customers');
    await sleep(200);
  }

  // 10. Drivers
  const drivers = rows('Driver');
  console.log(`Drivers: ${drivers.length}`);
  if (drivers.length > 0) {
    await withRetry(() => prisma.driver.createMany({
      data: drivers.map((d: any) => ({
        id: d.id, userId: d.userId ?? null, name: d.name, phone: d.phone,
        licenseNumber: d.licenseNumber ?? null, vehicleNumber: d.vehicleNumber || '',
        telegramChatId: d.telegramChatId ?? null, telegramUsername: d.telegramUsername ?? null,
        status: d.status || 'AVAILABLE', active: bool(d.active),
        rating: d.rating || 5.0, totalDeliveries: d.totalDeliveries || 0,
        currentLocation: d.currentLocation ?? null, notes: d.notes ?? null,
        debtToCompany: d.debtToCompany || 0,
        createdAt: dateReq(d.createdAt), updatedAt: dateReq(d.updatedAt),
      })),
      skipDuplicates: true,
    }), 'Drivers');
  }

  // 11. Sales (batched)
  const sales = rows('Sale');
  console.log(`Sales: ${sales.length}`);
  for (const batch of chunk(sales, 30)) {
    await withRetry(() => prisma.sale.createMany({
      data: batch.map((s: any) => ({
        id: s.id, receiptNumber: s.receiptNumber ?? null,
        customerId: s.customerId ?? null, productId: s.productId ?? null,
        userId: s.userId, driverId: s.driverId ?? null,
        quantity: s.quantity || 1, pricePerBag: s.pricePerBag || 0,
        bagType: s.bagType || 'SMALL', totalAmount: s.totalAmount || 0,
        paidAmount: s.paidAmount || 0, currency: s.currency || 'USD',
        paymentMethod: s.paymentMethod || 'CASH', paymentStatus: s.paymentStatus || 'UNPAID',
        paymentDetails: s.paymentDetails ?? null,
        driverPaymentStatus: s.driverPaymentStatus || 'PENDING',
        driverCollectedAmount: s.driverCollectedAmount || 0,
        factoryShare: s.factoryShare || 0, customerShare: s.customerShare || 0,
        deliveryFee: s.deliveryFee || 0, deliveryFeePaidBy: s.deliveryFeePaidBy || 'COMPANY',
        isKocha: bool(s.isKocha),
        manualCustomerName: s.manualCustomerName ?? null,
        manualCustomerPhone: s.manualCustomerPhone ?? null,
        createdAt: dateReq(s.createdAt),
      })),
      skipDuplicates: true,
    }), 'Sales');
    await sleep(300);
  }

  // 12. SaleItems
  const saleItems = rows('SaleItem');
  console.log(`SaleItems: ${saleItems.length}`);
  for (const batch of chunk(saleItems, 50)) {
    await withRetry(() => prisma.saleItem.createMany({
      data: batch.map((si: any) => ({
        id: si.id, saleId: si.saleId, productId: si.productId ?? null,
        variantId: si.variantId ?? null, quantity: si.quantity || 0,
        pricePerBag: si.pricePerBag || 0, subtotal: si.subtotal || 0,
        saleType: si.saleType ?? null,
      })),
      skipDuplicates: true,
    }), 'SaleItems');
    await sleep(200);
  }

  // 13. Invoices
  const invoices = rows('Invoice');
  console.log(`Invoices: ${invoices.length}`);
  if (invoices.length > 0) {
    for (const batch of chunk(invoices, 50)) {
      await withRetry(() => prisma.invoice.createMany({
        data: batch.map((inv: any) => ({
          id: inv.id, saleId: inv.saleId, customerId: inv.customerId,
          invoiceNumber: inv.invoiceNumber, totalAmount: inv.totalAmount || 0,
          currency: inv.currency || 'USD', sentToTelegram: bool(inv.sentToTelegram),
          createdAt: dateReq(inv.createdAt),
        })),
        skipDuplicates: true,
      }), 'Invoices');
      await sleep(200);
    }
  }

  // 14. Payments
  const payments = rows('Payment');
  console.log(`Payments: ${payments.length}`);
  for (const batch of chunk(payments, 50)) {
    await withRetry(() => prisma.payment.createMany({
      data: batch.map((p: any) => ({
        id: p.id, customerId: p.customerId, amount: p.amount || 0,
        currency: p.currency || 'USD', description: p.description ?? null,
        paymentDetails: p.paymentDetails ?? null, createdAt: dateReq(p.createdAt),
      })),
      skipDuplicates: true,
    }), 'Payments');
    await sleep(200);
  }

  // 15. CustomerPayments
  const customerPayments = rows('CustomerPayment');
  console.log(`CustomerPayments: ${customerPayments.length}`);
  for (const batch of chunk(customerPayments, 50)) {
    await withRetry(() => prisma.customerPayment.createMany({
      data: batch.map((cp: any) => ({
        id: cp.id, customerId: cp.customerId, amount: cp.amount || 0,
        currency: cp.currency || 'UZS', type: cp.type || 'CASH',
        notes: cp.notes ?? null, createdBy: cp.createdBy ?? null,
        createdAt: dateReq(cp.createdAt),
      })),
      skipDuplicates: true,
    }), 'CustomerPayments');
    await sleep(200);
  }

  // 16. Expenses
  const expenses = rows('Expense');
  console.log(`Expenses: ${expenses.length}`);
  for (const batch of chunk(expenses, 50)) {
    await withRetry(() => prisma.expense.createMany({
      data: batch.map((e: any) => ({
        id: e.id, category: e.category, amount: e.amount || 0,
        currency: e.currency || 'UZS', description: e.description || '',
        userId: e.userId, createdAt: dateReq(e.createdAt),
      })),
      skipDuplicates: true,
    }), 'Expenses');
    await sleep(200);
  }

  // 17. StockMovements
  const stockMovements = rows('StockMovement');
  console.log(`StockMovements: ${stockMovements.length}`);
  for (const batch of chunk(stockMovements, 50)) {
    await withRetry(() => prisma.stockMovement.createMany({
      data: batch.map((sm: any) => ({
        id: sm.id, productId: sm.productId, type: sm.type,
        quantity: sm.quantity || 0, units: sm.units || 0, reason: sm.reason || '',
        userId: sm.userId, userName: sm.userName || '',
        previousStock: sm.previousStock || 0, previousUnits: sm.previousUnits || 0,
        newStock: sm.newStock || 0, newUnits: sm.newUnits || 0,
        notes: sm.notes ?? null, createdAt: dateReq(sm.createdAt),
      })),
      skipDuplicates: true,
    }), 'StockMovements');
    await sleep(200);
  }

  // 18. VariantStockMovements
  const variantSMs = rows('VariantStockMovement');
  console.log(`VariantStockMovements: ${variantSMs.length}`);
  for (const batch of chunk(variantSMs, 50)) {
    await withRetry(() => prisma.variantStockMovement.createMany({
      data: batch.map((v: any) => ({
        id: v.id, variantId: v.variantId, type: v.type,
        quantity: v.quantity || 0, units: v.units || 0, reason: v.reason || '',
        userId: v.userId, userName: v.userName || '',
        previousStock: v.previousStock || 0, previousUnits: v.previousUnits || 0,
        newStock: v.newStock || 0, newUnits: v.newUnits || 0,
        notes: v.notes ?? null, createdAt: dateReq(v.createdAt),
      })),
      skipDuplicates: true,
    }), 'VariantStockMovements');
    await sleep(200);
  }

  // 19. VariantPriceHistory
  const variantPrices = rows('VariantPriceHistory');
  console.log(`VariantPriceHistory: ${variantPrices.length}`);
  if (variantPrices.length > 0) {
    await withRetry(() => prisma.variantPriceHistory.createMany({
      data: variantPrices.map((vp: any) => ({
        id: vp.id, variantId: vp.variantId, oldPrice: vp.oldPrice || 0,
        newPrice: vp.newPrice || 0, reason: vp.reason ?? null,
        userId: vp.userId, userName: vp.userName || '', createdAt: dateReq(vp.createdAt),
      })),
      skipDuplicates: true,
    }), 'VariantPriceHistory');
  }

  // 20. Batches
  const batches = rows('Batch');
  console.log(`Batches: ${batches.length}`);
  for (const batch of chunk(batches, 50)) {
    await withRetry(() => prisma.batch.createMany({
      data: batch.map((b: any) => ({
        id: b.id, productId: b.productId, quantity: b.quantity || 0,
        productionDate: dateReq(b.productionDate), shift: b.shift || '',
        responsiblePerson: b.responsiblePerson || '', createdAt: dateReq(b.createdAt),
      })),
      skipDuplicates: true,
    }), 'Batches');
    await sleep(200);
  }

  // 21. CashboxTransactions
  const cashboxTxs = rows('CashboxTransaction');
  console.log(`CashboxTransactions: ${cashboxTxs.length}`);
  for (const batch of chunk(cashboxTxs, 50)) {
    await withRetry(() => prisma.cashboxTransaction.createMany({
      data: batch.map((ct: any) => ({
        id: ct.id, type: ct.type, amount: ct.amount || 0,
        currency: ct.currency || 'UZS', category: ct.category || 'OTHER',
        paymentMethod: ct.paymentMethod || 'CASH', description: ct.description ?? null,
        userId: ct.userId, userName: ct.userName || '', reference: ct.reference ?? null,
        createdAt: dateReq(ct.createdAt),
      })),
      skipDuplicates: true,
    }), 'CashboxTransactions');
    await sleep(200);
  }

  // 22. ExchangeRates
  const exchangeRates = rows('ExchangeRate');
  console.log(`ExchangeRates: ${exchangeRates.length}`);
  if (exchangeRates.length > 0) {
    await withRetry(() => prisma.exchangeRate.createMany({
      data: exchangeRates.map((er: any) => ({
        id: er.id, fromCurrency: er.fromCurrency, toCurrency: er.toCurrency,
        rate: er.rate || 1, effectiveDate: dateReq(er.effectiveDate),
        isActive: bool(er.isActive), createdAt: dateReq(er.createdAt),
        updatedAt: dateReq(er.updatedAt),
      })),
      skipDuplicates: true,
    }), 'ExchangeRates');
  }

  // 23. SystemSettings
  const settings = rows('SystemSettings');
  console.log(`SystemSettings: ${settings.length}`);
  if (settings.length > 0) {
    await withRetry(() => prisma.systemSettings.createMany({
      data: settings.map((s: any) => ({
        id: s.id, key: s.key, value: s.value, description: s.description ?? null,
        updatedBy: s.updatedBy || '', updatedAt: dateReq(s.updatedAt),
      })),
      skipDuplicates: true,
    }), 'SystemSettings');
  }

  // 24. AuditLogs
  const auditLogs = rows('AuditLog');
  console.log(`AuditLogs: ${auditLogs.length}`);
  for (const batch of chunk(auditLogs, 100)) {
    await withRetry(() => prisma.auditLog.createMany({
      data: batch.map((al: any) => ({
        id: al.id, userId: al.userId, action: al.action, entity: al.entity,
        entityId: al.entityId, changes: al.changes ?? null, createdAt: dateReq(al.createdAt),
      })),
      skipDuplicates: true,
    }), 'AuditLogs');
    await sleep(300);
  }

  // 25. StockAlerts
  const stockAlerts = rows('StockAlert');
  console.log(`StockAlerts: ${stockAlerts.length}`);
  if (stockAlerts.length > 0) {
    await withRetry(() => prisma.stockAlert.createMany({
      data: stockAlerts.map((sa: any) => ({
        id: sa.id, productId: sa.productId, alertType: sa.alertType,
        message: sa.message, resolved: bool(sa.resolved), createdAt: dateReq(sa.createdAt),
      })),
      skipDuplicates: true,
    }), 'StockAlerts');
  }

  // 26. CashierShifts
  const cashierShifts = rows('CashierShift');
  console.log(`CashierShifts: ${cashierShifts.length}`);
  if (cashierShifts.length > 0) {
    await withRetry(() => prisma.cashierShift.createMany({
      data: cashierShifts.map((cs: any) => ({
        id: cs.id, userId: cs.userId, openingBalance: cs.openingBalance || 0,
        closingBalance: cs.closingBalance ?? null,
        cashSales: cs.cashSales || 0, cardSales: cs.cardSales || 0,
        clickSales: cs.clickSales || 0, totalSales: cs.totalSales || 0,
        cashSalesUSD: cs.cashSalesUSD || 0, cardSalesUSD: cs.cardSalesUSD || 0,
        clickSalesUSD: cs.clickSalesUSD || 0, totalSalesUSD: cs.totalSalesUSD || 0,
        shortage: cs.shortage || 0, overage: cs.overage || 0,
        startTime: dateReq(cs.startTime), endTime: date(cs.endTime),
        status: cs.status || 'OPEN',
      })),
      skipDuplicates: true,
    }), 'CashierShifts');
  }

  // 27. DriverChat
  const driverChats = rows('DriverChat');
  console.log(`DriverChats: ${driverChats.length}`);
  for (const batch of chunk(driverChats, 50)) {
    await withRetry(() => prisma.driverChat.createMany({
      data: batch.map((dc: any) => ({
        id: dc.id, driverId: dc.driverId, adminId: dc.adminId,
        message: dc.message || '', senderType: dc.senderType || 'ADMIN',
        messageType: dc.messageType || 'TEXT', isRead: bool(dc.isRead),
        createdAt: dateReq(dc.createdAt),
      })),
      skipDuplicates: true,
    }), 'DriverChats');
    await sleep(200);
  }

  // 28. CustomerChat
  const customerChats = rows('CustomerChat');
  console.log(`CustomerChats: ${customerChats.length}`);
  for (const batch of chunk(customerChats, 50)) {
    await withRetry(() => prisma.customerChat.createMany({
      data: batch.map((cc: any) => ({
        id: cc.id, customerId: cc.customerId, adminId: cc.adminId ?? null,
        message: cc.message || '', senderType: cc.senderType || 'CUSTOMER',
        messageType: cc.messageType || 'TEXT', isRead: bool(cc.isRead),
        readAt: date(cc.readAt), createdAt: dateReq(cc.createdAt),
      })),
      skipDuplicates: true,
    }), 'CustomerChats');
    await sleep(200);
  }

  // 29. Contracts
  const contracts = rows('Contract');
  console.log(`Contracts: ${contracts.length}`);
  if (contracts.length > 0) {
    await withRetry(() => prisma.contract.createMany({
      data: contracts.map((c: any) => ({
        id: c.id, customerId: c.customerId, contractNumber: c.contractNumber,
        startDate: dateReq(c.startDate), endDate: dateReq(c.endDate),
        terms: c.terms || '', creditLimit: c.creditLimit || 0,
        paymentTermDays: c.paymentTermDays || 30, status: c.status || 'ACTIVE',
        createdAt: dateReq(c.createdAt),
      })),
      skipDuplicates: true,
    }), 'Contracts');
  }

  // 30. Orders
  const orders = rows('Order');
  console.log(`Orders: ${orders.length}`);
  for (const batch of chunk(orders, 30)) {
    await withRetry(() => prisma.order.createMany({
      data: batch.map((o: any) => ({
        id: o.id, orderNumber: o.orderNumber, customerId: o.customerId,
        status: o.status || 'PENDING', priority: o.priority || 'NORMAL',
        requestedDate: dateReq(o.requestedDate), promisedDate: date(o.promisedDate),
        deliveredDate: date(o.deliveredDate), confirmedAt: date(o.confirmedAt),
        soldAt: date(o.soldAt), totalAmount: o.totalAmount || 0,
        paidAmount: o.paidAmount || 0, paymentDetails: o.paymentDetails ?? null,
        saleId: o.saleId ?? null, notes: o.notes ?? null,
        aiRecommendation: o.aiRecommendation ?? null,
        createdAt: dateReq(o.createdAt), updatedAt: dateReq(o.updatedAt),
      })),
      skipDuplicates: true,
    }), 'Orders');
    await sleep(200);
  }

  // 31. OrderItems
  const orderItems = rows('OrderItem');
  console.log(`OrderItems: ${orderItems.length}`);
  for (const batch of chunk(orderItems, 50)) {
    await withRetry(() => prisma.orderItem.createMany({
      data: batch.map((oi: any) => ({
        id: oi.id, orderId: oi.orderId, productId: oi.productId ?? null,
        variantId: oi.variantId ?? null, quantityBags: oi.quantityBags || 0,
        quantityUnits: oi.quantityUnits || 0, pricePerBag: oi.pricePerBag || 0,
        subtotal: oi.subtotal || 0, notes: oi.notes ?? null,
      })),
      skipDuplicates: true,
    }), 'OrderItems');
    await sleep(200);
  }

  // 32. DeliveryAssignments
  const deliveryAssignments = rows('DeliveryAssignment');
  console.log(`DeliveryAssignments: ${deliveryAssignments.length}`);
  for (const batch of chunk(deliveryAssignments, 50)) {
    await withRetry(() => prisma.deliveryAssignment.createMany({
      data: batch.map((da: any) => ({
        id: da.id, orderId: da.orderId, driverId: da.driverId,
        assignedBy: da.assignedBy, status: da.status || 'PENDING',
        assignedAt: dateReq(da.assignedAt), acceptedAt: date(da.acceptedAt),
        startedAt: date(da.startedAt), completedAt: date(da.completedAt),
        rejectionReason: da.rejectionReason ?? null, notes: da.notes ?? null,
        customerPhone: da.customerPhone ?? null,
        deliveryAddress: da.deliveryAddress || '',
        estimatedTime: da.estimatedTime ?? null, actualTime: da.actualTime ?? null,
      })),
      skipDuplicates: true,
    }), 'DeliveryAssignments');
    await sleep(200);
  }

  // 33. BagLabels
  const bagLabels = rows('BagLabel');
  console.log(`BagLabels: ${bagLabels.length}`);
  for (const batch of chunk(bagLabels, 50)) {
    await withRetry(() => prisma.bagLabel.createMany({
      data: batch.map((bl: any) => ({
        id: bl.id, barcode: bl.barcode, productId: bl.productId,
        productName: bl.productName || '', productType: bl.productType || '',
        unitsPerBag: bl.unitsPerBag || 0, bagNumber: bl.bagNumber || 0,
        workerId: bl.workerId || '', productionDate: dateReq(bl.productionDate),
        status: bl.status || 'IN_STOCK', printedAt: dateReq(bl.printedAt),
        printedBy: bl.printedBy || '', soldAt: date(bl.soldAt),
        saleId: bl.saleId ?? null, notes: bl.notes ?? null,
      })),
      skipDuplicates: true,
    }), 'BagLabels');
    await sleep(200);
  }

  // 34. QualityChecks
  const qualityChecks = rows('QualityCheck');
  console.log(`QualityChecks: ${qualityChecks.length}`);
  if (qualityChecks.length > 0) {
    await withRetry(() => prisma.qualityCheck.createMany({
      data: qualityChecks.map((qc: any) => ({
        id: qc.id, productId: qc.productId, batchId: qc.batchId ?? null,
        checkType: qc.checkType, status: qc.status, checkedBy: qc.checkedBy || '',
        checkDate: dateReq(qc.checkDate), defects: qc.defects ?? null,
        notes: qc.notes ?? null, createdAt: dateReq(qc.createdAt),
      })),
      skipDuplicates: true,
    }), 'QualityChecks');
  }

  // 35. Ledger
  const ledgers = rows('Ledger');
  console.log(`Ledgers: ${ledgers.length}`);
  if (ledgers.length > 0) {
    await withRetry(() => prisma.ledger.createMany({
      data: ledgers.map((l: any) => ({
        id: l.id, type: l.type, name: l.name, description: l.description ?? null,
        currency: l.currency || 'UZS', totalDebit: l.totalDebit || 0,
        totalCredit: l.totalCredit || 0, balance: l.balance || 0,
        dueDate: date(l.dueDate), notes: l.notes ?? null,
        status: l.status || 'ACTIVE', userId: l.userId,
        createdAt: dateReq(l.createdAt), updatedAt: dateReq(l.updatedAt),
      })),
      skipDuplicates: true,
    }), 'Ledgers');
  }

  // 36. LedgerEntries
  const ledgerEntries = rows('LedgerEntry');
  console.log(`LedgerEntries: ${ledgerEntries.length}`);
  for (const batch of chunk(ledgerEntries, 50)) {
    await withRetry(() => prisma.ledgerEntry.createMany({
      data: batch.map((le: any) => ({
        id: le.id, ledgerId: le.ledgerId, entryType: le.entryType,
        amount: le.amount || 0, currency: le.currency || 'UZS',
        dueDate: date(le.dueDate), paidDate: date(le.paidDate),
        notes: le.notes ?? null, userId: le.userId, createdAt: dateReq(le.createdAt),
      })),
      skipDuplicates: true,
    }), 'LedgerEntries');
    await sleep(200);
  }

  // 37. Kits
  const kits = rows('Kit');
  console.log(`Kits: ${kits.length}`);
  if (kits.length > 0) {
    await withRetry(() => prisma.kit.createMany({
      data: kits.map((k: any) => ({
        id: k.id, kitName: k.kitName, description: k.description ?? null,
        price: k.price || 0, discountPercent: k.discountPercent || 0,
        active: bool(k.active), createdAt: dateReq(k.createdAt), updatedAt: dateReq(k.updatedAt),
      })),
      skipDuplicates: true,
    }), 'Kits');
  }

  // 38. KitItems
  const kitItems = rows('KitItem');
  console.log(`KitItems: ${kitItems.length}`);
  if (kitItems.length > 0) {
    await withRetry(() => prisma.kitItem.createMany({
      data: kitItems.map((ki: any) => ({
        id: ki.id, kitId: ki.kitId, productId: ki.productId,
        quantity: ki.quantity || 1, itemType: ki.itemType || 'bag',
        active: bool(ki.active), createdAt: dateReq(ki.createdAt),
      })),
      skipDuplicates: true,
    }), 'KitItems');
  }

  // 39. KitSales
  const kitSales = rows('KitSale');
  console.log(`KitSales: ${kitSales.length}`);
  if (kitSales.length > 0) {
    await withRetry(() => prisma.kitSale.createMany({
      data: kitSales.map((ks: any) => ({
        id: ks.id, saleId: ks.saleId, kitId: ks.kitId,
        customerId: ks.customerId ?? null, quantity: ks.quantity || 1,
        kitPrice: ks.kitPrice || 0, totalAmount: ks.totalAmount || 0,
        currency: ks.currency || 'USD', createdAt: dateReq(ks.createdAt),
      })),
      skipDuplicates: true,
    }), 'KitSales');
  }

  // 40. Loans
  const loans = rows('Loan');
  console.log(`Loans: ${loans.length}`);
  if (loans.length > 0) {
    await withRetry(() => prisma.loan.createMany({
      data: loans.map((l: any) => ({
        id: l.id, employeeName: l.employeeName || '', employeeId: l.employeeId ?? null,
        amount: l.amount || 0, currency: l.currency || 'UZS',
        purpose: l.purpose ?? null, loanDate: dateReq(l.loanDate),
        dueDate: date(l.dueDate), repaymentType: l.repaymentType || 'SALARY_DEDUCTION',
        monthlyDeduction: l.monthlyDeduction ?? null, notes: l.notes ?? null,
        remainingAmount: l.remainingAmount || 0, status: l.status || 'ACTIVE',
        createdAt: dateReq(l.createdAt), updatedAt: dateReq(l.updatedAt),
      })),
      skipDuplicates: true,
    }), 'Loans');
  }

  // 41. Notifications
  const notifications = rows('Notification');
  console.log(`Notifications: ${notifications.length}`);
  for (const batch of chunk(notifications, 100)) {
    await withRetry(() => prisma.notification.createMany({
      data: batch.map((n: any) => ({
        id: n.id, userId: n.userId, title: n.title || '', message: n.message || '',
        type: n.type || 'INFO', read: bool(n.read),
        actionUrl: n.actionUrl ?? null, createdAt: dateReq(n.createdAt),
      })),
      skipDuplicates: true,
    }), 'Notifications');
    await sleep(200);
  }

  await prisma.$disconnect();
  console.log('\n✅ Migration completed successfully!');
}

migrate()
  .catch((e) => {
    console.error('\n❌ Migration failed:', e.message || e);
    process.exit(1);
  })
  .finally(() => {
    sqlite.close();
  });
