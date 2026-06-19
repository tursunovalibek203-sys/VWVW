import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { notifyCustomerSale, notifyLowStock } from '../utils/telegram-notifications';
import { createInvoiceForSale } from '../utils/invoice-generator';
import { logger } from '../utils/logger';
import { 
  SaleCreateSchema, 
  SaleUpdateSchema, 
  validateBody,
  parseMoney 
} from '../utils/validation';
import { logSalesAction } from '../utils/sales-audit';
import { paginatedResponse, successResponse, errorResponse } from '../utils/response';
import { DecimalHelper } from '../utils/decimal-helper';
import { salesService } from '../services/SalesService';

const router = Router();

// Exchange rate - should come from environment or settings
const exchangeRates = {
  USD_TO_UZS: parseInt(process.env.EXCHANGE_RATE_USD_TO_UZS || '12500', 10)
};

router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { productId, customerId, limit = '100', page = '1' } = req.query;
    
    const take = Math.min(parseInt(limit as string) || 100, 500);
    const skip = (Math.max(parseInt(page as string) || 1, 1) - 1) * take;
    
    let total = 0;
    
    // Foydalanuvchi roli bo'yicha filter
    const userRole = req.user?.role;
    const userId = req.user?.id;
    
    // Asosiy where sharti
    let where: any = customerId 
      ? { customerId: customerId as string }
      : productId 
        ? { items: { some: { productId: productId as string } } }
        : {};
    
    // Agar SELLER bo'lsa, faqat o'zining sotuvlarini ko'radi
    if (userRole === 'SELLER' && userId) {
      where = {
        ...where,
        userId: userId
      };
    }
    // ADMIN, CASHIER, ACCOUNTANT barcha sotuvlarni ko'radi
    // (where o'zgarmaydi)
    
    // Total count + sales in parallel (2 queries instead of 4)
    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        select: {
          id: true,
          receiptNumber: true,
          createdAt: true,
          totalAmount: true,
          paidAmount: true,
          currency: true,
          paymentStatus: true,
          isKocha: true,
          manualCustomerName: true,
          quantity: true,
          customer: {
            select: { id: true, name: true, phone: true }
          },
          user: {
            select: { id: true, name: true }
          },
          driver: {
            select: { id: true, name: true }
          },
          items: {
            select: {
              id: true,
              quantity: true,
              pricePerBag: true,
              subtotal: true,
              product: {
                select: { id: true, name: true, pricePerBag: true }
              },
              variant: {
                select: {
                  id: true,
                  variantName: true,
                  parent: { select: { id: true, name: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
    ]);

    const salesWithData = sales.map(sale => ({
      ...sale,
      debtAmount: DecimalHelper.subtract(sale.totalAmount, sale.paidAmount),
      itemCount: sale.items?.length || 0,
    }));
    
    // âœ… STANDARD API RESPONSE FORMAT
    res.json(paginatedResponse(
      { sales: salesWithData },
      {
        total,
        page: Math.floor(skip / take) + 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      }
    ));
  } catch (error: any) {
    console.error('GET /sales xatolik:', error.message);
    res.status(500).json(errorResponse('Failed to fetch sales', error.message));
  }
});

// Get single sale by ID   
router.get('/:id', async (req, res) => {
  try {       
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        driver: true,
        product: true,
        items: {
          include: {
            product: true
          }
        },
        invoice: true
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    console.error('Get sale by ID error:', error);
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// POST /sales - Sotuv yaratish (Zod validation bilan)
// POST /sales - Create sale (Service-based, clean implementation)
router.post('/', 
  authorize('ADMIN', 'CASHIER', 'SELLER'),
  validateBody(SaleCreateSchema),
  async (req: AuthRequest & { validatedBody: any }, res: any) => {
    try {
      const userId = req.user?.id;
      const userName = (req.user as any)?.name || req.user?.email || 'Unknown';

      if (!userId) {
        return res.status(401).json(errorResponse('Foydalanuvchi aniqlanmadi'));
      }

      // âœ… USE SERVICE LAYER - All business logic moved to service
      const sale = await salesService.createSale({
        ...req.validatedBody,
        userId,
        userName
      });

      // Optional: Invoice and notifications (non-blocking)
      try {
        await Promise.all([
          createInvoiceForSale(sale.id),
          notifyCustomerSale(sale.id)
        ]);
      } catch (err) {
        // Log but don't fail the request
        logger.warn({ error: err }, 'Invoice/notification failed');
      }

      // Audit log
      try {
        await logSalesAction({
          userId,
          userName,
          action: 'SOTUV YARATISH',
          entity: 'SALES',
          entityId: sale.id,
          customerId: sale.customerId,
          customerName: sale.customer?.name || req.validatedBody.manualCustomerName || 'Noma\'lum',
          details: {
            type: 'CREATE',
            totalAmount: sale.totalAmount,
            paidAmount: sale.paidAmount,
            currency: sale.currency,
            paymentStatus: sale.paymentStatus,
            paymentMethod: sale.paymentMethod,
            products: sale.items?.map(item => ({
              productId: item.productId || '',
              productName: item.product?.name || 'Noma\'lum',
              quantity: item.quantity,
              price: item.pricePerBag || 0
            })) || []
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
      } catch (err) {
        logger.warn({ error: err }, 'Audit log failed');
      }

      // âœ… STANDARD RESPONSE FORMAT
      res.json(successResponse(sale));
    } catch (error: any) {
      // #region debug-point D:sales-route-error
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"auth-sale-realtime",runId:"pre-fix",hypothesisId:"D",location:"server/routes/sales.ts:257",msg:"[DEBUG] sales route error",data:{message:error?.message,name:error?.name,code:error?.code,stackTop:error?.stack?.split('\n').slice(0,4).join('\n')},ts:Date.now()})}).catch(()=>{});
      // #endregion
      logger.error({ error }, 'Create sale error');
      res.status(500).json(errorResponse(error.message));
    }
  }
);
// Update sale (Zod validation bilan)
router.put('/:id', 
  authorize('ADMIN', 'CASHIER', 'SELLER'),
  validateBody(SaleUpdateSchema),
  async (req: AuthRequest & { validatedBody: any }, res: any) => {
  try {
    const { id } = req.params;
    const { 
      customerId, 
      items, 
      totalAmount, 
      paidAmount, 
      currency,
      paymentStatus, 
      paymentDetails,
      isKocha,
      manualCustomerName,
      manualCustomerPhone,
      driverId,
      factoryShare,
      customerShare
    } = req.validatedBody;

    console.log('ðŸ“¥ PUT /sales - Data:', { id, customerId, isKocha, itemsCount: items?.length });

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Foydalanuvchi aniqlanmadi' });
    }

    // Eski sotuvni olish
    const oldSale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true
      }
    });

    if (!oldSale) {
      return res.status(404).json({ error: 'Sotuv topilmadi' });
    }

    // Ownership check: SELLER can only edit their own sales
    if (req.user?.role?.toUpperCase() === 'SELLER' && oldSale.userId !== req.user.id) {
      return res.status(403).json({ error: 'Siz faqat o\'z sotuvlaringizni tahrirlay olasiz' });
    }

    // 1. Eski mahsulotlarni omborda qaytarish (saleType ni hisobga olish)
    for (const oldItem of oldSale.items) {
      if (!oldItem.productId) continue;
      
      const oldProduct = await prisma.product.findUnique({ where: { id: oldItem.productId } });
      if (!oldProduct) continue;
      
      // Dona savdo bo'lsa, quantity ni dona hisoblaymiz
      const isPieceSale = (oldItem as any).saleType === 'piece';
      let bagsToReturn = oldItem.quantity;
      let unitsToReturn = oldItem.quantity * oldProduct.unitsPerBag;
      
      if (isPieceSale) {
        bagsToReturn = oldItem.quantity / oldProduct.unitsPerBag;
        unitsToReturn = oldItem.quantity;
      }
      
      await prisma.product.update({
        where: { id: oldItem.productId },
        data: {
          currentStock: { increment: bagsToReturn },
          currentUnits: { increment: unitsToReturn }
        }
      });
    }

    // 2. Yangi mahsulotlarni tekshirish
    const validationResults = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        return res.status(404).json({ error: `Mahsulot topilmadi: ${item.productId}` });
      }

      const requestedQty = parseFloat(item.quantity) || 0;
      
      // Dona savdo tekshiruvi
      const isPieceSale = item.saleType === 'piece';
      const availableStock = isPieceSale ? product.currentUnits : product.currentStock;
      const unitLabel = isPieceSale ? 'dona' : 'qop';
      
      if (availableStock < requestedQty) {
        return res.status(400).json({ 
          error: `${product.name} uchun omborda yetarli mahsulot yo'q (${unitLabel} yetarli emas)`,
          available: availableStock,
          requested: requestedQty,
          unit: unitLabel
        });
      }

      const price = parseFloat(item.pricePerBag || item.pricePerPiece || 0);
      validationResults.push({ product, item, subtotal: requestedQty * price });
    }

    // To'lov statusini hisoblash (server tomondan)
    const finalTotalAmount = parseFloat(totalAmount) || 0;
    const finalPaidAmount = parseFloat(paidAmount) || 0;
    let calculatedPaymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    
    if (finalPaidAmount >= finalTotalAmount && finalTotalAmount > 0) {
      calculatedPaymentStatus = 'PAID';
    } else if (finalPaidAmount > 0 && finalPaidAmount < finalTotalAmount) {
      calculatedPaymentStatus = 'PARTIAL';
    } else {
      calculatedPaymentStatus = 'UNPAID';
    }
    
    // Payment status hisoblandi
    
    // 3. Sotuvni yangilash
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        customerId: isKocha ? null : customerId,
        userId: userId,
        driverId: driverId || null,
        quantity: items.reduce((sum: number, item: any) => sum + (parseFloat(item.quantity) || 0), 0),
        pricePerBag: 0,
        totalAmount: finalTotalAmount,
        paidAmount: finalPaidAmount,
        currency: currency || 'USD',
        paymentStatus: calculatedPaymentStatus,
        paymentDetails: paymentDetails ? (typeof paymentDetails === 'string' ? paymentDetails : JSON.stringify(paymentDetails)) : null,
        factoryShare: parseFloat(factoryShare) || 0,
        customerShare: parseFloat(customerShare) || 0,
        isKocha: !!isKocha,
        manualCustomerName: manualCustomerName || null,
        manualCustomerPhone: manualCustomerPhone || null,
      },
      include: {
        customer: true,
      },
    });

    // 4. Eski sale items o'chirish
    await prisma.saleItem.deleteMany({
      where: { saleId: id }
    });

    // 5. Ð¯Ð½Ð³Ð¸ sale items ÑÑ€Ð°Ñ‚Ð¸Ñˆ
    const saleItems = [];
    for (const validation of validationResults) {
      const saleItem = await prisma.saleItem.create({
        data: {
          saleId: id,
          productId: validation.item.productId,
          quantity: parseFloat(validation.item.quantity),
          pricePerBag: parseFloat(validation.item.pricePerBag || validation.item.pricePerPiece || 0),
          subtotal: validation.subtotal
        },
        include: {
          product: true
        }
      });
      saleItems.push(saleItem);
    }

    // 6. Yangi mahsulotlarni ombordan kamaytirish
    for (const validation of validationResults) {
      const { product, item } = validation;
      const quantity = parseFloat(item.quantity);
      
      // Dona savdo uchun ombor kamaytirish
      const isPieceSale = item.saleType === 'piece';
      let bagsToDeduct = quantity;
      let unitsToDeduct = quantity * product.unitsPerBag;
      
      if (isPieceSale) {
        bagsToDeduct = quantity / product.unitsPerBag;
        unitsToDeduct = quantity;
      }
      
      const newStock = product.currentStock - bagsToDeduct;
      const newUnits = product.currentUnits - unitsToDeduct;
      
      await prisma.product.update({
        where: { id: product.id },
        data: {
          currentStock: newStock,
          currentUnits: newUnits
        }
      });

      // Stock yangilandi

      // Stock movement ÑÑ€Ð°Ñ‚Ð¸Ñˆ
      try {
        const bagsChange = isPieceSale ? -(quantity / product.unitsPerBag) : -quantity;
        const unitsChange = isPieceSale ? -quantity : -(quantity * product.unitsPerBag);
        
        await prisma.stockMovement.create({
          data: {
            productId: product.id,
            type: 'SALE',
            quantity: bagsChange,
            units: unitsChange,
            previousStock: product.currentStock,
            previousUnits: product.currentUnits,
            newStock: newStock,
            newUnits: newUnits,
            userId: userId,
            userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
            reason: `Sotuv tahrirlandi: ${id}`,
            notes: `Mijoz: ${updatedSale.isKocha ? updatedSale.manualCustomerName || 'Ko\'cha' : updatedSale.customer?.name || 'Noma\'lum'}, Mahsulot: ${product.name}, Tip: ${isPieceSale ? 'dona' : 'qop'}`
          }
        });
      } catch (error) {
        console.log(`âš ï¸ ${product.name} StockMovement yaratilmadi:`, error);
      }
    }

    // 7. Mijoz qarz va balansni yangilash
    // âœ… DECIMAL FIX: Use DecimalHelper for debt calculations
    const oldDebt = DecimalHelper.subtract(oldSale.totalAmount, oldSale.paidAmount);
    const newDebt = DecimalHelper.subtract(parseFloat(totalAmount), parseFloat(paidAmount));
    const debtDifference = DecimalHelper.subtract(newDebt, oldDebt);
    const saleCurrency = currency || 'USD';

    if (debtDifference !== 0 && customerId) {
      try {
        if (saleCurrency === 'UZS') {
          await prisma.customer.update({
            where: { id: customerId },
            data: {
              debtUZS: {
                increment: debtDifference
              }
            }
          });
          // Mijoz qarz yangilandi (UZS)
        } else {
          await prisma.customer.update({
            where: { id: customerId },
            data: {
              debtUSD: {
                increment: debtDifference
              }
            }
          });
          // Mijoz qarz yangilandi (USD)
        }
      } catch (error) {
        // MOLIYAVIY NOMUVOFIQLIK: sotuv yangilandi, lekin mijoz qarzi yangilanmadi.
        // Jim yutmaymiz - qo'lda rekonsiliatsiya uchun ko'rinadigan log.
        logger.error('Sale updated but customer debt update FAILED - manual reconciliation required', {
          saleId: (req.params as any)?.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 8. Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE_SALE',
          entity: 'Sale',
          entityId: id,
          changes: JSON.stringify({
            old: {
              customerId: oldSale.customerId,
              totalAmount: oldSale.totalAmount,
              paidAmount: oldSale.paidAmount,
              items: oldSale.items.map(item => ({
                productName: item.product?.name || 'Noma\'lum mahsulot',
                quantity: item.quantity,
                subtotal: item.subtotal
              }))
            },
            new: {
              customerId,
              totalAmount: parseFloat(totalAmount),
              paidAmount: parseFloat(paidAmount),
              items: saleItems.map(item => ({
                productName: item.product?.name || 'Noma\'lum mahsulot',
                quantity: item.quantity,
                subtotal: item.subtotal
              }))
            }
          })
        }
      });
      console.log(`âœ… Audit log yaratildi`);
    } catch (error) {
      console.log(`âš ï¸ Audit log xatolik:`, error);
    }

    res.json({
      ...updatedSale,
      items: saleItems
    });
  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: 'Sotuvni tahrirlashda xatolik' });
  }
});

