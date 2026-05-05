import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import {
  logInventoryAction,
  getInventoryHistory,
  getInventoryAuditStats,
  getProductHistory,
  detectSuspiciousInventoryActivity,
  getStockBalanceHistory,
} from '../utils/inventory-audit';
import { emitProductChange, EVENT_TYPES } from '../utils/eventEmitter.js';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { lowStock, search, includeVariants } = req.query;
    
    // Include variants if requested
    const includeOptions: any = {
      batches: { orderBy: { productionDate: 'desc' }, take: 1 }
    };
    
    // Always include variants
    includeOptions.variants = {
      where: { active: true },
      orderBy: { variantName: 'asc' }
    };
    
    // Kam qolgan mahsulotlar filtri
    if (lowStock === 'true') {
      const allProducts = await prisma.product.findMany({
        include: includeOptions,
      });
      
      const lowStockProducts = allProducts.filter(p => {
        if (p.isParent && p.variants) {
          // Check if any variant is low stock
          return p.variants.some((v: any) => v.currentStock < p.minStockLimit);
        }
        return p.currentStock < p.minStockLimit;
      });
      
      // Calculate total stock for parent products
      const productsWithTotals = lowStockProducts.map(p => {
        if (p.isParent && p.variants) {
          const totalStock = p.variants.reduce((sum: number, v: any) => sum + v.currentStock, 0);
          return { ...p, totalStock };
        }
        return p;
      });
      
      // ✅ STANDARD API RESPONSE FORMAT
      return res.json(successResponse(productsWithTotals));
    }
    
    // Qidirish - SQLite uchun case-insensitive qidirish
    if (search) {
      const allProducts = await prisma.product.findMany({
        include: includeOptions,
      });
      
      const searchLower = (search as string).toLowerCase();
      const filtered = allProducts.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(searchLower);
        const bagTypeMatch = p.bagType.toLowerCase().includes(searchLower);
        
        // Search in variants too
        let variantMatch = false;
        if (p.variants) {
          variantMatch = p.variants.some((v: any) => 
            v.variantName.toLowerCase().includes(searchLower)
          );
        }
        
        return nameMatch || bagTypeMatch || variantMatch;
      });
      
      // Calculate total stock for parent products
      const productsWithTotals = filtered.map(p => {
        if (p.isParent && p.variants) {
          const totalStock = p.variants.reduce((sum: number, v: any) => sum + v.currentStock, 0);
          return { ...p, totalStock };
        }
        return p;
      });
      
      // ✅ STANDARD API RESPONSE FORMAT
      return res.json(successResponse(productsWithTotals));
    }
    
    const products = await prisma.product.findMany({
      include: includeOptions,
    });
    
    // Variantlarni qo'shish (15g preform uchun)
    const productsWithVariants = await Promise.all(
      products.map(async (p: any) => {
        if (p.name.toLowerCase().includes('15g') && p.isParent) {
          try {
            // SQL orqali variantlarni olish
            const variants = await prisma.$queryRaw`
              SELECT 
                id, variantName, cardType, currentStock, currentUnits, 
                pricePerBag, active, parentId
              FROM ProductVariant 
              WHERE parentId = ${p.id} AND active = true
              ORDER BY variantName
            `;
            
            return { ...p, variants };
          } catch (error) {
            console.error('Error fetching variants for 15g preform:', error);
            return { ...p, variants: [] };
          }
        }
        return p;
      })
    );
    
    // Calculate total stock for parent products
    const productsWithTotals = productsWithVariants.map(p => {
      if (p.isParent && p.variants) {
        const totalStock = p.variants.reduce((sum: number, v: any) => sum + (v.currentStock || 0), 0);
        return { ...p, totalStock };
      }
      return p;
    });
    
    // ✅ STANDARD API RESPONSE FORMAT
    res.json(successResponse(productsWithTotals));
  } catch (error) {
    console.error('❌ Get products error:', error);
    res.status(500).json(errorResponse('Failed to fetch products', error instanceof Error ? error.message : 'Unknown error'));
  }
});

