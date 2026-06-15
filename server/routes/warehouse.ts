import { Router } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'WAREHOUSE_MANAGER'));

// GET /api/warehouse/today — bugungi qo'shilganlar va sotilganlar
router.get('/today', async (req: AuthRequest, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Bugun ADD tipli stock movements
    const additions = await prisma.stockMovement.findMany({
      where: {
        type: 'ADD',
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Bugungi sotuvlar (SaleItem orqali mahsulot bo'yicha guruhlab)
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          createdAt: { gte: todayStart, lte: todayEnd },
        },
      },
      include: { product: { select: { name: true } } },
    });

    // Sotuvlarni mahsulot bo'yicha guruhlash
    const salesMap = new Map<string, { productName: string; totalBags: number; count: number }>();
    for (const item of saleItems) {
      const name = item.product?.name ?? 'Noma\'lum';
      const existing = salesMap.get(name) ?? { productName: name, totalBags: 0, count: 0 };
      existing.totalBags += item.quantity ?? 0;
      existing.count += 1;
      salesMap.set(name, existing);
    }

    const formattedAdditions = additions.map((m) => ({
      id: m.id,
      productName: m.product?.name ?? 'Noma\'lum',
      quantity: m.quantity,
      units: m.units,
      createdAt: m.createdAt.toISOString(),
      userName: m.userName,
    }));

    const totalAddedBags = formattedAdditions.reduce((sum, a) => sum + a.quantity, 0);
    const sales = Array.from(salesMap.values());
    const totalSoldBags = sales.reduce((sum, s) => sum + s.totalBags, 0);

    return res.json(successResponse({
      additions: formattedAdditions,
      sales,
      totalAddedBags,
      totalSoldBags,
    }));
  } catch (error) {
    console.error('Warehouse today error:', error);
    return res.status(500).json(errorResponse('Server xatosi'));
  }
});

// POST /api/warehouse/add-bag — omborga qop qo'shish
router.post('/add-bag', async (req: AuthRequest, res) => {
  try {
    const { productId, quantity, notes } = req.body;

    if (!productId || !quantity || typeof quantity !== 'number' || quantity <= 0) {
      return res.status(400).json(errorResponse('productId va quantity (musbat son) majburiy'));
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json(errorResponse('Mahsulot topilmadi'));
    }

    const previousStock = product.currentStock;
    const previousUnits = product.currentUnits;
    const newStock = previousStock + quantity;
    const newUnits = previousUnits + quantity * product.unitsPerBag;

    // Mahsulot zaxirasini yangilash
    await prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: newStock,
        currentUnits: newUnits,
      },
    });

    // StockMovement yozib qo'yish
    await prisma.stockMovement.create({
      data: {
        productId,
        type: 'ADD',
        quantity,
        units: Math.round(quantity * product.unitsPerBag),
        reason: 'Ombor mudiri tomonidan qo\'shildi',
        userId: req.user!.id,
        userName: req.user!.name ?? req.user!.id,
        previousStock: Math.round(previousStock),
        previousUnits: Math.round(previousUnits),
        newStock: Math.round(newStock),
        newUnits: Math.round(newUnits),
        notes: notes ?? null,
      },
    });

    return res.json(successResponse({
      productName: product.name,
      addedBags: quantity,
      newStock: Math.round(newStock),
    }, 'Qop muvaffaqiyatli qo\'shildi'));
  } catch (error) {
    console.error('Warehouse add-bag error:', error);
    return res.status(500).json(errorResponse('Server xatosi'));
  }
});

// GET /api/warehouse/reports?period=weekly|monthly
router.get('/reports', async (req: AuthRequest, res) => {
  try {
    const period = (req.query.period as string) === 'monthly' ? 'monthly' : 'weekly';

    const now = new Date();
    const from = new Date();
    if (period === 'weekly') {
      from.setDate(now.getDate() - 6);
    } else {
      from.setDate(1); // Oyning 1-kuni
    }
    from.setHours(0, 0, 0, 0);

    // Qo'shilganlar
    const additions = await prisma.stockMovement.findMany({
      where: {
        type: 'ADD',
        createdAt: { gte: from, lte: now },
      },
      include: { product: { select: { name: true } } },
    });

    // Sotuvlar
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: { createdAt: { gte: from, lte: now } },
      },
      include: { product: { select: { name: true } } },
    });

    // Mahsulot bo'yicha guruhlash
    const map = new Map<string, { productName: string; addedBags: number; soldBags: number }>();

    for (const m of additions) {
      const name = m.product?.name ?? 'Noma\'lum';
      const existing = map.get(name) ?? { productName: name, addedBags: 0, soldBags: 0 };
      existing.addedBags += m.quantity;
      map.set(name, existing);
    }

    for (const s of saleItems) {
      const name = s.product?.name ?? 'Noma\'lum';
      const existing = map.get(name) ?? { productName: name, addedBags: 0, soldBags: 0 };
      existing.soldBags += s.quantity ?? 0;
      map.set(name, existing);
    }

    const items = Array.from(map.values())
      .map((item) => ({ ...item, netChange: item.addedBags - item.soldBags }))
      .sort((a, b) => b.addedBags - a.addedBags);

    const totalAdded = items.reduce((sum, i) => sum + i.addedBags, 0);
    const totalSold = items.reduce((sum, i) => sum + i.soldBags, 0);

    return res.json(successResponse({
      period,
      from: from.toISOString(),
      to: now.toISOString(),
      totalAdded,
      totalSold,
      items,
    }));
  } catch (error) {
    console.error('Warehouse reports error:', error);
    return res.status(500).json(errorResponse('Server xatosi'));
  }
});

