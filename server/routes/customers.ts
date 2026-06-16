import { Router } from 'express';

import { prisma } from '../utils/prisma';

import { authenticate, authorize, AuthRequest } from '../middleware/auth';

import { successResponse, errorResponse } from '../utils/response';
import { DecimalHelper } from '../utils/decimal-helper';
import { createCustomerTopic } from '../utils/telegram-forum';



const router = Router();



router.use(authenticate);



router.get('/', async (req, res) => {

  try {

    const { category, hasDebt, search } = req.query;

    

    let where: any = {};

    

    // Kategoriya filtri

    if (category) {

      where.category = category as string;

    }

    

    // Qarzli mijozlar filtri - ikkala valyutada ham qarzni tekshirish

    if (hasDebt === 'true') {

      where.OR = [

        { debtUZS: { gt: 0 } },

        { debtUSD: { gt: 0 } }

      ];

    }

    

    // Search - Use database filtering instead of JavaScript
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const customers = await prisma.customer.findMany({

      where,

      select: {

        id: true,

        name: true,

        email: true,

        phone: true,

        address: true,

        telegramChatId: true,

        telegramUsername: true,

        notificationsEnabled: true,

        category: true,

        balance: true,

        balanceUZS: true,

        balanceUSD: true,

        debt: true,

        debtUZS: true,

        debtUSD: true,

        creditLimit: true,

        paymentTermDays: true,

        discountPercent: true,

        pricePerBag: true,

        productPrices: true,

        lastPurchase: true,

        lastPayment: true,

        createdAt: true,

        updatedAt: true,

        _count: { select: { sales: true } }

      },
      take: 1000 // Limit to prevent memory overflow
    });

    

    // ✅ STANDARD API RESPONSE FORMAT
    res.json(successResponse(customers));

  } catch (error) {

    console.error('❌ GET /customers xatolik:', error);

    res.status(500).json(errorResponse('Failed to fetch customers'));

  }

});



router.post('/', async (req: AuthRequest, res) => {

  try {

    const { telegramId, balance, balanceUZS, balanceUSD, debt, debtUZS, debtUSD, telegramChatId: _tc, ...rawCustomerData } = req.body;

    // Bo'sh string optional fieldlarni null ga o'girish (unique constraint xatoligini oldini olish)
    const customerData = {
      ...rawCustomerData,
      email: rawCustomerData.email?.trim() || null,
      address: rawCustomerData.address?.trim() || null,
      telegramUsername: rawCustomerData.telegramUsername?.trim() || null,
    };

    // Validatsiya - ism va telefon raqami kiritilishi shart

    if (!customerData.name || customerData.name.trim() === '') {

      return res.status(400).json({ error: 'Ism kiritilishi shart' });

    }



    if (!customerData.phone || customerData.phone.trim() === '') {

      return res.status(400).json({ error: 'Telefon raqami kiritilishi shart' });

    }

    

    // Agar Telegram ID kiritilgan bo'lsa va bo'sh bo'lmasa, uni tekshirish va bog'lash

    if (telegramId && telegramId.trim()) {

      // Telegram ID orqali mijozni topish (ID ning oxirgi 8 belgisi)

      const existingCustomers = await prisma.customer.findMany({

        where: {

          telegramChatId: { not: null }

        }

      });

      

      // ID ning oxirgi 8 belgisini solishtirish

      const matchedCustomer = existingCustomers.find(c => 

        c.id.slice(-8).toUpperCase() === telegramId.toUpperCase().trim()

      );

      

      if (matchedCustomer) {

        // Agar mijoz allaqachon saytda ro'yxatdan o'tgan bo'lsa

        if (matchedCustomer.name !== 'Telegram User' && matchedCustomer.phone !== `@${matchedCustomer.telegramUsername}`) {

          return res.status(400).json({ 

            error: 'Bu Telegram ID allaqachon boshqa mijozga bog\'langan.' 

          });

        }

        

        // Mavjud Telegram mijozni yangilash

        const customer = await prisma.customer.update({

          where: { id: matchedCustomer.id },

          data: {

            ...customerData,

            telegramChatId: matchedCustomer.telegramChatId,

            telegramUsername: matchedCustomer.telegramUsername

          }

        });

        

        return res.json(customer);

      } else {

        // Telegram ID topilmadi, lekin mijozni yarataveramiz (telegram ID ni ixtiyoriy field sifatida saqlaymiz)

        console.log('Telegram ID not found in existing users, creating new customer with Telegram ID reference');

        const customer = await prisma.customer.create({ 

          data: {

            ...customerData,

            // Telegram ID ni telegramUsername fieldida saqlaymiz (vaqtincha yechim)

            telegramUsername: telegramId.trim()

          }

        });

        return res.json(customer);

      }

    }

    

    // Oddiy mijoz yaratish (Telegram ID siz)

    const customer = await prisma.customer.create({ data: customerData });

    res.json(customer);

  } catch (error: any) {

    console.error('Create customer error:', error?.message || error);

    // Unique constraint xatoligi (email yoki telegramChatId takrorlanishi)
    if (error?.code === 'P2002') {
      const field = error?.meta?.target?.join(', ') || 'maydon';
      return res.status(400).json({ error: `Bu ${field} allaqachon boshqa mijozda mavjud` });
    }

    res.status(500).json({ error: 'Failed to create customer', details: error?.message });

  }

});