router.post('/', authorize('ADMIN', 'WAREHOUSE_MANAGER', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    console.log('Creating product with data:', req.body);
    const { productTypeId, categoryId, sizeId, ...productData } = req.body;
    
    // 1. Ism takrorlanmasligini tekshirish
    const existingProduct = await prisma.product.findUnique({
      where: { name: productData.name }
    });

    if (existingProduct) {
      return res.status(400).json({ 
        error: 'Failed to create product', 
        details: `"${productData.name}" номли маҳсулот аллақачон мавжуд. Илтимос, бошқа ном танланг.` 
      });
    }

    // 2. Mahsulotni Prisma orqali yaratish (Raw SQL o'rniga)
    const product = await prisma.product.create({
      data: {
        name: productData.name,
        bagType: productData.bagType,
        warehouse: productData.warehouse || 'preform',
        unitsPerBag: parseFloat(productData.unitsPerBag) || 1000,
        minStockLimit: parseFloat(productData.minStockLimit) || 0,
        optimalStock: parseFloat(productData.optimalStock) || 0,
        maxCapacity: parseFloat(productData.maxCapacity) || 0,
        currentStock: parseFloat(productData.currentStock) || 0,
        currentUnits: (parseFloat(productData.currentStock) || 0) * (parseFloat(productData.unitsPerBag) || 0),
        pricePerBag: parseFloat(productData.pricePerBag) || 0,
        pricePerPiece: parseFloat(productData.pricePerPiece) || 0,
        productionCost: parseFloat(productData.productionCost) || 0,
        isParent: productData.isParent || false,
        productTypeId: productTypeId || null,
        categoryId: categoryId || null,
        sizeId: sizeId || null,
        subType: productData.subType || null,
        active: productData.active !== false,
      }
    });

    // 3. Mahsulot turiga qarab avtomatik kartga qo'shish
    if (productTypeId) {
      try {
        const productType = await prisma.productType.findUnique({
          where: { id: productTypeId },
          select: { defaultCard: true }
        });

        if (productType?.defaultCard) {
          // Standart kartni topish
          const card = await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM Card WHERE name = ${productType.defaultCard} AND active = true
          `;

          if (card.length > 0) {
            // Mahsulotni kartga qo'shish
            await prisma.$executeRaw`
              INSERT OR REPLACE INTO CardProduct (id, cardId, productId, quantity, active, createdAt)
              VALUES (
                lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),
                ${card[0].id},
                ${product.id},
                1,
                true,
                datetime('now')
              )
            `;
            console.log(`✅ ${product.name} mahsuloti ${productType.defaultCard} kartiga avtomatik qo'shildi`);
          }
        }
      } catch (cardError) {
        console.error('Error adding product to card:', cardError);
        // Xatolik bo'lsa ham mahsulot yaratilishi kerak
      }
    }

    // Audit log
    try {
      await logInventoryAction({
        userId: req.user!.id,
        userName: (req.user as any).name || req.user!.email,
        action: 'MAHSULOT_YARATISH',
        entity: 'INVENTORY',
        entityId: String(product.id),
        productId: String(product.id),
        productName: product.name,
        details: {
          type: 'ADD',
          notes: 'Yangi mahsulot yaratildi',
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
      // Audit log xatoligi mahsulot yaratishiga to'sqin bo'lmasin
    }

    // Real-time event emit
    emitProductChange(EVENT_TYPES.PRODUCT_CREATED, product);

    res.json(product);
  } catch (error: any) {
    console.error('Product creation error:', error);
    let details = '';
    if (error.code === 'P2002') {
      details = 'Bu nomli mahsulot allaqachon mavjud';
    } else if (error.code === 'P2003') {
      details = 'Tegishli kategoriya yoki o\'lcham topilmadi';
    } else {
      details = error.message;
    }
    res.status(500).json({ error: 'Failed to create product', details });
  }
});

