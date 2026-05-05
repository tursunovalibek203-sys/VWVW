import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

// Exchange rate - should come from environment or settings
const exchangeRates = {
  USD_TO_UZS: parseInt(process.env.EXCHANGE_RATE_USD_TO_UZS || '12500', 10)
};
import { OrderWorkflow } from '../services/order-workflow';
import {
  OrderCreateSchema,
  OrderStatusUpdateSchema,
  OrderPaymentSchema,
  validateBody
} from '../utils/validation';

const router = Router();

router.use(authenticate);

// Barcha buyurtmalarni olish
router.get('/', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Buyurtma yaratish - TRANSACTION bilan atomic operatsiya va Zod validation
router.post('/', 
  authorize('ADMIN', 'CASHIER', 'MANAGER', 'WAREHOUSE_MANAGER'),
  validateBody(OrderCreateSchema),
  async (req: AuthRequest & { validatedBody: any }, res) => {
  try {
    // Validated body dan ma'lumotlarni olish
    const { customerId, items, notes, priority, requestedDate, source } = req.validatedBody;
    
    console.log('Create order request:', {
      userRole: req.user?.role,
      userId: req.user?.id,
      itemsCount: items?.length
    });

    console.log('📦 Processing items:', items);
    console.log('📦 Items count:', items.length);

    // 🔒 TRANSACTION: Barcha operatsiyalar atomik bajariladi
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mijoz mavjudligini tekshirish
      const customer = await tx.customer.findUnique({
        where: { id: customerId }
      });
      
      if (!customer) {
        throw new Error(`Mijoz topilmadi: ${customerId}`);
      }

      // 2. Mahsulotlarni LOCK bilan olish (race condition oldini olish)
      const productIds = items.map(item => item.productId).filter(Boolean);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } }
      });
      
      const productMap = new Map(products.map(p => [p.id, p]));

      // 3. Validatsiya va hisoblash
      let totalAmount = 0;
      const orderItems = [];
      const inventoryCheck = [];

      for (const item of items) {
        if (!item.productId || item.productId.trim() === '') {
          throw new Error(`Mahsulot ID kiritilmagan`);
        }

        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Mahsulot topilmadi: ${item.productId}`);
        }

        const quantityBags = Math.max(0, parseInt(item.quantityBags) || 0);
        const quantityUnits = Math.max(0, parseInt(item.quantityUnits) || 0);
        const pricePerBag = parseFloat(product.pricePerBag?.toString() || '0');
        
        if (pricePerBag <= 0) {
          throw new Error(`${product.name} narxi noto'g'ri: ${pricePerBag}`);
        }

        // 💰 Floating point xatolarni oldini olish - 2 kasr bilan
        const subtotal = Math.round((quantityBags * pricePerBag + quantityUnits * (pricePerBag / product.unitsPerBag)) * 100) / 100;
        totalAmount = Math.round((totalAmount + subtotal) * 100) / 100;

        // Ombor holatini tekshirish
        const inStock = product.currentStock;
        const needed = quantityBags;
        const shortage = Math.max(0, needed - inStock);

        inventoryCheck.push({
          productId: product.id,
          productName: product.name,
          ordered: needed,
          inStock: inStock,
          needProduction: shortage,
          status: shortage > 0 ? 'NEED_PRODUCTION' : 'IN_STOCK'
        });

        orderItems.push({
          productId: item.productId,
          quantityBags,
          quantityUnits,
          pricePerBag,
          subtotal
        });
      }

      // 4. Buyurtma raqamini yaratish
      const prefix = source === 'BOT' ? 'BOT-' : 'ORD-';
      const orderNumber = `${prefix}${Date.now()}`;

      // 5. Buyurtma yaratish (transaction ichida)
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          status: 'CONFIRMED',
          priority: priority || 'NORMAL',
          requestedDate: requestedDate ? new Date(requestedDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
          totalAmount,
          notes: JSON.stringify({
            userNotes: notes || '',
            inventoryCheck: inventoryCheck
          }),
          items: {
            create: orderItems.map(item => ({
              productId: item.productId,
              quantityBags: item.quantityBags,
              quantityUnits: item.quantityUnits,
              pricePerBag: item.pricePerBag,
              subtotal: item.subtotal
            }))
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

      return { order, inventoryCheck };
    }, {
      // Transaction sozlamalari
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000
    });

    // Ombor tekshiruvi natijasini qaytarish
    res.json({
      order: result.order,
      inventoryCheck: result.inventoryCheck
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    
    // Aniq xatolik xabarini qaytarish
    if (error.message?.includes('Mijoz topilmadi')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message?.includes('Mahsulot')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: 'Failed to create order',
      details: error.message || 'Unknown error'
    });
  }
});

// Buyurtma holatini yangilash
router.put('/:id/status', authorize('ADMIN', 'CASHIER', 'MANAGER', 'WAREHOUSE_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Agar IN_PRODUCTION ga o'tkazilayotgan bo'lsa, mahsulotlar tayyor ekanligini tekshiramiz
    if (status === 'IN_PRODUCTION') {
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (order) {
        // Barcha mahsulotlar omborda borligini tekshirish
        let allProductsReady = true;
        for (const item of order.items) {
          if (item.product && item.product.currentStock < item.quantityBags) {
            allProductsReady = false;
            break;
          }
        }

        // Agar barcha mahsulotlar tayyor bo'lsa, avtomatik READY ga o'tkazamiz
        if (allProductsReady) {
          const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status: 'READY' },
            include: { 
              customer: true,
              items: {
                include: {
                  product: true
                }
              }
            }
          });

          // Mijozga Telegram orqali xabar yuborish
          if (updatedOrder.customer.telegramChatId && updatedOrder.customer.notificationsEnabled) {
            try {
              const { superCustomerBot } = await import('../bot/super-customer-bot');
              
              const message = `
✅ **BUYURTMA TAYYOR!**

📋 **Buyurtma:** \`${updatedOrder.orderNumber}\`
📅 **Sana:** ${new Date().toLocaleDateString('uz-UZ')}

Buyurtmangiz tayyor! Olib ketishingiz yoki yetkazib berishni buyurtma qilishingiz mumkin.

📦 **Mahsulotlar:**
${updatedOrder.items.map((item: any, index: number) => 
  `${index + 1}. ${item.product.name} - ${item.quantityBags} qop`
).join('\n')}

💵 **Jami:** ${updatedOrder.totalAmount.toLocaleString()} so'm

📞 Aloqa: +998 90 123 45 67
              `;

              if (superCustomerBot) {
                await superCustomerBot.sendMessage(updatedOrder.customer.telegramChatId, message, {
                  parse_mode: 'Markdown'
                });
                console.log(`✅ Auto-ready notification sent to customer ${updatedOrder.customer.name}`);
              }
            } catch (telegramError) {
              console.error('Telegram notification error:', telegramError);
            }
          }

          return res.json(updatedOrder);
        }
      }
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { 
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Mijozga Telegram orqali xabar yuborish
    if (order.customer.telegramChatId && order.customer.notificationsEnabled) {
      try {
        const { superCustomerBot } = await import('../bot/super-customer-bot');
        
        const statusMessages: Record<string, { emoji: string; title: string; message: string }> = {
          'CONFIRMED': {
            emoji: '✅',
            title: 'Buyurtma tasdiqlandi',
            message: 'Buyurtmangiz qabul qilindi va ishlab chiqarishga yuborildi.'
          },
          'IN_PRODUCTION': {
            emoji: '🏭',
            title: 'Ishlab chiqarilmoqda',
            message: 'Buyurtmangiz hozir ishlab chiqarilmoqda.'
          },
          'READY': {
            emoji: '✅',
            title: 'Buyurtma tayyor',
            message: 'Buyurtmangiz tayyor! Olib ketishingiz yoki yetkazib berishni buyurtma qilishingiz mumkin.'
          },
          'SOLD': {
            emoji: '🎉',
            title: 'Buyurtma yakunlandi',
            message: 'Buyurtmangiz muvaffaqiyatli yakunlandi. Xaridingiz uchun rahmat!'
          },
          'CANCELLED': {
            emoji: '❌',
            title: 'Buyurtma bekor qilindi',
            message: 'Buyurtmangiz bekor qilindi. Batafsil ma\'lumot uchun operator bilan bog\'laning.'
          }
        };

        const statusInfo = statusMessages[status] || {
          emoji: '📦',
          title: 'Buyurtma holati o\'zgarди',
          message: `Buyurtmangiz holati: ${status}`
        };

        const message = `
${statusInfo.emoji} **${statusInfo.title.toUpperCase()}**

📋 **Buyurtma:** \`${order.orderNumber}\`
📅 **Sana:** ${new Date().toLocaleDateString('uz-UZ')}

${statusInfo.message}

📦 **Mahsulotlar:**
${order.items.map((item: any, index: number) => 
  `${index + 1}. ${item.product.name} - ${item.quantityBags} qop`
).join('\n')}

💵 **Jami:** ${order.totalAmount.toLocaleString()} so'm

${status === 'READY' ? '\n📞 Aloqa: +998 90 123 45 67' : ''}
${status === 'CANCELLED' ? '\n📞 Savol bo\'lsa: +998 90 123 45 67' : ''}
        `;

        if (superCustomerBot) {
          await superCustomerBot.sendMessage(order.customer.telegramChatId, message, {
            parse_mode: 'Markdown'
          });
          console.log(`✅ Status notification sent to customer ${order.customer.name}`);
        }
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
        // Telegram xatosi asosiy jarayonni to'xtatmasin
      }
    }

    // Holat o'zgarishiga qarab workflow'ni ishga tushirish
    if (status === 'DELIVERED') {
      // Yetkazib berish tugaganini workflow'ga xabar berish
      const delivery = await prisma.delivery.findFirst({
        where: { saleId: id }
      });
      
      if (delivery) {
        await OrderWorkflow.onDeliveryCompleted(delivery.id);
      }
    }

    res.json(order);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Buyurtmani sotish (READY -> SOLD) va to'lov qabul qilish
router.post('/:id/sell', authorize('ADMIN', 'CASHIER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { paymentDetails, dueDate } = req.body;
    // paymentDetails: { uzs: 0, usd: 0, click: 0 }
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
    }
    
    if (order.status !== 'READY') {
      return res.status(400).json({ error: 'Faqat tayyor buyurtmalarni sotish mumkin' });
    }
    
    // To'lovni hisoblash
    const totalPaid = (paymentDetails?.uzs || 0) + (paymentDetails?.usd || 0) + (paymentDetails?.click || 0);
    const remainingDebt = order.totalAmount - totalPaid;
    
    // Buyurtmani yangilash
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'SOLD',
        notes: JSON.stringify({
          ...JSON.parse(order.notes || '{}'),
          paymentDetails,
          soldAt: new Date().toISOString(),
          totalPaid,
          remainingDebt
        })
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
    
    // Agar to'liq to'lanmagan bo'lsa, mijoz daftariga qarz yozish
    if (remainingDebt > 0) {
      await prisma.customer.update({
        where: { id: order.customerId },
        data: {
          debt: {
            increment: remainingDebt
          }
        }
      });
      
      // Qarz eslatma sanasini belgilash
      if (dueDate) {
        // Bu yerda eslatma tizimiga qo'shish mumkin
        console.log(`Qarz eslatma: ${order.customer.name} - $${remainingDebt} - ${dueDate}`);
      }
    }
    
    // Kassa tranzaksiyasini yaratish
    if (paymentDetails) {
      try {
        // UZS (Naqd)
        if (paymentDetails.uzs && paymentDetails.uzs > 0) {
          await prisma.cashboxTransaction.create({
            data: {
              type: 'INCOME',
              amount: paymentDetails.uzs,
              category: 'SALE',
              description: `Buyurtma #${order.orderNumber} (Naqd)`,
              userId: req.user!.id,
              userName: req.user!.name || 'Admin',
              reference: order.id
            }
          });
          console.log(`✅ Kassa (UZS): ${paymentDetails.uzs} so'm`);
        }
        
        // USD (Dollar) - Convert to UZS for consistent cashbox tracking
        if (paymentDetails.usd && paymentDetails.usd > 0) {
          const usdInUZS = paymentDetails.usd * exchangeRates.USD_TO_UZS;
          await prisma.cashboxTransaction.create({
            data: {
              type: 'INCOME',
              amount: usdInUZS,  // Store in UZS for consistency
              currency: 'UZS',     // Explicitly set currency
              category: 'SALE',
              description: `Buyurtma #${order.orderNumber} (Dollar ${paymentDetails.usd} USD)`,
              userId: req.user!.id,
              userName: req.user!.name || 'Admin',
              reference: order.id
            }
          });
          console.log(`✅ Kassa (USD): $${paymentDetails.usd} = ${usdInUZS} UZS`);
        }
        
        // CLICK
        if (paymentDetails.click && paymentDetails.click > 0) {
          await prisma.cashboxTransaction.create({
            data: {
              type: 'INCOME',
              amount: paymentDetails.click,
              category: 'SALE',
              description: `Buyurtma #${order.orderNumber} (Click)`,
              userId: req.user!.id,
              userName: req.user!.name || 'Admin',
              reference: order.id
            }
          });
          console.log(`✅ Kassa (Click): ${paymentDetails.click} so'm`);
        }
      } catch (error) {
        console.log(`⚠️ Kassa tranzaksiyasi xatolik:`, error);
      }
    }
    
    // Mahsulot zaxiralarini kamaytirish (SOTILGANDA)
    for (const item of order.items) {
      try {
        await prisma.product.update({
          where: { id: item.productId! },
          data: {
            currentStock: {
              decrement: item.quantityBags
            }
          }
        });
        console.log(`✅ Mahsulot zaxirasi kamaytirildi: ${item.product?.name || 'Noma\'lum'} - ${item.quantityBags} qop`);
      } catch (stockError) {
        console.error(`⚠️ Zaxirani kamaytirishda xatolik (${item.product?.name || 'Noma\'lum'}):`, stockError);
        // Zaxira xatosi sotuvni to'xtatmasligi kerak
      }
    }
    
    // Telegram orqali chek yuborish
    if (order.customer.telegramChatId && order.customer.notificationsEnabled) {
      try {
        const { sendInvoiceToCustomer } = await import('../utils/telegram-notifications');
        await sendInvoiceToCustomer(order.customer.telegramChatId, {
          orderNumber: order.orderNumber,
          items: order.items.map(item => ({
            name: item.product?.name || 'Noma\'lum',
            quantity: `${item.quantityBags} qop, ${item.quantityUnits} dona`,
            price: item.pricePerBag,
            subtotal: item.subtotal
          })),
          totalAmount: order.totalAmount,
          paidAmount: totalPaid,
          remainingDebt: remainingDebt,
          paymentDetails: paymentDetails,
          dueDate: dueDate
        });
      } catch (telegramError) {
        console.error('Telegram chek yuborishda xatolik:', telegramError);
        // Telegram xatosi asosiy jarayonni to'xtatmasin
      }
    }
    
    res.json({
      order: updatedOrder,
      totalPaid,
      remainingDebt,
      message: remainingDebt > 0 
        ? `✅ Buyurtma sotildi! Qarz: $${remainingDebt.toFixed(2)}` 
        : '✅ Buyurtma to\'liq to\'lanib sotildi!'
    });
  } catch (error: any) {
    console.error('Sell order error:', error);
    res.status(500).json({ error: 'Buyurtmani sotishda xatolik' });
  }
});