// Per-customer monthly sales stats — replaces client-side 1000-sale load
router.get('/stats/monthly', async (req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const rows = await prisma.$queryRaw<Array<{
      customerId: string;
      monthlySales: number;
      lastSaleDate: string | null;
    }>>`
      SELECT
        customerId,
        COALESCE(SUM(totalAmount), 0)             AS monthlySales,
        MAX(DATE(createdAt))                       AS lastSaleDate
      FROM "Sale"
      WHERE customerId IS NOT NULL
        AND createdAt >= ${monthStart.toISOString()}
      GROUP BY customerId
    `;

    const map: Record<string, { monthlySales: number; lastSaleDate: string | null }> = {};
    (rows as any[]).forEach(r => {
      map[r.customerId] = {
        monthlySales: Number(r.monthlySales),
        lastSaleDate: r.lastSaleDate ?? null,
      };
    });
    res.json(map);
  } catch (error) {
    console.error('Customer stats error:', error);
    res.status(500).json({ error: 'Customer stats fetch failed' });
  }
});

router.get('/:id', async (req, res) => {

  try {

    const customer = await prisma.customer.findUnique({

      where: { id: req.params.id },

      include: {

        sales: { include: { items: { include: { product: true } } }, orderBy: { createdAt: 'desc' } },

        payments: { orderBy: { createdAt: 'desc' } },

        invoices: { orderBy: { createdAt: 'desc' } },

      },

    });

    

    // Ensure debtUZS and debtUSD are included in response

    if (customer) {

      const customerData = customer as any;

      res.json({

        ...customerData,

        debtUZS: customerData.debtUZS || 0,

        debtUSD: customerData.debtUSD || 0,

      });

    } else {

      res.status(404).json({ error: 'Customer not found' });

    }

  } catch (error) {

    res.status(500).json({ error: 'Failed to fetch customer' });

  }

});



router.get('/alerts/overdue', async (req, res) => {

  try {

    const thirtyDaysAgo = new Date();

    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);



    const customers = await prisma.customer.findMany({

      where: {

        OR: [

          { lastPayment: { lt: thirtyDaysAgo }, debt: { gt: 0 } },

          { lastPurchase: { lt: thirtyDaysAgo } },

        ],

      },

    });



    res.json(customers);

  } catch (error) {

    res.status(500).json({ error: 'Failed to fetch alerts' });

  }

});



// PUT /customers/:id - Mijozni yangilash
router.put('/:id', authorize('ADMIN', 'CASHIER', 'SELLER'), async (req: AuthRequest, res) => {
  try {
    const isAdmin = req.user?.role?.toUpperCase() === 'ADMIN';

    // Financial and sensitive fields restricted to ADMIN only
    const ADMIN_ONLY_FIELDS = [
      'balance', 'balanceUZS', 'balanceUSD',
      'debt', 'debtUZS', 'debtUSD',
      'creditLimit', 'category',
      'telegramChatId', 'telegramUsername',
      'discountPercent', 'pricePerBag', 'productPrices'
    ];

    const safeBody = { ...req.body };
    if (!isAdmin) {
      for (const field of ADMIN_ONLY_FIELDS) {
        delete safeBody[field];
      }
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: safeBody,
    });

    res.json(customer);
  } catch (error: any) {
    console.error('❌ PUT /customers/:id xatolik:', error.message);
    res.status(500).json({
      error: 'Failed to update customer',
      details: error.message
    });
  }
});