router.put('/:id', authorize('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const oldProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!oldProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // Ensure numeric fields are correctly typed if they come as strings
    if (updateData.unitsPerBag) updateData.unitsPerBag = parseFloat(updateData.unitsPerBag);
    if (updateData.pricePerBag) updateData.pricePerBag = parseFloat(updateData.pricePerBag);
    if (updateData.pricePerPiece) updateData.pricePerPiece = parseFloat(updateData.pricePerPiece);
    if (updateData.currentStock) updateData.currentStock = parseFloat(updateData.currentStock);
    if (updateData.minStockLimit) updateData.minStockLimit = parseFloat(updateData.minStockLimit);
    if (updateData.optimalStock) updateData.optimalStock = parseFloat(updateData.optimalStock);
    if (updateData.maxCapacity) updateData.maxCapacity = parseFloat(updateData.maxCapacity);
    if (updateData.sizeValue) updateData.sizeValue = parseFloat(updateData.sizeValue);

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // Audit log
    try {
      await logInventoryAction({
        userId: req.user!.id,
        userName: (req.user as any).name || req.user!.email,
        action: 'MAHSULOT_TAHRIRLASH',
        entity: 'INVENTORY',
        entityId: product.id,
        productId: product.id,
        productName: product.name,
        details: {
          type: 'EDIT',
          oldValue: oldProduct,
          newValue: product,
          notes: 'Mahsulot ma\'lumotlari tahrirlandi',
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Audit log error during update:', auditError);
    }

    // Real-time event emit
    emitProductChange(EVENT_TYPES.PRODUCT_UPDATED, product);

    res.json(product);
  } catch (error: any) {
    console.error('Product update error:', error);
    let details = error.message;
    if (error.code === 'P2002') {
      details = 'Bu nomli mahsulot allaqachon mavjud';
    }
    res.status(500).json({ error: 'Failed to update product', details });
  }
});

// PATCH endpoint - partial update (frontend compatibility)
router.patch('/:id', authorize('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const oldProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!oldProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // Ensure numeric fields are correctly typed if they come as strings
    if (updateData.unitsPerBag) updateData.unitsPerBag = parseFloat(updateData.unitsPerBag);
    if (updateData.pricePerBag) updateData.pricePerBag = parseFloat(updateData.pricePerBag);
    if (updateData.pricePerPiece) updateData.pricePerPiece = parseFloat(updateData.pricePerPiece);
    if (updateData.currentStock) updateData.currentStock = parseFloat(updateData.currentStock);
    if (updateData.minStockLimit) updateData.minStockLimit = parseFloat(updateData.minStockLimit);
    if (updateData.optimalStock) updateData.optimalStock = parseFloat(updateData.optimalStock);
    if (updateData.maxCapacity) updateData.maxCapacity = parseFloat(updateData.maxCapacity);
    if (updateData.sizeValue) updateData.sizeValue = parseFloat(updateData.sizeValue);

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // Audit log
    try {
      await logInventoryAction({
        userId: req.user!.id,
        userName: (req.user as any).name || req.user!.email,
        action: 'MAHSULOT_TAHRIRLASH',
        entity: 'INVENTORY',
        entityId: product.id,
        productId: product.id,
        productName: product.name,
        details: {
          type: 'PATCH' as any,
          oldValue: oldProduct,
          newValue: product,
          notes: 'Mahsulot ma\'lumotlari yangilandi (PATCH)',
        } as any,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Audit log error during patch:', auditError);
    }

    // Real-time event emit
    emitProductChange(EVENT_TYPES.PRODUCT_UPDATED, product);

    res.json(product);
  } catch (error: any) {
    console.error('Product patch error:', error);
    let details = error.message;
    if (error.code === 'P2002') {
      details = 'Bu nomli mahsulot allaqachon mavjud';
    }
    res.status(500).json({ error: 'Failed to update product', details });
  }
});

// Stock update endpoint
router.post('/:id/stock', authorize('ADMIN', 'WAREHOUSE_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { quantity, type, reason, notes } = req.body;
    const productId = req.params.id;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const previousStock = product.currentStock;
    const previousUnits = product.currentUnits;
    let newStock = previousStock;
    let newUnits = previousUnits;

    if (type === 'ADD') {
      newStock = previousStock + quantity;
      newUnits = previousUnits + (quantity * product.unitsPerBag);
    } else if (type === 'REMOVE') {
      newStock = previousStock - quantity;
      newUnits = previousUnits - (quantity * product.unitsPerBag);
    } else if (type === 'ADJUST') {
      newStock = quantity;
      newUnits = quantity * product.unitsPerBag;
    }

    // Update product stock
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: newStock,
        currentUnits: newUnits,
      },
    });

    // Create stock movement record
    await prisma.stockMovement.create({
      data: {
        productId,
        type: type || 'ADJUST',
        quantity,
        units: quantity * product.unitsPerBag,
        reason: reason || `Ombor ${type === 'ADD' ? 'qo\'shildi' : type === 'REMOVE' ? 'kamaytirildi' : 'sozlandi'}`,
        userId: req.user!.id,
        userName: (req.user as any).name || req.user!.email,
        previousStock,
        previousUnits,
        newStock,
        newUnits,
        notes: notes || '',
      },
    });

    // Audit log
    await logInventoryAction({
      userId: req.user!.id,
      userName: (req.user as any).name || req.user!.email,
      action: type === 'ADD' ? 'OMBOR_QOSHISH' : type === 'REMOVE' ? 'OMBOR_KAMAYTIRISH' : 'OMBOR_SOZLASH',
      entity: 'INVENTORY',
      entityId: productId,
      productId,
      productName: product.name,
      details: {
        type,
        quantityBags: quantity,
        reason,
        previousStock,
        newStock,
        notes,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Real-time event emit - stock adjusted
    emitProductChange(EVENT_TYPES.STOCK_ADJUSTED, updatedProduct);

    res.json(updatedProduct);
  } catch (error) {
    console.error('Stock update error:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

router.post('/:id/batch', authorize('ADMIN', 'WAREHOUSE_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { quantity, productionDate, shift, responsiblePerson } = req.body;
    
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const batch = await prisma.batch.create({
      data: {
        productId: req.params.id,
        quantity,
        productionDate: new Date(productionDate),
        shift,
        responsiblePerson,
      },
    });

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: { currentStock: { increment: quantity } },
    });

    // Audit log
    await logInventoryAction({
      userId: req.user!.id,
      userName: (req.user as any).name || req.user!.email,
      action: 'PARTIYA_QOSHISH',
      entity: 'INVENTORY',
      entityId: batch.id,
      productId: product.id,
      productName: product.name,
      details: {
        type: 'PRODUCTION',
        quantityBags: quantity,
        previousStock: product.currentStock,
        newStock: updatedProduct.currentStock,
        batchId: batch.id,
        shift,
        responsiblePerson,
        notes: `Yangi partiya qo'shildi - ${shift} smena`,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add batch' });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    const alerts = products.map(p => ({
      productId: p.id,
      productName: p.name,
      currentStock: p.currentStock,
      status: p.currentStock === 0 ? 'critical' : 
              p.currentStock < p.minStockLimit ? 'danger' :
              p.currentStock < p.optimalStock ? 'warning' : 'ok',
    })).filter(a => a.status !== 'ok');
    
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        batches: { orderBy: { productionDate: 'desc' }, take: 10 },
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
        variants: {
          where: { active: true },
          include: {
            stockMovements: { orderBy: { createdAt: 'desc' }, take: 10 },
            priceHistory: { orderBy: { createdAt: 'desc' }, take: 5 }
          },
          orderBy: { variantName: 'asc' }
        }
      },
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Calculate total stock for parent products
    if (product.isParent && product.variants) {
      const totalStock = product.variants.reduce((sum, v) => sum + v.currentStock, 0);
      const totalUnits = product.variants.reduce((sum, v) => sum + v.currentUnits, 0);
      
      return res.json({
        ...product,
        totalStock,
        totalUnits
      });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

router.post('/:id/adjust-units', authorize('ADMIN', 'WAREHOUSE_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { units, type, reason, notes } = req.body;
    const productId = req.params.id;
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const unitsChange = type === 'ADD' ? units : -units;
    const newUnits = product.currentUnits + unitsChange;
    
    if (newUnits < 0) {
      return res.status(400).json({ error: 'Dona soni manfiy bo\'lishi mumkin emas' });
    }
    
    const newBags = Math.floor(newUnits / product.unitsPerBag);
    const remainingUnits = newUnits % product.unitsPerBag;
    
    // Auto-generate reason if not provided
    const autoReason = type === 'ADD' ? 'Dona qo\'shildi' : 'Dona kamaytirildi';
    
    await prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: newBags - product.currentStock,
        units: unitsChange,
        reason: reason || autoReason,
        userId: req.user!.id,
        userName: (req.user as any).name || req.user!.email,
        previousStock: product.currentStock,
        previousUnits: product.currentUnits,
        newStock: newBags,
        newUnits,
        notes: notes || null,
      },
    });
    
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: newBags,
        currentUnits: newUnits,
      },
    });

    // Audit log
    await logInventoryAction({
      userId: req.user!.id,
      userName: (req.user as any).name || req.user!.email,
      action: type === 'ADD' ? 'DONA_QOSHISH' : 'DONA_KAMAYTIRISH',
      entity: 'INVENTORY',
      entityId: productId,
      productId,
      productName: product.name,
      details: {
        type: type === 'ADD' ? 'ADD' : 'REMOVE',
        quantityUnits: Math.abs(unitsChange),
        quantityBags: newBags - product.currentStock,
        previousStock: product.currentStock,
        previousUnits: product.currentUnits,
        newStock: newBags,
        newUnits,
        reason: reason || autoReason,
        notes,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: true,
      product: updatedProduct,
      change: {
        units: unitsChange,
        bags: newBags - product.currentStock,
        remainingUnits,
      },
    });
  } catch (error) {
    console.error('Adjust units error:', error);
    res.status(500).json({ error: 'Failed to adjust units' });
  }
});