// Delete sale
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    console.log('ðŸ—‘ï¸ DELETE /sales - ID:', id);

    // 1. Sotuvni va uning mahsulotlarini olish
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        customer: true
      }
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sotuv topilmadi' });
    }

    // 2. Omborda mahsulotlarni qaytarish (saleType ni hisobga olish)
    for (const item of sale.items) {
      if (!item.productId) continue;
      
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;
      
      // Dona savdo bo'lsa, quantity ni dona hisoblaymiz
      const isPieceSale = (item as any).saleType === 'piece';
      let bagsToReturn = item.quantity;
      let unitsToReturn = item.quantity * product.unitsPerBag;
      
      if (isPieceSale) {
        bagsToReturn = item.quantity / product.unitsPerBag;
        unitsToReturn = item.quantity;
      }
      
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          currentStock: { increment: bagsToReturn },
          currentUnits: { increment: unitsToReturn }
        }
      });

      // Stock movement yaratish
      try {
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'SALE_CANCEL',
            quantity: bagsToReturn,
            units: unitsToReturn,
            previousStock: product.currentStock,
            previousUnits: product.currentUnits,
            newStock: product.currentStock + bagsToReturn,
            newUnits: product.currentUnits + unitsToReturn,
            userId: userId || 'system',
            userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
            reason: `Sotuv o'chirildi: ${id}`,
            notes: `Mijoz: ${sale.isKocha ? sale.manualCustomerName || 'Ko\'cha' : sale.customer?.name || 'Noma\'lum'}, Mahsulot: ${product.name}, Tip: ${isPieceSale ? 'dona' : 'qop'}`
          }
        });
      } catch (error) {
        console.log(`âš ï¸ ${product.name} StockMovement yaratilmadi:`, error);
      }
    }

    // 3. Mijoz qarzini kamaytirish
    // âœ… DECIMAL FIX: Use DecimalHelper for debt calculation
    const debtToReduce = DecimalHelper.subtract(sale.totalAmount, sale.paidAmount);
    if (debtToReduce !== 0 && sale.customerId) {
      try {
        if (sale.currency === 'UZS') {
          await prisma.customer.update({
            where: { id: sale.customerId },
            data: {
              debtUZS: {
                decrement: debtToReduce
              }
            }
          });
        } else {
          await prisma.customer.update({
            where: { id: sale.customerId },
            data: {
              debtUSD: {
                decrement: debtToReduce
              }
            }
          });
        }
        console.log(`âœ… Mijoz qarzi kamaytirildi: -${debtToReduce} ${sale.currency}`);
      } catch (error) {
        logger.error('Sale deleted but customer debt reduction FAILED - manual reconciliation required', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // 4. Audit log
    try {
      await prisma.auditLog.create({
        data: {
          userId: userId || 'system',
          action: 'DELETE_SALE',
          entity: 'Sale',
          entityId: id,
          changes: JSON.stringify({
            deletedSale: {
              id: sale.id,
              customerId: sale.customerId,
              totalAmount: sale.totalAmount,
              paidAmount: sale.paidAmount,
              items: sale.items.map(item => ({
                productName: item.product?.name || 'Noma\'lum mahsulot',
                quantity: item.quantity,
                subtotal: item.subtotal
              }))
            }
          })
        }
      });
    } catch (error) {
      console.log(`âš ï¸ Audit log xatolik:`, error);
    }

    // 5. Sotuvni o'chirish (saleItems cascade delete bo'lishi kerak, bo'lmasa deleteMany qilish kerak)
    // Prisma-da odatda onDelete: Cascade bo'ladi, lekin ishonch uchun:
    await prisma.saleItem.deleteMany({
      where: { saleId: id }
    });

    await prisma.sale.delete({
      where: { id }
    });

    res.json({ message: 'Sotuv muvaffaqiyatli o\'chirildi' });
  } catch (error: any) {
    console.error('Delete sale error:', error);
    res.status(500).json({ error: 'Sotuvni o\'chirishda xatolik', details: error.message });
  }
});