// DELETE /customers/:id - Mijozni o'chirish (faqat ADMIN)
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res) => {

  try {

    const customerId = req.params.id;
    console.log(`🗑️ DELETE /customers/${customerId} - Mijoz o'chirish boshlandi`);

    

    // Transaction ichida barcha operatsiyalarni bajarish

    await prisma.$transaction(async (tx) => {

      // 1. Avval bog'liq yozuvlarni o'chirish (to'g'ri tartibda)

      

      // CustomerChat xabarlarini o'chirish

      await tx.customerChat.deleteMany({

        where: { customerId }

      });

      

      // OrderItem larni o'chirish (Order lar bilan birga)

      await tx.orderItem.deleteMany({

        where: {

          order: {

            customerId

          }

        }

      });

      

      // Order larni o'chirish

      await tx.order.deleteMany({

        where: { customerId }

      });

      

      // SaleItem larni o'chirish (Sale lar bilan birga)

      await tx.saleItem.deleteMany({

        where: {

          sale: {

            customerId

          }

        }

      });

      

      // Invoice larni o'chirish

      await tx.invoice.deleteMany({

        where: { customerId }

      });

      

      // Sale larni o'chirish

      await tx.sale.deleteMany({

        where: { customerId }

      });

      

      // Payment larni o'chirish

      await tx.payment.deleteMany({

        where: { customerId }

      });

      

      // Contract larni o'chirish

      await tx.contract.deleteMany({

        where: { customerId }

      });

      

      // 2. Oxirida mijozni o'chirish

      await tx.customer.delete({

        where: { id: customerId }

      });

    });

    

    console.log(`✅ DELETE /customers/${customerId} - Mijoz muvaffaqiyatli o'chirildi`);
    res.json({ message: 'Customer deleted successfully' });

  } catch (error: any) {

    console.error('❌ DELETE /customers/:id xatolik:', error);

    res.status(500).json({ 

      error: 'Failed to delete customer',

      details: error.message 

    });

  }

});



// POST /customers/:id/apply-discount-template - Chegirma shablonini boshqa mahsulotlarga qo'llash

router.post('/:id/apply-discount-template', async (req, res) => {

  try {

    const customerId = req.params.id;

    const { discount } = req.body; // Chegirma miqdori (masalan: -5 yoki +10)

    

    if (!discount || isNaN(discount)) {

      return res.status(400).json({ error: 'Invalid discount value' });

    }

    

    console.log(`🎁 Mijoz ${customerId} uchun chegirma shabloni qo'llanmoqda: ${discount} UZS`);

    

    // Mijozni olish

    const customer = await prisma.customer.findUnique({

      where: { id: customerId }

    });

    

    if (!customer) {

      return res.status(404).json({ error: 'Customer not found' });

    }

    

    // Barcha mahsulotlarni olish

    const products = await prisma.product.findMany();

    

    // Hozirgi narxlarni olish

    let productPrices: Record<string, number> = {};

    const customerData = customer as any;

    if (customerData.productPrices) {

      try {

        productPrices = typeof customerData.productPrices === 'string' 

          ? JSON.parse(customerData.productPrices) 

          : customerData.productPrices;

      } catch (e) {

        console.error('Error parsing productPrices:', e);

      }

    }

    

    // Har bir mahsulot uchun chegirma qo'llash

    let appliedCount = 0;

    products.forEach(product => {

      if (product.pricePerBag) {

        const newPrice = Math.max(0, product.pricePerBag - discount);

        productPrices[product.id] = newPrice;

        appliedCount++;

        console.log(`  ✅ ${product.name}: ${product.pricePerBag} → ${newPrice} UZS`);

      }

    });

    

    // Yangilangan narxlarni saqlash

    const updatedCustomer = await prisma.customer.update({

      where: { id: customerId },

      data: {

        productPrices: JSON.stringify(productPrices)

      } as any

    });

    

    console.log(`✅ ${appliedCount} ta mahsulot uchun chegirma qo'llandi`);

    

    res.json({

      success: true,

      appliedCount,

      customer: updatedCustomer

    });

  } catch (error: any) {

    console.error('❌ Chegirma shablonini qo\'llashda xatolik:', error.message);

    res.status(500).json({ 

      error: 'Failed to apply discount template',

      details: error.message 

    });

  }

});