// Haydovchi to'lovini qabul qilish
router.post('/:id/driver-payment', authorize('ADMIN', 'CASHIER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { driverId, paymentMethod, amount, notes } = req.body;
    
    if (!driverId || !paymentMethod || amount <= 0) {
      return res.status(400).json({ error: 'Haydovchi ID, tolov usuli va summa kiritilishi shart!' });
    }
    
    // Buyurtmani topish
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
    }
    
    // Haydovchini topish
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });
    
    if (!driver) {
      return res.status(404).json({ error: 'Haydovchi topilmadi' });
    }
    
    // Buyurtmani yangilash
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        paidAmount: {
          increment: amount
        },
        status: order.paidAmount + amount >= order.totalAmount ? 'SOLD' : order.status
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
    
    // To'lov yozuvini yaratish (keyinchalik Payment model qo'shilganda)
    // await prisma.payment.create({
    //   data: {
    //     saleId: id,
    //     driverId: driverId,
    //     amount: amount,
    //     method: paymentMethod,
    //     notes: notes,
    //     status: 'COMPLETED',
    //     createdAt: new Date()
    //   }
    // });
    
    // Mahsulot zaxirasini kamaytirish (agar birinchi marta sotilayotgan bo'lsa)
    if (order.paidAmount === 0 && updatedOrder.status === 'SOLD') {
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId! },
          data: {
            currentStock: {
              decrement: item.quantityBags
            }
          }
        });
      }
    }
    
    // Haydovchiga xabar yuborish
    if (driver.telegramChatId) {
      try {
        // Haydovchiga xabar yuborish logikasi
        console.log(`Haydovchiga to'lov xabari yuborildi: ${driver.name} - $${amount}`);
      } catch (telegramError) {
        console.error('Haydovchiga xabar yuborishda xatolik:', telegramError);
      }
    }
    
    const driverTotalPaid = updatedOrder.paidAmount;
    const driverRemainingDebt = updatedOrder.totalAmount - driverTotalPaid;
    
    res.json({
      order: updatedOrder,
      payment: {
        driverId,
        amount,
        method: paymentMethod,
        notes
      },
      totalPaid: driverTotalPaid,
      remainingDebt: driverRemainingDebt,
      message: driverRemainingDebt > 0 
        ? `✅ Haydovchi to'lovi qabul qilindi! Qarz: $${driverRemainingDebt.toFixed(2)}` 
        : '✅ Buyurtma to\'liq to\'landi va sotildi!'
    });
  } catch (error: any) {
    console.error('Driver payment error:', error);
    res.status(500).json({ error: 'Haydovchi to\'lovini qabul qilishda xatolik' });
  }
});

// Buyurtmani o'chirish
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    await prisma.order.delete({
      where: { id }
    });
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Buyurtma tafsilotlarini olish
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
      }
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

export default router;