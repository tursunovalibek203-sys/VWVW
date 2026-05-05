import { Router } from 'express';
import { salesService, SaleFilters } from '../services/SalesService';
import { ResponseHelper } from '../utils/response';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validate, schemas } from '../middleware/validator';
import { DecimalHelper } from '../utils/decimal-helper';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /sales - Barcha sotuvlar
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { 
      productId, 
      customerId, 
      startDate, 
      endDate, 
      paymentStatus,
      page = '1', 
      limit = '50' 
    } = req.query;

    // Build filters
    const filters: SaleFilters = {};
    if (productId) filters.productId = productId as string;
    if (customerId) filters.customerId = customerId as string;
    if (paymentStatus) filters.paymentStatus = paymentStatus as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const sales = await salesService.getAllSales(filters);

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const total = sales.length;
    const paginatedSales = sales.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json(ResponseHelper.success(paginatedSales, {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }));
  } catch (error: any) {
    console.error('Get sales error:', error);
    res.status(500).json(ResponseHelper.internalError(error.message));
  }
});

// GET /sales/stats - Sotuv statistikasi
router.get('/stats', authorize('ADMIN', 'ACCOUNTANT', 'MANAGER'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await salesService.getSalesStats(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json(ResponseHelper.success(stats));
  } catch (error: any) {
    res.status(500).json(ResponseHelper.internalError(error.message));
  }
});

// GET /sales/:id - Bitta sotuv
router.get('/:id', async (req, res) => {
  try {
    const sale = await salesService.getSaleById(req.params.id);

    if (!sale) {
      return res.status(404).json(ResponseHelper.notFound('Sotuv'));
    }

    res.json(ResponseHelper.success(sale));
  } catch (error: any) {
    res.status(500).json(ResponseHelper.internalError(error.message));
  }
});

// POST /sales - Sotuv yaratish
router.post('/', 
  authorize('ADMIN', 'CASHIER', 'SELLER'),
  validate(schemas.sale),
  async (req: AuthRequest, res) => {
    try {
      const { 
        customerId, 
        items, 
        totalAmount, 
        paidAmount, 
        currency, 
        paymentDetails,
        driverId,
        isKocha,
        manualCustomerName,
        manualCustomerPhone
      } = req.body;

      if (!req.user?.id) {
        return res.status(401).json(ResponseHelper.unauthorized());
      }

      const sale = await salesService.createSale({
        customerId,
        items,
        totalAmount: DecimalHelper.round(totalAmount, 2),
        paidAmount: DecimalHelper.round(paidAmount, 2),
        currency: currency || 'USD',
        paymentDetails,
        driverId,
        isKocha,
        manualCustomerName,
        manualCustomerPhone,
        userId: req.user.id,
        userName: req.user.name || req.user.email || 'Noma\'lum'
      });

      res.status(201).json(ResponseHelper.success(sale));
    } catch (error: any) {
      console.error('Create sale error:', error);
      console.error('Error stack:', error.stack);
      console.error('Request body:', req.body);
      
      if (error.message?.includes('topilmadi')) {
        return res.status(404).json(ResponseHelper.notFound('Mahsulot'));
      }
      if (error.message?.includes('yetarli')) {
        return res.status(400).json(ResponseHelper.badRequest(error.message));
      }
      if (error.message?.includes('Kamida')) {
        return res.status(400).json(ResponseHelper.badRequest(error.message));
      }
      
      // Return detailed error message for debugging
      res.status(500).json(ResponseHelper.internalError(
        error.message || 'Sotuv yaratishda server xatosi'
      ));
    }
  }
);

// PUT /sales/:id - Sotuv yangilash
router.put('/:id', 
  authorize('ADMIN', 'CASHIER', 'SELLER'),
  async (req: AuthRequest, res) => {
    try {
      const sale = await salesService.updateSale({
        id: req.params.id,
        ...req.body
      });

      res.json(ResponseHelper.success(sale));
    } catch (error: any) {
      if (error.message === 'Sotuv topilmadi') {
        return res.status(404).json(ResponseHelper.notFound('Sotuv'));
      }
      res.status(500).json(ResponseHelper.internalError(error.message));
    }
  }
);

// DELETE /sales/:id - Sotuv o'chirish
router.delete('/:id', 
  authorize('ADMIN'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json(ResponseHelper.unauthorized());
      }

      await salesService.deleteSale(
        req.params.id,
        req.user.id,
        req.user.name || req.user.email || 'Noma\'lum'
      );

      res.json(ResponseHelper.success({ 
        message: 'Sotuv muvaffaqiyatli o\'chirildi' 
      }));
    } catch (error: any) {
      if (error.message === 'Sotuv topilmadi') {
        return res.status(404).json(ResponseHelper.notFound('Sotuv'));
      }
      res.status(500).json(ResponseHelper.internalError(error.message));
    }
  }
);

export default router;