router.post('/:id/adjust-bags', authorize('ADMIN', 'WAREHOUSE_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { bags, type, reason, notes } = req.body;
    const productId = req.params.id;
    
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const bagsChange = type === 'ADD' ? bags : -bags;
    const newBags = product.currentStock + bagsChange;
    
    if (newBags < 0) {
      return res.status(400).json({ error: 'Qop soni manfiy bo\'lishi mumkin emas' });
    }
    
    const unitsChange = bagsChange * product.unitsPerBag;
    const newUnits = product.currentUnits + unitsChange;
    
    // Auto-generate reason if not provided
    const autoReason = type === 'ADD' ? 'Qop qo\'shildi' : 'Qop kamaytirildi';
    
    await prisma.stockMovement.create({
      data: {
        productId,
        type,
        quantity: bagsChange,
        units: unitsChange,
        reason: reason || autoReason,
        userId: req.user!.id,
        userName: (req.user as any).name || req.user!.email,
        previousStock: product.currentStock,
        previousUnits: product.currentUnits,
        newStock: newBags,
        newUnits,
        notes: notes || null,
      },
    });
    
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        currentStock: newBags,
        currentUnits: newUnits,
      },
    });

    // Audit log
    await logInventoryAction({
      userId: req.user!.id,
      userName: (req.user as any).name || req.user!.email,
      action: type === 'ADD' ? 'QOP_QOSHISH' : 'QOP_KAMAYTIRISH',
      entity: 'INVENTORY',
      entityId: productId,
      productId,
      productName: product.name,
      details: {
        type: type === 'ADD' ? 'ADD' : 'REMOVE',
        quantityBags: Math.abs(bagsChange),
        quantityUnits: Math.abs(unitsChange),
        previousStock: product.currentStock,
        previousUnits: product.currentUnits,
        newStock: newBags,
        newUnits,
        reason: reason || autoReason,
        notes,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: true,
      product: updatedProduct,
      change: {
        bags: bagsChange,
        units: unitsChange,
      },
    });
  } catch (error) {
    console.error('Adjust bags error:', error);
    res.status(500).json({ error: 'Failed to adjust bags' });
  }
});

router.get('/:id/movements', async (req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});

// TARIX ENDPOINTLARI

// Ombor tarixini olish
router.get('/audit/history', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, userId, productId, action, limit } = req.query;

    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (userId) filters.userId = userId as string;
    if (productId) filters.productId = productId as string;
    if (action) filters.action = action as string;
    if (limit) filters.limit = parseInt(limit as string);

    const history = await getInventoryHistory(filters);

    // Ko'rish harakatini log qilish
    await logInventoryAction({
      userId: req.user!.id,
      userName: (req.user as any).name || req.user!.email,
      action: 'OMBOR_TARIX_KORISH',
      entity: 'INVENTORY',
      entityId: 'history-view',
      details: {
        type: 'VIEW',
        notes: 'Ombor tarixini ko\'rdi',
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json(history);
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({ error: 'Tarixni yuklashda xatolik' });
  }
});