// ==================== AUDIT ENDPOINTS ====================

// Savdo tarixini olish
router.get('/audit/history', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, userId, customerId, action, limit } = req.query;
    
    const { getSalesHistory } = await import('../utils/sales-audit');
    
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (userId) filters.userId = userId as string;
    if (customerId) filters.customerId = customerId as string;
    if (action) filters.action = action as string;
    if (limit) filters.limit = parseInt(limit as string);
    
    const history = await getSalesHistory(filters);
    res.json(history);
  } catch (error) {
    console.error('Get sales history error:', error);
    res.status(500).json({ error: 'Savdo tarixini olishda xatolik' });
  }
});

// Savdo statistikasini olish
router.get('/audit/stats', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const { getSalesAuditStats } = await import('../utils/sales-audit');
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    const stats = await getSalesAuditStats(start, end);
    res.json(stats);
  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({ error: 'Savdo statistikasini olishda xatolik' });
  }
});

// Shubhali savdo faoliyatini aniqlash
router.get('/audit/suspicious-activity', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.query;
    
    const { detectSuspiciousSalesActivity } = await import('../utils/sales-audit');
    
    const suspicious = await detectSuspiciousSalesActivity(userId as string);
    res.json(suspicious);
  } catch (error) {
    console.error('Detect suspicious sales activity error:', error);
    res.status(500).json({ error: 'Shubhali faoliyatni aniqlashda xatolik' });
  }
});

