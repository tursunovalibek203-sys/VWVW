import { Router } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

// GET - Public mahsulotlar ro'yxati (autentifikatsiya kerak emas)
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        currentStock: { gt: 0 }
      },
      select: {
        id: true,
        name: true,
        pricePerBag: true,
        currentStock: true,
        bagType: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(products);
  } catch (error) {
    console.error('Public products error:', error);
    res.status(500).json({ error: 'Mahsulotlarni yuklashda xatolik' });
  }
});

// POST - Public buyurtma berish (autentifikatsiya kerak emas)
router.post('/orders', async (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!customer.name || !customer.phone) {
      return res.status(400).json({ error: 'Ism va telefon majburiy' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Mahsulotlar ro\'yxati bo\'sh' });
    }

    // Mijozni topish yoki yaratish
    let existingCustomer = await prisma.customer.findFirst({
      where: { phone: customer.phone }
    });

    if (!existingCustomer) {
      existingCustomer = await prisma.customer.create({
        data: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email || null,
          category: 'NORMAL'
        }
      });
    }

    // Buyurtma raqamini generatsiya qilish
    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${Date.now()}-${orderCount + 1}`;

    // XAVFSIZLIK: narxni MIJOZ EMAS, server DB'dan oladi (narx buzishni oldini olish)
    const productIds: string[] = [...new Set(items.map((i: any) => i.productId))] as string[];
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, pricePerBag: true },
    });
    const priceMap = new Map(dbProducts.map((p) => [p.id, p.pricePerBag]));

    // Har bir item uchun mahsulot mavjudligi va musbat miqdorni tekshirish
    for (const item of items) {
      if (!priceMap.has(item.productId)) {
        return res.status(400).json({ error: `Mahsulot topilmadi: ${item.productId}` });
      }
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ error: 'Miqdor musbat son bo\'lishi kerak' });
      }
    }

    // Umumiy summani SERVER narxidan hisoblash
    const lineItems = items.map((item: any) => {
      const serverPrice = priceMap.get(item.productId)!;
      return {
        productId: item.productId,
        quantityBags: item.quantity,
        quantityUnits: 0,
        pricePerBag: serverPrice,
        subtotal: item.quantity * serverPrice,
      };
    });
    const totalAmount = lineItems.reduce((sum: number, li: { subtotal: number }) => sum + li.subtotal, 0);

    // Buyurtma yaratish
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: existingCustomer.id,
        status: 'CONFIRMED',
        priority: 'NORMAL',
        requestedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 kun keyin
        totalAmount,
        notes: customer.notes || null,
        items: {
          create: lineItems
        }
      },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Telegram orqali xabar yuborish (agar bot mavjud bo'lsa)
    try {
      const { sendCustomMessage, sendNewOrderNotification } = await import('../bot/super-bot');
      
      // Mijozga tasdiqlash xabari
      if (existingCustomer.telegramChatId) {
        await sendCustomMessage(
          existingCustomer.id,
          `✅ Buyurtmangiz qabul qilindi!\n\n🆔 Buyurtma: #${orderNumber}\n💰 Summa: ${totalAmount.toFixed(2)} USD\n\nTez orada siz bilan bog'lanamiz!`
        );
      }
      
      // Adminlarga yangi buyurtma haqida xabar
      await sendNewOrderNotification(order, existingCustomer, order.items);
      
      console.log(`✅ Buyurtma yaratildi va xabarlar yuborildi: ${orderNumber}`);
    } catch (botError) {
      console.error('Bot notification error:', botError);
    }

    res.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Public order error:', error);
    res.status(500).json({ error: 'Buyurtma yaratishda xatolik' });
  }
});

export default router;