// Ombor statistikasini olish
router.get('/audit/stats', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const stats = await getInventoryAuditStats(start, end);

    res.json(stats);
  } catch (error) {
    console.error('Get inventory audit stats error:', error);
    res.status(500).json({ error: 'Statistikani yuklashda xatolik' });
  }
});

// Mahsulot tarixini olish
router.get('/:id/history', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const history = await getProductHistory(id);

    res.json(history);
  } catch (error) {
    console.error('Get product history error:', error);
    res.status(500).json({ error: 'Mahsulot tarixini yuklashda xatolik' });
  }
});

// Shubhali faoliyatni aniqlash
router.get('/audit/suspicious-activity', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.query;
    const suspicious = await detectSuspiciousInventoryActivity(userId as string | undefined);

    res.json(suspicious);
  } catch (error) {
    console.error('Detect suspicious activity error:', error);
    res.status(500).json({ error: 'Shubhali faoliyatni aniqlashda xatolik' });
  }
});

// Mahsulot balans tarixini olish
router.get('/:id/balance-history', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { days } = req.query;
    
    const daysNum = days ? parseInt(days as string) : 30;
    const history = await getStockBalanceHistory(id, daysNum);

    res.json(history);
  } catch (error) {
    console.error('Get balance history error:', error);
    res.status(500).json({ error: 'Balans tarixini yuklashda xatolik' });
  }
});

// KIRIM VA CHIQIM TARIXLARI

// Kirim tarixi (Ishlab chiqarish, Tuzatish +)
router.get('/history/income', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, productId, userId, limit } = req.query;

    const where: any = {
      type: { in: ['PRODUCTION', 'ADJUST'] },
      quantity: { gt: 0 }
    };
    
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
    if (productId) where.productId = productId;
    if (userId) where.userId = userId;

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 100,
    });

    const totalBags = movements.reduce((sum, m) => sum + m.quantity, 0);
    const totalUnits = movements.reduce((sum, m) => sum + m.units, 0);

    res.json({
      movements,
      total: {
        bags: totalBags,
        units: totalUnits,
        count: movements.length
      }
    });
  } catch (error) {
    console.error('Get income history error:', error);
    res.status(500).json({ error: 'Kirim tarixini yuklashda xatolik' });
  }
});

// Chiqim tarixi (Sotuv, Tuzatish -)
router.get('/history/expense', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, productId, userId, limit } = req.query;

    const where: any = {
      OR: [
        { type: 'SALE' },
        { type: 'ADJUST', quantity: { lt: 0 } }
      ]
    };
    
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
    if (productId) where.productId = productId;
    if (userId) where.userId = userId;

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 100,
    });

    const totalBags = movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const totalUnits = movements.reduce((sum, m) => sum + Math.abs(m.units), 0);

    res.json({
      movements,
      total: {
        bags: totalBags,
        units: totalUnits,
        count: movements.length
      }
    });
  } catch (error) {
    console.error('Get expense history error:', error);
    res.status(500).json({ error: 'Chiqim tarixini yuklashda xatolik' });
  }
});