// Mijoz to'lovi qilish

router.post('/:id/payment', async (req, res) => {

  try {

    const { id } = req.params;

    const { amount, currency = 'UZS', type = 'CASH', notes, exchangeRate = 12700, debtTarget } = req.body;
    const rate = parseFloat(exchangeRate) || 12700;



    if (!amount || amount <= 0) {

      return res.status(400).json({ error: 'To\'lov summasi kiritilishi shart' });

    }



    const customer = await prisma.customer.findUnique({

      where: { id }

    });



    if (!customer) {

      return res.status(404).json({ error: 'Mijoz topilmadi' });

    }



    // To'lovni amalga oshirish

    const payment = await prisma.$transaction(async (tx) => {

      // To'lovni yaratish

      const newPayment = await tx.customerPayment.create({

        data: {

          customerId: id,

          amount,

          currency,

          type,

          notes,

          createdBy: (req as any).user?.id

        }

      });



      // Mijoz balansini yangilash - debtTarget va cross-currency qo'llab-quvvatlash bilan
      const updateData: any = {
        lastPayment: new Date()
      };

      if (debtTarget === 'UZS') {
        // Foydalanuvchi so'm qarzini yopishni tanlagan — barcha to'lovni so'mga o'girish
        const amountInUZS = currency === 'USD' ? amount * rate : amount;
        if (customer.debtUZS && customer.debtUZS > 0) {
          const debtToDeduct = DecimalHelper.min(amountInUZS, customer.debtUZS);
          updateData.debtUZS = { decrement: debtToDeduct };
          const remaining = DecimalHelper.subtract(amountInUZS, debtToDeduct);
          if (remaining > 0) updateData.balanceUZS = { increment: remaining };
        } else {
          updateData.balanceUZS = { increment: amountInUZS };
        }
      } else if (debtTarget === 'USD') {
        // Foydalanuvchi dollar qarzini yopishni tanlagan — barcha to'lovni dollarga o'girish
        const amountInUSD = currency === 'UZS' ? amount / rate : amount;
        if (customer.debtUSD && customer.debtUSD > 0) {
          const debtToDeduct = DecimalHelper.min(amountInUSD, customer.debtUSD);
          updateData.debtUSD = { decrement: debtToDeduct };
          const remaining = DecimalHelper.subtract(amountInUSD, debtToDeduct);
          if (remaining > 0) updateData.balanceUSD = { increment: remaining };
        } else {
          updateData.balanceUSD = { increment: amountInUSD };
        }
      } else if (currency === 'UZS') {
        // Auto: to'lov valyutasiga mos qarzni kamaytiramiz
        if (customer.debtUZS && customer.debtUZS > 0) {
          const debtToDeduct = DecimalHelper.min(amount, customer.debtUZS);
          updateData.debtUZS = { decrement: debtToDeduct };
          const remaining = DecimalHelper.subtract(amount, debtToDeduct);
          if (remaining > 0) updateData.balanceUZS = { increment: remaining };
        } else if (customer.debtUSD && customer.debtUSD > 0) {
          const amountInUSD = amount / rate;
          const debtToDeduct = DecimalHelper.min(amountInUSD, customer.debtUSD);
          updateData.debtUSD = { decrement: debtToDeduct };
          const remainingUSD = DecimalHelper.subtract(amountInUSD, debtToDeduct);
          if (remainingUSD > 0) updateData.balanceUSD = { increment: remainingUSD };
        } else {
          updateData.balanceUZS = { increment: amount };
        }
      } else if (currency === 'USD') {
        if (customer.debtUSD && customer.debtUSD > 0) {
          const debtToDeduct = DecimalHelper.min(amount, customer.debtUSD);
          updateData.debtUSD = { decrement: debtToDeduct };
          const remaining = DecimalHelper.subtract(amount, debtToDeduct);
          if (remaining > 0) updateData.balanceUSD = { increment: remaining };
        } else if (customer.debtUZS && customer.debtUZS > 0) {
          const amountInUZS = amount * rate;
          const debtToDeduct = DecimalHelper.min(amountInUZS, customer.debtUZS);
          updateData.debtUZS = { decrement: debtToDeduct };
          const remainingUZS = DecimalHelper.subtract(amountInUZS, debtToDeduct);
          if (remainingUZS > 0) updateData.balanceUZS = { increment: remainingUZS };
        } else {
          updateData.balanceUSD = { increment: amount };
        }
      }

      const updatedCustomer = await tx.customer.update({

        where: { id },

        data: updateData

      });



      // Kassa tranzaksiyasini yaratish (valyuta va to'lov usuli bo'yicha)
      const paymentType = type === 'CLICK' ? 'Click' : (type === 'CARD' ? 'Karta' : 'Naqd');
      
      await tx.cashboxTransaction.create({
        data: {
          type: 'INCOME',
          amount,
          currency,
          paymentMethod: type,
          category: 'CUSTOMER_PAYMENT',
          description: `Mijoz to\'lovi: ${customer.name} (${paymentType} ${currency})${notes ? ' - ' + notes : ''}`,
          reference: newPayment.id,
          userId: (req as any).user?.id || 'system',
          userName: (req as any).user?.name || (req as any).user?.login || 'Admin'
        }
      });



      return { payment: newPayment, customer: updatedCustomer };

    });



    // Real-time backup yangilash
    setImmediate(async () => {
      try {
        const { generateDailyExcelBackup } = await import('../utils/daily-excel-backup.js');
        await generateDailyExcelBackup();
      } catch { /* silent */ }
    });

    res.json({

      success: true,

      message: 'To\'lov muvaffaqiyatli amalga oshirildi',

      payment: payment.payment,

      customer: payment.customer

    });

  } catch (error: any) {

    console.error('❌ To\'lov qilishda xatolik:', error.message);

    res.status(500).json({ error: 'To\'lov amalga oshirishda xatolik' });

  }

});