// Savdo trendi
router.get('/audit/trend', async (req: AuthRequest, res) => {
  try {
    const { days } = req.query;
    
    const { getSalesTrend } = await import('../utils/sales-audit');
    
    const daysNum = days ? parseInt(days as string) : 30;
    const trend = await getSalesTrend(daysNum);
    res.json(trend);
  } catch (error) {
    console.error('Get sales trend error:', error);
    res.status(500).json({ error: 'Savdo trendini olishda xatolik' });
  }
});

// Mijoz savdo tarixini olish
router.get('/audit/customer/:customerId', async (req: AuthRequest, res) => {
  try {
    const { customerId } = req.params;
    
    const { getCustomerSalesHistory } = await import('../utils/sales-audit');
    
    const history = await getCustomerSalesHistory(customerId);
    res.json(history);
  } catch (error) {
    console.error('Get customer sales history error:', error);
    res.status(500).json({ error: 'Mijoz savdo tarixini olishda xatolik' });
  }
});

// ==================== HAYDOVCHI TO'LOV QABUL QILISH ====================

// Haydovchi to'lovini qabul qilish (sotuv uchun)
router.post('/:id/driver-collection', authorize('ADMIN', 'CASHIER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { collectedAmount, paymentMethod, notes } = req.body;
    
    if (collectedAmount === undefined || collectedAmount < 0) {
      return res.status(400).json({ error: 'Yig\'ilgan summa kiritilishi shart!' });
    }
    
    // Sotuvni topish
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        driver: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    if (!sale) {
      return res.status(404).json({ error: 'Sotuv topilmadi' });
    }
    
    if (!sale.driverId) {
      return res.status(400).json({ error: 'Bu sotuvga haydovchi biriktirilmagan!' });
    }
    
    // Yangi yig'ilgan summa
    // âœ… DECIMAL FIX: Use DecimalHelper for money calculations
    const newCollectedAmount = DecimalHelper.add(sale.driverCollectedAmount, parseFloat(collectedAmount));
    const remainingToCollect = DecimalHelper.subtract(sale.totalAmount, newCollectedAmount);
    
    // Statusni aniqlash
    let newStatus = 'PENDING';
    if (newCollectedAmount >= sale.totalAmount) {
      newStatus = 'COLLECTED';
    } else if (newCollectedAmount > 0) {
      newStatus = 'PARTIAL';
    }
    
    // Sotuvni yangilash
    const updatedSale = await prisma.sale.update({
      where: { id },
      data: {
        driverCollectedAmount: newCollectedAmount,
        driverPaymentStatus: newStatus
      },
      include: {
        customer: true,
        driver: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });
    
    // To'lov tarixini saqlash (agar alohida jadval bo'lsa)
    try {
      // Bu yerda Payment modeliga yozish mumkin
      console.log(`âœ… Haydovchi to'lovi qayd etildi: ${sale.driver?.name} - $${collectedAmount}`);
    } catch (paymentError) {
      console.error('To\'lov tarixini saqlashda xatolik:', paymentError);
    }
    
    // Kassaga pul qo'shish
    if (parseFloat(collectedAmount) > 0) {
      try {
        const { addToCashbox } = await import('../utils/cashier-operations');
        await addToCashbox({
          amount: parseFloat(collectedAmount),
          currency: sale.currency || 'USD',
          type: 'INCOME',
          category: 'DRIVER_COLLECTION',
          description: `Haydovchi ${sale.driver?.name || 'Noma\'lum'} dan sotuv #${sale.id.slice(-6)} uchun`,
          userId: req.user?.id || 'unknown',
          userName: req.user?.name || 'unknown',
          relatedId: sale.id,
          relatedType: 'SALE'
        });
        console.log(`âœ… Kassaga qo'shildi: $${collectedAmount}`);
      } catch (cashboxError) {
        logger.error('Driver collection recorded but cashbox add FAILED - cash/till discrepancy, manual reconciliation required', { error: cashboxError instanceof Error ? cashboxError.message : String(cashboxError) });
      }
    }
    
    // Haydovchiga xabar yuborish (Telegram bot orqali)
    if (sale.driver?.telegramChatId) {
      try {
        const { sendDriverPaymentReceivedNotification } = await import('../utils/telegram-notifications');
        await sendDriverPaymentReceivedNotification(
          sale.driver.telegramChatId,
          {
            saleId: sale.id,
            collectedAmount: parseFloat(collectedAmount),
            totalCollected: newCollectedAmount,
            remaining: remainingToCollect,
            currency: sale.currency
          }
        );
      } catch (notifyError) {
        console.log('âš ï¸ Haydovchiga xabar yuborishda xatolik:', notifyError);
      }
    }
    
    res.json({
      sale: updatedSale,
      collection: {
        collectedAmount: parseFloat(collectedAmount),
        totalCollected: newCollectedAmount,
        remaining: remainingToCollect,
        paymentMethod,
        notes
      },
      message: remainingToCollect > 0
        ? `âœ… To'lov qabul qilindi! Qoldiq: $${remainingToCollect.toFixed(2)}`
        : 'âœ… To\'lov to\'liq yig\'ildi!'
    });
    
  } catch (error) {
    console.error('Haydovchi to\'lovini qabul qilishda xatolik:', error);
    res.status(500).json({ error: 'Haydovchi to\'lovini qabul qilishda xatolik' });
  }
});