// Ombor statistikasi (kirim/chiqim)
router.get('/history/stats', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, productId } = req.query;

    const where: any = {};
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
    if (productId) where.productId = productId;

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true
      },
      orderBy: { createdAt: 'desc' },
    });

    // Kirim (PRODUCTION, ADJUST +)
    const income = movements.filter(m => 
      (m.type === 'PRODUCTION' || m.type === 'ADJUST') && m.quantity > 0
    );
    const totalIncomeBags = income.reduce((sum, m) => sum + m.quantity, 0);
    const totalIncomeUnits = income.reduce((sum, m) => sum + m.units, 0);

    // Chiqim (SALE, ADJUST -)
    const expense = movements.filter(m => 
      m.type === 'SALE' || (m.type === 'ADJUST' && m.quantity < 0)
    );
    const totalExpenseBags = expense.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const totalExpenseUnits = expense.reduce((sum, m) => sum + Math.abs(m.units), 0);

    // Mahsulot bo'yicha
    const byProduct: any = {};
    movements.forEach(m => {
      if (!byProduct[m.productId]) {
        byProduct[m.productId] = {
          productName: m.product.name,
          income: { bags: 0, units: 0 },
          expense: { bags: 0, units: 0 },
          count: 0
        };
      }
      
      if ((m.type === 'PRODUCTION' || m.type === 'ADJUST') && m.quantity > 0) {
        byProduct[m.productId].income.bags += m.quantity;
        byProduct[m.productId].income.units += m.units;
      } else if (m.type === 'SALE' || (m.type === 'ADJUST' && m.quantity < 0)) {
        byProduct[m.productId].expense.bags += Math.abs(m.quantity);
        byProduct[m.productId].expense.units += Math.abs(m.units);
      }
      
      byProduct[m.productId].count++;
    });

    // Foydalanuvchi bo'yicha
    const byUser: any = {};
    movements.forEach(m => {
      if (!byUser[m.userId]) {
        byUser[m.userId] = {
          userName: m.userName,
          income: { bags: 0, units: 0 },
          expense: { bags: 0, units: 0 },
          count: 0
        };
      }
      
      if ((m.type === 'PRODUCTION' || m.type === 'ADJUST') && m.quantity > 0) {
        byUser[m.userId].income.bags += m.quantity;
        byUser[m.userId].income.units += m.units;
      } else if (m.type === 'SALE' || (m.type === 'ADJUST' && m.quantity < 0)) {
        byUser[m.userId].expense.bags += Math.abs(m.quantity);
        byUser[m.userId].expense.units += Math.abs(m.units);
      }
      
      byUser[m.userId].count++;
    });

    // Kunlik statistika
    const dailyStats: any = {};
    movements.forEach(m => {
      const date = new Date(m.createdAt).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          income: { bags: 0, units: 0 },
          expense: { bags: 0, units: 0 },
          count: 0
        };
      }
      
      if ((m.type === 'PRODUCTION' || m.type === 'ADJUST') && m.quantity > 0) {
        dailyStats[date].income.bags += m.quantity;
        dailyStats[date].income.units += m.units;
      } else if (m.type === 'SALE' || (m.type === 'ADJUST' && m.quantity < 0)) {
        dailyStats[date].expense.bags += Math.abs(m.quantity);
        dailyStats[date].expense.units += Math.abs(m.units);
      }
      
      dailyStats[date].count++;
    });

    res.json({
      total: {
        income: {
          bags: totalIncomeBags,
          units: totalIncomeUnits,
          count: income.length
        },
        expense: {
          bags: totalExpenseBags,
          units: totalExpenseUnits,
          count: expense.length
        },
        net: {
          bags: totalIncomeBags - totalExpenseBags,
          units: totalIncomeUnits - totalExpenseUnits
        }
      },
      byProduct: Object.values(byProduct),
      byUser: Object.values(byUser),
      dailyStats: Object.entries(dailyStats).map(([date, stats]: [string, any]) => ({
        date,
        ...stats
      }))
    });
  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({ error: 'Statistikani yuklashda xatolik' });
  }
});

// Mahsulot kirim tarixi
router.get('/:id/income', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, limit } = req.query;

    const where: any = {
      productId: id,
      type: { in: ['PRODUCTION', 'ADJUST'] },
      quantity: { gt: 0 }
    };
    
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 100,
    });

    const totalBags = movements.reduce((sum, m) => sum + m.quantity, 0);
    const totalUnits = movements.reduce((sum, m) => sum + m.units, 0);

    res.json({
      movements,
      total: {
        bags: totalBags,
        units: totalUnits,
        count: movements.length
      }
    });
  } catch (error) {
    console.error('Get product income error:', error);
    res.status(500).json({ error: 'Mahsulot kirim tarixini yuklashda xatolik' });
  }
});

// Mahsulot chiqim tarixi
router.get('/:id/expense', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, limit } = req.query;

    const where: any = {
      productId: id,
      OR: [
        { type: 'SALE' },
        { type: 'ADJUST', quantity: { lt: 0 } }
      ]
    };
    
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 100,
    });

    const totalBags = movements.reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const totalUnits = movements.reduce((sum, m) => sum + Math.abs(m.units), 0);

    res.json({
      movements,
      total: {
        bags: totalBags,
        units: totalUnits,
        count: movements.length
      }
    });
  } catch (error) {
    console.error('Get product expense error:', error);
    res.status(500).json({ error: 'Mahsulot chiqim tarixini yuklashda xatolik' });
  }
});