// Mijoz to'lovlar tarixini olish

router.get('/:id/payments', async (req, res) => {

  try {

    const { id } = req.params;

    

    // Avval mijoz mavjudligini tekshiramiz

    const customer = await prisma.customer.findUnique({

      where: { id },

      select: { id: true }

    });

    

    if (!customer) {

      return res.status(404).json({ error: 'Mijoz topilmadi' });

    }

    

    const payments = await prisma.customerPayment.findMany({

      where: { customerId: id },

      orderBy: { createdAt: 'desc' }

    });

    

    res.json(payments);

  } catch (error: any) {

    console.error('❌ To\'lovlarni olishda xatolik:', error.message);

    res.status(500).json({ error: 'To\'lovlarni olishda xatolik', details: error.message });

  }

});



// Mijoz uchun Telegram forum topic yaratish
router.post('/:id/create-topic', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return res.status(404).json(errorResponse('Mijoz topilmadi'));
    }

    const topicId = await createCustomerTopic(id);
    if (!topicId) {
      return res.status(400).json(errorResponse(
        'Forum topic yaratib bo\'lmadi. TELEGRAM_SALES_CHANNEL_ID ni tekshiring va bot groupda admin ekanligiga ishonch hosil qiling.'
      ));
    }

    res.json(successResponse({ topicId }, 'Forum topic muvaffaqiyatli yaratildi'));
  } catch (error: any) {
    console.error('Forum topic yaratishda xatolik:', error);
    res.status(500).json(errorResponse('Forum topic yaratishda xatolik', error.message));
  }
});

// Barcha mijozlar uchun forum topic yaratish (batch)
router.post('/create-all-topics', async (req: AuthRequest, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { telegramTopicId: null }
    });

    const results: { name: string; topicId: number | null }[] = [];
    for (const customer of customers) {
      const topicId = await createCustomerTopic(customer.id);
      results.push({ name: customer.name, topicId });
      // Rate limit: Telegram 1 req/sec
      await new Promise(r => setTimeout(r, 1100));
    }

    res.json(successResponse(results, `${results.length} ta mijoz uchun topic yaratildi`));
  } catch (error: any) {
    res.status(500).json(errorResponse('Batch topic yaratishda xatolik', error.message));
  }
});

export default router;