// Haydovchidan kutilayotgan to'lovlar ro'yxati
router.get('/driver-pending-collections', authorize('ADMIN', 'CASHIER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { driverId, startDate, endDate } = req.query;
    
    const where: any = {
      driverId: { not: null },
      OR: [
        { driverPaymentStatus: 'PENDING' },
        { driverPaymentStatus: 'PARTIAL' }
      ]
    };
    
    if (driverId) {
      where.driverId = driverId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }
    
    const pendingSales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        driver: true,
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Guruhlash va statistika
    const summary = {
      totalPending: pendingSales.length,
      totalAmount: pendingSales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalCollected: pendingSales.reduce((sum, s) => sum + s.driverCollectedAmount, 0),
      totalRemaining: pendingSales.reduce((sum, s) => sum + (s.totalAmount - s.driverCollectedAmount), 0)
    };
    
    // Haydovchi bo'yicha guruhlash
    const byDriver: Record<string, any> = {};
    pendingSales.forEach(sale => {
      if (sale.driver) {
        if (!byDriver[sale.driver.id]) {
          byDriver[sale.driver.id] = {
            driver: sale.driver,
            sales: [],
            totalAmount: 0,
            totalCollected: 0,
            totalRemaining: 0
          };
        }
        byDriver[sale.driver.id].sales.push(sale);
        byDriver[sale.driver.id].totalAmount += sale.totalAmount;
        byDriver[sale.driver.id].totalCollected += sale.driverCollectedAmount;
        byDriver[sale.driver.id].totalRemaining += (sale.totalAmount - sale.driverCollectedAmount);
      }
    });
    
    res.json({
      sales: pendingSales,
      summary,
      byDriver: Object.values(byDriver)
    });
    
  } catch (error) {
    console.error('Kutilayotgan to\'lovlarni olishda xatolik:', error);
    res.status(500).json({ error: 'Kutilayotgan to\'lovlarni olishda xatolik' });
  }
});