// DELETE /products/:id - Mahsulotni o'chirish
router.delete('/:id', authorize('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'USER', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    console.log('Delete product request:', {
      productId: req.params.id,
      userRole: req.user?.role,
      userId: req.user?.id
    });

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Bog'liq ma'lumotlarni tekshirish
    const relatedData = await prisma.$transaction([
      // Order items
      prisma.orderItem.count({ where: { productId: req.params.id } }),
      // Production batches
      prisma.batch.count({ where: { productId: req.params.id } }),
      // Stock movements
      prisma.stockMovement.count({ where: { productId: req.params.id } }),
      // Stock alerts
      prisma.stockAlert.count({ where: { productId: req.params.id } }),
      // Sales forecasts
      prisma.salesForecast.count({ where: { productId: req.params.id } }),
      // Price levels
      prisma.priceLevel.count({ where: { productId: req.params.id } }),
      // Production orders
      prisma.productionOrder.count({ where: { productId: req.params.id } }),
      // Quality checks
      prisma.qualityCheck.count({ where: { productId: req.params.id } }),
      // Sales with this product
      prisma.sale.count({ where: { productId: req.params.id } }),
      // Sale items
      prisma.saleItem.count({ where: { productId: req.params.id } })
    ]);

    const [orderItemsCount, batchesCount, movementsCount, alertsCount, 
          forecastsCount, priceLevelsCount, productionOrdersCount, 
          qualityChecksCount, salesCount, saleItemsCount] = relatedData;

    console.log('Related data check:', {
      orderItemsCount,
      batchesCount,
      movementsCount,
      alertsCount,
      forecastsCount,
      priceLevelsCount,
      productionOrdersCount,
      qualityChecksCount,
      salesCount,
      saleItemsCount
    });

    // Agar bog'liq ma'lumotlar bo'lsa, ularni o'chirish
    if (orderItemsCount > 0 || batchesCount > 0 || movementsCount > 0 || alertsCount > 0 ||
        forecastsCount > 0 || priceLevelsCount > 0 || productionOrdersCount > 0 || 
        qualityChecksCount > 0 || salesCount > 0 || saleItemsCount > 0) {
      console.log('Cleaning up related data before deleting product...');
      
      await prisma.$transaction([
        // Order items larni o'chirish
        ...(orderItemsCount > 0 ? [prisma.orderItem.deleteMany({ where: { productId: req.params.id } })] : []),
        // Production batches larni o'chirish
        ...(batchesCount > 0 ? [prisma.batch.deleteMany({ where: { productId: req.params.id } })] : []),
        // Stock movements larni o'chirish
        ...(movementsCount > 0 ? [prisma.stockMovement.deleteMany({ where: { productId: req.params.id } })] : []),
        // Stock alerts larni o'chirish
        ...(alertsCount > 0 ? [prisma.stockAlert.deleteMany({ where: { productId: req.params.id } })] : []),
        // Sales forecasts larni o'chirish
        ...(forecastsCount > 0 ? [prisma.salesForecast.deleteMany({ where: { productId: req.params.id } })] : []),
        // Price levels larni o'chirish
        ...(priceLevelsCount > 0 ? [prisma.priceLevel.deleteMany({ where: { productId: req.params.id } })] : []),
        // Production orders larni o'chirish
        ...(productionOrdersCount > 0 ? [prisma.productionOrder.deleteMany({ where: { productId: req.params.id } })] : []),
        // Quality checks larni o'chirish
        ...(qualityChecksCount > 0 ? [prisma.qualityCheck.deleteMany({ where: { productId: req.params.id } })] : []),
        // Sales larni o'chirish
        ...(salesCount > 0 ? [prisma.sale.deleteMany({ where: { productId: req.params.id } })] : []),
        // Sale items larni o'chirish
        ...(saleItemsCount > 0 ? [prisma.saleItem.deleteMany({ where: { productId: req.params.id } })] : [])
      ]);
      
      console.log('Related data cleaned successfully');
    }

    // Endi mahsulotni o'chirish
    await prisma.product.delete({
      where: { id: req.params.id },
    });

    // Audit log
    await logInventoryAction({
      userId: req.user!.id,
      userName: (req.user as any).name || req.user!.email,
      action: 'MAHSULOT_OCHIRISH',
      entity: 'INVENTORY',
      entityId: req.params.id,
      productId: req.params.id,
      productName: product.name,
      details: {
        type: 'DELETE',
        notes: 'Mahsulot o\'chirildi',
        newValue: {
          orderItemsCount,
          batchesCount,
          movementsCount,
          alertsCount,
          forecastsCount,
          priceLevelsCount,
          productionOrdersCount,
          qualityChecksCount,
          salesCount,
          saleItemsCount
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Real-time event emit
    emitProductChange(EVENT_TYPES.PRODUCT_DELETED, { id: req.params.id, name: product.name });

    console.log('Product deleted successfully:', product.name);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// GET /products/:id/komplekt - Komplektni olish
router.get('/:id/komplekt', async (req, res) => {
  try {
    const { id } = req.params;

    // Asosiy mahsulotni tekshirish
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Mahsulot topilmadi' });
    }

    // Mahsulot nomidan o'lchamni aniqlash (15g, 26g, 30g...)
    const nameMatch = product.name.match(/(\d+)(g|G|г|Г|gr|GR)/);
    const weight = nameMatch ? parseInt(nameMatch[1]) : 0;
    const isPreform = product.name.toLowerCase().includes('preform') || 
                      product.warehouse?.toLowerCase() === 'preform' ||
                      nameMatch !== null;

    if (!isPreform) {
      return res.json({ items: [] });
    }

    // Komplekt komponentlarini aniqlash
    const komplektItems: any[] = [];

    // 15, 21, 26, 30gr preform → 28 krishka
    // 36gr preform → 28 krishka + 28 ruchka
    // 52, 70gr preform → 38 krishka + 38 ruchka
    // 75, 80, 85, 86, 135gr preform → 48 krishka + 48 ruchka

    let krishkaSize = '28';
    let ruchkaSize = '28';
    let needsRuchka = false;

    if ([15, 21, 26, 30].includes(weight)) {
      krishkaSize = '28';
      needsRuchka = false;
    } else if (weight === 36) {
      krishkaSize = '28';
      ruchkaSize = '28';
      needsRuchka = true;
    } else if ([52, 70].includes(weight)) {
      krishkaSize = '38';
      ruchkaSize = '38';
      needsRuchka = true;
    } else if ([75, 80, 85, 86, 135].includes(weight)) {
      krishkaSize = '48';
      ruchkaSize = '48';
      needsRuchka = true;
    }

    // Krishka qo'shish - aniq o'lcham bo'yicha qidirish
    console.log(`Komplekt: ${product.name} uchun krishka qidirilmoqda: ${krishkaSize}`);
    
    const krishkaProducts = await prisma.product.findMany({
      where: {
        AND: [
          {
            OR: [
              // O'lcham bilan boshlanadigan nomlar
              { name: { startsWith: `${krishkaSize} `, mode: 'insensitive' } },
              { name: { startsWith: `${krishkaSize}-`, mode: 'insensitive' } },
              { name: { startsWith: `${krishkaSize}krishka`, mode: 'insensitive' } },
              { name: { startsWith: `${krishkaSize}qopqoq`, mode: 'insensitive' } },
              { name: { startsWith: `${krishkaSize}cap`, mode: 'insensitive' } },
              // O'lcham oxirida bo'lsa (masalan: "krishka 48")
              { name: { endsWith: ` ${krishkaSize}`, mode: 'insensitive' } },
              { name: { endsWith: `-${krishkaSize}`, mode: 'insensitive' } },
              { name: { endsWith: `_${krishkaSize}`, mode: 'insensitive' } },
              // Faqat raqam
              { name: { equals: krishkaSize, mode: 'insensitive' } },
            ],
          },
          { warehouse: 'krishka' },
          { active: true },
        ],
      },
      orderBy: { name: 'asc' },
      take: 1,
    });
    
    console.log(`Topilgan krishka: ${krishkaProducts.length > 0 ? krishkaProducts[0].name : 'yoq'}`);

    if (krishkaProducts.length > 0) {
      const krishka = krishkaProducts[0];
      const unitsPerBag = product.unitsPerBag || 2000;
      komplektItems.push({
        productId: krishka.id,
        productName: krishka.name,
        quantity: unitsPerBag,
        itemType: 'piece',
      });
    }

    // Ruchka qo'shish (agar kerak bo'lsa) - aniq o'lcham bo'yicha qidirish
    if (needsRuchka) {
      console.log(`Komplekt: ${product.name} uchun ruchka qidirilmoqda: ${ruchkaSize}`);
      
      const ruchkaProducts = await prisma.product.findMany({
        where: {
          AND: [
            {
              OR: [
                // O'lcham bilan boshlanadigan nomlar
                { name: { startsWith: `${ruchkaSize} `, mode: 'insensitive' } },
                { name: { startsWith: `${ruchkaSize}-`, mode: 'insensitive' } },
                { name: { startsWith: `${ruchkaSize}ruchka`, mode: 'insensitive' } },
                { name: { startsWith: `${ruchkaSize}handle`, mode: 'insensitive' } },
                // O'lcham oxirida bo'lsa
                { name: { endsWith: ` ${ruchkaSize}`, mode: 'insensitive' } },
                { name: { endsWith: `-${ruchkaSize}`, mode: 'insensitive' } },
                { name: { endsWith: `_${ruchkaSize}`, mode: 'insensitive' } },
                // Faqat raqam
                { name: { equals: ruchkaSize, mode: 'insensitive' } },
              ],
            },
            { warehouse: 'ruchka' },
            { active: true },
          ],
        },
        orderBy: { name: 'asc' },
        take: 1,
      });
      
      console.log(`Topilgan ruchka: ${ruchkaProducts.length > 0 ? ruchkaProducts[0].name : 'yoq'}`);

      if (ruchkaProducts.length > 0) {
        const ruchka = ruchkaProducts[0];
        const unitsPerBag = product.unitsPerBag || 2000;
        komplektItems.push({
          productId: ruchka.id,
          productName: ruchka.name,
          quantity: unitsPerBag,
          itemType: 'piece',
        });
      }
    }

    console.log(`Komplekt natija: ${product.name} (weight: ${weight}) → ${komplektItems.length} ta item:`, 
      komplektItems.map(i => `${i.productName} (${i.quantity} dona)`).join(', '));

    res.json({
      productId: id,
      productName: product.name,
      weight,
      krishkaSize,
      ruchkaSize,
      needsRuchka,
      items: komplektItems,
    });
  } catch (error) {
    console.error('Komplekt olish xatolik:', error);
    res.status(500).json({ error: 'Komplektni olishda xatolik yuz berdi' });
  }
});

// POST /products/:id/komplekt - Komplekt saqlash
router.post('/:id/komplekt', authorize('ADMIN', 'WAREHOUSE_MANAGER', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Komplekt elementlari kiritilishi shart' });
    }

    // Asosiy mahsulotni tekshirish
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: 'Mahsulot topilmadi' });
    }

    // Hozircha faqat log qilamiz (keyinchalik Kit/KitItem jadvaliga saqlash mumkin)
    console.log('Komplekt saqlandi:', {
      productId: id,
      productName: product.name,
      items: items,
      userId: req.user?.id,
    });

    res.json({
      message: 'Komplekt muvaffaqiyatli saqlandi',
      productId: id,
      items: items,
    });
  } catch (error) {
    console.error('Komplekt saqlash xatolik:', error);
    res.status(500).json({ error: 'Komplektni saqlashda xatolik yuz berdi' });
  }
});

export default router;