// GET /api/warehouse/export?period=weekly|monthly — Excel fayl yuklash
router.get('/export', async (req: AuthRequest, res) => {
  try {
    const period = (req.query.period as string) === 'monthly' ? 'monthly' : 'weekly';

    const now = new Date();
    const from = new Date();
    if (period === 'weekly') {
      from.setDate(now.getDate() - 6);
    } else {
      from.setDate(1);
    }
    from.setHours(0, 0, 0, 0);

    const [additions, saleItems] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { type: 'ADD', createdAt: { gte: from, lte: now } },
        include: { product: { select: { name: true, bagType: true, warehouse: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.saleItem.findMany({
        where: { sale: { createdAt: { gte: from, lte: now } } },
        include: { product: { select: { name: true } } },
      }),
    ]);

    const wb = XLSX.utils.book_new();

    // 1-varaq: Qo'shilganlar jurnali
    const additionsData = additions.map((m) => ({
      'Sana': new Date(m.createdAt).toLocaleDateString('uz-UZ'),
      'Vaqt': new Date(m.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
      'Mahsulot': m.product?.name ?? '',
      'Qop turi': m.product?.bagType ?? '',
      'Ombor': m.product?.warehouse ?? '',
      'Qo\'shilgan qop': m.quantity,
      'Qo\'shilgan dona': m.units,
      'Oldingi zaxira (qop)': m.previousStock,
      'Yangi zaxira (qop)': m.newStock,
      'Kim qo\'shdi': m.userName,
      'Izoh': m.notes ?? '',
    }));

    const ws1 = XLSX.utils.json_to_sheet(additionsData.length ? additionsData : [{ 'Ma\'lumot': 'Bu davrda hech narsa qo\'shilmagan' }]);
    ws1['!cols'] = Object.keys(additionsData[0] ?? {}).map(k => ({ wch: Math.max(k.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, ws1, "Qo'shilganlar");

    // 2-varaq: Mahsulotlar bo'yicha xulosa
    const map = new Map<string, { productName: string; addedBags: number; soldBags: number }>();
    for (const m of additions) {
      const name = m.product?.name ?? 'Noma\'lum';
      const e = map.get(name) ?? { productName: name, addedBags: 0, soldBags: 0 };
      e.addedBags += m.quantity;
      map.set(name, e);
    }
    for (const s of saleItems) {
      const name = s.product?.name ?? 'Noma\'lum';
      const e = map.get(name) ?? { productName: name, addedBags: 0, soldBags: 0 };
      e.soldBags += s.quantity ?? 0;
      map.set(name, e);
    }

    const summaryData = Array.from(map.values()).map(item => ({
      'Mahsulot': item.productName,
      'Ishlab chiqarildi (qop)': item.addedBags,
      'Sotildi (qop)': item.soldBags,
      'Balans (qop)': item.addedBags - item.soldBags,
    }));

    const totalRow = {
      'Mahsulot': 'JAMI',
      'Ishlab chiqarildi (qop)': summaryData.reduce((s, i) => s + i['Ishlab chiqarildi (qop)'], 0),
      'Sotildi (qop)': summaryData.reduce((s, i) => s + i['Sotildi (qop)'], 0),
      'Balans (qop)': summaryData.reduce((s, i) => s + i['Balans (qop)'], 0),
    };

    const ws2 = XLSX.utils.json_to_sheet([...(summaryData.length ? summaryData : [{ 'Ma\'lumot': 'Bu davrda ma\'lumot yo\'q' }]), ...(summaryData.length ? [totalRow] : [])]);
    ws2['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Xulosa');

    const periodLabel = period === 'weekly' ? 'haftalik' : 'oylik';
    const dateStr = now.toISOString().split('T')[0];
    const filename = `ombor_hisobot_${periodLabel}_${dateStr}.xlsx`;

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Warehouse export error:', error);
    return res.status(500).json(errorResponse('Export xatoligi'));
  }
});

export default router;