// Haydovchi balansi/umumiy statistikasi
router.get('/driver/:driverId/summary', authorize('ADMIN', 'CASHIER', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate as string);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate as string);
    }
    
    // Jami sotuvlar
    const totalSales = await prisma.sale.count({
      where: {
        driverId,
        ...dateFilter
      }
    });
    
    // Jami summa
    const totalAmount = await prisma.sale.aggregate({
      where: {
        driverId,
        ...dateFilter
      },
      _sum: {
        totalAmount: true,
        driverCollectedAmount: true
      }
    });
    
    // Status bo'yicha
    const byStatus = await prisma.sale.groupBy({
      by: ['driverPaymentStatus'],
      where: {
        driverId,
        ...dateFilter
      },
      _count: {
        _all: true
      },
      _sum: {
        totalAmount: true,
        driverCollectedAmount: true
      }
    });
    
    // Haydovchi ma'lumotlari
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });
    
    if (!driver) {
      return res.status(404).json({ error: 'Haydovchi topilmadi' });
    }
    
    res.json({
      driver,
      summary: {
        totalSales,
        totalAmount: totalAmount._sum.totalAmount || 0,
        totalCollected: totalAmount._sum.driverCollectedAmount || 0,
        totalRemaining: (totalAmount._sum.totalAmount || 0) - (totalAmount._sum.driverCollectedAmount || 0)
      },
      byStatus
    });
    
  } catch (error) {
    console.error('Haydovchi summary xatolik:', error);
    res.status(500).json({ error: 'Haydovchi ma\'lumotlarini olishda xatolik' });
  }
});

export default router;
